from fastapi import WebSocket, WebSocketDisconnect, WebSocketException

from api.controller import Controller
from api.websocket import WebSocketHandler, WebSocketMessage, websocket_subscribe

class DrawAuthor:
    color: str

    def __init__(self, color: str):
        self.color = color

class DrawSession:
    image_id: str
    authors: dict[WebSocket, DrawAuthor]

    def __init__(self, image_id: str): 
        self.image_id = image_id
        self.authors = {}

class DrawController(Controller, WebSocketHandler):

    def __init__(self):
        super().__init__("draw") 
        WebSocketHandler.__init__(self)

        self.sessions: dict[str, DrawSession] = {}
        self.add_api_websocket_route(f"join_draw", self.handle_socket)

    async def on_socket_connect(self, websocket: WebSocket) -> None:
        print("Socket connected, waiting for join message...")