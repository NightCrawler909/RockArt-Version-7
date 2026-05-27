"""Central configuration object consumed across the FastAPI backend."""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class DatabaseConfig:
    db_path: str = "rock_art_analysis.db"
    connection_timeout: float = 30.0
    check_same_thread: bool = False
    isolation_level: str = "DEFERRED"


@dataclass
class SearchConfig:
    cache_embeddings: bool = True
    embedding_dim: int = 1280
    similarity_metric: str = "cosine"
    top_k_results: int = 10


@dataclass
class ModelConfig:
    embedding_model_name: str = "efficientnet_b0"
    embedding_dim: int = 1280
    image_size: int = 128
    classifier_input_shape: tuple[int, int, int] = (128, 128, 3)
    model_name: str = "rock-art-classifier"
    model_path: str = "models/classifier_model.h5"
    label_map_path: str = "models/label_to_idx.json"
    confidence_threshold: float = 0.8
    num_epochs: int = 10
    batch_size: int = 16
    validation_split: float = 0.2
    learning_rate: float = 0.001


@dataclass
class PreprocessingConfig:
    target_size: tuple[int, int] = (512, 512)
    brightness_range: tuple[float, float] = (0.8, 1.2)
    rotation_range: int = 15
    zoom_range: tuple[float, float] = (0.85, 1.15)
    apply_clahe: bool = True
    clahe_clip_limit: float = 2.0
    compress_quality: int = 85


@dataclass
class SegmentationConfig:
    min_object_size: int = 50


@dataclass
class PathConfig:
    raw_dir: str = "data/raw"
    processed_dir: str = "data/processed"
    shapes_dir: str = "data/shapes"
    logs_dir: str = "logs"
    models_dir: str = "models"
    exports_dir: str = "exports"

    def __post_init__(self) -> None:
        for value in (self.raw_dir, self.processed_dir, self.shapes_dir, self.logs_dir, self.models_dir, self.exports_dir):
            Path(value).mkdir(parents=True, exist_ok=True)


@dataclass
class LoggingConfig:
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_file: str | None = None
    enable_file_logging: bool = False
    enable_console_logging: bool = True


@dataclass
class AppConfig:
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    preprocessing: PreprocessingConfig = field(default_factory=PreprocessingConfig)
    segmentation: SegmentationConfig = field(default_factory=SegmentationConfig)
    paths: PathConfig = field(default_factory=PathConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)


CONFIG = AppConfig()
