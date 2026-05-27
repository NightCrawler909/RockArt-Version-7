"""Label management routes."""

from typing import Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, conlist

from core.core_database import DatabaseManager
from core.utils_helpers import ValidationHelper

router = APIRouter(prefix="/labels", tags=["labels"])
db = DatabaseManager()


class LabelUpdate(BaseModel):
    shape_id: str
    label: str
    confidence: float = 1.0
    user_id: str = "api"


@router.post("/update")
async def update_label(payload: LabelUpdate):
    """Update a single shape label."""
    if not ValidationHelper.validate_label(payload.label):
        raise HTTPException(status_code=422, detail="Invalid label")
    success = db.update_label(payload.shape_id, payload.label, payload.confidence, payload.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Shape not found")
    return {"shape_id": payload.shape_id, "label": payload.label}


class BatchUpdate(BaseModel):
    updates: conlist(LabelUpdate, min_length=1)  # type: ignore[type-arg]


@router.post("/batch")
async def batch_update(payload: BatchUpdate):
    """Apply multiple label updates in a single transaction."""
    updates_dict: Dict[str, str] = {}
    for item in payload.updates:
        if not ValidationHelper.validate_label(item.label):
            raise HTTPException(status_code=422, detail=f"Invalid label for {item.shape_id}")
        updates_dict[item.shape_id] = item.label
    updated = db.batch_update_labels(updates_dict)
    return {"updated": updated}
