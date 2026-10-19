import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.ingestion.pipeline import validate_file_content
from app.core.exceptions import DocumentValidationError

def test_file_validation_rejects_executable():
    fake_exe = b"MZ\x90\x00\x03\x00\x00\x00"
    with pytest.raises(DocumentValidationError):
        validate_file_content(fake_exe, "malware.exe")

def test_file_validation_accepts_valid_pdf_magic_bytes():
    valid_pdf_header = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"
    mime = validate_file_content(valid_pdf_header, "manual.pdf")
    assert mime == "application/pdf"

@pytest.mark.asyncio
async def test_list_documents_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/documents")
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)
    assert len(docs) >= 1
    assert "title" in docs[0]
    assert "page_count" in docs[0]

@pytest.mark.asyncio
async def test_document_page_preview_signed_url():
    doc_id = "d1111111-1111-1111-1111-111111111111"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/documents/{doc_id}/pages/14")
    assert response.status_code == 200
    data = response.json()
    assert "signed_url" in data
    assert data["page_number"] == 14
    assert data["expires_in_seconds"] == 900
