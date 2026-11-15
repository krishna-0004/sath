"""Middleware to extract or generate X-Request-Id and propagate to response and logs."""

import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


def is_valid_uuid(val: str) -> bool:
    """Validate whether an incoming string is a well-formed UUID."""
    try:
        uuid.UUID(val)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Ensure every request has a validated or newly minted UUID request ID."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        incoming_id = request.headers.get("x-request-id")
        req_id = incoming_id if incoming_id and is_valid_uuid(incoming_id) else str(uuid.uuid4())

        request.state.request_id = req_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=req_id)

        response = await call_next(request)
        response.headers["X-Request-Id"] = req_id
        return response
