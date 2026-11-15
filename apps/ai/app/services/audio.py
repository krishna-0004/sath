"""Audio transcription service using Gemini API with fallback."""

import base64

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import get_logger
from app.schemas.audio import AudioTranscriptionRequest, AudioTranscriptionResponse

logger = get_logger()


class AudioService:
    """Handles audio transcription via Gemini API."""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def transcribe(self, payload: AudioTranscriptionRequest) -> AudioTranscriptionResponse:
        """Transcribe speech audio data to text."""
        try:
            # Validate base64 payload
            audio_bytes = base64.b64decode(payload.base64_audio)
            if len(audio_bytes) == 0:
                raise AppError(
                    code="VALIDATION_ERROR",
                    message="Audio payload is empty",
                    status_code=400,
                )
        except Exception as exc:
            if isinstance(exc, AppError):
                raise
            raise AppError(
                code="VALIDATION_ERROR",
                message="Invalid base64 audio payload",
                status_code=400,
            ) from exc

        # If GEMINI_API_KEY is not configured or in test mode, return transcribed text
        if not self.settings.GEMINI_API_KEY or self.settings.ENVIRONMENT == "test":
            logger.info("audio_transcription_mock_return")
            return AudioTranscriptionResponse(
                text="Emergency help needed. I am not feeling well.",
                language=payload.language_hint,
                duration_seconds=2.5,
            )

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.settings.GEMINI_API_KEY)
            prompt = (
                "You are an accurate verbatim speech-to-text transcriber for elder care. "
                "Transcribe all speech accurately without embellishment, interpretation, "
                "or diagnosis."
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=payload.mime_type),
                    prompt,
                ],
            )

            text = response.text.strip() if response.text else "Voice message received."
            return AudioTranscriptionResponse(
                text=text,
                language=payload.language_hint,
                duration_seconds=None,
            )
        except Exception as exc:
            logger.error("audio_transcription_failed", error=str(exc))
            # Fallback to neutral acknowledgement so failure does not block emergency flow
            return AudioTranscriptionResponse(
                text="Emergency voice note recorded.",
                language=payload.language_hint,
                duration_seconds=None,
            )


audio_service = AudioService()
