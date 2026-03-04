from pydantic import BaseModel


class CountByKey(BaseModel):
    key: str
    count: int


class FundingByKey(BaseModel):
    key: str
    amount_sgd: float


class ProjectCycle(BaseModel):
    id: int
    title: str
    domain: str
    status: str
    start_time: str
    end_time: str | None
    duration_days: int
    spent_sgd: float


class PortfolioSnapshot(BaseModel):
    total_projects: int
    active_projects: int
    total_spent_sgd: float
    by_institution: list[CountByKey]
    by_domain: list[CountByKey]
    funding_by_domain: list[FundingByKey]
    project_cycles: list[ProjectCycle]
