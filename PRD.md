# PRD.md — Product Requirements Document

> **Product**: Industrial Multimodal GenAI Assistant for SOPs, Manuals, and Expert Knowledge  
> **Working Title**: ForgeWise AI (Vikrant 5.0 Platform)  
> **Status**: APPROVED & ACTIVE SPECIFICATION  
> **Date**: October 20, 2026  

---

## A. Product Vision
To provide frontline industrial plant personnel, maintenance technicians, reliability engineers, and safety officers with an instantaneous, trustworthy, multimodal, and multilingual knowledge copilot. The platform turns fragmented engineering drawings, dense machine manuals, operating SOPs, and historical inspection reports into verifiable, cited, step-by-step guidance right at the machine side without ever fabricating safety-critical details.

---

## B. Problem Statement
Industrial facilities maintain thousands of pages of Standard Operating Procedures (SOPs), original equipment manufacturer (OEM) manuals, electrical schematics, piping and instrumentation diagrams (P&IDs), and safety compliance manuals. In live operations:
1. **Unplanned Downtime**: Technicians lose 30 to 90 minutes per incident locating the exact section of a 600-page manual for torque specs, error codes, or hydraulic tolerances.
2. **Knowledge Silos & Tribal Knowledge**: Experienced senior engineers carry critical operational nuances in their heads; when they retire or change shifts, frontline operators face operational risk.
3. **Multilingual Barrier**: Factory floor technicians in diverse hubs (e.g. India, SE Asia, LATAM) often speak regional languages (e.g., Hindi, Spanish) while manuals are written in technical English or German.
4. **Safety Hazards & Hallucination Risk**: Generic LLMs hallucinate plausible-sounding pressure thresholds or bypass methods, posing catastrophic risks to human life and equipment integrity.

---

## C. Target Users
1. **Machine Operators**: Running lines, performing changeovers, routine daily checklists.
2. **Maintenance Technicians**: Rapid troubleshooting of mechanical, electrical, and pneumatic faults under time pressure.
3. **Plant Engineers**: Line commissioning, equipment upgrades, calibration, preventive maintenance schedules.
4. **Reliability Engineers**: Failure mode analysis (FMEA), vibration analysis, root-cause investigations.
5. **Safety Officers**: Lockout/Tagout (LOTO) verification, hazardous chemical containment, OSHA/ISO compliance audits.
6. **Shift Supervisors**: Shift handover tracking, unresolved fault monitoring, skill assignment.
7. **Knowledge Managers**: Technical library curation, SOP version approvals, obsolete document retirement.
8. **IT & Security Administrators**: System uptime, tenant isolation, role-based access control, audit log retention.
9. **Organization Administrators**: Plant provisioning, licensing, department quotas, and user onboarding.

---

## D. User Personas & Core Requirements

### Persona 1: Rajesh Sharma — Senior Mechanical Maintenance Technician
- **Context**: 12 years plant experience, bilingual (Hindi + English), works in noisy compressor and hydraulic bay with ruggedized tablet and safety gloves.
- **Needs**: Voice query capability, quick error-code lookup (e.g., `E-304 Thermal Trip`), exact torque figures with page citations, step-by-step troubleshooting with safety precautions highlighted.

### Persona 2: Elena Vance — Reliability & Plant Systems Engineer
- **Context**: Electrical and automation specialist managing 4 bottling lines.
- **Needs**: Inspect electrical schematics and P&IDs, search across multiple OEM revisions, verify differences between 2021 and 2025 machine specs, audit chunk-level citations before authorizing maintenance.

### Persona 3: Marcus Cole — Environmental Health & Safety (EHS) Lead
- **Context**: Responsible for zero-accident compliance, auditing SOP adherence.
- **Needs**: Guaranteed safety disclosures, automated warnings whenever hazardous tasks (high-voltage, ammonia lines, confined spaces) are queried, audit trail of all generated responses.

---

## E. Primary User Journeys

### Journey 1: Field Troubleshooting via Chat & Citations
1. Technician scans machine QR code or enters machine identifier (`PMP-HYD-04`).
2. Inputs query: *"Why is hydraulic pump 4 showing high pressure relief valve chatter?"* (in English or Hindi).
3. Backend filters retrieval by machine ID and authorized organization scope.
4. System performs hybrid search (pgvector semantic embeddings + PostgreSQL full-text search).
5. Grounded LLM synthesizes concise step-by-step diagnostic sequence.
6. System includes interactive citation chips `[Hydraulic Unit Manual v3.2, p. 84, Sec 4.3]`.
7. Technician taps citation chip: slide-over drawer displays the verified excerpt and page snippet.
8. Safety warning appears: *"Lockout/Tagout required before adjusting valve pilot spool"*.
9. Technician resolves fault, rates response with thumbs up, and copies action log.

### Journey 2: Document Ingestion & Verification by Knowledge Manager
1. Knowledge Manager navigates to `/documents`.
2. Uploads 85-page PDF `Centrifugal_Chiller_Service_Manual_2026.pdf` and tags machine model `CHL-CARRIER-09`.
3. System validates file signature, size, and scans for malicious macros.
4. Background worker extracts text, detects page boundaries, tables, and isolates schematic diagrams.
5. OCR runs on scanned electrical diagrams; vision model generates structured descriptions.
6. Chunker generates semantic chunks with page, section, machine, and org metadata.
7. Embeddings generated; records indexed in pgvector and tsvector.
8. Document status changes from `processing` to `ready`.
9. Document is immediately searchable and available for RAG.

---

## F. Product Objectives
1. **Grounded Accuracy**: Zero fabricated citations or hallucinated machine parameters. If evidence is missing, the assistant must explicitly declare `insufficient_evidence`.
2. **Traceable Attribution**: Every factual claim linked directly to a verifiable document, version, and page number.
3. **Sub-second Hybrid Retrieval**: Fast combination of semantic vector search and exact token search (for serial numbers, fault codes, DIN standards).
4. **Multilingual Fluency**: Seamless English and Hindi user interface and conversation flow without degradation of technical terms.
5. **Enterprise-Grade Isolation**: Strict multi-tenant data separation; no tenant can retrieve another's proprietary documents.

---

## G. Measurable Product Outcomes

| Metric | Measurement Definition | Target Benchmark |
|--------|------------------------|------------------|
| **Information Retrieval Latency** | Time from search submission to verified result display | < 1.8 seconds (p95) |
| **Citation Coverage Rate** | Percentage of factual statements backed by valid document chunk citations | 100% on supported answers |
| **Groundedness Score** | Automated verification of answer alignment with retrieved context | > 96% |
| **Document Processing Throughput** | Speed of PDF page text extraction, chunking, and embedding generation | > 15 pages / minute |
| **Zero-Evidence Honesty** | Refusal rate when asked out-of-domain or ungrounded machine queries | 100% (No hallucinated facts) |
| **Multilingual Parity** | Interface and technical concept accuracy across English and Hindi | 100% core UI localized |

---

## H. Functional Requirements
1. **Authentication & Authorization**: Supabase Auth (JWT), role-based permissions (Viewer, Operator, Engineer, Knowledge Manager, Org Admin, Platform Admin).
2. **Document Ingestion Pipeline**: Support PDF, TXT, DOCX, Markdown, and common image formats. Structure-aware chunking preserving page, section, and machine tags.
3. **Multimodal Diagram Intelligence**: Extract figures, run OCR on schematics, annotate diagrams with captions, provide visual inspection preview.
4. **Hybrid RAG Engine**: pgvector cosine distance + Postgres FTS (`tsquery`/`tsvector`) with reciprocal rank fusion (RRF) and relevance thresholds.
5. **Interactive Chat & Multimodal Query**: Context-aware dialogue, machine filter, session history, step-by-step diagnostic mode.
6. **Voice Interaction**: Web Speech STT/TTS with visual feedback, mic state indicator, and stop/repeat controls.
7. **Source Citation Viewer**: Clickable citations highlighting page, section, and snippet with private signed URLs.
8. **Real-time Observability & Analytics**: Query frequency, unanswered query logs, retrieval latency metrics, user satisfaction telemetry.
9. **Admin Panel**: Team member invitation, role assignment, machine registry, audit logging, and provider status monitoring.

---

## I. Non-Functional Requirements
- **Performance**: Frontend First Contentful Paint < 1.2s; API p95 response < 2.5s for complex RAG synthesis.
- **Availability**: Stateless API layer designed for 99.9% uptime with health check probes (`/api/health`, `/api/v1/health`).
- **Scalability**: Asynchronous document processing via background jobs to prevent worker starvation.
- **Extensibility**: Modular AI provider interface (OpenAI, Gemini, Ollama, Anthropic, Mock test adapter).

---

## J. Accessibility Requirements (WCAG 2.2 AA)
- Full keyboard navigability (`Tab`, `Shift+Tab`, `Escape`, `Enter`).
- Visible focus rings with high-contrast outlines.
- Minimum contrast ratio of 4.5:1 for normal text, 3:1 for large text and UI components.
- Screen-reader aria attributes (`aria-expanded`, `aria-controls`, `aria-live` for chat stream).
- Respect `prefers-reduced-motion` across all Framer Motion and Three.js 3D transitions.
- High-contrast mode toggle for harsh sunlight / low-light industrial tablet environments.

---

## K. Security Requirements
- All database queries parameterized; ORM with strict input schemas.
- Anti-tamper audit logging for sensitive actions (user deletion, document purge, role modification).
- Private file storage: zero public buckets; all document downloads via short-lived signed URLs (15-minute expiry).
- File upload security: magic byte validation, 50MB size limit, content-type verification, extension allowlists.
- Rate limiting on API routes: Redis-backed sliding window rate limiter with HTTP 429 Retry-After headers.
- Prompt injection defense: treat document excerpts as untrusted user input within fenced delimiter blocks.

---

## L. Privacy Requirements
- Zero customer document training without explicit, signed opt-in.
- Data classification and retention policy documented in `DATA_DECLARATION.md`.
- Right to erasure: hard deletion of document vectors and chunks when an SOP is purged by Knowledge Manager.
- PII scrubbing option for chat telemetry.

---

## M. Multilingual Requirements
- Supported Initial Locales: `en-US` (English) and `hi-IN` (Hindi).
- Technical terms (e.g. "Centrifugal Pump", "Bar", "RPM", "Lockout/Tagout", "PLC") preserved in original standard notation with optional Hindi parenthetical glossaries.
- UI translation dictionary maintained in structured JSON files (`messages/en.json`, `messages/hi.json`).
- Dynamic directionality and typographic legibility for Devanagari script.

---

## N. Failure Scenarios & Recovery Behavior
| Failure Scenario | Immediate System Reaction | User Experience |
|------------------|---------------------------|-----------------|
| AI Provider Outage / Timeout | Automatic fallback to secondary provider or cached mock; retry with exponential backoff | Clear notice: *"AI service momentarily degraded. Retrying in background..."* |
| Low Retrieval Confidence (< 0.65) | Suppression of ungrounded generative responses | Response: *"The uploaded documentation does not contain verified data for this query. Please consult plant engineering or upload the relevant manual."* |
| Corrupt or Malformed PDF Upload | Extraction job marks document status as `failed` with safe error code | Error toast: *"Document processing failed: Unable to parse document stream. Verify PDF is not password-protected."* |
| Database Disconnection | Healthcheck reports `degraded`; graceful connection pool reconnect | 503 Service Unavailable with friendly retry screen |

---

## O. MVP Scope vs. Future Roadmap
- **MVP (Current Scope)**: Complete Next.js + FastAPI + PostgreSQL (pgvector) monorepo; PDF/TXT/MD ingestion; hybrid RAG; Hindi/English chat & UI; voice STT/TTS; 3D industrial visual; real-time theme switcher; citations drawer; role-based access; analytics dashboard; audit logs; complete documentation.
- **Future Roadmap**: CAD 3D model parsing (STEP/IGES), direct PLC / SCADA MQTT telemetry ingestion, AR helmet integration, offline edge container deployment for air-gapped nuclear/defense facilities.

---

## P. Acceptance Criteria & Verification Matrix
*(Detailed acceptance checks mirrored in Section 36 of prompt and verified via automated test suite).*
