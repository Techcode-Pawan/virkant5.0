# PROJECT.md — Canonical Engineering & Agent Onboarding Guide

> **Project**: ForgeWise AI (Vikrant 5.0 Platform)  
> **Repository**: `c:\Users\santo\Downloads\Vikrant 5.0`  
> **Status**: Full-Stack Production Monorepo  
> **Last Verified**: October 20, 2026  

---

## 1. Product Purpose
ForgeWise AI is a multimodal, multilingual, retrieval-augmented intelligence copilot designed for industrial manufacturing environments. It ingests Standard Operating Procedures (SOPs), OEM manuals, P&IDs, wiring schematics, and equipment inspection logs, enabling technicians and engineers to ask natural-language questions (in English or Hindi) via voice or text and receive step-by-step grounded answers backed by traceable page-level citations.

---

## 2. Monorepo Directory Layout

```
Vikrant 5.0/
├── apps/
│   ├── web/                     # Next.js 15 App Router Frontend
│   │   ├── public/              # Static assets, logos, favicon
│   │   ├── src/
│   │   │   ├── app/             # App Router pages ((marketing), (auth), (dashboard), legal, api)
│   │   │   ├── components/      # UI primitives, CAD 3D scene, chat, citations drawer
│   │   │   ├── hooks/           # Voice STT/TTS, theme, i18n, reduced-motion hooks
│   │   │   ├── lib/             # API client, Supabase client, design tokens, motion tokens
│   │   │   ├── messages/        # Translation dictionaries (en.json, hi.json)
│   │   │   └── types/           # Frontend TypeScript type declarations
│   │   ├── next.config.ts       # Next.js configuration
│   │   ├── package.json         # Web dependencies
│   │   ├── tsconfig.json        # TypeScript strict config
│   │   └── .env.example         # Frontend environment template
│   └── api/                     # FastAPI Backend (Python 3.13)
│       ├── app/
│       │   ├── main.py          # ASGI application entry point
│       │   ├── core/            # Config, security, rate limit, logging, exceptions
│       │   ├── api/v1/          # Versioned REST router and endpoints
│       │   ├── db/              # SQLAlchemy session, ORM models, migrations
│       │   ├── schemas/         # Pydantic v2 request/response schemas
│       │   ├── services/        # Business logic (RAG, auth, chat, citations, storage)
│       │   ├── ai/              # Provider adapters (OpenAI, Gemini, Ollama, Mock)
│       │   ├── ingestion/       # Extraction, chunking, OCR & pgvector indexing
│       │   └── tests/           # Pytest automated test suite
│       ├── requirements.txt     # Python backend dependencies
│       ├── Dockerfile           # Multi-stage production container
│       └── .env.example         # Backend environment template
├── packages/                    # Monorepo shared packages
│   ├── shared-types/            # Shared TypeScript/JSON interfaces
│   ├── design-tokens/           # Shared HSL design tokens & typography
│   └── shared-schemas/          # Shared validation schemas
├── supabase/
│   ├── migrations/              # SQL migrations (pgvector, tables, RLS, indexes)
│   ├── seed.sql                 # Fictional demonstration industrial dataset
│   └── config.toml              # Local Supabase CLI configuration
├── docs/                        # Deep-dive architecture and decision records
├── docker-compose.yml           # Local multi-service orchestration (Web, API, DB, Redis)
├── README.md                    # Quickstart guide for developers
├── PRD.md                       # Product Requirements Document
├── TRD.md                       # Technical Requirements Document
├── UI_UX_BRIEF.md               # Design system & visual specifications
├── APP_FLOW.md                  # Sitemap & user journey state machines
├── SECURITY.md                  # Enterprise cybersecurity specifications
├── BRANDING.md                  # Trademark audit & naming records
├── DATA_DECLARATION.md          # 15-category data lifecycle declaration
├── PRIVACY_POLICY.md            # Plain-language industrial privacy policy
├── TERMS_OF_USE.md              # Terms of use & safety disclaimers
└── LICENSE                      # Apache 2.0 Open Source License
```

---

## 3. Technology Stack & Key Libraries

| Domain | Technology | Key Dependencies |
|--------|------------|------------------|
| **Frontend Web** | Next.js 15 (App Router), React 19, TypeScript 5.6 | `tailwindcss`, `lucide-react`, `framer-motion`, `three`, `@react-three/fiber`, `zod`, `react-hook-form` |
| **Backend API** | FastAPI 0.115, Python 3.13 | `pydantic-settings`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `httpx`, `pypdf`, `python-docx`, `pillow`, `pgvector` |
| **Database & Cache** | PostgreSQL 16 (pgvector enabled), Redis 7 | `pgvector` extension for 1536d cosine vectors, standard PostgreSQL FTS |
| **AI Abstraction** | Pluggable interface | Adapters for OpenAI, Google Gemini, Ollama (local edge), and Deterministic Mock Adapter |
| **Storage** | Object storage | Supabase Storage / S3 private bucket with 15-minute expiring signed URLs |

---

## 4. Key Architectural Entry Points

### 4.1 Frontend Entry Points
- Root Layout: [`apps/web/src/app/layout.tsx`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/layout.tsx)
- Landing Page (with 3D Assembly): [`apps/web/src/app/(marketing)/page.tsx`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(marketing)/page.tsx)
- Interactive Chat Console: [`apps/web/src/app/(dashboard)/chat/page.tsx`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(dashboard)/chat/page.tsx)
- Document Library & Upload: [`apps/web/src/app/(dashboard)/documents/page.tsx`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(dashboard)/documents/page.tsx)
- Machine Knowledge Explorer: [`apps/web/src/app/(dashboard)/machines/page.tsx`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(dashboard)/machines/page.tsx)
- Operational Analytics: [`apps/web/src/app/(dashboard)/analytics/page.tsx`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(dashboard)/analytics/page.tsx)
- Admin Console: [`apps/web/src/app/(dashboard)/admin/page.tsx`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(dashboard)/admin/page.tsx)

### 4.2 Backend Entry Points
- Application Setup: [`apps/api/app/main.py`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/main.py)
- Configuration & Secrets: [`apps/api/app/core/config.py`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/core/config.py)
- Security & JWT Verification: [`apps/api/app/core/security.py`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/core/security.py)
- REST Router: [`apps/api/app/api/v1/router.py`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/api/v1/router.py)
- RAG & Grounding Engine: [`apps/api/app/services/retrieval_service.py`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/services/retrieval_service.py)
- Document Pipeline: [`apps/api/app/ingestion/pipeline.py`](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/ingestion/pipeline.py)

---

## 5. Local Development Commands

### 5.1 Prerequisites
- Node.js v20+ (Node v26.10.0 verified)
- Python 3.11+ (Python 3.13.15 verified)
- PostgreSQL with `pgvector` or Docker

### 5.2 Backend Setup
```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Copy environment template
cp .env.example .env
# Run development server
uvicorn app.main:app --reload --port 8000
```

### 5.3 Frontend Setup
```powershell
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

### 5.4 Running Tests
```powershell
# Backend pytest suite
cd apps/api
pytest -v
```

---

## 6. Known Limitations & Technical Decisions
1. **Mock AI Provider for Zero-Key Execution**: To ensure the platform can be executed immediately on a fresh machine without paid API keys, the system includes a fully functional, deterministic `MockAIProvider` that runs offline test vectors with realistic industrial SOP answers and citations.
2. **CAD File Formats**: Native `.step`, `.iges`, or `.dwg` parsing is deferred to Phase 2; schematics in the current version are parsed from PDF vector pages and high-resolution raster images with OCR and vision model descriptions.
3. **Database RLS vs. Backend Service Role**: While Row Level Security (RLS) is applied on PostgreSQL for direct client connections, all FastAPI requests execute through parameterized tenant-isolated repository queries (`WHERE organization_id = :org_id`) to prevent connection pooling context leaks.
