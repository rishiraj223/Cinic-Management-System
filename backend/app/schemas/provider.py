from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.organization import MemberRole, MemberStatus


class DoctorProfileCreate(BaseModel):
    user_id: Optional[str] = None  # if not provided, uses current user
    specialty: str = Field(..., min_length=2, max_length=255)
    license_number: Optional[str] = None
    qualifications: Optional[str] = None
    experience_years: int = Field(0, ge=0)
    consultation_fee: float = Field(0.0, ge=0.0)
    bio: Optional[str] = None
    is_available: bool = True


class DoctorProfileUpdate(BaseModel):
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    qualifications: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0)
    consultation_fee: Optional[float] = Field(None, ge=0.0)
    bio: Optional[str] = None
    is_available: Optional[bool] = None


class DoctorProfileRead(BaseModel):
    id: str
    user_id: str
    organization_id: str
    specialty: str
    license_number: Optional[str] = None
    qualifications: Optional[str] = None
    experience_years: int
    consultation_fee: float
    bio: Optional[str] = None
    is_available: bool
    created_at: datetime
    updated_at: datetime
    doctor_name: Optional[str] = None
    doctor_email: Optional[str] = None
    department_names: List[str] = []

    model_config = ConfigDict(from_attributes=True)


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    head_doctor_id: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_doctor_id: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentRead(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    head_doctor_id: Optional[str] = None
    head_doctor_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    doctor_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class DoctorDepartmentAssign(BaseModel):
    doctor_profile_id: str
    is_primary: bool = True


class ServiceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    sample_type: Optional[str] = Field(None, description="e.g. Blood, Urine, Imaging, Swab")


class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sample_type: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceCategoryRead(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    sample_type: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberAddInput(BaseModel):
    email: str = Field(..., description="Email of the user to invite or add")
    role: MemberRole = Field(..., description="Role to assign in this organization")
    status: MemberStatus = Field("active", description="Initial membership status")


class MemberUpdateInput(BaseModel):
    role: Optional[MemberRole] = None
    status: Optional[MemberStatus] = None
