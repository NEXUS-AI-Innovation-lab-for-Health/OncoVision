from fastapi import WebSocket

from api.websocket import WebSocketHandler, WebSocketMessage, websocket_subscribe
from api.controller import Controller
from models.form import Shape, ShapeUnion, FORMS

import random

# Drawing area

class Artist:

    def __init__(self, socket: WebSocket) -> None:
        self.socket = socket
        self.color = "#{:06x}".format(random.randint(0, 0xFFFFFF))
        self.shapes: list[Shape] = []
        self.connected = True

class Canva:
    artists: dict[WebSocket, Artist] = {}

# Messages 
class HandshakeMessage(WebSocketMessage, type="handshake"):
    shapes: list[ShapeUnion]

class AddShapeMessage(WebSocketMessage, type="add_shape"):
    shape: ShapeUnion
# Handler

class DrawingController(Controller, WebSocketHandler):

    def __init__(self) -> None:
        super().__init__("drawing")
        WebSocketHandler.__init__(self)

        self.canva = Canva()
        self.add_api_websocket_route("/ws", self.handle_socket)

    async def broadcast_shapes(self, ignored_sockets: list[WebSocket] = []) -> None:

        for s, a in self.canva.artists.items():
            if not a.connected:
                continue

            if s in ignored_sockets:
                continue

            self.send_shapes(s)

    async def send_shapes(self, socket: WebSocket) -> None:

        total_shapes = []
        for a in self.canva.artists.values():
            total_shapes.extend(a.shapes)
        handshake_message = HandshakeMessage(shapes=total_shapes)
        await socket.send_json(handshake_message.model_dump(by_alias=True))

    @websocket_subscribe("add_shape", AddShapeMessage)
    async def add_shape(self, socket: WebSocket, message: AddShapeMessage) -> None:
        print("Add shape called")
        artist = self.canva.artists.get(socket)
        if not artist:
            return
        
        artist.shapes.append(message.shape)
        await self.broadcast_shapes([socket])

    async def on_connect(self, socket: WebSocket) -> None:
        artist = Artist(socket)
        self.canva.artists[socket] = artist
        await self.send_shapes(socket)

    async def on_disconnect(self, socket: WebSocket, error: Exception | None = None) -> bool:
        if socket in self.canva.artists:
            artist = self.canva.artists[socket]
            if len(artist.shapes) == 0:
                del self.canva.artists[socket]
            artist.connected = False
            #del self.canva.artists[socket]
            print("Artist disconnected, but not removing from canva for now.")
        return True
    
    async def handle_socket(self, socket: WebSocket) -> None:
        await super().handle_socket(socket, self.on_connect, self.on_disconnect)