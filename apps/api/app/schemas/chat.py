from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class CitationSchema(BaseModel):
    citation_id: str
    document_id: str
    document_title: str
    page_number: int
    section_title: Optional[str] = None
    excerpt: str
    relevance_score: float = 1.0


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: Optional[str] = Field(default=None, max_length=64)
    language: str = Field(default="en")  # 'en', 'hi', 'es', 'de', 'fr', 'ja'
    # Model id from GET /api/v1/llm/models. None = workspace default / configured primary.
    model: Optional[str] = None
    provider: Optional[str] = None  # optional: 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'offline'
    # "grounded": answers only from uploaded documents (default, original behaviour)
    # "general": general assistant that still cites documents when they match
    mode: Literal["grounded", "general"] = "grounded"
    allow_fallback: bool = True
    voice: bool = False  # concise, speakable answers for the voice assistant
    machine_id: Optional[str] = None
    document_scope: Optional[List[str]] = None
    workspace_id: Optional[str] = None  # informational; the token's workspace is authoritative
    image_data: Optional[str] = Field(default=None, max_length=12_000_000)  # data URL of an attached photo


class ChatResponse(BaseModel):
    answer: str
    language: str
    conversation_id: str
    request_id: str
    grounded: bool
    confidence_status: str  # "supported" | "insufficient_evidence" | "general"
    citations: List[CitationSchema]
    model_used: str
    provider: Optional[str] = None
    fallback_used: bool = False
    degraded: bool = False
    attempts: List[Dict[str, Any]] = []
    latency_ms: int = 0
    workspace_id: Optional[str] = None
    message_id: Optional[str] = None
    user_message_id: Optional[str] = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    machine_id: Optional[str] = None
    language: str = "en"
    mode: str = "grounded"
    message_count: int = 0
    last_model: Optional[str] = None
    created_at: str
    updated_at: str


class MessageHistoryItem(BaseModel):
    id: str
    sender: str
    content: str
    groundedness_status: Optional[str] = None
    citations: List[CitationSchema] = []
    model_used: Optional[str] = None
    provider: Optional[str] = None
    fallback_used: bool = False
    latency_ms: Optional[int] = None
    feedback: Optional[int] = None
    created_at: str


class ConversationDetail(ConversationSummary):
    messages: List[MessageHistoryItem] = []
