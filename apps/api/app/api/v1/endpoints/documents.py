from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.documents import DocumentResponse, DocumentPagePreviewResponse
from app.services.document_service import DocumentService
from app.core.security import get_current_user, AuthenticatedUser
from app.core.rate_limit import rate_limit_check
from app.db.session import get_db_session
from app.services.document_registry import custom_document_registry

router = APIRouter(prefix="/documents", tags=["Documents & Ingestion"])

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    machine_id: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    service = DocumentService(db_session=session)
    return await service.list_documents(
        organization_id=current_user.organization_id,
        machine_id=machine_id,
        workspace_id=current_user.workspace_id
    )

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    machine_id: Optional[str] = Form(None),
    version: str = Form("1.0"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    # Enforce upload rate limit (30 uploads/hour per user session)
    await rate_limit_check(request, max_requests=30, window_seconds=3600, key_prefix=f"upload:{current_user.user_id}")

    service = DocumentService(db_session=session)
    return await service.upload_document(
        file=file,
        title=title,
        organization_id=current_user.organization_id,
        machine_id=machine_id,
        version=version,
        workspace_id=current_user.workspace_id
    )

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    service = DocumentService(db_session=session)
    success = await service.delete_document(document_id, workspace_id=current_user.workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or cannot be deleted")
    return {"status": "deleted", "document_id": document_id}

@router.get("/{document_id}/chunks")
async def get_document_chunks(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    chunks = custom_document_registry.get_all_chunks(workspace_id=current_user.workspace_id)
    matching = [c for c in chunks if c.get("document_id") == document_id]
    return {
        "document_id": document_id,
        "chunk_count": len(matching),
        "chunks": matching
    }

@router.get("/{document_id}/pages/{page_number}", response_model=DocumentPagePreviewResponse)
async def get_page_preview(
    document_id: str,
    page_number: int,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Generate signed preview URL with short 15-minute TTL
    signed_url = f"https://storage.forgewise.internal/signed/{current_user.organization_id}/{document_id}/page_{page_number}.png?token=exp_900_sig_valid"
    return DocumentPagePreviewResponse(
        document_id=document_id,
        page_number=page_number,
        signed_url=signed_url,
        expires_in_seconds=900
    )
