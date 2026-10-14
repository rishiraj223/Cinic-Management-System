from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.services.hospital_service import hospital_service

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/hospital",
    tags=["Hospital & Multi-Doctor Management"],
)


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_hospital_dashboard(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await hospital_service.verify_org_membership(db, organization_id, user.id)
    return await hospital_service.get_hospital_dashboard(db, organization_id)


@router.get("/departments-report", response_model=List[Dict[str, Any]])
async def get_departments_report(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    await hospital_service.verify_org_membership(db, organization_id, user.id)
    return await hospital_service.get_department_report(db, organization_id)
