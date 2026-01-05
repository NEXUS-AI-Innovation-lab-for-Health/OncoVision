from __future__ import annotations

from io import BytesIO
import os
from pathlib import Path
from typing import IO, Union
import numpy as np
import pydicom
import io
import openslide
import tifffile
import tempfile
import math

from PIL import Image, ImageOps

InputType = Union[Image.Image, str, Path, bytes, IO[bytes], openslide.OpenSlide]

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



def image_to_bytes(img: Image.Image | np.ndarray, dest_format: str = "PNG", quality: int = 95) -> bytes:
    dest = dest_format.upper()
    buf = BytesIO()

    # numpy array handling
    if isinstance(img, np.ndarray):
        arr = img
        # normalize dtype if needed
        if arr.dtype != np.uint8:
            arr = np.clip(arr, 0, 255).astype(np.uint8)

        if dest in ("OME_TIFF", "OME-TIFF", "TIFF", "TIF"):
            # Choose photometric based on array shape
            if arr.ndim == 2:
                tifffile.imwrite(buf, arr, photometric="minisblack", bigtiff=True, metadata={"axes": "YX"})
            elif arr.ndim == 3 and arr.shape[2] in (3, 4):
                tifffile.imwrite(buf, arr, photometric="rgb", bigtiff=True, metadata={"axes": "YXC"})
            else:
                tifffile.imwrite(buf, arr, bigtiff=True)
            buf.seek(0)
            return buf.getvalue()
        else:
            pil = Image.fromarray(arr)
            save_kwargs = {"format": dest}
            if dest in ("JPEG", "JPG"):
                save_kwargs["quality"] = quality
                if pil.mode == "RGBA":
                    pil = pil.convert("RGB")
            pil.save(buf, **save_kwargs)
            buf.seek(0)
            return buf.getvalue()

    # PIL Image handling
    if isinstance(img, Image.Image):
        pil = img
        try:
            pil = ImageOps.exif_transpose(pil)
        except Exception:
            pass

        if dest in ("OME_TIFF", "OME-TIFF", "TIFF", "TIF"):
            arr = np.array(pil.convert("RGB"))
            tifffile.imwrite(buf, arr, photometric="rgb", bigtiff=True, metadata={"axes": "YXC"})
            buf.seek(0)
            return buf.getvalue()

        save_kwargs = {"format": dest}
        if dest in ("JPEG", "JPG"):
            save_kwargs["quality"] = quality
            if pil.mode == "RGBA":
                pil = pil.convert("RGB")
        pil.save(buf, **save_kwargs)
        buf.seek(0)
        return buf.getvalue()

    raise TypeError("Unsupported input for image_to_bytes. Provide a PIL Image or a numpy.ndarray.")


def image_to_byte(input_image: InputType | np.ndarray, dest_format: str = "PNG", quality: int = 95) -> bytes:
    if isinstance(input_image, np.ndarray):
        return image_to_bytes(input_image, dest_format=dest_format, quality=quality)

    if isinstance(input_image, Image.Image):
        return image_to_bytes(input_image, dest_format=dest_format, quality=quality)

    # path/bytes/file-like -> open as PIL image
    pil = _open_image(input_image)
    return image_to_bytes(pil, dest_format=dest_format, quality=quality)

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

    slide, temp_file = load_svs(input_image)

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
        if temp_file is not None:
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


def load_svs(input_svs: InputType):
    temp_file = None

    # Si l'utilisateur passe déjà un objet OpenSlide
    if isinstance(input_svs, openslide.OpenSlide):
        return input_svs, None

    if isinstance(input_svs, (str, Path)):
        slide = openslide.OpenSlide(str(input_svs))
    elif isinstance(input_svs, (bytes, bytearray)):
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wsi")
        temp_file.write(input_svs)
        temp_file.close()
        slide = openslide.OpenSlide(temp_file.name)
    elif hasattr(input_svs, "read"):
        data = input_svs.read()
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wsi")
        temp_file.write(data)
        temp_file.close()
        slide = openslide.OpenSlide(temp_file.name)
    else:
        raise TypeError(f"Type d'entrée non supporté pour SVS : {type(input_svs)}")

    return slide, temp_file


def svs_to_dicom(
    input_svs: str | Path | bytes | IO[bytes],
    level: int = 0,
    x: int = 0,
    y: int = 0,
    size: int | None = None,
    jpeg_quality: int = 90,
    patient_name: str = "ANON",
    patient_id: str = "0000",
) -> pydicom.dataset.FileDataset:
    slide, temp_file = load_svs(input_svs)

    try:
        # Choisir la région / taille
        if size is None:
            w, h = slide.level_dimensions[level]
            x0, y0 = int(x * slide.level_downsamples[level]), int(y * slide.level_downsamples[level])
            width, height = w - x0, h - y0
        else:
            scale = slide.level_downsamples[level]
            x0 = int(x * scale)
            y0 = int(y * scale)
            width = height = int(size)

        img = slide.read_region((x0, y0), level, (width, height)).convert("RGB")

        # Encode en JPEG en mémoire
        jpeg_buf = BytesIO()
        img.save(jpeg_buf, format="JPEG", quality=jpeg_quality, optimize=True)
        jpeg_bytes = jpeg_buf.getvalue()

        # Construire le dataset DICOM
        file_meta = pydicom.dataset.FileMetaDataset()
        sop_instance_uid = pydicom.uid.generate_uid()
        sop_class_uid = pydicom.uid.SecondaryCaptureImageStorage
        file_meta.MediaStorageSOPClassUID = sop_class_uid
        file_meta.MediaStorageSOPInstanceUID = sop_instance_uid
        file_meta.TransferSyntaxUID = pydicom.uid.JPEGBaseline

        ds = pydicom.dataset.FileDataset(
            "",
            {},
            file_meta=file_meta,
            preamble=b"\0" * 128,
        )

        # Identifiants de base
        ds.PatientName = patient_name
        ds.PatientID = patient_id
        ds.StudyInstanceUID = pydicom.uid.generate_uid()
        ds.SeriesInstanceUID = pydicom.uid.generate_uid()
        ds.SOPInstanceUID = sop_instance_uid
        ds.SOPClassUID = sop_class_uid

        ds.Modality = "OT"
        ds.SeriesNumber = "1"
        ds.InstanceNumber = "1"

        # Image pixel data (JPEG encapsulé)
        ds.Rows = height
        ds.Columns = width
        ds.SamplesPerPixel = 3
        ds.PhotometricInterpretation = "YBR_FULL"
        ds.PlanarConfiguration = 0
        ds.BitsAllocated = 8
        ds.BitsStored = 8
        ds.HighBit = 7
        ds.PixelRepresentation = 0

        # Encapsuler le JPEG
        try:
            encapsulated = pydicom.encaps.encapsulate([jpeg_bytes])
            ds.PixelData = encapsulated
        except Exception:
            # fallback: stocker en PixelData brut (démontre l'intention, mais rarement utile)
            ds.PixelData = jpeg_bytes

        # Indiquer que le transfert est compressé
        ds.is_little_endian = True
        ds.is_implicit_VR = False

        # Date/heure
        import datetime

        dt = datetime.datetime.now()
        ds.StudyDate = dt.strftime("%Y%m%d")
        ds.StudyTime = dt.strftime("%H%M%S")

        return ds

    finally:
        slide.close()
        if temp_file is not None:
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


def svs_to_ome_tiff(
    input_svs: str | Path | bytes | IO[bytes],
    level: int = 0,
) -> Image.Image:
    slide, temp_file = load_svs(input_svs)

    try:
        w, h = slide.level_dimensions[level]
        img = slide.read_region((0, 0), level, (w, h)).convert("RGB")
        return img

    finally:
        slide.close()
        if temp_file is not None:
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


def svs_to_deepzoom(
    input_svs: str | Path | bytes | IO[bytes],
    tile_size: int = 256,
    overlap: int = 1,
) -> dict:
    """
    Convertit une image SVS en structure de données DeepZoom en mémoire.

    Args:
        input_svs: Chemin vers le fichier SVS ou données
        tile_size: Taille des tuiles (par défaut 256)
        overlap: Chevauchement des tuiles (par défaut 1)

    Returns:
        Dictionnaire contenant les métadonnées et les tuiles DeepZoom
    """
    slide, temp_file = load_svs(input_svs)

    try:
        # Dimensions du niveau le plus élevé (résolution maximale)
        max_level = slide.level_count - 1
        max_width, max_height = slide.level_dimensions[max_level]

        # Structure de données DeepZoom
        deepzoom_data = {
            "tile_size": tile_size,
            "overlap": overlap,
            "format": "jpeg",
            "width": max_width,
            "height": max_height,
            "levels": {}
        }

        # Pour chaque niveau de zoom (du plus bas au plus élevé)
        for level in range(slide.level_count):
            level_width, level_height = slide.level_dimensions[level]
            downsample = slide.level_downsamples[level]

            # Calculer le nombre de tuiles
            tiles_x = math.ceil(level_width / tile_size)
            tiles_y = math.ceil(level_height / tile_size)

            level_tiles = {}
            for tile_y in range(tiles_y):
                for tile_x in range(tiles_x):
                    # Coordonnées de la tuile
                    x = tile_x * tile_size
                    y = tile_y * tile_size

                    # Ajuster pour le chevauchement
                    if overlap > 0:
                        x = max(0, x - overlap)
                        y = max(0, y - overlap)

                    # Taille de la tuile avec chevauchement
                    tile_width = min(tile_size + 2 * overlap, level_width - x)
                    tile_height = min(tile_size + 2 * overlap, level_height - y)

                    # Lire la région
                    region = slide.read_region((x, y), level, (tile_width, tile_height))
                    region = region.convert("RGB")

                    # Recadrer si nécessaire pour enlever le chevauchement
                    if overlap > 0:
                        region = region.crop((overlap, overlap, overlap + tile_size, overlap + tile_size))

                    # Stocker la tuile en mémoire
                    level_tiles[f"{tile_x}_{tile_y}"] = region

            deepzoom_data["levels"][str(level)] = {
                "width": level_width,
                "height": level_height,
                "tiles_x": tiles_x,
                "tiles_y": tiles_y,
                "tiles": level_tiles
            }

        return deepzoom_data

    finally:
        slide.close()
        if temp_file is not None:
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


def svs_convert(
    input_svs: str | Path | bytes | IO[bytes],
    output_type: str = "dicom",
    **kwargs,
):
    t = output_type.lower()
    if t == "dicom":
        return svs_to_dicom(input_svs, **kwargs)
    if t in ("ome_tiff", "tiff", "wsi"):
        return svs_to_ome_tiff(input_svs, **kwargs)
    if t == "deepzoom":
        return svs_to_deepzoom(input_svs, **kwargs)

    raise ValueError(f"Format de sortie non supporté: {output_type}")
