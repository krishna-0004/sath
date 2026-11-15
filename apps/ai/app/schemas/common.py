"""Common Pydantic schemas for Saath AI service."""

from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    """Validation or error detail item."""

    path: str
    message: str


class ErrorBody(BaseModel):
    """Inner error payload compliant with AGENTS.md error contract."""

    model_config = ConfigDict(populate_by_name=True)

    code: str
    message: str
    details: list[dict[str, str]] | None = None
    request_id: str = Field(alias="requestId", serialization_alias="requestId")


class ErrorEnvelope(BaseModel):
    """Standard top-level error response envelope."""

    error: ErrorBody


class HealthResponse(BaseModel):
    """Liveness probe response model."""

    status: str = Field(default="ok")
    service: str = Field(default="saath-ai")
    version: str = Field(default="0.1.0")


class PingResponse(BaseModel):
    """Internal authenticated ping response model."""

    status: str = Field(default="ok")
    authenticated: bool = Field(default=True)
