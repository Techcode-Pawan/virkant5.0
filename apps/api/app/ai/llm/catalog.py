"""Model catalog: which model ids exist and which provider serves them."""
from typing import Dict, List, Optional

from app.ai.llm.types import ModelInfo
from app.core.config import settings

OFFLINE_MODEL = ModelInfo(
    id="offline-extractive",
    provider="offline",
    model="offline-extractive",
    name="Offline extractive",
    context_window=1_000_000,
    description="No LLM. Quotes matching document passages verbatim.",
)

BUILTIN_MODELS: List[ModelInfo] = [
    ModelInfo("gemini-2.5-flash", "gemini", "gemini-2.5-flash", "Gemini 2.5 Flash", 1_048_576, "Fast, multimodal, free tier available"),
    ModelInfo("gemini-2.5-pro", "gemini", "gemini-2.5-pro", "Gemini 2.5 Pro", 1_048_576, "Stronger reasoning, slower"),
    ModelInfo("gpt-4o-mini", "openai", "gpt-4o-mini", "GPT-4o mini", 128_000, "Low cost, fast"),
    ModelInfo("gpt-4o", "openai", "gpt-4o", "GPT-4o", 128_000, "High quality general model"),
    ModelInfo("claude-haiku-5-5", "anthropic", "claude-haiku-5-5", "Claude Haiku 5.5", 200_000, "Fast and economical"),
    ModelInfo("claude-sonnet-5-5", "anthropic", "claude-sonnet-5-5", "Claude Sonnet 5.5", 200_000, "Strong technical reasoning"),
]

# Ids used by earlier releases (stored in browsers / old clients) -> provider whose default model replaces them.
LEGACY_ALIASES: Dict[str, str] = {
    "claude-3-5-sonnet": "anthropic",
    "ollama-industrial": "ollama",
    "forgewise-expert": "offline",
}

PROVIDER_PREFIXES = (
    ("gemini", "gemini"),
    ("gpt", "openai"),
    ("o1", "openai"),
    ("o3", "openai"),
    ("o4", "openai"),
    ("claude", "anthropic"),
)


def provider_default_model_name(provider: str) -> str:
    return {
        "gemini": settings.GEMINI_MODEL,
        "openai": settings.OPENAI_MODEL,
        "anthropic": settings.ANTHROPIC_MODEL,
        "ollama": settings.OLLAMA_MODEL,
        "offline": OFFLINE_MODEL.model,
    }.get(provider, "")


def _model_id(provider: str, model: str) -> str:
    return f"ollama/{model}" if provider == "ollama" else model


def all_models() -> List[ModelInfo]:
    models = list(BUILTIN_MODELS)
    known = {m.id for m in models}
    for provider in ("gemini", "openai", "anthropic"):
        name = provider_default_model_name(provider)
        if name and name not in known:
            models.append(ModelInfo(name, provider, name, name, 128_000, "Configured via environment"))
            known.add(name)
    if settings.OLLAMA_MODEL:
        models.append(
            ModelInfo(
                _model_id("ollama", settings.OLLAMA_MODEL),
                "ollama",
                settings.OLLAMA_MODEL,
                f"Ollama · {settings.OLLAMA_MODEL}",
                8_192,
                "Runs locally, no API key",
            )
        )
    models.append(OFFLINE_MODEL)
    return models


def default_model_for(provider: str) -> Optional[ModelInfo]:
    name = provider_default_model_name(provider)
    target = _model_id(provider, name)
    for m in all_models():
        if m.id == target:
            return m
    return next((m for m in all_models() if m.provider == provider), None)


def resolve_model(model_id: Optional[str]) -> Optional[ModelInfo]:
    """Maps a model id (including legacy aliases and custom provider model names) to ModelInfo."""
    if not model_id:
        return None
    key = model_id.strip()
    if key in LEGACY_ALIASES:
        return default_model_for(LEGACY_ALIASES[key])
    for m in all_models():
        if m.id == key:
            return m
    if key.startswith("ollama/"):
        name = key.split("/", 1)[1]
        return ModelInfo(key, "ollama", name, f"Ollama · {name}", 8_192, "Custom Ollama model")
    lowered = key.lower()
    for prefix, provider in PROVIDER_PREFIXES:
        if lowered.startswith(prefix):
            return ModelInfo(key, provider, key, key, 128_000, "Custom model id")
    return None
