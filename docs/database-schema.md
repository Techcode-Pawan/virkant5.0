# Database Schema Documentation — ForgeWise AI

## 1. Schema Overview
The ForgeWise AI database runs on PostgreSQL 16 with the `pgvector` and `pgcrypto` extensions.

```
                    ┌───────────────────────────┐
                    │       organizations       │
                    └─────────────┬─────────────┘
                                  │ 1:N
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│     users     │         │   machines    │         │   documents   │
│  (profiles)   │         │               │         │               │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │ 1:N
        │ 1:N                     │                         ▼
        ▼                         │                 ┌───────────────┐
┌───────────────┐                 │                 │document_chunks│
│ conversations │                 │                 │ (vector 1536) │
└───────┬───────┘                 │                 └───────┬───────┘
        │ 1:N                     │                         │
        ▼                         │                         │
┌───────────────┐                 │                         │
│   messages    │                 │                         │
└───────┬───────┘                 │                         │
        │ 1:N                     │                         │
        ▼                         ▼                         │
┌───────────────┐◄──────────────────────────────────────────┘
│   citations   │
└───────────────┘
```

## 2. Table Definitions

### `organizations`
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255), Not Null)
- `slug` (VARCHAR(100), Unique, Not Null)
- `tier` (VARCHAR(50), Default 'enterprise')
- `max_storage_bytes` (BIGINT, Default 107374182400 [100 GB])
- `created_at` (TIMESTAMPTZ, Default NOW())

### `profiles`
- `id` (UUID, Primary Key, references auth.users)
- `organization_id` (UUID, References organizations(id) ON DELETE CASCADE)
- `email` (VARCHAR(255), Not Null)
- `full_name` (VARCHAR(255))
- `role` (VARCHAR(50), Default 'viewer', Checks: in ('viewer', 'operator', 'engineer', 'knowledge_manager', 'org_admin', 'platform_admin'))
- `preferred_language` (VARCHAR(10), Default 'en')
- `theme_preference` (VARCHAR(20), Default 'light')
- `created_at` (TIMESTAMPTZ, Default NOW())

### `machines`
- `id` (VARCHAR(100), Primary Key) — e.g. `CNC-MILL-02`
- `organization_id` (UUID, References organizations(id) ON DELETE CASCADE)
- `name` (VARCHAR(255), Not Null)
- `manufacturer` (VARCHAR(255))
- `model` (VARCHAR(255))
- `plant_location` (VARCHAR(255))
- `created_at` (TIMESTAMPTZ, Default NOW())

### `documents`
- `id` (UUID, Primary Key)
- `organization_id` (UUID, References organizations(id) ON DELETE CASCADE)
- `machine_id` (VARCHAR(100), References machines(id) ON DELETE SET NULL)
- `title` (VARCHAR(500), Not Null)
- `file_name` (VARCHAR(500), Not Null)
- `file_key` (VARCHAR(1000), Not Null)
- `mime_type` (VARCHAR(100), Not Null)
- `file_size_bytes` (BIGINT, Not Null)
- `version` (VARCHAR(50), Default '1.0')
- `status` (VARCHAR(50), Default 'pending', Checks: in ('pending', 'processing', 'ready', 'failed'))
- `error_message` (TEXT)
- `page_count` (INTEGER, Default 0)
- `created_at` (TIMESTAMPTZ, Default NOW())

### `document_chunks`
- `id` (UUID, Primary Key)
- `document_id` (UUID, References documents(id) ON DELETE CASCADE)
- `organization_id` (UUID, References organizations(id) ON DELETE CASCADE)
- `chunk_index` (INTEGER, Not Null)
- `page_number` (INTEGER, Not Null)
- `section_title` (VARCHAR(500))
- `content` (TEXT, Not Null)
- `embedding` (vector(1536)) — pgvector cosine vector
- `tsv_content` (tsvector) — Generated column for full-text search
- `metadata_json` (JSONB)
- `created_at` (TIMESTAMPTZ, Default NOW())

### `document_images`
- `id` (UUID, Primary Key)
- `document_id` (UUID, References documents(id) ON DELETE CASCADE)
- `page_number` (INTEGER, Not Null)
- `image_key` (VARCHAR(1000), Not Null)
- `caption` (TEXT)
- `ocr_text` (TEXT)
- `vision_description` (TEXT)
- `created_at` (TIMESTAMPTZ, Default NOW())

### `conversations`
- `id` (UUID, Primary Key)
- `organization_id` (UUID, References organizations(id) ON DELETE CASCADE)
- `user_id` (UUID, References profiles(id) ON DELETE CASCADE)
- `machine_id` (VARCHAR(100), References machines(id) ON DELETE SET NULL)
- `title` (VARCHAR(500), Not Null)
- `language` (VARCHAR(10), Default 'en')
- `created_at` (TIMESTAMPTZ, Default NOW())

### `messages`
- `id` (UUID, Primary Key)
- `conversation_id` (UUID, References conversations(id) ON DELETE CASCADE)
- `sender` (VARCHAR(20), Checks: in ('user', 'assistant', 'system'))
- `content` (TEXT, Not Null)
- `groundedness_status` (VARCHAR(50), Default 'supported')
- `latency_ms` (INTEGER)
- `created_at` (TIMESTAMPTZ, Default NOW())

### `citations`
- `id` (UUID, Primary Key)
- `message_id` (UUID, References messages(id) ON DELETE CASCADE)
- `chunk_id` (UUID, References document_chunks(id) ON DELETE CASCADE)
- `document_id` (UUID, References documents(id) ON DELETE CASCADE)
- `page_number` (INTEGER, Not Null)
- `excerpt` (TEXT, Not Null)
- `relevance_score` (FLOAT, Not Null)

### `audit_logs`
- `id` (UUID, Primary Key)
- `organization_id` (UUID, References organizations(id) ON DELETE CASCADE)
- `user_id` (UUID)
- `action` (VARCHAR(100), Not Null)
- `target_type` (VARCHAR(100))
- `target_id` (VARCHAR(255))
- `ip_address` (VARCHAR(50))
- `user_agent` (TEXT)
- `details` (JSONB)
- `created_at` (TIMESTAMPTZ, Default NOW())

### `analytics_events`
- `id` (UUID, Primary Key)
- `organization_id` (UUID, References organizations(id) ON DELETE CASCADE)
- `event_type` (VARCHAR(100), Not Null)
- `query_text_sanitized` (TEXT)
- `latency_ms` (INTEGER)
- `citation_count` (INTEGER)
- `is_unanswered` (BOOLEAN, Default FALSE)
- `created_at` (TIMESTAMPTZ, Default NOW())
