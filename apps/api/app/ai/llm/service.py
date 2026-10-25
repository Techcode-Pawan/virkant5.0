"""
LLM Service
 ├── Provider adapters (gemini, openai, anthropic, ollama, offline)
 ├── Model selection   (request model → workspace default → LLM_PRIMARY_MODEL → first configured)
 ├── Fallback manager  (LLM_FALLBACK_MODELS or other configured providers, then offline)
 ├── Retry & timeout   (bounded exponential backoff with jitter, per-request + total deadline)
 └── Error handling    (normalized ProviderError kinds, provider cooldown, honest status)
"""
import asyncio
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.ai.llm.adapters import ADAPTER_CLASSES, ProviderAdapter, ProviderConfig
from app.ai.llm.catalog import OFFLINE_MODEL, all_models, default_model_for, resolve_model
from app.ai.llm.errors import ProviderError
from app.ai.llm.retry import retry_async
from app.ai.llm.types import Attempt, ChatTurn, LLMRequest, LLMResult, ModelInfo
from app.core.config import settings
from app.core.exceptions import LLMUnavailableError
from app.core.logging import app_logger

# Failures that mean "this provider is struggling" — skip it for a while.
COOLDOWN_KINDS = {"rate_limit", "unavailable", "network", "timeout"}


@dataclass
class ProviderStatus:
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    last_error_kind: Optional[str] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    cooldown_until: float = 0.0
    last_checked_at: Optional[datetime] = None

    def state(self, configured: bool) -> str:
        if not configured:
            return "not_configured"
        if self.last_success_at is None and self.last_failure_at is None:
            return "unverified"
        if self.last_failure_at and (not self.last_success_at or self.last_failure_at > self.last_success_at):
            if self.last_error_kind in ("auth", "model_not_found", "bad_request"):
                return "error"
            return "unavailable" if time.monotonic() < self.cooldown_until else "degraded"
        return "ready"


def estimate_tokens(text: str) -> int:
    # Conservative (~2.5 chars/token) so Devanagari/CJK text does not overflow context windows.
    return int(len(text) / 2.5) + 4


def trim_history(messages: List[ChatTurn], budget_tokens: int) -> List[ChatTurn]:
    """Keeps the newest turns that fit in the budget. The latest turn is always kept."""
    if not messages:
        return messages
    kept: List[ChatTurn] = [messages[-1]]
    used = estimate_tokens(messages[-1].content)
    for turn in reversed(messages[:-1]):
        cost = estimate_tokens(turn.content)
        if used + cost > budget_tokens:
            break
        kept.append(turn)
        used += cost
    return list(reversed(kept))


class LLMService:
    def __init__(self) -> None:
        self._overrides: Dict[str, str] = {}
        self._status: Dict[str, ProviderStatus] = {name: ProviderStatus() for name in ADAPTER_CLASSES}
        self._adapters: Dict[str, ProviderAdapter] = {}
        self._build_adapters()

    # ---------- configuration ----------
    def provider_config(self, name: str) -> ProviderConfig:
        o = self._overrides
        legacy_key = settings.LLM_API_KEY if settings.LLM_PROVIDER in (name, "claude" if name == "anthropic" else name) else ""
        if name == "gemini":
            return ProviderConfig(o.get("gemini_api_key") or settings.GEMINI_API_KEY or legacy_key, "", settings.GEMINI_MODEL)
        if name == "openai":
            return ProviderConfig(o.get("openai_api_key") or settings.OPENAI_API_KEY or legacy_key, settings.OPENAI_BASE_URL, settings.OPENAI_MODEL)
        if name == "anthropic":
            return ProviderConfig(o.get("anthropic_api_key") or settings.ANTHROPIC_API_KEY or legacy_key, "", settings.ANTHROPIC_MODEL)
        if name == "ollama":
            return ProviderConfig("", o.get("ollama_url") or settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL)
        return ProviderConfig()

    def _build_adapters(self) -> None:
        self._adapters = {name: cls(self.provider_config(name)) for name, cls in ADAPTER_CLASSES.items()}

    def set_overrides(self, values: Dict[str, str]) -> None:
        """Runtime key overrides from the Settings page (kept in memory only, never persisted)."""
        for key, value in values.items():
            if value is None:
                continue
            value = value.strip()
            if value:
                self._overrides[key] = value
            else:
                self._overrides.pop(key, None)
        self._build_adapters()
        for status in self._status.values():
            status.cooldown_until = 0.0

    def api_key(self, provider: str) -> str:
        return self.provider_config(provider).api_key

    def adapter(self, provider: str) -> ProviderAdapter:
        return self._adapters[provider]

    def is_configured(self, provider: str) -> bool:
        if provider == "offline":
            return settings.LLM_OFFLINE_FALLBACK
        return provider in self._adapters and self._adapters[provider].is_configured()

    def configured_providers(self) -> List[str]:
        return [p for p in ADAPTER_CLASSES if p != "offline" and self.is_configured(p)]

    # ---------- model selection ----------
    def default_model(self) -> ModelInfo:
        for candidate in (settings.LLM_PRIMARY_MODEL, settings.LLM_MODEL):
            info = resolve_model(candidate)
            if info and self.is_configured(info.provider):
                return info
        for provider in self.configured_providers():
            info = default_model_for(provider)
            if info:
                return info
        return OFFLINE_MODEL

    def build_chain(self, preferred: Optional[str], allow_fallback: bool = True) -> List[ModelInfo]:
        chain: List[ModelInfo] = []
        first = resolve_model(preferred) if preferred else None
        chain.append(first or self.default_model())
        if allow_fallback:
            explicit = [resolve_model(m) for m in settings.fallback_models_list]
            if explicit:
                chain.extend(m for m in explicit if m)
            else:
                for provider in self.configured_providers():
                    info = default_model_for(provider)
                    if info:
                        chain.append(info)
            if settings.LLM_OFFLINE_FALLBACK:
                chain.append(OFFLINE_MODEL)
        seen, unique = set(), []
        for m in chain:
            if m.id not in seen:
                seen.add(m.id)
                unique.append(m)
        return unique

    # ---------- execution ----------
    def _record_success(self, provider: str) -> None:
        s = self._status[provider]
        s.last_success_at = datetime.now(timezone.utc)
        s.consecutive_failures = 0
        s.cooldown_until = 0.0
        s.last_error = None
        s.last_error_kind = None

    def _record_failure(self, provider: str, err: ProviderError) -> None:
        s = self._status[provider]
        s.last_failure_at = datetime.now(timezone.utc)
        s.last_error_kind = err.kind
        s.last_error = err.message
        s.consecutive_failures += 1
        if err.kind in COOLDOWN_KINDS:
            s.cooldown_until = time.monotonic() + settings.LLM_PROVIDER_COOLDOWN_SECONDS * min(s.consecutive_failures, 4)

    async def generate(
        self,
        request: LLMRequest,
        preferred_model: Optional[str] = None,
        allow_fallback: bool = True,
    ) -> LLMResult:
        started = time.monotonic()
        deadline = started + settings.LLM_TOTAL_TIMEOUT_SECONDS
        chain = self.build_chain(preferred_model, allow_fallback)
        attempts: List[Attempt] = []

        for index, model in enumerate(chain):
            has_alternatives = index < len(chain) - 1
            if not self.is_configured(model.provider):
                attempts.append(Attempt(model.id, model.provider, False, "not_configured",
                                        f"{model.provider} is not configured.", skipped=True))
                continue
            status = self._status[model.provider]
            if has_alternatives and time.monotonic() < status.cooldown_until:
                attempts.append(Attempt(model.id, model.provider, False, "cooldown",
                                        f"Skipped: recent {status.last_error_kind} error.", skipped=True))
                continue
            remaining = deadline - time.monotonic()
            if remaining < 1.0:
                break

            adapter = self._adapters[model.provider]
            budget = max(1024, model.context_window - request.max_tokens - estimate_tokens(request.system))
            scoped = LLMRequest(
                system=request.system,
                messages=trim_history(request.messages, budget),
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                context_chunks=request.context_chunks,
                language=request.language,
            )
            per_call_timeout = min(settings.LLM_REQUEST_TIMEOUT_SECONDS, remaining)
            call_started = time.monotonic()

            async def call() -> str:
                try:
                    return await asyncio.wait_for(
                        adapter.generate(scoped, model.model, per_call_timeout), timeout=per_call_timeout + 2
                    )
                except asyncio.TimeoutError:
                    raise ProviderError("timeout", f"{adapter.label} did not respond within {int(per_call_timeout)}s.")

            try:
                text, retries = await retry_async(
                    call,
                    max_retries=settings.LLM_MAX_RETRIES if model.provider != "offline" else 0,
                    base_delay=settings.LLM_RETRY_BASE_DELAY_SECONDS,
                    max_delay=settings.LLM_RETRY_MAX_DELAY_SECONDS,
                    deadline=deadline,
                )
            except ProviderError as err:
                if model.provider != "offline":
                    self._record_failure(model.provider, err)
                app_logger.warning(f"LLM attempt failed [{model.id}] kind={err.kind}: {err.message}")
                attempts.append(Attempt(model.id, model.provider, False, err.kind, err.message,
                                        int((time.monotonic() - call_started) * 1000), err.retries))
                continue

            if model.provider != "offline":
                self._record_success(model.provider)
            attempts.append(Attempt(model.id, model.provider, True, None, None,
                                    int((time.monotonic() - call_started) * 1000), retries))
            return LLMResult(
                text=text,
                model_id=model.id,
                provider=model.provider,
                attempts=attempts,
                fallback_used=any(not a.ok for a in attempts),
                latency_ms=int((time.monotonic() - started) * 1000),
                degraded=model.provider == "offline",
            )

        configured = self.configured_providers()
        if not configured:
            message = (
                "No AI provider is configured. Add GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY "
                "or OLLAMA_BASE_URL to apps/api/.env (see README)."
            )
        else:
            message = "All configured AI providers failed for this request. Please retry shortly."
        raise LLMUnavailableError(message, attempts=[a.to_dict() for a in attempts])

    async def check_provider(self, provider: str) -> Dict:
        adapter = self._adapters[provider]
        status = self._status[provider]
        status.last_checked_at = datetime.now(timezone.utc)
        if not adapter.is_configured():
            return self.provider_status(provider)
        try:
            await adapter.health_check(timeout=10.0)
            self._record_success(provider)
        except ProviderError as err:
            self._record_failure(provider, err)
        except Exception as exc:  # defensive: never let a health check crash the endpoint
            self._record_failure(provider, ProviderError("unknown", str(exc.__class__.__name__), retryable=False))
        return self.provider_status(provider)

    # ---------- reporting ----------
    def provider_status(self, provider: str) -> Dict:
        adapter = self._adapters[provider]
        s = self._status[provider]
        configured = self.is_configured(provider)
        cooldown = max(0.0, s.cooldown_until - time.monotonic())
        return {
            "id": provider,
            "label": adapter.label,
            "configured": configured,
            "requires_key": adapter.requires_key,
            "state": "ready" if provider == "offline" and configured else s.state(configured),
            "default_model": (default_model_for(provider).id if default_model_for(provider) else None),
            "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
            "last_failure_at": s.last_failure_at.isoformat() if s.last_failure_at else None,
            "last_checked_at": s.last_checked_at.isoformat() if s.last_checked_at else None,
            "last_error_kind": s.last_error_kind,
            "last_error": s.last_error,
            "cooldown_seconds": round(cooldown, 1),
        }

    def providers_report(self) -> List[Dict]:
        return [self.provider_status(name) for name in ADAPTER_CLASSES]

    def models_report(self) -> List[Dict]:
        return [
            {
                "id": m.id,
                "name": m.name,
                "provider": m.provider,
                "description": m.description,
                "context_window": m.context_window,
                "available": self.is_configured(m.provider),
            }
            for m in all_models()
        ]


llm_service = LLMService()
