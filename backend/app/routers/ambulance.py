from __future__ import annotations

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.schemas.ambulance import (
    AmbulanceCreate,
    AmbulanceRead,
    AmbulanceRequestCreate,
    AmbulanceRequestRead,
    AmbulanceSimulatedTracking,
    AmbulanceStatusUpdate,
    AmbulanceUpdate,
)
from app.services.ambulance_service import ambulance_service

router = APIRouter(prefix="/api/v1/ambulance", tags=["Emergency Ambulance Service"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
UserDep = Annotated[Profile, Depends(get_current_user)]


# ─── Public & Patient Emergency Assistance Endpoints ─────────────────────────

@router.post("/requests", response_model=AmbulanceRequestRead, status_code=status.HTTP_201_CREATED)
async def create_emergency_request(
    data: AmbulanceRequestCreate,
    db: DbDep,
    user: UserDep,
):
    """Raise an emergency ambulance request. (Prototype simulated dispatch)."""
    return await ambulance_service.create_request(db, user, data)


@router.get("/requests/my", response_model=List[AmbulanceRequestRead])
async def list_patient_requests(db: DbDep, user: UserDep):
    """View personal ambulance assistance requests and progress."""
    return await ambulance_service.list_patient_requests(db, user)


@router.get("/requests/{request_id}", response_model=AmbulanceRequestRead)
async def get_emergency_request(request_id: str, db: DbDep):
    """View details of a specific emergency assistance request."""
    return await ambulance_service.get_request(db, request_id)


@router.get("/requests/{request_id}/tracking", response_model=AmbulanceSimulatedTracking)
async def get_simulated_ambulance_tracking(request_id: str, db: DbDep):
    """Retrieve simulated GPS tracking location for an ambulance dispatch. Demo data only."""
    return await ambulance_service.get_simulated_tracking(db, request_id)


# ─── Facility / Operator Management Endpoints ─────────────────────────────────

@router.post("/organizations/{organization_id}/ambulances", response_model=AmbulanceRead, status_code=status.HTTP_201_CREATED)
async def register_ambulance(
    organization_id: str,
    data: AmbulanceCreate,
    db: DbDep,
    user: UserDep,
):
    """Register an ambulance vehicle to a hospital or operator fleet."""
    await ambulance_service.verify_org_membership(
        db, organization_id, user.id, ["organization_owner", "doctor", "receptionist", "ambulance_operator"]
    )
    return await ambulance_service.create_ambulance(db, organization_id, user, data)


@router.get("/organizations/{organization_id}/ambulances", response_model=List[AmbulanceRead])
async def list_ambulances(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    available_only: bool = Query(False),
):
    """List fleet of ambulance vehicles for a hospital or operator."""
    await ambulance_service.verify_org_membership(db, organization_id, user.id)
    return await ambulance_service.list_ambulances(db, organization_id, available_only)


@router.patch("/organizations/{organization_id}/ambulances/{ambulance_id}", response_model=AmbulanceRead)
async def update_ambulance_vehicle(
    organization_id: str,
    ambulance_id: str,
    data: AmbulanceUpdate,
    db: DbDep,
    user: UserDep,
):
    """Update ambulance vehicle status, availability, or driver."""
    await ambulance_service.verify_org_membership(db, organization_id, user.id)
    return await ambulance_service.update_ambulance(db, organization_id, ambulance_id, data)


@router.get("/organizations/{organization_id}/requests", response_model=List[AmbulanceRequestRead])
async def list_facility_emergency_requests(
    organization_id: str,
    db: DbDep,
    user: UserDep,
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """List emergency ambulance requests assigned to this healthcare facility."""
    await ambulance_service.verify_org_membership(db, organization_id, user.id)
    return await ambulance_service.list_facility_requests(db, organization_id, status_filter)


@router.patch("/organizations/{organization_id}/requests/{request_id}/status", response_model=AmbulanceRequestRead)
async def update_request_status(
    organization_id: str,
    request_id: str,
    data: AmbulanceStatusUpdate,
    db: DbDep,
    user: UserDep,
):
    """Accept, dispatch, update progress, or reject an ambulance request."""
    await ambulance_service.verify_org_membership(db, organization_id, user.id)
    return await ambulance_service.update_request_status(db, organization_id, user, request_id, data)
