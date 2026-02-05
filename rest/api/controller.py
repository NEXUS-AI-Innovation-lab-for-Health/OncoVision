from fastapi import APIRouter, Response, Request

class Controller(APIRouter):

    def __init__(self, path: str) -> None:
        super().__init__(prefix=f"/{path}", tags=[path])

    def add_api_websocket_route(self, path: str, endpoint):
        self.add_websocket_route(path, endpoint)