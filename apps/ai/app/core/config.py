"""Configuration settings for Saath AI service."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings validated via pydantic-settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = Field(default="development")
    LOG_LEVEL: str = Field(default="info")
    AI_SERVICE_TOKEN: str = Field(default="")
    ALLOWED_ORIGINS: str = Field(default="")
    GEMINI_API_KEY: str | None = Field(default=None)
    GEMINI_MODEL: str = Field(default="gemini-3.8-flash")
    MAX_UPLOAD_BYTES: int = Field(default=4194304)

    @field_validator("AI_SERVICE_TOKEN")
    @classmethod
    def validate_token_length(cls, value: str) -> str:
        """Ensure the inter-service authentication token meets minimum length."""
        if len(value) < 32:
            msg = "AI_SERVICE_TOKEN must be at least 32 characters long for security"
            raise ValueError(msg)
        return value

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return list of allowed origins parsed from comma-separated string."""
        if not self.ALLOWED_ORIGINS:
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Retrieve and cache typed application settings."""
    return Settings()
