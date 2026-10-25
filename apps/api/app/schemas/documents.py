from typing import Optional
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    organization_id: str
    machine_id: Optional[str] = None
    title: str
    file_name: str
    file_key: str
    mime_type: str
    file_size_bytes: int
    version: str
    status: str
    page_count: int
    chunk_count: int = 0
    error_message: Optional[str] = None
    created_at: str


class DocumentPagePreviewResponse(BaseModel):
    document_id: str
    page_number: int
    signed_url: str  # same-origin API path that streams the stored file (auth required)
    expires_in_seconds: int = 900
