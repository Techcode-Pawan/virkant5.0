from app.ai.llm.adapters.anthropic import AnthropicAdapter
from app.ai.llm.adapters.base import ProviderAdapter, ProviderConfig
from app.ai.llm.adapters.gemini import GeminiAdapter
from app.ai.llm.adapters.offline import OfflineExtractiveAdapter
from app.ai.llm.adapters.ollama import OllamaAdapter
from app.ai.llm.adapters.openai import OpenAIAdapter

# Order defines the automatic fallback preference among configured providers.
ADAPTER_CLASSES = {
    "gemini": GeminiAdapter,
    "openai": OpenAIAdapter,
    "anthropic": AnthropicAdapter,
    "ollama": OllamaAdapter,
    "offline": OfflineExtractiveAdapter,
}

__all__ = ["ADAPTER_CLASSES", "ProviderAdapter", "ProviderConfig"]
