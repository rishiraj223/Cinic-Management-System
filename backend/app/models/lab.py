from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LabTest(Base):
    """Catalogue of available lab tests for a diagnostic centre."""

    __tablename__ = "lab_tests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    specimen_type = Column(String(100), nullable=True)  # blood, urine, stool, swab, etc.
    prep_instructions = Column(Text, nullable=True)
    turnaround_minutes = Column(Integer, nullable=True)  # expected TAT in minutes
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_lab_test_org_code"),)

    organization = relationship("Organization")
    order_items = relationship("LabOrderItem", back_populates="lab_test")


class LabOrder(Base):
    """A lab order raised for a patient (may contain multiple tests)."""

    __tablename__ = "lab_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id = Column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    referring_doctor_id = Column(
        String(36), ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    order_number = Column(String(100), unique=True, nullable=False)
    # pending / sample_collected / processing / partial_results / completed / cancelled
    status = Column(String(50), default="pending", nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    organization = relationship("Organization")
    patient = relationship("Patient")
    creator = relationship("Profile", foreign_keys=[created_by])
    referring_doctor = relationship("DoctorProfile", foreign_keys=[referring_doctor_id])
    items = relationship("LabOrderItem", back_populates="lab_order", cascade="all, delete-orphan")
    samples = relationship("LabSample", back_populates="lab_order", cascade="all, delete-orphan")
    diagnostic_reports = relationship("DiagnosticReport", back_populates="lab_order")


class LabOrderItem(Base):
    """Individual test within a lab order."""

    __tablename__ = "lab_order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lab_order_id = Column(
        String(36), ForeignKey("lab_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lab_test_id = Column(
        String(36), ForeignKey("lab_tests.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # ordered / awaiting_sample / in_progress / result_entered / pending_validation / validated / cancelled
    status = Column(String(50), default="ordered", nullable=False, index=True)
    price_at_order = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    lab_order = relationship("LabOrder", back_populates="items")
    lab_test = relationship("LabTest", back_populates="order_items")
    lab_result = relationship("LabResult", back_populates="lab_order_item", uselist=False)


class LabSample(Base):
    """Physical sample collected for a lab order."""

    __tablename__ = "lab_samples"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lab_order_id = Column(
        String(36), ForeignKey("lab_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sample_ref = Column(String(100), unique=True, nullable=False)
    sample_type = Column(String(100), nullable=True)
    # pending_collection / collected / received / processing / rejected / completed
    status = Column(String(50), default="pending_collection", nullable=False, index=True)
    collected_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    collected_at = Column(DateTime(timezone=True), nullable=True)
    received_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    received_at = Column(DateTime(timezone=True), nullable=True)
    rejected_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    organization = relationship("Organization")
    lab_order = relationship("LabOrder", back_populates="samples")
    collector = relationship("Profile", foreign_keys=[collected_by])
    receiver = relationship("Profile", foreign_keys=[received_by])
    lab_results = relationship("LabResult", back_populates="lab_sample")


class LabResult(Base):
    """Result for one test item in a lab order."""

    __tablename__ = "lab_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lab_order_item_id = Column(
        String(36), ForeignKey("lab_order_items.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    lab_sample_id = Column(
        String(36), ForeignKey("lab_samples.id", ondelete="SET NULL"), nullable=True, index=True
    )
    result_value = Column(Text, nullable=True)
    unit = Column(String(50), nullable=True)
    reference_range_low = Column(String(50), nullable=True)
    reference_range_high = Column(String(50), nullable=True)
    result_flag = Column(String(20), nullable=True)  # normal / low / high / critical
    entered_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    entered_at = Column(DateTime(timezone=True), nullable=True)
    validated_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    validated_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    # draft / entered / validated / amended
    status = Column(String(50), default="draft", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    organization = relationship("Organization")
    lab_order_item = relationship("LabOrderItem", back_populates="lab_result")
    lab_sample = relationship("LabSample", back_populates="lab_results")
    entered_by_profile = relationship("Profile", foreign_keys=[entered_by])
    validated_by_profile = relationship("Profile", foreign_keys=[validated_by])
    history = relationship("LabResultHistory", back_populates="lab_result", cascade="all, delete-orphan")


class LabResultHistory(Base):
    """Audit trail for lab result changes."""

    __tablename__ = "lab_result_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lab_result_id = Column(
        String(36), ForeignKey("lab_results.id", ondelete="CASCADE"), nullable=False, index=True
    )
    changed_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lab_result = relationship("LabResult", back_populates="history")
    changed_by_profile = relationship("Profile", foreign_keys=[changed_by])


class DiagnosticReport(Base):
    """Generated diagnostic report for a completed lab order."""

    __tablename__ = "diagnostic_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lab_order_id = Column(
        String(36), ForeignKey("lab_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    report_ref = Column(String(100), unique=True, nullable=False)
    # draft / validated / released
    status = Column(String(50), default="draft", nullable=False, index=True)
    validated_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    validated_at = Column(DateTime(timezone=True), nullable=True)
    released_by = Column(
        String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    released_at = Column(DateTime(timezone=True), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    organization = relationship("Organization")
    lab_order = relationship("LabOrder", back_populates="diagnostic_reports")
    validator = relationship("Profile", foreign_keys=[validated_by])
    releaser = relationship("Profile", foreign_keys=[released_by])
    delivery_events = relationship(
        "ReportDeliveryEvent", back_populates="diagnostic_report", cascade="all, delete-orphan"
    )


class ReportDeliveryEvent(Base):
    """Records when and how a diagnostic report was delivered."""

    __tablename__ = "report_delivery_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    diagnostic_report_id = Column(
        String(36),
        ForeignKey("diagnostic_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    delivered_to = Column(String(255), nullable=True)  # email, phone, or name
    delivery_method = Column(String(50), nullable=True)  # email / sms / in_app / printed
    delivery_status = Column(String(50), default="attempted", nullable=False)  # attempted / delivered / failed
    attempted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes = Column(Text, nullable=True)

    diagnostic_report = relationship("DiagnosticReport", back_populates="delivery_events")
