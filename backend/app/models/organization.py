import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)  # 'clinic', 'hospital', 'diagnostic_center'
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    settings = relationship("OrganizationSetting", back_populates="organization", uselist=False, cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")
    service_categories = relationship("ServiceCategory", back_populates="organization", cascade="all, delete-orphan")
    doctors = relationship("DoctorProfile", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False, index=True)  # 'organization_owner', 'doctor', 'receptionist', 'lab_staff'
    status = Column(String(50), default="active", nullable=False, index=True)  # 'active', 'invited', 'suspended'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_organization_member"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("Profile", back_populates="memberships")


class OrganizationSetting(Base):
    __tablename__ = "organization_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    operating_hours = Column(JSON, nullable=False, default=dict)
    notification_preferences = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="settings")
