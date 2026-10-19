# DATA_DECLARATION.md — Enterprise Industrial Data Lifecycle Declaration

> **Product**: ForgeWise AI (Vikrant 5.0 Platform)  
> **Status**: Verified Operational Specification  
> **Date**: October 20, 2026  

---

## 1. Overview & Data Handling Principles
ForgeWise AI processes proprietary industrial documentation to deliver grounded technical support to frontline personnel. This declaration outlines every data category processed, its operational purpose, storage location, access permissions, third-party processors, retention schedules, and deletion behavior.

---

## 2. Granular Data Inventory & Lifecycle

| # | Data Category | Example Fields | Source | Operational Purpose | Storage Location | Authorized Access | External Processors | Retention Period | Deletion Behavior | Requirement |
|---|---------------|----------------|--------|---------------------|------------------|-------------------|---------------------|------------------|-------------------|-------------|
| **1** | **Account Identity** | User UUID, email address, hashed credentials (in Supabase Auth), full name | User registration / SSO | Authentication and session identity | Supabase Auth internal DB | User, Org Admin, Platform Admin | Supabase Auth | Account active lifetime + 30 days | Cascading hard delete upon account closure | Required |
| **2** | **Organization Membership** | Org UUID, user UUID, role (`operator`, `engineer`, etc.), joined_at | Org Admin invitation | Tenant isolation and role-based access enforcement | PostgreSQL `organization_memberships` table | Org Admin, Platform Admin | None | Organization lifetime | Cascade delete on member removal | Required |
| **3** | **Uploaded Industrial Documents** | OEM manuals, SOPs, P&IDs, PDF/DOCX binary payloads | Knowledge Manager upload | Knowledge source ingestion for RAG indexing | Encrypted private storage bucket (`industrial-documents-private`) | Authorized org members with document scope | None (Stored on customer-configured storage) | Controlled by organization retention policy | Immediate purge upon document deletion | Optional per tenant |
| **4** | **Extracted Text & OCR** | Plain text segments, table representations, schematic labels | Ingestion pipeline extractor & OCR worker | Input for semantic chunking and lexical search | PostgreSQL `document_chunks` table | Authorized org members | OCR provider (if cloud OCR selected; otherwise local worker) | Lifetime of parent document | Cascading delete with parent document | Automatic on upload |
| **5** | **Document Embeddings** | 1536-dimensional floating point vectors | Embedding model provider | Semantic similarity search via pgvector | PostgreSQL `document_chunks.embedding` | Internal backend RAG retrieval service | Configured Embedding API (e.g. OpenAI / Gemini) | Lifetime of parent document | Immediate deletion with parent document | Automatic on indexing |
| **6** | **Document Metadata** | Title, version, page count, machine tag (`PMP-402`), file size | Extractor & Knowledge Manager | Filtering, categorization, and citation attribution | PostgreSQL `documents` table | All organization members | None | Lifetime of document | Soft-delete flag + hard purge after 7 days | Required for ingestion |
| **7** | **Chat Messages** | User query text, machine filter, timestamp | Frontline technician input | Multi-turn conversational context | PostgreSQL `messages` table | Requesting user, Org Admin | LLM Provider (ephemeral inference only) | Configurable (default 90 days or manual delete) | User-triggered thread deletion | Optional (User initiated) |
| **8** | **AI-Generated Responses** | Synthesized diagnostic instructions, safety warnings | LLM inference engine | Delivery of grounded troubleshooting advice | PostgreSQL `messages` table | Requesting user, Org Admin | LLM Provider | 90 days or thread lifetime | Deleted with conversation thread | Automatic on query |
| **9** | **Source Citations** | Document ID, chunk ID, page number, verbatim excerpt | Citation verification service | Traceable verification for technician safety | PostgreSQL `citations` table | Requesting user, Org Admin | None | Lifetime of parent message | Cascading delete with message | Automatic on grounded answer |
| **10** | **Voice Data & Transcripts** | Transcribed text query, audio stream | Web Speech API / mic input | Hands-free plant floor querying | Ephemeral in browser memory; only text query saved to DB | User | Local browser speech engine (or selected STT API) | Audio is never stored on server; transcript saved as message | Audio discarded immediately upon transcription | Optional feature |
| **11** | **Usage & Performance Telemetry** | Latency (ms), token count, search score, unanswered query flag | Backend observability middleware | System tuning, unanswered knowledge gap identification | PostgreSQL `analytics_events` table | Org Admin, Platform Admin | Optional monitoring service | 180 days aggregated | Automated rolling purge of raw events | System telemetry |
| **12** | **Security & Audit Logs** | IP address, user UUID, action (`DOCUMENT_DELETE`), timestamp | Security middleware | SOC 2 / ISO 27001 compliance and forensic audit | PostgreSQL `audit_logs` table (append-only) | Org Admin, Platform Admin | None | 365 days immutable | Purged after statutory compliance period | Mandatory |
| **13** | **Feedback Submissions** | Rating (+1/-1), technician remarks, message UUID | Operator feedback button | Knowledge accuracy scoring and prompt refinement | PostgreSQL `feedback` table | Knowledge Manager, Org Admin | None | 180 days | Deleted upon conversation purge | Optional user action |
| **14** | **User Preferences** | UI language (`en`/`hi`), theme (`light`/`dark`), reduced-motion | User settings panel | Personalized interface delivery | LocalStorage & PostgreSQL `profiles` | User | None | Lifetime of account | Cleared on profile reset | Optional |
| **15** | **System Backups** | Encrypted snapshots of relational database | Automated database snapshot worker | Disaster recovery and high availability | Encrypted backup vault | Platform Admin (Restricted access) | Backup cloud provider | 30 days rolling backup cycle | Overwritten automatically on 30-day rotation | Operational necessity |

---

## 3. Third-Party AI Data Processing Safeguards
- **Zero Model Training**: Customer documents, embeddings, and chat interactions are submitted strictly for zero-retention ephemeral inference via enterprise provider agreements.
- **Data Sovereignty**: When deploying in private clouds or sovereign regions, local Ollama or on-premise model weights can be configured to keep all inference completely on-premises.
