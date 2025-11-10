from datetime import datetime
from sqlmodel import Field, Session, select
from api.model import CamelSQLModel
from models.user import User

# Group chat containing, members and message (which may contain attachments)
class Chat(CamelSQLModel, table=True):

    # Members of the chat group
    class Member(CamelSQLModel, table=True):

        __tablename__ = "chat_members"

        id: int = Field(default=None, primary_key=True)

        joined_at: datetime = Field(default_factory=datetime.now, nullable=False)

        chat_id: int = Field(foreign_key="chats.id", nullable=False, ondelete="CASCADE")
        user_id: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")

        def get_user(self, session: Session) -> User:
            statement = (
                select(User)
                .where(User.id == self.user_id)
            )
            return session.exec(statement).one()

        def get_chat(self, session: Session) -> Chat:
            statement = (
                select(Chat)
                .where(Chat.id == self.chat_id)
            )
            return session.exec(statement).one()
        
        def get_messages(self, session: Session) -> list[Chat.Message]:
            statement = (
                select(Chat.Message)
                .where(Chat.Message.chat_id == self.chat_id)
                .order_by(Chat.Message.created_at)
            )
            return session.exec(statement).all()

    # Messages of the chat group
    class Message(CamelSQLModel, table=True):

        # Attachments linked to message
        class Attachment(CamelSQLModel, table=True):

            __tablename__ = "chat_message_attachments"

            id: int = Field(default=None, primary_key=True)

            index: int = Field(nullable=False)

            message_id: int = Field(foreign_key="chat_messages.id", nullable=False, ondelete="CASCADE")
            file_id: int = Field(foreign_key="files.id", nullable=False, ondelete="CASCADE")
        
        __tablename__ = "chat_messages"

        id: int = Field(default=None, primary_key=True)
        created_at: datetime = Field(default_factory=datetime.now, nullable=False)

        chat_id: int = Field(foreign_key="chats.id", nullable=False, ondelete="CASCADE")
        sender_id: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")

        content: str = Field(nullable=False)
        at: datetime = Field(default_factory=datetime.now, nullable=False)

        def get_chat(self, session: Session) -> Chat:
            statement = (
                select(Chat)
                .where(Chat.id == self.chat_id)
            )
            return session.exec(statement).one()
        
        def get_sender(self, session: Session) -> Chat.Member:
            statement = (
                select(Chat.Member)
                .where(Chat.Member.chat_id == self.chat_id)
                .where(Chat.Member.user_id == self.sender_id)
            )
            return session.exec(statement).one()

        def get_attachments(self, session: Session) -> list[Attachment]:
            statement = (
                select(Chat.Message.Attachment)
                .where(Chat.Message.Attachment.message_id == self.id)
                .order_by(Chat.Message.Attachment.index)
            )
            return session.exec(statement).all()

    __tablename__ = "chats"

    id: int = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)
    title: str = Field(nullable=False, index=True)

    def get_messages(self, session: Session) -> list[Message]:
        statement = (
            select(Chat.Message)
            .where(Chat.Message.chat_id == self.id)
            .order_by(Chat.Message.created_at)
        )
        return session.exec(statement).all()

    def get_members(self, session: Session) -> list[Member]:
        statement = (
            select(Chat.Member)
            .where(Chat.Member.chat_id == self.id)
            .order_by(Chat.Member.joined_at)
        )
        return session.exec(statement).all()