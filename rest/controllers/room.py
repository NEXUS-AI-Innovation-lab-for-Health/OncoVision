import uuid
from fastapi import HTTPException

from api.controller import Controller
from api.model import CamelModel


class RoomInfo(CamelModel):
    room_id: str
    room_name: str
    image_ids: list[str]
    participant_count: int
    participants: list[dict] = []


class CreateRoomRequest(CamelModel):
    name: str
    image_ids: list[str]


class RoomController(Controller):
    def __init__(self, sessions: dict) -> None:
        super().__init__("room")
        self.sessions = sessions

        self.add_api_route("/rooms", self.list_rooms, methods=["GET"])
        self.add_api_route("/rooms", self.create_room, methods=["POST"])
        self.add_api_route("/rooms/{room_id}", self.get_room, methods=["GET"])

    def list_rooms(self) -> list[RoomInfo]:
        result = []
        for session in self.sessions.values():
            result.append(RoomInfo(
                room_id=session.room_id,
                room_name=session.room_name,
                image_ids=session.image_ids,
                participant_count=len(session.authors),
                participants=[
                    {"authorId": a.author_id, "name": a.name, "color": a.color}
                    for a in session.known_authors.values()
                ],
            ))
        return result

    def create_room(self, request: CreateRoomRequest) -> RoomInfo:
        from controllers.draw import DrawSession
        room_id = str(uuid.uuid4())
        session = DrawSession(room_id=room_id, room_name=request.name, image_ids=request.image_ids)
        self.sessions[room_id] = session
        return RoomInfo(
            room_id=room_id,
            room_name=request.name,
            image_ids=request.image_ids,
            participant_count=0,
            participants=[],
        )

    def get_room(self, room_id: str) -> RoomInfo:
        session = self.sessions.get(room_id)
        if not session:
            raise HTTPException(status_code=404, detail="Room not found")
        return RoomInfo(
            room_id=session.room_id,
            room_name=session.room_name,
            image_ids=session.image_ids,
            participant_count=len(session.authors),
            participants=[
                {"authorId": a.author_id, "name": a.name, "color": a.color}
                for a in session.known_authors.values()
            ],
        )
