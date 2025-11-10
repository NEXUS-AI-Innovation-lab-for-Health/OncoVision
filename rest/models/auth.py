from datetime import datetime, timedelta
from sqlmodel import Field
from api.model import CamelSQLModel

def create_expiration() -> datetime:
    return datetime.now() + timedelta(days=7)

class Token(CamelSQLModel, table=True):

    __tablename__ = "tokens"

    id: int = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)

    user_id: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")
    token: str = Field(nullable=False, unique=True, index=True)
    expires_at: datetime = Field(nullable=False, default_factory=create_expiration)

    def has_expired(self) -> bool:
        return datetime.now() > self.expires_at