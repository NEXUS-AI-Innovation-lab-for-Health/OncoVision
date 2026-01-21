from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4
from io import BytesIO
import math
import shutil

from PIL import Image
from openslide.lowlevel import OpenSlideUnsupportedFormatError
from database.s3.connection import S3Connection
from utils.image import (
    ImageFormat,
    MedicalImage,
    OpenSlideImage,
    PillowImage,
    load_dicom_as_pillow,
    load_tiff_as_pillow,
    _deepzoom_level_dims,
    _encode_webp,
)

@dataclass(frozen=True)
class ImageRecord:
    id: str
    kind: ImageFormat
    bucket: str
    source_key: str
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

    def register_and_upload_levels(self, kind: ImageFormat, image_path: Path, *, debug: bool = False) -> ImageRecord:
        image_id = uuid4().hex

        # Open the image once to compute info
        medical_img = self._open_image(kind, image_path)
        info = medical_img.info()

        # Store source file in object storage (lazy tiles generated on demand)
        source_suffix = image_path.suffix or ".img"
        source_key = f"{image_id}/source{source_suffix}"
        self.fs.put(str(image_path), f"{self.bucket}/{source_key}")

        record = ImageRecord(
            id=image_id,
            kind=kind,
            bucket=self.bucket,
            source_key=source_key,
            levels=info.levels,
            width=info.width,
            height=info.height,
            tile_size=info.tile_size,
        )
        self._records[image_id] = record

        if debug:
            print(
                f"[registry] source uploaded for {image_id}, "
                f"size={info.width}x{info.height}, levels={info.levels}"
            )
        return record

    def get(self, image_id: str) -> ImageRecord:
        record = self._records.get(image_id)
        if not record:
            raise KeyError(image_id)
        return record

    def get_level_png(self, image_id: str, level: int) -> bytes:
        record = self.get(image_id)
        if level < 0 or level >= record.levels:
            raise ValueError("Invalid level")

        # Cache: si le level complet a déjà été assemblé, on le renvoie directement.
        # Ça évite de relire/décoder/coller toutes les tuiles à chaque requête.
        level_key = f"{image_id}/level_{level}.webp"
        if self.fs.exists(f"{self.bucket}/{level_key}"):
            with self.fs.open(f"{self.bucket}/{level_key}", 'rb') as f:
                return f.read()

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
                tile_img.load()

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

        level_bytes = _encode_webp(level_img)
        # Enregistre le cache pour les prochaines requêtes.
        self.fs.pipe(f"{self.bucket}/{level_key}", level_bytes)
        return level_bytes

    def get_tile_png(self, image_id: str, level: int, tx: int, ty: int) -> bytes:
        tile_key = f"{image_id}/{level}/{tx}_{ty}.webp"
        try:
            with self.fs.open(f"{self.bucket}/{tile_key}", 'rb') as f:
                return f.read()
        except FileNotFoundError:
            record = self.get(image_id)
            # Génération à la demande
            local_source = self._ensure_source_local(record)
            medical_img = self._open_image(record.kind, local_source)
            tile_bytes = medical_img.tile_png(level, tx, ty)
            # Cache la tuile si on est dans des coordonnées valides
            self.fs.pipe(f"{self.bucket}/{tile_key}", tile_bytes)
            return tile_bytes

    def _ensure_source_local(self, record: ImageRecord) -> Path:
        source_suffix = Path(record.source_key).suffix
        local_path = Path(f"/tmp/{record.id}{source_suffix}")
        if local_path.exists():
            return local_path

        with self.fs.open(f"{record.bucket}/{record.source_key}", "rb") as src, open(local_path, "wb") as dst:
            shutil.copyfileobj(src, dst)
        return local_path

    def _open_image(self, kind: ImageFormat, path: Path) -> MedicalImage:
        if kind == "SVS":
            try:
                return OpenSlideImage(path)
            except OpenSlideUnsupportedFormatError:
                # Fallback: certains .dsv ne sont pas des SVS OpenSlide.
                # On tente DICOM puis TIFF.
                try:
                    pillow = load_dicom_as_pillow(path)
                    return PillowImage(pillow)
                except Exception:
                    pillow = load_tiff_as_pillow(path)
                    return PillowImage(pillow)
        if kind == "DICOM":
            pillow = load_dicom_as_pillow(path)
            return PillowImage(pillow)
        if kind == "TIFF":
            pillow = load_tiff_as_pillow(path)
            return PillowImage(pillow)
        raise ValueError(f"Unsupported kind: {kind}")