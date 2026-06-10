from fastapi import WebSocket, HTTPException
import random
import uuid
from typing import Annotated, Literal

from pydantic import Field

from api.controller import Controller
from api.model import CamelModel
from api.websocket import WebSocketHandler, WebSocketMessage, websocket_subscribe
from database.mongo.connection import MongoConnection
from models.form import ShapeUnion


class DrawAuthor:
    author_id: str
    name: str
    color: str
    past_actions: list[dict]
    future_actions: list[dict]
    shape_ids: set[str]

    def __init__(self, author_id: str, name: str, color: str):
        self.author_id = author_id
        self.name = name
        self.color = color
        self.past_actions = []
        self.future_actions = []
        self.shape_ids = set()


class DrawSession:
    room_id: str
    room_name: str
    image_ids: list[str]
    authors: dict[WebSocket, DrawAuthor]
    known_authors: dict[str, DrawAuthor]
    shapes: dict[str, list[ShapeUnion]]

    def __init__(self, room_id: str, room_name: str, image_ids: list[str]):
        self.room_id = room_id
        self.room_name = room_name
        self.image_ids = image_ids
        self.authors = {}
        self.known_authors = {}
        self.shapes = {img_id: [] for img_id in image_ids}

    def as_document(self):
        shapes_dict = {}
        for img_id, shapes in self.shapes.items():
            img_shapes = []
            for shape in shapes:
                doc = shape.model_dump()
                # id may be a uuid.UUID object; convert to str for MongoDB storage.
                if isinstance(doc.get("id"), (bytes,)):
                    doc["id"] = str(doc["id"])
                elif doc.get("id") is not None:
                    doc["id"] = str(doc["id"])
                img_shapes.append(doc)
            shapes_dict[img_id] = img_shapes

        return {
            "room_id": self.room_id,
            "room_name": self.room_name,
            "image_ids": self.image_ids,
            "known_authors": {
                aid: {"author_id": a.author_id, "name": a.name, "color": a.color}
                for aid, a in self.known_authors.items()
            },
            "shapes": shapes_dict,
        }


class RoomInfo(CamelModel):
    room_id: str
    room_name: str
    image_ids: list[str]
    participant_count: int
    participants: list[dict] = []


class CreateRoomRequest(CamelModel):
    name: str
    image_ids: list[str]


class HandshakeMessage(WebSocketMessage, type="handshake"):
    room_id: str
    author_id: str | None = None
    author_name: str = "Anonymous"


class HandshakedMessage(WebSocketMessage, type="handshaked"):
    room_id: str
    author_id: str
    color: str
    shapes: dict[str, list[ShapeUnion]]
    past_actions: list[dict] = []
    future_actions: list[dict] = []


class DrawingAction(CamelModel):
    type: str


class ShapeCreateAction(DrawingAction):
    type: Literal["shape_create"] = "shape_create"
    image_id: str
    shapes: list[ShapeUnion]


class ShapeDeleteAction(DrawingAction):
    type: Literal["shape_delete"] = "shape_delete"
    image_id: str
    shapes: list[ShapeUnion]


class ShapeEditAction(DrawingAction):
    type: Literal["shape_edit"] = "shape_edit"
    image_id: str
    previous_shape: ShapeUnion
    shape: ShapeUnion


DrawingActionUnion = Annotated[
    ShapeCreateAction | ShapeDeleteAction | ShapeEditAction,
    Field(discriminator="type"),
]


class ShapeActionMessage(WebSocketMessage, type="shape_action"):
    room_id: str
    action: DrawingActionUnion
    source: Literal["action", "undo", "redo"] = "action"


class PropagateShapeActionMessage(WebSocketMessage, type="propagate_shape_action"):
    room_id: str
    action: DrawingActionUnion


class LeaveMessage(WebSocketMessage, type="leave"):
    room_id: str


class DrawController(Controller, WebSocketHandler):

    def __init__(self, mongo_connection: MongoConnection, sessions: dict[str, DrawSession]) -> None:
        super().__init__("draw")
        WebSocketHandler.__init__(self)

        mongo_database = mongo_connection.get_database()
        self.collection = mongo_database["drawings"]

        self.sessions = sessions
        self.add_api_websocket_route("/join_draw", self.handle_socket)

    def _apply_action(self, session: DrawSession, action: DrawingActionUnion) -> None:
        image_id = action.image_id
        if image_id not in session.shapes:
            session.shapes[image_id] = []

        if isinstance(action, ShapeCreateAction):
            session.shapes[image_id].extend(action.shapes)
            return

        if isinstance(action, ShapeDeleteAction):
            ids = {shape.id for shape in action.shapes}
            session.shapes[image_id] = [shape for shape in session.shapes[image_id] if shape.id not in ids]
            return

        if isinstance(action, ShapeEditAction):
            shape_id = action.shape.id
            session.shapes[image_id] = [action.shape if shape.id == shape_id else shape for shape in session.shapes[image_id]]

    @staticmethod
    def _action_to_dict(action: DrawingActionUnion) -> dict:
        return action.model_dump(mode="json")

    def _update_author_history(self, author: DrawAuthor, action: DrawingActionUnion, source: str) -> None:
        action_dict = self._action_to_dict(action)
        if source == "action":
            author.past_actions.append(action_dict)
            author.future_actions = []
        elif source == "undo":
            if author.past_actions:
                popped = author.past_actions.pop()
                author.future_actions.insert(0, popped)
        elif source == "redo":
            if author.future_actions:
                popped = author.future_actions.pop(0)
                author.past_actions.append(popped)

    @websocket_subscribe("handshake", HandshakeMessage)
    async def handle_handshake(self, websocket: WebSocket, message: HandshakeMessage) -> None:

        session = self.sessions.get(message.room_id)
        if not session:
            await websocket.close(code=4004, reason="Room not found")
            return

        if message.author_id and message.author_id in session.known_authors:
            author = session.known_authors[message.author_id]
        else:
            author_id = str(uuid.uuid4())
            color = f"#{random.randint(0, 0xFFFFFF):06x}"
            author = DrawAuthor(author_id=author_id, name=message.author_name, color=color)
            session.known_authors[author_id] = author

        session.authors[websocket] = author

        await self.send_message(websocket, HandshakedMessage(
            room_id=session.room_id,
            author_id=author.author_id,
            color=author.color,
            shapes=session.shapes,
            past_actions=author.past_actions,
            future_actions=author.future_actions,
        ))

    @websocket_subscribe("shape_action", ShapeActionMessage)
    async def handle_shape_action(self, websocket: WebSocket, message: ShapeActionMessage) -> None:

        session = self.sessions.get(message.room_id)
        if not session:
            return

        author = session.authors.get(websocket)
        if not author:
            return

        action = message.action
        self._apply_action(session, action)
        self._update_author_history(author, message.action, message.source)

        # Track which shapes belong to this author
        if isinstance(action, ShapeCreateAction):
            for shape in action.shapes:
                author.shape_ids.add(str(shape.id))
        elif isinstance(action, ShapeDeleteAction):
            deleted_ids = {str(shape.id) for shape in action.shapes}
            for a in session.known_authors.values():
                a.shape_ids -= deleted_ids

        self.collection.update_one(
            {"room_id": session.room_id},
            {"$set": session.as_document()},
            upsert=True,
        )

        for ws in session.authors.keys():
            if ws != websocket:
                await self.send_message(ws, PropagateShapeActionMessage(
                    room_id=message.room_id,
                    action=action,
                ))

    @websocket_subscribe("leave", LeaveMessage)
    async def handle_leave(self, websocket: WebSocket, message: LeaveMessage) -> None:

        session = self.sessions.get(message.room_id)
        if not session or websocket not in session.authors:
            await websocket.close(code=1000)
            return

        author = session.authors[websocket]

        # Find shapes that belong to the leaving author and delete them
        shapes_to_delete = [s for s in session.shapes if str(s.id) in author.shape_ids]

        if shapes_to_delete:
            delete_action = ShapeDeleteAction(shapes=shapes_to_delete)
            self._apply_action(session, delete_action)

            self.collection.update_one(
                {"room_id": session.room_id},
                {"$set": session.as_document()},
                upsert=True,
            )

            for ws in list(session.authors.keys()):
                if ws != websocket:
                    await self.send_message(ws, PropagateShapeActionMessage(
                        room_id=message.room_id,
                        action=delete_action,
                    ))

        # Remove author from session entirely
        del session.authors[websocket]
        session.known_authors.pop(author.author_id, None)

        await websocket.close(code=1000)

    async def on_socket_disconnect(self, websocket, error=None):
        print(f"WebSocket disconnected: {error}")
        for session in self.sessions.values():
            if websocket in session.authors:
                del session.authors[websocket]