"""Real MongoDB reads/writes and failure handling."""
from pymongo import AsyncMongoClient

from app.db.mongo import MongoManager, USERS, describe_mongo_error, mongo, redact_uri
from app.tests.conftest import sign_in


async def test_sign_in_writes_user_and_workspace_to_mongodb(client, database):
    data, _ = await sign_in(client, "db.writer@vikrant.internal", role="engineer")
    user = await database[USERS].find_one({"email": "db.writer@vikrant.internal"})
    assert user is not None
    assert user["_id"] == data["user_id"]
    assert user["role"] == "engineer"
    ws = await database["workspaces"].find_one({"_id": data["workspace_id"]})
    assert ws is not None and ws["user_id"] == data["user_id"]


async def test_user_id_is_stable_across_sign_ins(client):
    first, _ = await sign_in(client, "stable.id@vikrant.internal", new_workspace=False)
    second, _ = await sign_in(client, "stable.id@vikrant.internal", new_workspace=False)
    assert first["user_id"] == second["user_id"]
    # Without new_workspace the latest workspace is reused, so history stays visible.
    assert first["workspace_id"] == second["workspace_id"]


async def test_unreachable_database_returns_503_not_fake_success(client):
    real_client, real_db, real_error = mongo._client, mongo._db, mongo.last_error
    dead = AsyncMongoClient("mongodb://127.0.0.1:1", serverSelectionTimeoutMS=300, connectTimeoutMS=300)
    try:
        mongo._client, mongo._db = dead, dead["unreachable"]
        res = await client.get("/api/v1/machines")
        assert res.status_code == 503
        assert res.json()["error"] == "DATABASE_UNAVAILABLE"

        health = (await client.get("/api/v1/health")).json()
        assert health["status"] == "degraded"
        assert health["database"]["status"] == "disconnected"
        assert (await client.get("/api/v1/health/ready")).status_code == 503
    finally:
        await dead.close()
        mongo._client, mongo._db, mongo.last_error = real_client, real_db, real_error
        await mongo.ping()


async def test_connect_failure_is_reported_without_credentials():
    manager = MongoManager()
    ok = await manager.connect("mongodb://admin:s3cretPass@127.0.0.1:1/?authSource=admin", "x",
                               server_selection_timeout_ms=300, connect_timeout_ms=300)
    assert ok is False
    assert manager.last_error and "s3cretPass" not in manager.last_error
    status = await manager.status()
    assert status["status"] == "disconnected"
    assert "s3cretPass" not in str(status)
    await manager.close()


def test_redact_uri_strips_credentials():
    assert redact_uri("mongodb+srv://user:pw@cluster0.abc.mongodb.net/db?x=1") == "mongodb+srv://cluster0.abc.mongodb.net"
    assert redact_uri("mongodb://h1:27017,h2:27017/db") == "mongodb://h1:27017,h2:27017"


def test_describe_error_masks_password():
    msg = describe_mongo_error(Exception("boom pw123"), "mongodb://u:pw123@h/")
    assert "pw123" not in msg
