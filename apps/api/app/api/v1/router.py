import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.ai.llm.service import llm_service
from app.api.v1.endpoints.analytics import admin_router, analytics_router, feedback_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.llm import router as llm_router
from app.api.v1.endpoints.machines import router as machines_router
from app.api.v1.endpoints.settings_endpoint import router as settings_router
from app.core.config import settings
from app.db.mongo import mongo

APP_VERSION = "5.1.0"

api_v1_router = APIRouter(prefix="/api/v1")


async def health_payload() -> dict:
    database = await mongo.status()
    providers = llm_service.providers_report()
    return {
        "status": "healthy" if database["status"] == "connected" else "degraded",
        "app": settings.APP_NAME,
        "environment": settings.APPLICATION_ENV,
        "version": APP_VERSION,
        "database": database,
        "llm": {
            "configured_providers": [p["id"] for p in providers if p["configured"] and p["id"] != "offline"],
            "primary_model": llm_service.default_model().id,
            "offline_fallback": settings.LLM_OFFLINE_FALLBACK,
        },
        "timestamp": time.time(),
    }


@api_v1_router.get("/health", tags=["Health"])
async def v1_health_check():
    """Always 200 (liveness). Inspect `status` / `database.status` for readiness."""
    return await health_payload()


@api_v1_router.get("/health/ready", tags=["Health"])
async def v1_readiness_check():
    payload = await health_payload()
    return JSONResponse(payload, status_code=200 if payload["status"] == "healthy" else 503)


api_v1_router.include_router(auth_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(machines_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(feedback_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(settings_router)
api_v1_router.include_router(llm_router)
