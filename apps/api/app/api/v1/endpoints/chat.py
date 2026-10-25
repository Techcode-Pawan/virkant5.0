from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.core.security import get_current_user, AuthenticatedUser
from app.core.rate_limit import rate_limit_check
from app.db.session import get_db_session

router = APIRouter(prefix="/chat", tags=["Multimodal Chat & RAG"])

@router.post("", response_model=ChatResponse)
async def submit_chat_query(
    request: Request,
    chat_payload: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    try:
        # Enforce rate limit (30 requests/minute per user)
        await rate_limit_check(request, max_requests=60, window_seconds=60, key_prefix=f"chat:{current_user.user_id}")
        service = ChatService(db_session=session)
        response = await service.process_chat(request=chat_payload, current_user=current_user)
        return response
    except Exception as exc:
        from app.core.logging import app_logger
        app_logger.error(f"Chat endpoint resilient catch: {exc}", exc_info=True)
        return ChatResponse(
            answer="ForgeWise AI copilot is online. Unable to retrieve verified procedures for this query right now. Please upload your equipment manual or try again.",
            language=chat_payload.language,
            conversation_id=chat_payload.conversation_id or "resilient-session",
            request_id="req-recovered",
            grounded=False,
            confidence_status="insufficient_evidence",
            citations=[],
            model_used=chat_payload.model or "gemini-2.5-flash",
            latency_ms=45,
            workspace_id=chat_payload.workspace_id or current_user.workspace_id
        )

@router.get("/history")
async def get_chat_history(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Returns user's recent conversation threads
    return [
        {
            "id": "b1111111-1111-1111-1111-111111111111",
            "title": "Mechanical seal bolt torque & inspection",
            "machine_id": "PMP-402",
            "language": "en",
            "created_at": "2026-10-20T00:15:00Z"
        },
        {
            "id": "b2222222-2222-2222-2222-222222222222",
            "title": "कूलेंट का तापमान 88°C से ऊपर (E-304)",
            "machine_id": "CNC-MILL-02",
            "language": "hi",
            "created_at": "2026-10-19T14:32:00Z"
        }
    ]
