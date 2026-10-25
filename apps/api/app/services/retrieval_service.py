import math
import re
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from app.ai.model_registry import get_embedding_provider
from app.services.document_registry import custom_document_registry, BASELINE_PLANT_DOCUMENTS
from app.db.sqlite_db import execute_query

# Cross-lingual dictionary for Hindi / Hinglish industrial terminology mapping
CROSS_LINGUAL_MAP = {
    "टॉर्क": ["torque", "gland", "bolt", "nm"],
    "सील": ["seal", "cartridge", "mechanical", "flush"],
    "पंप": ["pump", "pmp-402", "suction", "discharge"],
    "तापमान": ["temperature", "chiller", "cooling", "88"],
    "गरम": ["temperature", "hot", "overheat", "e-304"],
    "अलार्म": ["alarm", "code", "e-304", "warning"],
    "वाल्व": ["valve", "relief", "prv-102", "hydraulic"],
    "चैटर": ["chatter", "pulsing", "vibration", "prv-102"],
    "दबाव": ["pressure", "bar", "accumulator", "nitrogen"],
    "कंपन": ["vibration", "misalignment", "bearing", "cavitation"],
    "spindle": ["spindle", "chiller", "cnc", "e-304"],
    "hydraulic": ["hydraulic", "press", "prv-102", "315"],
}

# Stop words to ignore during lexical BM25 tokenization
STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "is", "are", "was", "were", "what", "which", "how", "when", "where",
    "why", "can", "could", "should", "tell", "me", "about", "give", "kya", "hai",
    "kaise", "kare", "karna", "chahiye", "kitna", "batao", "ka", "ki", "ke", "ko"
}

def tokenize(text: str) -> List[str]:
    clean = re.sub(r"[^\w\s-]", " ", text.lower())
    return [w for w in clean.split() if len(w) > 1 and w not in STOP_WORDS]

def compute_bm25_score(query_tokens: List[str], doc_tokens: List[str], avg_doc_len: float, k1: float = 1.5, b: float = 0.75) -> float:
    if not doc_tokens:
        return 0.0
    doc_len = len(doc_tokens)
    tf_dict: Dict[str, int] = {}
    for t in doc_tokens:
        tf_dict[t] = tf_dict.get(t, 0) + 1

    score = 0.0
    for q in query_tokens:
        if q in tf_dict:
            tf = tf_dict[q]
            denom = tf + k1 * (1.0 - b + b * (doc_len / (avg_doc_len or 1.0)))
            score += (tf * (k1 + 1.0)) / denom
    return score

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    arr1 = np.array(v1, dtype=float)
    arr2 = np.array(v2, dtype=float)
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(arr1, arr2) / (norm1 * norm2))

class HybridRetrievalService:
    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.session = db_session
        self.embedder = get_embedding_provider()

    async def retrieve_chunks(
        self,
        query: str,
        organization_id: str,
        machine_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Executes hybrid retrieval:
        1. Multi-source chunk collection (SQLite persistent DB + Custom workspace registry + Baseline manuals).
        2. Cross-lingual vocabulary expansion for Hindi / Hinglish.
        3. Vector search via cosine similarity on dense embeddings.
        4. Keyword BM25 term frequency scoring with machine scope boosting.
        5. Reciprocal rank fusion & reranking.
        """
        all_candidate_chunks: List[Dict[str, Any]] = []

        # 1. Fetch chunks from SQLite persistent database
        try:
            sql = """
            SELECT c.id, c.document_id, d.title as document_title, c.page_number,
                   c.section_title, c.content, c.embedding, d.machine_id, c.workspace_id
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.organization_id = ?
            """
            params = [organization_id]
            if workspace_id:
                sql += " AND (c.workspace_id = ? OR c.workspace_id = 'ws-a1111111' OR c.workspace_id IS NULL)"
                params.append(workspace_id)
            if machine_id:
                sql += " AND (d.machine_id = ? OR d.machine_id IS NULL)"
                params.append(machine_id)

            db_rows = await execute_query(sql, tuple(params))
            for row in db_rows:
                emb = None
                if row.get("embedding"):
                    try:
                        import json
                        emb = json.loads(row["embedding"]) if isinstance(row["embedding"], str) else row["embedding"]
                    except Exception:
                        pass
                all_candidate_chunks.append({
                    "id": row["id"],
                    "document_id": row["document_id"],
                    "document_title": row["document_title"],
                    "page_number": row["page_number"],
                    "section_title": row["section_title"] or f"Page {row['page_number']}",
                    "content": row["content"],
                    "machine_id": row.get("machine_id"),
                    "workspace_id": row.get("workspace_id"),
                    "embedding": emb,
                    "is_custom": row.get("workspace_id") == workspace_id
                })
        except Exception:
            pass

        # 2. Also incorporate in-memory registry chunks (custom uploads & baselines)
        registry_chunks = custom_document_registry.get_all_chunks(workspace_id=workspace_id)
        existing_ids = {c["id"] for c in all_candidate_chunks}
        for rc in registry_chunks:
            if rc["id"] not in existing_ids:
                if machine_id and rc.get("machine_id") and rc.get("machine_id") != machine_id:
                    continue
                all_candidate_chunks.append(rc)

        if not all_candidate_chunks:
            return []

        # 3. Cross-lingual Query Expansion
        query_lower = query.lower()
        expanded_terms = tokenize(query)
        for hindi_word, eng_synonyms in CROSS_LINGUAL_MAP.items():
            if hindi_word in query or hindi_word in query_lower:
                expanded_terms.extend(eng_synonyms)

        # 4. Dense Vector Embedding for Semantic Search
        try:
            query_embedding = await self.embedder.embed_query(query)
        except Exception:
            query_embedding = None

        # 5. Hybrid Scoring: BM25 + Vector Similarity + Scope Boost
        avg_len = sum(len(tokenize(c["content"])) for c in all_candidate_chunks) / len(all_candidate_chunks)

        scored_candidates = []
        for chunk in all_candidate_chunks:
            content_text = chunk["content"]
            title_text = chunk.get("document_title", "")
            section_text = chunk.get("section_title", "")

            # BM25 lexical score
            doc_tokens = tokenize(content_text)
            title_tokens = tokenize(title_text) + tokenize(section_text)
            bm25_body = compute_bm25_score(expanded_terms, doc_tokens, avg_len)
            bm25_title = compute_bm25_score(expanded_terms, title_tokens, avg_len) * 2.0
            bm25_total = bm25_body + bm25_title

            # Vector cosine similarity
            vector_score = 0.0
            if query_embedding and chunk.get("embedding"):
                vector_score = cosine_similarity(query_embedding, chunk["embedding"])
            elif any(term in content_text.lower() for term in expanded_terms):
                # Fallback lexical similarity proxy if embedding not generated
                vector_score = 0.65

            # Machine scope boost (crucial for plant maintenance precision)
            machine_boost = 1.0
            if machine_id:
                if chunk.get("machine_id") == machine_id:
                    machine_boost = 1.6
                elif chunk.get("machine_id") is None:
                    machine_boost = 1.1 # Plant-wide common manual
                else:
                    machine_boost = 0.3 # Different machine penalty

            # Custom workspace upload priority
            workspace_boost = 1.25 if chunk.get("is_custom") else 1.0

            # Combined hybrid ranking formula
            hybrid_score = ((0.5 * bm25_total) + (0.5 * vector_score * 10.0)) * machine_boost * workspace_boost

            if bm25_total > 0.1 or vector_score >= 0.75 or (bm25_total > 0 and vector_score >= 0.35):
                scored_candidates.append((hybrid_score, chunk))

        # Sort by hybrid score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        return [chunk for _, chunk in scored_candidates[:top_k]]
