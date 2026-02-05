from fastapi import APIRouter, Response, Request

class Controller(APIRouter):

    def __init__(self, path: str) -> None:
        super().__init__(prefix=f"/{path}", tags=[path])

    def add_api_websocket_route(self, path, endpoint, name = None, *, dependencies = None):
        return super().add_api_websocket_route(f"/{path}", endpoint, name, dependencies=dependencies)