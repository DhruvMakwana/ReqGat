import uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    ai_provider: Mapped[str] = mapped_column(String(20), default="claude")  # claude | openai
    api_key_claude_enc: Mapped[str | None] = mapped_column(String(512), nullable=True)
    api_key_openai_enc: Mapped[str | None] = mapped_column(String(512), nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="tenant")
