"""Similarity search workflows built on the legacy FAISS helpers."""

from __future__ import annotations

import logging
from typing import List, Tuple

import numpy as np

from core.core_database import DatabaseManager
from core.core_search import EmbeddingStore, SimilaritySearcher
from config import CONFIG

logger = logging.getLogger(__name__)


class SearchService:
    """Loads embeddings from the database and exposes similarity lookups."""

    def __init__(self, db_manager: DatabaseManager | None = None):
        self.db = db_manager or DatabaseManager()
        self.store = EmbeddingStore()
        self.searcher = SimilaritySearcher(CONFIG.model.embedding_dim)
        self._ready = False

    def ensure_index(self) -> None:
        """Lazy-build a FAISS index from stored embeddings."""
        if self._ready:
            return
        embeddings, ids = self._load_embeddings_from_db()
        if embeddings.size == 0:
            logger.warning("No embeddings available to build the search index")
            return
        self.searcher.create_index(embeddings, ids)
        self._ready = True

    def similar_by_shape(self, shape_id: str, k: int | None = None) -> List[Tuple[str, float]]:
        """Return the k-nearest neighbours for the provided shape id."""
        self.ensure_index()
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT embedding FROM shapes WHERE id=?", (shape_id,))
            row = cursor.fetchone()
        if not row or row[0] is None:
            raise ValueError("Requested shape does not have an embedding yet")
        query_embedding = np.frombuffer(row[0], dtype=np.float32)
        return self.searcher.search(query_embedding, k)

    def _load_embeddings_from_db(self) -> Tuple[np.ndarray, List[str]]:
        """Load embeddings from SQLite and push them into the memory cache."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, embedding FROM shapes WHERE embedding IS NOT NULL")
            rows = cursor.fetchall()
        ids: List[str] = []
        embeddings: List[np.ndarray] = []
        for shape_id, blob in rows:
            if blob is None:
                continue
            vector = np.frombuffer(blob, dtype=np.float32)
            self.store.store_embedding(shape_id, vector)
            ids.append(shape_id)
            embeddings.append(vector)
        if not embeddings:
            return np.array([]), []
        return np.vstack(embeddings), ids
