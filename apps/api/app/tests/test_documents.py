import pytest

from app.core.exceptions import DocumentValidationError
from app.ingestion.pipeline import validate_file_content
from app.services.document_service import safe_filename
from app.tests.conftest import sign_in, upload_text


def test_file_validation_rejects_executable():
    with pytest.raises(DocumentValidationError):
        validate_file_content(b"MZ\x90\x00\x03\x00\x00\x00", "malware.exe")


def test_file_validation_accepts_valid_pdf_magic_bytes():
    assert validate_file_content(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n", "manual.pdf") == "application/pdf"


def test_safe_filename_blocks_path_traversal():
    assert safe_filename("../../etc/passwd") == "passwd"
    assert safe_filename("..\\..\\windows\\win.ini") == "win.ini"
    assert "/" not in safe_filename("a/b/c.pdf")


async def test_upload_list_preview_download_delete(client, database):
    _, headers = await sign_in(client, "docs.owner@vikrant.internal", role="engineer")
    doc = await upload_text(client, headers, "Chiller SOP", "Section 1.1: Chiller\nCoolant flow must be 14.5 to 18.0 L/min.")
    assert doc["status"] == "ready" and doc["chunk_count"] >= 1

    stored = await database["documents"].find_one({"_id": doc["id"]})
    assert stored is not None
    assert await database["document_chunks"].count_documents({"document_id": doc["id"]}) == doc["chunk_count"]

    listed = (await client.get("/api/v1/documents", headers=headers)).json()
    assert [d["id"] for d in listed] == [doc["id"]]

    preview = (await client.get(f"/api/v1/documents/{doc['id']}/pages/1", headers=headers)).json()
    assert preview["signed_url"].startswith(f"/api/v1/documents/{doc['id']}/file")
    file_res = await client.get(f"/api/v1/documents/{doc['id']}/file", headers=headers)
    assert file_res.status_code == 200 and b"14.5" in file_res.content

    chunks = (await client.get(f"/api/v1/documents/{doc['id']}/chunks", headers=headers)).json()
    assert chunks["chunk_count"] == doc["chunk_count"]

    assert (await client.delete(f"/api/v1/documents/{doc['id']}", headers=headers)).status_code == 200
    assert await database["documents"].find_one({"_id": doc["id"]}) is None
    assert await database["document_chunks"].count_documents({"document_id": doc["id"]}) == 0


async def test_other_workspace_cannot_delete_or_read(client):
    _, owner = await sign_in(client, "owner2@vikrant.internal")
    _, other = await sign_in(client, "other2@vikrant.internal")
    doc = await upload_text(client, owner, "Private SOP", "Joint 4 limit is 72 C. Reset relay K12 after 15 minutes.")
    assert (await client.delete(f"/api/v1/documents/{doc['id']}", headers=other)).status_code == 404
    assert (await client.get(f"/api/v1/documents/{doc['id']}/file", headers=other)).status_code == 404
    assert all(d["id"] != doc["id"] for d in (await client.get("/api/v1/documents", headers=other)).json())


async def test_rejects_invalid_file_and_writes_nothing(client, database):
    _, headers = await sign_in(client, "badfile@vikrant.internal")
    before = await database["documents"].count_documents({})
    files = {"file": ("evil.exe", b"MZ\x90\x00", "application/octet-stream")}
    res = await client.post("/api/v1/documents/upload", headers=headers, data={"title": "x"}, files=files)
    assert res.status_code == 400
    assert await database["documents"].count_documents({}) == before
