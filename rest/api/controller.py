from fastapi import APIRouter, Response, Request

class Controller(APIRouter):

    def __init__(self, path: str) -> None:
        super().__init__(prefix=f"/{path}", tags=[path])

    def add_api_websocket_route(self, path, endpoint, name = None, *, dependencies = None):
        # Use add_websocket_route (non-API version) to avoid WebSocket handshake issues
        # The add_api_websocket_route method can cause 403 errors
        full_path = f"/{path}"
        return super().add_websocket_route(full_path, endpoint, name)