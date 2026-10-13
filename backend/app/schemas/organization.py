from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re

OrganizationType = Literal["clinic", "hospital", "diagnostic_center"]
MemberRole = Literal["organization_owner", "doctor", "receptionist", "lab_staff"]
MemberStatus = Literal["active", "invited", "suspended"]


class OrganizationSettingsBase(BaseModel):
    timezone: str = "UTC"
    currency: str = "INR"
    operating_hours: Dict[str, Any] = Field(default_factory=dict)
    notification_preferences: Dict[str, Any] = Field(default_factory=dict)


class OrganizationSettingsRead(OrganizationSettingsBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Organization display name")
    slug: Optional[str] = Field(None, min_length=2, max_length=255, description="Unique URL slug")
    type: OrganizationType = Field(..., description="Organization category")
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    @field_validator("slug", mode="before")
    @classmethod
    def sanitize_slug(cls, v: Optional[str], info) -> Optional[str]:
        if v:
            # lower and sanitize slug
            slug = re.sub(r"[^a-zA-Z0-9_-]", "-", v.lower().strip())
            return re.sub(r"-+", "-", slug).strip("-")
        return v


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationRead(BaseModel):
    id: str
    name: str
    slug: str
    type: OrganizationType
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    settings: Optional[OrganizationSettingsRead] = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationWithRoleRead(OrganizationRead):
    current_user_role: str
    membership_status: str

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberRead(BaseModel):
    id: str
    organization_id: str
    user_id: str
    role: MemberRole
    status: MemberStatus
    created_at: datetime
    updated_at: datetime
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
