from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_tenant
from app.core.security import encrypt_api_key
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.tenant import TenantOut, TenantSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/tenant", response_model=TenantOut)
async def get_tenant_settings(
    tenant: Tenant = Depends(get_current_tenant),
):
    return TenantOut(
        id=tenant.id,
        name=tenant.name,
        ai_provider=tenant.ai_provider,
        has_claude_key=bool(tenant.api_key_claude_enc),
        has_openai_key=bool(tenant.api_key_openai_enc),
    )


@router.put("/tenant", response_model=TenantOut)
async def update_tenant_settings(
    body: TenantSettingsUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    if body.ai_provider is not None:
        tenant.ai_provider = body.ai_provider
    if body.api_key_claude is not None:
        tenant.api_key_claude_enc = encrypt_api_key(body.api_key_claude)
    if body.api_key_openai is not None:
        tenant.api_key_openai_enc = encrypt_api_key(body.api_key_openai)

    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)

    return TenantOut(
        id=tenant.id,
        name=tenant.name,
        ai_provider=tenant.ai_provider,
        has_claude_key=bool(tenant.api_key_claude_enc),
        has_openai_key=bool(tenant.api_key_openai_enc),
    )
