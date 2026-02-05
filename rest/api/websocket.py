from fastapi import WebSocket, WebSocketDisconnect
from typing import Callable

from api.model import CamelModel

class WebSocketMessage(CamelModel):
    type: str

    def __init_subclass__(cls, type: str = None, **kwargs):
        super().__init_subclass__(**kwargs)
        if type is not None:
            cls.model_fields['type'].default = type

class WebSocketBus:

    def __init__(self):
        self.handlers: dict[str, set[Callable]] = {}

    def subscribe(self, type_: str, fn: Callable) -> None:
        if type_ not in self.handlers:
            self.handlers[type_] = set()
        self.handlers[type_].add(fn)

    async def dispatch(self, websocket: WebSocket, message: dict) -> None:

        type_ = message.get("type")
        if not type_:
            return
        
        payload = dict(message)
        for fn in self.handlers.get(type_, []):
            message_class = getattr(fn, "_message_class", None)
            if message_class:
                try:
                    msg = message_class.model_validate(payload)
                except Exception as e:
                    # Log error or handle validation failure
                    continue
            else:
                msg = payload
            await fn(websocket, msg)

def websocket_subscribe(type_, message_class=None):
    def decorator(fn):
        fn._message_type = type_
        fn._message_class = message_class
        return fn
    return decorator

class WebSocketHandler:

    def __init__(self):
        self.bus = WebSocketBus()
        registered = self.register_websocket_handlers()
        print(f"Registered {registered} in {self.__class__.__name__}")

    async def on_socket_connect(self, websocket: WebSocket, **kwargs) -> None:
        """Default no-op on connect handler. Subclasses may override.
        Extra keyword arguments passed from the websocket route (e.g., path params) are forwarded here."""
        return None

    async def on_socket_disconnect(self, websocket: WebSocket, error: Exception | None = None) -> bool:
        """Default on disconnect handler. Subclasses may override. Return True to stop handling."""
        return True

    async def handle_socket(self, websocket: WebSocket, **kwargs) -> None:
        try:
            await websocket.accept()
            print("WebSocket accepted, calling on_socket_connect...", kwargs)

            await self.on_socket_connect(websocket, **kwargs)
            disconnected = False
            try:
                while True:
                    data = await websocket.receive_json()
                    await self.bus.dispatch(websocket, data)
            except WebSocketDisconnect as e:
                disconnected = True
                should_disconnect = await self.on_socket_disconnect(websocket, e)
                if should_disconnect:
                    return
            finally:
                if not disconnected:
                    await websocket.close()
        except Exception as e:
            print(f"Exception in handle_socket: {e}")
            raise

    def register_websocket_handlers(self) -> int:
        count = 0
        for attr_name in dir(self):
            attr = getattr(self, attr_name)
            subscribe_type = getattr(attr, "_message_type", None)
            if subscribe_type:
                self.bus.subscribe(subscribe_type, attr)
                count = count + 1
        return count