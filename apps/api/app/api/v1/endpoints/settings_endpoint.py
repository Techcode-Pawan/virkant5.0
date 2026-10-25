from typing import Optional, Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends, status
from app.core.security import get_current_user, AuthenticatedUser
from app.ai.model_registry import (
    _runtime_settings,
    update_runtime_api_keys,
    set_workspace_default_model,
    get_workspace_default_model
)

router = APIRouter(prefix="/settings", tags=["System & AI Settings"])

class KeysUpdatePayload(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ollama_url: Optional[str] = None
    embedding_provider: Optional[str] = None

class WorkspaceDefaultModelPayload(BaseModel):
    workspace_id: str
    model_code: str

def mask_key(k: str) -> str:
    if not k or len(k) < 8:
        return ""
    return f"{k[:4]}...{k[-4:]}"

@router.get("")
async def get_system_settings(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    ws_id = current_user.workspace_id or "ws-a1111111"
    return {
        "active_workspace": ws_id,
        "default_model": get_workspace_default_model(ws_id),
        "keys_configured": {
            "openai": bool(_runtime_settings.get("openai_api_key")),
            "openai_masked": mask_key(_runtime_settings.get("openai_api_key", "")),
            "gemini": bool(_runtime_settings.get("gemini_api_key")),
            "gemini_masked": mask_key(_runtime_settings.get("gemini_api_key", "")),
            "anthropic": bool(_runtime_settings.get("anthropic_api_key")),
            "anthropic_masked": mask_key(_runtime_settings.get("anthropic_api_key", "")),
            "ollama_url": _runtime_settings.get("ollama_url", "http://localhost:11434"),
        },
        "embedding_provider": _runtime_settings.get("embedding_provider", "auto"),
        "supported_models": [
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "provider": "Google DeepMind"},
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
            {"id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "provider": "Anthropic"},
            {"id": "ollama-industrial", "name": "Ollama Llama-3", "provider": "Local Edge"},
            {"id": "forgewise-expert", "name": "ForgeWise Core", "provider": "Deterministic Precision"},
        ]
    }

@router.post("/keys", status_code=status.HTTP_200_OK)
async def update_api_keys(
    payload: KeysUpdatePayload,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    update_data = {}
    if payload.openai_api_key is not None:
        update_data["openai_api_key"] = payload.openai_api_key
    if payload.gemini_api_key is not None:
        update_data["gemini_api_key"] = payload.gemini_api_key
    if payload.anthropic_api_key is not None:
        update_data["anthropic_api_key"] = payload.anthropic_api_key
    if payload.ollama_url is not None:
        update_data["ollama_url"] = payload.ollama_url
    if payload.embedding_provider is not None:
        update_data["embedding_provider"] = payload.embedding_provider

    update_runtime_api_keys(update_data)
    return {"status": "updated", "message": "API keys updated successfully"}

@router.post("/workspace-default", status_code=status.HTTP_200_OK)
async def update_workspace_default(
    payload: WorkspaceDefaultModelPayload,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    set_workspace_default_model(payload.workspace_id, payload.model_code)
    return {
        "status": "updated",
        "workspace_id": payload.workspace_id,
        "default_model": payload.model_code
    }
