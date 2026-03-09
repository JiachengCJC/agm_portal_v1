from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    title: str
    institution: str
    domain: str
    ai_type: str

    maturity_stage: str = "Discovery"
    status: str = "Active"

    data_sensitivity: str = "De-identified"

    funding_amount_sgd: Decimal | None = Field(default=None, ge=0)
    start_date: date | None = None
    end_date: date | None = None

    description: str | None = None


class ProjectCreate(ProjectBase):
    pass

# this schema overrides the strict required fields from ProjectBase and makes them optional (str | None = None). 
# This allows the user to send just a new title without having to resend the domain.
class ProjectUpdate(ProjectBase):
    # allow partial updates
    title: str | None = None
    institution: str | None = None
    domain: str | None = None
    ai_type: str | None = None


class ProjectOut(ProjectBase):
    # adds fields that the database generates automatically (like the ID and timestamps).
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime


class ProjectUpdateCreate(BaseModel):
    status: str = "Update"
    note: str


class ProjectEndRequest(BaseModel):
    note: str | None = None


class ProjectFundingEventCreate(BaseModel):
    amount_sgd: Decimal = Field(gt=0)
    note: str | None = None


class ProjectUpdateOut(BaseModel):
    id: int
    project_id: int
    author_user_id: int
    status: str
    note: str
    created_at: datetime


class ProjectFundingEventOut(BaseModel):
    id: int
    project_id: int
    author_user_id: int
    amount_sgd: Decimal
    note: str | None
    created_at: datetime
