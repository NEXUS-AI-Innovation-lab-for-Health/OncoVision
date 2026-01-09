from api.controller import Controller
from database.s3.connection import S3Connection
from base64 import b64encode
from utils.image import load_dicom, image_to_bytes, wsi_to_image
from fastapi import UploadFile, File
from fastapi.responses import Response
import io


class FileController(Controller):

    def __init__(self, s3_connection: S3Connection) -> None:
        super().__init__("files")
        self.s3_connection = s3_connection

        self.add_api_route("/list", self.list, methods=["GET"])
        self.add_api_route("/upload", self.upload, methods=["POST"])
        self.add_api_route("/preview", self.preview, methods=["GET"])

    def list(self):
        files = []

        # list files under /uploads (adjust path as needed)
        prefix = "/uploads"
        try:
            names = self.s3_connection.get_session().ls(prefix)
        except Exception:
            names = []

        for file_name in names:
            file = self.s3_connection.get_session().stat(file_name)

            preview_b64 = None
            try:
                with self.s3_connection.get_session().open(file_name, "rb") as s3_file:
                    img = wsi_to_image(s3_file, overview=True)
                preview_bytes = image_to_bytes(img, dest_format="PNG")
                preview_b64 = b64encode(preview_bytes).decode("utf-8")
            except Exception:
                preview_b64 = None

            files.append({
                "name": file_name,
                "size": file.get("size"),
                "last_modified": file.get("LastModified"),
                "preview": preview_b64,
            })

        return files

    async def upload(self, file: UploadFile = File(...)):
        # Save uploaded file into S3 under /uploads/<filename>
        dest_path = f"/uploads/{file.filename}"
        contents = await file.read()
        with self.s3_connection.get_session().open(dest_path, "wb") as s3_file:
            s3_file.write(contents)

        return {"path": dest_path, "filename": file.filename}

    def preview(self, path: str):
        # Return a PNG overview generated from WSI stored in S3
        try:
            with self.s3_connection.get_session().open(path, "rb") as s3_file:
                img = wsi_to_image(s3_file, overview=True)

            img_bytes = image_to_bytes(img, dest_format="PNG")
            return Response(content=img_bytes, media_type="image/png")
        except Exception as e:
            return Response(content=str(e).encode("utf-8"), media_type="text/plain", status_code=500)