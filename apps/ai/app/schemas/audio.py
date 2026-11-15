"""Audio transcription request and response schemas."""

from pydantic import BaseModel, Field


class AudioTranscriptionRequest(BaseModel):
    """Payload for internal audio transcription."""

    base64_audio: str = Field(..., min_length=1, description="Base64 encoded audio data")
    mime_type: str = Field(default="audio/webm", description="MIME type of the audio")
    language_hint: str = Field(default="en", description="Language hint e.g. en, hi")


class AudioTranscriptionResponse(BaseModel):
    """Transcription response."""

    text: str = Field(..., description="Transcribed speech text")
    language: str = Field(default="en", description="Detected or requested language")
    duration_seconds: float | None = Field(default=None, description="Audio duration if detected")
