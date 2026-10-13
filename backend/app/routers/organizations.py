from typing import Annotated, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationOnboardingCreate,
    OrganizationSettingsRead,
    OrganizationSettingsUpdate,
    OrganizationUpdate,
    OrganizationWithRoleRead,
)
from app.services.organization_service import organization_service

router = APIRouter(prefix="/api/v1/organizations", tags=["Organizations"])


@router.get("", response_model=List[OrganizationWithRoleRead])
async def list_organizations(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Returns only organizations where the authenticated user is an active member.
    Enforces strict multi-tenant data isolation.
    """
    return await organization_service.get_user_organizations(
        db=db,
        user_id=current_user.id,
        is_platform_admin=current_user.is_platform_admin,
    )


@router.post("", response_model=OrganizationWithRoleRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_in: OrganizationCreate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Creates a new healthcare organization (clinic, hospital, or diagnostic center)
    and binds the authenticated user as the organization_owner.
    """
    return await organization_service.create_organization(
        db=db,
        user_id=current_user.id,
        org_in=org_in,
    )


@router.post("/onboard", response_model=OrganizationWithRoleRead, status_code=status.HTTP_201_CREATED)
async def onboard_organization(
    onboarding_in: OrganizationOnboardingCreate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Comprehensive provider onboarding endpoint:
    Creates organization, sets up owner membership, and provisions type-specific resources
    (doctor profile for clinics, default departments for hospitals, default test categories for labs).
    """
    return await organization_service.onboard_organization(
        db=db,
        user_id=current_user.id,
        onboarding_in=onboarding_in,
    )


@router.get("/{organization_id}", response_model=OrganizationWithRoleRead)
async def get_organization(
    organization_id: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Returns organization details only if the authenticated user belongs to it
    or holds platform admin privileges. Rejects unauthorized access with HTTP 403 Forbidden.
    """
    return await organization_service.get_organization_for_user(
        db=db,
        organization_id=organization_id,
        user_id=current_user.id,
        is_platform_admin=current_user.is_platform_admin,
    )


@router.patch("/{organization_id}", response_model=OrganizationWithRoleRead)
async def update_organization(
    organization_id: str,
    org_update: OrganizationUpdate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Updates organization profile details (address, city, state, postal code, phone, email).
    Only permitted for organization_owner or platform_admin.
    """
    return await organization_service.update_organization(
        db=db,
        organization_id=organization_id,
        user_id=current_user.id,
        org_update=org_update,
        is_platform_admin=current_user.is_platform_admin,
    )


@router.patch("/{organization_id}/settings", response_model=OrganizationSettingsRead)
async def update_organization_settings(
    organization_id: str,
    settings_update: OrganizationSettingsUpdate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Updates operational settings (timezone, currency, operating hours, notifications).
    Only permitted for organization_owner or platform_admin.
    """
    return await organization_service.update_organization_settings(
        db=db,
        organization_id=organization_id,
        user_id=current_user.id,
        settings_update=settings_update,
        is_platform_admin=current_user.is_platform_admin,
    )
