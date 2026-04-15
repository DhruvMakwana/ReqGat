import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel

ScenarioType = Literal["edge_case", "exception", "conditional"]
ScenarioStatus = Literal["pending", "accepted", "rejected"]


class ScenarioCreate(BaseModel):
    type: ScenarioType
    description: str


class ScenarioUpdate(BaseModel):
    description: str | None = None
    status: ScenarioStatus | None = None


class ScenarioOut(BaseModel):
    id: uuid.UUID
    requirement_id: uuid.UUID
    type: str
    description: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
