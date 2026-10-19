# API Reference — ForgeWise AI v1

Base URL: `http://localhost:8000/api/v1` (Production: `https://api.forgewise.internal/api/v1`)

All protected requests require an `Authorization: Bearer <JWT>` header containing valid Supabase Auth claims.

---

## 1. System Health & Auth

### `GET /health`
Returns system operational status and database connection health.
- **Auth**: None
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-10-20T00:30:00Z"
}
```

### `GET /auth/me`
Fetches verified user identity, tenant association, and assigned organizational role.
- **Auth**: Required
- **Response `200 OK`**:
```json
{
  "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "email": "technician@plant4.example.com",
  "full_name": "Rajesh Sharma",
  "organization_id": "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
  "organization_name": "Precision Heavy Industries",
  "role": "operator",
  "preferred_language": "hi"
}
```

---

## 2. Multimodal Chat & RAG

### `POST /chat`
Submits an industrial query for hybrid retrieval and grounded generation.
- **Auth**: Required (Viewer, Operator, Engineer, Knowledge Manager, Org Admin)
- **Request Body**:
```json
{
  "message": "Why is the coolant temperature rising above 90°C on line 2?",
  "conversation_id": "conv-10293847",
  "language": "en",
  "machine_id": "CNC-MILL-02",
  "document_scope": null
}
```
- **Response `200 OK`**:
```json
{
  "answer": "1. Inspect coolant loop heat exchanger for fin obstruction.\n2. Verify coolant pump circulation pressure (standard: 3.2 to 3.8 bar).\n3. Check thermostatic bypass valve actuation.",
  "language": "en",
  "conversation_id": "conv-10293847",
  "request_id": "req-98234-7123",
  "grounded": true,
  "confidence_status": "supported",
  "citations": [
    {
      "citation_id": "cit-01",
      "document_id": "doc-88123",
      "document_title": "CNC Milling Center Service Manual v4",
      "page_number": 64,
      "section_title": "Section 6.4: Spindle Cooling Circuit Fault Diagnostics",
      "excerpt": "If temperature exceeds 88°C, verify thermostatic valve spool operation and clean external radiator fins."
    }
  ]
}
```

---

## 3. Documents & Ingestion

### `POST /documents/upload`
Uploads a new SOP, OEM manual, or schematic.
- **Auth**: Required (Knowledge Manager, Org Admin)
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: Binary payload (PDF, DOCX, TXT, PNG, JPG)
  - `title`: String
  - `machine_id`: String (optional)
  - `version`: String (default: "1.0")
- **Response `201 Created`**:
```json
{
  "document_id": "doc-88123",
  "title": "CNC Milling Center Service Manual v4",
  "file_name": "cnc_mill_manual.pdf",
  "status": "processing",
  "file_size_bytes": 12450821,
  "created_at": "2026-10-20T00:30:00Z"
}
```

### `GET /documents`
Lists documents for the user's organization with status and machine filters.
- **Query Params**: `status`, `machine_id`, `search`, `page`, `limit`
- **Response `200 OK`**: Paginated array of documents.

### `GET /documents/{document_id}/pages/{page_number}`
Returns a secure, expiring signed URL to view a specific document page.
- **Response `200 OK`**:
```json
{
  "document_id": "doc-88123",
  "page_number": 64,
  "signed_url": "https://storage.forgewise.internal/signed/page-64.png?token=exp1792454400&sig=..."
}
```

---

## 4. Machines & Equipment Registry

### `GET /machines`
Lists registered plant machinery.
- **Response `200 OK`**:
```json
[
  {
    "machine_id": "CNC-MILL-02",
    "name": "5-Axis High-Speed Machining Center",
    "manufacturer": "Okuma",
    "model": "MU-5000V",
    "plant_location": "Bay 3, Precision Machining",
    "document_count": 4,
    "active_issues": 1
  }
]
```

---

## 5. Analytics & Observability

### `GET /analytics/overview`
Returns real telemetry aggregated from stored events.
- **Auth**: Required (Org Admin, Platform Admin)
- **Response `200 OK`**:
```json
{
  "total_queries_last_30d": 1842,
  "grounded_percentage": 97.4,
  "average_retrieval_latency_ms": 340,
  "unanswered_knowledge_gaps_count": 14,
  "documents_indexed_count": 86,
  "active_operators_count": 42
}
```
