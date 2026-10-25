from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


@dataclass
class ChatTurn:
    role: str  # "user" | "assistant"
    content: str


@dataclass
class LLMRequest:
    system: str
    messages: List[ChatTurn]
    temperature: float = 0.2
    max_tokens: int = 1500
    # Retrieved document excerpts for this turn. Only the offline extractive
    # adapter reads these directly; LLM adapters see them inside the prompt.
    context_chunks: List[Dict[str, Any]] = field(default_factory=list)
    language: str = "en"


@dataclass(frozen=True)
class ModelInfo:
    id: str            # stable id used by the API / UI
    provider: str      # adapter name
    model: str         # model name sent to the provider
    name: str
    context_window: int = 128_000
    description: str = ""


@dataclass
class Attempt:
    model_id: str
    provider: str
    ok: bool
    error_kind: Optional[str] = None
    message: Optional[str] = None
    latency_ms: int = 0
    retries: int = 0
    skipped: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LLMResult:
    text: str
    model_id: str
    provider: str
    attempts: List[Attempt]
    fallback_used: bool
    latency_ms: int
    degraded: bool = False  # True when the offline extractive mode produced the answer
