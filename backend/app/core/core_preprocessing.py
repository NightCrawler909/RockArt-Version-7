"""
Image preprocessing and segmentation module.
Handles image preprocessing, UNet segmentation, and shape extraction.
"""

import cv2
import numpy as np
import logging
import os
from typing import List, Tuple, Optional
from PIL import Image
import uuid

from config import CONFIG

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """Handles image preprocessing and enhancement."""
    
    def __init__(self):
        """Initialize preprocessor with config values."""
        self.target_size = CONFIG.preprocessing.target_size
        self.brightness_range = CONFIG.preprocessing.brightness_range
        self.rotation_range = CONFIG.preprocessing.rotation_range
        self.zoom_range = CONFIG.preprocessing.zoom_range
        self.apply_clahe = CONFIG.preprocessing.apply_clahe
        self.clahe_clip_limit = CONFIG.preprocessing.clahe_clip_limit
        self.compress_quality = CONFIG.preprocessing.compress_quality
    
    def preprocess_image(self, image_path: str, output_dir: str = None) -> Optional[str]:
        """Preprocess raw image for analysis.
        
        Args:
            image_path: Path to input image
            output_dir: Directory to save processed image (uses config default if None)
            
        Returns:
            Path to preprocessed image or None if failed
        """
        try:
            logger.info(f"Preprocessing image: {image_path}")
            
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Failed to read image: {image_path}")
                return None
            
            # Convert to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize to target size
            img = cv2.resize(img, self.target_size, interpolation=cv2.INTER_LANCZOS4)
            
            # Normalize
            img = img.astype(np.float32) / 255.0

            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            if self.apply_clahe:
                img = self._apply_clahe(img)
            
            # Save preprocessed image
            output_dir = output_dir or CONFIG.paths.processed_dir
            os.makedirs(output_dir, exist_ok=True)
            
            filename = os.path.splitext(os.path.basename(image_path))[0] + "_processed.jpg"
            output_path = os.path.join(output_dir, filename)
            
            # Convert back to 0-255 range for saving
            img_uint8 = (img * 255).astype(np.uint8)
            img_bgr = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2BGR)
            
            # Save with compression
            cv2.imwrite(output_path, img_bgr, 
                       [cv2.IMWRITE_JPEG_QUALITY, self.compress_quality])
            
            logger.info(f"Preprocessed image saved: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return None
    
    def _apply_clahe(self, img: np.ndarray) -> np.ndarray:
        """Apply CLAHE enhancement to image.
        
        Args:
            img: Input image array (RGB)
            
        Returns:
            Enhanced image array
        """
        try:
            # Convert to LAB color space
            img_lab = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2LAB)
            
            # Apply CLAHE to L channel
            clahe = cv2.createCLAHE(
                clipLimit=self.clahe_clip_limit,
                tileGridSize=(8, 8)
            )
            img_lab[:,:,0] = clahe.apply(img_lab[:,:,0])
            
            # Convert back to RGB
            img_enhanced = cv2.cvtColor(img_lab, cv2.COLOR_LAB2RGB)
            return img_enhanced.astype(np.float32) / 255.0
        except Exception as e:
            logger.warning(f"CLAHE enhancement failed: {e}")
            return img
    
    def load_image_array(self, image_path: str) -> Optional[np.ndarray]:
        """Load image and return as normalized array.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Normalized image array or None if failed
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return None
            
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (CONFIG.model.image_size, CONFIG.model.image_size))
            return img.astype(np.float32)
        except Exception as e:
            logger.error(f"Error loading image: {e}")
            return None


class ShapeSegmenter:
    """Segments shapes from preprocessed images using contour detection."""
    
    def __init__(self):
        """Initialize segmenter."""
        self.min_object_size = CONFIG.segmentation.min_object_size
    
    def segment_shapes(self, image_path: str, output_dir: str = None) -> List[Tuple[str, str]]:
        """Segment shapes from image using contour detection.
        
        Args:
            image_path: Path to preprocessed image
            output_dir: Directory to save segmented shapes
            
        Returns:
            List of (shape_id, shape_path) tuples
        """
        try:
            logger.info(f"Segmenting shapes from: {image_path}")
            
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Failed to read image: {image_path}")
                return []
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply binary threshold
            _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
            # Find contours
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            output_dir = output_dir or CONFIG.paths.shapes_dir
            os.makedirs(output_dir, exist_ok=True)
            
            shapes = []
            for i, contour in enumerate(contours):
                # Filter by size
                area = cv2.contourArea(contour)
                if area < self.min_object_size:
                    continue
                
                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)
                
                # Extract shape region
                shape_region = img[y:y+h, x:x+w]
                
                # Create mask
                mask = np.zeros((h, w), dtype=np.uint8)
                contour_shifted = contour - np.array([x, y])
                cv2.drawContours(mask, [contour_shifted], 0, 255, -1)
                
                # Apply mask: Convert to BGRA and use mask as alpha channel
                shape_bgra = cv2.cvtColor(shape_region, cv2.COLOR_BGR2BGRA)
                shape_bgra[:, :, 3] = mask
                
                # Resize to standard size
                shape_img = cv2.resize(shape_bgra, (128, 128))
                
                # Save shape
                shape_id = str(uuid.uuid4())
                shape_path = os.path.join(output_dir, f"{shape_id}.png")
                cv2.imwrite(shape_path, shape_img)
                
                shapes.append((shape_id, shape_path))
                logger.debug(f"Extracted shape {shape_id}: area={area}")
            
            logger.info(f"Extracted {len(shapes)} shapes from image")
            return shapes
        except Exception as e:
            logger.error(f"Error segmenting shapes: {e}")
            return []
    
    def extract_shape_by_contour(self, image: np.ndarray, contour: np.ndarray) -> np.ndarray:
        """Extract a single shape by contour.
        
        Args:
            image: Input image array
            contour: Contour points
            
        Returns:
            Extracted shape region
        """
        try:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Pad region slightly
            pad = 5
            x = max(0, x - pad)
            y = max(0, y - pad)
            w = min(image.shape[1] - x, w + 2*pad)
            h = min(image.shape[0] - y, h + 2*pad)
            
            shape_region = image[y:y+h, x:x+w].copy()
            
            # Create mask
            mask = np.zeros((h, w, 1), dtype=np.uint8)
            contour_shifted = contour - np.array([x, y])
            cv2.drawContours(mask, [contour_shifted], 0, 255, -1)
            
            # Apply mask: Convert to BGRA and use mask as alpha channel
            shape_bgra = cv2.cvtColor(shape_region, cv2.COLOR_BGR2BGRA)
            shape_bgra[:, :, 3] = mask[:, :, 0]
            
            # Resize to standard size
            shape_img = cv2.resize(shape_bgra, (128, 128))
            
            return shape_img
        except Exception as e:
            logger.error(f"Error extracting shape: {e}")
            return None
    
    def batch_segment(self, image_paths: List[str]) -> List[Tuple[str, str]]:
        """Segment shapes from multiple images.
        
        Args:
            image_paths: List of image paths
            
        Returns:
            List of (shape_id, shape_path) tuples
        """
        all_shapes = []
        
        for image_path in image_paths:
            try:
                shapes = self.segment_shapes(image_path)
                all_shapes.extend(shapes)
            except Exception as e:
                logger.error(f"Error processing {image_path}: {e}")
                continue
        
        logger.info(f"Segmented {len(all_shapes)} shapes from {len(image_paths)} images")
        return all_shapes


class ShapeAnalyzer:
    """Analyze and extract features from segmented shapes."""
    
    @staticmethod
    def compute_shape_features(shape_image: np.ndarray) -> dict:
        """Compute morphological features from shape image.
        
        Args:
            shape_image: Shape image array
            
        Returns:
            Dictionary with shape features
        """
        try:
            # Convert to grayscale if needed
            if len(shape_image.shape) == 3:
                gray = cv2.cvtColor(shape_image, cv2.COLOR_BGR2GRAY)
            else:
                gray = shape_image
            
            # Threshold
            _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            
            # Contour
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if len(contours) == 0:
                return {}
            
            contour = max(contours, key=cv2.contourArea)
            
            # Compute features
            area = cv2.contourArea(contour)
            perimeter = cv2.arcLength(contour, True)
            
            # Circularity (4π * Area / Perimeter²)
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter ** 2)
            else:
                circularity = 0
            
            # Solidity (contour area / convex hull area)
            hull = cv2.convexHull(contour)
            hull_area = cv2.contourArea(hull)
            solidity = area / hull_area if hull_area > 0 else 0
            
            # Aspect ratio
            rect = cv2.minAreaRect(contour)
            aspect_ratio = float(max(rect[1])) / float(min(rect[1])) if min(rect[1]) > 0 else 0
            
            return {
                "area": float(area),
                "perimeter": float(perimeter),
                "circularity": float(circularity),
                "solidity": float(solidity),
                "aspect_ratio": float(aspect_ratio),
                "centroid": tuple(np.mean(contour, axis=0)[0].astype(int))
            }
        except Exception as e:
            logger.error(f"Error computing shape features: {e}")
            return {}
