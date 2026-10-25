import re
from typing import Any, Dict, List, Optional

import numpy as np

from app.ai.embeddings import get_embedder, local_embedder
from app.core.logging import app_logger
from app.db.mongo import CHUNKS, DOCUMENTS, get_db

# Cross-lingual dictionary for Hindi / Hinglish industrial terminology mapping
CROSS_LINGUAL_MAP = {
    "टॉर्क": ["torque", "gland", "bolt", "nm"],
    "सील": ["seal", "cartridge", "mechanical", "flush"],
    "पंप": ["pump", "suction", "discharge"],
    "तापमान": ["temperature", "chiller", "cooling"],
    "गरम": ["temperature", "hot", "overheat"],
    "अलार्म": ["alarm", "code", "warning"],
    "वाल्व": ["valve", "relief", "hydraulic"],
    "चैटर": ["chatter", "pulsing", "vibration"],
    "दबाव": ["pressure", "bar", "accumulator", "nitrogen"],
    "कंपन": ["vibration", "misalignment", "bearing", "cavitation"],
}

# Stop words to ignore during lexical BM25 tokenization
STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "is", "are", "was", "were", "what", "which", "how", "when", "where",
    "why", "can", "could", "should", "tell", "me", "about", "give", "do", "if", "it",
    "kya", "hai", "kaise", "kare", "karna", "chahiye", "kitna", "batao", "ka", "ki", "ke", "ko",
}


def tokenize(text: str) -> List[str]:
    clean = re.sub(r"[^\w\s-]", " ", text.lower())
    return [w for w in clean.split() if len(w) > 1 and w not in STOP_WORDS]


def compute_bm25_score(query_tokens: List[str], doc_tokens: List[str], avg_doc_len: float, k1: float = 1.5, b: float = 0.75) -> float:
    if not doc_tokens:
        return 0.0
    doc_len = len(doc_tokens)
    tf: Dict[str, int] = {}
    for t in doc_tokens:
        tf[t] = tf.get(t, 0) + 1
    score = 0.0
    for q in query_tokens:
        if q in tf:
            denom = tf[q] + k1 * (1.0 - b + b * (doc_len / (avg_doc_len or 1.0)))
            score += (tf[q] * (k1 + 1.0)) / denom
    return score


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    a, b = np.asarray(v1, dtype=float), np.asarray(v2, dtype=float)
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


class HybridRetrievalService:
    async def retrieve_chunks(
        self,
        query: str,
        organization_id: str,
        machine_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid retrieval over the workspace's chunks in MongoDB:
        BM25 lexical score + cosine similarity (same-embedder vectors only)
        + machine scope boost, with a minimum term-overlap gate so unrelated
        questions do not "match" on a single incidental word.
        """
        db = get_db()
        chunk_filter: Dict[str, Any] = {"organization_id": organization_id, "workspace_id": workspace_id}
        rows = [r async for r in db[CHUNKS].find(chunk_filter)]
        if not rows:
            return []

        doc_ids = list({r["document_id"] for r in rows})
        docs = {d["_id"]: d async for d in db[DOCUMENTS].find({"_id": {"$in": doc_ids}}, {"title": 1, "machine_id": 1})}
        candidates = []
        for r in rows:
            doc = docs.get(r["document_id"])
            if doc is None:
                continue  # orphaned chunk
            doc_machine = doc.get("machine_id")
            if machine_id and doc_machine and doc_machine != machine_id:
                continue
            candidates.append({
                "id": r["_id"],
                "document_id": r["document_id"],
                "document_title": doc.get("title", "Document"),
                "page_number": r.get("page_number", 1),
                "section_title": r.get("section_title") or f"Page {r.get('page_number', 1)}",
                "content": r.get("content", ""),
                "machine_id": doc_machine,
                "embedding": r.get("embedding"),
                "embedding_model": r.get("embedding_model"),
            })
        if not candidates:
            return []

        query_terms = tokenize(query)
        for word, synonyms in CROSS_LINGUAL_MAP.items():
            if word in query:
                query_terms.extend(synonyms)
        unique_terms = set(query_terms)

        # Query vectors per embedder actually present in the candidates.
        query_vectors: Dict[str, List[float]] = {}
        needed = {c["embedding_model"] for c in candidates if c.get("embedding")}
        embedder = get_embedder()
        for model_id in needed:
            try:
                if model_id == local_embedder.id:
                    query_vectors[model_id] = await local_embedder.embed_query(query)
                elif model_id == embedder.id:
                    query_vectors[model_id] = await embedder.embed_query(query)
            except Exception as exc:
                app_logger.warning(f"Query embedding failed for {model_id}: {exc}; using lexical scoring only.")

        tokenized = [tokenize(c["content"]) for c in candidates]
        avg_len = sum(len(t) for t in tokenized) / len(tokenized)

        scored = []
        for chunk, doc_tokens in zip(candidates, tokenized):
            title_tokens = tokenize(chunk["document_title"]) + tokenize(chunk["section_title"] or "")
            bm25_total = compute_bm25_score(query_terms, doc_tokens, avg_len) + 2.0 * compute_bm25_score(query_terms, title_tokens, avg_len)
            matched = unique_terms & (set(doc_tokens) | set(title_tokens))

            vector_score = 0.0
            qv = query_vectors.get(chunk.get("embedding_model") or "")
            if qv and chunk.get("embedding"):
                vector_score = cosine_similarity(qv, chunk["embedding"])

            machine_boost = 1.0
            if machine_id:
                machine_boost = 1.6 if chunk.get("machine_id") == machine_id else 1.1

            hybrid = ((0.5 * bm25_total) + (5.0 * vector_score)) * machine_boost
            min_overlap = min(2, len(unique_terms)) if unique_terms else 1
            relevant = (len(matched) >= min_overlap and bm25_total > 0.1) or vector_score >= 0.75
            if relevant:
                scored.append((hybrid, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]
        best = top[0][0] if top else 1.0
        results = []
        for score, chunk in top:
            item = {k: v for k, v in chunk.items() if k not in ("embedding", "embedding_model")}
            item["relevance_score"] = round(score / best, 3) if best else 0.0
            results.append(item)
        return results
