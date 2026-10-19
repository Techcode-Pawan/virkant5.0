import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from app.db.models import Document, DocumentChunk, Machine
from app.schemas.documents import DocumentResponse
from app.ingestion.pipeline import process_document_pipeline
from app.core.exceptions import DocumentValidationError

class DocumentService:
    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.session = db_session

    async def list_documents(
        self,
        organization_id: str,
        machine_id: Optional[str] = None
    ) -> List[DocumentResponse]:
        if self.session is None:
            # Fallback demo list
            return [
                DocumentResponse(
                    id="d1111111-1111-1111-1111-111111111111",
                    organization_id=organization_id,
                    machine_id="PMP-402",
                    title="Boiler Feed Pump PMP-402 Maintenance Manual",
                    file_name="SOP_PMP_402_Boiler_Feed.pdf",
                    file_key="raw/sop_pmp_402.pdf",
                    mime_type="application/pdf",
                    file_size_bytes=4892100,
                    version="3.2",
                    status="ready",
                    page_count=48,
                    created_at=datetime.now(timezone.utc).isoformat()
                ),
                DocumentResponse(
                    id="d2222222-2222-2222-2222-222222222222",
                    organization_id=organization_id,
                    machine_id="CNC-MILL-02",
                    title="Okuma MU-5000V Spindle & Cooling Diagnostic Manual",
                    file_name="Okuma_MU5000V_Diagnostics.pdf",
                    file_key="raw/okuma_diagnostics.pdf",
                    mime_type="application/pdf",
                    file_size_bytes=8340210,
                    version="4.1",
                    status="ready",
                    page_count=92,
                    created_at=datetime.now(timezone.utc).isoformat()
                ),
                DocumentResponse(
                    id="d3333333-3333-3333-3333-333333333333",
                    organization_id=organization_id,
                    machine_id="HYD-PRESS-01",
                    title="2000-Ton Hydraulic Press Emergency Isolation SOP",
                    file_name="Hydraulic_Press_Isolation_SOP.docx",
                    file_key="raw/press_isolation.docx",
                    mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    file_size_bytes=2150300,
                    version="2.0",
                    status="ready",
                    page_count=26,
                    created_at=datetime.now(timezone.utc).isoformat()
                )
            ]

        stmt = select(Document).where(Document.organization_id == organization_id)
        if machine_id:
            stmt = stmt.where(Document.machine_id == machine_id)
        stmt = stmt.order_by(Document.created_at.desc())

        res = await self.session.execute(stmt)
        docs = res.scalars().all()
        return [
            DocumentResponse(
                id=str(d.id),
                organization_id=str(d.organization_id),
                machine_id=d.machine_id,
                title=d.title,
                file_name=d.file_name,
                file_key=d.file_key,
                mime_type=d.mime_type,
                file_size_bytes=d.file_size_bytes,
                version=d.version,
                status=d.status,
                page_count=d.page_count,
                error_message=d.error_message,
                created_at=d.created_at.isoformat() if d.created_at else datetime.now(timezone.utc).isoformat()
            )
            for d in docs
        ]

    async def upload_document(
        self,
        file: UploadFile,
        title: str,
        organization_id: str,
        machine_id: Optional[str] = None,
        version: str = "1.0"
    ) -> DocumentResponse:
        content = await file.read()
        doc_id = str(uuid.uuid4())
        file_key = f"raw/{organization_id}/{doc_id}_{file.filename}"

        # Ingestion pipeline extracts, chunks, and embeds
        chunks, page_count = await process_document_pipeline(
            file_bytes=content,
            filename=file.filename,
            document_id=doc_id,
            organization_id=organization_id,
            machine_id=machine_id
        )

        doc = Document(
            id=doc_id,
            organization_id=organization_id,
            machine_id=machine_id,
            title=title or file.filename,
            file_name=file.filename,
            file_key=file_key,
            mime_type=file.content_type or "application/octet-stream",
            file_size_bytes=len(content),
            version=version,
            status="ready",
            page_count=page_count
        )

        if self.session is not None:
            self.session.add(doc)
            for idx, c in enumerate(chunks):
                chunk_record = DocumentChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc_id,
                    organization_id=organization_id,
                    chunk_index=idx,
                    page_number=c["page_number"],
                    section_title=c.get("section_title"),
                    content=c["content"],
                    metadata_json=c.get("metadata", {})
                )
                self.session.add(chunk_record)
            await self.session.commit()

        return DocumentResponse(
            id=doc_id,
            organization_id=organization_id,
            machine_id=machine_id,
            title=doc.title,
            file_name=doc.file_name,
            file_key=file_key,
            mime_type=doc.mime_type,
            file_size_bytes=doc.file_size_bytes,
            version=version,
            status="ready",
            page_count=page_count,
            created_at=datetime.now(timezone.utc).isoformat()
        )
