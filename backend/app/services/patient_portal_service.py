from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, and_, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.clinic import Appointment, Patient
from app.models.organization import Organization
from app.models.provider import Department, DoctorDepartment, DoctorProfile, ServiceCategory
from app.models.lab import LabTest
from app.models.user import Profile
from app.schemas.patient_portal import (
    DoctorSearchResult,
    PatientAppointmentRead,
    PatientBookAppointment,
    PatientCancelAppointment,
    PatientDashboardSummary,
    PatientProfileRead,
    PatientProfileUpdate,
    ProviderDetailResponse,
    ProviderSearchResult,
)
from app.services.clinic_service import clinic_service


class PatientPortalService:
    # ─── Patient Profile ────────────────────────────────────────────────────────

    async def get_patient_profile(self, db: AsyncSession, user: Profile) -> PatientProfileRead:
        # Find any linked patient records to pull medical notes (DOB, blood group, allergies)
        p_res = await db.execute(
            select(Patient).where(Patient.user_id == user.id).order_by(desc(Patient.created_at))
        )
        patient_rec = p_res.scalars().first()

        return PatientProfileRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name or (patient_rec.full_name if patient_rec else None),
            phone=user.phone or (patient_rec.phone if patient_rec else None),
            avatar_url=user.avatar_url,
            date_of_birth=patient_rec.date_of_birth if patient_rec else None,
            gender=patient_rec.gender if patient_rec else None,
            address=patient_rec.address if patient_rec else None,
            emergency_contact_name=patient_rec.emergency_contact_name if patient_rec else None,
            emergency_contact_phone=patient_rec.emergency_contact_phone if patient_rec else None,
            allergies=patient_rec.allergies if patient_rec else None,
            blood_group=patient_rec.blood_group if patient_rec else None,
        )

    async def update_patient_profile(
        self, db: AsyncSession, user: Profile, data: PatientProfileUpdate
    ) -> PatientProfileRead:
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.phone is not None:
            user.phone = data.phone

        # Update or create linked patient record for this user
        p_res = await db.execute(select(Patient).where(Patient.user_id == user.id))
        linked_patients = p_res.scalars().all()
        if not linked_patients:
            # Create a patient profile record for this user
            new_patient = Patient(
                id=str(uuid.uuid4()),
                organization_id=None,
                user_id=user.id,
                created_by=user.id,
                patient_code=f"PT-USER-{user.id[:6].upper()}",
                full_name=user.full_name or user.email.split("@")[0],
                phone=user.phone,
                email=user.email,
                date_of_birth=data.date_of_birth,
                gender=data.gender,
                address=data.address,
                emergency_contact_name=data.emergency_contact_name,
                emergency_contact_phone=data.emergency_contact_phone,
                allergies=data.allergies,
                blood_group=data.blood_group,
            )
            db.add(new_patient)
        else:
            for p in linked_patients:
                if data.full_name is not None:
                    p.full_name = data.full_name
                if data.phone is not None:
                    p.phone = data.phone
                if data.date_of_birth is not None:
                    p.date_of_birth = data.date_of_birth
                if data.gender is not None:
                    p.gender = data.gender
                if data.address is not None:
                    p.address = data.address
                if data.emergency_contact_name is not None:
                    p.emergency_contact_name = data.emergency_contact_name
                if data.emergency_contact_phone is not None:
                    p.emergency_contact_phone = data.emergency_contact_phone
                if data.allergies is not None:
                    p.allergies = data.allergies
                if data.blood_group is not None:
                    p.blood_group = data.blood_group

        await db.commit()
        await db.refresh(user)
        return await self.get_patient_profile(db, user)

    # ─── Search Providers ────────────────────────────────────────────────────────

    async def search_providers(
        self,
        db: AsyncSession,
        query: Optional[str] = None,
        provider_type: Optional[str] = None,
        specialty: Optional[str] = None,
        city: Optional[str] = None,
    ) -> List[ProviderSearchResult]:
        q = select(Organization).where(Organization.is_active == True)

        if provider_type:
            q = q.where(Organization.type == provider_type)
        if city:
            q = q.where(Organization.city.ilike(f"%{city}%"))

        if query:
            q_like = f"%{query}%"
            # Join with doctors, departments, lab tests to allow searching by doctor name, dept, or test name
            sub_doc = select(DoctorProfile.organization_id).join(Profile).where(
                or_(
                    DoctorProfile.specialty.ilike(q_like),
                    Profile.full_name.ilike(q_like),
                )
            )
            sub_dept = select(Department.organization_id).where(Department.name.ilike(q_like))
            sub_test = select(LabTest.organization_id).where(LabTest.name.ilike(q_like))

            q = q.where(
                or_(
                    Organization.name.ilike(q_like),
                    Organization.city.ilike(q_like),
                    Organization.address.ilike(q_like),
                    Organization.id.in_(sub_doc),
                    Organization.id.in_(sub_dept),
                    Organization.id.in_(sub_test),
                )
            )

        if specialty:
            spec_like = f"%{specialty}%"
            sub_spec = select(DoctorProfile.organization_id).where(
                DoctorProfile.specialty.ilike(spec_like)
            )
            q = q.where(Organization.id.in_(sub_spec))

        orgs = (await db.execute(q.order_by(Organization.name))).scalars().all()

        results = []
        for org in orgs:
            doc_cnt = (
                await db.scalar(
                    select(func.count(DoctorProfile.id)).where(
                        DoctorProfile.organization_id == org.id,
                        DoctorProfile.is_available == True,
                    )
                )
                or 0
            )
            svc_cnt = (
                await db.scalar(
                    select(func.count(ServiceCategory.id)).where(
                        ServiceCategory.organization_id == org.id
                    )
                )
                or 0
            )
            lab_cnt = (
                await db.scalar(
                    select(func.count(LabTest.id)).where(
                        LabTest.organization_id == org.id,
                        LabTest.is_active == True,
                    )
                )
                or 0
            )
            results.append(
                ProviderSearchResult(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    type=org.type,
                    address=org.address,
                    city=org.city,
                    state=org.state,
                    phone=org.phone,
                    email=org.email,
                    is_active=org.is_active,
                    doctors_count=doc_cnt,
                    services_count=svc_cnt + lab_cnt,
                )
            )
        return results

    async def get_provider_details(
        self, db: AsyncSession, provider_id: str
    ) -> ProviderDetailResponse:
        org_res = await db.execute(
            select(Organization).where(Organization.id == provider_id, Organization.is_active == True)
        )
        org = org_res.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=404, detail="Provider facility not found")

        # Fetch doctors
        doc_res = await db.execute(
            select(DoctorProfile, Profile)
            .join(Profile, Profile.id == DoctorProfile.user_id)
            .where(DoctorProfile.organization_id == provider_id, DoctorProfile.is_available == True)
        )
        doctors = []
        for doc_prof, user_prof in doc_res.all():
            # Get primary department if any
            dept_res = await db.execute(
                select(Department.name)
                .join(DoctorDepartment, DoctorDepartment.department_id == Department.id)
                .where(DoctorDepartment.doctor_profile_id == doc_prof.id)
            )
            dept_name = dept_res.scalars().first()

            doctors.append(
                DoctorSearchResult(
                    id=doc_prof.id,
                    doctor_name=user_prof.full_name or "Doctor",
                    specialty=doc_prof.specialty,
                    qualifications=doc_prof.qualifications,
                    experience_years=doc_prof.experience_years,
                    consultation_fee=doc_prof.consultation_fee,
                    bio=doc_prof.bio,
                    is_available=doc_prof.is_available,
                    department_name=dept_name,
                )
            )

        # Fetch departments
        depts_res = await db.execute(
            select(Department.name).where(
                Department.organization_id == provider_id, Department.is_active == True
            )
        )
        depts = list(depts_res.scalars().all())

        # Fetch services & lab tests
        services_res = await db.execute(
            select(ServiceCategory.name).where(
                ServiceCategory.organization_id == provider_id, ServiceCategory.is_active == True
            )
        )
        services = list(services_res.scalars().all())

        lab_res = await db.execute(
            select(LabTest.name).where(
                LabTest.organization_id == provider_id, LabTest.is_active == True
            )
        )
        lab_tests = list(lab_res.scalars().all())

        return ProviderDetailResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            type=org.type,
            address=org.address,
            city=org.city,
            state=org.state,
            postal_code=org.postal_code,
            phone=org.phone,
            email=org.email,
            doctors=doctors,
            departments=depts,
            services=services + lab_tests,
        )

    # ─── Slot Availability ───────────────────────────────────────────────────────

    async def get_doctor_slots(
        self, db: AsyncSession, doctor_profile_id: str, date_str: str
    ) -> List[dict]:
        doc = await db.scalar(
            select(DoctorProfile).where(DoctorProfile.id == doctor_profile_id)
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Doctor profile not found")

        return await clinic_service.get_available_slots(
            db=db,
            org_id=doc.organization_id,
            doctor_profile_id=doctor_profile_id,
            date_str=date_str,
        )

    # ─── Patient Appointment Booking ─────────────────────────────────────────────

    async def book_appointment(
        self, db: AsyncSession, user: Profile, data: PatientBookAppointment
    ) -> PatientAppointmentRead:
        # 1. Ensure or find Patient record linked to user in this organization
        p_res = await db.execute(
            select(Patient).where(
                Patient.organization_id == data.organization_id,
                or_(Patient.user_id == user.id, Patient.email == user.email),
            )
        )
        patient = p_res.scalars().first()

        if not patient:
            # Auto-register this user as patient for the facility
            code = await clinic_service._next_patient_code(db, data.organization_id)
            patient = Patient(
                id=str(uuid.uuid4()),
                organization_id=data.organization_id,
                user_id=user.id,
                created_by=user.id,
                patient_code=code,
                full_name=user.full_name or user.email.split("@")[0],
                phone=user.phone,
                email=user.email,
            )
            db.add(patient)
            await db.flush()
        elif not patient.user_id:
            # Link existing record to this account
            patient.user_id = user.id

        # 2. Check for conflicts on Doctor
        conflict = await db.execute(
            select(Appointment).where(
                Appointment.doctor_profile_id == data.doctor_profile_id,
                Appointment.appointment_date == data.appointment_date,
                Appointment.status.notin_(["cancelled", "no_show"]),
                Appointment.start_time < data.end_time,
                Appointment.end_time > data.start_time,
            )
        )
        if conflict.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This time slot is no longer available. Please select another slot.",
            )

        # 3. Check for patient double-booking in same slot
        pat_conflict = await db.execute(
            select(Appointment).where(
                Appointment.patient_id == patient.id,
                Appointment.appointment_date == data.appointment_date,
                Appointment.status.notin_(["cancelled", "no_show"]),
                Appointment.start_time < data.end_time,
                Appointment.end_time > data.start_time,
            )
        )
        if pat_conflict.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an appointment booked during this time window.",
            )

        # 4. Create appointment
        now = datetime.utcnow()
        appt = Appointment(
            id=str(uuid.uuid4()),
            organization_id=data.organization_id,
            patient_id=patient.id,
            doctor_profile_id=data.doctor_profile_id,
            created_by=user.id,
            appointment_date=data.appointment_date,
            start_time=data.start_time,
            end_time=data.end_time,
            appointment_type=data.appointment_type,
            reason=data.reason,
            notes=data.notes,
            status="scheduled",
            scheduled_at=now,
        )
        db.add(appt)
        await db.commit()
        await db.refresh(appt)

        return await self._format_appointment_read(db, appt)

    # ─── My Appointments & History ───────────────────────────────────────────────

    async def get_patient_appointments(
        self, db: AsyncSession, user: Profile, upcoming_only: bool = False
    ) -> List[PatientAppointmentRead]:
        # Patients own appointments either by patient.user_id or appointment.created_by
        q = (
            select(Appointment)
            .join(Patient, Patient.id == Appointment.patient_id)
            .where(
                or_(
                    Patient.user_id == user.id,
                    Appointment.created_by == user.id,
                )
            )
            .order_by(desc(Appointment.appointment_date), desc(Appointment.start_time))
        )
        if upcoming_only:
            today = date.today()
            q = q.where(
                Appointment.appointment_date >= today,
                Appointment.status.notin_(["cancelled", "completed", "no_show"]),
            )

        res = await db.execute(q)
        appts = res.scalars().all()
        return [await self._format_appointment_read(db, a) for a in appts]

    async def cancel_patient_appointment(
        self, db: AsyncSession, user: Profile, appointment_id: str, data: PatientCancelAppointment
    ) -> PatientAppointmentRead:
        q = (
            select(Appointment)
            .join(Patient, Patient.id == Appointment.patient_id)
            .where(
                Appointment.id == appointment_id,
                or_(
                    Patient.user_id == user.id,
                    Appointment.created_by == user.id,
                ),
            )
        )
        res = await db.execute(q)
        appt = res.scalars().first()
        if not appt:
            raise HTTPException(
                status_code=404, detail="Appointment not found or not authorized to cancel"
            )

        if appt.status in ("completed", "cancelled"):
            raise HTTPException(
                status_code=400, detail=f"Cannot cancel appointment with status '{appt.status}'"
            )

        appt.status = "cancelled"
        appt.cancelled_at = datetime.utcnow()
        appt.cancelled_reason = data.reason or "Cancelled by patient"
        await db.commit()
        await db.refresh(appt)

        return await self._format_appointment_read(db, appt)

    # ─── Patient Dashboard ───────────────────────────────────────────────────────

    async def get_patient_dashboard(
        self, db: AsyncSession, user: Profile
    ) -> PatientDashboardSummary:
        today = date.today()
        all_appts = await self.get_patient_appointments(db, user, upcoming_only=False)

        upcoming = [a for a in all_appts if a.appointment_date >= today and a.status not in ("cancelled", "completed", "no_show")]
        past = [a for a in all_appts if a.appointment_date < today or a.status == "completed"]
        cancelled = [a for a in all_appts if a.status == "cancelled"]

        # Next upcoming appointment
        upcoming_sorted = sorted(upcoming, key=lambda a: (a.appointment_date, a.start_time))
        next_appt = upcoming_sorted[0] if upcoming_sorted else None

        return PatientDashboardSummary(
            upcoming_appointments_count=len(upcoming),
            past_appointments_count=len(past),
            cancelled_appointments_count=len(cancelled),
            next_appointment=next_appt,
        )

    # ─── Internal Helper ─────────────────────────────────────────────────────────

    async def _format_appointment_read(
        self, db: AsyncSession, appt: Appointment
    ) -> PatientAppointmentRead:
        # Fetch Org
        org = await db.scalar(select(Organization).where(Organization.id == appt.organization_id))
        # Fetch Doctor & Profile
        doc_prof = await db.scalar(
            select(DoctorProfile).where(DoctorProfile.id == appt.doctor_profile_id)
        )
        doc_user = None
        if doc_prof:
            doc_user = await db.scalar(select(Profile).where(Profile.id == doc_prof.user_id))

        return PatientAppointmentRead(
            id=appt.id,
            organization_id=appt.organization_id,
            organization_name=org.name if org else "Healthcare Facility",
            organization_type=org.type if org else "clinic",
            organization_address=org.address if org else None,
            doctor_profile_id=appt.doctor_profile_id,
            doctor_name=doc_user.full_name if doc_user else "Doctor",
            doctor_specialty=doc_prof.specialty if doc_prof else "General",
            appointment_date=appt.appointment_date,
            start_time=appt.start_time,
            end_time=appt.end_time,
            appointment_type=appt.appointment_type,
            reason=appt.reason,
            notes=appt.notes,
            status=appt.status,
            cancelled_reason=appt.cancelled_reason,
            scheduled_at=appt.scheduled_at or appt.created_at,
        )


patient_portal_service = PatientPortalService()
