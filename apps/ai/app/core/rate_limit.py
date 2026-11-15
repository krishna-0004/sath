"""Rate limiting configuration and exception handlers using slowapi."""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.errors import build_error_envelope

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Handle rate limit violations with the standard error envelope."""
    request_id = getattr(request.state, "request_id", "unknown")
    envelope = build_error_envelope(
        code="RATE_LIMITED",
        message="Too many requests. Please slow down.",
        request_id=request_id,
        details=[{"path": "request", "message": str(exc.detail)}],
    )
    headers = {"X-Request-Id": request_id}
    return JSONResponse(status_code=429, content=envelope, headers=headers)
