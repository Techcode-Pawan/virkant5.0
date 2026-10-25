"""Model selection, retry, fallback and status reporting — with fake adapters, no network."""
import httpx
import pytest

from app.ai.llm.catalog import resolve_model
from app.ai.llm.errors import ProviderError, from_response
from app.ai.llm.retry import backoff_delay
from app.ai.llm.service import LLMService, trim_history
from app.ai.llm.types import ChatTurn, LLMRequest
from app.core.exceptions import LLMUnavailableError


class ScriptedAdapter:
    """Replaces adapter.generate with a scripted sequence of results/errors."""

    def __init__(self, adapter, script):
        self.adapter, self.script, self.calls = adapter, list(script), 0
        adapter.generate = self.generate

    async def generate(self, request, model, timeout):
        self.calls += 1
        step = self.script.pop(0) if self.script else self.script_default
        if isinstance(step, Exception):
            raise step
        return step

    script_default = "ok"


def make_service(*providers):
    svc = LLMService()
    keys = {"gemini": "gemini_api_key", "openai": "openai_api_key", "anthropic": "anthropic_api_key"}
    svc.set_overrides({keys[p]: f"fake-{p}-key" for p in providers if p in keys})
    return svc


def request(chunks=None):
    return LLMRequest(system="sys", messages=[ChatTurn("user", "question")], context_chunks=chunks or [])


async def test_primary_success_no_fallback():
    svc = make_service("gemini", "openai")
    gem = ScriptedAdapter(svc.adapter("gemini"), ["gemini answer"])
    result = await svc.generate(request())
    assert result.text == "gemini answer"
    assert result.model_id == "gemini-2.5-flash"
    assert result.fallback_used is False and gem.calls == 1
    assert svc.provider_status("gemini")["state"] == "ready"


async def test_retries_transient_error_then_succeeds():
    svc = make_service("gemini")
    gem = ScriptedAdapter(svc.adapter("gemini"), [ProviderError("rate_limit", "429"), "recovered"])
    result = await svc.generate(request())
    assert result.text == "recovered"
    assert gem.calls == 2
    assert result.attempts[-1].retries == 1


async def test_falls_back_when_primary_keeps_failing():
    svc = make_service("gemini", "openai")
    gem = ScriptedAdapter(svc.adapter("gemini"), [ProviderError("unavailable", "503")] * 5)
    oai = ScriptedAdapter(svc.adapter("openai"), ["openai answer"])
    result = await svc.generate(request())
    assert result.provider == "openai" and result.text == "openai answer"
    assert result.fallback_used is True
    assert gem.calls == 3  # 1 + LLM_MAX_RETRIES(2): bounded, not infinite
    assert oai.calls == 1
    assert svc.provider_status("gemini")["state"] == "unavailable"  # in cooldown


async def test_auth_error_is_not_retried():
    svc = make_service("gemini", "openai")
    gem = ScriptedAdapter(svc.adapter("gemini"), [ProviderError("auth", "401")])
    ScriptedAdapter(svc.adapter("openai"), ["fine"])
    result = await svc.generate(request())
    assert gem.calls == 1 and result.provider == "openai"
    assert svc.provider_status("gemini")["state"] == "error"


async def test_cooldown_skips_failing_provider_on_next_request():
    svc = make_service("gemini", "openai")
    gem = ScriptedAdapter(svc.adapter("gemini"), [ProviderError("unavailable", "503")] * 3)
    ScriptedAdapter(svc.adapter("openai"), ["a", "b"])
    await svc.generate(request())
    calls_before = gem.calls
    second = await svc.generate(request())
    assert gem.calls == calls_before  # skipped: no extra API usage while it is down
    assert second.attempts[0].error_kind == "cooldown"


async def test_preferred_model_respected_and_unconfigured_skipped():
    svc = make_service("openai")
    ScriptedAdapter(svc.adapter("openai"), ["from openai"])
    result = await svc.generate(request(), preferred_model="claude-sonnet-5-5")
    assert result.provider == "openai"
    assert result.attempts[0].error_kind == "not_configured"


async def test_offline_fallback_quotes_chunks_when_all_fail():
    svc = make_service("gemini")
    ScriptedAdapter(svc.adapter("gemini"), [ProviderError("auth", "401")])
    chunk = {"document_title": "Pump SOP", "page_number": 3, "content": "Torque gland bolts to 48 Nm."}
    result = await svc.generate(request([chunk]))
    assert result.degraded is True and result.model_id == "offline-extractive"
    assert "48 Nm" in result.text and "Pump SOP, p. 3" in result.text


async def test_all_fail_without_chunks_raises_unavailable():
    svc = make_service("gemini")
    ScriptedAdapter(svc.adapter("gemini"), [ProviderError("auth", "401")])
    with pytest.raises(LLMUnavailableError) as exc:
        await svc.generate(request())
    attempts = exc.value.detail["details"]["attempts"]
    assert [a["provider"] for a in attempts] == ["gemini", "offline"]


def test_status_is_honest_without_keys():
    svc = LLMService()
    states = {p["id"]: p for p in svc.providers_report()}
    assert states["gemini"]["configured"] is False and states["gemini"]["state"] == "not_configured"
    assert states["ollama"]["configured"] is False


def test_legacy_and_custom_model_resolution():
    assert resolve_model("forgewise-expert").id == "offline-extractive"
    assert resolve_model("claude-3-5-sonnet").provider == "anthropic"
    assert resolve_model("gemini-2.0-flash").provider == "gemini"
    assert resolve_model("ollama/qwen2.5:7b").model == "qwen2.5:7b"
    assert resolve_model("totally-unknown") is None


def test_error_classification():
    def resp(code, body=None, headers=None):
        return httpx.Response(code, json=body or {"error": {"message": "x"}}, headers=headers or {})
    assert from_response("P", resp(429, headers={"retry-after": "3"})).retry_after == 3
    assert from_response("P", resp(429, {"error": {"message": "You exceeded your current quota"}})).retryable is False
    assert from_response("P", resp(503)).retryable is True
    assert from_response("P", resp(401)).kind == "auth"
    assert from_response("P", resp(404)).kind == "model_not_found"


def test_backoff_is_bounded():
    assert all(0 <= backoff_delay(n, 0.5, 4.0) <= 4.0 for n in range(10))


def test_history_trimmed_to_context_budget():
    turns = [ChatTurn("user", "x" * 1000) for _ in range(20)] + [ChatTurn("user", "latest")]
    trimmed = trim_history(turns, budget_tokens=1000)
    assert trimmed[-1].content == "latest"
    assert len(trimmed) < len(turns)
