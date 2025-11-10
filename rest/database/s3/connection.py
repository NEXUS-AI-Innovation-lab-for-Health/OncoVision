from s3fs import S3FileSystem
from database.s3.credentials import S3Credentials

class S3Connection:

    file_system: S3FileSystem

    def __init__(self, credentials: S3Credentials) -> None:
        self.file_system = S3FileSystem(
            key=credentials.user,
            secret=credentials.password,
            client_kwargs={
                "endpoint_url": f"{credentials.host}:{credentials.port}",
                "region_name": credentials.region
            }
        )

    def create_session(self) -> S3FileSystem:
        return self.file_system