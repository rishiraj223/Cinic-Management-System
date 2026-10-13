from typing import Annotated, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.schemas.organization import OrganizationMemberRead
from app.schemas.provider import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
    DoctorDepartmentAssign,
    DoctorProfileCreate,
    DoctorProfileRead,
    MemberAddInput,
    MemberUpdateInput,
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)
from app.services.provider_service import provider_service

router = APIRouter(prefix="/api/v1/organizations/{organization_id}", tags=["Healthcare Provider Workflows"])


# =============================================================================
# Members & Staff Management
# =============================================================================
@router.get("/members", response_model=List[OrganizationMemberRead])
async def list_organization_members(
    organization_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Lists all staff members of the organization. Caller must be an active member."""
    return await provider_service.list_members(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        is_admin=current_user.is_platform_admin,
    )


@router.post("/members", response_model=OrganizationMemberRead, status_code=status.HTTP_201_CREATED)
async def add_organization_member(
    organization_id: str,
    member_in: MemberAddInput,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Adds a staff member with a designated role (doctor, receptionist, lab_staff). Owner only."""
    return await provider_service.add_member(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        member_in=member_in,
        is_admin=current_user.is_platform_admin,
    )


@router.patch("/members/{member_id}", response_model=OrganizationMemberRead)
async def update_organization_member(
    organization_id: str,
    member_id: str,
    member_update: MemberUpdateInput,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Updates a member's role or status. Owner only."""
    return await provider_service.update_member(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        member_id=member_id,
        member_update=member_update,
        is_admin=current_user.is_platform_admin,
    )


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization_member(
    organization_id: str,
    member_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Removes a staff member from the organization. Owner only."""
    await provider_service.delete_member(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        member_id=member_id,
        is_admin=current_user.is_platform_admin,
    )


# =============================================================================
# Doctor Profiles & Directory
# =============================================================================
@router.get("/doctors", response_model=List[DoctorProfileRead])
async def list_organization_doctors(
    organization_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Returns directory of doctors in the organization with their qualifications and departments."""
    return await provider_service.list_doctors(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        is_admin=current_user.is_platform_admin,
    )


@router.post("/doctors", response_model=DoctorProfileRead)
async def create_or_update_doctor_profile(
    organization_id: str,
    doc_in: DoctorProfileCreate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Creates or updates a doctor's clinical profile."""
    return await provider_service.create_or_update_doctor_profile(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        doc_in=doc_in,
        is_admin=current_user.is_platform_admin,
    )


# =============================================================================
# Hospital Departments
# =============================================================================
@router.get("/departments", response_model=List[DepartmentRead])
async def list_organization_departments(
    organization_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Lists departments in a hospital or multi-doctor clinic."""
    return await provider_service.list_departments(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        is_admin=current_user.is_platform_admin,
    )


@router.post("/departments", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
async def create_organization_department(
    organization_id: str,
    dept_in: DepartmentCreate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Creates a hospital department (e.g. Cardiology, Pediatrics). Owner only."""
    return await provider_service.create_department(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        dept_in=dept_in,
        is_admin=current_user.is_platform_admin,
    )


@router.patch("/departments/{department_id}", response_model=DepartmentRead)
async def update_organization_department(
    organization_id: str,
    department_id: str,
    dept_in: DepartmentUpdate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Updates a department's details or head doctor."""
    return await provider_service.update_department(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        dept_id=department_id,
        dept_in=dept_in,
        is_admin=current_user.is_platform_admin,
    )


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization_department(
    organization_id: str,
    department_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deletes a department. Owner only."""
    await provider_service.delete_department(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        dept_id=department_id,
        is_admin=current_user.is_platform_admin,
    )


@router.post("/departments/{department_id}/doctors")
async def assign_doctor_to_department(
    organization_id: str,
    department_id: str,
    assign_in: DoctorDepartmentAssign,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Associates a doctor profile with a hospital department."""
    return await provider_service.assign_doctor_to_department(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        dept_id=department_id,
        doctor_profile_id=assign_in.doctor_profile_id,
        is_primary=assign_in.is_primary,
        is_admin=current_user.is_platform_admin,
    )


@router.delete("/departments/{department_id}/doctors/{doctor_profile_id}")
async def remove_doctor_from_department(
    organization_id: str,
    department_id: str,
    doctor_profile_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Removes a doctor from a department."""
    return await provider_service.remove_doctor_from_department(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        dept_id=department_id,
        doctor_profile_id=doctor_profile_id,
        is_admin=current_user.is_platform_admin,
    )


# =============================================================================
# Diagnostic Service Categories
# =============================================================================
@router.get("/service-categories", response_model=List[ServiceCategoryRead])
async def list_service_categories(
    organization_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Lists test service categories in a diagnostic center or laboratory."""
    return await provider_service.list_service_categories(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        is_admin=current_user.is_platform_admin,
    )


@router.post("/service-categories", response_model=ServiceCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_service_category(
    organization_id: str,
    cat_in: ServiceCategoryCreate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Creates a laboratory service category (e.g. Hematology, Biochemistry)."""
    return await provider_service.create_service_category(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        cat_in=cat_in,
        is_admin=current_user.is_platform_admin,
    )


@router.patch("/service-categories/{category_id}", response_model=ServiceCategoryRead)
async def update_service_category(
    organization_id: str,
    category_id: str,
    cat_in: ServiceCategoryUpdate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Updates a diagnostic service category."""
    return await provider_service.update_service_category(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        cat_id=category_id,
        cat_in=cat_in,
        is_admin=current_user.is_platform_admin,
    )


@router.delete("/service-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_category(
    organization_id: str,
    category_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deletes a diagnostic service category. Owner only."""
    await provider_service.delete_service_category(
        db=db,
        org_id=organization_id,
        user_id=current_user.id,
        cat_id=category_id,
        is_admin=current_user.is_platform_admin,
    )
