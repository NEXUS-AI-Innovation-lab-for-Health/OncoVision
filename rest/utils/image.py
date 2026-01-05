from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import IO, Union
import numpy as np
import pydicom
import io
import openslide
from openslide.deepzoom import DeepZoomGenerator
import tempfile
import os

from PIL import Image, ImageOps

InputType = Union[Image.Image, str, Path, bytes, IO[bytes]]

def _open_image(input_image: InputType) -> Image.Image:
    
    if isinstance(input_image, Image.Image):
        return input_image.copy()

    if isinstance(input_image, (str, Path)):
        return Image.open(str(input_image))

    if isinstance(input_image, (bytes, bytearray)):
        return Image.open(BytesIO(input_image))

    read_attr = getattr(input_image, "read", None)
    if callable(read_attr):
        return Image.open(input_image)

    raise TypeError("Unsupported input type for image. Provide a PIL Image, file path, bytes, or file-like object.")


def convert_image(
    input_image: InputType,
    dest_format: str = "PNG",
    frame: int | None = None,
    all_frames: bool = False,
    background_color: tuple[int, int, int] = (255, 255, 255),
) -> Image.Image | list[Image.Image]:
    
    img = _open_image(input_image)

    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    
    is_animated = getattr(img, "is_animated", False) or getattr(img, "n_frames", 1) > 1

    if is_animated and all_frames:
        frames: list[Image.Image] = []
        try:
            for i in range(getattr(img, "n_frames", 1)):
                img.seek(i)
                frame_img = ImageOps.exif_transpose(img.copy())
                frames.append(_convert_single(frame_img, dest_format, background_color))
        finally:
            try:
                img.seek(0)
            except Exception:
                pass
        return frames

    if is_animated:
        try:
            idx = frame if frame is not None else 0
            img.seek(idx)
        except Exception:
            img.seek(0)

    converted = _convert_single(img, dest_format, background_color)
    
    return converted


def _convert_single(img: Image.Image, dest_format: str, background_color: tuple[int, int, int]) -> Image.Image:
    target_format = dest_format.upper()

    
    if target_format in ("JPEG", "JPG"):
        
        if "A" in img.getbands():
            bg = Image.new("RGB", img.size, background_color)
            bg.paste(img.convert("RGBA"), mask=img.convert("RGBA").split()[-1])
            img = bg
        else:
            if img.mode != "RGB":
                img = img.convert("RGB")
        return img

    
    if target_format in ("PNG", "WEBP", "TIFF"):
        
        if img.mode == "P":
            img = img.convert("RGBA")
            return img
        
        if img.mode not in ("RGBA", "RGB", "L"):
            img = img.convert("RGBA")
        return img

    
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    return img


def image_to_bytes(img: Image.Image, dest_format: str = "PNG", quality: int = 95) -> bytes:
    buf = BytesIO()
    save_kwargs = {"format": dest_format}
    if dest_format.upper() in ("JPEG", "JPG"):
        save_kwargs["quality"] = quality
        if img.mode == "RGBA":
            img = img.convert("RGB")
    img.save(buf, **save_kwargs)
    buf.seek(0)
    return buf.getvalue()

def load_dicom(input_image: InputType) -> Image.Image:
    
    if isinstance(input_image, Image.Image):
        return input_image

    if isinstance(input_image, (str, Path)):
        ds = pydicom.dcmread(str(input_image))
    elif isinstance(input_image, bytes):
        ds = pydicom.dcmread(io.BytesIO(input_image))
    elif hasattr(input_image, "read"):
        ds = pydicom.dcmread(input_image)
    else:
        raise TypeError(f"Type d'entrée non supporté : {type(input_image)}")

    pixel_array = ds.pixel_array.astype(np.float32)

    slope = float(ds.get("RescaleSlope", 1))
    intercept = float(ds.get("RescaleIntercept", 0))
    pixel_array = pixel_array * slope + intercept

    wc = ds.get("WindowCenter")
    ww = ds.get("WindowWidth")

    if wc is not None and ww is not None:
        wc = float(wc[0] if isinstance(wc, pydicom.multival.MultiValue) else wc)
        ww = float(ww[0] if isinstance(ww, pydicom.multival.MultiValue) else ww)

        min_val = wc - ww / 2
        max_val = wc + ww / 2
        pixel_array = np.clip(pixel_array, min_val, max_val)

    pixel_array -= pixel_array.min()
    if pixel_array.max() > 0:
        pixel_array /= pixel_array.max()
    pixel_array *= 255
    pixel_array = pixel_array.astype(np.uint8)

    return Image.fromarray(pixel_array, mode="L")

def wsi_to_image(
    input_image: str | Path | bytes | IO[bytes],
    level: int = 0,
    x: int = 0,
    y: int = 0,
    size: int = 512,
    overview: bool = False,
) -> Image.Image:

    temp_file = None

    if isinstance(input_image, (str, Path)):
        slide = openslide.OpenSlide(str(input_image))

    elif isinstance(input_image, bytes):
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wsi")
        temp_file.write(input_image)
        temp_file.close()
        slide = openslide.OpenSlide(temp_file.name)

    elif hasattr(input_image, "read"):
        data = input_image.read()
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wsi")
        temp_file.write(data)
        temp_file.close()
        slide = openslide.OpenSlide(temp_file.name)

    else:
        raise TypeError(f"Type d'entrée non supporté pour WSI : {type(input_image)}")

    try:

        if overview:
            level = slide.level_count - 1
            w, h = slide.level_dimensions[level]
            img = slide.read_region((0, 0), level, (w, h))
            return img.convert("RGB")

        scale = slide.level_downsamples[level]
        x0 = int(x * scale)
        y0 = int(y * scale)

        img = slide.read_region(
            (x0, y0),
            level,
            (size, size)
        )

        return img.convert("RGB")

    finally:
        slide.close()


def convert_wsi_to_dzi(
    input_image: InputType,
    output_dir: str | Path,
    slide_name: str = "slide",
    tile_size: int = 254,
    overlap: int = 1,
    limit_bounds: bool = False,
    image_format: str = "jpeg",
    quality: int = 90
) -> None:
    
    output_path = Path(output_dir)
    
    if not output_path.exists():
        output_path.mkdir(parents=True, exist_ok=True)
        
    slide = None
    temp_file = None

    try:
        if isinstance(input_image, (str, Path)):
            input_path = Path(input_image)
            slide_name = input_path.stem
            slide = openslide.OpenSlide(str(input_path))
        
        elif isinstance(input_image, Image.Image):
            slide = openslide.ImageSlide(input_image)
            
        elif isinstance(input_image, bytes):
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wsi")
            temp_file.write(input_image)
            temp_file.close()
            slide = openslide.OpenSlide(temp_file.name)
            
        elif hasattr(input_image, "read"):
            data = input_image.read()
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wsi")
            temp_file.write(data)
            temp_file.close()
            slide = openslide.OpenSlide(temp_file.name)
        else:
             raise TypeError(f"Unsupported input type: {type(input_image)}")
    
        dz = DeepZoomGenerator(slide, tile_size=tile_size, overlap=overlap, limit_bounds=limit_bounds)
        
        # Write .dzi file
        dzi_path = output_path / f"{slide_name}.dzi"
        with open(dzi_path, "w") as f:
            f.write(dz.get_dzi(image_format))
            
        # Write tiles
        files_dir = output_path / f"{slide_name}_files"
        files_dir.mkdir(exist_ok=True)
        
        for level in range(dz.level_count):
            level_dir = files_dir / str(level)
            level_dir.mkdir(exist_ok=True)
            
            cols, rows = dz.level_tiles[level]
            
            for col in range(cols):
                for row in range(rows):
                    tile = dz.get_tile(level, (col, row))
                    tile_path = level_dir / f"{col}_{row}.{image_format}"
                    
                    if image_format.lower() in ("jpeg", "jpg"):
                        tile.save(tile_path, quality=quality)
                    else:
                        tile.save(tile_path)
    finally:
        if slide is not None:
            slide.close()
        if temp_file is not None and os.path.exists(temp_file.name):
            os.remove(temp_file.name)
