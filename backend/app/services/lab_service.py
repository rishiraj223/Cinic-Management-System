from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.clinic import AuditLog, Invoice, InvoiceItem, Patient
from app.models.lab import (
    DiagnosticReport,
    LabOrder,
    LabOrderItem,
    LabResult,
    LabResultHistory,
    LabSample,
    LabTest,
    ReportDeliveryEvent,
)
from app.models.organization import OrganizationMember
from app.models.user import Profile
from app.schemas.lab import (
    LabOrderCreate,
    LabResultCreate,
    LabResultUpdate,
    LabSampleCreate,
    LabTestCreate,
    LabTestUpdate,
    ReportDeliveryCreate,
)


class LabService:
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

    # ------------------ Lab Test Catalogue ------------------
    async def create_test(
        self, db: AsyncSession, org_id: str, user: Profile, data: LabTestCreate
    ) -> LabTest:
        test = LabTest(
            organization_id=org_id,
            name=data.name,
            code=data.code,
            category=data.category,
            description=data.description,
            price=data.price,
            specimen_type=data.specimen_type,
            prep_instructions=data.prep_instructions,
            turnaround_minutes=data.turnaround_minutes,
            is_active=data.is_active,
        )
        db.add(test)
        await db.commit()
        await db.refresh(test)
        return test

    async def get_tests(
        self, db: AsyncSession, org_id: str, category: Optional[str] = None
    ) -> List[LabTest]:
        query = select(LabTest).where(LabTest.organization_id == org_id)
        if category:
            query = query.where(LabTest.category == category)
        res = await db.execute(query.order_by(LabTest.name))
        return list(res.scalars().all())

    async def update_test(
        self, db: AsyncSession, org_id: str, test_id: str, data: LabTestUpdate
    ) -> LabTest:
        query = select(LabTest).where(LabTest.id == test_id, LabTest.organization_id == org_id)
        res = await db.execute(query)
        test = res.scalar_one_or_none()
        if not test:
            raise HTTPException(status_code=404, detail="Lab test not found")

        update_dict = data.model_dump(exclude_unset=True)
        for k, v in update_dict.items():
            setattr(test, k, v)
        await db.commit()
        await db.refresh(test)
        return test

    # ------------------ Lab Orders & Items ------------------
    async def create_order(
        self, db: AsyncSession, org_id: str, user: Profile, data: LabOrderCreate
    ) -> LabOrder:
        order_num = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        order = LabOrder(
            organization_id=org_id,
            patient_id=data.patient_id,
            created_by=user.id,
            referring_doctor_id=data.referring_doctor_id,
            order_number=order_num,
            status="pending",
            notes=data.notes,
        )
        db.add(order)
        await db.flush()

        total_amount = Decimal("0.00")
        for item_in in data.items:
            test_res = await db.execute(
                select(LabTest).where(
                    LabTest.id == item_in.lab_test_id, LabTest.organization_id == org_id
                )
            )
            test = test_res.scalar_one_or_none()
            if not test:
                raise HTTPException(status_code=400, detail=f"Test {item_in.lab_test_id} not found")

            item = LabOrderItem(
                lab_order_id=order.id,
                lab_test_id=test.id,
                status="ordered",
                price_at_order=test.price,
            )
            total_amount += test.price
            db.add(item)

        # Automatically generate invoice for Diagnostic billing integration
        inv_num = f"INV-LAB-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        invoice = Invoice(
            organization_id=org_id,
            patient_id=data.patient_id,
            created_by=user.id,
            invoice_number=inv_num,
            status="unpaid",
            subtotal=total_amount,
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            total=total_amount,
            amount_paid=Decimal("0.00"),
            balance=total_amount,
            notes=f"Auto-generated for Lab Order {order_num}",
        )
        db.add(invoice)
        await db.flush()

        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            description=f"Lab Order tests ({len(data.items)} tests)",
            quantity=1,
            unit_price=total_amount,
            total=total_amount,
        )
        db.add(inv_item)

        await db.commit()

        # Reload with items
        query = (
            select(LabOrder)
            .where(LabOrder.id == order.id)
            .options(selectinload(LabOrder.items).selectinload(LabOrderItem.lab_test))
        )
        res = await db.execute(query)
        return res.scalar_one()

    async def get_orders(
        self, db: AsyncSession, org_id: str, status_filter: Optional[str] = None
    ) -> List[LabOrder]:
        query = (
            select(LabOrder)
            .where(LabOrder.organization_id == org_id)
            .options(selectinload(LabOrder.items).selectinload(LabOrderItem.lab_test))
            .order_by(desc(LabOrder.created_at))
        )
        if status_filter:
            query = query.where(LabOrder.status == status_filter)
        res = await db.execute(query)
        return list(res.scalars().all())

    async def get_order(self, db: AsyncSession, org_id: str, order_id: str) -> LabOrder:
        query = (
            select(LabOrder)
            .where(LabOrder.id == order_id, LabOrder.organization_id == org_id)
            .options(selectinload(LabOrder.items).selectinload(LabOrderItem.lab_test))
        )
        res = await db.execute(query)
        order = res.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Lab order not found")
        return order

    # ------------------ Samples ------------------
    async def create_sample(
        self, db: AsyncSession, org_id: str, user: Profile, data: LabSampleCreate
    ) -> LabSample:
        sample_ref = f"SMP-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        sample = LabSample(
            organization_id=org_id,
            lab_order_id=data.lab_order_id,
            sample_ref=sample_ref,
            sample_type=data.sample_type,
            status="pending_collection",
        )
        db.add(sample)
        await db.commit()
        await db.refresh(sample)
        return sample

    async def update_sample_status(
        self, db: AsyncSession, org_id: str, user: Profile, sample_id: str, status_str: str, reason: Optional[str] = None
    ) -> LabSample:
        res = await db.execute(
            select(LabSample).where(LabSample.id == sample_id, LabSample.organization_id == org_id)
        )
        sample = res.scalar_one_or_none()
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        sample.status = status_str
        if status_str == "collected":
            sample.collected_by = user.id
            sample.collected_at = datetime.utcnow()
        elif status_str == "received":
            sample.received_by = user.id
            sample.received_at = datetime.utcnow()
        elif status_str == "rejected":
            sample.rejected_reason = reason

        await db.commit()
        await db.refresh(sample)
        return sample

    async def get_samples(
        self, db: AsyncSession, org_id: str, status_filter: Optional[str] = None
    ) -> List[LabSample]:
        query = select(LabSample).where(LabSample.organization_id == org_id).order_by(desc(LabSample.created_at))
        if status_filter:
            query = query.where(LabSample.status == status_filter)
        res = await db.execute(query)
        return list(res.scalars().all())

    # ------------------ Lab Results ------------------
    async def enter_result(
        self, db: AsyncSession, org_id: str, user: Profile, data: LabResultCreate
    ) -> LabResult:
        # Check order item
        item_res = await db.execute(
            select(LabOrderItem)
            .join(LabOrder)
            .where(LabOrderItem.id == data.lab_order_item_id, LabOrder.organization_id == org_id)
        )
        item = item_res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Order item not found")

        # Existing result?
        res_check = await db.execute(
            select(LabResult).where(LabResult.lab_order_item_id == data.lab_order_item_id)
        )
        existing = res_check.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Result already entered for this item")

        result = LabResult(
            organization_id=org_id,
            lab_order_item_id=data.lab_order_item_id,
            lab_sample_id=data.lab_sample_id,
            result_value=data.result_value,
            unit=data.unit,
            reference_range_low=data.reference_range_low,
            reference_range_high=data.reference_range_high,
            result_flag=data.result_flag,
            entered_by=user.id,
            entered_at=datetime.utcnow(),
            notes=data.notes,
            status="entered",
        )
        db.add(result)
        item.status = "result_entered"
        await db.commit()
        await db.refresh(result)
        return result

    async def validate_result(
        self, db: AsyncSession, org_id: str, user: Profile, result_id: str, notes: Optional[str] = None
    ) -> LabResult:
        res = await db.execute(
            select(LabResult).where(LabResult.id == result_id, LabResult.organization_id == org_id)
        )
        result = res.scalar_one_or_none()
        if not result:
            raise HTTPException(status_code=404, detail="Lab result not found")

        result.status = "validated"
        result.validated_by = user.id
        result.validated_at = datetime.utcnow()
        if notes:
            result.notes = (result.notes or "") + f"\nValidation notes: {notes}"

        # update item status
        item_res = await db.execute(
            select(LabOrderItem).where(LabOrderItem.id == result.lab_order_item_id)
        )
        item = item_res.scalar_one_or_none()
        if item:
            item.status = "validated"

        await db.commit()
        await db.refresh(result)
        return result

    async def get_results(
        self, db: AsyncSession, org_id: str, status_filter: Optional[str] = None
    ) -> List[LabResult]:
        query = select(LabResult).where(LabResult.organization_id == org_id).order_by(desc(LabResult.created_at))
        if status_filter:
            query = query.where(LabResult.status == status_filter)
        res = await db.execute(query)
        return list(res.scalars().all())

    # ------------------ Reports & Delivery ------------------
    async def create_diagnostic_report(
        self, db: AsyncSession, org_id: str, user: Profile, order_id: str
    ) -> DiagnosticReport:
        order_res = await db.execute(
            select(LabOrder).where(LabOrder.id == order_id, LabOrder.organization_id == org_id)
        )
        order = order_res.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Lab order not found")

        report_ref = f"REP-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        report = DiagnosticReport(
            organization_id=org_id,
            lab_order_id=order_id,
            report_ref=report_ref,
            status="validated",
            validated_by=user.id,
            validated_at=datetime.utcnow(),
            released_by=user.id,
            released_at=datetime.utcnow(),
        )
        db.add(report)
        order.status = "completed"
        await db.commit()
        await db.refresh(report)
        return report

    async def deliver_report(
        self, db: AsyncSession, org_id: str, user: Profile, report_id: str, data: ReportDeliveryCreate
    ) -> ReportDeliveryEvent:
        res = await db.execute(
            select(DiagnosticReport).where(
                DiagnosticReport.id == report_id, DiagnosticReport.organization_id == org_id
            )
        )
        report = res.scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=404, detail="Diagnostic report not found")

        event = ReportDeliveryEvent(
            diagnostic_report_id=report.id,
            delivered_to=data.delivered_to,
            delivery_method=data.delivery_method or "in_app",
            delivery_status="delivered",
            notes=data.notes,
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    async def get_dashboard_summary(self, db: AsyncSession, org_id: str) -> dict:
        tests_count = await db.scalar(
            select(func.count(LabTest.id)).where(LabTest.organization_id == org_id)
        ) or 0
        orders_count = await db.scalar(
            select(func.count(LabOrder.id)).where(LabOrder.organization_id == org_id)
        ) or 0
        pending_samples = await db.scalar(
            select(func.count(LabSample.id)).where(
                LabSample.organization_id == org_id, LabSample.status == "pending_collection"
            )
        ) or 0
        pending_validation = await db.scalar(
            select(func.count(LabResult.id)).where(
                LabResult.organization_id == org_id, LabResult.status == "entered"
            )
        ) or 0
        reports_count = await db.scalar(
            select(func.count(DiagnosticReport.id)).where(DiagnosticReport.organization_id == org_id)
        ) or 0

        # Revenue
        rev = await db.scalar(
            select(func.coalesce(func.sum(Invoice.amount_paid), Decimal("0.00"))).where(
                Invoice.organization_id == org_id
            )
        ) or Decimal("0.00")

        return {
            "total_tests_in_catalogue": tests_count,
            "orders_today": orders_count,
            "samples_pending_collection": pending_samples,
            "results_pending_validation": pending_validation,
            "reports_released_today": reports_count,
            "total_revenue_today": float(rev),
        }


lab_service = LabService()
