"""
Embedding providers. Every stored vector records the embedder id that produced
it, and retrieval only compares vectors from the same embedder, so switching
providers never mixes incompatible vector spaces.
"""
import hashlib
import math
import re
from abc import ABC, abstractmethod
from typing import List

from app.ai.http_client import get_http_client
from app.ai.llm.errors import from_exception, from_response
from app.ai.llm.service import llm_service
from app.core.config import settings
from app.core.logging import app_logger

LOCAL_DIM = 512
_TOKEN_RE = re.compile(r"[\w\-]+", re.UNICODE)


class Embedder(ABC):
    id: str = ""

    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        ...

    async def embed_query(self, query: str) -> List[float]:
        return (await self.embed_texts([query]))[0]


class LocalHashingEmbedder(Embedder):
    """
    Dependency-free lexical embedder (signed feature hashing of words and word
    bigrams, L2-normalised). Captures shared terminology, not deep semantics,
    but it is deterministic, offline and free.
    """

    id = f"local-hash-{LOCAL_DIM}"

    def _vector(self, text: str) -> List[float]:
        tokens = [t for t in _TOKEN_RE.findall(text.lower()) if len(t) > 1]
        features = tokens + [f"{a} {b}" for a, b in zip(tokens, tokens[1:])]
        vec = [0.0] * LOCAL_DIM
        for feat in features:
            h = int.from_bytes(hashlib.blake2b(feat.encode("utf-8"), digest_size=8).digest(), "little")
            vec[h % LOCAL_DIM] += 1.0 if (h >> 63) & 1 else -1.0
        norm = math.sqrt(sum(v * v for v in vec))
        return [v / norm for v in vec] if norm else vec

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [self._vector(t) for t in texts]


class GeminiEmbedder(Embedder):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model or "gemini-embedding-001"
        self.id = f"gemini:{self.model}"

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        client = get_http_client()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:batchEmbedContents"
        payload = {
            "requests": [
                {"model": f"models/{self.model}", "content": {"parts": [{"text": t}]}, "outputDimensionality": 768}
                for t in texts
            ]
        }
        try:
            resp = await client.post(url, json=payload, headers={"x-goog-api-key": self.api_key}, timeout=30)
        except Exception as exc:
            raise from_exception("Gemini embeddings", exc)
        if resp.status_code >= 400:
            raise from_response("Gemini embeddings", resp)
        return [e["values"] for e in resp.json()["embeddings"]]


class OpenAIEmbedder(Embedder):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model or "text-embedding-3-small"
        self.id = f"openai:{self.model}"

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        client = get_http_client()
        base = (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/")
        try:
            resp = await client.post(
                f"{base}/embeddings",
                json={"model": self.model, "input": texts},
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=30,
            )
        except Exception as exc:
            raise from_exception("OpenAI embeddings", exc)
        if resp.status_code >= 400:
            raise from_response("OpenAI embeddings", resp)
        return [item["embedding"] for item in resp.json()["data"]]


class OllamaEmbedder(Embedder):
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.id = f"ollama:{model}"

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        client = get_http_client()
        try:
            resp = await client.post(f"{self.base_url}/api/embed", json={"model": self.model, "input": texts}, timeout=60)
        except Exception as exc:
            raise from_exception("Ollama embeddings", exc)
        if resp.status_code >= 400:
            raise from_response("Ollama embeddings", resp)
        return resp.json()["embeddings"]


local_embedder = LocalHashingEmbedder()


def get_embedder() -> Embedder:
    choice = settings.EMBEDDING_PROVIDER or "local"
    gemini_key = llm_service.api_key("gemini")
    openai_key = llm_service.api_key("openai")
    ollama_url = llm_service.provider_config("ollama").base_url
    if choice == "auto":
        choice = "gemini" if gemini_key else "openai" if openai_key else "local"
    if choice == "gemini" and gemini_key:
        return GeminiEmbedder(gemini_key, settings.EMBEDDING_MODEL)
    if choice == "openai" and openai_key:
        return OpenAIEmbedder(openai_key, settings.EMBEDDING_MODEL)
    if choice == "ollama" and ollama_url:
        return OllamaEmbedder(ollama_url, settings.OLLAMA_EMBED_MODEL)
    if choice not in ("local", ""):
        app_logger.warning(f"EMBEDDING_PROVIDER={choice} is not configured; using local embeddings.")
    return local_embedder


async def embed_documents(texts: List[str]):
    """Returns (vectors, embedder_id). Falls back to local embeddings if the remote provider fails."""
    embedder = get_embedder()
    try:
        return await embedder.embed_texts(texts), embedder.id
    except Exception as exc:
        if embedder is local_embedder:
            raise
        app_logger.warning(f"Embedding provider {embedder.id} failed ({exc}); using local embeddings.")
        return await local_embedder.embed_texts(texts), local_embedder.id
