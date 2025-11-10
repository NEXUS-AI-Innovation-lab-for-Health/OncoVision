from fastapi import APIRouter, Response, Request

class Controller(APIRouter):

    def __init__(self, path: str) -> None:
        super().__init__(prefix=f"/{path}", tags=[path])