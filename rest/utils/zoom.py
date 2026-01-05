from __future__ import annotations
from typing import List
from PIL import Image

def get_max_zoom_level(img: Image.Image, max_size: int = 2048) -> int:

    w, h = img.size
    max_dim = max(w, h)
    level = 0
    while max_dim < max_size:
        max_dim = max_dim * 2
        level += 1
        if level > 10:  # Prevent infinite loop or too many levels
            break
    return level

def slice_zoom_images(img: Image.Image, max_zoom_level: int | None = None) -> List[Image.Image]:

    if max_zoom_level is None:
        max_zoom_level = get_max_zoom_level(img)

    zoom_images = [img.copy()]
    current_img = img.copy()

    for i in range(1, max_zoom_level + 1):
        new_w = current_img.width * 2
        new_h = current_img.height * 2
        current_img = current_img.resize((new_w, new_h), Image.LANCZOS)
        zoom_images.append(current_img.copy())

    return zoom_images
