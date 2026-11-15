"""Internal routes for prescription and lab report extraction."""

from fastapi import APIRouter, Depends

from app.core.security import require_ai_secret
from app.schemas.extraction import (
    ExtractionRequest,
    LabReportExtractionResponse,
    PrescriptionExtractionResponse,
)
from app.services.extraction import extraction_service

router = APIRouter(prefix="/internal/extract", tags=["extraction"])


@router.post(
    "/prescription",
    response_model=PrescriptionExtractionResponse,
    summary="Extract structured medicines from prescription",
)
async def extract_prescription_endpoint(
    request: ExtractionRequest,
    _token: str = Depends(require_ai_secret),
) -> PrescriptionExtractionResponse:
    """Internal endpoint: transcribe prescription image with verbatim medicines and doctor notes."""
    return await extraction_service.extract_prescription(request)


@router.post(
    "/lab-report",
    response_model=LabReportExtractionResponse,
    summary="Extract biomarkers and reference ranges from lab report",
)
async def extract_lab_report_endpoint(
    request: ExtractionRequest,
    _token: str = Depends(require_ai_secret),
) -> LabReportExtractionResponse:
    """Internal endpoint: transcribe lab report metrics, values, reference ranges, and flags."""
    return await extraction_service.extract_lab_report(request)
