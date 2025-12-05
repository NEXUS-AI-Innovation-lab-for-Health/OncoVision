from fastapi import WebSocket, WebSocketDisconnect, WebSocketException

from api.model import CamelModel
from api.controller import Controller
from models.form import Shape, Point, Line, Circle, Ellipse, Rectangle, Polygon, Polyline, ShapeUnion

import random

FORMS = {
    "line": Line,
    "circle": Circle,
    "ellipse": Ellipse,
    "rectangle": Rectangle,
    "polygon": Polygon,
    "polyline": Polyline,
}

def random_hex_color() -> str:
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

class Artist:

    def __init__(self, socket: WebSocket):
        self.socket = socket
        self.color = random_hex_color()
        self.shapes = []

class Canva:

    artists: dict[WebSocket, Artist] = {}

class DrawingMessage(CamelModel):
    type: str

class HandshakeMessage(DrawingMessage):
    type: str = "handshake"
    shapes: list[ShapeUnion]

class DrawingController(Controller):

    def __init__(self):
        super().__init__("drawing")
        self.canva = Canva()
        self.add_api_websocket_route("/ws", self.handle_socket)

    async def send_shapes(self, socket: WebSocket):
        total_shapes = []
        for a in self.canva.artists.values():
            total_shapes.extend(a.shapes)
        handshake_message = HandshakeMessage(shapes=total_shapes)
        await socket.send_json(handshake_message.model_dump(by_alias=True))

    async def handle_socket(self, socket: WebSocket):

        await socket.accept()
        artist = Artist(socket)
        self.canva.artists[socket] = artist
        await self.send_shapes(socket)

        try:
            while True:
                data = await socket.receive_json()

                if "type" not in data:
                    continue

                if data["type"] == "draw":
                    
                    raw_shape = data.get("shape")
                    if not raw_shape or "type" not in raw_shape:
                        continue

                    shape_type = raw_shape["type"]
                    shape_class = FORMS.get(shape_type)
                    if not shape_class:
                        continue

                    shape = shape_class.model_validate(raw_shape)
                    artist.shapes.append(shape)

                    for a_socket, a in self.canva.artists.items():
                        if a_socket != socket:
                            await self.send_shapes(a_socket)

        except WebSocketDisconnect:
            del self.canva.artists[socket]
        except WebSocketException as e:
            del self.canva.artists[socket]
            print(f"WebSocket error: {e}")