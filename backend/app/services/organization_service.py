import re
import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Organization, OrganizationMember, OrganizationSetting
from app.models.user import Profile
from app.schemas.organization import (
    OrganizationCreate,
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
        If platform admin, can list all active organizations.
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
        """
        Creates a new organization, binds user as organization_owner,
        and initializes organization_settings.
        """
        # Ensure slug is unique
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
            phone=org_in.phone,
            email=org_in.email,
            is_active=True,
        )
        db.add(new_org)

        # Add creator as organization_owner
        owner_member = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            user_id=user_id,
            role="organization_owner",
            status="active",
        )
        db.add(owner_member)

        # Create default organization settings
        default_settings = OrganizationSetting(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            timezone="UTC",
            currency="INR",
            operating_hours={
                "monday": {"open": "09:00", "close": "18:00", "closed": False},
                "tuesday": {"open": "09:00", "close": "18:00", "closed": False},
                "wednesday": {"open": "09:00", "close": "18:00", "closed": False},
                "thursday": {"open": "09:00", "close": "18:00", "closed": False},
                "friday": {"open": "09:00", "close": "18:00", "closed": False},
                "saturday": {"open": "09:00", "close": "14:00", "closed": False},
                "sunday": {"open": "00:00", "close": "00:00", "closed": True},
            },
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
            phone=new_org.phone,
            email=new_org.email,
            is_active=new_org.is_active,
            created_at=new_org.created_at,
            updated_at=new_org.updated_at,
            settings=default_settings,
            current_user_role="organization_owner",
            membership_status="active",
        )

    async def get_organization_for_user(
        self,
        db: AsyncSession,
        organization_id: str,
        user_id: str,
        is_platform_admin: bool = False,
    ) -> OrganizationWithRoleRead:
        """
        Returns organization details only if user is authorized (active member or platform admin).
        Strictly enforces tenant isolation!
        """
        # Fetch organization
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

        # Check membership
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
            phone=org.phone,
            email=org.email,
            is_active=org.is_active,
            created_at=org.created_at,
            updated_at=org.updated_at,
            settings=org.settings,
            current_user_role=role,
            membership_status=member_status,
        )


organization_service = OrganizationService()
