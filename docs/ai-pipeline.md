# AI Pipeline & Multimodal RAG Specification — ForgeWise AI

## 1. Document Ingestion Pipeline

```
Raw File (PDF, DOCX, TXT)
          │
          ▼
1. Validation (Magic bytes, < 50MB, extension check)
          │
          ▼
2. Private Storage Dispatch (S3 / Supabase private bucket)
          │
          ▼
3. Extraction Worker
   ├── Text Extraction (Page-aware PyPDF / python-docx)
   ├── Schematic & Diagram Isolator (Pillow / OpenCV)
   └── OCR Engine (Tesseract for text inside diagrams)
          │
          ▼
4. Structure-Aware Chunking
   ├── Target chunk size: 450 tokens (~1800 characters)
   ├── Chunk overlap: 60 tokens (~240 characters)
   ├── Preservation of: page number, section header, machine ID, org ID
          │
          ▼
5. Embedding Generation
   ├── Model: text-embedding-3-small (1536 dimensions)
   └── Normalized unit vectors (cosine metric)
          │
          ▼
6. Dual Indexing
   ├── pgvector HNSW / IVFFlat cosine index
   └── PostgreSQL English & Simple tsvector FTS index
```

---

## 2. Hybrid Retrieval & Ranking

When an operator asks a question, the retrieval engine invokes two simultaneous query paths:

### Path A: Dense Semantic Vector Search
```sql
SELECT id, document_id, page_number, section_title, content,
       1 - (embedding <=> :query_embedding) AS vector_similarity
FROM document_chunks
WHERE organization_id = :org_id
  AND (:machine_id IS NULL OR metadata_json->>'machine_id' = :machine_id)
ORDER BY embedding <=> :query_embedding
LIMIT 20;
```

### Path B: Lexical Full-Text Search
```sql
SELECT id, document_id, page_number, section_title, content,
       ts_rank_cd(tsv_content, plainto_tsquery('english', :query_text)) AS fts_score
FROM document_chunks
WHERE organization_id = :org_id
  AND tsv_content @@ plainto_tsquery('english', :query_text)
ORDER BY fts_score DESC
LIMIT 20;
```

### Fusion via Reciprocal Rank Fusion (RRF)
Retrieved items are merged into a single ranked context window using:
$$RRF\_Score(c) = \frac{0.65}{60 + Rank_{vec}(c)} + \frac{0.35}{60 + Rank_{fts}(c)}$$

---

## 3. Grounding Verification & Zero-Hallucination Policy

1. **Relevance Threshold**: If the highest RRF score is below $0.015$ (or top vector cosine similarity $< 0.62$), the system enters `insufficient_evidence` mode.
2. **Refusal Template**:
   > *"The available documentation does not contain reliable operational parameters for this inquiry. Please consult plant engineering or upload the corresponding SOP."*
3. **Citation Cross-Validation**:
   The LLM output is parsed for citation tags `[chunk_id]`. Only chunks provided in the prompt context may be cited. If the LLM generates a citation not in context, it is stripped immediately before reaching the user.
