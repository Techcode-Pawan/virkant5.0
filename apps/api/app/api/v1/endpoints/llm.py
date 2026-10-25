from fastapi import APIRouter, Depends

from app.ai.llm.adapters import ADAPTER_CLASSES
from app.ai.llm.service import llm_service
from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.core.security import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/llm", tags=["AI Providers & Models"])


@router.get("/providers")
async def list_providers(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Honest provider status. `configured` only means a key/URL is present;
    `state` becomes `ready` only after a real successful call or health check.
    """
    default = llm_service.default_model()
    return {
        "providers": llm_service.providers_report(),
        "primary_model": default.id,
        "fallback_chain": [m.id for m in llm_service.build_chain(None)],
        "offline_fallback": settings.LLM_OFFLINE_FALLBACK,
    }


@router.get("/models")
async def list_models(current_user: AuthenticatedUser = Depends(get_current_user)):
    return {"models": llm_service.models_report(), "default_model": llm_service.default_model().id}


@router.post("/providers/{provider}/check")
async def check_provider(provider: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Runs a lightweight authenticated request (e.g. list models) against one provider."""
    if provider not in ADAPTER_CLASSES:
        raise NotFoundError(f"Unknown provider '{provider}'.")
    return await llm_service.check_provider(provider)
