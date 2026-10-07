from functools import lru_cache
from typing import Any, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "NutriSense API"
    ENV: Literal["development", "test", "production"] = "development"
    DATABASE_URL: str = "sqlite:///./nutrisense.db"
    DATABASE_URL_UNPOOLED: str | None = None
    APP_TIMEZONE: str = "UTC"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:8443",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8443",
    ]
    USDA_API_KEY: str | None = None
    FOOD_PROVIDER: Literal["local", "usda"] = "local"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.5-flash"
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_VISION_MODEL: str = "google/gemma-4-31b-it:free"
    VISION_PROVIDER: Literal["stub", "gemini", "trained_model"] = "stub"
    TRAINED_MODEL_PATH: str = "app/providers/vision/models/best_model.pth"
    VISION_FALLBACK_THRESHOLD: float = 0.80
    LOG_LEVEL: str = "INFO"
    SEED_ON_STARTUP: bool = True
    ENABLE_OPEN_FOOD_FACTS: bool = False

    @model_validator(mode="before")
    @classmethod
    def _adjust_production_defaults(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("ENV") == "production" and "SEED_ON_STARTUP" not in data:
                data["SEED_ON_STARTUP"] = False
        return data

    @model_validator(mode="after")
    def _validate_production(self) -> "Settings":
        if self.ENV == "production":
            if not self.JWT_SECRET or self.JWT_SECRET == "change-me-in-production":
                raise ValueError("JWT_SECRET must be explicitly set to a secure secret in production")
        return self

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str) and not v.strip().startswith("["):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
