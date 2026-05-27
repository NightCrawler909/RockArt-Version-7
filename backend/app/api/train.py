"""Training orchestration endpoints."""

from fastapi import APIRouter, HTTPException

from services.model_service import ModelService

router = APIRouter(prefix="/train", tags=["train"])
service = ModelService()


@router.post("/classifier")
async def train_classifier():
    """Trigger a synchronous classifier training run."""
    try:
        result = service.train_from_database()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result
