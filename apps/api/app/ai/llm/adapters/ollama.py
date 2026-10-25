from app.ai.llm.adapters.base import ProviderAdapter, normalize_turns, require_text
from app.ai.llm.errors import ProviderError
from app.ai.llm.types import LLMRequest


class OllamaAdapter(ProviderAdapter):
    """Local Ollama server — free, no API key, works air-gapped."""

    name = "ollama"
    label = "Ollama (local)"
    requires_key = False

    @property
    def base_url(self) -> str:
        return self.config.base_url.rstrip("/")

    async def generate(self, request: LLMRequest, model: str, timeout: float) -> str:
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": request.system}]
            + [{"role": t.role, "content": t.content} for t in normalize_turns(request.messages)],
            "options": {"temperature": request.temperature, "num_predict": request.max_tokens},
            "stream": False,
        }
        data = await self._request("POST", f"{self.base_url}/api/chat", json=payload, timeout=timeout)
        return require_text(self.label, (data.get("message") or {}).get("content"))

    async def health_check(self, timeout: float = 10.0) -> None:
        data = await self._request("GET", f"{self.base_url}/api/tags", timeout=timeout)
        names = {m.get("name", "") for m in data.get("models", [])}
        wanted = self.config.default_model
        if wanted and wanted not in names and f"{wanted}:latest" not in names:
            raise ProviderError(
                "model_not_found",
                f"Ollama is running but model '{wanted}' is not pulled. Run: ollama pull {wanted}",
                retryable=False,
            )
