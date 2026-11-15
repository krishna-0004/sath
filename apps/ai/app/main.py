"""Main application factory and entry point for Saath AI."""

import traceback
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.errors import AppError, build_error_envelope
from app.core.logging import get_logger, setup_logging
from app.core.rate_limit import limiter
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers.extraction import router as extraction_router
from app.routers.health import router as health_router

STATUS_TO_CODE: dict[int, str] = {
    400: "BAD_REQUEST",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "UNPROCESSABLE_ENTITY",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
    502: "UPSTREAM_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Application lifespan context for startup and shutdown initialization."""
    settings = get_settings()
    setup_logging(settings.LOG_LEVEL)
    logger = get_logger()
    logger.info("ai_service_started", environment=settings.ENVIRONMENT)
    yield
    logger.info("ai_service_stopped")


def create_app() -> FastAPI:
    """Create and configure FastAPI application instance."""
    settings = get_settings()
    is_production = settings.ENVIRONMENT.lower() == "production"

    openapi_url = None if is_production else "/openapi.json"
    docs_url = None if is_production else "/docs"
    redoc_url = None if is_production else "/redoc"

    application = FastAPI(
        title="Saath AI Service",
        version="0.1.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )

    application.state.limiter = limiter

    application.add_middleware(SlowAPIMiddleware)
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(RequestIdMiddleware)

    application.include_router(health_router)
    application.include_router(extraction_router)

    @application.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        envelope = build_error_envelope(
            code=exc.code,
            message=exc.message,
            request_id=request_id,
            details=exc.details,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=envelope,
            headers={"X-Request-Id": request_id},
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        details = [
            {
                "path": ".".join(str(loc) for loc in err["loc"] if loc != "body"),
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        envelope = build_error_envelope(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            request_id=request_id,
            details=details,
        )
        return JSONResponse(
            status_code=400,
            content=envelope,
            headers={"X-Request-Id": request_id},
        )

    @application.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        code = STATUS_TO_CODE.get(exc.status_code, "HTTP_ERROR")
        envelope = build_error_envelope(
            code=code,
            message=str(exc.detail),
            request_id=request_id,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=envelope,
            headers={"X-Request-Id": request_id},
        )

    @application.exception_handler(RateLimitExceeded)
    async def slowapi_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        envelope = build_error_envelope(
            code="RATE_LIMITED",
            message="Too many requests. Please slow down.",
            request_id=request_id,
            details=[{"path": "request", "message": str(exc.detail)}],
        )
        return JSONResponse(
            status_code=429,
            content=envelope,
            headers={"X-Request-Id": request_id},
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        logger = get_logger()
        logger.error(
            "unhandled_server_exception",
            request_id=request_id,
            error_type=type(exc).__name__,
            error_message=str(exc),
            traceback=traceback.format_exc(),
        )
        envelope = build_error_envelope(
            code="INTERNAL_ERROR",
            message="An unexpected server error occurred",
            request_id=request_id,
        )
        return JSONResponse(
            status_code=500,
            content=envelope,
            headers={"X-Request-Id": request_id},
        )

    return application


app = create_app()
