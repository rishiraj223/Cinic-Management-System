from __future__ import annotations

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Ambulance(Base):
    """Ambulance vehicle registered to a hospital or fleet operator."""

    __tablename__ = "ambulances"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_number = Column(String(50), nullable=False, index=True)
    vehicle_type = Column(String(50), default="Basic", nullable=False)  # Basic / Advanced Cardiac / ICU
    driver_name = Column(String(255), nullable=True)
    driver_phone = Column(String(50), nullable=True)
    service_area = Column(String(255), nullable=True)  # e.g., "South Zone / Downtown"
    is_available = Column(Boolean, default=True, nullable=False, index=True)
    base_latitude = Column(Float, default=19.0760, nullable=False)
    base_longitude = Column(Float, default=72.8777, nullable=False)
    current_latitude = Column(Float, default=19.0760, nullable=False)
    current_longitude = Column(Float, default=72.8777, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    organization = relationship("Organization")
    dispatches = relationship("AmbulanceRequest", back_populates="assigned_ambulance")


class AmbulanceRequest(Base):
    """Emergency ambulance assistance request raised by a patient or on behalf of a patient."""

    __tablename__ = "ambulance_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    patient_name = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    pickup_address = Column(Text, nullable=False)
    pickup_latitude = Column(Float, default=19.0760, nullable=False)
    pickup_longitude = Column(Float, default=72.8777, nullable=False)
    emergency_type = Column(String(100), nullable=True)  # Cardiac / Accident / Respiratory / General
    additional_notes = Column(Text, nullable=True)
    
    # Status: requested -> accepted -> on_the_way -> arrived -> completed / rejected / cancelled
    status = Column(String(50), default="requested", nullable=False, index=True)
    assigned_ambulance_id = Column(
        String(36), ForeignKey("ambulances.id", ondelete="SET NULL"), nullable=True, index=True
    )
    eta_minutes = Column(Float, default=15.0, nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    dispatched_at = Column(DateTime(timezone=True), nullable=True)
    arrived_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization")
    user = relationship("Profile", foreign_keys=[user_id])
    assigned_ambulance = relationship("Ambulance", back_populates="dispatches")
