from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import IO

from PIL import Image, ImageOps


def _open_image(input_image: Image.Image | str | Path | bytes | IO[bytes]) -> Image.Image:
    
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
    input_image: Image.Image | str | Path | bytes | IO[bytes],
    dest_format: str = "PNG",
    frame: int | None = None,
    all_frames: bool = False,
    quality: int = 95,
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
