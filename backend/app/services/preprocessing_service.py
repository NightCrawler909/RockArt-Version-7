"""Business logic for image ingestion, preprocessing, and segmentation."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Dict, List, Tuple

from fastapi import UploadFile

from core.core_database import DatabaseManager
from core.core_preprocessing import ImagePreprocessor, ShapeSegmenter
from core.core_models import EmbeddingGenerator
from core.utils_helpers import LoggingSetup
from config import CONFIG


class PreprocessingService:
    """Coordinates uploads → preprocessing → segmentation → database."""

    def __init__(self, db_manager: DatabaseManager | None = None):
        LoggingSetup.setup_logging()
        self.db = db_manager or DatabaseManager()
        self.preprocessor = ImagePreprocessor()
        self.segmenter = ShapeSegmenter()
        self.embedding_generator = EmbeddingGenerator()
        self.raw_dir = Path(CONFIG.paths.raw_dir)
        self.raw_dir.mkdir(parents=True, exist_ok=True)

    def ingest_upload(self, file: UploadFile) -> Dict:
        """Persist the upload, run preprocessing, segment shapes, and log metadata."""
        saved_path = self._save_upload(file)
        processed_path = self.preprocessor.preprocess_image(str(saved_path))
        if not processed_path:
            raise RuntimeError("Failed to preprocess uploaded image")

        shapes = self.segmenter.segment_shapes(processed_path)
        stored = self._persist_shapes(shapes)
        return {
            "upload_id": saved_path.stem,
            "processed_path": processed_path,
            "shapes_inserted": len(stored),
            "shape_ids": stored,
        }

    def _save_upload(self, file: UploadFile) -> Path:
        """Write the upload to disk with a collision-safe file name."""
        file_id = uuid.uuid4().hex
        filename = f"{file_id}_{file.filename}"
        dest = self.raw_dir / filename
        with dest.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return dest

    def _persist_shapes(self, shapes: List[Tuple[str, str]]) -> List[str]:
        """Insert segmented shapes into the database and generate embeddings."""
        inserted: List[str] = []
        for shape_id, shape_path in shapes:
            embedding_bytes = None
            img_array = self.preprocessor.load_image_array(shape_path)
            if img_array is not None:
                try:
                    emb = self.embedding_generator.generate_embedding(img_array)
                    embedding_bytes = emb.tobytes()
                except Exception:
                    pass
            success = self.db.insert_shape(shape_id, shape_path, embedding=embedding_bytes)
            if success:
                inserted.append(shape_id)
        return inserted
