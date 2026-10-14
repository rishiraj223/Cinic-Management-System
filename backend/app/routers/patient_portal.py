from __future__ import annotations

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.schemas.clinic import AvailableSlot
from app.schemas.patient_portal import (
    PatientAppointmentRead,
    PatientBookAppointment,
    PatientCancelAppointment,
    PatientDashboardSummary,
    PatientProfileRead,
    PatientProfileUpdate,
    ProviderDetailResponse,
    ProviderSearchResult,
)
from app.services.patient_portal_service import patient_portal_service

router = APIRouter(prefix="/api/v1/patient", tags=["Patient Portal & Appointments"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
UserDep = Annotated[Profile, Depends(get_current_user)]


# ─── Patient Profile ─────────────────────────────────────────────────────────

@router.get("/profile", response_model=PatientProfileRead)
async def get_patient_profile(db: DbDep, user: UserDep):
    """Retrieve personal patient profile information."""
    return await patient_portal_service.get_patient_profile(db, user)


@router.put("/profile", response_model=PatientProfileRead)
async def update_patient_profile(data: PatientProfileUpdate, db: DbDep, user: UserDep):
    """Update personal patient profile (contact, address, allergies, emergency contacts)."""
    return await patient_portal_service.update_patient_profile(db, user, data)


# ─── Provider Discovery & Search ─────────────────────────────────────────────

@router.get("/providers", response_model=List[ProviderSearchResult])
async def search_providers(
    db: DbDep,
    q: Optional[str] = Query(None, description="Search term for provider name, doctor, dept or test"),
    type: Optional[str] = Query(None, description="Filter by clinic, hospital, or diagnostic_center"),
    specialty: Optional[str] = Query(None, description="Filter by doctor medical specialty"),
    city: Optional[str] = Query(None, description="Filter by city"),
):
    """Public or patient search for clinics, hospitals, and diagnostic centres."""
    return await patient_portal_service.search_providers(
        db, query=q, provider_type=type, specialty=specialty, city=city
    )


@router.get("/providers/{provider_id}", response_model=ProviderDetailResponse)
async def get_provider_details(provider_id: str, db: DbDep):
    """Get full details of a healthcare facility: doctors, departments, tests & services."""
    return await patient_portal_service.get_provider_details(db, provider_id)


@router.get("/doctors/{doctor_profile_id}/slots", response_model=List[AvailableSlot])
async def get_doctor_available_slots(doctor_profile_id: str, date: str, db: DbDep):
    """Fetch real-time available time slots for a doctor on a specific date (YYYY-MM-DD)."""
    return await patient_portal_service.get_doctor_slots(db, doctor_profile_id, date)


# ─── Appointment Booking & Management ────────────────────────────────────────

@router.post("/appointments", response_model=PatientAppointmentRead, status_code=status.HTTP_201_CREATED)
async def book_appointment(data: PatientBookAppointment, db: DbDep, user: UserDep):
    """Book a new appointment as an authenticated patient. Prevents duplicate slots."""
    return await patient_portal_service.book_appointment(db, user, data)


@router.get("/appointments", response_model=List[PatientAppointmentRead])
async def list_patient_appointments(
    db: DbDep,
    user: UserDep,
    upcoming_only: bool = Query(False, description="Filter only upcoming active appointments"),
):
    """List authenticated patient's personal appointments and history."""
    return await patient_portal_service.get_patient_appointments(db, user, upcoming_only)


@router.post("/appointments/{appointment_id}/cancel", response_model=PatientAppointmentRead)
async def cancel_appointment(
    appointment_id: str, data: PatientCancelAppointment, db: DbDep, user: UserDep
):
    """Cancel patient's own scheduled or confirmed appointment."""
    return await patient_portal_service.cancel_patient_appointment(db, user, appointment_id, data)


# ─── Patient Dashboard ───────────────────────────────────────────────────────

@router.get("/dashboard", response_model=PatientDashboardSummary)
async def get_patient_dashboard(db: DbDep, user: UserDep):
    """Summary of upcoming visits, count stats, and quick actions for the patient."""
    return await patient_portal_service.get_patient_dashboard(db, user)
