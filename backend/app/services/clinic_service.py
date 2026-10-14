"""
Phase 3 Clinic Service: business logic for patient, appointment, queue,
visit, prescription, invoice, payment, follow-up, dashboard operations.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.clinic import (
    Appointment,
    AuditLog,
    DoctorSchedule,
    FollowUp,
    Invoice,
    InvoiceItem,
    Patient,
    PatientVisit,
    Payment,
    Prescription,
    PrescriptionItem,
    QueueEntry,
    ScheduleException,
)
from app.models.organization import Organization, OrganizationMember
from app.models.provider import DoctorProfile
from app.models.user import Profile
from app.schemas.clinic import (
    AppointmentCreate,
    AppointmentReschedule,
    DoctorScheduleCreate,
    FollowUpCreate,
    FollowUpStatusUpdate,
    InvoiceCreate,
    PatientCreate,
    PatientUpdate,
    PatientVisitCreate,
    PatientVisitUpdate,
    PaymentCreate,
    PrescriptionCreate,
    QueueEntryCreate,
    ScheduleExceptionCreate,
)


class ClinicService:
    # ─── Helpers ─────────────────────────────────────────────────────────────

    async def verify_org_membership(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        allowed_roles: Optional[List[str]] = None,
    ) -> OrganizationMember:
        """
        Verifies user is an active member of the org.
        If allowed_roles provided, also checks role membership.
        Raises 403 if not authorized.
        """
        result = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.status == "active",
            )
        )
        member = result.scalars().first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this organization",
            )
        if allowed_roles and member.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{member.role}' is not allowed for this action",
            )
        return member

    async def _get_org(self, db: AsyncSession, org_id: str) -> Organization:
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        org = result.scalars().first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        return org

    # ─── Patients ────────────────────────────────────────────────────────────

    async def _next_patient_code(self, db: AsyncSession, org_id: str) -> str:
        """Auto-generate patient_code like PT-0001"""
        result = await db.execute(
            select(func.count()).select_from(Patient).where(Patient.organization_id == org_id)
        )
        count = result.scalar() or 0
        return f"PT-{count + 1:04d}"

    async def create_patient(
        self,
        db: AsyncSession,
        org_id: str,
        user: Profile,
        data: PatientCreate,
    ) -> Patient:
        code = await self._next_patient_code(db, org_id)
        patient = Patient(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            created_by=user.id,
            patient_code=code,
            **data.model_dump(),
        )
        db.add(patient)
        await db.commit()
        await db.refresh(patient)
        return patient

    async def get_patients(
        self,
        db: AsyncSession,
        org_id: str,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Patient]:
        q = select(Patient).where(
            Patient.organization_id == org_id,
            Patient.is_active == True,
        )
        if search:
            like = f"%{search}%"
            q = q.where(
                or_(
                    Patient.full_name.ilike(like),
                    Patient.patient_code.ilike(like),
                    Patient.phone.ilike(like),
                    Patient.email.ilike(like),
                )
            )
        q = q.order_by(Patient.full_name).offset(skip).limit(limit)
        result = await db.execute(q)
        return list(result.scalars().all())

    async def get_patient(self, db: AsyncSession, org_id: str, patient_id: str) -> Patient:
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id, Patient.organization_id == org_id)
        )
        patient = result.scalars().first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient

    async def update_patient(
        self,
        db: AsyncSession,
        org_id: str,
        patient_id: str,
        data: PatientUpdate,
    ) -> Patient:
        patient = await self.get_patient(db, org_id, patient_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(patient, k, v)
        await db.commit()
        await db.refresh(patient)
        return patient

    # ─── Doctor Schedules ────────────────────────────────────────────────────

    async def get_doctor_schedules(
        self,
        db: AsyncSession,
        org_id: str,
        doctor_profile_id: str,
    ) -> List[DoctorSchedule]:
        result = await db.execute(
            select(DoctorSchedule).where(
                DoctorSchedule.organization_id == org_id,
                DoctorSchedule.doctor_profile_id == doctor_profile_id,
                DoctorSchedule.is_active == True,
            ).order_by(DoctorSchedule.day_of_week)
        )
        return list(result.scalars().all())

    async def upsert_doctor_schedule(
        self,
        db: AsyncSession,
        org_id: str,
        doctor_profile_id: str,
        data: DoctorScheduleCreate,
    ) -> DoctorSchedule:
        result = await db.execute(
            select(DoctorSchedule).where(
                DoctorSchedule.doctor_profile_id == doctor_profile_id,
                DoctorSchedule.day_of_week == data.day_of_week,
            )
        )
        existing = result.scalars().first()
        if existing:
            existing.start_time = data.start_time
            existing.end_time = data.end_time
            existing.slot_duration_minutes = data.slot_duration_minutes
            existing.is_active = data.is_active
            await db.commit()
            await db.refresh(existing)
            return existing
        schedule = DoctorSchedule(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            doctor_profile_id=doctor_profile_id,
            **data.model_dump(),
        )
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        return schedule

    async def get_available_slots(
        self,
        db: AsyncSession,
        org_id: str,
        doctor_profile_id: str,
        date_str: str,
    ) -> List[dict]:
        """Return list of {start_time, end_time, is_available} for a given date."""
        target_date = date.fromisoformat(date_str)
        day_of_week = target_date.weekday()  # 0=Mon..6=Sun

        # Get schedule for this day
        result = await db.execute(
            select(DoctorSchedule).where(
                DoctorSchedule.doctor_profile_id == doctor_profile_id,
                DoctorSchedule.organization_id == org_id,
                DoctorSchedule.day_of_week == day_of_week,
                DoctorSchedule.is_active == True,
            )
        )
        schedule = result.scalars().first()

        # Check for exceptions on that date first
        exc_result = await db.execute(
            select(ScheduleException).where(
                ScheduleException.doctor_profile_id == doctor_profile_id,
                ScheduleException.exception_date == target_date,
            )
        )
        exception = exc_result.scalars().first()
        if exception and exception.is_unavailable:
            return []

        def _parse_time(t: str):
            h, m = t.split(":")
            return int(h), int(m)

        if not schedule:
            # Default standard working hours (09:00 - 17:00, 30 min slots)
            # so patients can always book appointments even before doctor customizes weekly slots
            sh, sm = 9, 0
            eh, em = 17, 0
            duration = 30
        else:
            sh, sm = _parse_time(schedule.start_time)
            eh, em = _parse_time(schedule.end_time)
            duration = schedule.slot_duration_minutes

        slots = []
        cur_h, cur_m = sh, sm
        while True:
            next_m = cur_m + duration
            next_h = cur_h + next_m // 60
            next_m = next_m % 60
            if next_h > eh or (next_h == eh and next_m > em):
                break
            start_str = f"{cur_h:02d}:{cur_m:02d}"
            end_str = f"{next_h:02d}:{next_m:02d}"
            slots.append({"date": target_date, "start_time": start_str, "end_time": end_str})
            cur_h, cur_m = next_h, next_m

        # Get booked appointments for that date
        appt_result = await db.execute(
            select(Appointment).where(
                Appointment.doctor_profile_id == doctor_profile_id,
                Appointment.appointment_date == target_date,
                Appointment.status.notin_(["cancelled", "no_show"]),
            )
        )
        booked = appt_result.scalars().all()
        booked_times = {(a.start_time, a.end_time) for a in booked}

        return [
            {**s, "is_available": (s["start_time"], s["end_time"]) not in booked_times}
            for s in slots
        ]

    async def add_schedule_exception(
        self,
        db: AsyncSession,
        org_id: str,
        doctor_profile_id: str,
        data: ScheduleExceptionCreate,
    ) -> ScheduleException:
        exc = ScheduleException(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            doctor_profile_id=doctor_profile_id,
            **data.model_dump(),
        )
        db.add(exc)
        await db.commit()
        await db.refresh(exc)
        return exc

    # ─── Appointments ────────────────────────────────────────────────────────

    async def create_appointment(
        self,
        db: AsyncSession,
        org_id: str,
        user: Profile,
        data: AppointmentCreate,
    ) -> Appointment:
        # Conflict check
        conflict = await db.execute(
            select(Appointment).where(
                Appointment.doctor_profile_id == data.doctor_profile_id,
                Appointment.appointment_date == data.appointment_date,
                Appointment.status.notin_(["cancelled", "no_show"]),
                or_(
                    and_(
                        Appointment.start_time < data.end_time,
                        Appointment.end_time > data.start_time,
                    )
                ),
            )
        )
        if conflict.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Doctor already has an appointment in this time slot",
            )
        appt = Appointment(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            created_by=user.id,
            scheduled_at=datetime.utcnow(),
            **data.model_dump(),
        )
        db.add(appt)
        await db.commit()
        await db.refresh(appt)
        return appt

    async def get_appointments(
        self,
        db: AsyncSession,
        org_id: str,
        appt_date: Optional[date] = None,
        doctor_id: Optional[str] = None,
        appt_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Appointment]:
        q = select(Appointment).where(Appointment.organization_id == org_id)
        if appt_date:
            q = q.where(Appointment.appointment_date == appt_date)
        if doctor_id:
            q = q.where(Appointment.doctor_profile_id == doctor_id)
        if appt_status:
            q = q.where(Appointment.status == appt_status)
        q = q.order_by(Appointment.appointment_date, Appointment.start_time).offset(skip).limit(limit)
        result = await db.execute(q)
        return list(result.scalars().all())

    async def get_appointment(self, db: AsyncSession, org_id: str, appt_id: str) -> Appointment:
        result = await db.execute(
            select(Appointment).where(
                Appointment.id == appt_id,
                Appointment.organization_id == org_id,
            )
        )
        appt = result.scalars().first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return appt

    async def update_appointment_status(
        self,
        db: AsyncSession,
        org_id: str,
        appt_id: str,
        new_status: str,
        reason: Optional[str] = None,
    ) -> Appointment:
        appt = await self.get_appointment(db, org_id, appt_id)
        appt.status = new_status
        now = datetime.utcnow()
        if new_status == "confirmed":
            appt.confirmed_at = now
        elif new_status == "checked_in":
            appt.checked_in_at = now
        elif new_status == "completed":
            appt.completed_at = now
        elif new_status in ("cancelled", "no_show"):
            appt.cancelled_at = now
            if reason:
                appt.cancelled_reason = reason
        await db.commit()
        await db.refresh(appt)
        return appt

    async def reschedule_appointment(
        self,
        db: AsyncSession,
        org_id: str,
        appt_id: str,
        data: AppointmentReschedule,
        user: Profile,
    ) -> Appointment:
        appt = await self.get_appointment(db, org_id, appt_id)
        # Conflict check excluding self
        conflict = await db.execute(
            select(Appointment).where(
                Appointment.doctor_profile_id == appt.doctor_profile_id,
                Appointment.appointment_date == data.appointment_date,
                Appointment.id != appt_id,
                Appointment.status.notin_(["cancelled", "no_show"]),
                and_(
                    Appointment.start_time < data.end_time,
                    Appointment.end_time > data.start_time,
                ),
            )
        )
        if conflict.scalars().first():
            raise HTTPException(status_code=409, detail="Time slot conflict on new date")
        appt.appointment_date = data.appointment_date
        appt.start_time = data.start_time
        appt.end_time = data.end_time
        appt.status = "scheduled"
        await db.commit()
        await db.refresh(appt)
        return appt

    # ─── Queue ───────────────────────────────────────────────────────────────

    async def _next_queue_number(self, db: AsyncSession, org_id: str) -> int:
        today = date.today()
        result = await db.execute(
            select(func.max(QueueEntry.queue_number)).where(
                QueueEntry.organization_id == org_id,
                func.date(QueueEntry.arrived_at) == today,
            )
        )
        max_num = result.scalar() or 0
        return max_num + 1

    async def add_queue_entry(
        self,
        db: AsyncSession,
        org_id: str,
        user: Profile,
        data: QueueEntryCreate,
    ) -> QueueEntry:
        queue_number = await self._next_queue_number(db, org_id)
        entry = QueueEntry(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            queue_number=queue_number,
            **data.model_dump(),
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    async def get_queue(
        self,
        db: AsyncSession,
        org_id: str,
        queue_date: Optional[date] = None,
    ) -> List[QueueEntry]:
        target = queue_date or date.today()
        result = await db.execute(
            select(QueueEntry).where(
                QueueEntry.organization_id == org_id,
                func.date(QueueEntry.arrived_at) == target,
            ).order_by(QueueEntry.queue_number)
        )
        return list(result.scalars().all())

    async def update_queue_status(
        self,
        db: AsyncSession,
        org_id: str,
        entry_id: str,
        new_status: str,
    ) -> QueueEntry:
        result = await db.execute(
            select(QueueEntry).where(
                QueueEntry.id == entry_id,
                QueueEntry.organization_id == org_id,
            )
        )
        entry = result.scalars().first()
        if not entry:
            raise HTTPException(status_code=404, detail="Queue entry not found")
        entry.status = new_status
        now = datetime.utcnow()
        if new_status == "called":
            entry.called_at = now
        elif new_status in ("completed", "cancelled"):
            entry.completed_at = now
        await db.commit()
        await db.refresh(entry)
        return entry

    # ─── Visits ──────────────────────────────────────────────────────────────

    async def create_visit(
        self,
        db: AsyncSession,
        org_id: str,
        user: Profile,
        data: PatientVisitCreate,
    ) -> PatientVisit:
        payload = data.model_dump()
        if not payload.get("visit_date"):
            payload["visit_date"] = date.today()
        visit = PatientVisit(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            **payload,
        )
        db.add(visit)
        await db.commit()
        await db.refresh(visit)
        return visit

    async def get_patient_visits(
        self,
        db: AsyncSession,
        org_id: str,
        patient_id: str,
    ) -> List[PatientVisit]:
        result = await db.execute(
            select(PatientVisit).where(
                PatientVisit.organization_id == org_id,
                PatientVisit.patient_id == patient_id,
            ).order_by(PatientVisit.visit_date.desc())
        )
        return list(result.scalars().all())

    async def get_visit(self, db: AsyncSession, org_id: str, visit_id: str) -> PatientVisit:
        result = await db.execute(
            select(PatientVisit).where(
                PatientVisit.id == visit_id,
                PatientVisit.organization_id == org_id,
            )
        )
        visit = result.scalars().first()
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")
        return visit

    async def update_visit(
        self,
        db: AsyncSession,
        org_id: str,
        visit_id: str,
        data: PatientVisitUpdate,
    ) -> PatientVisit:
        visit = await self.get_visit(db, org_id, visit_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(visit, k, v)
        await db.commit()
        await db.refresh(visit)
        return visit

    # ─── Prescriptions ───────────────────────────────────────────────────────

    async def _next_prescription_ref(self, db: AsyncSession, org_id: str) -> str:
        result = await db.execute(
            select(func.count()).select_from(Prescription).where(Prescription.organization_id == org_id)
        )
        count = result.scalar() or 0
        year = datetime.utcnow().year
        return f"RX-{year}-{count + 1:04d}"

    async def create_prescription(
        self,
        db: AsyncSession,
        org_id: str,
        user: Profile,
        data: PrescriptionCreate,
    ) -> Prescription:
        ref = await self._next_prescription_ref(db, org_id)
        items_data = data.items
        rx_data = data.model_dump(exclude={"items"})
        prescription = Prescription(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            prescription_ref=ref,
            **rx_data,
        )
        db.add(prescription)
        await db.flush()  # get prescription.id

        for item_data in items_data:
            item = PrescriptionItem(
                id=str(uuid.uuid4()),
                prescription_id=prescription.id,
                **item_data.model_dump(),
            )
            db.add(item)

        await db.commit()
        await db.refresh(prescription)
        # Load items
        result = await db.execute(
            select(Prescription)
            .options(selectinload(Prescription.items))
            .where(Prescription.id == prescription.id)
        )
        return result.scalars().first()

    async def get_prescription(
        self,
        db: AsyncSession,
        org_id: str,
        prescription_id: str,
    ) -> Prescription:
        result = await db.execute(
            select(Prescription)
            .options(selectinload(Prescription.items))
            .where(
                Prescription.id == prescription_id,
                Prescription.organization_id == org_id,
            )
        )
        rx = result.scalars().first()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return rx

    async def get_patient_prescriptions(
        self,
        db: AsyncSession,
        org_id: str,
        patient_id: str,
    ) -> List[Prescription]:
        result = await db.execute(
            select(Prescription)
            .options(selectinload(Prescription.items))
            .where(
                Prescription.organization_id == org_id,
                Prescription.patient_id == patient_id,
            )
            .order_by(Prescription.created_at.desc())
        )
        return list(result.scalars().all())

    async def finalize_prescription(
        self,
        db: AsyncSession,
        org_id: str,
        prescription_id: str,
        doctor_user_id: str,
    ) -> Prescription:
        rx = await self.get_prescription(db, org_id, prescription_id)
        if rx.status == "finalized":
            raise HTTPException(status_code=400, detail="Prescription already finalized")
        rx.status = "finalized"
        rx.finalized_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rx)
        return rx

    async def get_prescription_pdf_data(
        self,
        db: AsyncSession,
        org_id: str,
        prescription_id: str,
    ) -> dict:
        rx = await self.get_prescription(db, org_id, prescription_id)
        org = await self._get_org(db, org_id)
        patient = await self.get_patient(db, org_id, rx.patient_id)

        # Load doctor profile + user
        dr_result = await db.execute(
            select(DoctorProfile).where(DoctorProfile.id == rx.doctor_profile_id)
        )
        doctor_profile = dr_result.scalars().first()
        doctor_user = None
        if doctor_profile:
            u_result = await db.execute(
                select(Profile).where(Profile.id == doctor_profile.user_id)
            )
            doctor_user = u_result.scalars().first()

        return {
            "prescription": {
                "prescription_ref": rx.prescription_ref,
                "status": rx.status,
                "diagnosis_note": rx.diagnosis_note,
                "instructions": rx.instructions,
                "finalized_at": rx.finalized_at,
                "created_at": rx.created_at,
                "items": [
                    {
                        "medication_name": i.medication_name,
                        "dosage": i.dosage,
                        "frequency": i.frequency,
                        "duration": i.duration,
                        "route": i.route,
                        "instructions": i.instructions,
                    }
                    for i in rx.items
                ],
            },
            "org": {
                "name": org.name,
                "address": org.address,
                "city": org.city,
                "state": org.state,
                "phone": org.phone,
                "currency": "INR",
            },
            "patient": {
                "full_name": patient.full_name,
                "patient_code": patient.patient_code,
                "date_of_birth": patient.date_of_birth,
                "gender": patient.gender,
                "phone": patient.phone,
            },
            "doctor": {
                "full_name": doctor_user.full_name if doctor_user else "",
                "specialty": doctor_profile.specialty if doctor_profile else "",
                "license_number": doctor_profile.license_number if doctor_profile else "",
            },
        }

    # ─── Invoices ─────────────────────────────────────────────────────────────

    async def _next_invoice_number(self, db: AsyncSession, org_id: str) -> str:
        result = await db.execute(
            select(func.count()).select_from(Invoice).where(Invoice.organization_id == org_id)
        )
        count = result.scalar() or 0
        year = datetime.utcnow().year
        return f"INV-{year}-{count + 1:04d}"

    async def create_invoice(
        self,
        db: AsyncSession,
        org_id: str,
        user: Profile,
        data: InvoiceCreate,
    ) -> Invoice:
        inv_num = await self._next_invoice_number(db, org_id)
        items_data = data.items

        subtotal = sum(
            Decimal(str(i.unit_price)) * i.quantity for i in items_data
        )
        discount = Decimal(str(data.discount))
        tax = Decimal(str(data.tax))
        total = subtotal - discount + tax
        balance = total  # no payment yet

        inv_dict = data.model_dump(exclude={"items"})
        invoice = Invoice(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            created_by=user.id,
            invoice_number=inv_num,
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            total=total,
            amount_paid=Decimal("0.00"),
            balance=balance,
            patient_id=inv_dict["patient_id"],
            appointment_id=inv_dict.get("appointment_id"),
            visit_id=inv_dict.get("visit_id"),
            notes=inv_dict.get("notes"),
            due_date=inv_dict.get("due_date"),
        )
        db.add(invoice)
        await db.flush()

        for item_data in items_data:
            item = InvoiceItem(
                id=str(uuid.uuid4()),
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=Decimal(str(item_data.unit_price)),
                total=Decimal(str(item_data.unit_price)) * item_data.quantity,
            )
            db.add(item)

        await db.commit()
        await db.refresh(invoice)
        result = await db.execute(
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(Invoice.id == invoice.id)
        )
        return result.scalars().first()

    async def get_invoices(
        self,
        db: AsyncSession,
        org_id: str,
        patient_id: Optional[str] = None,
        inv_status: Optional[str] = None,
    ) -> List[Invoice]:
        q = select(Invoice).options(selectinload(Invoice.items)).where(
            Invoice.organization_id == org_id
        )
        if patient_id:
            q = q.where(Invoice.patient_id == patient_id)
        if inv_status:
            q = q.where(Invoice.status == inv_status)
        q = q.order_by(Invoice.created_at.desc())
        result = await db.execute(q)
        return list(result.scalars().all())

    async def get_invoice(self, db: AsyncSession, org_id: str, invoice_id: str) -> Invoice:
        result = await db.execute(
            select(Invoice)
            .options(selectinload(Invoice.items), selectinload(Invoice.payments))
            .where(Invoice.id == invoice_id, Invoice.organization_id == org_id)
        )
        inv = result.scalars().first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return inv

    async def record_payment(
        self,
        db: AsyncSession,
        org_id: str,
        invoice_id: str,
        user: Profile,
        data: PaymentCreate,
    ) -> Payment:
        invoice = await self.get_invoice(db, org_id, invoice_id)
        amount = Decimal(str(data.amount))
        payment = Payment(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            invoice_id=invoice_id,
            recorded_by=user.id,
            amount=amount,
            method=data.method,
            payment_date=data.payment_date or date.today(),
            reference_number=data.reference_number,
            notes=data.notes,
        )
        db.add(payment)

        # Update invoice amounts
        invoice.amount_paid = (invoice.amount_paid or Decimal("0")) + amount
        invoice.balance = invoice.total - invoice.amount_paid
        if invoice.balance <= 0:
            invoice.status = "paid"
            invoice.balance = Decimal("0.00")
        else:
            invoice.status = "partially_paid"

        await db.commit()
        await db.refresh(payment)
        return payment

    async def get_invoice_pdf_data(
        self,
        db: AsyncSession,
        org_id: str,
        invoice_id: str,
    ) -> dict:
        invoice = await self.get_invoice(db, org_id, invoice_id)
        org = await self._get_org(db, org_id)
        patient = await self.get_patient(db, org_id, invoice.patient_id)
        return {
            "invoice": {
                "invoice_number": invoice.invoice_number,
                "status": invoice.status,
                "subtotal": invoice.subtotal,
                "discount": invoice.discount,
                "tax": invoice.tax,
                "total": invoice.total,
                "amount_paid": invoice.amount_paid,
                "balance": invoice.balance,
                "notes": invoice.notes,
                "due_date": invoice.due_date,
                "created_at": invoice.created_at,
            },
            "org": {
                "name": org.name,
                "address": org.address,
                "city": org.city,
                "state": org.state,
                "phone": org.phone,
                "currency": "INR",
            },
            "patient": {
                "full_name": patient.full_name,
                "patient_code": patient.patient_code,
                "phone": patient.phone,
            },
            "items": [
                {
                    "description": i.description,
                    "quantity": i.quantity,
                    "unit_price": i.unit_price,
                    "total": i.total,
                }
                for i in invoice.items
            ],
        }

    # ─── Follow-ups ───────────────────────────────────────────────────────────

    async def create_followup(
        self,
        db: AsyncSession,
        org_id: str,
        user: Profile,
        data: FollowUpCreate,
    ) -> FollowUp:
        followup = FollowUp(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            **data.model_dump(),
        )
        db.add(followup)
        await db.commit()
        await db.refresh(followup)
        return followup

    async def get_followups(
        self,
        db: AsyncSession,
        org_id: str,
        doctor_id: Optional[str] = None,
        fu_status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[FollowUp]:
        q = select(FollowUp).where(FollowUp.organization_id == org_id)
        if doctor_id:
            q = q.where(FollowUp.doctor_profile_id == doctor_id)
        if fu_status:
            q = q.where(FollowUp.status == fu_status)
        if date_from:
            q = q.where(FollowUp.follow_up_date >= date_from)
        if date_to:
            q = q.where(FollowUp.follow_up_date <= date_to)
        q = q.order_by(FollowUp.follow_up_date)
        result = await db.execute(q)
        return list(result.scalars().all())

    async def update_followup_status(
        self,
        db: AsyncSession,
        org_id: str,
        followup_id: str,
        data: FollowUpStatusUpdate,
    ) -> FollowUp:
        result = await db.execute(
            select(FollowUp).where(
                FollowUp.id == followup_id,
                FollowUp.organization_id == org_id,
            )
        )
        fu = result.scalars().first()
        if not fu:
            raise HTTPException(status_code=404, detail="Follow-up not found")
        fu.status = data.status
        if data.notes:
            fu.notes = data.notes
        if data.status == "completed":
            fu.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(fu)
        return fu

    # ─── Dashboard ───────────────────────────────────────────────────────────

    async def get_dashboard_summary(
        self,
        db: AsyncSession,
        org_id: str,
        date_str: Optional[str] = None,
    ) -> dict:
        target = date.fromisoformat(date_str) if date_str else date.today()

        # Today's appointments by status
        appt_result = await db.execute(
            select(Appointment.status, func.count(Appointment.id))
            .where(
                Appointment.organization_id == org_id,
                Appointment.appointment_date == target,
            )
            .group_by(Appointment.status)
        )
        appt_counts = {row[0]: row[1] for row in appt_result.all()}

        today_appointments = sum(appt_counts.values())
        checked_in = appt_counts.get("checked_in", 0)
        completed = appt_counts.get("completed", 0)
        cancelled = appt_counts.get("cancelled", 0)
        no_show = appt_counts.get("no_show", 0)

        # Queue waiting count
        queue_result = await db.execute(
            select(func.count(QueueEntry.id)).where(
                QueueEntry.organization_id == org_id,
                func.date(QueueEntry.arrived_at) == target,
                QueueEntry.status == "waiting",
            )
        )
        waiting = queue_result.scalar() or 0

        # Today's collection
        collection_result = await db.execute(
            select(func.sum(Payment.amount)).where(
                Payment.organization_id == org_id,
                Payment.payment_date == target,
            )
        )
        today_collection = collection_result.scalar() or Decimal("0.00")

        # Outstanding balance (unpaid + partial invoices)
        balance_result = await db.execute(
            select(func.sum(Invoice.balance)).where(
                Invoice.organization_id == org_id,
                Invoice.status.in_(["unpaid", "partially_paid"]),
            )
        )
        outstanding_balance = balance_result.scalar() or Decimal("0.00")

        # Upcoming follow-ups in next 7 days
        fu_result = await db.execute(
            select(func.count(FollowUp.id)).where(
                FollowUp.organization_id == org_id,
                FollowUp.status == "pending",
                FollowUp.follow_up_date >= target,
                FollowUp.follow_up_date <= target + timedelta(days=7),
            )
        )
        upcoming_followups = fu_result.scalar() or 0

        return {
            "today_appointments": today_appointments,
            "checked_in": checked_in,
            "waiting": waiting,
            "completed": completed,
            "cancelled": cancelled,
            "no_show": no_show,
            "today_collection": Decimal(str(today_collection)),
            "outstanding_balance": Decimal(str(outstanding_balance)),
            "upcoming_followups": upcoming_followups,
        }


clinic_service = ClinicService()
