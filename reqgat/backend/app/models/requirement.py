import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    unique_id: Mapped[str] = mapped_column(String(20), nullable=False)  # REQ-001
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # what_to_do | what_not_to_do | what_if
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    # high | medium | low
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    # draft | reviewed | final
    status: Mapped[str] = mapped_column(String(20), default="draft")
    seq: Mapped[int] = mapped_column(Integer, nullable=False)  # for ordering within project
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    project: Mapped["Project"] = relationship("Project", back_populates="requirements")
    scenarios: Mapped[list["Scenario"]] = relationship(
        "Scenario", back_populates="requirement", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="requirement", cascade="all, delete-orphan"
    )
