import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.requirement import Requirement
from app.models.scenario import Scenario
from app.models.project import Project
from app.models.tenant import Tenant
from app.schemas.scenario import ScenarioCreate, ScenarioOut, ScenarioUpdate
from app.services.ai_service import get_ai_provider

router = APIRouter(prefix="/requirements/{req_id}/scenarios", tags=["scenarios"])


async def _get_req_or_404(req_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Requirement:
    result = await db.execute(
        select(Requirement)
        .join(Project, Requirement.project_id == Project.id)
        .options(selectinload(Requirement.scenarios))
        .where(Requirement.id == req_id, Project.tenant_id == tenant_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return r


@router.get("", response_model=list[ScenarioOut])
async def list_scenarios(
    req_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    req = await _get_req_or_404(req_id, tenant.id, db)
    return [ScenarioOut.model_validate(s) for s in req.scenarios]


@router.post("/generate", response_model=list[ScenarioOut], status_code=status.HTTP_201_CREATED)
async def generate_scenarios(
    req_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Use AI to auto-generate 3 scenarios for a 'what_to_do' requirement."""
    req = await _get_req_or_404(req_id, tenant.id, db)
    if req.category != "what_to_do":
        raise HTTPException(status_code=400, detail="Scenarios are only generated for 'what_to_do' requirements")

    try:
        provider = get_ai_provider(tenant)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    scenario_data = await provider.expand_scenarios(req.title, req.description or "")

    created = []
    for sc in scenario_data:
        scenario = Scenario(
            requirement_id=req.id,
            type=sc.type,
            description=sc.description,
            status="pending",
        )
        db.add(scenario)
        await db.flush()
        created.append(scenario)

    await db.commit()
    for s in created:
        await db.refresh(s)
    return [ScenarioOut.model_validate(s) for s in created]


@router.post("", response_model=ScenarioOut, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    req_id: uuid.UUID,
    body: ScenarioCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    req = await _get_req_or_404(req_id, tenant.id, db)
    scenario = Scenario(requirement_id=req.id, **body.model_dump())
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)
    return ScenarioOut.model_validate(scenario)


@router.patch("/{scenario_id}", response_model=ScenarioOut)
async def update_scenario(
    req_id: uuid.UUID,
    scenario_id: uuid.UUID,
    body: ScenarioUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_req_or_404(req_id, tenant.id, db)
    result = await db.execute(
        select(Scenario).where(Scenario.id == scenario_id, Scenario.requirement_id == req_id)
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(scenario, field, value)
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)
    return ScenarioOut.model_validate(scenario)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    req_id: uuid.UUID,
    scenario_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_req_or_404(req_id, tenant.id, db)
    result = await db.execute(
        select(Scenario).where(Scenario.id == scenario_id, Scenario.requirement_id == req_id)
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    await db.delete(scenario)
    await db.commit()
