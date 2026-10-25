from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx

from app.ai.http_client import get_http_client
from app.ai.llm.errors import ProviderError, from_exception, from_response
from app.ai.llm.types import ChatTurn, LLMRequest


@dataclass
class ProviderConfig:
    api_key: str = ""
    base_url: str = ""
    default_model: str = ""


class ProviderAdapter(ABC):
    """One adapter per provider. Adapters only translate requests/responses."""

    name: str = ""
    label: str = ""
    requires_key: bool = True

    def __init__(self, config: ProviderConfig):
        self.config = config

    def is_configured(self) -> bool:
        return bool(self.config.api_key) if self.requires_key else bool(self.config.base_url)

    @abstractmethod
    async def generate(self, request: LLMRequest, model: str, timeout: float) -> str:
        ...

    @abstractmethod
    async def health_check(self, timeout: float = 10.0) -> None:
        """Cheap request that verifies credentials/reachability. Raises ProviderError."""

    async def _request(
        self,
        method: str,
        url: str,
        *,
        headers: Optional[Dict[str, str]] = None,
        json: Optional[Dict[str, Any]] = None,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
        client = get_http_client()
        try:
            response = await client.request(method, url, headers=headers, json=json, timeout=timeout)
        except Exception as exc:  # network / timeout
            raise from_exception(self.label, exc)
        if response.status_code >= 400:
            raise from_response(self.label, response)
        try:
            return response.json()
        except ValueError:
            raise ProviderError("invalid_response", f"{self.label} returned a non-JSON response.", retryable=False)


def normalize_turns(messages: List[ChatTurn]) -> List[ChatTurn]:
    """Merges consecutive same-role turns and guarantees the list starts with a user turn."""
    merged: List[ChatTurn] = []
    for turn in messages:
        if not turn.content.strip():
            continue
        role = "assistant" if turn.role == "assistant" else "user"
        if merged and merged[-1].role == role:
            merged[-1] = ChatTurn(role=role, content=f"{merged[-1].content}\n\n{turn.content}")
        else:
            merged.append(ChatTurn(role=role, content=turn.content))
    while merged and merged[0].role != "user":
        merged.pop(0)
    return merged


def require_text(provider: str, text: Optional[str]) -> str:
    if not text or not text.strip():
        raise ProviderError("invalid_response", f"{provider} returned an empty answer.", retryable=False)
    return text.strip()
