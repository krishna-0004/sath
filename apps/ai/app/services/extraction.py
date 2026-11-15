"""Extraction service for prescriptions and lab reports using Gemini structured output."""

import base64
from typing import Any

import httpx
from google import genai
from google.genai import types

from app.core.config import get_settings
from app.core.errors import AppError, ServiceUnavailableError, UpstreamError, ValidationError
from app.schemas.extraction import (
    ExtractionRequest,
    LabReportExtractionResponse,
    PrescriptionExtractionResponse,
)

PRESCRIPTION_SYSTEM_INSTRUCTION = """You are a medical transcription engine for Saath.
Transcribe and extract structured fields verbatim from the document.
CRITICAL RULES (NON-NEGOTIABLE):
1. NEVER diagnose any disease, illness, condition, or health status.
2. NEVER provide medical advice, dosing advice, or clinical recommendations.
3. NEVER express clinical opinions, evaluations, or judgments (e.g. good, bad, improved).
4. Transcribe exactly and only what the prescription document explicitly says.
5. If doctor notes or instructions are present, transcribe them verbatim and
append: 'Ask the doctor about this.'
Map common meal timing to anchors: breakfast, lunch, dinner, bedtime."""

LAB_REPORT_SYSTEM_INSTRUCTION = """You are a laboratory transcription engine for Saath.
Transcribe biomarkers, metrics, reference ranges, and numerical values verbatim.
CRITICAL RULES (NON-NEGOTIABLE):
1. NEVER diagnose any disease, illness, condition, or health status.
2. NEVER provide medical advice or evaluate clinical risk.
3. NEVER express clinical opinions, evaluations, or judgments.
4. Transcribe exactly and only what the lab report explicitly states. Compare metric
value to reference range strictly deterministically: flag as normal, low, high, or unknown.
5. If lab impressions or summary notes are present, transcribe them verbatim and
append: 'Ask the doctor about this.'"""


class ExtractionService:
    """Orchestrates document extraction with Gemini API."""

    def __init__(self, api_key: str | None = None) -> None:
        if api_key == "":
            self.api_key = None
        else:
            self.api_key = api_key if api_key is not None else get_settings().GEMINI_API_KEY
        self._client: genai.Client | None = None
        if self.api_key:
            self._client = genai.Client(api_key=self.api_key)

    async def _resolve_content_part(
        self,
        request: ExtractionRequest,
    ) -> types.Part:
        """Resolve image bytes from base64Data or imageUrl into a Gemini Part."""
        if request.base64_data:
            mime = request.mime_type or "image/jpeg"
            data_bytes = base64.b64decode(request.base64_data)
            return types.Part.from_bytes(data=data_bytes, mime_type=mime)

        if request.image_url:
            async with httpx.AsyncClient(timeout=20.0) as http_client:
                resp = await http_client.get(request.image_url)
                if resp.status_code != 200:
                    raise ValidationError(f"Failed to fetch image from URL: {resp.status_code}")
                content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                return types.Part.from_bytes(data=resp.content, mime_type=content_type)

        raise ValidationError("Either imageUrl or base64Data must be provided")

    async def extract_prescription(
        self,
        request: ExtractionRequest,
    ) -> PrescriptionExtractionResponse:
        """Extract structured medicine details and verbatim doctor notes from prescription."""
        if not self._client:
            raise ServiceUnavailableError(
                "Gemini extraction service is not configured with an API key"
            )

        content_part = await self._resolve_content_part(request)

        try:
            response = self._client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    content_part,
                    "Transcribe all prescribed medicines and doctor notes verbatim.",
                ],
                config=types.GenerateContentConfig(
                    system_instruction=PRESCRIPTION_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=PrescriptionExtractionResponse,
                ),
            )

            parsed: Any = response.parsed
            if isinstance(parsed, PrescriptionExtractionResponse):
                return parsed
            if response.text:
                return PrescriptionExtractionResponse.model_validate_json(response.text)
            return PrescriptionExtractionResponse()
        except AppError:
            raise
        except Exception as exc:
            raise UpstreamError(f"Prescription extraction failed: {str(exc)}") from exc

    async def extract_lab_report(
        self,
        request: ExtractionRequest,
    ) -> LabReportExtractionResponse:
        """Extract structured metrics, units, reference ranges, and flags from lab report."""
        if not self._client:
            raise ServiceUnavailableError(
                "Gemini extraction service is not configured with an API key"
            )

        content_part = await self._resolve_content_part(request)

        try:
            response = self._client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    content_part,
                    (
                        "Transcribe all lab test biomarkers, numerical values, "
                        "units, reference ranges verbatim."
                    ),
                ],
                config=types.GenerateContentConfig(
                    system_instruction=LAB_REPORT_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=LabReportExtractionResponse,
                ),
            )

            parsed: Any = response.parsed
            if isinstance(parsed, LabReportExtractionResponse):
                return parsed
            if response.text:
                return LabReportExtractionResponse.model_validate_json(response.text)
            return LabReportExtractionResponse()
        except AppError:
            raise
        except Exception as exc:
            raise UpstreamError(f"Lab report extraction failed: {str(exc)}") from exc


extraction_service = ExtractionService()
