from datetime import datetime
from sqlmodel import Field
from api.model import CamelSQLModel

class User(CamelSQLModel, table=True):

    __tablename__ = "users"

    id: int = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)

    name: str = Field(nullable=False, index=True)
    last_name: str = Field(nullable=False, index=True)

    email: str = Field(nullable=False, unique=True, index=True)
    password: str = Field(nullable=False)

    profession_id: int = Field(foreign_key="professions.id", nullable=True) # Todo: change nullable to False
    