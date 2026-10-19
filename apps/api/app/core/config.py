import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APPLICATION_ENV: str = "development"
    APP_NAME: str = "ForgeWise AI"
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/forgewise_db"
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    # Supabase / Auth
    SUPABASE_URL: str = "https://placeholder-project.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"
    SUPABASE_JWT_SECRET: str = "development-mock-secret-key-for-local-tokens"
    STORAGE_BUCKET: str = "industrial-documents-private"

    # AI Configuration
    LLM_PROVIDER: str = "mock" # "mock", "openai", "gemini", "ollama"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    AI_REQUEST_TIMEOUT: int = 30
    AI_MAX_OUTPUT_TOKENS: int = 2048

    EMBEDDING_PROVIDER: str = "mock"
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    VISION_PROVIDER: str = "mock"
    VISION_API_KEY: str = ""
    VISION_MODEL: str = "gpt-4o-mini"
    OCR_PROVIDER: str = "tesseract"

    # Security
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    MAX_UPLOAD_SIZE_BYTES: int = 52428800 # 50 MB

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
