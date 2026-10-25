# CHANGELOG.md — Release History

All notable changes to the ForgeWise AI (Vikrant 5.0) platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.1.0] - 2026-10-25

### Changed
- **Persistence moved to MongoDB** (PyMongo async). Replaces the SQLite file and the unused Postgres/SQLAlchemy layer. Centralized connection with startup validation, indexes, seeding, graceful shutdown, real health checks and 503 responses when the database is unreachable. One-time migration script: `apps/api/scripts/migrate_sqlite_to_mongo.py`.
- **Provider-independent LLM service** with Gemini, OpenAI(-compatible), Anthropic and Ollama adapters, model selection, configurable fallback chain, bounded retries with jittered backoff, per-provider cooldown, context-window trimming and honest provider status endpoints (`/api/v1/llm/*`).
- **Voice assistant rebuilt**: continuous sessions with automatic restart, configurable silence window, explicit Listening/Processing/Speaking/Reconnecting states, half-duplex playback with interrupt, optional barge-in, chunked speech synthesis and full cleanup on unmount.
- **UI redesign**: dark design system (IBM Plex, temper-blue accent), collapsible sidebar behind a hamburger button (overlay on mobile), new Dashboard, Chat, Voice, History and AI models pages, procedural Three.js emblem replacing the machine/CAD 3D scenes.
- Auth issues signed JWTs; user ids are stable across restarts; workspace switching is verified server-side.
- Next.js 15.1.12 / React 19.0.9 (security fixes for CVE-2025-66478).

### Fixed
- Health endpoints always reported "connected"; history, admin users/audit and machines returned hardcoded data.
- The mock provider fabricated safety-critical values (e.g. torque specs) and was used silently whenever a real provider failed.
- Gemini API key was sent in the URL query string (and logged by httpx).
- The Next.js proxy's 30 s timeout cut off slow LLM calls, and the client then re-sent the request directly to the backend (duplicate calls).
- Voice recognition ended after one phrase or a few seconds of silence; answers were never read aloud in voice mode.
- Upload filenames allowed path traversal; document delete was not scoped to the workspace; the default workspace's documents leaked into every workspace.
- Failed deletes and contact-form submissions were reported as successful.
- Tailwind opacity modifiers (e.g. `bg-teal/15`) silently produced no styles.

### Removed
- SQLite/SQLAlchemy/asyncpg/pgvector/Redis dependencies, the in-memory document registry, forgot/reset-password pages (there are no passwords), unused frontend packages (framer-motion, react-hook-form, zod).

## [1.0.0] - 2026-10-20

### Added
- **Monorepo Architecture**: Initialized Next.js 15 App Router frontend (`apps/web`) and FastAPI backend (`apps/api`).
- **Hybrid RAG Retrieval**: Reciprocal Rank Fusion of PostgreSQL `pgvector` 1536-dimensional embeddings and PostgreSQL Full-Text Search.
- **Traceable Citations**: Granular document chunk citations with verified page numbers and excerpt previews.
- **Multilingual Support**: Complete English and Hindi interface translation dictionaries and dynamic system prompts preserving technical tags.
- **Voice Navigation**: Hands-free plant floor microphone input via Web Speech API with audible confirmation and visual recording indicators.
- **CAD 3D Scene**: Interactive planetary gear / mechanical visualizer with hotspot inspection and SOP deep linking.
- **Theme Engine**: Centralized design tokens for Light, Dark, and High-Contrast modes with instant CSS variable updates and persistence.
- **Security & RBAC**: JWT verification, tenant isolation, sliding-window rate limiting, magic-byte upload validation, and tamper-evident audit logs.
- **Governance Documentation**: PRD.md, TRD.md, UI_UX_BRIEF.md, APP_FLOW.md, PROJECT.md, SECURITY.md, BRANDING.md, DATA_DECLARATION.md, PRIVACY_POLICY.md, and TERMS_OF_USE.md.
