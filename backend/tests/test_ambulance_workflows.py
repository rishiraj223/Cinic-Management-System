import pytest
from httpx import AsyncClient
from conftest import create_test_token
from app.models.organization import Organization, OrganizationMember
from app.models.user import Profile


@pytest.mark.asyncio
async def test_ambulance_full_workflow(client: AsyncClient, db_session):
    # 1. Setup Hospital Staff & Fleet Operator
    staff_user_id = "staff-amb-user"
    staff_token = create_test_token(staff_user_id, "staff@hospital.com", "Dispatch Manager")
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    db_session.add(Profile(id=staff_user_id, email="staff@hospital.com", full_name="Dispatch Manager"))

    org = Organization(
        id="org-amb-1",
        name="Metro Hospital & Trauma Care",
        slug="metro-hospital-trauma",
        type="hospital",
        city="Mumbai",
    )
    db_session.add(org)

    db_session.add(
        OrganizationMember(
            organization_id=org.id,
            user_id=staff_user_id,
            role="organization_owner",
            status="active",
        )
    )

    # 2. Setup Patient
    pat_user_id = "pat-emergency-user"
    pat_token = create_test_token(pat_user_id, "patient-emer@test.com", "Emergency Patient")
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    db_session.add(Profile(id=pat_user_id, email="patient-emer@test.com", full_name="Emergency Patient"))

    await db_session.commit()

    # ── Test 1: Register an Ambulance Vehicle (Operator) ──
    amb_payload = {
        "vehicle_number": "MH-01-AB-1234",
        "vehicle_type": "ICU",
        "driver_name": "Ramesh Kumar",
        "driver_phone": "9820011223",
        "service_area": "Central & Downtown Mumbai",
        "is_available": True,
        "base_latitude": 19.0760,
        "base_longitude": 72.8777,
    }
    r = await client.post(
        f"/api/v1/ambulance/organizations/{org.id}/ambulances",
        json=amb_payload,
        headers=staff_headers,
    )
    assert r.status_code == 201, r.text
    amb_data = r.json()
    amb_id = amb_data["id"]
    assert amb_data["vehicle_number"] == "MH-01-AB-1234"
    assert amb_data["is_available"] is True

    # ── Test 2: List Fleet Ambulances ──
    r = await client.get(
        f"/api/v1/ambulance/organizations/{org.id}/ambulances",
        headers=staff_headers,
    )
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # ── Test 3: Emergency Assistance Request (Patient) ──
    request_payload = {
        "organization_id": org.id,
        "patient_name": "Emergency Patient",
        "contact_phone": "9898989898",
        "pickup_address": "Flat 402, Sunshine Apts, Bandra West",
        "pickup_latitude": 19.0596,
        "pickup_longitude": 72.8295,
        "emergency_type": "Cardiac Distress",
        "additional_notes": "Chest pain, patient conscious",
    }
    r = await client.post(
        "/api/v1/ambulance/requests",
        json=request_payload,
        headers=pat_headers,
    )
    assert r.status_code == 201, r.text
    req_data = r.json()
    req_id = req_data["id"]
    assert req_data["status"] == "requested"

    # ── Test 4: List Facility Requests (Operator) ──
    r = await client.get(
        f"/api/v1/ambulance/organizations/{org.id}/requests",
        headers=staff_headers,
    )
    assert r.status_code == 200
    facility_reqs = r.json()
    assert len(facility_reqs) >= 1
    assert any(x["id"] == req_id for x in facility_reqs)

    # ── Test 5: Accept Request & Assign Ambulance ──
    r = await client.patch(
        f"/api/v1/ambulance/organizations/{org.id}/requests/{req_id}/status",
        json={"status": "accepted", "assigned_ambulance_id": amb_id, "eta_minutes": 12.0},
        headers=staff_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "accepted"
    assert r.json()["assigned_ambulance_id"] == amb_id

    # ── Test 6: Dispatch Update (On The Way & Arrived) ──
    r = await client.patch(
        f"/api/v1/ambulance/organizations/{org.id}/requests/{req_id}/status",
        json={"status": "on_the_way", "eta_minutes": 6.0},
        headers=staff_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "on_the_way"

    # ── Test 7: Simulated Live Tracking View ──
    r = await client.get(
        f"/api/v1/ambulance/requests/{req_id}/tracking",
        headers=pat_headers,
    )
    assert r.status_code == 200
    tracking = r.json()
    assert tracking["status"] == "on_the_way"
    assert tracking["eta_minutes"] == 6.0
    assert "DEMO DATA ONLY" in tracking["disclaimer"]
    assert tracking["driver_name"] == "Ramesh Kumar"

    # ── Test 8: Patient View My Requests ──
    r = await client.get(
        "/api/v1/ambulance/requests/my",
        headers=pat_headers,
    )
    assert r.status_code == 200
    my_requests = r.json()
    assert len(my_requests) >= 1
    assert my_requests[0]["id"] == req_id

    # ── Test 9: Complete Request (Releases Ambulance) ──
    r = await client.patch(
        f"/api/v1/ambulance/organizations/{org.id}/requests/{req_id}/status",
        json={"status": "completed"},
        headers=staff_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "completed"

    # Check ambulance is available again
    r = await client.get(
        f"/api/v1/ambulance/organizations/{org.id}/ambulances?available_only=true",
        headers=staff_headers,
    )
    assert r.status_code == 200
    avail_list = r.json()
    assert any(x["id"] == amb_id for x in avail_list)
