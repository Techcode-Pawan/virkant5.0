from app.ai.llm.adapters.base import ProviderAdapter, normalize_turns, require_text
from app.ai.llm.errors import ProviderError
from app.ai.llm.types import LLMRequest

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


class GeminiAdapter(ProviderAdapter):
    name = "gemini"
    label = "Google Gemini"

    def _headers(self):
        # Key goes in a header, never in the URL (URLs end up in logs and proxies).
        return {"x-goog-api-key": self.config.api_key, "content-type": "application/json"}

    async def generate(self, request: LLMRequest, model: str, timeout: float) -> str:
        contents = [
            {"role": "model" if t.role == "assistant" else "user", "parts": [{"text": t.content}]}
            for t in normalize_turns(request.messages)
        ]
        generation_config = {"temperature": request.temperature, "maxOutputTokens": request.max_tokens}
        if "2.5-flash" in model:
            # 2.5 Flash models spend output tokens on "thinking" by default, which can
            # consume the whole budget and return no text for long grounded prompts.
            generation_config["thinkingConfig"] = {"thinkingBudget": 0}
        payload = {
            "system_instruction": {"parts": [{"text": request.system}]},
            "contents": contents,
            "generationConfig": generation_config,
        }
        data = await self._request(
            "POST",
            f"{GEMINI_BASE_URL}/models/{model}:generateContent",
            headers=self._headers(),
            json=payload,
            timeout=timeout,
        )
        candidates = data.get("candidates") or []
        if not candidates:
            reason = (data.get("promptFeedback") or {}).get("blockReason")
            raise ProviderError(
                "invalid_response",
                f"Gemini returned no answer{f' (blocked: {reason})' if reason else ''}.",
                retryable=False,
            )
        parts = (candidates[0].get("content") or {}).get("parts") or []
        return require_text(self.label, "".join(p.get("text", "") for p in parts if not p.get("thought")))

    async def health_check(self, timeout: float = 10.0) -> None:
        await self._request("GET", f"{GEMINI_BASE_URL}/models?pageSize=1", headers=self._headers(), timeout=timeout)
