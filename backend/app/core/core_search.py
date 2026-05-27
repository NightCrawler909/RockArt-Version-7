"""
Search and similarity matching module.
Uses FAISS for efficient nearest neighbor search on embeddings.
"""

import numpy as np
import logging
import pickle
import os
from typing import List, Tuple, Optional
import faiss

from config import CONFIG

logger = logging.getLogger(__name__)


class SimilaritySearcher:
    """Efficient similarity search using FAISS."""
    
    def __init__(self, embedding_dim: int = None):
        """Initialize similarity searcher.
        
        Args:
            embedding_dim: Dimension of embeddings (uses config default if None)
        """
        self.embedding_dim = embedding_dim or CONFIG.model.embedding_dim
        self.index = None
        self.embedding_ids = []
    
    def create_index(self, embeddings: np.ndarray, ids: List[str] = None):
        """Create FAISS index from embeddings.
        
        Args:
            embeddings: Array of embeddings (N, D)
            ids: List of shape IDs corresponding to embeddings
        """
        try:
            logger.info(f"Creating FAISS index with {len(embeddings)} embeddings")
            
            # Ensure embeddings are float32
            embeddings = embeddings.astype(np.float32)
            
            # Create index
            self.index = faiss.IndexFlatL2(embeddings.shape[1])
            self.index.add(embeddings)
            
            # Store IDs
            self.embedding_ids = ids or list(range(len(embeddings)))
            
            logger.info(f"FAISS index created successfully")
        except Exception as e:
            logger.error(f"Error creating FAISS index: {e}")
            raise
    
    def search(self, query_embedding: np.ndarray, k: int = None) -> List[Tuple[str, float]]:
        """Search for similar embeddings.
        
        Args:
            query_embedding: Query embedding vector
            k: Number of results to return (uses config default if None)
            
        Returns:
            List of (shape_id, distance) tuples
        """
        try:
            if self.index is None:
                logger.warning("Index not created yet")
                return []
            
            k = k or CONFIG.search.top_k_results
            
            # Ensure query is float32
            query_embedding = query_embedding.astype(np.float32)
            if len(query_embedding.shape) == 1:
                query_embedding = np.expand_dims(query_embedding, axis=0)
            
            # Search
            distances, indices = self.index.search(query_embedding, k)
            
            # Build results
            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx >= 0 and idx < len(self.embedding_ids):
                    results.append((self.embedding_ids[idx], float(dist)))
            
            return results
        except Exception as e:
            logger.error(f"Error searching index: {e}")
            return []
    
    def batch_search(self, query_embeddings: np.ndarray, k: int = None) -> List[List[Tuple[str, float]]]:
        """Batch search for multiple queries.
        
        Args:
            query_embeddings: Array of query embeddings (M, D)
            k: Number of results per query
            
        Returns:
            List of result lists
        """
        try:
            if self.index is None:
                return []
            
            k = k or CONFIG.search.top_k_results
            
            # Ensure queries are float32
            query_embeddings = query_embeddings.astype(np.float32)
            
            # Search
            distances, indices = self.index.search(query_embeddings, k)
            
            # Build results
            all_results = []
            for dists, idxs in zip(distances, indices):
                results = []
                for dist, idx in zip(dists, idxs):
                    if idx >= 0 and idx < len(self.embedding_ids):
                        results.append((self.embedding_ids[idx], float(dist)))
                all_results.append(results)
            
            return all_results
        except Exception as e:
            logger.error(f"Error in batch search: {e}")
            return []
    
    def save_index(self, index_path: str):
        """Save FAISS index and IDs to disk.
        
        Args:
            index_path: Path to save index
        """
        try:
            if self.index is None:
                logger.warning("No index to save")
                return
            
            os.makedirs(os.path.dirname(index_path), exist_ok=True)
            
            # Save index
            faiss.write_index(self.index, index_path)
            
            # Save IDs
            ids_path = index_path.replace('.index', '.ids')
            with open(ids_path, 'wb') as f:
                pickle.dump(self.embedding_ids, f)
            
            logger.info(f"Index saved to {index_path}")
        except Exception as e:
            logger.error(f"Error saving index: {e}")
    
    def load_index(self, index_path: str):
        """Load FAISS index and IDs from disk.
        
        Args:
            index_path: Path to load index from
        """
        try:
            if not os.path.exists(index_path):
                logger.warning(f"Index file not found: {index_path}")
                return False
            
            # Load index
            self.index = faiss.read_index(index_path)
            
            # Load IDs
            ids_path = index_path.replace('.index', '.ids')
            if os.path.exists(ids_path):
                with open(ids_path, 'rb') as f:
                    self.embedding_ids = pickle.load(f)
            
            logger.info(f"Index loaded from {index_path}")
            return True
        except Exception as e:
            logger.error(f"Error loading index: {e}")
            return False
    
    def clear_index(self):
        """Clear the current index."""
        self.index = None
        self.embedding_ids = []
        logger.info("Index cleared")


class EmbeddingStore:
    """Store and retrieve embeddings."""
    
    def __init__(self, cache_embeddings: bool = None):
        """Initialize embedding store.
        
        Args:
            cache_embeddings: Whether to cache embeddings in memory
        """
        self.cache_embeddings = cache_embeddings if cache_embeddings is not None else CONFIG.search.cache_embeddings
        self.embeddings_cache = {}
    
    def store_embedding(self, shape_id: str, embedding: np.ndarray):
        """Store embedding in cache.
        
        Args:
            shape_id: Shape identifier
            embedding: Embedding vector
        """
        if self.cache_embeddings:
            self.embeddings_cache[shape_id] = embedding.astype(np.float32)
    
    def get_embedding(self, shape_id: str) -> Optional[np.ndarray]:
        """Retrieve embedding from cache.
        
        Args:
            shape_id: Shape identifier
            
        Returns:
            Embedding vector or None if not cached
        """
        return self.embeddings_cache.get(shape_id)
    
    def get_all_embeddings(self) -> Tuple[np.ndarray, List[str]]:
        """Get all cached embeddings.
        
        Returns:
            Tuple of (embeddings array, shape_ids list)
        """
        if not self.embeddings_cache:
            return np.array([]), []
        
        ids = sorted(self.embeddings_cache.keys())
        embeddings = np.array([self.embeddings_cache[id] for id in ids])
        return embeddings, ids
    
    def clear_cache(self):
        """Clear embedding cache."""
        self.embeddings_cache.clear()
        logger.info("Embedding cache cleared")
    
    def get_cache_size(self) -> int:
        """Get number of cached embeddings.
        
        Returns:
            Number of embeddings in cache
        """
        return len(self.embeddings_cache)


class CosineSimilarity:
    """Compute cosine similarity between embeddings."""
    
    @staticmethod
    def compute_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0-1)
        """
        try:
            # Normalize
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            # Compute cosine similarity
            similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
            return float(similarity)
        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            return 0.0
    
    @staticmethod
    def compute_similarities(embedding: np.ndarray, embeddings_array: np.ndarray) -> np.ndarray:
        """Compute cosine similarity between one embedding and multiple embeddings.
        
        Args:
            embedding: Query embedding (D,)
            embeddings_array: Array of embeddings (N, D)
            
        Returns:
            Array of similarity scores
        """
        try:
            # Normalize
            norm1 = np.linalg.norm(embedding)
            norms2 = np.linalg.norm(embeddings_array, axis=1)
            
            if norm1 == 0 or np.any(norms2 == 0):
                return np.zeros(len(embeddings_array))
            
            # Compute cosine similarities
            similarities = np.dot(embeddings_array, embedding) / (norms2 * norm1)
            return similarities
        except Exception as e:
            logger.error(f"Error computing similarities: {e}")
            return np.array([])


class ClusteringHelper:
    """Helper for clustering similar shapes."""
    
    @staticmethod
    def cluster_embeddings(embeddings: np.ndarray, method: str = "kmeans", 
                          n_clusters: int = None) -> np.ndarray:
        """Cluster embeddings using specified method.
        
        Args:
            embeddings: Array of embeddings
            method: Clustering method ('kmeans', 'hierarchical')
            n_clusters: Number of clusters
            
        Returns:
            Array of cluster assignments
        """
        try:
            if len(embeddings) == 0:
                return np.array([])
            
            # Estimate number of clusters if not provided
            if n_clusters is None:
                n_clusters = max(2, int(np.sqrt(len(embeddings))))
            
            if method == "kmeans":
                from sklearn.cluster import KMeans
                kmeans = KMeans(n_clusters=n_clusters, random_state=42)
                labels = kmeans.fit_predict(embeddings)
                return labels
            
            elif method == "hierarchical":
                from scipy.cluster.hierarchy import linkage, fcluster
                Z = linkage(embeddings, method='ward')
                labels = fcluster(Z, n_clusters, criterion='maxclust') - 1
                return labels
            
            else:
                logger.warning(f"Unknown clustering method: {method}")
                return np.zeros(len(embeddings), dtype=int)
        except Exception as e:
            logger.error(f"Error clustering embeddings: {e}")
            return np.array([])
