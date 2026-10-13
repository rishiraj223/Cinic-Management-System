from typing import Annotated, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.schemas.organization import (
    OrganizationCreate,
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
