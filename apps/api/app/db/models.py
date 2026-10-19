import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, Float, Boolean,
    ForeignKey, DateTime, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def gen_uuid_str():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    tier = Column(String(50), default="enterprise")
    max_storage_bytes = Column(BigInteger, default=107374182400)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="viewer")
    preferred_language = Column(String(10), default="en")
    theme_preference = Column(String(20), default="light")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Machine(Base):
    __tablename__ = "machines"

    id = Column(String(100), primary_key=True) # e.g. 'PMP-402'
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    manufacturer = Column(String(255))
    model = Column(String(255))
    plant_location = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    machine_id = Column(String(100), ForeignKey("machines.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(500), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_key = Column(String(1000), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    version = Column(String(50), default="1.0")
    status = Column(String(50), default="pending") # pending, processing, ready, failed
    page_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    section_title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="chunks")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    machine_id = Column(String(100), ForeignKey("machines.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(500), nullable=False)
    language = Column(String(10), default="en")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(20), nullable=False) # 'user' | 'assistant' | 'system'
    content = Column(Text, nullable=False)
    groundedness_status = Column(String(50), default="supported")
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")
    citations = relationship("Citation", back_populates="message", cascade="all, delete-orphan")

class Citation(Base):
    __tablename__ = "citations"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(String(36), ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    excerpt = Column(Text, nullable=False)
    relevance_score = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    message = relationship("Message", back_populates="citations")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False) # 1 or -1
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(100), nullable=True)
    target_id = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(100), nullable=False)
    query_text_sanitized = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    citation_count = Column(Integer, default=0)
    is_unanswered = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
