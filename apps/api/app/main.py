import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.ai.http_client import close_http_client
from app.api.v1.router import APP_VERSION, api_v1_router, health_payload
from app.core.config import ConfigurationError, settings, validate_settings
from app.core.exceptions import ForgeWiseException
from app.core.logging import app_logger
from app.db.mongo import CONNECTIVITY_ERRORS, mongo, redact_uri
from app.services.workspace_service import seed_defaults


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Validate configuration (fails fast with an actionable message).
    try:
        for warning in validate_settings(settings):
            app_logger.warning(warning)
    except ConfigurationError as exc:
        app_logger.error(f"Configuration error: {exc}")
        raise

    # 2. Connect to MongoDB once; the client and its pool are shared by all requests.
    connected = await mongo.connect(
        settings.MONGODB_URI,
        settings.MONGODB_DB_NAME,
        server_selection_timeout_ms=settings.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        connect_timeout_ms=settings.MONGODB_CONNECT_TIMEOUT_MS,
        max_pool_size=settings.MONGODB_MAX_POOL_SIZE,
    )
    if connected:
        app_logger.info(f"Connected to MongoDB {redact_uri(settings.MONGODB_URI)} / db={settings.MONGODB_DB_NAME}")
        try:
            await seed_defaults()
        except PyMongoError as exc:
            app_logger.error(f"Seeding default data failed: {exc.__class__.__name__}")
    else:
        message = f"MongoDB unavailable at startup: {mongo.last_error}"
        if settings.MONGODB_REQUIRED_ON_STARTUP:
            app_logger.error(message)
            await mongo.close()
            raise RuntimeError(message)
        app_logger.error(message + " — starting in degraded mode; database endpoints return 503 until it is reachable.")

    yield

    # 3. Graceful shutdown.
    await close_http_client()
    await mongo.close()
    app_logger.info("Shutdown complete: MongoDB and HTTP clients closed.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Multimodal GenAI assistant for industrial SOPs, manuals and expert knowledge",
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)


@app.middleware("http")
async def add_correlation_id_and_timing(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id[:64]
    start_time = time.time()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Process-Time"] = f"{time.time() - start_time:.4f}"
    return response


def _rid(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


# Centralized exception handlers — never leak stack traces or credentials to clients.
@app.exception_handler(ForgeWiseException)
async def forgewise_exception_handler(request: Request, exc: ForgeWiseException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail.get("error_code", "GENERIC_ERROR"),
            "message": exc.detail.get("message", "An operational error occurred"),
            "details": exc.detail.get("details", {}),
            "request_id": _rid(request),
        },
    )


@app.exception_handler(PyMongoError)
async def mongo_exception_handler(request: Request, exc: PyMongoError):
    if isinstance(exc, CONNECTIVITY_ERRORS):
        mongo.mark_failure(exc)
        app_logger.error(f"Database unavailable during {request.method} {request.url.path}: {mongo.last_error}")
        return JSONResponse(
            status_code=503,
            content={
                "error": "DATABASE_UNAVAILABLE",
                "message": "The database is currently unreachable. Your change was not saved; please retry shortly.",
                "request_id": _rid(request),
            },
        )
    app_logger.error(f"Database error during {request.method} {request.url.path}: {exc.__class__.__name__}")
    return JSONResponse(
        status_code=500,
        content={"error": "DATABASE_ERROR", "message": "A database error occurred. The operation was not completed.",
                 "request_id": _rid(request)},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": f"HTTP_{exc.status_code}",
            "message": str(exc.detail) if isinstance(exc.detail, str) else "Request error",
            "details": exc.detail if isinstance(exc.detail, dict) else {},
            "request_id": _rid(request),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"error": "VALIDATION_ERROR", "message": "Invalid request payload format or parameters.",
                 "details": errors, "request_id": _rid(request)},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    app_logger.error(f"Unhandled system error: {exc.__class__.__name__}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_SERVER_ERROR", "message": "An internal error occurred. Diagnostic event logged.",
                 "request_id": _rid(request)},
    )


@app.get("/health", tags=["Health"])
async def root_health_check():
    return await health_payload()


app.include_router(api_v1_router)
