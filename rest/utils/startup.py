"""
Helper functions to initialize the application with patient data and registered images.
"""
from pathlib import Path
from typing import List
import time

from registry.registry import ImageRegistry
from models.patient import Patient
from utils.image import ImageFormat, detect_format_from_path


def auto_register_images(registry: ImageRegistry, images_dir: Path, debug: bool = False) -> dict[str, str]:
    """
    Automatically register all images from a directory.
    
    Args:
        registry: ImageRegistry instance to register images with
        images_dir: Path to directory containing images
        debug: Whether to print debug information
        
    Returns:
        Dictionary mapping image filenames to their registered IDs
    """
    image_map = {}
    
    if not images_dir.exists():
        if debug:
            print(f"[startup] Images directory not found: {images_dir}")
        return image_map
    
    # Get all files in the images directory
    image_files = [f for f in images_dir.iterdir() if f.is_file()]
    
    if debug:
        print(f"[startup] Found {len(image_files)} files in {images_dir}")
    
    for image_path in image_files:
        try:
            # Detect image format
            kind = detect_format_from_path(image_path)
            if kind is None:
                if debug:
                    print(f"[startup] Skipping {image_path.name}: unknown format")
                continue
            
            if debug:
                print(f"[startup] Registering {image_path.name} as {kind}...")
            
            started = time.perf_counter()
            record = registry.register_and_upload_levels(kind, image_path, debug=debug)
            elapsed = time.perf_counter() - started
            
            image_map[image_path.name] = record.id
            
            if debug:
                print(f"[startup] ✓ Registered {image_path.name} with ID {record.id} in {elapsed:.2f}s")
                
        except Exception as e:
            if debug:
                print(f"[startup] ✗ Failed to register {image_path.name}: {e}")
    
    return image_map


def create_sample_patients(image_map: dict[str, str]) -> List[Patient]:
    """
    Create sample patient data with image IDs from registered images.
    
    Args:
        image_map: Dictionary mapping image filenames to their registered IDs
        
    Returns:
        List of Patient objects with valid image IDs
    """
    # Get image IDs from the registered images
    image_ids = list(image_map.values())
    
    # Create patients with the registered image IDs
    patients = [
        Patient(
            id="1",
            name="Jean Dupont",
            image_id=image_ids[0] if len(image_ids) > 0 else None,
            age=58,
            gender="Masculin",
            date_of_birth="1966-03-15",
            diagnosis="Carcinome pulmonaire non à petites cellules",
            last_visit="2024-01-15",
            status="En traitement",
            medical_history="Antécédents de tabagisme. Diagnostic en 2023. Chimiothérapie en cours."
        ),
        Patient(
            id="2",
            name="Marie Curie",
            image_id=image_ids[1] if len(image_ids) > 1 else None,
            age=62,
            gender="Féminin",
            date_of_birth="1962-11-07",
            diagnosis="Cancer du sein triple négatif",
            last_visit="2024-01-20",
            status="Rémission",
            medical_history="Mastectomie partielle en 2022. Radiothérapie complétée. Suivi régulier."
        ),
        Patient(
            id="3",
            name="Pierre Curie",
            image_id=image_ids[0] if len(image_ids) > 0 else None,  # Reuse first image
            age=45,
            gender="Masculin",
            date_of_birth="1979-05-22",
            diagnosis="Mélanome de stade II",
            last_visit="2024-01-10",
            status="Surveillance",
            medical_history="Résection chirurgicale réussie. Biopsie du ganglion sentinelle négative."
        ),
    ]
    
    return patients
