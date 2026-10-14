"""
Phase 3 Pydantic v2 schemas for clinic management.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# ─── Patient ────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    blood_group: Optional[str] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    blood_group: Optional[str] = None
    is_active: Optional[bool] = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    user_id: Optional[str] = None
    patient_code: str
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    blood_group: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PatientSearch(BaseModel):
    q: Optional[str] = None
    skip: int = 0
    limit: int = 50


# ─── DoctorSchedule ─────────────────────────────────────────────────────────

class DoctorScheduleCreate(BaseModel):
    day_of_week: int  # 0=Mon..6=Sun
    start_time: str
    end_time: str
    slot_duration_minutes: int = 30
    is_active: bool = True


class DoctorScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    doctor_profile_id: str
    organization_id: str
    day_of_week: int
    start_time: str
    end_time: str
    slot_duration_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ─── ScheduleException ──────────────────────────────────────────────────────

class ScheduleExceptionCreate(BaseModel):
    exception_date: date
    is_unavailable: bool = True
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: Optional[str] = None


class ScheduleExceptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    doctor_profile_id: str
    organization_id: str
    exception_date: date
    is_unavailable: bool
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime


# ─── AvailableSlot ──────────────────────────────────────────────────────────

class AvailableSlot(BaseModel):
    date: date
    start_time: str
    end_time: str
    is_available: bool


# ─── Appointment ─────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_profile_id: str
    appointment_date: date
    start_time: str
    end_time: str
    appointment_type: str = "consultation"
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None
    appointment_type: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: str
    cancelled_reason: Optional[str] = None


class AppointmentReschedule(BaseModel):
    appointment_date: date
    start_time: str
    end_time: str


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    patient_id: str
    doctor_profile_id: str
    appointment_date: date
    start_time: str
    end_time: str
    appointment_type: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str
    cancelled_reason: Optional[str] = None
    scheduled_at: datetime
    confirmed_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ─── QueueEntry ─────────────────────────────────────────────────────────────

class QueueEntryCreate(BaseModel):
    patient_id: Optional[str] = None
    doctor_profile_id: Optional[str] = None
    walk_in_name: Optional[str] = None
    notes: Optional[str] = None


class QueueEntryStatusUpdate(BaseModel):
    status: str


class QueueEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    patient_id: Optional[str] = None
    doctor_profile_id: Optional[str] = None
    queue_number: int
    walk_in_name: Optional[str] = None
    status: str
    arrived_at: datetime
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ─── PatientVisit ────────────────────────────────────────────────────────────

class PatientVisitCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    doctor_profile_id: str
    visit_date: Optional[date] = None
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[date] = None


class PatientVisitUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[date] = None


class PatientVisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    patient_id: str
    appointment_id: Optional[str] = None
    doctor_profile_id: str
    visit_date: date
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


# ─── Prescription ────────────────────────────────────────────────────────────

class PrescriptionItemCreate(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration: Optional[str] = None
    route: Optional[str] = None
    instructions: Optional[str] = None
    sort_order: int = 0


class PrescriptionItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    prescription_id: str
    medication_name: str
    dosage: str
    frequency: str
    duration: Optional[str] = None
    route: Optional[str] = None
    instructions: Optional[str] = None
    sort_order: int
    created_at: datetime


class PrescriptionCreate(BaseModel):
    patient_id: str
    visit_id: Optional[str] = None
    doctor_profile_id: str
    diagnosis_note: Optional[str] = None
    instructions: Optional[str] = None
    items: List[PrescriptionItemCreate] = []


class PrescriptionFinalizeRequest(BaseModel):
    pass  # No body needed, doctor identity from JWT


class PrescriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    patient_id: str
    visit_id: Optional[str] = None
    doctor_profile_id: str
    prescription_ref: str
    status: str
    diagnosis_note: Optional[str] = None
    instructions: Optional[str] = None
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: List[PrescriptionItemRead] = []


# ─── Invoice ─────────────────────────────────────────────────────────────────

class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: Decimal


class InvoiceItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    description: str
    quantity: int
    unit_price: Decimal
    total: Decimal
    created_at: datetime


class InvoiceCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    visit_id: Optional[str] = None
    discount: Decimal = Decimal("0.00")
    tax: Decimal = Decimal("0.00")
    notes: Optional[str] = None
    due_date: Optional[date] = None
    items: List[InvoiceItemCreate] = []


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    patient_id: str
    appointment_id: Optional[str] = None
    visit_id: Optional[str] = None
    invoice_number: str
    status: str
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    amount_paid: Decimal
    balance: Decimal
    notes: Optional[str] = None
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemRead] = []


# ─── Payment ─────────────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    amount: Decimal
    method: str  # cash/upi/card/bank_transfer/other
    payment_date: Optional[date] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    invoice_id: str
    recorded_by: Optional[str] = None
    amount: Decimal
    method: str
    payment_date: date
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime


# ─── FollowUp ────────────────────────────────────────────────────────────────

class FollowUpCreate(BaseModel):
    patient_id: str
    visit_id: Optional[str] = None
    doctor_profile_id: str
    follow_up_date: date
    reason: Optional[str] = None
    notes: Optional[str] = None


class FollowUpStatusUpdate(BaseModel):
    status: str  # pending/completed/cancelled
    notes: Optional[str] = None


class FollowUpRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    patient_id: str
    visit_id: Optional[str] = None
    doctor_profile_id: str
    follow_up_date: date
    reason: Optional[str] = None
    status: str
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    today_appointments: int
    checked_in: int
    waiting: int
    completed: int
    cancelled: int
    no_show: int
    today_collection: Decimal
    outstanding_balance: Decimal
    upcoming_followups: int
