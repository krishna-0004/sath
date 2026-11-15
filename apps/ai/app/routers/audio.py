"""Router for audio transcription."""

from fastapi import APIRouter, Depends, status

from app.core.security import require_internal_auth
from app.schemas.audio import AudioTranscriptionRequest, AudioTranscriptionResponse
from app.services.audio import audio_service

router = APIRouter(prefix="/internal/audio", tags=["Audio"])


@router.post(
    "/transcribe",
    response_model=AudioTranscriptionResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_internal_auth)],
)
async def transcribe_audio(payload: AudioTranscriptionRequest) -> AudioTranscriptionResponse:
    """Internal endpoint to transcribe audio recording."""
    return await audio_service.transcribe(payload)
