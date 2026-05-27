"""
Utility functions and helpers for the Rock Art Analysis application.
"""

import logging
import json
import os
import zipfile
import shutil
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import csv

from config import CONFIG

logger = logging.getLogger(__name__)


class LoggingSetup:
    """Setup and configure logging."""
    
    @staticmethod
    def setup_logging(log_level: str = None, log_file: str = None) -> logging.Logger:
        """Setup application logging.
        
        Args:
            log_level: Logging level (uses config default if None)
            log_file: Path to log file (uses config default if None)
            
        Returns:
            Configured logger instance
        """
        log_level = log_level or CONFIG.logging.log_level
        log_file = log_file or CONFIG.logging.log_file
        log_format = CONFIG.logging.log_format
        
        # Create logs directory only when a file destination exists
        if log_file:
            log_dir = os.path.dirname(log_file)
            if log_dir:
                os.makedirs(log_dir, exist_ok=True)
        
        # Create logger
        logger = logging.getLogger()
        logger.setLevel(getattr(logging, log_level))
        
        # Remove existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Create formatter
        formatter = logging.Formatter(log_format)
        
        # Add file handler
        if CONFIG.logging.enable_file_logging and log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        
        # Add console handler
        if CONFIG.logging.enable_console_logging:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        
        logger.info(f"Logging configured: level={log_level}, file={log_file}")
        return logger


class DataExporter:
    """Export dataset in various formats."""
    
    @staticmethod
    def export_as_zip(db_manager, shapes_dir: str, output_path: str) -> bool:
        """Export dataset as ZIP file.
        
        Args:
            db_manager: DatabaseManager instance
            shapes_dir: Directory containing shapes
            output_path: Path to save ZIP file
            
        Returns:
            True if successful
        """
        try:
            logger.info(f"Exporting dataset to ZIP: {output_path}")
            
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add shapes
                if os.path.exists(shapes_dir):
                    for filename in os.listdir(shapes_dir):
                        filepath = os.path.join(shapes_dir, filename)
                        arcname = os.path.join('shapes', filename)
                        zipf.write(filepath, arcname)
                
                # Add metadata CSV
                conn = db_manager.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id, path, label, confidence FROM shapes")
                rows = cursor.fetchall()
                conn.close()
                
                # Create CSV content
                csv_path = os.path.join(os.path.dirname(output_path), 'metadata.csv')
                with open(csv_path, 'w', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(['shape_id', 'path', 'label', 'confidence'])
                    for row in rows:
                        writer.writerow(row)
                
                zipf.write(csv_path, 'metadata.csv')
                os.remove(csv_path)
            
            logger.info(f"Dataset exported successfully to {output_path}")
            return True
        except Exception as e:
            logger.error(f"Error exporting dataset: {e}")
            return False
    
    @staticmethod
    def export_as_coco(db_manager, shapes_dir: str, output_path: str) -> bool:
        """Export dataset in COCO format.
        
        Args:
            db_manager: DatabaseManager instance
            shapes_dir: Directory containing shapes
            output_path: Path to save COCO JSON
            
        Returns:
            True if successful
        """
        try:
            logger.info(f"Exporting dataset to COCO format: {output_path}")
            
            # Get data from database
            with db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, path, label FROM shapes")
                rows = cursor.fetchall()
            
            # Create label index
            labels = set(row[2] for row in rows if row[2] != 'unlabeled')
            label_to_id = {label: i+1 for i, label in enumerate(sorted(labels))}
            
            # Build COCO format
            coco_data = {
                "info": {
                    "description": "Rock Art Analysis Dataset",
                    "version": "1.0",
                    "year": datetime.now().year,
                    "date_created": datetime.now().isoformat()
                },
                "images": [],
                "annotations": [],
                "categories": [
                    {"id": idx, "name": label, "supercategory": "rock_art"}
                    for label, idx in label_to_id.items()
                ]
            }
            
            annotation_id = 1
            for image_id, (shape_id, path, label) in enumerate(rows, 1):
                coco_data["images"].append({
                    "id": image_id,
                    "file_name": os.path.basename(path),
                    "width": 128,
                    "height": 128
                })
                
                if label in label_to_id:
                    coco_data["annotations"].append({
                        "id": annotation_id,
                        "image_id": image_id,
                        "category_id": label_to_id[label],
                        "area": 128*128,
                        "bbox": [0, 0, 128, 128],
                        "iscrowd": 0
                    })
                    annotation_id += 1
            
            # Save
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as f:
                json.dump(coco_data, f, indent=2)
            
            logger.info(f"Dataset exported to COCO format: {output_path}")
            return True
        except Exception as e:
            logger.error(f"Error exporting COCO format: {e}")
            return False
    
    @staticmethod
    def export_as_csv(db_manager, output_path: str) -> bool:
        """Export metadata as CSV.
        
        Args:
            db_manager: DatabaseManager instance
            output_path: Path to save CSV
            
        Returns:
            True if successful
        """
        try:
            logger.info(f"Exporting metadata to CSV: {output_path}")
            
            with db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, path, label, confidence, created_at FROM shapes")
                rows = cursor.fetchall()
            
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['shape_id', 'path', 'label', 'confidence', 'created_at'])
                for row in rows:
                    writer.writerow(row)
            
            logger.info(f"Metadata exported to CSV: {output_path}")
            return True
        except Exception as e:
            logger.error(f"Error exporting CSV: {e}")
            return False


class FileManager:
    """Manage file operations."""
    
    @staticmethod
    def cleanup_directory(directory: str, pattern: str = None) -> int:
        """Clean up files in directory.
        
        Args:
            directory: Directory to clean
            pattern: File pattern to match (uses all if None)
            
        Returns:
            Number of files deleted
        """
        try:
            if not os.path.exists(directory):
                return 0
            
            deleted = 0
            for filename in os.listdir(directory):
                if pattern is None or pattern in filename:
                    filepath = os.path.join(directory, filename)
                    if os.path.isfile(filepath):
                        os.remove(filepath)
                        deleted += 1
                    elif os.path.isdir(filepath):
                        shutil.rmtree(filepath)
                        deleted += 1
            
            logger.info(f"Cleaned up {deleted} files from {directory}")
            return deleted
        except Exception as e:
            logger.error(f"Error cleaning directory: {e}")
            return 0
    
    @staticmethod
    def get_directory_size(directory: str) -> int:
        """Calculate total size of directory.
        
        Args:
            directory: Directory path
            
        Returns:
            Total size in bytes
        """
        try:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(directory):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    if os.path.exists(filepath):
                        total_size += os.path.getsize(filepath)
            return total_size
        except Exception as e:
            logger.error(f"Error calculating directory size: {e}")
            return 0
    
    @staticmethod
    def format_size(size_bytes: int) -> str:
        """Format bytes to human readable size.
        
        Args:
            size_bytes: Size in bytes
            
        Returns:
            Formatted size string
        """
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"


class ValidationHelper:
    """Input validation helper functions."""
    
    @staticmethod
    def validate_label(label: str) -> bool:
        """Validate label string.
        
        Args:
            label: Label to validate
            
        Returns:
            True if valid
        """
        if not isinstance(label, str):
            return False
        if len(label.strip()) == 0:
            return False
        if len(label) > 100:
            return False
        return True
    
    @staticmethod
    def validate_image_file(filepath: str) -> bool:
        """Validate if file is a valid image.
        
        Args:
            filepath: Path to image file
            
        Returns:
            True if valid image
        """
        valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'}
        
        if not os.path.exists(filepath):
            return False
        
        ext = os.path.splitext(filepath)[1].lower()
        return ext in valid_extensions
    
    @staticmethod
    def validate_embedding(embedding: Any) -> bool:
        """Validate embedding vector.
        
        Args:
            embedding: Embedding to validate
            
        Returns:
            True if valid
        """
        import numpy as np
        
        if not isinstance(embedding, np.ndarray):
            return False
        if len(embedding.shape) != 1:
            return False
        if embedding.size == 0:
            return False
        return True


class MetricsCalculator:
    """Calculate performance metrics."""
    
    @staticmethod
    def calculate_accuracy(y_true: List, y_pred: List) -> float:
        """Calculate accuracy.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            
        Returns:
            Accuracy score
        """
        if len(y_true) == 0:
            return 0.0
        correct = sum(1 for true, pred in zip(y_true, y_pred) if true == pred)
        return correct / len(y_true)
    
    @staticmethod
    def calculate_precision(y_true: List, y_pred: List, label: str) -> float:
        """Calculate precision for a label.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            label: Target label
            
        Returns:
            Precision score
        """
        tp = sum(1 for true, pred in zip(y_true, y_pred) if pred == label and true == label)
        fp = sum(1 for true, pred in zip(y_true, y_pred) if pred == label and true != label)
        
        if tp + fp == 0:
            return 0.0
        return tp / (tp + fp)
    
    @staticmethod
    def calculate_recall(y_true: List, y_pred: List, label: str) -> float:
        """Calculate recall for a label.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            label: Target label
            
        Returns:
            Recall score
        """
        tp = sum(1 for true, pred in zip(y_true, y_pred) if pred == label and true == label)
        fn = sum(1 for true, pred in zip(y_true, y_pred) if pred != label and true == label)
        
        if tp + fn == 0:
            return 0.0
        return tp / (tp + fn)
