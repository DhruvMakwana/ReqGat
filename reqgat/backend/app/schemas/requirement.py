import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel

from app.schemas.scenario import ScenarioOut

Category = Literal["what_to_do", "what_not_to_do", "what_if"]
Priority = Literal["high", "medium", "low"]
Status = Literal["draft", "reviewed", "final"]


class RequirementCreate(BaseModel):
    title: str
    description: str | None = None
    category: Category
    priority: Priority = "medium"


class RequirementUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: Category | None = None
    priority: Priority | None = None
    status: Status | None = None


class RequirementOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    unique_id: str
    title: str
    description: str | None
    category: str
    priority: str
    status: str
    seq: int
    created_at: datetime
    scenarios: list[ScenarioOut] = []

    model_config = {"from_attributes": True}


# For discovery wizard bulk creation
class DiscoveryItem(BaseModel):
    title: str
    description: str | None = None
    category: Category


class DiscoveryInput(BaseModel):
    free_text: str


class DiscoveryResult(BaseModel):
    what_to_do: list[DiscoveryItem]
    what_not_to_do: list[DiscoveryItem]
    what_if: list[DiscoveryItem]


class BulkCreateRequest(BaseModel):
    items: list[DiscoveryItem]
