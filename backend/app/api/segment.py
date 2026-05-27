"""Segmentation-specific endpoints."""

from pydantic import BaseModel
from fastapi import APIRouter

from services.preprocessing_service import PreprocessingService

router = APIRouter(prefix="/segment", tags=["segment"])
service = PreprocessingService()


class SegmentRequest(BaseModel):
    image_path: str


@router.post("/reprocess")
async def reprocess_image(payload: SegmentRequest):
    """Re-run segmentation on an already preprocessed image path."""
    shapes = service.segmenter.segment_shapes(payload.image_path)
    inserted = service._persist_shapes(shapes)
    return {"segments": len(shapes), "inserted": len(inserted)}
