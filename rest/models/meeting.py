from datetime import datetime
from enum import StrEnum
from sqlmodel import Field, Session, select
from api.model import CamelSQLModel

# Meeting with members and associated documents
class Meeting(CamelSQLModel, table=True):

    # Members of the meeting
    class Member(CamelSQLModel, table=True):

        # Possible states of a meeting member
        class State(StrEnum):
            PENDING = "pending"
            ACCEPTED = "accepted"
            DECLINED = "declined"
            FORCED = "forced" # Mandatory attendance

        # Documents linked to member
        class Document(CamelSQLModel, table=True):

            __tablename__ = "meeting_documents"

            id: int = Field(default=None, primary_key=True)

            member_id: int = Field(foreign_key="meeting_members.id", nullable=False, ondelete="CASCADE")
            file_id: int = Field(foreign_key="files.id", nullable=True)

            description: str = Field(nullable=True)
            completed_at: datetime = Field(nullable=True)

        __tablename__ = "meeting_members"

        id: int = Field(default=None, primary_key=True)

        meeting_id: int = Field(foreign_key="meetings.id", nullable=False, ondelete="CASCADE")
        user_id: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")

        state: State = Field(default=State.PENDING, nullable=False)

        def get_files(self, session: Session) -> list[Meeting.Member.Document]:
            statement = (
                select(Meeting.Member.Document)
                .where(Meeting.Member.Document.member_id == self.id)
            )
            return session.exec(statement).all()

    __tablename__ = "meetings"

    id: int = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)

    owner_id: int = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")

    title: str = Field(nullable=False, index=True)
    description: str = Field(nullable=True)

    chat_id: int = Field(foreign_key="chats.id", nullable=False, ondelete="CASCADE")
    
    scheduled: datetime = Field(nullable=False)
    duration_in_minutes: int = Field(nullable=False, description="Duration in minutes")

    def get_members(self, 
                    session: Session, 
                    states: list[Member.State] = [
                        Member.State.PENDING,
                        Member.State.ACCEPTED,
                        Member.State.DECLINED,
                        Member.State.FORCED
                    ]
                    ) -> list[Member]:
        statement = (
            select(Meeting.Member)
            .where(Meeting.Member.meeting_id == self.id)
            .where(Meeting.Member.state.in_(states))
        )
        return session.exec(statement).all()