from datetime import datetime
from sqlmodel import Field
from api.model import CamelSQLModel

class Profession(CamelSQLModel, table=True):

    __tablename__ = "professions"

    id: int = Field(default=None, primary_key=True)
    
    name: str = Field(nullable=False, index=True)
    description: str = Field(nullable=True)