import fastapi

class Controller(fastapi.APIRouter):

    def __init__(self, path: str) -> None:
        super().__init__(prefix=f"/{path}", tags=[path])