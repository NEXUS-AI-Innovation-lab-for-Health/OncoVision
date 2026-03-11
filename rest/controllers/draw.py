from fastapi import WebSocket
import random
from typing import Annotated, Literal

from pydantic import Field

from api.controller import Controller
from api.model import CamelModel
from api.websocket import WebSocketHandler, WebSocketMessage, websocket_subscribe
from database.mongo.connection import MongoConnection
from models.form import Bordered, Point, Shape, ShapeUnion

class DrawAuthor:
    color: str

    def __init__(self, color: str):
        self.color = color

class DrawSession:
    image_id: str
    authors: dict[WebSocket, DrawAuthor]
    shapes: list[ShapeUnion]

    def __init__(self, image_id: str): 
        self.image_id = image_id
        self.authors = {}
        self.shapes = []

    def as_document(self):
        shapes = []
        for shape in self.shapes:
            doc = shape.model_dump()
            if isinstance(doc.get("id"), (bytes,)):
                # defensive, although pydantic should always give uuid.UUID
                doc["id"] = str(doc["id"])
            elif doc.get("id") is not None:
                doc["id"] = str(doc["id"])
            shapes.append(doc)

        return {
            "image_id": self.image_id,
            "authors": {str(id(ws)): author.color for ws, author in self.authors.items()},
            "shapes": shapes,
        }

class HandshakeMessage(WebSocketMessage, type="handshake"):
    session_id: str | None = None

class HandshakedMessage(WebSocketMessage, type="handshaked"):
    session_id: str | None = None
    color: str
    shapes: list[ShapeUnion]


class DrawingAction(CamelModel):
    type: str


class ShapeCreateAction(DrawingAction):
    type: Literal["shape_create"] = "shape_create"
    shape: ShapeUnion


class ShapesDeleteAction(DrawingAction):
    type: Literal["shapes_delete"] = "shapes_delete"
    shapes: list[ShapeUnion]


class ShapeMoveAction(DrawingAction):
    type: Literal["shape_move"] = "shape_move"
    shapes: list[ShapeUnion]
    offset: Point


DrawingActionUnion = Annotated[
    ShapeCreateAction | ShapesDeleteAction | ShapeMoveAction,
    Field(discriminator="type"),
]


class ShapeActionMessage(WebSocketMessage, type="shape_action"):
    session_id: str | None = None
    action: DrawingActionUnion


class PropagateShapeActionMessage(WebSocketMessage, type="propagate_shape_action"):
    session_id: str
    action: DrawingActionUnion

class DrawController(Controller, WebSocketHandler):

    def __init__(self, mongo_connection: MongoConnection) -> None:
        super().__init__("draw") 
        WebSocketHandler.__init__(self)
        
        mongo_database = mongo_connection.get_database()
        self.collection = mongo_database["drawings"]

        self.sessions: dict[str, DrawSession] = {}
        self.add_api_websocket_route(f"/join_draw", self.handle_socket)

    @staticmethod
    def _copy_geometry(target: ShapeUnion, source: ShapeUnion) -> None:
        if hasattr(target, "start") and hasattr(target, "end") and hasattr(source, "start") and hasattr(source, "end"):
            target.start.x = source.start.x
            target.start.y = source.start.y
            target.end.x = source.end.x
            target.end.y = source.end.y
            return

        if hasattr(target, "center") and hasattr(source, "center"):
            target.center.x = source.center.x
            target.center.y = source.center.y
            return

        if hasattr(target, "origin") and hasattr(source, "origin"):
            target.origin.x = source.origin.x
            target.origin.y = source.origin.y
            return

        if hasattr(target, "points") and hasattr(source, "points"):
            for index, point in enumerate(target.points):
                if index >= len(source.points):
                    break
                point.x = source.points[index].x
                point.y = source.points[index].y

    @staticmethod
    def _normalize_action(author: DrawAuthor | None, action: DrawingActionUnion) -> DrawingActionUnion:
        if isinstance(action, ShapeCreateAction) and author and isinstance(action.shape, Bordered):
            action.shape.border_color = author.color
        return action

    def _apply_action(self, session: DrawSession, action: DrawingActionUnion) -> None:
        if isinstance(action, ShapeCreateAction):
            session.shapes.append(action.shape)
            return

        if isinstance(action, ShapesDeleteAction):
            ids = {shape.id for shape in action.shapes}
            session.shapes = [shape for shape in session.shapes if shape.id not in ids]
            return

        if isinstance(action, ShapeMoveAction):
            moved = {shape.id: shape for shape in action.shapes}
            for shape in session.shapes:
                target = moved.get(shape.id)
                if target is not None:
                    self._copy_geometry(shape, target)

    @websocket_subscribe("handshake", HandshakeMessage)
    async def handle_handshake(self, websocket: WebSocket, message: HandshakeMessage) -> None:
        
        message.session_id = "Test"
        
        session = self.sessions.get(message.session_id)
        if not session:
            session = DrawSession(message.session_id)
            self.sessions[message.session_id] = session
        
        color = f"#{random.randint(0, 0xFFFFFF):06x}"
        session.authors[websocket] = DrawAuthor(color)

        await self.send_message(websocket, HandshakedMessage(
            session_id=message.session_id,
            color=color,    
            shapes=session.shapes,
        ))

    @websocket_subscribe("shape_action", ShapeActionMessage)
    async def handle_shape_action(self, websocket: WebSocket, message: ShapeActionMessage) -> None:

        message.session_id = "Test"
        session = self.sessions.get(message.session_id)
        if not session:
            return
        
        author = session.authors.get(websocket)
        if not author:
            return

        action = self._normalize_action(author, message.action)
        self._apply_action(session, action)

        self.collection.update_one(
            {"image_id": session.image_id},
            {"$set": session.as_document()},
            upsert=True,
        )

        for ws in session.authors.keys():
            if ws != websocket:
                await self.send_message(ws, PropagateShapeActionMessage(
                    session_id=message.session_id,
                    action=action,
                ))

    async def on_socket_disconnect(self, websocket, error = None):
        print(f"WebSocket disconnected: {error}")
        for session in self.sessions.values():
            if websocket in session.authors:
                del session.authors[websocket]