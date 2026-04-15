import uuid
from typing import Literal
from pydantic import BaseModel

AIProvider = Literal["claude", "openai"]


class TenantSettingsUpdate(BaseModel):
    ai_provider: AIProvider | None = None
    api_key_claude: str | None = None
    api_key_openai: str | None = None


class TenantOut(BaseModel):
    id: uuid.UUID
    name: str
    ai_provider: str
    has_claude_key: bool
    has_openai_key: bool

    model_config = {"from_attributes": True}
