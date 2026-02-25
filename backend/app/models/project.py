from sqlalchemy import (
    String,
    Integer,
    Date,
    DateTime,
    Text,
    ForeignKey,
    Numeric,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    institution: Mapped[str] = mapped_column(String(128), nullable=False)
    domain: Mapped[str] = mapped_column(String(128), nullable=False)  # e.g., Radiology, Finance

    ai_type: Mapped[str] = mapped_column(String(128), nullable=False)  # e.g., CV, NLP, tabular
    maturity_stage: Mapped[str] = mapped_column(String(64), nullable=False, default="Discovery")
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="Active")

    # Governance
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False, default="Medium")
    compliance_status: Mapped[str] = mapped_column(String(64), nullable=False, default="Not Started")
    approvals: Mapped[str | None] = mapped_column(String(255), nullable=True)  # comma-separated for MVP
    data_sensitivity: Mapped[str] = mapped_column(String(64), nullable=False, default="De-identified")

    # Funding / timeline
    funding_amount_sgd: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    start_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="projects")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    updates = relationship("ProjectUpdate", back_populates="project", cascade="all, delete-orphan")
