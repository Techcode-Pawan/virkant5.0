# ForgeWise AI (Vikrant 5.0)

> **Enterprise Multimodal GenAI Assistant for Industrial SOPs, Manuals, and Expert Knowledge.**  
> Built with Next.js 15, FastAPI, PostgreSQL (pgvector), and a CAD-inspired 3D assembly visualizer.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_15_App_Router-black)](apps/web)
[![Backend](https://img.shields.io/badge/Backend-FastAPI_0.115-009688)](apps/api)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_16_+_pgvector-336791)](supabase/migrations)
[![Accessibility](https://img.shields.io/badge/WCAG-2.2_AA_Compliant-success)](UI_UX_BRIEF.md)

---

## Key Capabilities

- **Zero-Hallucination Hybrid RAG**: Combines pgvector semantic cosine similarity with PostgreSQL full-text search (tsvector) using Reciprocal Rank Fusion. If evidence is lacking, it delivers an honest `insufficient_evidence` response.
- **Traceable Citations**: Every factual statement links directly to an authorized document, version, and page number with a side-by-side drawer viewer.
- **Multilingual UI & Voice**: First-class support for **English** and **Hindi**, including technical term preservation and Web Speech voice input/output.
- **CAD-Inspired 3D Assembly**: Interactive 3D planetary gear / mechanical visualizer with component hotspot inspection and SOP deep linking.
- **Enterprise Security**: Multi-tenant database isolation, Supabase Auth JWT verification, role-based access control (Viewer, Operator, Engineer, Knowledge Manager, Org Admin), and Redis sliding-window rate limiting.
- **Automated Document Ingestion**: Secure upload, magic-byte validation, structure-aware chunking, OCR on schematics, and vector indexing.

---

## Monorepo Architecture

```
├── apps/
│   ├── web/               # Next.js 15 App Router Frontend
│   └── api/               # FastAPI Backend (Python 3.13)
├── packages/
│   ├── shared-types/      # Monorepo TypeScript & JSON interfaces
│   ├── design-tokens/     # Industrial HSL color & spacing tokens
│   └── shared-schemas/    # Zod & Pydantic shared schemas
├── supabase/
│   ├── migrations/        # PostgreSQL + pgvector schemas & RLS
│   └── seed.sql           # Realistic industrial SOP seed data
├── docs/                  # Deep-dive architecture, API, and RAG docs
└── docker-compose.yml     # Multi-container orchestration
```

---

## Quickstart (Local Development)

### 1. Prerequisites
- **Node.js** v20+ (Node v26.10.0+ verified)
- **Python** 3.11+ (Python 3.13.15+ verified)
- **Docker** & Docker Compose (optional, for local DB & Redis)

### 2. Launch with Docker Compose
```bash
docker-compose up -d
```
- Web Application: `http://localhost:3000`
- API Documentation: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/api/v1/health`

### 3. Manual Installation

#### Backend (FastAPI)
```bash
cd apps/api
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

#### Frontend (Next.js)
```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

---

## Comprehensive Documentation
- [PROJECT.md](PROJECT.md): Complete engineering onboarding guide for human & AI developers
- [PRD.md](PRD.md): Product Requirements Document
- [TRD.md](TRD.md): Technical Requirements Document
- [UI_UX_BRIEF.md](UI_UX_BRIEF.md): Design tokens, 3D architecture, and motion tokens
- [APP_FLOW.md](APP_FLOW.md): Global sitemap and state-transition sequence diagrams
- [SECURITY.md](SECURITY.md): Cybersecurity posture, threat model, and rate limiting
- [BRANDING.md](BRANDING.md): Naming audit, conflict investigation, and visual identity
- [DATA_DECLARATION.md](DATA_DECLARATION.md): 15-category enterprise data lifecycle
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md): Plain-language privacy terms
- [TERMS_OF_USE.md](TERMS_OF_USE.md): Industrial safety disclaimers and Lockout/Tagout terms

---

## License
Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
