from __future__ import annotations

from datetime import datetime
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ambulance import Ambulance, AmbulanceRequest
from app.models.organization import OrganizationMember
from app.models.user import Profile
from app.schemas.ambulance import (
    AmbulanceCreate,
    AmbulanceRequestCreate,
    AmbulanceSimulatedTracking,
    AmbulanceStatusUpdate,
    AmbulanceUpdate,
)


class AmbulanceService:
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

    # ─── Ambulance Provider Fleet Management ─────────────────────────────────────

    async def create_ambulance(
        self, db: AsyncSession, org_id: str, user: Profile, data: AmbulanceCreate
    ) -> Ambulance:
        amb = Ambulance(
            organization_id=org_id,
            vehicle_number=data.vehicle_number,
            vehicle_type=data.vehicle_type,
            driver_name=data.driver_name,
            driver_phone=data.driver_phone,
            service_area=data.service_area,
            is_available=data.is_available,
            base_latitude=data.base_latitude,
            base_longitude=data.base_longitude,
            current_latitude=data.base_latitude,
            current_longitude=data.base_longitude,
        )
        db.add(amb)
        await db.commit()
        await db.refresh(amb)
        return amb

    async def list_ambulances(
        self, db: AsyncSession, org_id: str, available_only: bool = False
    ) -> List[Ambulance]:
        q = select(Ambulance).where(Ambulance.organization_id == org_id)
        if available_only:
            q = q.where(Ambulance.is_available == True)
        res = await db.execute(q.order_by(Ambulance.vehicle_number))
        return list(res.scalars().all())

    async def update_ambulance(
        self, db: AsyncSession, org_id: str, ambulance_id: str, data: AmbulanceUpdate
    ) -> Ambulance:
        res = await db.execute(
            select(Ambulance).where(Ambulance.id == ambulance_id, Ambulance.organization_id == org_id)
        )
        amb = res.scalar_one_or_none()
        if not amb:
            raise HTTPException(status_code=404, detail="Ambulance vehicle not found")

        update_dict = data.model_dump(exclude_unset=True)
        for k, v in update_dict.items():
            setattr(amb, k, v)

        await db.commit()
        await db.refresh(amb)
        return amb

    # ─── Emergency Ambulance Requests (Patient & Public) ──────────────────────────

    async def create_request(
        self, db: AsyncSession, user: Optional[Profile], data: AmbulanceRequestCreate
    ) -> AmbulanceRequest:
        req = AmbulanceRequest(
            organization_id=data.organization_id,
            user_id=user.id if user else None,
            patient_name=data.patient_name,
            contact_phone=data.contact_phone,
            pickup_address=data.pickup_address,
            pickup_latitude=data.pickup_latitude,
            pickup_longitude=data.pickup_longitude,
            emergency_type=data.emergency_type,
            additional_notes=data.additional_notes,
            status="requested",
            eta_minutes=15.0,
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)
        return req

    async def list_patient_requests(
        self, db: AsyncSession, user: Profile
    ) -> List[AmbulanceRequest]:
        q = (
            select(AmbulanceRequest)
            .where(AmbulanceRequest.user_id == user.id)
            .options(selectinload(AmbulanceRequest.assigned_ambulance))
            .order_by(desc(AmbulanceRequest.requested_at))
        )
        res = await db.execute(q)
        return list(res.scalars().all())

    async def get_request(
        self, db: AsyncSession, request_id: str
    ) -> AmbulanceRequest:
        q = (
            select(AmbulanceRequest)
            .where(AmbulanceRequest.id == request_id)
            .options(selectinload(AmbulanceRequest.assigned_ambulance))
        )
        res = await db.execute(q)
        req = res.scalar_one_or_none()
        if not req:
            raise HTTPException(status_code=404, detail="Ambulance emergency request not found")
        return req

    # ─── Request Management for Authorized Facility Staff ─────────────────────────

    async def list_facility_requests(
        self, db: AsyncSession, org_id: str, status_filter: Optional[str] = None
    ) -> List[AmbulanceRequest]:
        q = (
            select(AmbulanceRequest)
            .where(AmbulanceRequest.organization_id == org_id)
            .options(selectinload(AmbulanceRequest.assigned_ambulance))
            .order_by(desc(AmbulanceRequest.requested_at))
        )
        if status_filter:
            q = q.where(AmbulanceRequest.status == status_filter)
        res = await db.execute(q)
        return list(res.scalars().all())

    async def update_request_status(
        self, db: AsyncSession, org_id: str, user: Profile, request_id: str, data: AmbulanceStatusUpdate
    ) -> AmbulanceRequest:
        req = await self.get_request(db, request_id)

        now = datetime.utcnow()
        req.status = data.status

        if data.status == "accepted":
            req.accepted_at = now
            if data.assigned_ambulance_id:
                req.assigned_ambulance_id = data.assigned_ambulance_id
                # Mark ambulance unavailable
                amb_res = await db.execute(
                    select(Ambulance).where(Ambulance.id == data.assigned_ambulance_id)
                )
                amb = amb_res.scalar_one_or_none()
                if amb:
                    amb.is_available = False
        elif data.status == "on_the_way":
            req.dispatched_at = now
            if data.eta_minutes is not None:
                req.eta_minutes = data.eta_minutes
        elif data.status == "arrived":
            req.arrived_at = now
            req.eta_minutes = 0.0
        elif data.status in ("completed", "rejected", "cancelled"):
            if data.status == "completed":
                req.completed_at = now
            if data.cancellation_reason:
                req.cancellation_reason = data.cancellation_reason
            # Release assigned ambulance
            if req.assigned_ambulance_id:
                amb_res = await db.execute(
                    select(Ambulance).where(Ambulance.id == req.assigned_ambulance_id)
                )
                amb = amb_res.scalar_one_or_none()
                if amb:
                    amb.is_available = True

        await db.commit()
        await db.refresh(req)
        return req

    # ─── Simulated Tracking View ──────────────────────────────────────────────────

    async def get_simulated_tracking(
        self, db: AsyncSession, request_id: str
    ) -> AmbulanceSimulatedTracking:
        req = await self.get_request(db, request_id)

        amb_lat = req.pickup_latitude + 0.015
        amb_lng = req.pickup_longitude + 0.015
        driver_name = None
        driver_phone = None
        vehicle_num = None

        if req.assigned_ambulance:
            amb = req.assigned_ambulance
            driver_name = amb.driver_name
            driver_phone = amb.driver_phone
            vehicle_num = amb.vehicle_number

            # Simulate step movement towards pickup point based on status
            if req.status == "arrived" or req.status == "completed":
                amb_lat = req.pickup_latitude
                amb_lng = req.pickup_longitude
            elif req.status == "on_the_way":
                # Halfway simulation
                amb_lat = (amb.base_latitude + req.pickup_latitude) / 2.0
                amb_lng = (amb.base_longitude + req.pickup_longitude) / 2.0
            else:
                amb_lat = amb.current_latitude
                amb_lng = amb.current_longitude

        return AmbulanceSimulatedTracking(
            request_id=req.id,
            status=req.status,
            eta_minutes=req.eta_minutes or 10.0,
            ambulance_latitude=amb_lat,
            ambulance_longitude=amb_lng,
            pickup_latitude=req.pickup_latitude,
            pickup_longitude=req.pickup_longitude,
            driver_name=driver_name or "Assigned Dispatch Driver",
            driver_phone=driver_phone or "Emergency Helpdesk",
            vehicle_number=vehicle_num or "AMB-DEMO-99",
        )


ambulance_service = AmbulanceService()
