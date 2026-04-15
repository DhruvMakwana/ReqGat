import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.document import Document
from app.models.tenant import Tenant
from app.schemas.requirement import RequirementCreate, RequirementOut, RequirementUpdate

router = APIRouter(prefix="/projects/{project_id}/requirements", tags=["requirements"])


async def _get_project_or_404(project_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.tenant_id == tenant_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


async def _get_req_or_404(req_id: uuid.UUID, project_id: uuid.UUID, db: AsyncSession) -> Requirement:
    result = await db.execute(
        select(Requirement)
        .options(selectinload(Requirement.scenarios))
        .where(Requirement.id == req_id, Requirement.project_id == project_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return r


@router.get("", response_model=list[RequirementOut])
async def list_requirements(
    project_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_or_404(project_id, tenant.id, db)
    result = await db.execute(
        select(Requirement)
        .options(selectinload(Requirement.scenarios))
        .where(Requirement.project_id == project_id)
        .order_by(Requirement.seq)
    )
    return [RequirementOut.model_validate(r) for r in result.scalars().all()]


@router.post("", response_model=RequirementOut, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    project_id: uuid.UUID,
    body: RequirementCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_or_404(project_id, tenant.id, db)
    count_result = await db.execute(
        select(func.count()).where(Requirement.project_id == project_id)
    )
    seq = count_result.scalar_one() + 1
    req = Requirement(
        project_id=project_id,
        unique_id=f"REQ-{seq:03d}",
        seq=seq,
        **body.model_dump(),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return RequirementOut.model_validate(req)


@router.get("/{req_id}", response_model=RequirementOut)
async def get_requirement(
    project_id: uuid.UUID,
    req_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_or_404(project_id, tenant.id, db)
    return RequirementOut.model_validate(await _get_req_or_404(req_id, project_id, db))


@router.patch("/{req_id}", response_model=RequirementOut)
async def update_requirement(
    project_id: uuid.UUID,
    req_id: uuid.UUID,
    body: RequirementUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_or_404(project_id, tenant.id, db)
    req = await _get_req_or_404(req_id, project_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(req, field, value)
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return RequirementOut.model_validate(req)


@router.delete("/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requirement(
    project_id: uuid.UUID,
    req_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_or_404(project_id, tenant.id, db)
    req = await _get_req_or_404(req_id, project_id, db)

    # Check if used in any generated document
    doc_result = await db.execute(
        select(Document).where(Document.project_id == project_id)
    )
    docs = doc_result.scalars().all()
    if docs:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete requirement: project has generated documents. Delete documents first.",
        )

    await db.delete(req)
    await db.commit()
