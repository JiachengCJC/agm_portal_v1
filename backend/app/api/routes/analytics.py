from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.project import Project
from app.schemas.analytics import PortfolioSnapshot, CountByKey

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _group_count(db: Session, col):
    rows = db.query(col, func.count(Project.id)).group_by(col).all()
    return [CountByKey(key=str(k), count=int(c)) for k, c in rows]


@router.get("/portfolio", response_model=PortfolioSnapshot)
def portfolio_snapshot(
    db: Session = Depends(get_db),
    _user=Depends(require_role("management", "admin")),
):
    total = db.query(func.count(Project.id)).scalar() or 0
    active = db.query(func.count(Project.id)).filter(Project.status == "Active").scalar() or 0

    return PortfolioSnapshot(
        total_projects=int(total),
        active_projects=int(active),
        by_institution=_group_count(db, Project.institution),
        by_maturity_stage=_group_count(db, Project.maturity_stage),
        by_risk_level=_group_count(db, Project.risk_level),
    )
