"""Typed application settings, read once from the environment / backend/.env."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── app ──
    app_env: Literal["development", "test", "production"] = "development"
    api_cors_origins: str = "http://localhost:3000"
    jwt_secret: SecretStr = SecretStr("")
    access_token_minutes: int = Field(30, ge=1)
    refresh_token_days: int = Field(14, ge=1)
    admin_email: str = ""
    admin_password: SecretStr = SecretStr("")
    rate_limits: bool = True  # per-client request limits (see app/core/rate_limit.py)
    trust_proxy_headers: bool = False  # true behind a host's proxy, to rate-limit by the real client IP

    # ── database ──
    mongodb_uri: SecretStr = SecretStr("")
    mongodb_db: str = "ai_library"
    storage_budget_mb: int = Field(200, ge=1)

    # ── LLM provider keys (missing keys simply drop that provider from the fallback chain) ──
    groq_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    cerebras_api_key: SecretStr | None = None
    mistral_api_key: SecretStr | None = None
    github_models_token: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None

    # ── model ids (LiteLLM "provider/model") ──
    llm_groq_fast: str = "groq/llama-3.1-8b-instant"
    llm_groq_smart: str = "groq/openai/gpt-oss-120b"
    llm_cerebras: str = "cerebras/gpt-oss-120b"
    llm_gemini: str = "gemini/gemini-2.5-flash"
    llm_gemini_lite: str = "gemini/gemini-2.5-flash-lite"
    llm_mistral: str = "mistral/mistral-small-latest"
    llm_github: str = "github/gpt-4o-mini"
    llm_openrouter: str = "openrouter/meta-llama/llama-3.3-70b-instruct:free"

    # ── AI behaviour ──
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    ai_daily_quota_per_user: int = Field(100, ge=0)
    ai_cache_ttl_hours: int = Field(168, ge=1)
    llm_timeout_seconds: int = Field(30, ge=1)

    # ── ingest ──
    gutenberg_mirror: str = "https://gutenberg.pglaf.org"
    http_user_agent: str = "StoryShelfLibrary/1.0"

    @field_validator(
        "groq_api_key",
        "gemini_api_key",
        "cerebras_api_key",
        "mistral_api_key",
        "github_models_token",
        "openrouter_api_key",
        mode="before",
    )
    @classmethod
    def _blank_key_is_missing(cls, value: object) -> object:
        # `GROQ_API_KEY=` left blank in .env means "not configured", not an empty key
        return None if isinstance(value, str) and not value.strip() else value

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
