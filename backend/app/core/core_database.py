"""
Database management module for Rock Art Analysis application.
Handles all database operations with proper connection pooling and transaction management.
"""

import sqlite3
import logging
from contextlib import contextmanager
from typing import List, Tuple, Dict, Optional, Any
from datetime import datetime
import json

from config import CONFIG

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages all database operations with connection pooling and error handling."""
    
    def __init__(self, db_path: str = None):
        """Initialize database manager.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path or CONFIG.database.db_path
        self.init_db()
    
    def init_db(self):
        """Initialize database schema."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Shapes table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS shapes (
                    id TEXT PRIMARY KEY,
                    path TEXT NOT NULL,
                    label TEXT DEFAULT 'unlabeled',
                    confidence REAL DEFAULT 0.0,
                    embedding BLOB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indices for frequently queried columns
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_shapes_label 
                ON shapes(label)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_shapes_confidence 
                ON shapes(confidence)
            """)
            
            # Models table for versioning
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    version TEXT NOT NULL,
                    accuracy REAL,
                    val_accuracy REAL,
                    num_classes INTEGER,
                    classes TEXT,
                    model_path TEXT NOT NULL,
                    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    metadata TEXT
                )
            """)
            
            # Labels table for label management
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS labels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    color TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Operations log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS operations_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operation_type TEXT NOT NULL,
                    shape_id TEXT,
                    old_label TEXT,
                    new_label TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id TEXT,
                    details TEXT
                )
            """)
            
            conn.commit()
            logger.info(f"Database initialized at {self.db_path}")
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections.
        
        Yields:
            sqlite3.Connection object
        """
        conn = sqlite3.connect(
            self.db_path,
            timeout=CONFIG.database.connection_timeout,
            check_same_thread=CONFIG.database.check_same_thread,
            isolation_level=CONFIG.database.isolation_level
        )
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    # ==================== SHAPE OPERATIONS ====================
    
    def insert_shape(self, shape_id: str, path: str, embedding: Optional[bytes] = None,
                    label: str = "unlabeled") -> bool:
        """Insert a new shape into database.
        
        Args:
            shape_id: Unique shape identifier
            path: Path to shape image file
            embedding: Serialized embedding vector (optional)
            label: Initial label (default: unlabeled)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO shapes (id, path, embedding, label)
                    VALUES (?, ?, ?, ?)
                """, (shape_id, path, embedding, label))
                conn.commit()
                logger.info(f"Inserted shape {shape_id}")
                return True
        except sqlite3.IntegrityError:
            logger.warning(f"Shape {shape_id} already exists")
            return False
        except Exception as e:
            logger.error(f"Error inserting shape: {e}")
            return False
    
    def get_shape(self, shape_id: str) -> Optional[Dict]:
        """Get shape details by ID.
        
        Args:
            shape_id: Shape identifier
            
        Returns:
            Dictionary with shape data or None if not found
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM shapes WHERE id=?", (shape_id,))
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching shape: {e}")
            return None
    
    def get_unlabeled_shapes(self, limit: int = None) -> List[Tuple[str, str]]:
        """Get all unlabeled shapes.
        
        Args:
            limit: Maximum number of shapes to return
            
        Returns:
            List of (shape_id, path) tuples
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                query = "SELECT id, path FROM shapes WHERE label='unlabeled'"
                if limit:
                    query += f" LIMIT {limit}"
                cursor.execute(query)
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"Error fetching unlabeled shapes: {e}")
            return []
    
    def get_shapes_by_label(self, label: str, limit: int = None) -> List[Tuple[str, str]]:
        """Get shapes filtered by label.
        
        Args:
            label: Label to filter by
            limit: Maximum number of shapes to return
            
        Returns:
            List of (shape_id, path) tuples
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                query = "SELECT id, path FROM shapes WHERE label=?"
                if limit:
                    query += f" LIMIT {limit}"
                cursor.execute(query, (label,))
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"Error fetching shapes by label: {e}")
            return []
    
    def update_label(self, shape_id: str, new_label: str, confidence: float = 1.0,
                    user_id: str = "system") -> bool:
        """Update shape label with logging.
        
        Args:
            shape_id: Shape identifier
            new_label: New label value
            confidence: Confidence score (0-1)
            user_id: User who made the change
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Get old label for logging
                cursor.execute("SELECT label FROM shapes WHERE id=?", (shape_id,))
                result = cursor.fetchone()
                old_label = result[0] if result else None
                
                # Update shape
                cursor.execute("""
                    UPDATE shapes 
                    SET label=?, confidence=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                """, (new_label, confidence, shape_id))
                
                # Log operation
                if old_label != new_label:
                    cursor.execute("""
                        INSERT INTO operations_log (operation_type, shape_id, old_label, new_label, user_id)
                        VALUES (?, ?, ?, ?, ?)
                    """, ("label_change", shape_id, old_label, new_label, user_id))
                
                conn.commit()
                logger.info(f"Updated label for {shape_id}: {old_label} → {new_label}")
                return True
        except Exception as e:
            logger.error(f"Error updating label: {e}")
            return False
    
    def update_embedding(self, shape_id: str, embedding: bytes) -> bool:
        """Update shape embedding.
        
        Args:
            shape_id: Shape identifier
            embedding: Serialized embedding vector
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE shapes 
                    SET embedding=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                """, (embedding, shape_id))
                conn.commit()
                logger.info(f"Updated embedding for {shape_id}")
                return True
        except Exception as e:
            logger.error(f"Error updating embedding: {e}")
            return False

    def batch_update_labels(self, updates: Dict[str, str], user_id: str = "system") -> int:
        """Update multiple shape labels in batch.
        
        Args:
            updates: Dictionary of {shape_id: new_label}
            user_id: User making the change
            
        Returns:
            Number of shapes updated
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                count = 0
                
                for shape_id, new_label in updates.items():
                    cursor.execute("SELECT label FROM shapes WHERE id=?", (shape_id,))
                    result = cursor.fetchone()
                    old_label = result[0] if result else None
                    
                    cursor.execute("""
                        UPDATE shapes 
                        SET label=?, updated_at=CURRENT_TIMESTAMP
                        WHERE id=?
                    """, (new_label, shape_id))
                    
                    if old_label != new_label:
                        cursor.execute("""
                            INSERT INTO operations_log (operation_type, shape_id, old_label, new_label, user_id)
                            VALUES (?, ?, ?, ?, ?)
                        """, ("label_change", shape_id, old_label, new_label, user_id))
                        count += 1
                
                conn.commit()
                logger.info(f"Batch updated {count} shape labels")
                return count
        except Exception as e:
            logger.error(f"Error in batch update: {e}")
            return 0
    
    def delete_shape(self, shape_id: str) -> bool:
        """Delete a shape from database.
        
        Args:
            shape_id: Shape identifier
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM shapes WHERE id=?", (shape_id,))
                conn.commit()
                logger.info(f"Deleted shape {shape_id}")
                return True
        except Exception as e:
            logger.error(f"Error deleting shape: {e}")
            return False
    
    def delete_all_shapes(self) -> int:
        """Delete all shapes from database.
        
        Returns:
            Number of shapes deleted
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM shapes")
                count = cursor.fetchone()[0]
                cursor.execute("DELETE FROM shapes")
                conn.commit()
                logger.warning(f"Deleted all {count} shapes")
                return count
        except Exception as e:
            logger.error(f"Error deleting all shapes: {e}")
            return 0
    
    # ==================== MODEL OPERATIONS ====================
    
    def save_model_metadata(self, model_id: str, name: str, version: str,
                          accuracy: float, val_accuracy: float, num_classes: int,
                          classes: List[str], model_path: str, metadata: Dict = None) -> bool:
        """Save model metadata to database.
        
        Args:
            model_id: Unique model identifier
            name: Model name
            version: Model version
            accuracy: Training accuracy
            val_accuracy: Validation accuracy
            num_classes: Number of classes
            classes: List of class names
            model_path: Path to saved model file
            metadata: Additional metadata dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO models 
                    (id, name, version, accuracy, val_accuracy, num_classes, classes, model_path, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (model_id, name, version, accuracy, val_accuracy, num_classes,
                     json.dumps(classes), model_path, json.dumps(metadata or {})))
                conn.commit()
                logger.info(f"Saved model metadata for {name} v{version}")
                return True
        except Exception as e:
            logger.error(f"Error saving model metadata: {e}")
            return False
    
    def get_active_model(self) -> Optional[Dict]:
        """Get the currently active model.
        
        Returns:
            Dictionary with model metadata or None if no active model
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM models WHERE is_active=1 ORDER BY trained_at DESC LIMIT 1")
                row = cursor.fetchone()
                if row:
                    result = dict(row)
                    result['classes'] = json.loads(result['classes'])
                    result['metadata'] = json.loads(result['metadata'])
                    return result
                return None
        except Exception as e:
            logger.error(f"Error fetching active model: {e}")
            return None
    
    # ==================== STATISTICS ====================
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get database statistics.
        
        Returns:
            Dictionary with various statistics
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Total shapes
                cursor.execute("SELECT COUNT(*) FROM shapes")
                total_shapes = cursor.fetchone()[0]
                
                # Labeled vs unlabeled
                cursor.execute("SELECT COUNT(*) FROM shapes WHERE label='unlabeled'")
                unlabeled_count = cursor.fetchone()[0]
                labeled_count = total_shapes - unlabeled_count
                
                # Label distribution
                cursor.execute("""
                    SELECT label, COUNT(*) as count 
                    FROM shapes 
                    WHERE label != 'unlabeled'
                    GROUP BY label
                    ORDER BY count DESC
                """)
                label_distribution = {row[0]: row[1] for row in cursor.fetchall()}
                
                # Average confidence
                cursor.execute("SELECT AVG(confidence) FROM shapes WHERE confidence > 0")
                avg_confidence = cursor.fetchone()[0] or 0.0
                
                return {
                    "total_shapes": total_shapes,
                    "labeled_shapes": labeled_count,
                    "unlabeled_shapes": unlabeled_count,
                    "label_distribution": label_distribution,
                    "avg_confidence": round(avg_confidence, 3)
                }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def get_operation_history(self, limit: int = 100) -> List[Dict]:
        """Get operation history logs.
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            List of operation records
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM operations_log 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (limit,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching operation history: {e}")
            return []
