"""Upload endpoints for raw field imagery."""

from fastapi import APIRouter, File, UploadFile

from services.preprocessing_service import PreprocessingService

router = APIRouter(prefix="/upload", tags=["upload"])
service = PreprocessingService()


@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """Accept a single site photo and start the preprocessing pipeline."""
    return service.ingest_upload(file)
