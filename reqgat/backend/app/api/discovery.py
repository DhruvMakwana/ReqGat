import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.tenant import Tenant
from app.schemas.requirement import DiscoveryInput, DiscoveryResult, BulkCreateRequest, RequirementOut
from app.services.ai_service import get_ai_provider

router = APIRouter(prefix="/projects/{project_id}/discovery", tags=["discovery"])


async def _get_project_or_404(
    project_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.tenant_id == tenant_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _next_seq(project_id: uuid.UUID, db: AsyncSession) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.count()).where(Requirement.project_id == project_id)
    )
    return result.scalar_one() + 1


@router.post("/analyze", response_model=DiscoveryResult)
async def analyze_requirements(
    project_id: uuid.UUID,
    body: DiscoveryInput,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Send free text to AI and return structured What/Not/What-if suggestions."""
    project = await _get_project_or_404(project_id, tenant.id, db)
    try:
        provider = get_ai_provider(tenant)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = await provider.structure_requirements(body.free_text, project.domain_type)
    return result


@router.post("/save", response_model=list[RequirementOut], status_code=201)
async def save_discovery_items(
    project_id: uuid.UUID,
    body: BulkCreateRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-create accepted discovery items as Requirement records."""
    project = await _get_project_or_404(project_id, tenant.id, db)

    created = []
    for item in body.items:
        seq = await _next_seq(project_id, db)
        req = Requirement(
            project_id=project.id,
            unique_id=f"REQ-{seq:03d}",
            title=item.title,
            description=item.description,
            category=item.category,
            priority="medium",
            status="draft",
            seq=seq,
        )
        db.add(req)
        await db.flush()
        created.append(req)

    await db.commit()
    for req in created:
        await db.refresh(req)

    return [RequirementOut.model_validate(r) for r in created]
