from typing import List, Optional, AsyncGenerator
import httpx
import json
from app.ai.provider_interfaces import LLMProvider, EmbeddingProvider
from app.core.config import settings

class OllamaProvider(LLMProvider, EmbeddingProvider):
    """
    Ollama Local / Air-Gapped Edge Provider.
    Connects to local Ollama daemon (default: http://localhost:11434).
    Enables 100% on-premise industrial inference without internet access.
    """
    def __init__(self, base_url: str = "", model: str = "llama3:8b"):
        self.base_url = base_url or getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = model or "llama3:8b"

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            },
            "stream": False
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["message"]["content"]

    async def stream_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> AsyncGenerator[str, None]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            },
            "stream": True
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            yield data.get("message", {}).get("content", "")
                        except Exception:
                            continue

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        results = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for text in texts:
                payload = {
                    "model": getattr(settings, "OLLAMA_EMBED_MODEL", "nomic-embed-text"),
                    "prompt": text
                }
                resp = await client.post(f"{self.base_url}/api/embeddings", json=payload)
                resp.raise_for_status()
                results.append(resp.json()["embedding"])
        return results

    async def embed_query(self, query: str) -> List[float]:
        res = await self.embed_texts([query])
        return res[0]
