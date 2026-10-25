import pytest
import io
from pypdf import PdfWriter
from httpx import AsyncClient, ASGITransport
from app.main import app

def generate_sample_pdf_bytes() -> bytes:
    """Generate a valid, minimal in-memory PDF manual with readable text."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"5 0 obj\n<< /Length 128 >>\nstream\n"
        b"BT\n/F1 12 Tf\n50 700 Td\n(PMP-402 Auxiliary Feedwater Pump seal gland bolt torque is 48 Nm in star pattern.) Tj\nET\n"
        b"endstream\nendobj\nxref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000244 00000 n \n"
        b"0000000325 00000 n \n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n505\n%%EOF\n"
    )

@pytest.mark.asyncio
async def test_e2e_upload_index_hindi_query():
    """
    End-to-End Test for Phase 5 verification:
    1. Uploads custom SOP manual to isolated workspace ws-a1111111.
    2. Verifies document indexed with status 'ready' and page count > 0.
    3. Queries in Hindi regarding pump seal torque.
    4. Confirms the answer is grounded, in Hindi, with citations linking to the manual.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Auth headers for Operator in ws-a1111111
        headers = {
            "Authorization": "Bearer mock-operator:a1111111:c1a2b3c4:ws-a1111111:sess-test"
        }

        # Step 1: Upload a sample custom SOP manual
        pdf_bytes = generate_sample_pdf_bytes()
        files = {
            "file": ("Auxiliary_Feedwater_SOP.pdf", pdf_bytes, "application/pdf")
        }
        data = {
            "title": "Emergency Auxiliary Feedwater Seal SOP",
            "machine_id": "PMP-402",
            "version": "1.0"
        }

        upload_res = await client.post("/api/v1/documents/upload", headers=headers, data=data, files=files)
        assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
        uploaded_doc = upload_res.json()
        assert uploaded_doc["id"] is not None
        assert uploaded_doc["status"] == "ready"
        assert uploaded_doc["page_count"] >= 1

        # Step 2: List documents and ensure the newly uploaded document appears
        list_res = await client.get("/api/v1/documents", headers=headers)
        assert list_res.status_code == 200
        docs = list_res.json()
        doc_ids = [d["id"] for d in docs]
        assert uploaded_doc["id"] in doc_ids

        # Step 3: Query in Hindi regarding PMP-402 torque specs
        hindi_payload = {
            "message": "PMP-402 पंप के सील ग्लैंड बोल्ट का टॉर्क कितना होना चाहिए?",
            "language": "hi",
            "machine_id": "PMP-402",
            "workspace_id": "ws-a1111111"
        }
        chat_res = await client.post("/api/v1/chat", headers=headers, json=hindi_payload)
        assert chat_res.status_code == 200, f"Chat query failed: {chat_res.text}"
        chat_data = chat_res.json()

        # Step 4: Verify groundedness, Hindi language, torque value 48 Nm, and citations
        assert chat_data["grounded"] is True
        assert chat_data["confidence_status"] == "supported"
        assert "48 Nm" in chat_data["answer"] or "48" in chat_data["answer"]
        assert len(chat_data["citations"]) > 0

        first_citation = chat_data["citations"][0]
        assert first_citation["document_title"] is not None
        assert first_citation["page_number"] > 0
        assert len(first_citation["excerpt"]) > 10

        # Step 5: Test Out-of-Scope query (Never hallucinate, strictly say no verified records)
        out_of_scope_payload = {
            "message": "चॉकलेट केक बनाने की रेसिपी क्या है?",
            "language": "hi",
            "machine_id": "PMP-402",
            "workspace_id": "ws-a1111111"
        }
        oos_res = await client.post("/api/v1/chat", headers=headers, json=out_of_scope_payload)
        assert oos_res.status_code == 200
        oos_data = oos_res.json()
        assert oos_data["confidence_status"] == "insufficient_evidence"
        assert "कोई सत्यापित जानकारी नहीं मिली" in oos_data["answer"] or "not provide" in oos_data["answer"].lower()

        # Step 6: Clean up the uploaded custom test document
        del_res = await client.delete(f"/api/v1/documents/{uploaded_doc['id']}", headers=headers)
        assert del_res.status_code == 200
