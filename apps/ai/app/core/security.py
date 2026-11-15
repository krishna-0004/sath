"""Security dependencies and authentication checks."""

import hmac

from fastapi import Header

from app.core.config import get_settings
from app.core.errors import UnauthenticatedError


def require_service_token(authorization: str | None = Header(default=None)) -> str:
    """Validate Bearer service token using timing-safe comparison."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthenticatedError("Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    expected_token = get_settings().AI_SERVICE_TOKEN

    if not hmac.compare_digest(token.encode("utf-8"), expected_token.encode("utf-8")):
        raise UnauthenticatedError("Invalid service token")

    return token
