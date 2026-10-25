from typing import List

from fastapi import APIRouter, Depends, Request

from app.core.rate_limit import rate_limit_check
from app.core.security import AuthenticatedUser, get_current_user
from app.schemas.chat import ChatRequest, ChatResponse, ConversationDetail, ConversationSummary
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Multimodal Chat & RAG"])
chat_service = ChatService()


@router.post("", response_model=ChatResponse)
async def submit_chat_query(
    request: Request,
    chat_payload: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    await rate_limit_check(request, max_requests=60, window_seconds=60, key_prefix=f"chat:{current_user.user_id}")
    # Errors propagate to the global handlers: 503 when the database or every
    # AI provider is unavailable, 4xx for invalid input. No fake answers.
    return await chat_service.process_chat(request=chat_payload, current_user=current_user)


@router.get("/history", response_model=List[ConversationSummary])
async def get_chat_history(limit: int = 50, current_user: AuthenticatedUser = Depends(get_current_user)):
    return await chat_service.list_conversations(current_user, limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    return await chat_service.get_conversation(current_user, conversation_id)


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    await chat_service.delete_conversation(current_user, conversation_id)
    return {"status": "deleted", "conversation_id": conversation_id}
