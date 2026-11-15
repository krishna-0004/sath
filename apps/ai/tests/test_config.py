"""Tests for settings validation and fail-fast behavior."""

import pytest
from pydantic import ValidationError as PydanticValidationError

from app.core.config import Settings


def test_settings_valid_token() -> None:
    """Verify settings parse correctly with valid token."""
    settings = Settings(
        AI_SERVICE_TOKEN="a" * 32,
        ENVIRONMENT="production",
    )
    assert settings.AI_SERVICE_TOKEN == "a" * 32
    assert settings.ENVIRONMENT == "production"
    assert settings.MAX_UPLOAD_BYTES == 4194304


def test_settings_rejects_short_token() -> None:
    """Verify settings fail fast when AI_SERVICE_TOKEN is less than 32 characters."""
    with pytest.raises(PydanticValidationError) as exc_info:
        Settings(AI_SERVICE_TOKEN="too-short")
    assert "at least 32 characters" in str(exc_info.value)


def test_settings_requires_valid_token() -> None:
    """Verify settings fail if AI_SERVICE_TOKEN default is empty."""
    with pytest.raises(PydanticValidationError) as exc_info:
        Settings(AI_SERVICE_TOKEN="")
    assert "at least 32 characters" in str(exc_info.value)
