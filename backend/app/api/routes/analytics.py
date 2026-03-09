from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.audit import ProjectUpdate
from app.models.project import Project
from app.schemas.analytics import CountByKey, FundingByKey, PortfolioSnapshot, ProjectCycle

router = APIRouter(prefix="/analytics", tags=["analytics"])


# A private helper function designed to take any column 
# and count how many projects belong to each unique value in that column.

# SELECT column, COUNT(id) FROM projects GROUP BY column;
def _group_count(db: Session, col):
    rows = db.query(col, func.count(Project.id)).group_by(col).all()
    return [CountByKey(key=str(k), count=int(c)) for k, c in rows]
# The database returns a list of tuples (e.g., [("High", 5), ("Low", 10)])


def _funding_by_domain(db: Session) -> list[FundingByKey]:
    rows = (
        db.query(Project.domain, func.coalesce(func.sum(Project.funding_amount_sgd), 0))
        .group_by(Project.domain)
        .all()
    )
    return [FundingByKey(key=str(k), amount_sgd=float(v or 0)) for k, v in rows]


def _project_cycles(db: Session) -> list[ProjectCycle]:
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    completed_rows = (
        db.query(ProjectUpdate.project_id, func.max(ProjectUpdate.created_at))
        .filter(ProjectUpdate.status == "Completed")
        .group_by(ProjectUpdate.project_id)
        .all()
    )
    completed_at_by_project = {project_id: completed_at for project_id, completed_at in completed_rows}

    cycles: list[ProjectCycle] = []

    for p in projects:
        start_time = p.created_at or datetime.now(timezone.utc)
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        end_time = None
        if p.end_date is not None:
            end_time = completed_at_by_project.get(p.id)
            if end_time is None:
                end_time = datetime.combine(p.end_date, time.max, tzinfo=timezone.utc)
        if end_time is not None and end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        duration_end = end_time or datetime.now(timezone.utc)
        duration_days = max((duration_end.date() - start_time.date()).days, 0)

        cycles.append(
            ProjectCycle(
                id=p.id,
                title=p.title,
                domain=p.domain,
                status=p.status,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat() if end_time else None,
                duration_days=duration_days,
                spent_sgd=float(p.funding_amount_sgd or 0),
            )
        )

    return cycles


# The route for fetching the dashboard data.
@router.get("/portfolio", response_model=PortfolioSnapshot)
def portfolio_snapshot(
    db: Session = Depends(get_db),
    _user=Depends(require_role("management", "admin")),
):
    total = db.query(func.count(Project.id)).scalar() or 0 # Counts the total number of project IDs.
    active = db.query(func.count(Project.id)).filter(Project.status == "Active").scalar() or 0
    total_spent = db.query(func.coalesce(func.sum(Project.funding_amount_sgd), 0)).scalar() or 0

    return PortfolioSnapshot(
        total_projects=int(total),
        active_projects=int(active),
        total_spent_sgd=float(total_spent),
        by_institution=_group_count(db, Project.institution),
        by_domain=_group_count(db, Project.domain),
        funding_by_domain=_funding_by_domain(db),
        project_cycles=_project_cycles(db),
    )
