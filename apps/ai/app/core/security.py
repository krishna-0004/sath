"""Security dependencies and authentication checks."""

import hmac

from fastapi import Header

from app.core.config import get_settings
from app.core.errors import UnauthenticatedError


def require_ai_secret(
    x_ai_secret: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> str:
    """Validate X-AI-Secret header or Bearer service token using timing-safe comparison."""
    token: str | None = None
    if x_ai_secret:
        token = x_ai_secret.strip()
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise UnauthenticatedError("Missing or invalid authorization header")

    expected_token = get_settings().AI_SERVICE_TOKEN
    if not hmac.compare_digest(token.encode("utf-8"), expected_token.encode("utf-8")):
        raise UnauthenticatedError("Invalid service token")

    return token


# Aliases for backward compatibility
require_service_token = require_ai_secret
require_internal_auth = require_ai_secret
