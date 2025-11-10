from datetime import datetime, timedelta
from sqlmodel import Field
from api.model import CamelSQLModel

@staticmethod
def create_expiration() -> datetime:
    return datetime.now() + timedelta(days=7)

class Token(CamelSQLModel, table=True):

    __tablename__ = "tokens"

    id: int = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)
    ip_address: str = Field(nullable=True)

    value: str = Field(nullable=False, unique=True, index=True)
    expires_at: datetime = Field(nullable=False, default_factory=create_expiration)

    user_id: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")

    def has_expired(self) -> bool:
        return datetime.now() > self.expires_at