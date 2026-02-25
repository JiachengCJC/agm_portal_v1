from pydantic import BaseModel


class CountByKey(BaseModel):
    key: str
    count: int


class PortfolioSnapshot(BaseModel):
    total_projects: int
    active_projects: int
    by_institution: list[CountByKey]
    by_maturity_stage: list[CountByKey]
    by_risk_level: list[CountByKey]
