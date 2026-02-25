from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_role
from app.models.project import Project
from app.models.audit import AuditLog, ProjectUpdate
from app.schemas.project import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate as ProjectUpdateSchema,
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
    risk_level: str | None = None,
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
    if risk_level:
        query = query.filter(Project.risk_level == risk_level)

    # For MVP: researchers see their own; management/admin see all.
    if user.role == "researcher":
        query = query.filter(Project.owner_id == user.id)

    return query.order_by(Project.updated_at.desc()).all()

# payload: ProjectCreate: Expects a JSON body matching the ProjectCreate schema.
@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Converts the Pydantic payload into a dictionary, unpacks it (**), and injects the logged-in user's ID as the owner_id.
    project = Project(**payload.model_dump(), owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    _log(db, user.id, "CREATE", "Project", project.id, diff=payload.model_dump())
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
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(project, k, v)

    db.add(project)
    db.commit()
    db.refresh(project)

    _log(db, user.id, "UPDATE", "Project", project.id, diff=data)
    db.commit()
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
