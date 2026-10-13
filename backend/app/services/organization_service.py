import re
import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Organization, OrganizationMember, OrganizationSetting
from app.models.provider import Department, DoctorProfile, ServiceCategory
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationOnboardingCreate,
    OrganizationSettingsUpdate,
    OrganizationUpdate,
    OrganizationWithRoleRead,
)


class OrganizationService:
    @staticmethod
    def generate_slug(name: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9_-]", "-", name.lower().strip())
        slug = re.sub(r"-+", "-", slug).strip("-")
        return slug or f"org-{uuid.uuid4().hex[:8]}"

    async def get_user_organizations(
        self, db: AsyncSession, user_id: str, is_platform_admin: bool = False
    ) -> List[OrganizationWithRoleRead]:
        """
        Returns all organizations the user is an active member of.
        """
        stmt = (
            select(Organization, OrganizationMember.role, OrganizationMember.status)
            .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
            .options(selectinload(Organization.settings))
            .where(
                OrganizationMember.user_id == user_id,
                OrganizationMember.status == "active",
                Organization.is_active == True,
            )
        )
        result = await db.execute(stmt)
        rows = result.all()

        org_list: List[OrganizationWithRoleRead] = []
        for org, role, member_status in rows:
            org_read = OrganizationWithRoleRead(
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
                is_active=org.is_active,
                created_at=org.created_at,
                updated_at=org.updated_at,
                settings=org.settings,
                current_user_role=role,
                membership_status=member_status,
            )
            org_list.append(org_read)

        return org_list

    async def create_organization(
        self, db: AsyncSession, user_id: str, org_in: OrganizationCreate
    ) -> OrganizationWithRoleRead:
        base_slug = org_in.slug or self.generate_slug(org_in.name)
        slug = base_slug
        counter = 1

        while True:
            existing = await db.execute(select(Organization).where(Organization.slug == slug))
            if not existing.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        org_id = str(uuid.uuid4())
        new_org = Organization(
            id=org_id,
            name=org_in.name,
            slug=slug,
            type=org_in.type,
            address=org_in.address,
            city=org_in.city,
            state=org_in.state,
            postal_code=org_in.postal_code,
            phone=org_in.phone,
            email=org_in.email,
            is_active=True,
        )
        db.add(new_org)

        owner_member = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            user_id=user_id,
            role="organization_owner",
            status="active",
        )
        db.add(owner_member)

        operating_hours = org_in.operating_hours or {
            "monday": {"open": "09:00", "close": "18:00", "closed": False},
            "tuesday": {"open": "09:00", "close": "18:00", "closed": False},
            "wednesday": {"open": "09:00", "close": "18:00", "closed": False},
            "thursday": {"open": "09:00", "close": "18:00", "closed": False},
            "friday": {"open": "09:00", "close": "18:00", "closed": False},
            "saturday": {"open": "09:00", "close": "14:00", "closed": False},
            "sunday": {"open": "00:00", "close": "00:00", "closed": True},
        }

        default_settings = OrganizationSetting(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            timezone=org_in.timezone or "UTC",
            currency="INR",
            operating_hours=operating_hours,
            notification_preferences={
                "email_enabled": True,
                "sms_enabled": False,
                "appointment_reminders": True,
            },
        )
        db.add(default_settings)

        await db.commit()
        await db.refresh(new_org)
        await db.refresh(default_settings)

        return OrganizationWithRoleRead(
            id=new_org.id,
            name=new_org.name,
            slug=new_org.slug,
            type=new_org.type,
            address=new_org.address,
            city=new_org.city,
            state=new_org.state,
            postal_code=new_org.postal_code,
            phone=new_org.phone,
            email=new_org.email,
            is_active=new_org.is_active,
            created_at=new_org.created_at,
            updated_at=new_org.updated_at,
            settings=default_settings,
            current_user_role="organization_owner",
            membership_status="active",
        )

    async def onboard_organization(
        self, db: AsyncSession, user_id: str, onboarding_in: OrganizationOnboardingCreate
    ) -> OrganizationWithRoleRead:
        """
        Complete provider onboarding:
        - Creates the organization and owner membership.
        - If clinic: registers creator's doctor profile if specialty provided.
        - If hospital: provisions initial departments.
        - If diagnostic center: provisions initial service categories.
        """
        org_result = await self.create_organization(db, user_id, onboarding_in)
        org_id = org_result.id

        # 1. Clinic Onboarding -> Doctor Profile
        if onboarding_in.type == "clinic" and onboarding_in.doctor_specialty:
            doc_profile = DoctorProfile(
                id=str(uuid.uuid4()),
                organization_id=org_id,
                user_id=user_id,
                specialty=onboarding_in.doctor_specialty,
                license_number=onboarding_in.doctor_license,
                qualifications=onboarding_in.doctor_qualifications,
                consultation_fee=onboarding_in.doctor_consultation_fee or 500.0,
                is_available=True,
            )
            db.add(doc_profile)

        # 2. Hospital Onboarding -> Default Departments
        elif onboarding_in.type == "hospital" and onboarding_in.initial_departments:
            for dept_name in onboarding_in.initial_departments:
                if dept_name.strip():
                    dept = Department(
                        id=str(uuid.uuid4()),
                        organization_id=org_id,
                        name=dept_name.strip(),
                        description=f"Department of {dept_name.strip()}",
                        is_active=True,
                    )
                    db.add(dept)

        # 3. Diagnostic Centre Onboarding -> Default Service Categories
        elif onboarding_in.type == "diagnostic_center" and onboarding_in.initial_service_categories:
            for cat_name in onboarding_in.initial_service_categories:
                if cat_name.strip():
                    cat = ServiceCategory(
                        id=str(uuid.uuid4()),
                        organization_id=org_id,
                        name=cat_name.strip(),
                        description=f"{cat_name.strip()} diagnostic testing",
                        sample_type="Blood / Specimen",
                        is_active=True,
                    )
                    db.add(cat)

        await db.commit()
        return org_result

    async def get_organization_for_user(
        self,
        db: AsyncSession,
        organization_id: str,
        user_id: str,
        is_platform_admin: bool = False,
    ) -> OrganizationWithRoleRead:
        stmt = (
            select(Organization)
            .options(selectinload(Organization.settings))
            .where(Organization.id == organization_id)
        )
        res = await db.execute(stmt)
        org = res.scalar_one_or_none()

        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )

        member_stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )
        member_res = await db.execute(member_stmt)
        member = member_res.scalar_one_or_none()

        if not member and not is_platform_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not an authorized member of this organization",
            )

        role = member.role if member else "platform_admin"
        member_status = member.status if member else "active"

        return OrganizationWithRoleRead(
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
            is_active=org.is_active,
            created_at=org.created_at,
            updated_at=org.updated_at,
            settings=org.settings,
            current_user_role=role,
            membership_status=member_status,
        )

    async def update_organization(
        self,
        db: AsyncSession,
        organization_id: str,
        user_id: str,
        org_update: OrganizationUpdate,
        is_platform_admin: bool = False,
    ) -> OrganizationWithRoleRead:
        # Check ownership
        member_stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        )
        member_res = await db.execute(member_stmt)
        member = member_res.scalar_one_or_none()

        if not is_platform_admin and (not member or member.role != "organization_owner"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners can modify organization details",
            )

        stmt = (
            select(Organization)
            .options(selectinload(Organization.settings))
            .where(Organization.id == organization_id)
        )
        res = await db.execute(stmt)
        org = res.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

        if org_update.name is not None:
            org.name = org_update.name
        if org_update.address is not None:
            org.address = org_update.address
        if org_update.city is not None:
            org.city = org_update.city
        if org_update.state is not None:
            org.state = org_update.state
        if org_update.postal_code is not None:
            org.postal_code = org_update.postal_code
        if org_update.phone is not None:
            org.phone = org_update.phone
        if org_update.email is not None:
            org.email = org_update.email
        if org_update.is_active is not None and is_platform_admin:
            org.is_active = org_update.is_active

        await db.commit()
        await db.refresh(org)

        role = member.role if member else "platform_admin"
        member_status = member.status if member else "active"

        return OrganizationWithRoleRead(
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
            is_active=org.is_active,
            created_at=org.created_at,
            updated_at=org.updated_at,
            settings=org.settings,
            current_user_role=role,
            membership_status=member_status,
        )

    async def update_organization_settings(
        self,
        db: AsyncSession,
        organization_id: str,
        user_id: str,
        settings_update: OrganizationSettingsUpdate,
        is_platform_admin: bool = False,
    ):
        member_stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        )
        member_res = await db.execute(member_stmt)
        member = member_res.scalar_one_or_none()

        if not is_platform_admin and (not member or member.role != "organization_owner"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners can modify organization settings",
            )

        stmt = select(OrganizationSetting).where(OrganizationSetting.organization_id == organization_id)
        res = await db.execute(stmt)
        settings_row = res.scalar_one_or_none()

        if not settings_row:
            settings_row = OrganizationSetting(
                id=str(uuid.uuid4()),
                organization_id=organization_id,
            )
            db.add(settings_row)

        if settings_update.timezone is not None:
            settings_row.timezone = settings_update.timezone
        if settings_update.currency is not None:
            settings_row.currency = settings_update.currency
        if settings_update.operating_hours is not None:
            settings_row.operating_hours = settings_update.operating_hours
        if settings_update.notification_preferences is not None:
            settings_row.notification_preferences = settings_update.notification_preferences

        await db.commit()
        await db.refresh(settings_row)
        return settings_row


organization_service = OrganizationService()
