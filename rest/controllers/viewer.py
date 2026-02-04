from __future__ import annotations

from pathlib import Path
from uuid import uuid4
import time
import shutil
import zipfile

from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from api.controller import Controller
from registry.registry import ImageRegistry, ImageRecord
from utils.image import (
    ImageFormat,
    detect_format_from_path,
)
from database.s3.connection import S3Connection

class ViewerController(Controller):

    def __init__(self, s3_connection: S3Connection) -> None:
        super().__init__("viewer")

        bucket = "images"  # You can make this configurable

        self.registry = ImageRegistry(s3_connection, bucket)

        self.add_api_route("/images", self.upload_image, methods=["POST"])
        self.add_api_route("/images/{image_id}/info", self.get_info, methods=["GET"])
        self.add_api_route("/images/{image_id}.dzi", self.get_dzi, methods=["GET"])
        self.add_api_route(
            "/images/{image_id}/level/{level}.webp",
            self.get_level_png,
            methods=["GET"],
        )
        self.add_api_route(
            "/images/{image_id}/tile/{level}/{tx}_{ty}.webp",
            self.get_tile_png,
            methods=["GET"],
        )

    async def upload_image(
        self,
        file: UploadFile = File(...),
        kind: ImageFormat | None = Form(default=None),
    ):
        filename = file.filename or "upload"

        if kind is None:
            detected = detect_format_from_path(Path(filename))
            if detected is None and filename.lower().endswith(".zip"):
                detected = "DEEPZOOM"
            print(f"Detected image format: {detected}")
            if detected is None:
                raise HTTPException(status_code=400, detail="Could not detect image format from filename. Please specify 'kind' explicitly.")
            kind = detected

        # Save temporarily to process
        temp_path = Path(f"/tmp/{uuid4().hex}_{filename}")
        content = await file.read()
        temp_path.write_bytes(content)
        extracted_dir: Path | None = None
        source_path = temp_path

        try:
            if kind == "DEEPZOOM":
                suffix = temp_path.suffix.lower()
                if suffix == ".zip":
                    extracted_dir = Path(f"/tmp/{uuid4().hex}_dzi")
                    extracted_dir.mkdir(parents=True, exist_ok=True)
                    with zipfile.ZipFile(temp_path, "r") as zf:
                        zf.extractall(extracted_dir)
                    dzi_candidates = list(extracted_dir.rglob("*.dzi"))
                    if not dzi_candidates:
                        raise ValueError("Archive .zip sans fichier .dzi")
                    source_path = dzi_candidates[0]
                elif suffix == ".dzi":
                    tiles_dir = temp_path.parent / f"{temp_path.stem}_files"
                    if not tiles_dir.exists():
                        raise ValueError(
                            "DZI sans tuiles. Uploadez un .zip contenant .dzi + _files."
                        )

            # Register and upload levels to S3
            print(f"Uploading image {filename} as kind {kind}...")
            started = time.perf_counter()
            record = self.registry.register_and_upload_levels(kind, source_path, debug=True)
            elapsed = time.perf_counter() - started
            print(f"Image {filename} uploaded with id {record.id} in {elapsed:.2f}s")

            # For info, we need to get dimensions - we'll need to modify registry to store this
            # For now, return basic info
            return {
                "id": record.id,
                "kind": record.kind,
                "levels": record.levels,
                "dzi": f"/viewer/images/{record.id}.dzi",
                "info": f"/viewer/images/{record.id}/info",
                "levelUrlTemplate": f"/viewer/images/{record.id}/level/{{level}}.webp",
            }
        except ValueError as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=str(e))
        finally:
            # Clean up temp file
            temp_path.unlink(missing_ok=True)
            if extracted_dir:
                shutil.rmtree(extracted_dir, ignore_errors=True)

    def get_info(self, image_id: str):
        record = self._get_record(image_id)
        return {
            "id": record.id,
            "kind": record.kind,
            "width": record.width,
            "height": record.height,
            "levels": record.levels,
            "tileSize": record.tile_size,
        }

    def get_dzi(self, image_id: str):
        record = self._get_record(image_id)

        dzi = (
            f"<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            f"<Image xmlns=\"http://schemas.microsoft.com/deepzoom/2008\" "
            f"Format=\"webp\" Overlap=\"0\" TileSize=\"{record.tile_size}\">"
            f"<Size Width=\"{record.width}\" Height=\"{record.height}\"/>"
            f"</Image>"
        )
        return Response(content=dzi, media_type="application/xml")

    def get_level_png(self, image_id: str, level: int):
        record = self._get_record(image_id)
        if level < 0 or level >= record.levels:
            raise HTTPException(status_code=404, detail="Invalid level")

        try:
            png_bytes = self.registry.get_level_png(image_id, level)
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))

        return Response(content=png_bytes, media_type="image/webp")

    def get_tile_png(self, image_id: str, level: int, tx: int, ty: int):
        record = self._get_record(image_id)
        if level < 0 or level >= record.levels:
            raise HTTPException(status_code=404, detail="Invalid level")

        try:
            png_bytes = self.registry.get_tile_png(image_id, level, tx, ty)
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))

        return Response(content=png_bytes, media_type="image/webp")

    def _get_record(self, image_id: str) -> ImageRecord:
        try:
            return self.registry.get(image_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Unknown image id")
