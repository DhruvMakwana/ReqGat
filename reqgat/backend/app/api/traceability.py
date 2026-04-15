import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.requirement import Requirement
from app.models.project import Project
from app.models.task import Task
from app.models.tenant import Tenant
from app.schemas.task import TaskCreate, TaskOut

router = APIRouter(prefix="/requirements/{req_id}/tasks", tags=["traceability"])


async def _get_req_or_404(req_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Requirement:
    result = await db.execute(
        select(Requirement)
        .join(Project, Requirement.project_id == Project.id)
        .where(Requirement.id == req_id, Project.tenant_id == tenant_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return r


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    req_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_req_or_404(req_id, tenant.id, db)
    result = await db.execute(select(Task).where(Task.requirement_id == req_id))
    return [TaskOut.model_validate(t) for t in result.scalars().all()]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    req_id: uuid.UUID,
    body: TaskCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_req_or_404(req_id, tenant.id, db)
    task = Task(requirement_id=req_id, **body.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    req_id: uuid.UUID,
    task_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_req_or_404(req_id, tenant.id, db)
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.requirement_id == req_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
