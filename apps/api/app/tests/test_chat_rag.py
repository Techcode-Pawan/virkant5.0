import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_chat_grounded_torque_query_with_citations():
    payload = {
        "message": "What is the mechanical seal bolt torque for pump PMP-402?",
        "language": "en",
        "machine_id": "PMP-402"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grounded"] is True
    assert data["confidence_status"] == "supported"
    assert "48 Nm" in data["answer"]
    assert "LOTO" in data["answer"]
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
        "machine_id": "CNC-MILL-02"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert "E-304" in data["answer"]
    assert "रेडिएटर" in data["answer"] or "कूलेंट" in data["answer"]

@pytest.mark.asyncio
async def test_chat_insufficient_evidence_when_out_of_scope():
    payload = {
        "message": "How do I bake a chocolate cake in the boiler room?",
        "language": "en"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grounded"] is False
    assert data["confidence_status"] == "insufficient_evidence"
    assert "does not provide verified procedures" in data["answer"]
    assert len(data["citations"]) == 0
