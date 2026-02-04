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
        # Vérifie la connexion
        try:
            self.file_system.ls("/")
            print("Connexion à S3 établie avec succès.")
        except Exception as e:
            print(f"Erreur de connexion à S3: {e}")
            raise

    def get_session(self) -> S3FileSystem:
        return self.file_system
