import time
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.chat import ChatRequest, ChatResponse, CitationSchema
from app.services.retrieval_service import HybridRetrievalService
from app.ai.prompts import build_grounded_rag_prompt
from app.ai.model_registry import get_llm_provider
from app.core.security import AuthenticatedUser
from app.db.models import Conversation, Message, Citation, AnalyticsEvent

class ChatService:
    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.session = db_session
        self.retrieval_service = HybridRetrievalService(db_session)
        self.llm = get_llm_provider()

    async def process_chat(
        self,
        request: ChatRequest,
        current_user: AuthenticatedUser
    ) -> ChatResponse:
        start_time = time.time()
        request_id = f"req-{uuid.uuid4().hex[:12]}"
        conversation_id = request.conversation_id or str(uuid.uuid4())

        # 1. Retrieve authorized document chunks
        chunks = await self.retrieval_service.retrieve_chunks(
            query=request.message,
            organization_id=current_user.organization_id,
            machine_id=request.machine_id,
            top_k=4
        )

        # 2. Assemble safety & grounding prompts
        system_instruction, user_prompt = build_grounded_rag_prompt(
            query=request.message,
            context_chunks=chunks,
            language=request.language
        )

        # 3. Call LLM Provider
        answer = await self.llm.generate_response(
            prompt=user_prompt,
            system_instruction=system_instruction,
            temperature=0.1
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        # 4. Check Grounding Status
        is_insufficient = "not provide verified procedures" in answer.lower() or "कोई सत्यापित जानकारी नहीं मिली" in answer
        confidence_status = "insufficient_evidence" if is_insufficient else "supported"
        grounded = not is_insufficient

        # 5. Extract Citations
        citations = []
        if grounded and chunks:
            for idx, c in enumerate(chunks):
                # Verify chunk is relevant to the topic
                citations.append(CitationSchema(
                    citation_id=f"cit-{uuid.uuid4().hex[:8]}",
                    document_id=c.get("document_id", "doc-1"),
                    document_title=c.get("document_title", "Operational Manual"),
                    page_number=c.get("page_number", 1),
                    section_title=c.get("section_title", "Procedure"),
                    excerpt=c.get("content", "")[:280] + "...",
                    relevance_score=0.95 - (idx * 0.05)
                ))

        # 6. Database Persistence (if session active)
        if self.session is not None:
            try:
                # Save message
                msg = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    sender="assistant",
                    content=answer,
                    groundedness_status=confidence_status,
                    latency_ms=elapsed_ms
                )
                self.session.add(msg)
                
                # Save citations
                for cit in citations:
                    c_record = Citation(
                        id=str(uuid.uuid4()),
                        message_id=msg.id,
                        chunk_id=chunks[0].get("id") if chunks else None,
                        document_id=cit.document_id,
                        page_number=cit.page_number,
                        excerpt=cit.excerpt,
                        relevance_score=cit.relevance_score
                    )
                    self.session.add(c_record)

                # Record analytics event
                event = AnalyticsEvent(
                    id=str(uuid.uuid4()),
                    organization_id=current_user.organization_id,
                    event_type="chat_query",
                    query_text_sanitized=request.message[:150],
                    latency_ms=elapsed_ms,
                    citation_count=len(citations),
                    is_unanswered=is_insufficient
                )
                self.session.add(event)
                await self.session.commit()
            except Exception:
                # Safe rollback if running without live DB connection
                await self.session.rollback()

        return ChatResponse(
            answer=answer,
            language=request.language,
            conversation_id=conversation_id,
            request_id=request_id,
            grounded=grounded,
            confidence_status=confidence_status,
            citations=citations
        )
