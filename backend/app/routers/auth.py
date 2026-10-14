import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.clinic import DoctorSchedule, Patient
from app.models.organization import Organization, OrganizationMember
from app.models.provider import DoctorProfile
from app.models.user import Profile
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Direct Access"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "patient"  # "doctor" or "patient"
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    # Doctor specific fields
    specialty: Optional[str] = "General Medicine"
    clinic_name: Optional[str] = None
    license_number: Optional[str] = None
    consultation_fee: Optional[float] = 500.0
    qualifications: Optional[str] = None
    # Patient specific fields
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_account(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Direct registration endpoint that guarantees instant account activation and workspace creation
    without requiring external email confirmation barriers during development/demo.
    """
    normalized_email = data.email.strip().lower()

    # 1. Check if profile already exists
    res = await db.execute(select(Profile).where(Profile.email == normalized_email))
    existing_profile = res.scalar_one_or_none()

    if existing_profile:
        profile = existing_profile
        profile.full_name = data.full_name
        if data.phone:
            profile.phone = data.phone
    else:
        profile = Profile(
            id=str(uuid.uuid4()),
            email=normalized_email,
            full_name=data.full_name,
            phone=data.phone,
            is_platform_admin=False,
        )
        db.add(profile)
        await db.flush()

    is_doctor = data.role == "doctor"

    # 2. If Doctor: provision Clinic Organization and DoctorProfile
    if is_doctor:
        # Check if already has an organization
        mem_res = await db.execute(
            select(OrganizationMember).where(OrganizationMember.user_id == profile.id)
        )
        existing_mem = mem_res.scalar_one_or_none()

        if not existing_mem:
            c_name = data.clinic_name or (
                f"{data.full_name}'s Clinic"
                if data.full_name.startswith("Dr.")
                else f"Dr. {data.full_name}'s Medical Practice"
            )
            slug = c_name.lower().replace(" ", "-").replace(".", "").replace("'", "")[:50]
            org = Organization(
                id=str(uuid.uuid4()),
                name=c_name,
                slug=f"{slug}-{uuid.uuid4().hex[:4]}",
                type="clinic",
                address=data.address,
                city=data.city or "Mumbai",
                state=data.state or "Maharashtra",
                postal_code=data.postal_code,
                phone=data.phone,
                email=normalized_email,
                is_active=True,
            )
            db.add(org)
            await db.flush()

            member = OrganizationMember(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                user_id=profile.id,
                role="organization_owner",
                status="active",
            )
            db.add(member)

            doc_profile = DoctorProfile(
                id=str(uuid.uuid4()),
                user_id=profile.id,
                organization_id=org.id,
                specialty=data.specialty or "General Medicine",
                license_number=data.license_number or "MED-REG-ACTIVE",
                consultation_fee=data.consultation_fee or 500.0,
                qualifications=data.qualifications or "MBBS, MD",
                is_available=True,
            )
            db.add(doc_profile)
            await db.flush()

            # Add default weekly schedule so patients can immediately book slots
            for day in range(7):
                db.add(
                    DoctorSchedule(
                        id=str(uuid.uuid4()),
                        doctor_profile_id=doc_profile.id,
                        organization_id=org.id,
                        day_of_week=day,
                        start_time="09:00",
                        end_time="17:00",
                        slot_duration_minutes=30,
                        is_active=True,
                    )
                )

    # 3. If Patient: ensure Patient record
    else:
        pat_res = await db.execute(
            select(Patient).where(
                (Patient.user_id == profile.id) | (Patient.email == normalized_email)
            )
        )
        patient = pat_res.scalar_one_or_none()
        if not patient:
            code = f"PT-{uuid.uuid4().hex[:6].upper()}"
            patient = Patient(
                id=str(uuid.uuid4()),
                user_id=profile.id,
                created_by=profile.id,
                patient_code=code,
                full_name=data.full_name,
                email=normalized_email,
                phone=data.phone,
                address=data.address,
                gender=data.gender,
                blood_group=data.blood_group,
                emergency_contact_name=data.emergency_contact_name,
                emergency_contact_phone=data.emergency_contact_phone,
            )
            db.add(patient)
        else:
            patient.user_id = profile.id
            if data.address:
                patient.address = data.address
            if data.phone:
                patient.phone = data.phone
            if data.gender:
                patient.gender = data.gender
            if data.blood_group:
                patient.blood_group = data.blood_group

    await db.commit()
    await db.refresh(profile)

    # 4. Generate instant JWT Token
    metadata = {
        "full_name": profile.full_name,
        "role": data.role,
        "account_type": data.role,
    }
    token = auth_service.create_access_token(
        {
            "sub": profile.id,
            "email": profile.email,
            "user_metadata": metadata,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": profile.id,
            "email": profile.email,
            "user_metadata": metadata,
        },
        "profile": {
            "id": profile.id,
            "email": profile.email,
            "full_name": profile.full_name,
            "phone": profile.phone,
        },
    }


@router.post("/login")
async def login_account(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Direct login endpoint supporting both registered users and pre-seeded demo accounts.
    """
    normalized_email = data.email.strip().lower()

    # Search for user in profile table
    res = await db.execute(select(Profile).where(Profile.email == normalized_email))
    profile = res.scalar_one_or_none()

    if not profile:
        # Create user for demo or first-time login
        name_part = normalized_email.split("@")[0].replace(".", " ").title()
        is_dr = "dr" in normalized_email or "doctor" in normalized_email
        profile = Profile(
            id=str(uuid.uuid4()),
            email=normalized_email,
            full_name=f"Dr. {name_part}" if is_dr else name_part,
            is_platform_admin=False,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    # Check memberships to determine role
    mem_res = await db.execute(
        select(OrganizationMember).where(OrganizationMember.user_id == profile.id)
    )
    memberships = mem_res.scalars().all()
    has_provider_role = len(memberships) > 0 or "dr" in normalized_email

    role = "doctor" if has_provider_role else "patient"
    metadata = {
        "full_name": profile.full_name,
        "role": role,
        "account_type": role,
    }

    token = auth_service.create_access_token(
        {
            "sub": profile.id,
            "email": profile.email,
            "user_metadata": metadata,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": profile.id,
            "email": profile.email,
            "user_metadata": metadata,
        },
        "profile": {
            "id": profile.id,
            "email": profile.email,
            "full_name": profile.full_name,
            "phone": profile.phone,
        },
    }
