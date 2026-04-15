import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_tenant
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


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


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.tenant_id == tenant.id).order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    out = []
    for p in projects:
        count_result = await db.execute(
            select(func.count()).where(Requirement.project_id == p.id)
        )
        count = count_result.scalar_one()
        po = ProjectOut.model_validate(p)
        po.requirement_count = count
        out.append(po)
    return out


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        tenant_id=tenant.id,
        created_by=current_user.id,
        name=body.name,
        domain_type=body.domain_type,
        description=body.description,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    po = ProjectOut.model_validate(project)
    po.requirement_count = 0
    return po


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, tenant.id, db)
    count_result = await db.execute(
        select(func.count()).where(Requirement.project_id == project.id)
    )
    po = ProjectOut.model_validate(project)
    po.requirement_count = count_result.scalar_one()
    return po


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, tenant.id, db)
    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    db.add(project)
    await db.commit()
    await db.refresh(project)
    po = ProjectOut.model_validate(project)
    return po


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, tenant.id, db)
    await db.delete(project)
    await db.commit()
