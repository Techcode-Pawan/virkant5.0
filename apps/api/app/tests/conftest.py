"""
Tests run against a real MongoDB (default mongodb://127.0.0.1:27017) using a
throw-away database, and with every LLM provider key blanked so no paid API is
ever called. Provider behaviour is exercised with fake adapters instead.

Override with TEST_MONGODB_URI if your MongoDB is elsewhere.
"""
import io
import os

# Must be set before the app (and its Settings) are imported.
os.environ["APPLICATION_ENV"] = "test"
os.environ["MONGODB_URI"] = os.environ.get("TEST_MONGODB_URI", "mongodb://127.0.0.1:27017")
os.environ["MONGODB_DB_NAME"] = os.environ.get("TEST_MONGODB_DB_NAME", "vikrant5_test")
os.environ["MONGODB_SERVER_SELECTION_TIMEOUT_MS"] = "3000"
os.environ["JWT_SECRET"] = "test-secret-not-for-production-use-0123456789abcdef"
os.environ["STORAGE_DIR"] = "storage_test"
for key in ("GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OLLAMA_BASE_URL", "LLM_API_KEY",
            "LLM_PRIMARY_MODEL", "LLM_FALLBACK_MODELS", "LLM_MODEL", "LLM_PROVIDER"):
    os.environ[key] = ""
os.environ["EMBEDDING_PROVIDER"] = "local"
os.environ["VISION_PROVIDER"] = "none"
os.environ["LLM_RETRY_BASE_DELAY_SECONDS"] = "0.01"
os.environ["LLM_RETRY_MAX_DELAY_SECONDS"] = "0.05"

import shutil
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings, validate_settings
from app.db.mongo import mongo
from app.main import app
from app.services.workspace_service import seed_defaults

DEV_HEADERS = {"Authorization": "Bearer mock-operator:a1111111-1111-1111-1111-111111111111:c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b:ws-a1111111:sess-test"}


@pytest.fixture(scope="session", autouse=True)
async def database():
    validate_settings(settings)
    ok = await mongo.connect(settings.MONGODB_URI, settings.MONGODB_DB_NAME, server_selection_timeout_ms=3000)
    if not ok:
        pytest.exit(f"MongoDB is required for the test-suite: {mongo.last_error}", returncode=2)
    client = mongo._client
    await client.drop_database(settings.MONGODB_DB_NAME)
    mongo._indexes_ready = False
    await mongo.ensure_indexes()
    await seed_defaults()
    yield mongo.db
    await client.drop_database(settings.MONGODB_DB_NAME)
    await mongo.close()
    shutil.rmtree(Path(__file__).resolve().parents[2] / "storage_test", ignore_errors=True)


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def sign_in(client, email, role="operator", language="en", new_workspace=True):
    res = await client.post("/api/v1/auth/session", json={
        "email": email, "role": role, "preferred_language": language, "new_workspace": new_workspace,
    })
    assert res.status_code == 200, res.text
    data = res.json()
    return data, {"Authorization": f"Bearer {data['token']}"}


async def upload_text(client, headers, title, text, machine_id=None, filename="sop.txt"):
    files = {"file": (filename, io.BytesIO(text.encode("utf-8")), "text/plain")}
    data = {"title": title, "version": "1.0"}
    if machine_id:
        data["machine_id"] = machine_id
    res = await client.post("/api/v1/documents/upload", headers=headers, data=data, files=files)
    assert res.status_code == 201, res.text
    return res.json()
