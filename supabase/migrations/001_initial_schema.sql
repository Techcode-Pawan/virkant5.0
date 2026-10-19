-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Product: ForgeWise AI (Vikrant 5.0)
-- Target: PostgreSQL 16+ with pgvector
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(50) DEFAULT 'enterprise',
    max_storage_bytes BIGINT DEFAULT 107374182400, -- 100 GB
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Users bound to organization)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'operator', 'engineer', 'knowledge_manager', 'org_admin', 'platform_admin')),
    preferred_language VARCHAR(10) DEFAULT 'en',
    theme_preference VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Machines (Industrial Assets)
CREATE TABLE IF NOT EXISTS machines (
    id VARCHAR(100) PRIMARY KEY, -- e.g., 'CNC-MILL-02'
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    plant_location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_machines_org_id ON machines(organization_id);

-- 4. Documents (SOPs, OEM Manuals, Schematics)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    machine_id VARCHAR(100) REFERENCES machines(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_key VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    page_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_machine ON documents(machine_id);

-- 5. Document Chunks (RAG Index with pgvector & FTS)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    section_title VARCHAR(500),
    content TEXT NOT NULL,
    embedding vector(1536),
    tsv_content tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_org ON document_chunks(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv ON document_chunks USING gin(tsv_content);

-- 6. Document Images & Schematics
CREATE TABLE IF NOT EXISTS document_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    image_key VARCHAR(1000) NOT NULL,
    caption TEXT,
    ocr_text TEXT,
    vision_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    machine_id VARCHAR(100) REFERENCES machines(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);

-- 8. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    groundedness_status VARCHAR(50) DEFAULT 'supported' CHECK (groundedness_status IN ('supported', 'insufficient_evidence', 'needs_review')),
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

-- 9. Citations (Grounded references)
CREATE TABLE IF NOT EXISTS citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    excerpt TEXT NOT NULL,
    relevance_score FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_citations_message ON citations(message_id);

-- 10. Feedback (Thumbs up/down & remarks)
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Audit Logs (Tamper-evident system activity)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(255),
    ip_address VARCHAR(50),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);

-- 12. Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    query_text_sanitized TEXT,
    latency_ms INTEGER,
    citation_count INTEGER DEFAULT 0,
    is_unanswered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_org_created ON analytics_events(organization_id, created_at DESC);

-- =============================================================================
-- Row Level Security (RLS) Setup
-- =============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Note: In production Supabase, policies check auth.jwt() ->> 'org_id'.
-- Application-level backend repositories also strictly filter by organization_id.
