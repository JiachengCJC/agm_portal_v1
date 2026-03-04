from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_role
from app.models.project import Project
from app.models.audit import AuditLog, ProjectFundingEvent, ProjectUpdate
from app.schemas.project import (
    ProjectCreate,
    ProjectFundingEventCreate,
    ProjectFundingEventOut,
    ProjectOut,
    ProjectUpdate as ProjectUpdateSchema,
    ProjectEndRequest,
    ProjectUpdateCreate,
    ProjectUpdateOut,
)

router = APIRouter(prefix="/projects", tags=["projects"])

# write a entry into the AuditLog table every time a project is touched.
def _log(db: Session, actor_user_id: int, action: str, entity_type: str, entity_id: int, diff: dict | None = None):
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            diff_json=AuditLog.dumps(diff) if diff else None,
        )
    )

# response_model=list[ProjectOut]: Tells FastAPI to format the returned 
# list of database objects using the ProjectOut schema.
@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    q: str | None = Query(default=None, description="Search in title/domain/institution"),
    institution: str | None = None,
    maturity_stage: str | None = None,
):
    query = db.query(Project)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (Project.title.ilike(like))
            | (Project.domain.ilike(like))
            | (Project.institution.ilike(like))
        )

    if institution:
        query = query.filter(Project.institution == institution)
    if maturity_stage:
        query = query.filter(Project.maturity_stage == maturity_stage)

    # For MVP: researchers see their own; management/admin see all.
    if user.role == "researcher":
        query = query.filter(Project.owner_id == user.id)

    return query.order_by(Project.updated_at.desc()).all()

# payload: ProjectCreate: Expects a JSON body matching the ProjectCreate schema.
@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Project start is always tied to creation time for consistency.
    data = payload.model_dump()
    data.pop("start_date", None)
    data.pop("end_date", None)

    # Converts the Pydantic payload into a dictionary, unpacks it (**), and injects the logged-in user's ID as the owner_id.
    project = Project(**data, owner_id=user.id)
    db.add(project)
    db.flush()

    if project.created_at is not None:
        project.start_date = project.created_at.date()
    else:
        project.start_date = date.today()

    db.commit()
    db.refresh(project)

    create_diff = data | {"start_date": str(project.start_date)}
    _log(db, user.id, "CREATE", "Project", project.id, diff=create_diff)
    db.commit()
    return project

# Fetches a single project by the ID in the URL.
@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "researcher" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return project

# PATCH means a partial update (as opposed to PUT, which replaces the whole object).
@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdateSchema,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "researcher" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # It tells Pydantic to only extract fields the user actually sent in the JSON. 
    # If they didn't send a title, it won't overwrite the existing title with None
    old_status = project.status
    data = payload.model_dump(exclude_unset=True)

    # Start date is system-managed from project creation time.
    data.pop("start_date", None)
    data.pop("end_date", None)

    new_status = data.get("status")
    completed_in_this_update = False
    if new_status == "Completed":
        data["end_date"] = date.today()
        completed_in_this_update = old_status != "Completed"
    elif new_status and old_status == "Completed" and new_status != "Completed":
        data["end_date"] = None

    for k, v in data.items():
        setattr(project, k, v)

    if project.start_date is None and project.created_at is not None:
        project.start_date = project.created_at.date()

    if completed_in_this_update:
        db.add(
            ProjectUpdate(
                project_id=project.id,
                author_user_id=user.id,
                status="Completed",
                note="Project marked as ended.",
            )
        )

    db.add(project)
    db.commit()
    db.refresh(project)

    _log(db, user.id, "UPDATE", "Project", project.id, diff=data)
    db.commit()
    return project


@router.post("/{project_id}/end", response_model=ProjectOut)
def end_project(
    project_id: int,
    payload: ProjectEndRequest | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "researcher" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    if project.start_date is None and project.created_at is not None:
        project.start_date = project.created_at.date()

    if project.status == "Completed" and project.end_date is not None:
        return project

    project.status = "Completed"
    project.end_date = date.today()

    note = "Project marked as ended."
    if payload and payload.note and payload.note.strip():
        note = payload.note.strip()

    upd = ProjectUpdate(
        project_id=project_id,
        author_user_id=user.id,
        status="Completed",
        note=note,
    )
    db.add(upd)
    db.add(project)

    _log(
        db,
        user.id,
        "UPDATE",
        "Project",
        project.id,
        diff={"status": project.status, "end_date": str(project.end_date), "note": note},
    )

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "management")),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    _log(db, user.id, "DELETE", "Project", project.id)
    db.commit()
    return {"ok": True}


@router.post("/{project_id}/updates", response_model=ProjectUpdateOut)
def add_update(
    project_id: int,
    payload: ProjectUpdateCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "researcher" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    upd = ProjectUpdate(project_id=project_id, author_user_id=user.id, status=payload.status, note=payload.note)
    db.add(upd)

    _log(db, user.id, "UPDATE", "Project", project_id, diff={"update": payload.model_dump()})
    db.commit()
    db.refresh(upd)
    return upd


@router.get("/{project_id}/updates", response_model=list[ProjectUpdateOut])
def list_updates(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "researcher" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return (
        db.query(ProjectUpdate)
        .filter(ProjectUpdate.project_id == project_id)
        .order_by(ProjectUpdate.created_at.desc())
        .all()
    )


@router.post("/{project_id}/funding", response_model=ProjectFundingEventOut)
def add_project_funding(
    project_id: int,
    payload: ProjectFundingEventCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "researcher" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    amount = payload.amount_sgd
    note = payload.note.strip() if payload.note and payload.note.strip() else None

    current_total = Decimal(project.funding_amount_sgd or 0)
    project.funding_amount_sgd = current_total + amount

    event = ProjectFundingEvent(
        project_id=project_id,
        author_user_id=user.id,
        amount_sgd=amount,
        note=note,
    )
    db.add(event)
    db.add(project)

    _log(
        db,
        user.id,
        "UPDATE",
        "Project",
        project.id,
        diff={
            "funding_added_sgd": str(amount),
            "funding_total_sgd": str(project.funding_amount_sgd),
            "note": note,
        },
    )

    db.commit()
    db.refresh(event)
    return event


@router.get("/{project_id}/funding", response_model=list[ProjectFundingEventOut])
def list_project_funding_events(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "researcher" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return (
        db.query(ProjectFundingEvent)
        .filter(ProjectFundingEvent.project_id == project_id)
        .order_by(ProjectFundingEvent.created_at.desc())
        .all()
    )
