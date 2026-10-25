import pytest
import io
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_multi_user_session_generation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Sign in User 1 (Operator Rajesh)
        res1 = await ac.post("/api/v1/auth/session", json={
            "email": "rajesh.sharma@vikrant.internal",
            "role": "operator",
            "preferred_language": "hi",
            "new_workspace": True
        })
        assert res1.status_code == 200
        data1 = res1.json()
        assert "token" in data1
        assert "workspace_id" in data1
        ws1 = data1["workspace_id"]
        assert ws1.startswith("ws-")
        assert data1["role"] == "operator"
        assert len(data1["supported_models"]) >= 4

        # Sign in User 2 (Engineer Elena)
        res2 = await ac.post("/api/v1/auth/session", json={
            "email": "elena.rostova@vikrant.internal",
            "role": "engineer",
            "preferred_language": "en",
            "new_workspace": True
        })
        assert res2.status_code == 200
        data2 = res2.json()
        assert "workspace_id" in data2
        ws2 = data2["workspace_id"]
        assert ws2.startswith("ws-")
        # Ensure workspaces are unique and isolated!
        assert ws1 != ws2

        # Check me endpoint with user 2 token
        token2 = data2["token"]
        me_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token2}"})
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["workspace_id"] == ws2
        assert me_data["role"] == "engineer"

@pytest.mark.asyncio
async def test_custom_sop_upload_and_isolated_retrieval():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Sign in as Engineer Priya with unique workspace
        signin_res = await ac.post("/api/v1/auth/session", json={
            "email": "priya.nair@vikrant.internal",
            "role": "engineer",
            "preferred_language": "en",
            "new_workspace": True
        })
        assert signin_res.status_code == 200
        session_data = signin_res.json()
        token = session_data["token"]
        workspace_id = session_data["workspace_id"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Upload a custom SOP manual (Plain text/markdown format)
        custom_sop_content = (
            "EMERGENCY ROBOTIC CELL SHUTDOWN SOP-ROB-900\n"
            "Section 1.1: Thermal Overload on KUKA Arm Joint 4\n"
            "If Joint 4 temperature exceeds 72°C, immediately depress emergency stop E-STOP-04. "
            "Wait exactly 15 minutes before resetting the safety interlock relay K12. "
            "Never bypass safety light curtains under live power."
        ).encode("utf-8")

        files = {
            "file": ("SOP_ROB_900_Emergency.txt", io.BytesIO(custom_sop_content), "text/plain")
        }
        data = {
            "title": "KUKA Robotic Cell Emergency SOP-ROB-900",
            "machine_id": "ROB-CELL-01",
            "version": "1.0"
        }

        upload_res = await ac.post("/api/v1/documents/upload", headers=headers, data=data, files=files)
        assert upload_res.status_code == 201
        doc_data = upload_res.json()
        doc_id = doc_data["id"]
        assert doc_data["title"] == "KUKA Robotic Cell Emergency SOP-ROB-900"
        assert doc_data["status"] == "ready"

        # 3. Check document list in this isolated workspace
        docs_res = await ac.get("/api/v1/documents", headers=headers)
        assert docs_res.status_code == 200
        docs_list = docs_res.json()
        assert any(d["id"] == doc_id for d in docs_list)

        # 4. Query AI Copilot using the custom uploaded SOP!
        chat_res = await ac.post("/api/v1/chat", headers=headers, json={
            "message": "What should I do if Joint 4 temperature exceeds 72°C on robotic arm?",
            "language": "en",
            "model": "gemini-2.5-flash",
            "workspace_id": workspace_id
        })
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert chat_data["grounded"] is True
        assert chat_data["confidence_status"] == "supported"
        assert "E-STOP-04" in chat_data["answer"] or "72°C" in chat_data["answer"]
        assert len(chat_data["citations"]) > 0
        assert "SOP-ROB-900" in chat_data["citations"][0]["document_title"] or "KUKA" in chat_data["citations"][0]["document_title"]

        # 5. Clean up document
        del_res = await ac.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        assert del_res.status_code == 200

@pytest.mark.asyncio
async def test_multi_llm_and_multilingual_capabilities():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Test Gemini in English
        res_en = await ac.post("/api/v1/chat", json={
            "message": "What is the mechanical seal bolt torque on pump PMP-402?",
            "language": "en",
            "model": "gemini-2.5-flash"
        })
        assert res_en.status_code == 200
        assert "48 Nm" in res_en.json()["answer"]
        assert res_en.json()["model_used"] == "gemini-2.5-flash"

        # Test GPT-4o in Spanish
        res_es = await ac.post("/api/v1/chat", json={
            "message": "¿Cuál es el torque de apriete para la bomba PMP-402?",
            "language": "es",
            "model": "gpt-4o"
        })
        assert res_es.status_code == 200
        assert "48 Nm" in res_es.json()["answer"]
        assert "Torque" in res_es.json()["answer"] or "patrón de estrella" in res_es.json()["answer"]
        assert res_es.json()["model_used"] == "gpt-4o"

        # Test Claude 3.5 in German
        res_de = await ac.post("/api/v1/chat", json={
            "message": "Was ist das Anzugsdrehmoment für Pumpe PMP-402?",
            "language": "de",
            "model": "claude-3-5-sonnet"
        })
        assert res_de.status_code == 200
        assert "48 Nm" in res_de.json()["answer"]
        assert res_de.json()["model_used"] == "claude-3-5-sonnet"
