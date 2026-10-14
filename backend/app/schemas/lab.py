from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ─────────────────────── LabTest ───────────────────────

class LabTestCreate(BaseModel):
    name: str
    code: str
    category: Optional[str] = None
    description: Optional[str] = None
    price: Decimal
    specimen_type: Optional[str] = None
    prep_instructions: Optional[str] = None
    turnaround_minutes: Optional[int] = None
    is_active: bool = True


class LabTestUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    specimen_type: Optional[str] = None
    prep_instructions: Optional[str] = None
    turnaround_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class LabTestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    code: str
    category: Optional[str]
    description: Optional[str]
    price: Decimal
    specimen_type: Optional[str]
    prep_instructions: Optional[str]
    turnaround_minutes: Optional[int]
    is_active: bool
    created_at: datetime


# ─────────────────────── LabOrder ───────────────────────

class LabOrderItemCreate(BaseModel):
    lab_test_id: str


class LabOrderCreate(BaseModel):
    patient_id: str
    referring_doctor_id: Optional[str] = None
    notes: Optional[str] = None
    items: List[LabOrderItemCreate]


class LabOrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    lab_order_id: str
    lab_test_id: str
    status: str
    price_at_order: Decimal
    created_at: datetime
    lab_test: Optional[LabTestRead] = None


class LabOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    patient_id: str
    created_by: Optional[str]
    referring_doctor_id: Optional[str]
    order_number: str
    status: str
    notes: Optional[str]
    created_at: datetime
    items: List[LabOrderItemRead] = []


# ─────────────────────── LabSample ───────────────────────

class LabSampleCreate(BaseModel):
    lab_order_id: str
    sample_type: Optional[str] = None


class LabSampleStatusUpdate(BaseModel):
    status: str
    rejected_reason: Optional[str] = None


class LabSampleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    lab_order_id: str
    sample_ref: str
    sample_type: Optional[str]
    status: str
    collected_by: Optional[str]
    collected_at: Optional[datetime]
    received_by: Optional[str]
    received_at: Optional[datetime]
    rejected_reason: Optional[str]
    created_at: datetime


# ─────────────────────── LabResult ───────────────────────

class LabResultCreate(BaseModel):
    lab_order_item_id: str
    lab_sample_id: Optional[str] = None
    result_value: Optional[str] = None
    unit: Optional[str] = None
    reference_range_low: Optional[str] = None
    reference_range_high: Optional[str] = None
    result_flag: Optional[str] = None  # normal / low / high / critical
    notes: Optional[str] = None


class LabResultUpdate(BaseModel):
    result_value: Optional[str] = None
    unit: Optional[str] = None
    reference_range_low: Optional[str] = None
    reference_range_high: Optional[str] = None
    result_flag: Optional[str] = None
    notes: Optional[str] = None
    reason: Optional[str] = None  # reason for amendment — stored in history


class LabResultValidate(BaseModel):
    notes: Optional[str] = None


class LabResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    lab_order_item_id: str
    lab_sample_id: Optional[str]
    result_value: Optional[str]
    unit: Optional[str]
    reference_range_low: Optional[str]
    reference_range_high: Optional[str]
    result_flag: Optional[str]
    entered_by: Optional[str]
    entered_at: Optional[datetime]
    validated_by: Optional[str]
    validated_at: Optional[datetime]
    notes: Optional[str]
    status: str
    created_at: datetime


# ─────────────────────── DiagnosticReport ───────────────────────

class DiagnosticReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    lab_order_id: str
    report_ref: str
    status: str
    validated_by: Optional[str]
    validated_at: Optional[datetime]
    released_by: Optional[str]
    released_at: Optional[datetime]
    created_at: datetime


class ReportDeliveryCreate(BaseModel):
    delivered_to: Optional[str] = None
    delivery_method: Optional[str] = None  # email / sms / in_app / printed
    notes: Optional[str] = None


class ReportDeliveryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    diagnostic_report_id: str
    delivered_to: Optional[str]
    delivery_method: Optional[str]
    delivery_status: str
    attempted_at: datetime
    notes: Optional[str]


# ─────────────────────── Lab Dashboard ───────────────────────

class LabDashboardSummary(BaseModel):
    total_tests_in_catalogue: int
    orders_today: int
    samples_pending_collection: int
    results_pending_validation: int
    reports_released_today: int
    total_revenue_today: float
