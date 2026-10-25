import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.document_registry import custom_document_registry

@pytest.fixture(autouse=True)
def seed_test_manuals():
    # Provide test custom SOP manuals to ws-a1111111 for test suite
    custom_document_registry.add_custom_document(
        workspace_id="ws-a1111111",
        doc_dict={
            "id": "test-sop-pmp-402",
            "organization_id": "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
            "machine_id": "PMP-402",
            "title": "Boiler Feed Pump PMP-402 Maintenance Manual",
            "file_name": "SOP_PMP_402.pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 102400,
            "version": "1.0",
            "page_count": 14
        },
        chunks=[
            {
                "id": "c-test-1",
                "page_number": 14,
                "section_title": "Section 3.2: Mechanical Seal Inspection & Torque",
                "machine_id": "PMP-402",
                "content": "When inspecting the cartridge mechanical seal on pump PMP-402, verify that seal flush plan 23 temperature does not exceed 65°C. Gland bolts must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). Excessive gland torque causes seal face distortion and immediate fluid leakage. CAUTION: Ensure suction and discharge valves are fully locked and tagged out (LOTO) prior to loosening any gland nuts."
            }
        ]
    )
    custom_document_registry.add_custom_document(
        workspace_id="ws-a1111111",
        doc_dict={
            "id": "test-sop-cnc-02",
            "organization_id": "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
            "machine_id": "CNC-MILL-02",
            "title": "Okuma MU-5000V Spindle Diagnostic Manual",
            "file_name": "Okuma_Diagnostics.pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 102400,
            "version": "1.0",
            "page_count": 34
        },
        chunks=[
            {
                "id": "c-test-2",
                "page_number": 34,
                "section_title": "Section 5.1: Spindle Chiller Warning E-304",
                "machine_id": "CNC-MILL-02",
                "content": "Alarm code E-304 triggers when the refrigerated spindle coolant loop returns a temperature greater than 88°C for more than 45 seconds. Confirm external chiller fan spins freely and radiator fins are clean. Coolant circulation rate must be 14.5 to 18.0 L/min."
            }
        ]
    )

@pytest.mark.asyncio
async def test_chat_grounded_torque_query_with_citations():
    payload = {
        "message": "What is the mechanical seal bolt torque for pump PMP-402?",
        "language": "en",
        "machine_id": "PMP-402",
        "workspace_id": "ws-a1111111"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grounded"] is True
    assert data["confidence_status"] == "supported"
    assert "48 Nm" in data["answer"]
    assert len(data["citations"]) >= 1
    # Verify citation attributes
    cit = data["citations"][0]
    assert cit["page_number"] > 0
    assert "document_title" in cit
    assert "excerpt" in cit

@pytest.mark.asyncio
async def test_chat_hindi_language_support():
    payload = {
        "message": "स्पिंडल कूलेंट तापमान 88 डिग्री से ऊपर जाने पर क्या करें?",
        "language": "hi",
        "machine_id": "CNC-MILL-02",
        "workspace_id": "ws-a1111111"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert "E-304" in data["answer"]

@pytest.mark.asyncio
async def test_chat_conversational_greetings_handled_gracefully():
    # Greeting in English
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_en = await ac.post("/api/v1/chat", json={"message": "Hello"})
        assert res_en.status_code == 200
        data_en = res_en.json()
        assert data_en["grounded"] is True
        assert "ForgeWise AI" in data_en["answer"]
        assert "copilot" in data_en["answer"].lower()

        # Greeting in Hindi
        res_hi = await ac.post("/api/v1/chat", json={"message": "नमस्ते", "language": "hi"})
        assert res_hi.status_code == 200
        data_hi = res_hi.json()
        assert data_hi["grounded"] is True
        assert "नमस्ते" in data_hi["answer"]

@pytest.mark.asyncio
async def test_chat_insufficient_evidence_when_out_of_scope():
    payload = {
        "message": "How do I bake a chocolate cake in the boiler room?",
        "language": "en",
        "workspace_id": "ws-a1111111"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grounded"] is False
    assert data["confidence_status"] == "insufficient_evidence"
    assert len(data["citations"]) == 0
