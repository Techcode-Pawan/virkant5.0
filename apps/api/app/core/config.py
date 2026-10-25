import secrets
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APPLICATION_ENV: str = "development"  # "development" | "production" | "test"
    APP_NAME: str = "ForgeWise AI"
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # --- MongoDB (primary persistence) ---
    MONGODB_URI: str = ""
    MONGODB_DB_NAME: str = "vikrant5"
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = 5000
    MONGODB_CONNECT_TIMEOUT_MS: int = 5000
    MONGODB_MAX_POOL_SIZE: int = 50
    # When true the API refuses to start if MongoDB cannot be reached at boot.
    # When false it starts in a degraded state, reports it on /health and
    # returns 503 for database-backed endpoints until MongoDB is reachable.
    MONGODB_REQUIRED_ON_STARTUP: bool = False

    # --- Auth ---
    JWT_SECRET: str = ""
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    # Lets the sign-in form pick a role (demo convenience). Disable in production.
    ALLOW_ROLE_SELF_SELECT: bool = True
    DEFAULT_ORGANIZATION_ID: str = "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b"
    DEFAULT_ORGANIZATION_NAME: str = "Vikrant Heavy Forge Industries"

    # --- LLM providers (all optional; configure the ones you use) ---
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    # Any OpenAI-compatible endpoint (OpenAI, Groq, OpenRouter, LM Studio, vLLM...)
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-haiku-5-5"
    OLLAMA_BASE_URL: str = ""
    OLLAMA_MODEL: str = "llama3.1:8b"
    # Legacy single-key variable from earlier versions; used as the key for
    # LLM_PROVIDER when that provider has no dedicated key set.
    LLM_PROVIDER: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = ""

    # Model selection & fallback. Values are model ids from /api/v1/llm/models.
    LLM_PRIMARY_MODEL: str = ""
    LLM_FALLBACK_MODELS: str = ""
    # Final safety net: quote retrieved document excerpts verbatim when no
    # language model is reachable. Never invents content.
    LLM_OFFLINE_FALLBACK: bool = True

    LLM_REQUEST_TIMEOUT_SECONDS: float = 45.0
    LLM_TOTAL_TIMEOUT_SECONDS: float = 90.0
    LLM_MAX_RETRIES: int = 2
    LLM_RETRY_BASE_DELAY_SECONDS: float = 0.75
    LLM_RETRY_MAX_DELAY_SECONDS: float = 8.0
    LLM_PROVIDER_COOLDOWN_SECONDS: float = 30.0
    AI_MAX_OUTPUT_TOKENS: int = 2048
    CHAT_HISTORY_TURNS: int = 12

    # Embeddings: "auto" | "gemini" | "openai" | "ollama" | "local"
    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = ""
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # Vision (schematic image description during ingestion): "none" | "gemini" | "openai" | "anthropic"
    VISION_PROVIDER: str = "none"

    # --- Security / HTTP ---
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    MAX_UPLOAD_SIZE_BYTES: int = 52428800  # 50 MB
    STORAGE_DIR: str = "storage"

    @field_validator("LLM_PROVIDER", "EMBEDDING_PROVIDER", "VISION_PROVIDER", "APPLICATION_ENV", mode="before")
    @classmethod
    def _lower(cls, v):
        return (v or "").strip().lower()

    @property
    def is_production(self) -> bool:
        return self.APPLICATION_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APPLICATION_ENV in ("development", "test")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def fallback_models_list(self) -> List[str]:
        return [m.strip() for m in self.LLM_FALLBACK_MODELS.split(",") if m.strip()]


class ConfigurationError(RuntimeError):
    pass


def validate_settings(s: "Settings") -> List[str]:
    """
    Validates required configuration. Raises ConfigurationError for fatal
    problems and returns a list of non-fatal warnings to log at startup.
    """
    errors: List[str] = []
    warnings: List[str] = []

    if not s.MONGODB_URI:
        errors.append(
            "MONGODB_URI is not set. Copy apps/api/.env.example to apps/api/.env and set "
            "MONGODB_URI (e.g. mongodb://127.0.0.1:27017 or your MongoDB Atlas SRV string)."
        )
    elif not s.MONGODB_URI.startswith(("mongodb://", "mongodb+srv://")):
        errors.append("MONGODB_URI must start with mongodb:// or mongodb+srv://")

    if not s.MONGODB_DB_NAME:
        errors.append("MONGODB_DB_NAME must not be empty.")

    if not s.JWT_SECRET:
        if s.is_production:
            errors.append("JWT_SECRET is required when APPLICATION_ENV=production.")
        else:
            # Ephemeral secret: sessions are invalidated on restart. Fine for local dev only.
            s.JWT_SECRET = secrets.token_urlsafe(48)
            warnings.append("JWT_SECRET not set; generated an ephemeral development secret (sign-ins reset on restart).")
    elif len(s.JWT_SECRET) < 32:
        warnings.append("JWT_SECRET is shorter than 32 characters; use a longer random value.")

    if s.is_production and s.ALLOW_ROLE_SELF_SELECT:
        warnings.append("ALLOW_ROLE_SELF_SELECT=true in production lets users choose their own role.")

    if errors:
        raise ConfigurationError(" | ".join(errors))
    return warnings


settings = Settings()
