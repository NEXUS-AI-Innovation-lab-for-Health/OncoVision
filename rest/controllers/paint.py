from fastapi import WebSocket, WebSocketDisconnect, WebSocketException
from api.controller import Controller
from api.model import CamelModel
from typing import Any
import random
import json

class Point(CamelModel):
    x: int
    y: int

    def __hash__(self) -> int:
        return hash((self.x, self.y))

class PaintController(Controller):

    colors: dict[WebSocket, str] = {}
    pixels: dict[WebSocket, set[Point]] = {}
    artists: set[WebSocket] = set()

    def __init__(self) -> None:
        super().__init__("paint")
        self.add_api_websocket_route("/draw", self.draw)

    def add_artist(self, websocket: WebSocket) -> None:

        def hex_color() -> str:
            return "#{:06x}".format(random.randint(0, 0xFFFFFF))
        
        color = hex_color()
        self.colors[websocket] = color
        self.pixels[websocket] = set()
        self.artists.add(websocket)

    def remove_artist(self, websocket: WebSocket) -> None:
        if websocket in self.artists:
            self.artists.remove(websocket)
            # del self.colors[websocket]
            # del self.pixels[websocket]

    async def send_update(self, receivers: set[WebSocket], to_send: dict[Point, str] = None) -> None:



        points = []
        if to_send is None:
            for artist, color in self.colors.items():
                print(f"Artist color: {color} with {len(self.pixels[artist])} points")
                for point in self.pixels[artist]:
                    points.append({
                        "x": point.x,
                        "y": point.y,
                        "color": color
                    })
        else:
            for point, color in to_send.items():
                points.append({
                    "x": point.x,
                    "y": point.y,
                    "color": color
                })

        points = json.dumps(points)

        for receiver in receivers:
            await receiver.send_text(points)

    async def handle_message(self, websocket: WebSocket, message: Any) -> None:
        
        if not message:
            print("Received empty message")
            return
        
        if not websocket in self.artists:
            print("Received message from unknown artist")
            return
        
        channel = message["channel"]
        if channel == "hand_shake":
            await self.send_update({websocket})

            points = 0
            for _, pts in self.pixels.items():
                points += len(pts)

            print(f"Artist performed hand shake and sending {points} points")
            return

        payload = message["payload"]
        print(channel)
        if channel == "draw":

            point = payload["point"]
            point = Point(x = int(point["x"]), y = int(point["y"]))

            if point in self.pixels[websocket]:
                return
            
            self.pixels[websocket].add(point)
            print(f"Artist drew point at ({point.x}, {point.y}) with color {self.colors[websocket]} has {len(self.pixels[websocket])} points")
            await self.send_update(self.artists, {point: self.colors[websocket]})

    async def draw(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.add_artist(websocket)
        try:
            while True:
                message = await websocket.receive_json()
                print(f"Received message: {message}")
                await self.handle_message(websocket, message)
        except WebSocketDisconnect:
            print("WebSocket disconnected")
            self.remove_artist(websocket)
        except WebSocketException as e:
            print(f"WebSocket exception: {e}")
            self.remove_artist(websocket)