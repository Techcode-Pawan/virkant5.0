from app.ai.llm.adapters.base import ProviderAdapter, normalize_turns, require_text
from app.ai.llm.types import LLMRequest


class OpenAIAdapter(ProviderAdapter):
    """OpenAI and any OpenAI-compatible Chat Completions endpoint (OPENAI_BASE_URL)."""

    name = "openai"
    label = "OpenAI"

    @property
    def base_url(self) -> str:
        return (self.config.base_url or "https://api.openai.com/v1").rstrip("/")

    def _headers(self):
        return {"Authorization": f"Bearer {self.config.api_key}", "Content-Type": "application/json"}

    async def generate(self, request: LLMRequest, model: str, timeout: float) -> str:
        messages = [{"role": "system", "content": request.system}] + [
            {"role": t.role, "content": t.content} for t in normalize_turns(request.messages)
        ]
        payload = {"model": model, "messages": messages, "temperature": request.temperature}
        # api.openai.com deprecated max_tokens in favour of max_completion_tokens;
        # most compatible servers still expect max_tokens.
        token_field = "max_completion_tokens" if "api.openai.com" in self.base_url else "max_tokens"
        payload[token_field] = request.max_tokens
        data = await self._request(
            "POST", f"{self.base_url}/chat/completions", headers=self._headers(), json=payload, timeout=timeout
        )
        return require_text(self.label, data["choices"][0]["message"].get("content"))

    async def health_check(self, timeout: float = 10.0) -> None:
        await self._request("GET", f"{self.base_url}/models", headers=self._headers(), timeout=timeout)
