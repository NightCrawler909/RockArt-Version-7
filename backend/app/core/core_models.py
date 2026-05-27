"""
Model management module for Rock Art Analysis application.
Handles embedding model, classifier model, and model caching.
"""

import os
import logging
import numpy as np
from typing import Optional, Tuple, Dict
import tensorflow as tf
from functools import lru_cache
import json

from config import CONFIG

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton manager for all ML models with caching."""
    
    _instance = None
    _models_cache = {}
    
    def __new__(cls):
        """Implement singleton pattern."""
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize model manager."""
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.embedding_model = None
            self.classifier_model = None
            self.label_map = None
    
    def get_embedding_model(self, force_reload: bool = False) -> tf.keras.Model:
        """Get or create embedding model with caching.
        
        Args:
            force_reload: Force reload model from disk
            
        Returns:
            EfficientNet model for embeddings
        """
        cache_key = "embedding_model"
        
        if cache_key in self._models_cache and not force_reload:
            logger.info("Loading embedding model from cache")
            return self._models_cache[cache_key]
        
        try:
            logger.info(f"Creating embedding model: {CONFIG.model.embedding_model_name}")
            
            # Load pretrained EfficientNet
            base_model = tf.keras.applications.EfficientNetB0(
                input_shape=CONFIG.model.classifier_input_shape,
                include_top=False,
                weights='imagenet'
            )
            
            # Create embedding model
            inputs = tf.keras.Input(shape=CONFIG.model.classifier_input_shape)
            x = tf.keras.applications.efficientnet.preprocess_input(inputs)
            x = base_model(x, training=False)
            outputs = tf.keras.layers.GlobalAveragePooling2D()(x)
            
            model = tf.keras.Model(inputs=inputs, outputs=outputs)
            
            self._models_cache[cache_key] = model
            logger.info("Embedding model created successfully")
            return model
        except Exception as e:
            logger.error(f"Error creating embedding model: {e}")
            raise
    
    def get_classifier_model(self, num_classes: int, 
                            force_reload: bool = False) -> tf.keras.Model:
        """Get or create classifier model.
        
        Args:
            num_classes: Number of classification classes
            force_reload: Force reload model from disk
            
        Returns:
            Classifier model
        """
        cache_key = f"classifier_{num_classes}"
        
        if cache_key in self._models_cache and not force_reload:
            logger.info("Loading classifier model from cache")
            return self._models_cache[cache_key]
        
        try:
            logger.info(f"Creating classifier model with {num_classes} classes")
            
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(CONFIG.model.embedding_dim,)),
                tf.keras.layers.Dense(512, activation='relu', name='dense_1'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(256, activation='relu', name='dense_2'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(128, activation='relu', name='dense_3'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(num_classes, activation='softmax', name='output')
            ])
            
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=CONFIG.model.learning_rate),
                loss='sparse_categorical_crossentropy',
                metrics=['accuracy']
            )
            
            self._models_cache[cache_key] = model
            logger.info("Classifier model created successfully")
            return model
        except Exception as e:
            logger.error(f"Error creating classifier: {e}")
            raise
    
    def load_pretrained_classifier(self, model_path: str) -> Optional[tf.keras.Model]:
        """Load pretrained classifier from disk.
        
        Args:
            model_path: Path to saved model
            
        Returns:
            Loaded model or None if failed
        """
        cache_key = f"saved_{model_path}"
        
        if cache_key in self._models_cache:
            logger.info("Loading classifier from cache")
            return self._models_cache[cache_key]
        
        try:
            if not os.path.exists(model_path):
                logger.warning(f"Model not found: {model_path}")
                return None
            
            logger.info(f"Loading pretrained classifier: {model_path}")
            model = tf.keras.models.load_model(model_path)
            
            self._models_cache[cache_key] = model
            logger.info("Classifier loaded successfully")
            return model
        except Exception as e:
            logger.error(f"Error loading classifier: {e}")
            return None
    
    def clear_cache(self):
        """Clear model cache to free memory."""
        logger.info(f"Clearing cache ({len(self._models_cache)} models)")
        self._models_cache.clear()
    
    def get_cache_info(self) -> Dict:
        """Get information about cached models.
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            "cached_models": len(self._models_cache),
            "model_keys": list(self._models_cache.keys())
        }


class EmbeddingGenerator:
    """Generate and manage embeddings for shapes."""
    
    def __init__(self):
        """Initialize embedding generator."""
        self.model_manager = ModelManager()
        self.embedding_model = None
        self._load_embedding_model()
    
    def _load_embedding_model(self):
        """Load embedding model."""
        try:
            self.embedding_model = self.model_manager.get_embedding_model()
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    def generate_embedding(self, image_array: np.ndarray) -> np.ndarray:
        """Generate embedding for a single image.
        
        Args:
            image_array: Preprocessed image array (H, W, C)
            
        Returns:
            Embedding vector
        """
        try:
            # Ensure image is in correct format
            if len(image_array.shape) == 3:
                image_array = np.expand_dims(image_array, axis=0)
            
            # EfficientNet expects [0, 255] range, do not normalize to [0, 1]
            # if image_array.max() > 1.0:
            #     image_array = image_array / 255.0
            
            # Generate embedding
            embedding = self.embedding_model.predict(image_array, verbose=0)
            return embedding.flatten()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def batch_generate_embeddings(self, image_arrays: list) -> np.ndarray:
        """Generate embeddings for multiple images.
        
        Args:
            image_arrays: List of image arrays
            
        Returns:
            Array of embeddings (N, embedding_dim)
        """
        try:
            # Stack images
            batch = np.stack(image_arrays)
            
            # EfficientNet expects [0, 255] range, do not normalize to [0, 1]
            # if batch.max() > 1.0:
            #     batch = batch / 255.0
            
            # Generate embeddings
            embeddings = self.embedding_model.predict(batch, verbose=0)
            return embeddings
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise


class ClassifierTrainer:
    """Train classifier models."""
    
    def __init__(self):
        """Initialize trainer."""
        self.model_manager = ModelManager()
        self.model = None
        self.history = None
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray,
             X_val: np.ndarray = None, y_val: np.ndarray = None,
             num_classes: int = None, epochs: int = None,
             batch_size: int = None) -> Dict:
        """Train classifier model.
        
        Args:
            X_train: Training embeddings
            y_train: Training labels
            X_val: Validation embeddings (optional)
            y_val: Validation labels (optional)
            num_classes: Number of classes
            epochs: Number of training epochs
            batch_size: Batch size
            
        Returns:
            Training history dictionary
        """
        try:
            num_classes = num_classes or len(np.unique(y_train))
            epochs = epochs or CONFIG.model.num_epochs
            batch_size = batch_size or CONFIG.model.batch_size
            
            logger.info(f"Training classifier: {num_classes} classes, {epochs} epochs, batch_size={batch_size}")
            
            # Create model
            self.model = self.model_manager.get_classifier_model(num_classes)
            
            # Prepare validation data
            validation_data = None
            if X_val is not None and y_val is not None:
                validation_data = (X_val, y_val)
            else:
                validation_data = CONFIG.model.validation_split
            
            # Train
            history = self.model.fit(
                X_train, y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_data=validation_data,
                verbose=1
            )
            
            self.history = history.history
            logger.info("Training completed successfully")
            return self.history
        except Exception as e:
            logger.error(f"Error training classifier: {e}")
            raise
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
        """Evaluate model on test data.
        
        Args:
            X_test: Test embeddings
            y_test: Test labels
            
        Returns:
            Dictionary with evaluation metrics
        """
        try:
            if self.model is None:
                logger.error("No model to evaluate")
                return {}
            
            loss, accuracy = self.model.evaluate(X_test, y_test, verbose=0)
            logger.info(f"Test loss: {loss:.4f}, Test accuracy: {accuracy:.4f}")
            
            return {
                "loss": loss,
                "accuracy": accuracy
            }
        except Exception as e:
            logger.error(f"Error evaluating model: {e}")
            return {}
    
    def save_model(self, model_path: str) -> bool:
        """Save trained model.
        
        Args:
            model_path: Path to save model
            
        Returns:
            True if successful
        """
        try:
            if self.model is None:
                logger.error("No model to save")
                return False
            
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            self.model.save(model_path)
            logger.info(f"Model saved to {model_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return False


class Predictor:
    """Make predictions using trained classifier."""
    
    def __init__(self, model_path: str, label_map_path: str):
        """Initialize predictor.
        
        Args:
            model_path: Path to classifier model
            label_map_path: Path to label mapping JSON
        """
        self.model_manager = ModelManager()
        self.embedding_generator = EmbeddingGenerator()
        
        self.model = self.model_manager.load_pretrained_classifier(model_path)
        self.label_map = self._load_label_map(label_map_path)
        self.idx_to_label = {v: k for k, v in self.label_map.items()} if self.label_map else {}
    
    def _load_label_map(self, label_map_path: str) -> Optional[Dict]:
        """Load label mapping from JSON file.
        
        Args:
            label_map_path: Path to label map JSON
            
        Returns:
            Label mapping dictionary
        """
        try:
            if os.path.exists(label_map_path):
                with open(label_map_path, 'r') as f:
                    return json.load(f)
            logger.warning(f"Label map not found: {label_map_path}")
            return None
        except Exception as e:
            logger.error(f"Error loading label map: {e}")
            return None
    
    def predict(self, embedding: np.ndarray) -> Tuple[str, float]:
        """Predict label for embedding.
        
        Args:
            embedding: Embedding vector
            
        Returns:
            Tuple of (predicted_label, confidence)
        """
        try:
            if self.model is None or self.idx_to_label is None:
                return "unknown", 0.0
            
            # Expand dims if needed
            if len(embedding.shape) == 1:
                embedding = np.expand_dims(embedding, axis=0)
            
            # Predict
            predictions = self.model.predict(embedding, verbose=0)
            pred_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][pred_idx])
            
            label = self.idx_to_label.get(pred_idx, "unknown")
            
            return label, confidence
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            return "unknown", 0.0
    
    def batch_predict(self, embeddings: np.ndarray) -> list:
        """Predict labels for multiple embeddings.
        
        Args:
            embeddings: Array of embeddings
            
        Returns:
            List of (label, confidence) tuples
        """
        try:
            predictions = self.model.predict(embeddings, verbose=0)
            results = []
            
            for pred_array in predictions:
                pred_idx = np.argmax(pred_array)
                confidence = float(pred_array[pred_idx])
                label = self.idx_to_label.get(pred_idx, "unknown")
                results.append((label, confidence))
            
            return results
        except Exception as e:
            logger.error(f"Error in batch prediction: {e}")
            return []
