import sqlite3
import json
import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.logging import app_logger

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "forgewise.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """
    Initializes all 8 production-grade tables and seeds ws-a1111111.
    """
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Organizations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        tier TEXT DEFAULT 'enterprise',
        max_storage_bytes INTEGER DEFAULT 107374182400,
        created_at TEXT
    );
    """)

    # 2. Workspaces
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT
    );
    """)

    # 3. Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        workspace_id TEXT,
        email TEXT NOT NULL,
        full_name TEXT,
        role TEXT NOT NULL DEFAULT 'operator',
        preferred_language TEXT DEFAULT 'hi',
        theme_preference TEXT DEFAULT 'dark',
        created_at TEXT
    );
    """)

    # 4. Equipment
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS equipment (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        plant_location TEXT,
        status TEXT DEFAULT 'operational',
        created_at TEXT
    );
    """)

    # 5. Documents
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        workspace_id TEXT,
        machine_id TEXT,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_key TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        version TEXT DEFAULT '1.0',
        status TEXT DEFAULT 'ready',
        page_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT
    );
    """)

    # 6. Document Chunks (with JSON serialized embeddings)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        workspace_id TEXT,
        chunk_index INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        section_title TEXT,
        content TEXT NOT NULL,
        embedding TEXT, -- JSON array of floats (1536d or dense vector)
        metadata_json TEXT DEFAULT '{}',
        created_at TEXT,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    """)

    # 7. Chat Sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        workspace_id TEXT,
        user_id TEXT NOT NULL,
        machine_id TEXT,
        title TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        created_at TEXT
    );
    """)

    # 8. Messages
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        workspace_id TEXT,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        model_used TEXT DEFAULT 'gemini-2.5-flash',
        groundedness_status TEXT DEFAULT 'supported',
        latency_ms INTEGER,
        created_at TEXT,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
    """)

    # 9. Citations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS citations (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        chunk_id TEXT,
        document_id TEXT NOT NULL,
        workspace_id TEXT,
        page_number INTEGER NOT NULL,
        section_title TEXT,
        excerpt TEXT NOT NULL,
        relevance_score REAL DEFAULT 1.0,
        created_at TEXT,
        FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
    """)

    # SEEDING: ws-a1111111 and baseline assets
    now_iso = datetime.now(timezone.utc).isoformat()
    org_id = "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b"

    cursor.execute(
        "INSERT OR IGNORE INTO organizations (id, name, slug, tier, created_at) VALUES (?, ?, ?, ?, ?)",
        (org_id, "Vikrant Heavy Forge Industries", "vikrant-heavy-forge", "enterprise", now_iso)
    )

    # Seed Workspace ws-a1111111
    cursor.execute(
        "INSERT OR IGNORE INTO workspaces (id, name, user_id, organization_id, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
        ("ws-a1111111", "Operator Rajesh Bay C-4", "a1111111-1111-1111-1111-111111111111", org_id, now_iso)
    )

    # Seed User Operator Rajesh
    cursor.execute(
        "INSERT OR IGNORE INTO users (id, organization_id, workspace_id, email, full_name, role, preferred_language, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ("a1111111-1111-1111-1111-111111111111", org_id, "ws-a1111111", "operator.rajesh@vikrant.internal", "Rajesh Sharma", "operator", "hi", now_iso)
    )

    # Seed 4 Industrial Equipment
    machines = [
        ("PMP-402", "High-Pressure Boiler Feed Pump", "Flowserve", "HPX-150-B", "Boiler House 2, Bay C", "operational"),
        ("CNC-MILL-02", "5-Axis Precision Machining Center", "Okuma", "MU-5000V", "Machining Cell 4", "operational"),
        ("HYD-PRESS-01", "2000-Ton Hydraulic Forging Press", "Schuler", "HP-2000-M", "Heavy Forging Bay 1", "warning"),
        ("ROB-CELL-01", "Heavy Robotic Handling Cell", "KUKA", "KR-500", "Bay C-4 Forge Line", "operational"),
    ]
    for m in machines:
        cursor.execute(
            "INSERT OR IGNORE INTO equipment (id, organization_id, name, manufacturer, model, plant_location, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (m[0], org_id, m[1], m[2], m[3], m[4], m[5], now_iso)
        )

    # SOP Library starts completely clean: accepting only real user-uploaded manuals
    conn.commit()
    conn.close()
    app_logger.info("ForgeWise AI local SQLite database initialized with zero mock documents.")

# Asynchronous helper functions
async def execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    def _run():
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(query, params)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    return await asyncio.to_thread(_run)

async def execute_write(query: str, params: tuple = ()) -> int:
    def _run():
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
        last_id = cur.lastrowid
        conn.close()
        return last_id
    return await asyncio.to_thread(_run)
