# APP_FLOW.md — Application Navigation & Journey Architecture

> **Product**: ForgeWise AI (Vikrant 5.0 Platform)  
> **Date**: October 20, 2026  

---

## 1. Global Sitemap & Route Hierarchy

```mermaid
graph TD
    Landing["/ (Public Landing Page)"] --> Features["/features"]
    Landing --> Security["/security"]
    Landing --> LegalPrivacy["/legal/privacy"]
    Landing --> LegalTerms["/legal/terms"]
    Landing --> LegalData["/legal/data-declaration"]
    Landing --> Login["/login"]
    Landing --> Register["/register"]
    
    Login --> Dashboard["/dashboard (Main Console)"]
    Register --> Dashboard
    
    Dashboard --> Chat["/chat (Interactive Multimodal RAG)"]
    Dashboard --> Documents["/documents (Document Library & Upload)"]
    Dashboard --> Machines["/machines (Equipment Registry & Schematics)"]
    Dashboard --> History["/history (Conversation Logs)"]
    Dashboard --> Analytics["/analytics (Operational Telemetry)"]
    Dashboard --> Settings["/settings (Theme, Lang, Voice)"]
    Dashboard --> Admin["/admin (Tenant, RBAC & Audit Logs)"]
```

---

## 2. Detailed User Journeys & State Transitions

### Journey A: Public Visitor Exploration
1. **Entry**: Visits `/`.
2. **CAD 3D Interaction**: Explores the interactive 3D assembly; hovers on machine sub-assemblies to see how SOP sections map to physical parts.
3. **Architecture Review**: Reads technical features at `/features` and enterprise controls at `/security`.
4. **Compliance Review**: Checks `/legal/privacy`, `/legal/terms`, and `/legal/data-declaration`.
5. **CTA Transition**: Clicks "Explore the Platform" or "Sign In" $\rightarrow$ `/login`.

---

### Journey B: Document Manager (SOP Upload & Vector Processing)
```mermaid
stateDiagram-v2
    [*] --> BrowseFiles: Open /documents
    BrowseFiles --> ValidatingFile: Select PDF/DOCX
    ValidatingFile --> UploadError: Size > 50MB or Bad MIME
    ValidatingFile --> StoringPrivate: Passed Validation
    StoringPrivate --> JobQueued: Saved to Private Bucket
    JobQueued --> ExtractingText: Worker Picks Job
    ExtractingText --> OCRAndVision: Extract Figures & Schematics
    OCRAndVision --> Chunking: Structure-Aware Slicing
    Chunking --> GeneratingEmbeddings: Call Embedding Provider
    GeneratingEmbeddings --> IndexingDB: Insert pgvector & tsvector
    IndexingDB --> Ready: Document Status Updated
    UploadError --> BrowseFiles: Display Safe Error Message
```

---

### Journey C: Frontline Industrial Worker (Diagnostic Troubleshooting)
1. **Context Initialization**: Worker visits `/chat`.
2. **Machine Scope Filter**: Selects target equipment (e.g. `PMP-402 Centrifugal Pump`) or leaves unconstrained.
3. **Language Selection**: Chooses English or Hindi; interface and placeholder texts dynamically translate.
4. **Query Input**:
   - Types query or clicks microphone button to activate Web Speech voice input.
   - Example query: *"Why is the pump motor vibrating excessively above 2400 RPM?"*
5. **Retrieval Execution**:
   - Backend queries pgvector for cosine similarity + PostgreSQL FTS for keyword matches.
   - Reciprocal Rank Fusion aggregates chunks.
   - If max score $< 0.62$, returns `insufficient_evidence` response with safety escalation.
6. **Synthesis & Citation**:
   - Grounded LLM synthesizes response with numbered steps and Lockout/Tagout cautions.
   - Response includes interactive citation chips `[Pump Manual v2, p. 45]`.
7. **Source Inspection**:
   - Worker clicks citation chip; slide-over drawer displays the verified excerpt and page snippet.
8. **Feedback & Speech**:
   - Worker clicks "Repeat Answer" to listen via TTS or submits a helpfulness rating (+1 / -1).

---

### Journey D: Bilingual Worker Interaction (Hindi / English)
```mermaid
sequenceDiagram
    autonumber
    actor Worker as Industrial Operator
    participant UI as Chat Interface
    participant API as FastAPI Backend
    participant RAG as Retrieval Engine
    participant LLM as Grounded LLM

    Worker->>UI: Selects 'हिंदी' (Hindi)
    UI->>UI: Rerenders navigation, buttons, and system strings in Hindi
    Worker->>UI: Inputs query: "कूलेंट का तापमान 90 डिग्री से ऊपर क्यों जा रहा है?"
    UI->>API: POST /api/v1/chat (language='hi', machine_id='CNC-MILL-02')
    API->>RAG: Hybrid query across bilingual embeddings & English/Hindi text
    RAG-->>API: Returns relevant SOP chunks [Chiller Loop, p. 14]
    API->>LLM: Injects context with strict Hindi instruction + Latin technical tags
    LLM-->>API: Returns natural Hindi instructions with 'Coolant Loop', 'Radiator Fin', '90°C' preserved
    API-->>UI: Answer with verified citations
    Worker->>UI: Clicks Citation Chip -> Reads original English/Hindi SOP excerpt
```

---

### Journey E: Organization Administrator (User & Audit Governance)
1. **Access**: Navigates to `/admin` (enforced via server-side role check `org_admin`).
2. **Member Management**: Invites new engineers/operators via email; assigns granular roles (`Viewer`, `Operator`, `Engineer`, `Knowledge Manager`, `Org Admin`).
3. **Audit Log Inspection**: Reviews tamper-evident event stream (login events, document uploads, document deletions, role modifications).
4. **Provider Status**: Inspects AI provider connectivity (OpenAI, Gemini, Ollama, Redis, PostgreSQL).
