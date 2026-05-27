"""Embedding orchestration helpers."""

from __future__ import annotations

import logging
from typing import Dict, List

import numpy as np

from core.core_database import DatabaseManager
from core.core_models import EmbeddingGenerator
from core.core_preprocessing import ImagePreprocessor

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Coordinates feature extraction and persistence."""

    def __init__(self, db_manager: DatabaseManager | None = None):
        self.db = db_manager or DatabaseManager()
        self.preprocessor = ImagePreprocessor()
        self.generator = EmbeddingGenerator()

    def build_embedding_for_shape(self, shape_id: str) -> Dict:
        """Load the stored shape, create an embedding, and persist it."""
        shape = self.db.get_shape(shape_id)
        if not shape:
            raise ValueError(f"Shape {shape_id} not found")

        image_array = self.preprocessor.load_image_array(shape["path"])
        if image_array is None:
            raise RuntimeError("Failed to load shape image from disk")

        embedding = self.generator.generate_embedding(image_array)
        self._store_embedding(shape_id, embedding)
        return {"shape_id": shape_id, "embedding_dim": int(embedding.shape[-1])}

    def batch_embeddings(self, shape_ids: List[str]) -> Dict:
        """Create embeddings for multiple shape ids."""
        created = []
        for sid in shape_ids:
            try:
                result = self.build_embedding_for_shape(sid)
                created.append(result)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Embedding failed for %s: %s", sid, exc)
        return {"processed": len(created), "details": created}

    def _store_embedding(self, shape_id: str, embedding: np.ndarray) -> None:
        """Persist embedding bytes inside the shapes table."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE shapes SET embedding=? WHERE id=?",
                (embedding.tobytes(), shape_id),
            )
            conn.commit()
