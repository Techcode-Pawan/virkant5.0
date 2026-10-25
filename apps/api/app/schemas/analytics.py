from typing import List, Optional
from pydantic import BaseModel

class AnalyticsOverview(BaseModel):
    total_queries_last_30d: int
    grounded_percentage: float
    average_retrieval_latency_ms: int
    unanswered_knowledge_gaps_count: int
    documents_indexed_count: int
    active_operators_count: int
    assistant_answers_last_30d: int = 0

class CommonIssueItem(BaseModel):
    machine_id: str
    machine_name: str
    topic: str
    frequency: int
    resolution_status: str

class FeedbackCreate(BaseModel):
    message_id: str
    rating: int # 1 or -1
    remarks: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: str
    status: str = "recorded"
    rating: int

class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    preferred_language: str
    created_at: str

class AuditLogItem(BaseModel):
    id: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str
