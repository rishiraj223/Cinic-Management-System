from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.schemas.lab import (
    DiagnosticReportRead,
    LabDashboardSummary,
    LabOrderCreate,
    LabOrderRead,
    LabResultCreate,
    LabResultRead,
    LabResultUpdate,
    LabResultValidate,
    LabSampleCreate,
    LabSampleRead,
    LabSampleStatusUpdate,
    LabTestCreate,
    LabTestRead,
    LabTestUpdate,
    ReportDeliveryCreate,
    ReportDeliveryRead,
)
from app.services.lab_service import lab_service

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/lab",
    tags=["Diagnostic Centre & Laboratory"],
)


# ------------------ Test Catalogue ------------------
@router.post("/tests", response_model=LabTestRead, status_code=status.HTTP_201_CREATED)
async def create_lab_test(
    organization_id: str,
    data: LabTestCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(
        db, organization_id, user.id, ["organization_owner", "doctor", "lab_technician"]
    )
    return await lab_service.create_test(db, organization_id, user, data)


@router.get("/tests", response_model=List[LabTestRead])
async def list_lab_tests(
    organization_id: str,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.get_tests(db, organization_id, category)


@router.patch("/tests/{test_id}", response_model=LabTestRead)
async def update_lab_test(
    organization_id: str,
    test_id: str,
    data: LabTestUpdate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(
        db, organization_id, user.id, ["organization_owner", "doctor", "lab_technician"]
    )
    return await lab_service.update_test(db, organization_id, test_id, data)


# ------------------ Orders ------------------
@router.post("/orders", response_model=LabOrderRead, status_code=status.HTTP_201_CREATED)
async def create_lab_order(
    organization_id: str,
    data: LabOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.create_order(db, organization_id, user, data)


@router.get("/orders", response_model=List[LabOrderRead])
async def list_lab_orders(
    organization_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.get_orders(db, organization_id, status_filter)


@router.get("/orders/{order_id}", response_model=LabOrderRead)
async def get_lab_order(
    organization_id: str,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.get_order(db, organization_id, order_id)


# ------------------ Samples ------------------
@router.post("/samples", response_model=LabSampleRead, status_code=status.HTTP_201_CREATED)
async def collect_sample(
    organization_id: str,
    data: LabSampleCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.create_sample(db, organization_id, user, data)


@router.patch("/samples/{sample_id}/status", response_model=LabSampleRead)
async def update_sample_status(
    organization_id: str,
    sample_id: str,
    data: LabSampleStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.update_sample_status(
        db, organization_id, user, sample_id, data.status, data.rejected_reason
    )


@router.get("/samples", response_model=List[LabSampleRead])
async def list_samples(
    organization_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.get_samples(db, organization_id, status_filter)


# ------------------ Results ------------------
@router.post("/results", response_model=LabResultRead, status_code=status.HTTP_201_CREATED)
async def enter_result(
    organization_id: str,
    data: LabResultCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.enter_result(db, organization_id, user, data)


@router.post("/results/{result_id}/validate", response_model=LabResultRead)
async def validate_result(
    organization_id: str,
    result_id: str,
    data: LabResultValidate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(
        db, organization_id, user.id, ["organization_owner", "doctor", "pathologist"]
    )
    return await lab_service.validate_result(db, organization_id, user, result_id, data.notes)


@router.get("/results", response_model=List[LabResultRead])
async def list_results(
    organization_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.get_results(db, organization_id, status_filter)


# ------------------ Reports & Delivery ------------------
@router.post("/orders/{order_id}/reports", response_model=DiagnosticReportRead, status_code=status.HTTP_201_CREATED)
async def create_diagnostic_report(
    organization_id: str,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(
        db, organization_id, user.id, ["organization_owner", "doctor", "pathologist"]
    )
    return await lab_service.create_diagnostic_report(db, organization_id, user, order_id)


@router.post("/reports/{report_id}/deliver", response_model=ReportDeliveryRead)
async def deliver_diagnostic_report(
    organization_id: str,
    report_id: str,
    data: ReportDeliveryCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.deliver_report(db, organization_id, user, report_id, data)


# ------------------ Summary Dashboard ------------------
@router.get("/dashboard", response_model=LabDashboardSummary)
async def get_lab_dashboard(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await lab_service.verify_org_membership(db, organization_id, user.id)
    return await lab_service.get_dashboard_summary(db, organization_id)
