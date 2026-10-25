-- =============================================================================
-- Migration: 002_unified_schema.sql
-- Product: ForgeWise AI (Vikrant 5.0)
-- Target: PostgreSQL 16+ with pgvector / Supabase
-- Core Entities: workspaces, users, equipment, documents, document_chunks (with embeddings),
--                chat_sessions, messages, citations, feedback, analytics
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(50) DEFAULT 'enterprise',
    max_storage_bytes BIGINT DEFAULT 107374182400,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workspaces (Per-operator / per-cell isolated knowledge environments)
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'ws-a1111111'
    name VARCHAR(255) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(organization_id);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id VARCHAR(100) REFERENCES workspaces(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'operator' CHECK (role IN ('viewer', 'operator', 'engineer', 'org_admin', 'platform_admin')),
    preferred_language VARCHAR(10) DEFAULT 'hi',
    theme_preference VARCHAR(20) DEFAULT 'dark',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 4. Equipment (Industrial Assets)
CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'PMP-402'
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    plant_location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'operational',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_equipment_org ON equipment(organization_id);

-- Backward compatibility view if machines was queried
CREATE OR REPLACE VIEW machines AS SELECT * FROM equipment;

-- 5. Documents (SOPs, OEM Manuals, Custom Uploads)
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id VARCHAR(100) REFERENCES workspaces(id) ON DELETE SET NULL,
    machine_id VARCHAR(100) REFERENCES equipment(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_key VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'ready',
    page_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_ws ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_machine ON documents(machine_id);

-- 6. Document Chunks (RAG Index with embeddings & full-text search)
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id VARCHAR(100) REFERENCES workspaces(id) ON DELETE SET NULL,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    section_title VARCHAR(500),
    content TEXT NOT NULL,
    embedding JSONB,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_ws ON document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id);

-- 7. Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id VARCHAR(100) REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(36) NOT NULL,
    machine_id VARCHAR(100) REFERENCES equipment(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ws ON chat_sessions(workspace_id);

-- Backward compatibility view if conversations was queried
CREATE OR REPLACE VIEW conversations AS SELECT * FROM chat_sessions;

-- 8. Messages
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    workspace_id VARCHAR(100),
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    groundedness_status VARCHAR(50) DEFAULT 'supported',
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);

-- 9. Citations (Grounded references)
CREATE TABLE IF NOT EXISTS citations (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_id VARCHAR(36),
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id VARCHAR(100),
    page_number INTEGER NOT NULL,
    section_title VARCHAR(500),
    excerpt TEXT NOT NULL,
    relevance_score FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_citations_message ON citations(message_id);

-- 10. Seed Default Workspace ws-a1111111 & Data
INSERT INTO organizations (id, name, slug)
VALUES ('c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b', 'Vikrant Heavy Forge Industries', 'vikrant-heavy-forge')
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspaces (id, name, user_id, organization_id)
VALUES ('ws-a1111111', 'Operator Rajesh Bay C-4', 'a1111111-1111-1111-1111-111111111111', 'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, organization_id, workspace_id, email, full_name, role, preferred_language)
VALUES ('a1111111-1111-1111-1111-111111111111', 'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b', 'ws-a1111111', 'operator.rajesh@vikrant.internal', 'Rajesh Sharma', 'operator', 'hi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment (id, organization_id, name, manufacturer, model, plant_location)
VALUES 
('PMP-402', 'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b', 'High-Pressure Boiler Feed Pump', 'Flowserve', 'HPX-150-B', 'Boiler House 2, Bay C'),
('CNC-MILL-02', 'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b', '5-Axis Precision Machining Center', 'Okuma', 'MU-5000V', 'Machining Cell 4'),
('HYD-PRESS-01', 'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b', '2000-Ton Hydraulic Forging Press', 'Schuler', 'HP-2000-M', 'Heavy Forging Bay 1'),
('ROB-CELL-01', 'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b', 'Heavy Robotic Handling Cell', 'KUKA', 'KR-500', 'Bay C-4 Forge Line')
ON CONFLICT (id) DO NOTHING;
