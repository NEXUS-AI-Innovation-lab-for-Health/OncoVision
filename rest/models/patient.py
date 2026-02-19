from typing import Optional
from api.model import CamelModel


class Patient(CamelModel):
    """Patient model with medical information and associated image"""
    id: str
    name: str
    image_id: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    diagnosis: Optional[str] = None
    date_of_birth: Optional[str] = None
    last_visit: Optional[str] = None
    status: Optional[str] = None
    medical_history: Optional[str] = None
