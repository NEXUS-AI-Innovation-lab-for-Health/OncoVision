from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from api.controller import Controller
from utils.image import (
    ImageFormat,
    DeepZoomImage,
    ImageInfo,
    MedicalImage,
    OpenSlideImage,
    PillowImage,
    detect_format_from_path,
    load_dicom_as_pillow,
    load_tiff_as_pillow,
)

@dataclass(frozen=True)
class ImageRecord:
    id: str
    kind: ImageFormat
    path: Path

class ImageRegistry:

    def __init__(self, storage_dir: Path) -> None:
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._records: dict[str, ImageRecord] = {}

    def register(self, kind: ImageFormat, path: Path) -> ImageRecord:
        image_id = uuid4().hex
        record = ImageRecord(id=image_id, kind=kind, path=path)
        self._records[image_id] = record
        return record

    def get(self, image_id: str) -> ImageRecord:
        record = self._records.get(image_id)
        if not record:
            raise KeyError(image_id)
        return record

class ViewerController(Controller):

    def __init__(self) -> None:
        super().__init__("viewer")

        storage_dir = Path("/Users/joao/Dev/SAE/rest/storage")
        self.registry = ImageRegistry(storage_dir)

        self.add_api_route("/images", self.upload_image, methods=["POST"])
        self.add_api_route("/images/{image_id}/info", self.get_info, methods=["GET"])
        self.add_api_route("/images/{image_id}.dzi", self.get_dzi, methods=["GET"])
        self.add_api_route(
            "/images/{image_id}/tile/{level}/{x}_{y}.png",
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
            if detected is None:
                raise HTTPException(status_code=400, detail="Could not detect image format from filename. Please specify 'kind' explicitly.")
            kind = detected

        image_dir = self.registry.storage_dir / uuid4().hex
        image_dir.mkdir(parents=True, exist_ok=True)

        target = image_dir / filename
        content = await file.read()
        target.write_bytes(content)

        record = self.registry.register(kind, target)
        info = self._open(record).info()
        return {
            "id": record.id,
            "kind": record.kind,
            "width": info.width,
            "height": info.height,
            "tileSize": info.tile_size,
            "levels": info.levels,
            "dzi": f"/viewer/images/{record.id}.dzi",
            "info": f"/viewer/images/{record.id}/info",
            "tileUrlTemplate": f"/viewer/images/{record.id}/tile/{{level}}/{{x}}_{{y}}.png",
        }

    def get_info(self, image_id: str):
        record = self._get_record(image_id)
        info = self._open(record).info()
        return {
            "id": record.id,
            "kind": record.kind,
            "width": info.width,
            "height": info.height,
            "tileSize": info.tile_size,
            "levels": info.levels,
        }

    def get_dzi(self, image_id: str):
        record = self._get_record(image_id)
        info = self._open(record).info()

        dzi = (
            f"<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            f"<Image xmlns=\"http://schemas.microsoft.com/deepzoom/2008\" "
            f"Format=\"png\" Overlap=\"0\" TileSize=\"{info.tile_size}\">"
            f"<Size Width=\"{info.width}\" Height=\"{info.height}\"/>"
            f"</Image>"
        )
        return Response(content=dzi, media_type="application/xml")

    def get_tile_png(self, image_id: str, level: int, x: int, y: int):
        
        record = self._get_record(image_id)
        img = self._open(record)

        try:
            png_bytes = img.tile_png(level=level, x=x, y=y)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

        return Response(content=png_bytes, media_type="image/png")

    def _get_record(self, image_id: str) -> ImageRecord:
        try:
            return self.registry.get(image_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Unknown image id")

    def _open(self, record: ImageRecord) -> MedicalImage:
        if record.kind == "SVS":
            return OpenSlideImage(record.path)
        if record.kind == "DICOM":
            pillow = load_dicom_as_pillow(record.path)
            return PillowImage(pillow)
        if record.kind == "TIFF":
            pillow = load_tiff_as_pillow(record.path)
            return PillowImage(pillow)
        if record.kind == "DEEPZOOM":
            return DeepZoomImage(record.path)
        raise HTTPException(status_code=400, detail="Unsupported kind")
