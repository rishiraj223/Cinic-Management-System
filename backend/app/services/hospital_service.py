from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.clinic import Appointment, Invoice, Payment
from app.models.organization import OrganizationMember
from app.models.provider import Department, DoctorDepartment, DoctorProfile
from app.models.user import Profile


class HospitalService:
    async def verify_org_membership(
        self,
        db: AsyncSession,
        org_id: str,
        user_id: str,
        allowed_roles: Optional[List[str]] = None,
    ) -> OrganizationMember:
        query = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        )
        res = await db.execute(query)
        member = res.scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not an active member of this organization",
            )
        if allowed_roles and member.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {allowed_roles}",
            )
        return member

    async def get_hospital_dashboard(self, db: AsyncSession, org_id: str) -> dict:
        # Count departments
        dept_count = await db.scalar(
            select(func.count(Department.id)).where(
                Department.organization_id == org_id, Department.is_active == True
            )
        ) or 0

        # Count doctors & staff
        staff_count = await db.scalar(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.status == "active",
            )
        ) or 0

        doctor_count = await db.scalar(
            select(func.count(DoctorProfile.id)).where(
                DoctorProfile.organization_id == org_id, DoctorProfile.is_available == True
            )
        ) or 0

        # Appointments today
        today = date.today()
        today_appts = await db.scalar(
            select(func.count(Appointment.id)).where(
                Appointment.organization_id == org_id, Appointment.appointment_date == today
            )
        ) or 0

        completed_appts = await db.scalar(
            select(func.count(Appointment.id)).where(
                Appointment.organization_id == org_id, Appointment.status == "completed"
            )
        ) or 0

        cancelled_appts = await db.scalar(
            select(func.count(Appointment.id)).where(
                Appointment.organization_id == org_id, Appointment.status == "cancelled"
            )
        ) or 0

        # Financial totals
        total_revenue = await db.scalar(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
                Payment.organization_id == org_id
            )
        ) or Decimal("0.00")

        outstanding_balance = await db.scalar(
            select(func.coalesce(func.sum(Invoice.balance), Decimal("0.00"))).where(
                Invoice.organization_id == org_id
            )
        ) or Decimal("0.00")

        # Department-wise breakdown
        dept_query = (
            select(Department.name, func.count(DoctorDepartment.id))
            .outerjoin(DoctorDepartment, DoctorDepartment.department_id == Department.id)
            .where(Department.organization_id == org_id)
            .group_by(Department.id, Department.name)
        )
        dept_res = await db.execute(dept_query)
        dept_breakdown = [{"department": row[0], "doctors": row[1]} for row in dept_res.all()]

        return {
            "departments_count": dept_count,
            "staff_count": staff_count,
            "doctors_count": doctor_count,
            "today_appointments": today_appts,
            "completed_appointments": completed_appts,
            "cancelled_appointments": cancelled_appts,
            "total_revenue": float(total_revenue),
            "outstanding_balance": float(outstanding_balance),
            "department_breakdown": dept_breakdown,
        }

    async def get_department_report(self, db: AsyncSession, org_id: str) -> List[dict]:
        depts_res = await db.execute(
            select(Department).where(Department.organization_id == org_id)
        )
        depts = depts_res.scalars().all()
        results = []
        for d in depts:
            doc_count = await db.scalar(
                select(func.count(DoctorDepartment.id)).where(
                    DoctorDepartment.department_id == d.id
                )
            ) or 0
            results.append({
                "department_id": d.id,
                "name": d.name,
                "description": d.description,
                "is_active": d.is_active,
                "total_doctors": doc_count,
            })
        return results


hospital_service = HospitalService()
