import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.document import Document
from app.models.tenant import Tenant
from app.services.document_service import generate_brd, generate_frd, generate_pdf_from_docx

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])


async def _get_project_or_404(project_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.tenant_id == tenant_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.post("/generate")
async def generate_documents(
    project_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Generate BRD and FRD documents (both .docx and .pdf) for the project."""
    project = await _get_project_or_404(project_id, tenant.id, db)

    # Fetch requirements with scenarios
    result = await db.execute(
        select(Requirement)
        .options(selectinload(Requirement.scenarios))
        .where(Requirement.project_id == project_id)
        .order_by(Requirement.seq)
    )
    requirements = result.scalars().all()

    if not requirements:
        raise HTTPException(status_code=400, detail="No requirements found. Add requirements first.")

    # Validate: all requirements must be reviewed or final
    draft_reqs = [r for r in requirements if r.status == "draft"]
    if draft_reqs:
        ids = ", ".join(r.unique_id for r in draft_reqs[:5])
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate documents: requirements still in draft: {ids}",
        )

    # Validate: every what_to_do must have at least 1 accepted scenario
    missing_scenarios = [
        r for r in requirements
        if r.category == "what_to_do"
        and not any(s.status == "accepted" for s in r.scenarios)
    ]
    if missing_scenarios:
        ids = ", ".join(r.unique_id for r in missing_scenarios[:5])
        raise HTTPException(
            status_code=400,
            detail=f"Requirements missing accepted scenarios: {ids}",
        )

    # Generate documents
    brd_path = generate_brd(project, requirements)
    frd_path = generate_frd(project, requirements)
    brd_pdf = generate_pdf_from_docx(brd_path)
    frd_pdf = generate_pdf_from_docx(frd_path)

    # Record in DB (upsert by doc_type+format)
    for doc_type, fmt, path in [
        ("brd", "docx", brd_path),
        ("brd", "pdf", brd_pdf),
        ("frd", "docx", frd_path),
        ("frd", "pdf", frd_pdf),
    ]:
        existing = await db.execute(
            select(Document).where(
                Document.project_id == project_id,
                Document.doc_type == doc_type,
                Document.format == fmt,
            )
        )
        doc = existing.scalar_one_or_none()
        if doc:
            doc.file_path = str(path)
        else:
            doc = Document(
                project_id=project_id,
                doc_type=doc_type,
                format=fmt,
                file_path=str(path),
            )
            db.add(doc)

    await db.commit()

    return {
        "status": "generated",
        "documents": [
            {"type": "brd", "format": "docx"},
            {"type": "brd", "format": "pdf"},
            {"type": "frd", "format": "docx"},
            {"type": "frd", "format": "pdf"},
        ],
    }


@router.get("/download/{doc_type}/{fmt}")
async def download_document(
    project_id: uuid.UUID,
    doc_type: str,
    fmt: str,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_or_404(project_id, tenant.id, db)

    result = await db.execute(
        select(Document).where(
            Document.project_id == project_id,
            Document.doc_type == doc_type,
            Document.format == fmt,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found. Please generate documents first.")

    media_types = {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pdf": "application/pdf",
        "html": "text/html",
    }
    suffix = fmt if fmt != "pdf" or doc.file_path.endswith(".pdf") else "html"
    media_type = media_types.get(suffix, "application/octet-stream")

    return FileResponse(
        path=doc.file_path,
        media_type=media_type,
        filename=f"{doc_type.upper()}_{project_id}.{suffix}",
    )
