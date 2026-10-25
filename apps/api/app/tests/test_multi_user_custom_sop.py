from app.tests.conftest import sign_in, upload_text

ROB_SOP = (
    "EMERGENCY ROBOTIC CELL SHUTDOWN SOP-ROB-900\n"
    "Section 1.1: Thermal Overload on KUKA Arm Joint 4\n"
    "If Joint 4 temperature exceeds 72°C, immediately depress emergency stop E-STOP-04. "
    "Wait exactly 15 minutes before resetting the safety interlock relay K12. "
    "Never bypass safety light curtains under live power."
)


async def test_multi_user_session_generation(client):
    data1, _ = await sign_in(client, "rajesh.sharma@vikrant.internal", "operator", "hi")
    data2, headers2 = await sign_in(client, "elena.rostova@vikrant.internal", "engineer", "en")
    assert data1["workspace_id"].startswith("ws-") and data2["workspace_id"].startswith("ws-")
    assert data1["workspace_id"] != data2["workspace_id"]
    assert "offline-extractive" in data1["supported_models"]

    me = (await client.get("/api/v1/auth/me", headers=headers2)).json()
    assert me["workspace_id"] == data2["workspace_id"]
    assert me["role"] == "engineer"


async def test_custom_sop_upload_and_isolated_retrieval(client):
    session, headers = await sign_in(client, "priya.nair@vikrant.internal", "engineer")
    doc = await upload_text(client, headers, "KUKA Robotic Cell Emergency SOP-ROB-900", ROB_SOP, "ROB-CELL-01",
                            filename="SOP_ROB_900_Emergency.txt")

    chat = (await client.post("/api/v1/chat", headers=headers, json={
        "message": "What should I do if Joint 4 temperature exceeds 72°C on robotic arm?", "language": "en",
    })).json()
    assert chat["grounded"] is True
    assert "E-STOP-04" in chat["answer"]
    assert "SOP-ROB-900" in chat["citations"][0]["document_title"]
    assert chat["workspace_id"] == session["workspace_id"]

    # A different user's workspace must not see this SOP.
    _, other_headers = await sign_in(client, "outsider@vikrant.internal", "operator")
    leak = (await client.post("/api/v1/chat", headers=other_headers, json={
        "message": "What should I do if Joint 4 temperature exceeds 72°C on robotic arm?",
    })).json()
    assert leak["grounded"] is False and leak["citations"] == []

    assert (await client.delete(f"/api/v1/documents/{doc['id']}", headers=headers)).status_code == 200


async def test_legacy_model_ids_are_resolved(client):
    _, headers = await sign_in(client, "legacy.models@vikrant.internal", "engineer")
    await upload_text(client, headers, "Robot SOP-ROB-900", ROB_SOP)
    res = (await client.post("/api/v1/chat", headers=headers, json={
        "message": "Joint 4 temperature exceeds 72°C what to do", "model": "forgewise-expert",
    })).json()
    assert res["model_used"] == "offline-extractive"
    assert "E-STOP-04" in res["answer"]
