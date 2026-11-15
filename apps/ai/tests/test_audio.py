"""Tests for audio transcription endpoint."""

import base64

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import VALID_TEST_TOKEN


@pytest.mark.asyncio
async def test_transcribe_audio_success() -> None:
    """Test successful audio transcription."""
    audio_content = base64.b64encode(b"sample audio bytes").decode("utf-8")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/internal/audio/transcribe",
            headers={"X-AI-Secret": VALID_TEST_TOKEN},
            json={
                "base64_audio": audio_content,
                "mime_type": "audio/webm",
                "language_hint": "en",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert data["language"] == "en"


@pytest.mark.asyncio
async def test_transcribe_audio_empty_payload() -> None:
    """Test rejection of empty base64 payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/internal/audio/transcribe",
            headers={"X-AI-Secret": VALID_TEST_TOKEN},
            json={
                "base64_audio": base64.b64encode(b"").decode("utf-8"),
                "mime_type": "audio/webm",
            },
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_transcribe_audio_unauthenticated() -> None:
    """Test rejection without internal auth secret."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/internal/audio/transcribe",
            json={
                "base64_audio": "dGVzdA==",
                "mime_type": "audio/webm",
            },
        )

    assert response.status_code == 401
