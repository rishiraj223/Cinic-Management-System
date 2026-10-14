"""
Phase 3 Clinic Router: all clinic/hospital management endpoints.
Prefix: /api/v1/organizations/{organization_id}/clinic
"""
from __future__ import annotations

from datetime import date
from io import BytesIO
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.schemas.clinic import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentReschedule,
    AppointmentStatusUpdate,
    AvailableSlot,
    DashboardSummary,
    DoctorScheduleCreate,
    DoctorScheduleRead,
    FollowUpCreate,
    FollowUpRead,
    FollowUpStatusUpdate,
    InvoiceCreate,
    InvoiceRead,
    PatientCreate,
    PatientRead,
    PatientUpdate,
    PatientVisitCreate,
    PatientVisitRead,
    PatientVisitUpdate,
    PaymentCreate,
    PaymentRead,
    PrescriptionCreate,
    PrescriptionRead,
    QueueEntryCreate,
    QueueEntryRead,
    QueueEntryStatusUpdate,
    ScheduleExceptionCreate,
    ScheduleExceptionRead,
)
from app.services.clinic_service import clinic_service
from app.utils.pdf_generator import generate_invoice_pdf, generate_prescription_pdf

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/clinic",
    tags=["Clinic"],
)

DbDep = Annotated[AsyncSession, Depends(get_db)]
UserDep = Annotated[Profile, Depends(get_current_user)]


# ─── Patients ─────────────────────────────────────────────────────────────────

@router.get("/patients", response_model=List[PatientRead])
async def list_patients(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    q: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_patients(db, organization_id, search=q, skip=skip, limit=limit)


@router.post("/patients", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
async def register_patient(
    organization_id: str,
    data: PatientCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.create_patient(db, organization_id, user, data)


@router.get("/patients/{patient_id}", response_model=PatientRead)
async def get_patient(
    organization_id: str,
    patient_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_patient(db, organization_id, patient_id)


@router.patch("/patients/{patient_id}", response_model=PatientRead)
async def update_patient(
    organization_id: str,
    patient_id: str,
    data: PatientUpdate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.update_patient(db, organization_id, patient_id, data)


# ─── Visits (per patient) ────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/visits", response_model=List[PatientVisitRead])
async def get_patient_visits(
    organization_id: str,
    patient_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_patient_visits(db, organization_id, patient_id)


# ─── Prescriptions (per patient) ─────────────────────────────────────────────

@router.get("/patients/{patient_id}/prescriptions", response_model=List[PrescriptionRead])
async def get_patient_prescriptions(
    organization_id: str,
    patient_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_patient_prescriptions(db, organization_id, patient_id)


# ─── Doctor Schedules ─────────────────────────────────────────────────────────

@router.get("/doctors/{doctor_id}/schedules", response_model=List[DoctorScheduleRead])
async def get_doctor_schedules(
    organization_id: str,
    doctor_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_doctor_schedules(db, organization_id, doctor_id)


@router.put("/doctors/{doctor_id}/schedules", response_model=List[DoctorScheduleRead])
async def upsert_doctor_schedules(
    organization_id: str,
    doctor_id: str,
    schedules: List[DoctorScheduleCreate],
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(
        db, organization_id, user.id,
        allowed_roles=["organization_owner", "doctor"],
    )
    results = []
    for s in schedules:
        result = await clinic_service.upsert_doctor_schedule(db, organization_id, doctor_id, s)
        results.append(result)
    return results


@router.get("/doctors/{doctor_id}/available-slots", response_model=List[AvailableSlot])
async def get_available_slots(
    organization_id: str,
    doctor_id: str,
    db: DbDep,
    user: UserDep,
    date: str = Query(..., description="YYYY-MM-DD"),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_available_slots(db, organization_id, doctor_id, date)


@router.post("/doctors/{doctor_id}/exceptions", response_model=ScheduleExceptionRead, status_code=201)
async def add_schedule_exception(
    organization_id: str,
    doctor_id: str,
    data: ScheduleExceptionCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(
        db, organization_id, user.id,
        allowed_roles=["organization_owner", "doctor"],
    )
    return await clinic_service.add_schedule_exception(db, organization_id, doctor_id, data)


# ─── Appointments ─────────────────────────────────────────────────────────────

@router.get("/appointments", response_model=List[AppointmentRead])
async def list_appointments(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    appt_date: Optional[str] = Query(None, alias="date"),
    doctor_id: Optional[str] = Query(None),
    appt_status: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    parsed_date = date.fromisoformat(appt_date) if appt_date else None
    return await clinic_service.get_appointments(
        db, organization_id,
        appt_date=parsed_date, doctor_id=doctor_id, appt_status=appt_status,
        skip=skip, limit=limit,
    )


@router.post("/appointments", response_model=AppointmentRead, status_code=201)
async def create_appointment(
    organization_id: str,
    data: AppointmentCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.create_appointment(db, organization_id, user, data)


@router.get("/appointments/{appointment_id}", response_model=AppointmentRead)
async def get_appointment(
    organization_id: str,
    appointment_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_appointment(db, organization_id, appointment_id)


@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentRead)
async def update_appointment_status(
    organization_id: str,
    appointment_id: str,
    data: AppointmentStatusUpdate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.update_appointment_status(
        db, organization_id, appointment_id,
        data.status, data.cancelled_reason,
    )


@router.patch("/appointments/{appointment_id}/reschedule", response_model=AppointmentRead)
async def reschedule_appointment(
    organization_id: str,
    appointment_id: str,
    data: AppointmentReschedule,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.reschedule_appointment(
        db, organization_id, appointment_id, data, user
    )


# ─── Queue ────────────────────────────────────────────────────────────────────

@router.get("/queue", response_model=List[QueueEntryRead])
async def get_queue(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    queue_date: Optional[str] = Query(None, alias="date"),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    parsed_date = date.fromisoformat(queue_date) if queue_date else None
    return await clinic_service.get_queue(db, organization_id, parsed_date)


@router.post("/queue", response_model=QueueEntryRead, status_code=201)
async def add_queue_entry(
    organization_id: str,
    data: QueueEntryCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.add_queue_entry(db, organization_id, user, data)


@router.patch("/queue/{entry_id}/status", response_model=QueueEntryRead)
async def update_queue_status(
    organization_id: str,
    entry_id: str,
    data: QueueEntryStatusUpdate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.update_queue_status(db, organization_id, entry_id, data.status)


# ─── Visits ───────────────────────────────────────────────────────────────────

@router.post("/visits", response_model=PatientVisitRead, status_code=201)
async def create_visit(
    organization_id: str,
    data: PatientVisitCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.create_visit(db, organization_id, user, data)


@router.get("/visits/{visit_id}", response_model=PatientVisitRead)
async def get_visit(
    organization_id: str,
    visit_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_visit(db, organization_id, visit_id)


@router.patch("/visits/{visit_id}", response_model=PatientVisitRead)
async def update_visit(
    organization_id: str,
    visit_id: str,
    data: PatientVisitUpdate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.update_visit(db, organization_id, visit_id, data)


# ─── Prescriptions ────────────────────────────────────────────────────────────

@router.post("/prescriptions", response_model=PrescriptionRead, status_code=201)
async def create_prescription(
    organization_id: str,
    data: PrescriptionCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(
        db, organization_id, user.id,
        allowed_roles=["organization_owner", "doctor"],
    )
    return await clinic_service.create_prescription(db, organization_id, user, data)


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionRead)
async def get_prescription(
    organization_id: str,
    prescription_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_prescription(db, organization_id, prescription_id)


@router.post("/prescriptions/{prescription_id}/finalize", response_model=PrescriptionRead)
async def finalize_prescription(
    organization_id: str,
    prescription_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(
        db, organization_id, user.id,
        allowed_roles=["organization_owner", "doctor"],
    )
    return await clinic_service.finalize_prescription(
        db, organization_id, prescription_id, user.id
    )


@router.get("/prescriptions/{prescription_id}/pdf")
async def download_prescription_pdf(
    organization_id: str,
    prescription_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    pdf_data = await clinic_service.get_prescription_pdf_data(db, organization_id, prescription_id)
    pdf_bytes = generate_prescription_pdf(
        prescription_data=pdf_data["prescription"],
        org_data=pdf_data["org"],
        patient_data=pdf_data["patient"],
        doctor_data=pdf_data["doctor"],
    )
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=prescription-{prescription_id[:8]}.pdf"},
    )


# ─── Invoices ─────────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=List[InvoiceRead])
async def list_invoices(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    patient_id: Optional[str] = Query(None),
    inv_status: Optional[str] = Query(None, alias="status"),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_invoices(
        db, organization_id, patient_id=patient_id, inv_status=inv_status
    )


@router.post("/invoices", response_model=InvoiceRead, status_code=201)
async def create_invoice(
    organization_id: str,
    data: InvoiceCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.create_invoice(db, organization_id, user, data)


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    organization_id: str,
    invoice_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.get_invoice(db, organization_id, invoice_id)


@router.post("/invoices/{invoice_id}/payments", response_model=PaymentRead, status_code=201)
async def record_payment(
    organization_id: str,
    invoice_id: str,
    data: PaymentCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.record_payment(db, organization_id, invoice_id, user, data)


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    organization_id: str,
    invoice_id: str,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    pdf_data = await clinic_service.get_invoice_pdf_data(db, organization_id, invoice_id)
    pdf_bytes = generate_invoice_pdf(
        invoice_data=pdf_data["invoice"],
        org_data=pdf_data["org"],
        patient_data=pdf_data["patient"],
        items=pdf_data["items"],
    )
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{invoice_id[:8]}.pdf"},
    )


# ─── Follow-ups ───────────────────────────────────────────────────────────────

@router.get("/followups", response_model=List[FollowUpRead])
async def list_followups(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    doctor_id: Optional[str] = Query(None),
    fu_status: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    df = date.fromisoformat(date_from) if date_from else None
    dt = date.fromisoformat(date_to) if date_to else None
    return await clinic_service.get_followups(
        db, organization_id, doctor_id=doctor_id, fu_status=fu_status,
        date_from=df, date_to=dt,
    )


@router.post("/followups", response_model=FollowUpRead, status_code=201)
async def create_followup(
    organization_id: str,
    data: FollowUpCreate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.create_followup(db, organization_id, user, data)


@router.patch("/followups/{followup_id}/status", response_model=FollowUpRead)
async def update_followup_status(
    organization_id: str,
    followup_id: str,
    data: FollowUpStatusUpdate,
    db: DbDep,
    user: UserDep,
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    return await clinic_service.update_followup_status(db, organization_id, followup_id, data)


# ─── Dashboard & Reports ──────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    date: Optional[str] = Query(None),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    summary = await clinic_service.get_dashboard_summary(db, organization_id, date)
    return summary


@router.get("/reports/daily")
async def get_daily_report(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    date: Optional[str] = Query(None),
):
    await clinic_service.verify_org_membership(db, organization_id, user.id)
    summary = await clinic_service.get_dashboard_summary(db, organization_id, date)
    target = date or str(__import__("datetime").date.today())
    return {"date": target, **summary}


@router.get("/reports/monthly")
async def get_monthly_report(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
):
    from datetime import date as _date
    from sqlalchemy import extract

    await clinic_service.verify_org_membership(db, organization_id, user.id)
    from app.models.clinic import Appointment, Invoice, Payment
    from sqlalchemy import func, select

    # Appointments this month
    appt_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.organization_id == organization_id,
            extract("year", Appointment.appointment_date) == year,
            extract("month", Appointment.appointment_date) == month,
        )
    )
    total_appts = appt_result.scalar() or 0

    # Revenue this month
    rev_result = await db.execute(
        select(func.sum(Payment.amount)).where(
            Payment.organization_id == organization_id,
            extract("year", Payment.payment_date) == year,
            extract("month", Payment.payment_date) == month,
        )
    )
    revenue = rev_result.scalar() or 0

    return {
        "year": year,
        "month": month,
        "total_appointments": total_appts,
        "total_revenue": float(revenue),
    }
