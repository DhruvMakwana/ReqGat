import uuid
from datetime import datetime
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    external_ref: str | None = None


class TaskOut(BaseModel):
    id: uuid.UUID
    requirement_id: uuid.UUID
    title: str
    external_ref: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
