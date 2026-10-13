from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.organization import Organization, OrganizationMember
from app.models.user import Profile
from app.schemas.user import (
    OrganizationMembershipSummary,
    ProfileRead,
    ProfileUpdate,
    UserProfileResponse,
)

router = APIRouter(prefix="/api/v1", tags=["Users"])


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Returns the authenticated user's profile and active organization memberships.
    """
    stmt = (
        select(OrganizationMember, Organization)
        .join(Organization, OrganizationMember.organization_id == Organization.id)
        .where(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == "active",
        )
    )
    result = await db.execute(stmt)
    rows = result.all()

    memberships = [
        OrganizationMembershipSummary(
            organization_id=org.id,
            organization_name=org.name,
            organization_slug=org.slug,
            organization_type=org.type,
            role=member.role,
            status=member.status,
        )
        for member, org in rows
    ]

    return UserProfileResponse(
        profile=ProfileRead.model_validate(current_user),
        memberships=memberships,
    )


@router.patch("/me", response_model=ProfileRead)
async def update_my_profile(
    profile_update: ProfileUpdate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Updates the authenticated user's editable profile fields.
    """
    if profile_update.full_name is not None:
        current_user.full_name = profile_update.full_name
    if profile_update.phone is not None:
        current_user.phone = profile_update.phone
    if profile_update.avatar_url is not None:
        current_user.avatar_url = profile_update.avatar_url

    await db.commit()
    await db.refresh(current_user)

    return ProfileRead.model_validate(current_user)
