# Troubleshooting Guide — ForgeWise AI

## 1. Common Issues & Diagnostic Steps

### Issue: Backend returns 500 or fails to connect to database
- **Symptom**: `asyncpg.exceptions.ConnectionDoesNotExistError` or timeout on startup.
- **Remedy**:
  1. Verify PostgreSQL is running on port 5432 (`pg_isready`).
  2. Confirm `pgvector` extension is active:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```
  3. Verify connection string format in `.env`: `postgresql+asyncpg://user:pass@host:5432/dbname`.

### Issue: Retrieval returns `insufficient_evidence` unexpectedly
- **Symptom**: User asks a query on an uploaded manual, but system reports no evidence.
- **Remedy**:
  1. Check document processing status in database:
     ```sql
     SELECT id, title, status, error_message FROM documents WHERE title ILIKE '%query%';
     ```
  2. Verify that chunks exist:
     ```sql
     SELECT COUNT(*) FROM document_chunks WHERE document_id = 'YOUR_DOC_ID';
     ```
  3. Ensure machine ID filter in the query matches the metadata tagged during upload.
  4. Test raw vector similarity query directly to confirm embeddings were normalized.

### Issue: Voice microphone button inactive or reports permission denied
- **Symptom**: Clicking mic does not start audio input.
- **Remedy**:
  1. Ensure the web application is served over HTTPS or `localhost` (browser security requirement for `navigator.mediaDevices`).
  2. Check browser microphone permissions for the domain.
  3. Check console logs for `SpeechRecognition` API compatibility.

### Issue: 3D CAD scene displays black screen or fallback
- **Symptom**: The planetary gear 3D canvas does not render or shows the static CAD blueprint fallback.
- **Remedy**:
  1. Verify client machine supports WebGL 2.0 (check `chrome://gpu` or equivalent).
  2. Note that if user has enabled `prefers-reduced-motion` or has hardware acceleration disabled, the fallback blueprint is intentionally shown by design for accessibility.
