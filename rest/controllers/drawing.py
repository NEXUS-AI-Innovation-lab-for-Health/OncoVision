from fastapi import WebSocket

from api.websocket import WebSocketHandler, WebSocketMessage, websocket_subscribe
from api.controller import Controller
from models.form import Shape, Bordered, ShapeUnion, FORMS

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

            await self.send_shapes(s)

    async def send_shapes(self, socket: WebSocket, shapes: list[ShapeUnion] | None = None) -> None:

        if shapes is None:
            total_shapes = []
            for a in self.canva.artists.values():
                if a.connected == False:
                    continue

                for shape in a.shapes:
                    if isinstance(shape, Bordered):
                        shape.border_color = a.color
                    total_shapes.append(shape)
        else:
            total_shapes = shapes
        handshake_message = HandshakeMessage(shapes=total_shapes)
        await socket.send_json(handshake_message.model_dump(by_alias=True))

    @websocket_subscribe("add_shape", AddShapeMessage)
    async def add_shape(self, socket: WebSocket, message: AddShapeMessage) -> None:
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
            await self.broadcast_shapes()
        #await self.send_shapes(socket, [])
        return True
    
    async def handle_socket(self, socket: WebSocket) -> None:
        await super().handle_socket(socket, self.on_connect, self.on_disconnect)