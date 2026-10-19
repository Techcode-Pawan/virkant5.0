from typing import List, Optional
import httpx
from app.ai.provider_interfaces import LLMProvider, EmbeddingProvider, VisionProvider
from app.core.config import settings

class OpenAIProvider(LLMProvider, EmbeddingProvider, VisionProvider):
    def __init__(self, api_key: str = "", model: str = "gpt-4o-mini"):
        self.api_key = api_key or settings.LLM_API_KEY
        self.model = model or settings.LLM_MODEL
        self.base_url = "https://api.openai.com/v1"

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        headers = {
            "Authorization": f"Bearer {self.api_key or settings.EMBEDDING_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.EMBEDDING_MODEL or "text-embedding-3-small",
            "input": texts
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(f"{self.base_url}/embeddings", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data["data"]]

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
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.VISION_MODEL or "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt or "Analyze this industrial diagram and extract components, tags, and connections."},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_img}"}}
                    ]
                }
            ],
            "max_tokens": 1000
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
