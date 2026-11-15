"""Health and internal liveness/readiness routes."""

from fastapi import APIRouter, Depends

from app.core.security import require_service_token
from app.schemas.common import HealthResponse, PingResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Unauthenticated liveness probe endpoint."""
    return HealthResponse(status="ok", service="saath-ai", version="0.1.0")


@router.get("/internal/ping", response_model=PingResponse)
async def internal_ping(_: str = Depends(require_service_token)) -> PingResponse:
    """Authenticated internal ping endpoint verifying service-to-service communication."""
    return PingResponse(status="ok", authenticated=True)
