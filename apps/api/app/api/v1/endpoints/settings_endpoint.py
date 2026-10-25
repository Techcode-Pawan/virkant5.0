from typing import Literal, Optional

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from app.ai.llm.catalog import resolve_model
from app.ai.llm.service import llm_service
from app.core.config import settings
from app.core.exceptions import AuthorizationError, InvalidInputError, NotFoundError
from app.core.security import AuthenticatedUser, get_current_user, has_role
from app.db.mongo import USER_SETTINGS, WORKSPACES, get_db, utcnow
from app.services.audit_service import record_audit

router = APIRouter(prefix="/settings", tags=["System & AI Settings"])

KEY_FIELDS = {"gemini": "gemini_api_key", "openai": "openai_api_key", "anthropic": "anthropic_api_key"}


class KeysUpdatePayload(BaseModel):
    openai_api_key: Optional[str] = Field(default=None, max_length=300)
    gemini_api_key: Optional[str] = Field(default=None, max_length=300)
    anthropic_api_key: Optional[str] = Field(default=None, max_length=300)
    ollama_url: Optional[str] = Field(default=None, max_length=300)


class WorkspaceDefaultModelPayload(BaseModel):
    workspace_id: Optional[str] = None
    model_code: Optional[str] = None  # None/"" resets to the server default


class PreferencesPayload(BaseModel):
    preferred_language: Optional[Literal["en", "hi", "es", "de", "fr", "ja"]] = None
    theme: Optional[Literal["dark", "light", "high-contrast"]] = None
    chat_mode: Optional[Literal["grounded", "general"]] = None


def _key_source(provider: str) -> str:
    field = KEY_FIELDS[provider]
    if llm_service._overrides.get(field):
        return "runtime"
    return "env" if llm_service.api_key(provider) else "none"


@router.get("")
async def get_system_settings(current_user: AuthenticatedUser = Depends(get_current_user)):
    db = get_db()
    ws = await db[WORKSPACES].find_one({"_id": current_user.workspace_id}, {"default_model": 1})
    prefs = await db[USER_SETTINGS].find_one({"_id": current_user.user_id}) or {}
    return {
        "active_workspace": current_user.workspace_id,
        "default_model": (ws or {}).get("default_model") or llm_service.default_model().id,
        "workspace_default_model": (ws or {}).get("default_model"),
        "server_default_model": llm_service.default_model().id,
        # Never echo keys back, not even partially.
        "keys_configured": {
            p: {"configured": llm_service.is_configured(p), "source": _key_source(p)} for p in KEY_FIELDS
        },
        "ollama": {
            "configured": llm_service.is_configured("ollama"),
            "base_url": llm_service.provider_config("ollama").base_url or None,
        },
        "can_edit_keys": settings.is_development or has_role(current_user, "org_admin"),
        "preferences": {k: prefs.get(k) for k in ("preferred_language", "theme", "chat_mode")},
        "supported_models": llm_service.models_report(),
    }


@router.post("/keys", status_code=status.HTTP_200_OK)
async def update_api_keys(payload: KeysUpdatePayload, request: Request, current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Runtime-only override (memory, lost on restart). Use apps/api/.env for durable configuration.
    Restricted to org admins outside development.
    """
    if not (settings.is_development or has_role(current_user, "org_admin")):
        raise AuthorizationError("Only organization admins can change provider keys.")
    if payload.ollama_url and not payload.ollama_url.startswith(("http://", "https://")):
        raise InvalidInputError("Ollama URL must start with http:// or https://")
    llm_service.set_overrides(payload.model_dump(exclude_none=True))
    await record_audit(current_user, "PROVIDER_KEYS_UPDATED", "settings", ",".join(payload.model_dump(exclude_none=True)), request)
    return {"status": "updated", "message": "Provider configuration updated for this server process."}


@router.post("/workspace-default", status_code=status.HTTP_200_OK)
async def update_workspace_default(payload: WorkspaceDefaultModelPayload, current_user: AuthenticatedUser = Depends(get_current_user)):
    workspace_id = payload.workspace_id or current_user.workspace_id
    model = (payload.model_code or "").strip() or None
    if model and resolve_model(model) is None:
        raise InvalidInputError(f"Unknown model '{model}'.")
    db = get_db()
    ws = await db[WORKSPACES].find_one({"_id": workspace_id})
    if ws is None or ws["user_id"] != current_user.user_id:
        raise NotFoundError("Workspace not found.")
    await db[WORKSPACES].update_one({"_id": workspace_id}, {"$set": {"default_model": model, "updated_at": utcnow()}})
    return {"status": "updated", "workspace_id": workspace_id, "default_model": model or llm_service.default_model().id}


@router.put("/preferences")
async def update_preferences(payload: PreferencesPayload, current_user: AuthenticatedUser = Depends(get_current_user)):
    values = payload.model_dump(exclude_none=True)
    await get_db()[USER_SETTINGS].update_one(
        {"_id": current_user.user_id}, {"$set": {**values, "updated_at": utcnow()}}, upsert=True
    )
    return {"status": "updated", "preferences": values}
