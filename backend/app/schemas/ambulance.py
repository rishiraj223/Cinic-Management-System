from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# ------------------ Ambulance Vehicle Schemas ------------------

class AmbulanceCreate(BaseModel):
    vehicle_number: str
    vehicle_type: str = "Basic"  # Basic / Advanced Cardiac / ICU
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    service_area: Optional[str] = None
    is_available: bool = True
    base_latitude: float = 19.0760
    base_longitude: float = 72.8777


class AmbulanceUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    service_area: Optional[str] = None
    is_available: Optional[bool] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None


class AmbulanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    vehicle_number: str
    vehicle_type: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    service_area: Optional[str] = None
    is_available: bool
    current_latitude: float
    current_longitude: float
    created_at: datetime


# ------------------ Emergency Ambulance Request Schemas ------------------

class AmbulanceRequestCreate(BaseModel):
    organization_id: Optional[str] = None
    patient_name: str
    contact_phone: str
    pickup_address: str
    pickup_latitude: float = 19.0760
    pickup_longitude: float = 72.8777
    emergency_type: Optional[str] = "General Emergency"
    additional_notes: Optional[str] = None


class AmbulanceStatusUpdate(BaseModel):
    status: str  # accepted / on_the_way / arrived / completed / rejected / cancelled
    assigned_ambulance_id: Optional[str] = None
    cancellation_reason: Optional[str] = None
    eta_minutes: Optional[float] = None


class AmbulanceSimulatedTracking(BaseModel):
    request_id: str
    status: str
    eta_minutes: float
    ambulance_latitude: float
    ambulance_longitude: float
    pickup_latitude: float
    pickup_longitude: float
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_number: Optional[str] = None
    disclaimer: str = (
        "DEMO DATA ONLY: This is a simulation prototype and not connected to live emergency services. "
        "In case of a real emergency, immediately dial 112 / 911 / 108 or your national emergency number."
    )


class AmbulanceRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: Optional[str] = None
    user_id: Optional[str] = None
    patient_name: str
    contact_phone: str
    pickup_address: str
    pickup_latitude: float
    pickup_longitude: float
    emergency_type: Optional[str] = None
    additional_notes: Optional[str] = None
    status: str
    assigned_ambulance_id: Optional[str] = None
    eta_minutes: Optional[float] = None
    cancellation_reason: Optional[str] = None
    requested_at: datetime
    accepted_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_ambulance: Optional[AmbulanceRead] = None
