import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel


DomainType = Literal["erp", "crm", "custom"]


class ProjectCreate(BaseModel):
    name: str
    domain_type: DomainType
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_by: uuid.UUID
    name: str
    domain_type: str
    description: str | None
    created_at: datetime
    requirement_count: int = 0

    model_config = {"from_attributes": True}
