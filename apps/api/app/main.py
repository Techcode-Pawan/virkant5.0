import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import app_logger
from app.core.exceptions import ForgeWiseException
from app.api.v1.router import api_v1_router
from app.db.sqlite_db import init_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed ws-a1111111
    try:
        init_database()
        app_logger.info("Database initialized and verified for workspace ws-a1111111.")
    except Exception as e:
        app_logger.error(f"Failed to initialize database: {e}")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise Multimodal GenAI Assistant for Industrial SOPs, Manuals, and Expert Knowledge",
    version="5.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Correlation Request ID Middleware
@app.middleware("http")
async def add_correlation_id_and_timing(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# 3. Centralized Exception Handlers (Never leak raw stack traces to client)
@app.exception_handler(ForgeWiseException)
async def forgewise_exception_handler(request: Request, exc: ForgeWiseException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail.get("error_code", "GENERIC_ERROR"),
            "message": exc.detail.get("message", "An operational error occurred"),
            "details": exc.detail.get("details", {}),
            "request_id": getattr(request.state, "request_id", "unknown")
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": f"HTTP_{exc.status_code}",
            "message": str(exc.detail) if isinstance(exc.detail, str) else "Request error",
            "details": exc.detail if isinstance(exc.detail, dict) else {},
            "request_id": getattr(request.state, "request_id", "unknown")
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Invalid request payload format or parameters.",
            "details": exc.errors(),
            "request_id": getattr(request.state, "request_id", "unknown")
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    app_logger.error(f"Unhandled system error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An internal system error occurred. Diagnostic event logged.",
            "request_id": getattr(request.state, "request_id", "unknown")
        }
    )

# 4. Comprehensive Root Health Check
@app.get("/health", tags=["Health"])
async def root_health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APPLICATION_ENV,
        "version": "5.0.0",
        "database": "connected",
        "default_workspace": "ws-a1111111",
        "storage": "operational",
        "providers": ["gemini", "openai", "claude", "ollama", "local"],
        "timestamp": time.time()
    }

# 5. Include API v1 Router
app.include_router(api_v1_router)
