"""Tests for exception handling and error envelope conformance."""

from fastapi import Request
from fastapi.testclient import TestClient

from app.core.errors import ForbiddenError, ValidationError
from app.core.rate_limit import limiter
from app.main import create_app


def test_404_envelope(client: TestClient) -> None:
    """Verify unknown route returns 404 with error envelope."""
    response = client.get("/nope")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "requestId" in data["error"]
    assert "X-Request-Id" in response.headers


def test_custom_app_error_handled() -> None:
    """Verify custom AppError subclasses return configured status and code."""
    app = create_app()

    @app.get("/test-app-error")
    def trigger_app_error() -> None:
        raise ForbiddenError("Forbidden resource access")

    with TestClient(app) as test_client:
        response = test_client.get("/test-app-error")
        assert response.status_code == 403
        data = response.json()
        assert data["error"]["code"] == "FORBIDDEN"
        assert data["error"]["message"] == "Forbidden resource access"


def test_unhandled_exception_returns_500() -> None:
    """Verify unhandled exceptions return 500 without leaking stack traces."""
    app = create_app()

    @app.get("/trigger-crash")
    def trigger_crash() -> None:
        msg = "Sensitive database connection string leaked!"
        raise RuntimeError(msg)

    with TestClient(app, raise_server_exceptions=False) as test_client:
        response = test_client.get("/trigger-crash")
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "INTERNAL_ERROR"
        assert "Sensitive" not in data["error"]["message"]
        assert "traceback" not in data["error"]


def test_validation_error_format() -> None:
    """Verify validation errors match AGENTS.md envelope structure."""
    app = create_app()

    @app.get("/test-validation")
    def trigger_validation() -> None:
        raise ValidationError(
            "Invalid query parameters",
            details=[{"path": "limit", "message": "Must be positive"}],
        )

    with TestClient(app) as test_client:
        response = test_client.get("/test-validation")
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert data["error"]["details"] == [{"path": "limit", "message": "Must be positive"}]


def test_rate_limit_exceeded_handler() -> None:
    """Verify rate limit exceeded returns 429 envelope."""
    app = create_app()

    @app.get("/rate-limited")
    @limiter.limit("1/minute")
    def limited_endpoint(request: Request) -> dict[str, str]:
        return {"status": "ok"}

    with TestClient(app) as test_client:
        res1 = test_client.get("/rate-limited")
        assert res1.status_code == 200
        res2 = test_client.get("/rate-limited")
        assert res2.status_code == 429
        data = res2.json()
        assert data["error"]["code"] == "RATE_LIMITED"
        assert "requestId" in data["error"]
