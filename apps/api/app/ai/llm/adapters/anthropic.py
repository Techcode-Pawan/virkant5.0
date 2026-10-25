from app.ai.llm.adapters.base import ProviderAdapter, normalize_turns, require_text
from app.ai.llm.types import LLMRequest

ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"


class AnthropicAdapter(ProviderAdapter):
    name = "anthropic"
    label = "Anthropic Claude"

    def _headers(self):
        return {
            "x-api-key": self.config.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    async def generate(self, request: LLMRequest, model: str, timeout: float) -> str:
        payload = {
            "model": model,
            "system": request.system,
            "messages": [{"role": t.role, "content": t.content} for t in normalize_turns(request.messages)],
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        }
        data = await self._request(
            "POST", f"{ANTHROPIC_BASE_URL}/messages", headers=self._headers(), json=payload, timeout=timeout
        )
        text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
        return require_text(self.label, text)

    async def health_check(self, timeout: float = 10.0) -> None:
        await self._request("GET", f"{ANTHROPIC_BASE_URL}/models?limit=1", headers=self._headers(), timeout=timeout)
