"""Unit tests for prescription and lab report extraction endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.extraction import (
    ExtractedMedicine,
    ExtractionRequest,
    LabMetric,
    LabReportExtractionResponse,
    PrescriptionExtractionResponse,
)
from app.services.extraction import (
    LAB_REPORT_SYSTEM_INSTRUCTION,
    PRESCRIPTION_SYSTEM_INSTRUCTION,
    ExtractionService,
)
from tests.conftest import VALID_TEST_TOKEN

client = TestClient(app)


def test_rule_9_system_instructions_enforced() -> None:
    """Verify system instructions strictly enforce Rule 9 constraints."""
    for prompt in [PRESCRIPTION_SYSTEM_INSTRUCTION, LAB_REPORT_SYSTEM_INSTRUCTION]:
        assert "NEVER diagnose" in prompt
        assert "NEVER provide medical advice" in prompt
        assert "Ask the doctor about this" in prompt


def test_extraction_endpoints_require_authentication() -> None:
    """Unauthenticated calls to internal extraction endpoints must return 401."""
    presc_res = client.post("/internal/extract/prescription", json={"base64Data": "abc"})
    assert presc_res.status_code == 401
    assert presc_res.json()["error"]["code"] == "UNAUTHENTICATED"

    lab_res = client.post(
        "/internal/extract/lab-report",
        json={"base64Data": "abc"},
        headers={"X-AI-Secret": "wrong-secret-token-that-is-too-long-1234567890"},
    )
    assert lab_res.status_code == 401


@pytest.mark.asyncio
async def test_extraction_requires_image_or_base64() -> None:
    """Calling extraction without image data raises ValidationError."""
    service = ExtractionService(api_key="test-key")
    with pytest.raises(Exception) as exc_info:
        await service.extract_prescription(ExtractionRequest())
    assert "Either imageUrl or base64Data must be provided" in str(exc_info.value)


def test_extract_prescription_success() -> None:
    """Successful prescription extraction with Gemini structured output."""
    mock_response = PrescriptionExtractionResponse(
        medicines=[
            ExtractedMedicine(
                name="Metformin",
                strengthText="500mg",
                frequencyText="twice daily",
                anchors=["breakfast", "dinner"],
                withFood=True,
                instructions="Take with meals",
            ),
            ExtractedMedicine(
                name="Amlodipine",
                strengthText="5mg",
                frequencyText="once daily",
                anchors=["breakfast"],
                withFood=False,
                instructions="Take in morning",
            ),
        ],
        rawDoctorNotes="Review in 3 months. Ask the doctor about this.",
        rawDateText="12/10/2026",
    )

    with patch(
        "app.services.extraction.extraction_service.extract_prescription",
        new_callable=AsyncMock,
    ) as mock_extract:
        mock_extract.return_value = mock_response

        res = client.post(
            "/internal/extract/prescription",
            json={"base64Data": "SGVsbG8=", "mimeType": "image/png"},
            headers={"X-AI-Secret": VALID_TEST_TOKEN},
        )

        assert res.status_code == 200
        data = res.json()
        assert len(data["medicines"]) == 2
        assert data["medicines"][0]["name"] == "Metformin"
        assert data["medicines"][0]["anchors"] == ["breakfast", "dinner"]
        assert "Ask the doctor about this" in data["rawDoctorNotes"]


def test_extract_lab_report_success() -> None:
    """Successful lab report extraction with deterministic biomarker metrics."""
    mock_response = LabReportExtractionResponse(
        testName="Comprehensive Metabolic Panel",
        collectedAtText="10/11/2026",
        metrics=[
            LabMetric(
                name="HbA1c",
                value=6.4,
                unit="%",
                referenceRangeText="4.0 - 5.6",
                flag="high",
            ),
            LabMetric(
                name="Fasting Glucose",
                value=98,
                unit="mg/dL",
                referenceRangeText="70 - 99",
                flag="normal",
            ),
        ],
        rawNotes="Values transcribed verbatim. Ask the doctor about this.",
    )

    with patch(
        "app.services.extraction.extraction_service.extract_lab_report",
        new_callable=AsyncMock,
    ) as mock_extract:
        mock_extract.return_value = mock_response

        res = client.post(
            "/internal/extract/lab-report",
            json={"imageUrl": "https://example.com/report.png"},
            headers={"X-AI-Secret": VALID_TEST_TOKEN},
        )

        assert res.status_code == 200
        data = res.json()
        assert data["testName"] == "Comprehensive Metabolic Panel"
        assert len(data["metrics"]) == 2
        assert data["metrics"][0]["name"] == "HbA1c"
        assert data["metrics"][0]["flag"] == "high"


@pytest.mark.asyncio
async def test_extraction_service_without_api_key_returns_503() -> None:
    """ExtractionService without API key raises 503 SERVICE_UNAVAILABLE."""
    service = ExtractionService(api_key=None)
    with pytest.raises(Exception) as exc_info:
        await service.extract_prescription(ExtractionRequest(base64Data="abc"))
    assert "SERVICE_UNAVAILABLE" in str(getattr(exc_info.value, "code", ""))


@pytest.mark.asyncio
async def test_extraction_service_gemini_call() -> None:
    """Direct test of ExtractionService resolving Gemini call."""
    service = ExtractionService(api_key="mock-api-key")
    mock_client = MagicMock()
    service._client = mock_client

    mock_gemini_resp = MagicMock()
    mock_gemini_resp.parsed = PrescriptionExtractionResponse(
        medicines=[ExtractedMedicine(name="Atorvastatin", strengthText="10mg")]
    )
    mock_client.models.generate_content.return_value = mock_gemini_resp

    result = await service.extract_prescription(
        ExtractionRequest(base64Data="SGVsbG8=", mimeType="image/jpeg")
    )
    assert len(result.medicines) == 1
    assert result.medicines[0].name == "Atorvastatin"
