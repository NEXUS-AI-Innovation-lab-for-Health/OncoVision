from sqlmodel import create_engine, Session, SQLModel
from database.sql.credentials import SQLCredentials

class SQLConnection:

    connected: bool = False

    def __init__(self, credentials: SQLCredentials):
        self.engine = create_engine(
            f"mysql+pymysql://{credentials.user}:{credentials.password}@{credentials.host}:{credentials.port}/{credentials.name}",
            echo=False
        )

    def connect(self):
        if self.connected:
            return
        self.engine.connect()
        SQLModel.metadata.create_all(self.engine)
        self.connected = True

    def create_session(self):
        return Session(self.engine)

    def close(self):
        if not self.connected:
            return
        self.engine.dispose()