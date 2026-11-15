"""Structured logging configuration using structlog."""

import logging
import sys
from collections.abc import MutableMapping
from typing import cast

import structlog
from structlog.types import EventDict, WrappedLogger

SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "set-cookie",
    "password",
    "passcode",
    "token",
    "ai_service_token",
    "gemini_api_key",
}


def redact_sensitive_data(
    _logger: WrappedLogger, _method_name: str, event_dict: EventDict
) -> EventDict:
    """Recursively redacts sensitive values from structured log events."""
    stack: list[MutableMapping[str, object]] = [event_dict]
    while stack:
        current = stack.pop()
        for key in list(current.keys()):
            lower_key = key.lower()
            if any(secret in lower_key for secret in SENSITIVE_KEYS):
                current[key] = "[REDACTED]"
            elif isinstance(current[key], MutableMapping):
                child = current[key]
                if isinstance(child, MutableMapping):
                    stack.append(child)
    return event_dict


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structlog and standard library logging for structured JSON output."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=numeric_level)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            redact_sensitive_data,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger() -> structlog.stdlib.BoundLogger:
    """Return configured bound structured logger."""
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger())
