"""Tests for health check endpoints and request tracing."""

import uuid

from fastapi.testclient import TestClient


def test_health_check_returns_200(client: TestClient) -> None:
    """Verify /health returns 200 and standard health payload."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "saath-ai"
    assert "X-Request-Id" in response.headers


def test_request_id_echoes_valid_uuid(client: TestClient) -> None:
    """Verify incoming valid UUID is echoed in response header."""
    custom_id = str(uuid.uuid4())
    response = client.get("/health", headers={"X-Request-Id": custom_id})
    assert response.headers["X-Request-Id"] == custom_id


def test_request_id_generates_new_on_invalid(client: TestClient) -> None:
    """Verify an invalid UUID is replaced with a valid generated UUID."""
    response = client.get("/health", headers={"X-Request-Id": "invalid-uuid-string"})
    returned_id = response.headers["X-Request-Id"]
    assert returned_id != "invalid-uuid-string"
    uuid.UUID(returned_id)  # Will raise ValueError if invalid


def test_security_headers_present(client: TestClient) -> None:
    """Verify security headers are applied to responses."""
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert "no-store" in response.headers.get("Cache-Control", "")
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "no-referrer"
