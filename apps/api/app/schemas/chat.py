from typing import List, Optional
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
    conversation_id: Optional[str] = None
    language: str = Field(default="en") # Supports 'en', 'hi', 'es', 'de', 'fr', 'ja', etc.
    model: Optional[str] = Field(default="gemini-2.5-flash") # Multi-LLM support: gemini-2.5-flash, gpt-4o, claude-3-5-sonnet, ollama-industrial, forgewise-expert
    provider: Optional[str] = None # 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'mock'
    machine_id: Optional[str] = None
    document_scope: Optional[List[str]] = None
    workspace_id: Optional[str] = None
    image_data: Optional[str] = None # Optional base64 or URL data for attached schematic or photo

class ChatResponse(BaseModel):
    answer: str
    language: str
    conversation_id: str
    request_id: str
    grounded: bool
    confidence_status: str # "supported" | "insufficient_evidence" | "needs_review"
    citations: List[CitationSchema]
    model_used: str = "gemini-2.5-flash"
    latency_ms: int = 0
    workspace_id: Optional[str] = None

class MessageHistoryItem(BaseModel):
    id: str
    sender: str
    content: str
    groundedness_status: str
    citations: List[CitationSchema] = []
    created_at: str

class ConversationDetail(BaseModel):
    id: str
    title: str
    machine_id: Optional[str] = None
    language: str
    messages: List[MessageHistoryItem] = []
    created_at: str
