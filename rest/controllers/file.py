from api.controller import Controller
from database.s3.connection import S3Connection
from base64 import b64encode
from utils.image import load_dicom, image_to_bytes

class FileController(Controller):

    def __init__(self, s3_connection: S3Connection) -> None:
        super().__init__("files")
        self.s3_connection = s3_connection

        self.add_api_route("/list", self.list, methods=["GET"])

    def list(self):
        
        files = []

        for file_name in self.s3_connection.get_session().ls("/test"):
            file = self.s3_connection.get_session().stat(file_name)
            
            preview = None
            with self.s3_connection.get_session().open(file_name, "rb") as s3_file:
                preview = load_dicom(s3_file.read())

            preview_bytes = image_to_bytes(preview, dest_format="PNG")
            preview_bytes = b64encode(preview_bytes).decode("utf-8")

            files.append({
                "name": file_name,
                "size": file["size"],
                "last_modified": file["LastModified"],
                "preview": preview_bytes,
            })

        return files