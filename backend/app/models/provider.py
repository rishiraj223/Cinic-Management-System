import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    specialty = Column(String(255), nullable=False, index=True)
    license_number = Column(String(100), nullable=True)
    qualifications = Column(String(255), nullable=True)
    experience_years = Column(Integer, default=0, nullable=False)
    consultation_fee = Column(Numeric(10, 2), default=0.00, nullable=False)
    bio = Column(Text, nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_doctor_org"),
    )

    # Relationships
    user = relationship("Profile")
    organization = relationship("Organization", back_populates="doctors")
    department_associations = relationship("DoctorDepartment", back_populates="doctor", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    head_doctor_id = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_dept_org_name"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="departments")
    head_doctor = relationship("Profile")
    doctor_associations = relationship("DoctorDepartment", back_populates="department", cascade="all, delete-orphan")


class DoctorDepartment(Base):
    __tablename__ = "doctor_departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_profile_id = Column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("department_id", "doctor_profile_id", name="uq_doctor_dept"),
    )

    # Relationships
    department = relationship("Department", back_populates="doctor_associations")
    doctor = relationship("DoctorProfile", back_populates="department_associations")


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sample_type = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_service_cat_org_name"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="service_categories")
