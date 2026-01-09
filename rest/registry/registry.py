from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4
from io import BytesIO
import math

from PIL import Image
from database.s3.connection import S3Connection
from utils.image import (
    ImageFormat,
    MedicalImage,
    OpenSlideImage,
    PillowImage,
    detect_format_from_path,
    load_dicom_as_pillow,
    load_tiff_as_pillow,
    _deepzoom_levels,
    _deepzoom_level_dims,
    _encode_png,
    _transparent_tile,
)

@dataclass(frozen=True)
class ImageRecord:
    id: str
    kind: ImageFormat
    bucket: str
    levels: int
    width: int
    height: int
    tile_size: int = 256

class ImageRegistry:

    def __init__(self, s3_connection: S3Connection, bucket: str) -> None:
        self.s3_conn = s3_connection
        self.bucket = bucket
        self.fs = self.s3_conn.get_session()
        # Ensure bucket exists
        if not self.fs.exists(f"{self.bucket}/"):
            self.fs.mkdir(f"{self.bucket}/")
        self._records: dict[str, ImageRecord] = {}

    def register_and_upload_levels(self, kind: ImageFormat, image_path: Path) -> ImageRecord:
        image_id = uuid4().hex

        # Open the image
        medical_img = self._open_image(kind, image_path)
        info = medical_img.info()

        # Generate and upload tiles for each level
        for level in range(info.levels):
            self._upload_level_tiles(medical_img, image_id, level, info)

        record = ImageRecord(id=image_id, kind=kind, bucket=self.bucket, levels=info.levels, width=info.width, height=info.height, tile_size=info.tile_size)
        self._records[image_id] = record
        return record

    def _upload_level_tiles(self, medical_img: MedicalImage, image_id: str, level: int, info) -> None:
        """Generate and upload all tiles for a given level"""
        max_level = info.levels - 1
        level = max(0, min(level, max_level))

        level_w, level_h = _deepzoom_level_dims(info.width, info.height, level, max_level)

        tiles_x = int(math.ceil(level_w / info.tile_size))
        tiles_y = int(math.ceil(level_h / info.tile_size))

        for tx in range(tiles_x):
            for ty in range(tiles_y):
                tile_png = medical_img.tile_png(level, tx, ty)
                tile_key = f"{image_id}/{level}/{tx}_{ty}.png"
                with self.fs.open(f"{self.bucket}/{tile_key}", 'wb') as f:
                    f.write(tile_png)

    def get(self, image_id: str) -> ImageRecord:
        record = self._records.get(image_id)
        if not record:
            raise KeyError(image_id)
        return record

    def get_level_png(self, image_id: str, level: int) -> bytes:
        record = self.get(image_id)
        if level < 0 or level >= record.levels:
            raise ValueError("Invalid level")

        max_level = record.levels - 1
        level_w, level_h = _deepzoom_level_dims(record.width, record.height, level, max_level)

        tiles_x = int(math.ceil(level_w / record.tile_size))
        tiles_y = int(math.ceil(level_h / record.tile_size))

        # Create a new image for the level
        level_img = Image.new("RGBA", (level_w, level_h), (0, 0, 0, 0))

        for tx in range(tiles_x):
            for ty in range(tiles_y):
                tile_png = self.get_tile_png(image_id, level, tx, ty)
                tile_img = Image.open(BytesIO(tile_png))

                # Calculate position
                x = tx * record.tile_size
                y = ty * record.tile_size

                # Ensure tile fits within level bounds
                tile_w = min(record.tile_size, level_w - x)
                tile_h = min(record.tile_size, level_h - y)

                if tile_w > 0 and tile_h > 0:
                    # If tile is smaller, crop it
                    if tile_img.width > tile_w or tile_img.height > tile_h:
                        tile_img = tile_img.crop((0, 0, tile_w, tile_h))
                    level_img.paste(tile_img, (x, y))

        return _encode_png(level_img)

    def get_tile_png(self, image_id: str, level: int, tx: int, ty: int) -> bytes:
        tile_key = f"{image_id}/{level}/{tx}_{ty}.png"
        try:
            with self.fs.open(f"{self.bucket}/{tile_key}", 'rb') as f:
                return f.read()
        except FileNotFoundError:
            # Return transparent tile if not found
            record = self.get(image_id)
            return _transparent_tile(record.tile_size)

    def _open_image(self, kind: ImageFormat, path: Path) -> MedicalImage:
        if kind == "SVS":
            return OpenSlideImage(path)
        if kind == "DICOM":
            pillow = load_dicom_as_pillow(path)
            return PillowImage(pillow)
        if kind == "TIFF":
            pillow = load_tiff_as_pillow(path)
            return PillowImage(pillow)
        raise ValueError(f"Unsupported kind: {kind}")