from fastapi import WebSocket
import random

from api.controller import Controller
from api.websocket import WebSocketHandler, WebSocketMessage, websocket_subscribe
from models.form import Shape, ShapeUnion, Bordered

class DrawAuthor:
    color: str

    def __init__(self, color: str):
        self.color = color

class DrawSession:
    image_id: str
    authors: dict[WebSocket, DrawAuthor]
    shapes: dict[DrawAuthor, list[Shape]]

    def __init__(self, image_id: str): 
        self.image_id = image_id
        self.authors = {}
        self.shapes = {}

class HandshakeMessage(WebSocketMessage, type="handshake"):
    session_id: str | None = None

class HandshakedMessage(WebSocketMessage, type="handshaked"):
    session_id: str | None = None
    color: str
    shapes: list[ShapeUnion]

class AddShapeMessage(WebSocketMessage, type="add_shape"):
    session_id: str | None = None
    shape: ShapeUnion

class PropagateShapesMessage(WebSocketMessage, type="propagate_shapes"):
    session_id: str
    shapes: list[ShapeUnion]

class DrawController(Controller, WebSocketHandler):

    def __init__(self):
        super().__init__("draw") 
        WebSocketHandler.__init__(self)

        self.sessions: dict[str, DrawSession] = {}
        self.add_api_websocket_route(f"/join_draw", self.handle_socket)

    @websocket_subscribe("handshake", HandshakeMessage)
    async def handle_handshake(self, websocket: WebSocket, message: HandshakeMessage) -> None:
        
        message.session_id = "Test"
        
        session = self.sessions.get(message.session_id)
        if not session:
            session = DrawSession(message.session_id)
            self.sessions[message.session_id] = session
        
        color = f"#{random.randint(0, 0xFFFFFF):06x}"
        session.authors[websocket] = DrawAuthor(color)

        shapes = []
        for author in session.authors.values():
            shapes.extend(session.shapes.get(author, []))

        await self.send_message(websocket, HandshakedMessage(
            session_id=message.session_id,
            color=color,    
            shapes=shapes,
        ))

    @websocket_subscribe("add_shape", AddShapeMessage)
    async def handle_add_shape(self, websocket: WebSocket, message: AddShapeMessage) -> None:

        message.session_id = "Test"
        session = self.sessions.get(message.session_id)
        if not session:
            return
        
        author = session.authors.get(websocket)
        if not author:
            return
        
        if author not in session.shapes:
            session.shapes[author] = []

        if isinstance(message.shape, Bordered):
            message.shape.border_color = author.color

        session.shapes[author].append(message.shape)

        shapes = []
        for author in session.authors.values():
            shapes.extend(session.shapes.get(author, []))

        print("Broadcasting new shape to other clients in session")

        for ws in session.authors.keys():
            if ws != websocket:
                await self.send_message(ws, PropagateShapesMessage(
                    session_id=message.session_id,
                    shapes=shapes,
                ))

    async def on_socket_disconnect(self, websocket, error = None):
        print(f"WebSocket disconnected: {error}")
        for session in self.sessions.values():
            if websocket in session.authors:
                del session.authors[websocket]