from uuid import uuid4, UUID
from datetime import datetime
from enum import Enum
from sqlmodel import Field, Session, select
from api.model import CamelSQLModel
from models.user import User

# Kind of permission
class Access(Enum):
    READ = "read"
    WRITE = "write"
    ALL = "all"
    OWNER = "owner"

    def can_read(self) -> bool:
        return self in [Access.READ, Access.ALL, Access.OWNER]
    
    def can_write(self) -> bool:
        return self in [Access.WRITE, Access.ALL, Access.OWNER]

# SQL row representing a file stored in S3
class File(CamelSQLModel, table=True):

    __tablename__ = "files"

    id: int = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)

    name: str = Field(nullable=False, index=True)
    path: str = Field(nullable=False) # Path to S3
    link: UUID = Field(default_factory=uuid4, nullable=False, unique=True, index=True)

    def get_owner(self, session: Session) -> User | None:
        statement = (
            select(User)
            .join(File.Permission, File.Permission.user_id == User.id)
            .where(
                (File.Permission.file_id == self.id) &
                (File.Permission.access == Access.OWNER)
            )
        )
        return session.exec(statement).first()

    def get_permission(self, user_id: int, session: Session) -> "File.Permission" | None:
        statement = (
            select(File.Permission)
            .where(
                (File.Permission.file_id == self.id) &
                (File.Permission.user_id == user_id)
            )
        )
        return session.exec(statement).first()
    
    def has_access(self, user_id: int, session: Session) -> bool:
        permission = self.get_permission(user_id, session)
        return permission is not None and permission.access.can_read()

    def get_allowed_users(self, permissions: list[Access], session: Session) -> list[User]:
        statement = (
            select(User)
            .join(File.Permission, File.Permission.user_id == User.id)
            .where(
                (File.Permission.file_id == self.id) &
                (File.Permission.access.in_(permissions))
            )
        )
        return session.exec(statement).all()
    
    # Permissions for the file
    class Permission(CamelSQLModel, table=True):

        __tablename__ = "file_permissions"

        id: int = Field(default=None, primary_key=True)
        created_at: datetime = Field(default_factory=datetime.now, nullable=False)

        updated_by: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")
        updated_at: datetime = Field(default_factory=datetime.now, nullable=False)

        file_id: int = Field(foreign_key="files.id", nullable=False, ondelete="CASCADE")
        user_id: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")

        access: Access = Field(nullable=False)