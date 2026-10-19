# Architecture Overview — ForgeWise AI

## 1. System Topology
ForgeWise AI implements a distributed, decoupled multi-tenant service architecture designed for industrial high availability and strict safety verification.

```
Frontline Tablet / Web Browser
          │ (HTTPS / WSS)
          ▼
    Next.js 15 Web App (Port 3000)
    - App Router (Server & Client Components)
    - Three.js CAD 3D Scene
    - Web Speech API (STT / TTS)
    - i18n English & Hindi Engine
          │
          │ REST API / Bearer JWT
          ▼
    FastAPI Gateway & Backend (Port 8000)
    - JWT Verification Middleware (Supabase JWKS)
    - Sliding Window Rate Limiter (Redis)
    - Pydantic v2 Request/Response Validation
    - Asynchronous Pipeline Orchestrator
          │
   ┌──────┴───────────────┬─────────────────────────┐
   ▼                      ▼                         ▼
PostgreSQL 16         Redis 7 Cache             Private Object Storage
- pgvector (1536d)    - Token bucket rate limit - Expiring signed URLs (15m)
- tsvector (FTS)      - Temporary job state     - Zero public read access
- Tenant RLS          - Query result cache
   │
   ▼
AI Provider Layer
- Pluggable LLM (OpenAI / Gemini / Ollama / Mock)
- Pluggable Embeddings (1536d Cosine)
- Pluggable Vision & OCR (Schematic interpretation)
```

## 2. Key Subsystems
1. **Frontend App (`apps/web`)**: Client-side reactive UI built on Next.js 15, Tailwind CSS, Lucide icons, Framer Motion, and React Three Fiber.
2. **API Backend (`apps/api`)**: Python 3.13 FastAPI application exposing RESTful `/api/v1` routes with async SQLAlchemy ORM.
3. **Ingestion Engine (`apps/api/app/ingestion`)**: Parses PDFs, Word documents, and technical schematics, separating pages, extracting tables and images, and slicing content using structure-aware chunking.
4. **Hybrid RAG Retrieval (`apps/api/app/services/retrieval_service.py`)**: Executes concurrent cosine similarity queries in `pgvector` alongside PostgreSQL lexical `tsquery` search, merging ranks via Reciprocal Rank Fusion (RRF).
5. **Traceable Citation Synthesizer**: Validates that all factual claims made in the LLM response map to retrieved chunk IDs, returning structured citation payloads for client-side side-by-side verification.
