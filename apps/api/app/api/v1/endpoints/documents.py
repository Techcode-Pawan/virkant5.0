from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from fastapi.responses import FileResponse

from app.core.exceptions import NotFoundError
from app.core.rate_limit import rate_limit_check
from app.core.security import AuthenticatedUser, get_current_user, require_role
from app.schemas.documents import DocumentPagePreviewResponse, DocumentResponse
from app.services.audit_service import record_audit
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents & Ingestion"])
service = DocumentService()


@router.get("", response_model=List[DocumentResponse])
async def list_documents(machine_id: Optional[str] = None, current_user: AuthenticatedUser = Depends(get_current_user)):
    return await service.list_documents(current_user.organization_id, current_user.workspace_id, machine_id)


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    machine_id: Optional[str] = Form(None),
    version: str = Form("1.0"),
    current_user: AuthenticatedUser = Depends(require_role("operator")),
):
    await rate_limit_check(request, max_requests=30, window_seconds=3600, key_prefix=f"upload:{current_user.user_id}")
    doc = await service.upload_document(
        file=file,
        title=title,
        organization_id=current_user.organization_id,
        workspace_id=current_user.workspace_id,
        machine_id=machine_id,
        version=version,
    )
    await record_audit(current_user, "DOCUMENT_UPLOAD", "document", doc.title, request)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(document_id: str, request: Request, current_user: AuthenticatedUser = Depends(get_current_user)):
    await service.delete_document(document_id, current_user.workspace_id)
    await record_audit(current_user, "DOCUMENT_DELETE", "document", document_id, request)
    return {"status": "deleted", "document_id": document_id}


@router.get("/{document_id}/chunks")
async def get_document_chunks(document_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    chunks = await service.get_chunks(document_id, current_user.workspace_id)
    return {"document_id": document_id, "chunk_count": len(chunks), "chunks": chunks}


@router.get("/{document_id}/file")
async def download_document_file(document_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    doc = await service.get_document(document_id, current_user.workspace_id)
    path = service.file_path(doc)
    if not path.exists():
        raise NotFoundError("The stored file is missing on disk.")
    return FileResponse(path, media_type=doc.get("mime_type") or "application/octet-stream",
                        filename=doc["file_name"], content_disposition_type="inline")


@router.get("/{document_id}/pages/{page_number}", response_model=DocumentPagePreviewResponse)
async def get_page_preview(document_id: str, page_number: int, current_user: AuthenticatedUser = Depends(get_current_user)):
    await service.get_document(document_id, current_user.workspace_id)
    return DocumentPagePreviewResponse(
        document_id=document_id,
        page_number=page_number,
        signed_url=f"/api/v1/documents/{document_id}/file#page={page_number}",
        expires_in_seconds=900,
    )
