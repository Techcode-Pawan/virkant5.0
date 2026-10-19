# CHANGELOG.md — Release History

All notable changes to the ForgeWise AI (Vikrant 5.0) platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
