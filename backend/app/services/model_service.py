"""Model lifecycle helpers for the FastAPI backend."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

from config import CONFIG
from core.core_database import DatabaseManager
from core.core_models import ClassifierTrainer

logger = logging.getLogger(__name__)


class ModelService:
    """Train, evaluate, and persist classifier models using the stored embeddings."""

    def __init__(self, db_manager: DatabaseManager | None = None):
        self.db = db_manager or DatabaseManager()
        self.trainer = ClassifierTrainer()
        Path(CONFIG.paths.models_dir).mkdir(parents=True, exist_ok=True)

    def train_from_database(self) -> Dict:
        """Pull labeled embeddings from SQLite and run a training job."""
        embeddings, labels = self._fetch_training_data()
        if embeddings.size == 0:
            raise RuntimeError("No labeled embeddings found in the database")

        label_to_idx = {label: idx for idx, label in enumerate(sorted(set(labels)))}
        y = np.array([label_to_idx[label] for label in labels], dtype=np.int32)
        X = embeddings

        if len(X) < 4:
            raise RuntimeError("Need at least 4 samples to train a classifier")

        if len(label_to_idx) < 2:
            raise RuntimeError("Need at least 2 distinct labels to train a classifier")

        split_idx = int(len(X) * (1 - CONFIG.model.validation_split))
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]

        history = self.trainer.train(
            X_train,
            y_train,
            X_val,
            y_val,
            num_classes=len(label_to_idx),
        )

        model_id = os.urandom(8).hex()
        model_path = Path(CONFIG.model.model_path)
        self.trainer.save_model(str(model_path))
        self._persist_label_map(label_to_idx)
        self.db.save_model_metadata(
            model_id=model_id,
            name="rock-art-classifier",
            version="1.0.0",
            accuracy=float(history.get("accuracy", [0])[-1]) if history else 0.0,
            val_accuracy=float(history.get("val_accuracy", [0])[-1]) if history else 0.0,
            num_classes=len(label_to_idx),
            classes=list(label_to_idx.keys()),
            model_path=str(model_path),
            metadata={"loss": history.get("loss", []) if history else []},
        )
        return {
            "model_id": model_id,
            "classes": list(label_to_idx.keys()),
            "history": history,
        }

    def _fetch_training_data(self) -> Tuple[np.ndarray, List[str]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT embedding, label FROM shapes WHERE label != 'unlabeled' AND embedding IS NOT NULL"
            )
            rows = cursor.fetchall()
        embeddings: List[np.ndarray] = []
        labels: List[str] = []
        for embedding_blob, label in rows:
            if embedding_blob is None:
                continue
            vector = np.frombuffer(embedding_blob, dtype=np.float32)
            embeddings.append(vector)
            labels.append(label)
        if not embeddings:
            return np.array([]), []
        return np.vstack(embeddings), labels

    def _persist_label_map(self, label_to_idx: Dict[str, int]) -> None:
        label_map_path = Path(CONFIG.model.label_map_path)
        label_map_path.parent.mkdir(parents=True, exist_ok=True)
        with label_map_path.open("w", encoding="utf-8") as fp:
            json.dump(label_to_idx, fp, indent=2)
