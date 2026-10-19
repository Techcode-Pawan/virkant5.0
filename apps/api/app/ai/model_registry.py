from app.core.config import settings
from app.ai.provider_interfaces import LLMProvider, EmbeddingProvider, VisionProvider
from app.ai.providers.mock_provider import MockAIProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.ai.providers.gemini_provider import GeminiProvider

_mock_instance = MockAIProvider()

def get_llm_provider() -> LLMProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "openai" and settings.LLM_API_KEY:
        return OpenAIProvider()
    if provider == "gemini" and settings.LLM_API_KEY:
        return GeminiProvider()
    return _mock_instance

def get_embedding_provider() -> EmbeddingProvider:
    provider = settings.EMBEDDING_PROVIDER.lower()
    if provider == "openai" and settings.EMBEDDING_API_KEY:
        return OpenAIProvider()
    if provider == "gemini" and settings.EMBEDDING_API_KEY:
        return GeminiProvider()
    return _mock_instance

def get_vision_provider() -> VisionProvider:
    provider = settings.VISION_PROVIDER.lower()
    if provider == "openai" and settings.VISION_API_KEY:
        return OpenAIProvider()
    if provider == "gemini" and settings.VISION_API_KEY:
        return GeminiProvider()
    return _mock_instance
