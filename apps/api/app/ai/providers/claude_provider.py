from typing import List, Optional, AsyncGenerator
import httpx
import json
from app.ai.provider_interfaces import LLMProvider, VisionProvider
from app.core.config import settings

class ClaudeProvider(LLMProvider, VisionProvider):
    """
    Anthropic Claude Provider supporting Claude 3.5 Sonnet, Claude 3 Haiku, and Claude 3 Opus.
    Supports text generation, streaming SSE tokens, and multimodal schematic analysis.
    """
    def __init__(self, api_key: str = "", model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key or getattr(settings, "ANTHROPIC_API_KEY", "") or settings.LLM_API_KEY
        self.model = model or "claude-3-5-sonnet-20241022"
        self.base_url = "https://api.anthropic.com/v1"

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> str:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": self.model,
            "system": system_instruction,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(f"{self.base_url}/messages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]

    async def stream_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> AsyncGenerator[str, None]:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": self.model,
            "system": system_instruction,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            async with client.stream("POST", f"{self.base_url}/messages", headers=headers, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            evt = json.loads(data_str)
                            if evt.get("type") == "content_block_delta":
                                yield evt.get("delta", {}).get("text", "")
                        except Exception:
                            continue

    async def describe_schematic(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: Optional[str] = None
    ) -> str:
        import base64
        b64_img = base64.b64encode(image_bytes).decode("utf-8")
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": b64_img
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt or "Analyze this industrial machinery schematic and identify critical valves, alarms, and components."
                        }
                    ]
                }
            ],
            "max_tokens": 1000
        }
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            resp = await client.post(f"{self.base_url}/messages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
