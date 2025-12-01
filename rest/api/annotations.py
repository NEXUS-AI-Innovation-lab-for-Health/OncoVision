from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class Annotation(BaseModel):
    imageId: str
    type: str
    x: float
    y: float
    width: float | None = None
    height: float | None = None
    radius: float | None = None
    text: str | None = None
    userId: str

@router.post("/annotations")
def save_annotation(annotation: Annotation):
    annotation_db = annotation.dict()
    annotation_db["createdAt"] = datetime.now()
    # TODO insert DB mongo/sql
    return {"status": "saved", "annotation": annotation_db}
