import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Organization, OrganizationMember
from app.models.provider import Department, DoctorDepartment, DoctorProfile, ServiceCategory
from app.models.user import Profile
from app.schemas.provider import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
    DoctorProfileCreate,
    DoctorProfileRead,
    DoctorProfileUpdate,
    MemberAddInput,
    MemberUpdateInput,
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)
from app.schemas.organization import OrganizationMemberRead


class ProviderService:
    async def verify_member_access(
        self, db: AsyncSession, org_id: str, user_id: str, is_admin: bool = False
    ) -> OrganizationMember:
        """Verifies that the user is an active member of the organization, or a platform admin."""
        stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        )
        res = await db.execute(stmt)
        member = res.scalar_one_or_none()

        if not member and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not an authorized member of this organization",
            )
        return member

    async def verify_owner_access(
        self, db: AsyncSession, org_id: str, user_id: str, is_admin: bool = False
    ) -> OrganizationMember:
        """Verifies that the user is an organization_owner or platform admin."""
        member = await self.verify_member_access(db, org_id, user_id, is_admin)
        if not is_admin and (not member or member.role != "organization_owner"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrative permission required: only organization owners can perform this action",
            )
        return member

    # =========================================================================
    # Members & Staff Management
    # =========================================================================
    async def list_members(
        self, db: AsyncSession, org_id: str, user_id: str, is_admin: bool = False
    ) -> List[OrganizationMemberRead]:
        await self.verify_member_access(db, org_id, user_id, is_admin)

        stmt = (
            select(OrganizationMember, Profile.email, Profile.full_name)
            .join(Profile, OrganizationMember.user_id == Profile.id)
            .where(OrganizationMember.organization_id == org_id)
            .order_by(OrganizationMember.created_at.asc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        members = []
        for mem, email, full_name in rows:
            members.append(
                OrganizationMemberRead(
                    id=mem.id,
                    organization_id=mem.organization_id,
                    user_id=mem.user_id,
                    role=mem.role,
                    status=mem.status,
                    created_at=mem.created_at,
                    updated_at=mem.updated_at,
                    user_email=email,
                    user_full_name=full_name,
                )
            )
        return members

    async def add_member(
        self, db: AsyncSession, org_id: str, user_id: str, member_in: MemberAddInput, is_admin: bool = False
    ) -> OrganizationMemberRead:
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        # Lookup or create placeholder profile for the email
        profile_stmt = select(Profile).where(Profile.email == member_in.email.strip().lower())
        res = await db.execute(profile_stmt)
        target_profile = res.scalar_one_or_none()

        if not target_profile:
            target_profile = Profile(
                id=str(uuid.uuid4()),
                email=member_in.email.strip().lower(),
                full_name=member_in.email.split("@")[0].title(),
                is_platform_admin=False,
            )
            db.add(target_profile)
            await db.flush()

        # Check existing membership
        existing_stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == target_profile.id,
        )
        existing_res = await db.execute(existing_stmt)
        if existing_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {member_in.email} is already a member of this organization",
            )

        new_member = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            user_id=target_profile.id,
            role=member_in.role,
            status=member_in.status,
        )
        db.add(new_member)
        await db.commit()
        await db.refresh(new_member)

        return OrganizationMemberRead(
            id=new_member.id,
            organization_id=new_member.organization_id,
            user_id=new_member.user_id,
            role=new_member.role,
            status=new_member.status,
            created_at=new_member.created_at,
            updated_at=new_member.updated_at,
            user_email=target_profile.email,
            user_full_name=target_profile.full_name,
        )

    async def update_member(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        member_id: str,
        member_update: MemberUpdateInput,
        is_admin: bool = False,
    ) -> OrganizationMemberRead:
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        stmt = (
            select(OrganizationMember)
            .options(selectinload(OrganizationMember.user))
            .where(
                OrganizationMember.id == member_id,
                OrganizationMember.organization_id == org_id,
            )
        )
        res = await db.execute(stmt)
        member = res.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found in this organization",
            )

        if member_update.role is not None:
            member.role = member_update.role
        if member_update.status is not None:
            member.status = member_update.status

        await db.commit()
        await db.refresh(member)

        return OrganizationMemberRead(
            id=member.id,
            organization_id=member.organization_id,
            user_id=member.user_id,
            role=member.role,
            status=member.status,
            created_at=member.created_at,
            updated_at=member.updated_at,
            user_email=member.user.email if member.user else None,
            user_full_name=member.user.full_name if member.user else None,
        )

    async def delete_member(
        self, db: AsyncSession, org_id: str, user_id: str, member_id: str, is_admin: bool = False
    ):
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        stmt = select(OrganizationMember).where(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
        res = await db.execute(stmt)
        member = res.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found in this organization",
            )

        if member.user_id == user_id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own membership as organization owner",
            )

        await db.delete(member)
        await db.commit()

    # =========================================================================
    # Doctor Profiles
    # =========================================================================
    async def list_doctors(
        self, db: AsyncSession, org_id: str, user_id: str, is_admin: bool = False
    ) -> List[DoctorProfileRead]:
        await self.verify_member_access(db, org_id, user_id, is_admin)

        stmt = (
            select(DoctorProfile)
            .options(
                selectinload(DoctorProfile.user),
                selectinload(DoctorProfile.department_associations).selectinload(DoctorDepartment.department),
            )
            .where(DoctorProfile.organization_id == org_id)
            .order_by(DoctorProfile.created_at.asc())
        )
        res = await db.execute(stmt)
        docs = res.scalars().all()

        results = []
        for d in docs:
            dept_names = [assoc.department.name for assoc in d.department_associations if assoc.department]
            results.append(
                DoctorProfileRead(
                    id=d.id,
                    user_id=d.user_id,
                    organization_id=d.organization_id,
                    specialty=d.specialty,
                    license_number=d.license_number,
                    qualifications=d.qualifications,
                    experience_years=d.experience_years,
                    consultation_fee=float(d.consultation_fee),
                    bio=d.bio,
                    is_available=d.is_available,
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                    doctor_name=d.user.full_name if d.user else "Doctor",
                    doctor_email=d.user.email if d.user else None,
                    department_names=dept_names,
                )
            )
        return results

    async def create_or_update_doctor_profile(
        self, db: AsyncSession, org_id: str, user_id: str, doc_in: DoctorProfileCreate, is_admin: bool = False
    ) -> DoctorProfileRead:
        caller_member = await self.verify_member_access(db, org_id, user_id, is_admin)

        target_user_id = doc_in.user_id or user_id
        if target_user_id != user_id and not is_admin and (not caller_member or caller_member.role != "organization_owner"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners can create doctor profiles for other members",
            )

        # Check existing doctor profile in this org
        stmt = (
            select(DoctorProfile)
            .options(
                selectinload(DoctorProfile.user),
                selectinload(DoctorProfile.department_associations).selectinload(DoctorDepartment.department),
            )
            .where(
                DoctorProfile.organization_id == org_id,
                DoctorProfile.user_id == target_user_id,
            )
        )
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()

        if doc:
            doc.specialty = doc_in.specialty
            doc.license_number = doc_in.license_number
            doc.qualifications = doc_in.qualifications
            doc.experience_years = doc_in.experience_years
            doc.consultation_fee = doc_in.consultation_fee
            doc.bio = doc_in.bio
            doc.is_available = doc_in.is_available
        else:
            doc = DoctorProfile(
                id=str(uuid.uuid4()),
                organization_id=org_id,
                user_id=target_user_id,
                specialty=doc_in.specialty,
                license_number=doc_in.license_number,
                qualifications=doc_in.qualifications,
                experience_years=doc_in.experience_years,
                consultation_fee=doc_in.consultation_fee,
                bio=doc_in.bio,
                is_available=doc_in.is_available,
            )
            db.add(doc)

        await db.commit()
        await db.refresh(doc)

        # Reload with relationships
        res_reload = await db.execute(stmt)
        doc = res_reload.scalar_one()

        dept_names = [assoc.department.name for assoc in doc.department_associations if assoc.department]
        return DoctorProfileRead(
            id=doc.id,
            user_id=doc.user_id,
            organization_id=doc.organization_id,
            specialty=doc.specialty,
            license_number=doc.license_number,
            qualifications=doc.qualifications,
            experience_years=doc.experience_years,
            consultation_fee=float(doc.consultation_fee),
            bio=doc.bio,
            is_available=doc.is_available,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            doctor_name=doc.user.full_name if doc.user else "Doctor",
            doctor_email=doc.user.email if doc.user else None,
            department_names=dept_names,
        )

    # =========================================================================
    # Departments (Hospital & Multi-Doctor Clinics)
    # =========================================================================
    async def list_departments(
        self, db: AsyncSession, org_id: str, user_id: str, is_admin: bool = False
    ) -> List[DepartmentRead]:
        await self.verify_member_access(db, org_id, user_id, is_admin)

        stmt = (
            select(Department)
            .options(
                selectinload(Department.head_doctor),
                selectinload(Department.doctor_associations),
            )
            .where(Department.organization_id == org_id)
            .order_by(Department.name.asc())
        )
        res = await db.execute(stmt)
        depts = res.scalars().all()

        results = []
        for d in depts:
            results.append(
                DepartmentRead(
                    id=d.id,
                    organization_id=d.organization_id,
                    name=d.name,
                    description=d.description,
                    head_doctor_id=d.head_doctor_id,
                    head_doctor_name=d.head_doctor.full_name if d.head_doctor else None,
                    is_active=d.is_active,
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                    doctor_count=len(d.doctor_associations),
                )
            )
        return results

    async def create_department(
        self, db: AsyncSession, org_id: str, user_id: str, dept_in: DepartmentCreate, is_admin: bool = False
    ) -> DepartmentRead:
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        # Check existing department name in this org
        existing = await db.execute(
            select(Department).where(
                Department.organization_id == org_id,
                func.lower(Department.name) == dept_in.name.strip().lower(),
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department '{dept_in.name}' already exists in this organization",
            )

        new_dept = Department(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            name=dept_in.name.strip(),
            description=dept_in.description,
            head_doctor_id=dept_in.head_doctor_id,
            is_active=True,
        )
        db.add(new_dept)
        await db.commit()
        await db.refresh(new_dept)

        return DepartmentRead(
            id=new_dept.id,
            organization_id=new_dept.organization_id,
            name=new_dept.name,
            description=new_dept.description,
            head_doctor_id=new_dept.head_doctor_id,
            head_doctor_name=None,
            is_active=new_dept.is_active,
            created_at=new_dept.created_at,
            updated_at=new_dept.updated_at,
            doctor_count=0,
        )

    async def update_department(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        dept_id: str,
        dept_in: DepartmentUpdate,
        is_admin: bool = False,
    ) -> DepartmentRead:
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        stmt = (
            select(Department)
            .options(
                selectinload(Department.head_doctor),
                selectinload(Department.doctor_associations),
            )
            .where(Department.id == dept_id, Department.organization_id == org_id)
        )
        res = await db.execute(stmt)
        dept = res.scalar_one_or_none()

        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

        if dept_in.name is not None:
            dept.name = dept_in.name.strip()
        if dept_in.description is not None:
            dept.description = dept_in.description
        if dept_in.head_doctor_id is not None:
            dept.head_doctor_id = dept_in.head_doctor_id
        if dept_in.is_active is not None:
            dept.is_active = dept_in.is_active

        await db.commit()
        await db.refresh(dept)

        return DepartmentRead(
            id=dept.id,
            organization_id=dept.organization_id,
            name=dept.name,
            description=dept.description,
            head_doctor_id=dept.head_doctor_id,
            head_doctor_name=dept.head_doctor.full_name if dept.head_doctor else None,
            is_active=dept.is_active,
            created_at=dept.created_at,
            updated_at=dept.updated_at,
            doctor_count=len(dept.doctor_associations),
        )

    async def delete_department(
        self, db: AsyncSession, org_id: str, user_id: str, dept_id: str, is_admin: bool = False
    ):
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        stmt = select(Department).where(Department.id == dept_id, Department.organization_id == org_id)
        res = await db.execute(stmt)
        dept = res.scalar_one_or_none()

        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

        await db.delete(dept)
        await db.commit()

    async def assign_doctor_to_department(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        dept_id: str,
        doctor_profile_id: str,
        is_primary: bool = True,
        is_admin: bool = False,
    ):
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        # Verify department belongs to this org
        dept_res = await db.execute(
            select(Department).where(Department.id == dept_id, Department.organization_id == org_id)
        )
        if not dept_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in this organization")

        # Verify doctor belongs to this org
        doc_res = await db.execute(
            select(DoctorProfile).where(
                DoctorProfile.id == doctor_profile_id, DoctorProfile.organization_id == org_id
            )
        )
        if not doc_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found in this organization")

        # Check existing association
        assoc_res = await db.execute(
            select(DoctorDepartment).where(
                DoctorDepartment.department_id == dept_id,
                DoctorDepartment.doctor_profile_id == doctor_profile_id,
            )
        )
        if assoc_res.scalar_one_or_none():
            return {"status": "already_assigned"}

        assoc = DoctorDepartment(
            id=str(uuid.uuid4()),
            department_id=dept_id,
            doctor_profile_id=doctor_profile_id,
            is_primary=is_primary,
        )
        db.add(assoc)
        await db.commit()
        return {"status": "assigned"}

    async def remove_doctor_from_department(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        dept_id: str,
        doctor_profile_id: str,
        is_admin: bool = False,
    ):
        await self.verify_owner_access(db, org_id, user_id, is_admin)

        stmt = select(DoctorDepartment).where(
            DoctorDepartment.department_id == dept_id,
            DoctorDepartment.doctor_profile_id == doctor_profile_id,
        )
        res = await db.execute(stmt)
        assoc = res.scalar_one_or_none()

        if assoc:
            await db.delete(assoc)
            await db.commit()
        return {"status": "removed"}

    # =========================================================================
    # Service Categories (Diagnostic Centres & Laboratories)
    # =========================================================================
    async def list_service_categories(
        self, db: AsyncSession, org_id: str, user_id: str, is_admin: bool = False
    ) -> List[ServiceCategoryRead]:
        await self.verify_member_access(db, org_id, user_id, is_admin)

        stmt = (
            select(ServiceCategory)
            .where(ServiceCategory.organization_id == org_id)
            .order_by(ServiceCategory.name.asc())
        )
        res = await db.execute(stmt)
        cats = res.scalars().all()

        return [ServiceCategoryRead.model_validate(c) for c in cats]

    async def create_service_category(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        cat_in: ServiceCategoryCreate,
        is_admin: bool = False,
    ) -> ServiceCategoryRead:
        caller = await self.verify_member_access(db, org_id, user_id, is_admin)
        if not is_admin and (not caller or caller.role not in ("organization_owner", "lab_staff")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners or laboratory staff can configure diagnostic service categories",
            )

        existing = await db.execute(
            select(ServiceCategory).where(
                ServiceCategory.organization_id == org_id,
                func.lower(ServiceCategory.name) == cat_in.name.strip().lower(),
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Service category '{cat_in.name}' already exists in this diagnostic center",
            )

        new_cat = ServiceCategory(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            name=cat_in.name.strip(),
            description=cat_in.description,
            sample_type=cat_in.sample_type,
            is_active=True,
        )
        db.add(new_cat)
        await db.commit()
        await db.refresh(new_cat)

        return ServiceCategoryRead.model_validate(new_cat)

    async def update_service_category(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        cat_id: str,
        cat_in: ServiceCategoryUpdate,
        is_admin: bool = False,
    ) -> ServiceCategoryRead:
        caller = await self.verify_member_access(db, org_id, user_id, is_admin)
        if not is_admin and (not caller or caller.role not in ("organization_owner", "lab_staff")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners or laboratory staff can modify service categories",
            )

        stmt = select(ServiceCategory).where(
            ServiceCategory.id == cat_id, ServiceCategory.organization_id == org_id
        )
        res = await db.execute(stmt)
        cat = res.scalar_one_or_none()

        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service category not found")

        if cat_in.name is not None:
            cat.name = cat_in.name.strip()
        if cat_in.description is not None:
            cat.description = cat_in.description
        if cat_in.sample_type is not None:
            cat.sample_type = cat_in.sample_type
        if cat_in.is_active is not None:
            cat.is_active = cat_in.is_active

        await db.commit()
        await db.refresh(cat)

        return ServiceCategoryRead.model_validate(cat)

    async def delete_service_category(
        self, db: AsyncSession, org_id: str, user_id: str, cat_id: str, is_admin: bool = False
    ):
        caller = await self.verify_member_access(db, org_id, user_id, is_admin)
        if not is_admin and (not caller or caller.role != "organization_owner"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners can delete service categories",
            )

        stmt = select(ServiceCategory).where(
            ServiceCategory.id == cat_id, ServiceCategory.organization_id == org_id
        )
        res = await db.execute(stmt)
        cat = res.scalar_one_or_none()

        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service category not found")

        await db.delete(cat)
        await db.commit()


provider_service = ProviderService()
