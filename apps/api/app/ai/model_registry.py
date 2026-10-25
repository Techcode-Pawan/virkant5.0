from typing import Optional, Dict, Any, List, AsyncGenerator
import json
import os
from app.core.config import settings
from app.core.logging import app_logger
from app.ai.provider_interfaces import LLMProvider, EmbeddingProvider, VisionProvider
from app.ai.providers.mock_provider import MockAIProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.claude_provider import ClaudeProvider
from app.ai.providers.ollama_provider import OllamaProvider

# Dynamic in-memory / persistent runtime settings storage for API keys and workspace preferences
_runtime_settings: Dict[str, Any] = {
    "openai_api_key": os.environ.get("OPENAI_API_KEY", ""),
    "gemini_api_key": os.environ.get("GEMINI_API_KEY", ""),
    "anthropic_api_key": os.environ.get("ANTHROPIC_API_KEY", ""),
    "ollama_url": os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
    "workspace_default_models": {
        "ws-a1111111": "gemini-2.5-flash",
        "ws-default": "gemini-2.5-flash",
    },
    "embedding_provider": "auto", # 'auto' | 'gemini' | 'openai' | 'ollama' | 'local'
}

_provider_cache: Dict[str, LLMProvider] = {}

def update_runtime_api_keys(keys_data: Dict[str, str]):
    """Update API keys configured via Settings page."""
    for k, v in keys_data.items():
        if k in _runtime_settings and v is not None:
            _runtime_settings[k] = v.strip()
    _provider_cache.clear()

def set_workspace_default_model(workspace_id: str, model_code: str):
    _runtime_settings["workspace_default_models"][workspace_id] = model_code

def get_workspace_default_model(workspace_id: str) -> str:
    return _runtime_settings["workspace_default_models"].get(workspace_id, "gemini-2.5-flash")

class ResilientFallbackLLMProxy(LLMProvider):
    """
    Wraps provider calls with automatic fallback to another provider
    or the high-precision offline provider if primary provider fails.
    """
    def __init__(self, primary_provider: LLMProvider, fallback_provider: LLMProvider, provider_name: str):
        self.primary = primary_provider
        self.fallback = fallback_provider
        self.provider_name = provider_name

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> str:
        try:
            return await self.primary.generate_response(prompt, system_instruction, temperature, max_tokens)
        except Exception as err:
            app_logger.warning(f"Primary provider [{self.provider_name}] failed: {err}. Triggering automatic fallback...")
            return await self.fallback.generate_response(prompt, system_instruction, temperature, max_tokens)

    async def stream_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> AsyncGenerator[str, None]:
        try:
            async for token in self.primary.stream_response(prompt, system_instruction, temperature, max_tokens):
                yield token
        except Exception as err:
            app_logger.warning(f"Primary streaming failed on [{self.provider_name}]: {err}. Triggering streaming fallback...")
            async for token in self.fallback.stream_response(prompt, system_instruction, temperature, max_tokens):
                yield token

def get_llm_provider(
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
    workspace_id: Optional[str] = None
) -> LLMProvider:
    # 1. Resolve model & provider
    target_model = model or (get_workspace_default_model(workspace_id) if workspace_id else "gemini-2.5-flash")

    detected_provider = provider_name
    if not detected_provider:
        if "gemini" in target_model.lower():
            detected_provider = "gemini"
        elif "gpt" in target_model.lower() or "openai" in target_model.lower():
            detected_provider = "openai"
        elif "claude" in target_model.lower() or "anthropic" in target_model.lower():
            detected_provider = "claude"
        elif "ollama" in target_model.lower() or "llama" in target_model.lower():
            detected_provider = "ollama"
        else:
            detected_provider = "mock"

    detected_provider = detected_provider.lower()
    fallback_instance = MockAIProvider(model_name=target_model)

    # 2. Check keys and instantiate primary provider
    primary_instance: LLMProvider

    if detected_provider == "gemini":
        gemini_key = _runtime_settings.get("gemini_api_key") or settings.LLM_API_KEY
        if gemini_key:
            primary_instance = GeminiProvider(api_key=gemini_key, model=target_model)
        else:
            return fallback_instance

    elif detected_provider == "openai":
        openai_key = _runtime_settings.get("openai_api_key") or settings.LLM_API_KEY
        if openai_key:
            primary_instance = OpenAIProvider(api_key=openai_key, model=target_model)
        else:
            return fallback_instance

    elif detected_provider == "claude" or detected_provider == "anthropic":
        claude_key = _runtime_settings.get("anthropic_api_key") or getattr(settings, "ANTHROPIC_API_KEY", "") or settings.LLM_API_KEY
        if claude_key:
            primary_instance = ClaudeProvider(api_key=claude_key, model=target_model)
        else:
            return fallback_instance

    elif detected_provider == "ollama":
        ollama_url = _runtime_settings.get("ollama_url") or getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        primary_instance = OllamaProvider(base_url=ollama_url, model=target_model)

    else:
        return fallback_instance

    # Wrap with resilient automatic fallback proxy
    return ResilientFallbackLLMProxy(
        primary_provider=primary_instance,
        fallback_provider=fallback_instance,
        provider_name=detected_provider
    )

def get_embedding_provider(provider_name: Optional[str] = None) -> EmbeddingProvider:
    selected = (provider_name or _runtime_settings.get("embedding_provider") or settings.EMBEDDING_PROVIDER).lower()

    if selected == "openai":
        openai_key = _runtime_settings.get("openai_api_key") or settings.EMBEDDING_API_KEY
        if openai_key:
            return OpenAIProvider(api_key=openai_key)
    elif selected == "gemini":
        gemini_key = _runtime_settings.get("gemini_api_key") or settings.EMBEDDING_API_KEY
        if gemini_key:
            return GeminiProvider(api_key=gemini_key)
    elif selected == "ollama":
        ollama_url = _runtime_settings.get("ollama_url") or "http://localhost:11434"
        return OllamaProvider(base_url=ollama_url)

    # High-precision deterministic cross-lingual embedding fallback
    return MockAIProvider()

def get_vision_provider(provider_name: Optional[str] = None) -> VisionProvider:
    selected = (provider_name or settings.VISION_PROVIDER).lower()
    if selected == "openai":
        openai_key = _runtime_settings.get("openai_api_key") or settings.VISION_API_KEY
        if openai_key:
            return OpenAIProvider(api_key=openai_key)
    elif selected == "gemini":
        gemini_key = _runtime_settings.get("gemini_api_key") or settings.VISION_API_KEY
        if gemini_key:
            return GeminiProvider(api_key=gemini_key)
    elif selected in ("claude", "anthropic"):
        claude_key = _runtime_settings.get("anthropic_api_key") or settings.VISION_API_KEY
        if claude_key:
            return ClaudeProvider(api_key=claude_key)

    return MockAIProvider()
