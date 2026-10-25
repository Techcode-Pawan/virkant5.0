"""
One-time migration of the legacy SQLite store (apps/api/forgewise.db) into MongoDB.

Idempotent: every record is upserted by its original id, so it is safe to re-run.
The SQLite file is only read, never modified.

    cd apps/api
    python scripts/migrate_sqlite_to_mongo.py            # uses MONGODB_URI / MONGODB_DB_NAME from .env
    python scripts/migrate_sqlite_to_mongo.py --dry-run  # just print what would be migrated
"""
import argparse
import asyncio
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings, validate_settings  # noqa: E402
from app.db.mongo import (  # noqa: E402
    CHUNKS, CONVERSATIONS, DOCUMENTS, MACHINES, MESSAGES, ORGANIZATIONS, USERS, WORKSPACES, mongo,
)

DEFAULT_DB = Path(__file__).resolve().parents[1] / "forgewise.db"


def parse_dt(value):
    if not value:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def rows(conn, table):
    try:
        return [dict(r) for r in conn.execute(f"SELECT * FROM {table}")]
    except sqlite3.OperationalError:
        return []


async def migrate(sqlite_path: Path, dry_run: bool) -> None:
    conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    data = {t: rows(conn, t) for t in (
        "organizations", "workspaces", "users", "equipment", "documents",
        "document_chunks", "chat_sessions", "messages", "citations",
    )}
    conn.close()
    for table, items in data.items():
        print(f"  {table:16} {len(items)} rows")
    if dry_run:
        return

    validate_settings(settings)
    if not await mongo.connect(settings.MONGODB_URI, settings.MONGODB_DB_NAME):
        raise SystemExit(f"MongoDB unavailable: {mongo.last_error}")
    db = mongo.db

    async def upsert(collection, doc):
        await db[collection].update_one({"_id": doc["_id"]}, {"$setOnInsert": doc}, upsert=True)

    for o in data["organizations"]:
        await upsert(ORGANIZATIONS, {"_id": o["id"], "name": o["name"], "slug": o["slug"], "created_at": parse_dt(o.get("created_at"))})
    for u in data["users"]:
        existing = await db[USERS].find_one({"email": u["email"].lower()})
        if existing is None:
            await upsert(USERS, {
                "_id": u["id"], "email": u["email"].lower(), "full_name": u.get("full_name"), "role": u.get("role", "operator"),
                "organization_id": u["organization_id"], "preferred_language": u.get("preferred_language", "en"),
                "created_at": parse_dt(u.get("created_at")),
            })
    for w in data["workspaces"]:
        await upsert(WORKSPACES, {
            "_id": w["id"], "name": w["name"], "user_id": w["user_id"], "organization_id": w["organization_id"],
            "default_model": None, "created_at": parse_dt(w.get("created_at")), "updated_at": parse_dt(w.get("created_at")),
        })
    for m in data["equipment"]:
        await db[MACHINES].update_one(
            {"organization_id": m["organization_id"], "machine_id": m["id"]},
            {"$setOnInsert": {
                "_id": f"{m['organization_id']}:{m['id']}", "name": m["name"], "manufacturer": m.get("manufacturer"),
                "model": m.get("model"), "plant_location": m.get("plant_location"), "created_at": parse_dt(m.get("created_at")),
            }},
            upsert=True,
        )
    for d in data["documents"]:
        await upsert(DOCUMENTS, {
            "_id": d["id"], "organization_id": d["organization_id"], "workspace_id": d.get("workspace_id"),
            "machine_id": d.get("machine_id"), "title": d["title"], "file_name": d["file_name"], "file_key": d["file_key"],
            "mime_type": d["mime_type"], "file_size_bytes": d["file_size_bytes"], "version": d.get("version", "1.0"),
            "status": d.get("status", "ready"), "page_count": d.get("page_count", 1),
            "chunk_count": sum(1 for c in data["document_chunks"] if c["document_id"] == d["id"]),
            "error_message": d.get("error_message"), "created_at": parse_dt(d.get("created_at")),
        })
    for c in data["document_chunks"]:
        try:
            embedding = json.loads(c["embedding"]) if c.get("embedding") else None
        except (TypeError, ValueError):
            embedding = None
        # Legacy vectors came from a random-hash mock; tag them so retrieval never compares them.
        await upsert(CHUNKS, {
            "_id": c["id"], "document_id": c["document_id"], "organization_id": c["organization_id"],
            "workspace_id": c.get("workspace_id"), "chunk_index": c["chunk_index"], "page_number": c["page_number"],
            "section_title": c.get("section_title"), "content": c["content"], "embedding": embedding,
            "embedding_model": "legacy-mock", "created_at": parse_dt(c.get("created_at")),
        })

    citations_by_msg = {}
    for cit in data["citations"]:
        citations_by_msg.setdefault(cit["message_id"], []).append({
            "citation_id": cit["id"], "document_id": cit["document_id"], "document_title": cit.get("section_title") or "Document",
            "page_number": cit["page_number"], "section_title": cit.get("section_title"), "excerpt": cit["excerpt"],
            "relevance_score": cit.get("relevance_score", 1.0),
        })
    sessions = {s["id"]: s for s in data["chat_sessions"]}
    counts = {}
    for m in data["messages"]:
        session = sessions.get(m["session_id"])
        if session is None:
            continue
        counts[m["session_id"]] = counts.get(m["session_id"], 0) + 1
        await upsert(MESSAGES, {
            "_id": m["id"], "conversation_id": m["session_id"], "organization_id": session["organization_id"],
            "workspace_id": m.get("workspace_id") or session.get("workspace_id"), "user_id": session["user_id"],
            "sender": m["sender"], "content": m["content"], "groundedness_status": m.get("groundedness_status"),
            "citations": citations_by_msg.get(m["id"], []), "model_used": m.get("model_used"), "provider": "legacy",
            "latency_ms": m.get("latency_ms"), "created_at": parse_dt(m.get("created_at")),
        })
    for s in data["chat_sessions"]:
        await upsert(CONVERSATIONS, {
            "_id": s["id"], "organization_id": s["organization_id"], "workspace_id": s.get("workspace_id"),
            "user_id": s["user_id"], "machine_id": s.get("machine_id"), "title": s["title"], "language": s.get("language", "en"),
            "mode": "grounded", "message_count": counts.get(s["id"], 0), "last_model": None,
            "created_at": parse_dt(s.get("created_at")), "updated_at": parse_dt(s.get("created_at")),
        })
    await mongo.close()
    print("Migration complete.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sqlite", type=Path, default=DEFAULT_DB)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.sqlite.exists():
        raise SystemExit(f"SQLite file not found: {args.sqlite}")
    print(f"Reading {args.sqlite}")
    asyncio.run(migrate(args.sqlite, args.dry_run))


if __name__ == "__main__":
    main()
