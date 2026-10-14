"""
Phase 3 Clinic Models: Patient, Appointment, Queue, Visit, Prescription, Invoice, Payment, FollowUp, AuditLog
All PKs/FKs are String(36) UUIDs. Money uses Numeric(10,2).
"""
import uuid
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Index,
    Integer, JSON, Numeric, String, Text, UniqueConstraint, func
)
from sqlalchemy.orm import relationship
from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    patient_code = Column(String(50), nullable=False)
    full_name = Column(String(255), nullable=False, index=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    allergies = Column(Text, nullable=True)
    blood_group = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "patient_code", name="uq_patient_code_org"),
    )

    # Relationships
    organization = relationship("Organization")
    user = relationship("Profile", foreign_keys=[user_id])
    creator = relationship("Profile", foreign_keys=[created_by])
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    visits = relationship("PatientVisit", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="patient", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="patient", cascade="all, delete-orphan")
    queue_entries = relationship("QueueEntry", back_populates="patient")


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Mon..6=Sun
    start_time = Column(String(10), nullable=False)  # e.g. '09:00'
    end_time = Column(String(10), nullable=False)
    slot_duration_minutes = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("doctor_profile_id", "day_of_week", name="uq_doctor_schedule_day"),
    )

    doctor_profile = relationship("DoctorProfile")
    organization = relationship("Organization")


class ScheduleException(Base):
    __tablename__ = "schedule_exceptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    exception_date = Column(Date, nullable=False)
    is_unavailable = Column(Boolean, default=True, nullable=False)
    start_time = Column(String(10), nullable=True)
    end_time = Column(String(10), nullable=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    doctor_profile = relationship("DoctorProfile")
    organization = relationship("Organization")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    appointment_date = Column(Date, nullable=False, index=True)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    appointment_type = Column(String(50), default="consultation", nullable=False)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="scheduled", nullable=False, index=True)
    cancelled_reason = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization")
    patient = relationship("Patient", back_populates="appointments")
    doctor_profile = relationship("DoctorProfile")
    creator = relationship("Profile", foreign_keys=[created_by])
    visits = relationship("PatientVisit", back_populates="appointment")
    invoices = relationship("Invoice", back_populates="appointment")


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    queue_number = Column(Integer, nullable=False)
    walk_in_name = Column(String(255), nullable=True)
    status = Column(String(50), default="waiting", nullable=False)
    arrived_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    called_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_queue_org_status", "organization_id", "status"),
    )

    organization = relationship("Organization")
    patient = relationship("Patient", back_populates="queue_entries")
    doctor_profile = relationship("DoctorProfile")


class PatientVisit(Base):
    __tablename__ = "patient_visits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(String(36), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    visit_date = Column(Date, nullable=False, index=True)
    chief_complaint = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    organization = relationship("Organization")
    patient = relationship("Patient", back_populates="visits")
    appointment = relationship("Appointment", back_populates="visits")
    doctor_profile = relationship("DoctorProfile")
    prescriptions = relationship("Prescription", back_populates="visit")
    invoices = relationship("Invoice", back_populates="visit")
    follow_ups = relationship("FollowUp", back_populates="visit")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    visit_id = Column(String(36), ForeignKey("patient_visits.id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    prescription_ref = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), default="draft", nullable=False)
    diagnosis_note = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    organization = relationship("Organization")
    patient = relationship("Patient", back_populates="prescriptions")
    visit = relationship("PatientVisit", back_populates="prescriptions")
    doctor_profile = relationship("DoctorProfile")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan", order_by="PrescriptionItem.sort_order")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String(36), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=False)
    duration = Column(String(100), nullable=True)
    route = Column(String(100), nullable=True)
    instructions = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    prescription = relationship("Prescription", back_populates="items")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(String(36), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    visit_id = Column(String(36), ForeignKey("patient_visits.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    invoice_number = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(50), default="unpaid", nullable=False, index=True)
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount = Column(Numeric(10, 2), default=0, nullable=False)
    tax = Column(Numeric(10, 2), default=0, nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0, nullable=False)
    balance = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    organization = relationship("Organization")
    patient = relationship("Patient", back_populates="invoices")
    appointment = relationship("Appointment", back_populates="invoices")
    visit = relationship("PatientVisit", back_populates="invoices")
    creator = relationship("Profile", foreign_keys=[created_by])
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(String(50), nullable=False)  # cash/upi/card/bank_transfer/other
    payment_date = Column(Date, nullable=False)
    reference_number = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization")
    invoice = relationship("Invoice", back_populates="payments")
    recorder = relationship("Profile", foreign_keys=[recorded_by])


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    visit_id = Column(String(36), ForeignKey("patient_visits.id", ondelete="SET NULL"), nullable=True)
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    follow_up_date = Column(Date, nullable=False, index=True)
    reason = Column(Text, nullable=True)
    status = Column(String(50), default="pending", nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    organization = relationship("Organization")
    patient = relationship("Patient", back_populates="follow_ups")
    visit = relationship("PatientVisit", back_populates="follow_ups")
    doctor_profile = relationship("DoctorProfile")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(36), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization")
    user = relationship("Profile")
