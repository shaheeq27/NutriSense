import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_cors_origins_includes_nextjs_dev_ports():
    s = Settings(ENV="development")
    assert "http://localhost:3000" in s.CORS_ORIGINS
    assert "http://localhost:3001" in s.CORS_ORIGINS
    assert "http://127.0.0.1:3000" in s.CORS_ORIGINS
    assert "http://127.0.0.1:3001" in s.CORS_ORIGINS


def test_production_rejects_default_jwt_secret():
    with pytest.raises(ValidationError, match="JWT_SECRET must be explicitly set to a secure secret in production"):
        Settings(ENV="production", JWT_SECRET="change-me-in-production")

    with pytest.raises(ValidationError, match="JWT_SECRET must be explicitly set to a secure secret in production"):
        Settings(ENV="production", JWT_SECRET="")


def test_production_accepts_secure_jwt_secret():
    s = Settings(ENV="production", JWT_SECRET="super-strong-production-secret-1234567890")
    assert s.JWT_SECRET == "super-strong-production-secret-1234567890"


def test_seed_on_startup_defaults(monkeypatch):
    monkeypatch.delenv("SEED_ON_STARTUP", raising=False)

    # In development, defaults to True
    s_dev = Settings(ENV="development")
    assert s_dev.SEED_ON_STARTUP is True

    # In production, defaults to False
    s_prod = Settings(ENV="production", JWT_SECRET="valid-prod-secret-key-1234567890123456")
    assert s_prod.SEED_ON_STARTUP is False

    # In production, can be explicitly enabled if needed
    s_prod_custom = Settings(
        ENV="production",
        JWT_SECRET="valid-prod-secret-key-1234567890123456",
        SEED_ON_STARTUP=True,
    )
    assert s_prod_custom.SEED_ON_STARTUP is True
