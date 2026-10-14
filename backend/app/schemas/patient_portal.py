from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# ------------------ Patient Profile ------------------

class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    blood_group: Optional[str] = None


class PatientProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    blood_group: Optional[str] = None


# ------------------ Provider Search & Details ------------------

class DoctorSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    doctor_name: str
    specialty: str
    qualifications: Optional[str] = None
    experience_years: int = 0
    consultation_fee: Decimal = Decimal("0.00")
    bio: Optional[str] = None
    is_available: bool = True
    department_name: Optional[str] = None


class ProviderSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    type: str  # clinic, hospital, diagnostic_center
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    doctors_count: int = 0
    services_count: int = 0


class ProviderDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    type: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    doctors: List[DoctorSearchResult] = []
    departments: List[str] = []
    services: List[str] = []


# ------------------ Patient Appointments ------------------

class PatientBookAppointment(BaseModel):
    organization_id: str
    doctor_profile_id: str
    appointment_date: date
    start_time: str
    end_time: str
    appointment_type: str = "consultation"
    reason: Optional[str] = None
    notes: Optional[str] = None


class PatientCancelAppointment(BaseModel):
    reason: Optional[str] = "Cancelled by patient"


class PatientAppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    organization_name: str
    organization_type: str
    organization_address: Optional[str] = None
    doctor_profile_id: str
    doctor_name: str
    doctor_specialty: str
    appointment_date: date
    start_time: str
    end_time: str
    appointment_type: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str
    cancelled_reason: Optional[str] = None
    scheduled_at: datetime


class PatientDashboardSummary(BaseModel):
    upcoming_appointments_count: int
    past_appointments_count: int
    cancelled_appointments_count: int
    next_appointment: Optional[PatientAppointmentRead] = None
