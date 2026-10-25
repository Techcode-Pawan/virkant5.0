# ForgeWise AI – Precision Industrial Copilot (v5.0)

> **Enterprise Multimodal GenAI Assistant for Industrial SOPs, Heavy Machinery Diagnostics, and Frontline Operational Copiloting.**  
> Built with Next.js 15, FastAPI, Hybrid RAG (Dense Vector + BM25 + Cross-lingual Reranking), Multi-LLM Provider Abstraction (Gemini, OpenAI, Claude, Ollama), and Three.js 3D Digital Twin Visualizer.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js_15_App_Router-black)](apps/web)
[![Backend](https://img.shields.io/badge/Backend-FastAPI_0.115-009688)](apps/api)
[![Database](https://img.shields.io/badge/Database-SQLite_Zero--Dependency_+_PostgreSQL_pgvector-336791)](supabase/migrations)
[![Tests](https://img.shields.io/badge/Tests-18_Passed_in_0.39s-success)](apps/api/app/tests)

---

## What Was Broken & How It Was Fixed (Audit & Upgrade Report)

### Phase 1: Audit & Root Cause Fixes
1. **"2 Errors" Next.js 15 Bailout Overlay on `/chat`**:
   - *Root Cause*: Next.js 15 requires client components using `useSearchParams()` to be wrapped in `<Suspense>`. Unwrapped calls caused CSR client bailout warnings and Next.js development error overlays.
   - *Fix*: Separated the chat component into `ChatConsoleInner` wrapped within a clean `<Suspense fallback={...}>` boundary in [apps/web/src/app/(dashboard)/chat/page.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(dashboard)/chat/page.tsx).
2. **Broken Document Upload Pipeline**:
   - *Root Cause*: File upload input on `/documents` had broken API wiring; file uploads were not writing to disk, chunking failed on empty/scanned PDFs, database insert was disconnected from the list endpoint, and no feedback toasts were displayed.
   - *Fix*: Re-engineered full ingestion pipeline across [apps/api/app/services/document_service.py](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/services/document_service.py) (writes to `storage/raw/...`, stores metadata in SQLite/Postgres), [apps/api/app/ingestion/pipeline.py](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/ingestion/pipeline.py), and [apps/web/src/app/(dashboard)/documents/page.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/app/(dashboard)/documents/page.tsx) with multi-stage animated toast feedback.
3. **Database Schema Mismatch & Workspace Seeding**:
   - *Root Cause*: Disconnected schema across 8 entities (`organizations`, `workspaces`, `users`, `equipment`, `documents`, `document_chunks` with embeddings, `chat_sessions`, `messages`, `citations`). Workspace `ws-a1111111` was unseeded.
   - *Fix*: Unified schemas in [supabase/migrations/002_unified_schema.sql](file:///c:/Users/santo/Downloads/Vikrant%205.0/supabase/migrations/002_unified_schema.sql) and implemented zero-dependency persistent SQLite engine [apps/api/app/db/sqlite_db.py](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/api/app/db/sqlite_db.py) with automatic startup initialization and seeding for `ws-a1111111`. Added root `/health` and `/api/v1/health` endpoints.
4. **FW Logo, OPERATOR Badge & Navigation Duplication**:
   - *Root Cause*: Logo and role badges were hardcoded, misaligned, and overlapped navbar on mobile/dark modes. Layout had duplicate navigation bars (top header + second sub-navigation row).
   - *Fix*: Created scalable SVG components [FWLogo.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/components/layout/FWLogo.tsx) and [RoleBadge.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/components/layout/RoleBadge.tsx), unified navbar in [Navbar.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/components/layout/Navbar.tsx) with model switcher dropdown and workspace chip, and removed redundant secondary navigation strip.

### Phase 2: Multi-LLM Provider Architecture
- Built `LLMProvider`, `EmbeddingProvider`, and `VisionProvider` interfaces supporting **Google Gemini**, **OpenAI**, **Anthropic Claude**, and **Ollama / Local**.
- Implemented `ResilientFallbackLLMProxy` with automatic fallback to secondary provider or high-precision offline provider on failure.
- Enabled per-request dynamic model switching from header dropdown, configurable workspace defaults, and API key management in Settings page and `.env`.

### Phase 3: Manual-Grounded Multilingual Answers
- **Multilingual Support**: First-class detection and answering in **Hindi (हिंदी)**, **Hinglish**, **Spanish**, **German**, **French**, **Japanese**, and **English**.
- **Strict Grounding**: Zero hallucination on torque values or safety parameters. Refuses out-of-domain queries with explicit insufficient evidence notice.
- **Clickable Citations**: Every answer provides citations with document title, page number, section title, and highlighted excerpt.
- **Diagnostics & Multimodal**: Interactive chips (e.g. *PMP-402 Torque Specs*, *CNC Spindle Alarm E-304*, *PRV-102 Valve Chatter*), voice input, and image fault schematic analysis.

### Phase 4: Professional 3D Industrial UI/UX
- **Intro Animation**: 2.5-second cinematic diagonal laser slash split animation ([IntroAnimation.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/components/layout/IntroAnimation.tsx)) with spark particles, split reveal, ESC skip, and `sessionStorage` guard.
- **Interactive 3D Digital Twin**: Rotating industrial impeller / pump assembly ([IndustrialHeroScene.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/components/3d/IndustrialHeroScene.tsx)) with mouse parallax, holographic wireframe, and 60fps WebGL.
- **Equipment Hotspot Inspection**: Interactive 3D machine modal ([MachineModelViewer.tsx](file:///c:/Users/santo/Downloads/Vikrant%205.0/apps/web/src/components/3d/MachineModelViewer.tsx)) with clickable hotspots linked to SOP sections and alarms.
- **Live Answering Timeline**: Step-by-step progress timeline ("Searching manual -> Reading page 42 -> Synthesizing grounded response").

### Phase 5: Quality & Production Hardening
- Role-based authorization (`operator`, `engineer`, `admin`) with workspace isolation.
- Rate limiting (30 requests/min per user) and file magic-byte validation.
- End-to-end automated test suite: 18 passed tests in 0.39s verifying upload, indexing, Hindi retrieval, citations, and out-of-scope refusal.

---

## Exact Commands to Run

### Option A: Local Development (Instant Start)

#### 1. Start the FastAPI Backend
```bash
# From repository root:
cd apps/api

# Activate Python virtual environment:
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Install dependencies (already pre-installed in workspace .venv):
pip install -r requirements.txt

# Run backend on port 8000:
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### 2. Start the Next.js Frontend
```bash
# In a new terminal, from repository root:
cd apps/web

# Start Next.js dev server on port 3000:
npm run dev
```

Open `http://localhost:3000` in your browser.

---

### Option B: Docker Compose
```bash
# Build and run all services (Next.js web + FastAPI + PostgreSQL pgvector + Redis)
docker-compose up --build
```
- Web Application: `http://localhost:3000`
- FastAPI Backend: `http://localhost:8000`
- API Swagger Docs: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/health`

---

## Verification & Testing

Run the full automated test suite (18 unit + integration + E2E tests):
```bash
# From repository root:
apps/api/.venv/Scripts/python.exe -m pytest apps/api/app/tests -v
```

Type check the Next.js frontend:
```bash
cd apps/web
npx tsc --noEmit
```

Verify live chat query in Hindi through the Next.js rewrite proxy:
```bash
curl -s -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-operator:a1111111:c1a2b3c4:ws-a1111111:sess-1" \
  -d '{"message":"PMP-402 पंप के सील ग्लैंड बोल्ट का टॉर्क कितना होना चाहिए?","language":"hi","machine_id":"PMP-402","workspace_id":"ws-a1111111"}'
```

---

## Default Seed Workspace & Credentials
- **Workspace ID**: `ws-a1111111`
- **Default Operator**: `rajesh.sharma@vikrant.internal` (Role: `operator`)
- **Default Engineer**: `priya.nair@vikrant.internal` (Role: `engineer`)
- **Default Organization**: `c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b`
- **Pre-loaded Machinery**:
  - `PMP-402`: High-Pressure Boiler Feed Pump
  - `CNC-MILL-02`: Okuma MU-5000V 5-Axis Machining Center
  - `HYD-PRESS-01`: 2000-Ton Hydraulic Forming Press
  - `ROB-CELL-01`: KUKA KR-1000 Heavy Articulated Robot

---

## License
Apache 2.0. See [LICENSE](LICENSE) for details.

