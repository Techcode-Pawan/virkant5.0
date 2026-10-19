from typing import List, Optional
import httpx
from app.ai.provider_interfaces import LLMProvider, EmbeddingProvider, VisionProvider
from app.core.config import settings

class GeminiProvider(LLMProvider, EmbeddingProvider, VisionProvider):
    def __init__(self, api_key: str = "", model: str = "gemini-1.5-flash"):
        self.api_key = api_key or settings.LLM_API_KEY
        self.model = model or "gemini-1.5-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> str:
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        url = f"{self.base_url}/models/text-embedding-004:batchEmbedContents?key={self.api_key}"
        requests = [{"model": "models/text-embedding-004", "content": {"parts": [{"text": t}]}} for t in texts]
        payload = {"requests": requests}
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return [e["values"] for e in data["embeddings"]]

    async def embed_query(self, query: str) -> List[float]:
        res = await self.embed_texts([query])
        return res[0]

    async def describe_schematic(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: Optional[str] = None
    ) -> str:
        import base64
        b64_img = base64.b64encode(image_bytes).decode("utf-8")
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt or "Analyze this industrial schematic and describe its key circuits and tags."},
                    {"inline_data": {"mime_type": mime_type, "data": b64_img}}
                ]
            }]
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
