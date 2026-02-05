from __future__ import annotations
from typing import List

from api.controller import Controller
from models.patient import Patient


class PatientController(Controller):
    """Controller for patient-related endpoints"""

    def __init__(self) -> None:
        super().__init__("patients")
        
        # In-memory patient storage for now
        self._patients: List[Patient] = []
        
        self.add_api_route("", self.list_patients, methods=["GET"])

    def set_patients(self, patients: List[Patient]) -> None:
        """Set the patients list (used during startup to initialize with registered images)"""
        self._patients = patients

    async def list_patients(self) -> List[Patient]:
        """Return the list of patients with their associated image IDs"""
        return self._patients
