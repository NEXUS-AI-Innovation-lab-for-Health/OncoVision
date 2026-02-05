from fastapi import APIRouter, Response, Request, FastAPI

class Controller(APIRouter):

    def __init__(self, path: str) -> None:
        super().__init__(prefix=f"/{path}", tags=[path])
        self._websocket_routes = []  # Store websocket routes for later registration

    def add_api_websocket_route(self, path, endpoint, name = None, *, dependencies = None):
        # Store websocket routes for registration on the FastAPI app
        # APIRouter.add_websocket_route has issues in FastAPI 0.128.1
        full_path = self.prefix + f"/{path}"
        self._websocket_routes.append({
            'path': full_path,
            'endpoint': endpoint,
            'name': name
        })
        return None
    
    def register_websockets(self, app: FastAPI) -> None:
        """Register all websocket routes on the FastAPI app"""
        for route in self._websocket_routes:
            app.add_websocket_route(route['path'], route['endpoint'], route['name'])