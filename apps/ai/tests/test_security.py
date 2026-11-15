"""Tests for internal token authentication and environment hardening."""

import os

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from tests.conftest import VALID_TEST_TOKEN


def test_internal_ping_missing_token(client: TestClient) -> None:
    """Verify /internal/ping fails without token with 401 envelope."""
    response = client.get("/internal/ping")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHENTICATED"
    assert "requestId" in data["error"]


def test_internal_ping_invalid_token(client: TestClient) -> None:
    """Verify /internal/ping fails with invalid token."""
    response = client.get("/internal/ping", headers={"Authorization": "Bearer wrong-token"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHENTICATED"


def test_internal_ping_valid_token(client: TestClient) -> None:
    """Verify /internal/ping succeeds with valid token."""
    response = client.get(
        "/internal/ping",
        headers={"Authorization": f"Bearer {VALID_TEST_TOKEN}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["authenticated"] is True


def test_docs_disabled_in_production() -> None:
    """Verify /docs, /redoc, and /openapi.json are disabled in production."""
    os.environ["ENVIRONMENT"] = "production"
    get_settings.cache_clear()
    prod_app = create_app()
    with TestClient(prod_app) as prod_client:
        docs_res = prod_client.get("/docs")
        assert docs_res.status_code == 404
        redoc_res = prod_client.get("/redoc")
        assert redoc_res.status_code == 404
        openapi_res = prod_client.get("/openapi.json")
        assert openapi_res.status_code == 404
    os.environ["ENVIRONMENT"] = "development"
    get_settings.cache_clear()
