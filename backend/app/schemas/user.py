from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class ProfileBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class OrganizationMembershipSummary(BaseModel):
    organization_id: str
    organization_name: str
    organization_slug: str
    organization_type: str
    role: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class ProfileRead(ProfileBase):
    id: str
    is_platform_admin: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(BaseModel):
    profile: ProfileRead
    memberships: List[OrganizationMembershipSummary] = []

    model_config = ConfigDict(from_attributes=True)
