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
    message: str = Field(..., min_length=2, max_length=2000)
    conversation_id: Optional[str] = None
    language: str = Field(default="en", pattern="^(en|hi)$")
    machine_id: Optional[str] = None
    document_scope: Optional[List[str]] = None

class ChatResponse(BaseModel):
    answer: str
    language: str
    conversation_id: str
    request_id: str
    grounded: bool
    confidence_status: str # "supported" | "insufficient_evidence" | "needs_review"
    citations: List[CitationSchema]

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
