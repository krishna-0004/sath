"""Error classes and envelope builders for Saath AI service."""


class AppError(Exception):
    """Base application error with a stable machine code and HTTP status code."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: list[dict[str, str]] | None = None,
        is_operational: bool = True,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        self.is_operational = is_operational


class ValidationError(AppError):
    """Validation failure on user or client input."""

    def __init__(
        self,
        message: str = "Invalid request parameters",
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__("VALIDATION_ERROR", message, 400, details)


class UnauthenticatedError(AppError):
    """Missing or invalid authentication credentials."""

    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__("UNAUTHENTICATED", message, 401)


class ForbiddenError(AppError):
    """Authenticated entity does not have permission."""

    def __init__(self, message: str = "Access forbidden") -> None:
        super().__init__("FORBIDDEN", message, 403)


class NotFoundError(AppError):
    """Requested resource could not be found."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__("NOT_FOUND", message, 404)


class ConflictError(AppError):
    """Operation causes conflict with current state."""

    def __init__(self, message: str = "Resource conflict") -> None:
        super().__init__("CONFLICT", message, 409)


class PayloadTooLargeError(AppError):
    """Payload exceeds accepted limit."""

    def __init__(self, message: str = "Payload exceeds maximum allowed size") -> None:
        super().__init__("PAYLOAD_TOO_LARGE", message, 413)


class UnsupportedMediaTypeError(AppError):
    """Media type of request is not supported."""

    def __init__(self, message: str = "Unsupported media type") -> None:
        super().__init__("UNSUPPORTED_MEDIA_TYPE", message, 415)


class RateLimitedError(AppError):
    """Too many requests made to rate-limited resource."""

    def __init__(self, message: str = "Too many requests. Please try again later.") -> None:
        super().__init__("RATE_LIMITED", message, 429)


class UpstreamError(AppError):
    """External upstream dependency failed."""

    def __init__(self, message: str = "Upstream service error") -> None:
        super().__init__("UPSTREAM_ERROR", message, 502)


class ServiceUnavailableError(AppError):
    """Service temporarily unable to handle requests."""

    def __init__(self, message: str = "Service temporarily unavailable") -> None:
        super().__init__("SERVICE_UNAVAILABLE", message, 503)


class InternalError(AppError):
    """Unexpected internal server error."""

    def __init__(self, message: str = "An unexpected error occurred") -> None:
        super().__init__("INTERNAL_ERROR", message, 500, is_operational=False)


def build_error_envelope(
    code: str,
    message: str,
    request_id: str,
    details: list[dict[str, str]] | None = None,
) -> dict[str, object]:
    """Construct an error response envelope conforming to AGENTS.md contract."""
    body: dict[str, object] = {
        "code": code,
        "message": message,
        "requestId": request_id,
    }
    if details:
        body["details"] = details
    return {"error": body}
