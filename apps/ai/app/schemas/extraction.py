"""Schemas for prescription and lab report AI extraction."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExtractionRequest(BaseModel):
    """Input payload for prescription and lab report extraction."""

    model_config = ConfigDict(populate_by_name=True)

    image_url: str | None = Field(
        default=None,
        alias="imageUrl",
        serialization_alias="imageUrl",
        description="Public or signed image URL",
    )
    base64_data: str | None = Field(
        default=None,
        alias="base64Data",
        serialization_alias="base64Data",
        description="Base64-encoded image or document bytes",
    )
    mime_type: str | None = Field(
        default=None,
        alias="mimeType",
        serialization_alias="mimeType",
        description="MIME type of the base64 document",
    )


class ExtractedMedicine(BaseModel):
    """Extracted medicine information."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(description="Name of the medicine")
    strength_text: str = Field(
        default="",
        alias="strengthText",
        serialization_alias="strengthText",
        description="Strength, e.g. 500mg",
    )
    frequency_text: str = Field(
        default="",
        alias="frequencyText",
        serialization_alias="frequencyText",
        description="Frequency, e.g. once daily",
    )
    anchors: list[str] = Field(
        default_factory=list,
        description="Timing anchors: breakfast, lunch, dinner, bedtime",
    )
    with_food: bool | None = Field(
        default=None,
        alias="withFood",
        serialization_alias="withFood",
        description="Whether to take with food",
    )
    instructions: str = Field(
        default="",
        description="Verbatim patient instructions from prescription",
    )


class PrescriptionExtractionResponse(BaseModel):
    """Structured extraction result for a prescription."""

    model_config = ConfigDict(populate_by_name=True)

    medicines: list[ExtractedMedicine] = Field(default_factory=list)
    raw_doctor_notes: str = Field(
        default="",
        alias="rawDoctorNotes",
        serialization_alias="rawDoctorNotes",
        description="Verbatim doctor annotations",
    )
    raw_date_text: str | None = Field(
        default=None,
        alias="rawDateText",
        serialization_alias="rawDateText",
        description="Verbatim date text from prescription",
    )


class LabMetric(BaseModel):
    """Extracted test metric from a lab report."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(description="Name of the test or biomarker")
    value: float | str = Field(description="Test numerical or qualitative value")
    unit: str = Field(default="", description="Unit of measurement")
    reference_range_text: str = Field(
        default="",
        alias="referenceRangeText",
        serialization_alias="referenceRangeText",
        description="Reference range as stated on document",
    )
    flag: Literal["normal", "low", "high", "unknown"] = Field(
        default="unknown",
        description="Whether metric is within reference range",
    )


class LabReportExtractionResponse(BaseModel):
    """Structured extraction result for a lab report."""

    model_config = ConfigDict(populate_by_name=True)

    test_name: str = Field(
        default="",
        alias="testName",
        serialization_alias="testName",
        description="Name or title of test panel",
    )
    collected_at_text: str | None = Field(
        default=None,
        alias="collectedAtText",
        serialization_alias="collectedAtText",
        description="Date or time text from document",
    )
    metrics: list[LabMetric] = Field(default_factory=list)
    raw_notes: str = Field(
        default="",
        alias="rawNotes",
        serialization_alias="rawNotes",
        description="Verbatim notes or impressions from lab report",
    )
