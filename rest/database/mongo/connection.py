from pymongo import MongoClient

from database.mongo.credentials import MongoCredentials

class MongoConnection:

    client: MongoClient

    def __init__(self, credentials: MongoCredentials) -> None:
        self.client = MongoClient(
            host=credentials.host,
            port=credentials.port,
            username=credentials.user,
            password=credentials.password,
            authSource="admin",
            uuidRepresentation="standard",
        )
        self.database = credentials.database
    
    def ping(self) -> bool:
        try:
            self.client.admin.command('ping')
            return True
        except Exception:
            return False

    def get_database(self, db_name: str | None = None):
        if db_name is None:
            db_name = self.database
        return self.client[db_name]
    
    def close(self) -> None:
        self.client.close()