"""Similarity search endpoints."""

from fastapi import APIRouter, HTTPException, Query

from services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])
service = SearchService()


from core.core_database import DatabaseManager
from core.core_models import EmbeddingGenerator
from core.core_preprocessing import ImagePreprocessor

@router.post("/refresh")
async def refresh_index():
    """Generate missing embeddings and force a rebuild of the FAISS index."""
    db = DatabaseManager()
    embedding_gen = EmbeddingGenerator()
    image_preproc = ImagePreprocessor()
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, path FROM shapes")
        rows = cursor.fetchall()
        
    for shape_id, shape_path in rows:
        img_array = image_preproc.load_image_array(shape_path)
        if img_array is not None:
            emb = embedding_gen.generate_embedding(img_array)
            db.update_embedding(shape_id, emb.tobytes())
            
    service._ready = False  # force rebuild
    service.ensure_index()
    return {"status": "ok", "generated": len(rows)}


@router.get("/{shape_id}")
async def similar_shapes(shape_id: str, k: int = Query(5, ge=1, le=50)):
    """Return the k most similar shapes for a given shape id."""
    try:
        results = service.similar_by_shape(shape_id, k)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
        
    db = DatabaseManager()
    matches = []
    for match_id, score in results:
        shape = db.get_shape(match_id)
        label = shape.get("label", "unlabeled") if shape else "unlabeled"
        matches.append((match_id, score, label))
        
    return {"shape_id": shape_id, "matches": matches}
