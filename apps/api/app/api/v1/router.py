from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.machines import router as machines_router
from app.api.v1.endpoints.analytics import analytics_router, feedback_router, admin_router
from app.api.v1.endpoints.settings_endpoint import router as settings_router

api_v1_router = APIRouter(prefix="/api/v1")

@api_v1_router.get("/health", tags=["Health"])
async def v1_health_check():
    return {
        "status": "healthy",
        "service": "ForgeWise AI Backend",
        "version": "1.0.0",
        "database": "connected",
        "default_workspace": "ws-a1111111",
        "providers": ["gemini", "openai", "claude", "ollama", "local"],
        "storage": "operational"
    }

api_v1_router.include_router(auth_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(machines_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(feedback_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(settings_router)
