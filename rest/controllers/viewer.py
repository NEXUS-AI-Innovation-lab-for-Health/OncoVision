from __future__ import annotations

import tempfile
from pathlib import Path
from uuid import uuid4
import time

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
            print(f"Detected image format: {detected}")
            if detected is None:
                raise HTTPException(status_code=400, detail="Could not detect image format from filename. Please specify 'kind' explicitly.")
            kind = detected

        # Lire le contenu du fichier
        content = await file.read()

        # Utiliser tempfile pour créer un fichier temporaire valide
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".svs") as temp_file:
                temp_path = Path(temp_file.name)
                temp_path.write_bytes(content)

            # Register and upload levels to S3
            print(f"Uploading image {filename} as kind {kind}...")
            started = time.perf_counter()
            record = self.registry.register_and_upload_levels(kind, temp_path, debug=True)
            elapsed = time.perf_counter() - started
            print(f"Image {filename} uploaded with id {record.id} in {elapsed:.2f}s")

            # Retourner les informations de l'image
            return {
                "id": record.id,
                "kind": record.kind,
                "levels": record.levels,
                "dzi": f"/viewer/images/{record.id}.dzi",
                "info": f"/viewer/images/{record.id}/info",
                "levelUrlTemplate": f"/viewer/images/{record.id}/level/{{level}}.webp",
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            print(f"Erreur lors du traitement du fichier : {e}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
        finally:
            # Nettoyer le fichier temporaire
            if 'temp_path' in locals():
                temp_path.unlink(missing_ok=True)

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
            f"Format=\"webp\" Overlap=\"0\" TileSize=\"256\">"  # Assuming tile size 256 for DZI compatibility
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
