import pytest

from app.tests.conftest import DEV_HEADERS, upload_text

PMP_SOP = (
    "Section 3.2: Mechanical Seal Inspection & Torque\n"
    "When inspecting the cartridge mechanical seal on pump PMP-402, verify that seal flush plan 23 temperature "
    "does not exceed 65°C. Gland bolts must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). "
    "CAUTION: Ensure suction and discharge valves are fully locked and tagged out (LOTO) prior to loosening any gland nuts."
)
CNC_SOP = (
    "Section 5.1: Spindle Chiller Warning E-304\n"
    "Alarm code E-304 triggers when the refrigerated spindle coolant loop returns a temperature greater than 88°C "
    "for more than 45 seconds. Confirm external chiller fan spins freely and radiator fins are clean. "
    "Coolant circulation rate must be 14.5 to 18.0 L/min."
)


@pytest.fixture(scope="module", autouse=True)
async def seed_manuals(database):
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await upload_text(ac, DEV_HEADERS, "Boiler Feed Pump PMP-402 Maintenance Manual", PMP_SOP, "PMP-402")
        await upload_text(ac, DEV_HEADERS, "Okuma MU-5000V Spindle Diagnostic Manual", CNC_SOP, "CNC-MILL-02")


async def test_grounded_answer_quotes_documents_with_citations(client):
    res = await client.post("/api/v1/chat", json={
        "message": "What is the mechanical seal bolt torque for pump PMP-402?",
        "language": "en", "machine_id": "PMP-402",
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["grounded"] is True
    assert data["confidence_status"] == "supported"
    assert "48 Nm" in data["answer"]
    # No API keys in tests -> the honest offline extractive mode answered.
    assert data["model_used"] == "offline-extractive"
    assert data["degraded"] is True
    cit = data["citations"][0]
    assert cit["page_number"] > 0 and "PMP-402" in cit["document_title"]
    assert 0 < cit["relevance_score"] <= 1


async def test_hindi_question_retrieves_english_manual(client):
    res = await client.post("/api/v1/chat", json={
        "message": "स्पिंडल कूलेंट तापमान 88 डिग्री से ऊपर जाने पर क्या करें?",
        "language": "hi", "machine_id": "CNC-MILL-02",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["language"] == "hi"
    assert "E-304" in data["answer"]


async def test_conversational_greetings_handled_gracefully(client):
    res_en = (await client.post("/api/v1/chat", json={"message": "Hello"})).json()
    assert res_en["grounded"] is True
    assert "ForgeWise AI" in res_en["answer"] and "copilot" in res_en["answer"].lower()
    res_hi = (await client.post("/api/v1/chat", json={"message": "नमस्ते", "language": "hi"})).json()
    assert "नमस्ते" in res_hi["answer"]


async def test_insufficient_evidence_when_out_of_scope(client):
    res = await client.post("/api/v1/chat", json={"message": "How do I bake a chocolate cake in the boiler room?"})
    data = res.json()
    assert data["grounded"] is False
    assert data["confidence_status"] == "insufficient_evidence"
    assert data["citations"] == []
    assert "48 Nm" not in data["answer"]  # never fabricates specs


async def test_general_mode_without_any_provider_reports_unavailable(client):
    res = await client.post("/api/v1/chat", json={
        "message": "Explain how a centrifugal pump works", "mode": "general",
    })
    assert res.status_code == 503
    body = res.json()
    assert body["error"] == "LLM_UNAVAILABLE"
    assert "No AI provider is configured" in body["message"]
    assert body["details"]["conversation_id"]


async def test_conversation_history_persists(client, database):
    first = (await client.post("/api/v1/chat", json={
        "message": "What is the gland bolt torque on PMP-402?", "machine_id": "PMP-402",
    })).json()
    conv_id = first["conversation_id"]
    second = (await client.post("/api/v1/chat", json={
        "message": "And what is the plan 23 flush temperature limit?", "conversation_id": conv_id, "machine_id": "PMP-402",
    })).json()
    assert second["conversation_id"] == conv_id

    history = (await client.get("/api/v1/chat/history")).json()
    assert any(c["id"] == conv_id and c["message_count"] == 4 for c in history)

    detail = (await client.get(f"/api/v1/chat/conversations/{conv_id}")).json()
    assert [m["sender"] for m in detail["messages"]] == ["user", "assistant", "user", "assistant"]
    assert detail["messages"][1]["citations"]
    assert await database["messages"].count_documents({"conversation_id": conv_id}) == 4

    # Feedback is stored against the real message.
    fb = await client.post("/api/v1/feedback", json={"message_id": first["message_id"], "rating": 1})
    assert fb.status_code == 201
    assert (await database["messages"].find_one({"_id": first["message_id"]}))["feedback"] == 1

    assert (await client.delete(f"/api/v1/chat/conversations/{conv_id}")).status_code == 200
    assert await database["messages"].count_documents({"conversation_id": conv_id}) == 0


async def test_cannot_read_another_users_conversation(client):
    first = (await client.post("/api/v1/chat", json={"message": "Hello"})).json()
    other = {"Authorization": "Bearer mock-operator:someone-else:c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b:ws-other"}
    res = await client.get(f"/api/v1/chat/conversations/{first['conversation_id']}", headers=other)
    assert res.status_code == 404
