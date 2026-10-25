from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator

class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> str:
        """Generate text completion from LLM."""
        pass

    async def stream_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens chunk by chunk."""
        # Default fallback simulation if provider doesn't natively override
        full_text = await self.generate_response(prompt, system_instruction, temperature, max_tokens)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")

class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for input text batch."""
        pass

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """Generate single vector embedding for search query."""
        pass

class VisionProvider(ABC):
    @abstractmethod
    async def describe_schematic(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: Optional[str] = None
    ) -> str:
        """Analyze an engineering diagram or schematic image."""
        pass
