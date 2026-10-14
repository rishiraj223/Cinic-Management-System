import pytest
from httpx import AsyncClient
from datetime import date, timedelta
from conftest import create_test_token
from app.models.organization import Organization, OrganizationMember
from app.models.provider import DoctorProfile
from app.models.clinic import DoctorSchedule
from app.models.user import Profile


@pytest.mark.asyncio
async def test_patient_portal_full_workflow(client: AsyncClient, db_session):
    # 1. Setup Doctor, Organization & Schedule
    doc_user_id = "doc-portal-test"
    doc_token = create_test_token(doc_user_id, "doc@test.com", "Dr. Sarah Adams")
    db_session.add(Profile(id=doc_user_id, email="doc@test.com", full_name="Dr. Sarah Adams"))

    org = Organization(
        id="org-portal-1",
        name="Apollo Health Centre",
        slug="apollo-health-centre",
        type="clinic",
        city="Mumbai",
        address="123 Marine Drive",
    )
    db_session.add(org)

    db_session.add(
        OrganizationMember(
            organization_id=org.id,
            user_id=doc_user_id,
            role="doctor",
            status="active",
        )
    )

    doc_profile = DoctorProfile(
        id="doc-prof-portal-1",
        user_id=doc_user_id,
        organization_id=org.id,
        specialty="Cardiology",
        consultation_fee=600.00,
        is_available=True,
    )
    db_session.add(doc_profile)

    # Doctor Schedule for every day of the week (0 to 6)
    for day in range(7):
        db_session.add(
            DoctorSchedule(
                id=f"sched-day-{day}",
                doctor_profile_id=doc_profile.id,
                organization_id=org.id,
                day_of_week=day,
                start_time="09:00",
                end_time="12:00",
                slot_duration_minutes=30,
                is_active=True,
            )
        )

    # 2. Setup Patient User
    pat_user_id = "patient-portal-user"
    pat_token = create_test_token(pat_user_id, "patient@test.com", "Alex Patient")
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    db_session.add(Profile(id=pat_user_id, email="patient@test.com", full_name="Alex Patient"))

    await db_session.commit()

    # ── Test 1: Get & Update Patient Profile ──
    r = await client.get("/api/v1/patient/profile", headers=pat_headers)
    assert r.status_code == 200, r.text
    profile_data = r.json()
    assert profile_data["email"] == "patient@test.com"

    r = await client.put(
        "/api/v1/patient/profile",
        json={"phone": "9988776655", "blood_group": "O+", "allergies": "Penicillin"},
        headers=pat_headers,
    )
    assert r.status_code == 200
    assert r.json()["phone"] == "9988776655"
    assert r.json()["blood_group"] == "O+"

    # ── Test 2: Search Providers ──
    r = await client.get("/api/v1/patient/providers?q=Apollo", headers=pat_headers)
    assert r.status_code == 200
    providers = r.json()
    assert len(providers) >= 1
    assert providers[0]["name"] == "Apollo Health Centre"

    # Search by specialty
    r = await client.get("/api/v1/patient/providers?specialty=Cardiology", headers=pat_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # ── Test 3: Provider Details ──
    r = await client.get(f"/api/v1/patient/providers/{org.id}", headers=pat_headers)
    assert r.status_code == 200
    details = r.json()
    assert len(details["doctors"]) >= 1
    assert details["doctors"][0]["specialty"] == "Cardiology"

    # ── Test 4: Check Available Slots ──
    target_date = (date.today() + timedelta(days=2)).isoformat()
    r = await client.get(
        f"/api/v1/patient/doctors/{doc_profile.id}/slots?date={target_date}",
        headers=pat_headers,
    )
    assert r.status_code == 200
    slots = r.json()
    assert len(slots) > 0
    assert slots[0]["is_available"] is True
    slot = slots[0]

    # ── Test 5: Book Appointment ──
    booking_payload = {
        "organization_id": org.id,
        "doctor_profile_id": doc_profile.id,
        "appointment_date": target_date,
        "start_time": slot["start_time"],
        "end_time": slot["end_time"],
        "appointment_type": "consultation",
        "reason": "Chest checkup",
    }
    r = await client.post("/api/v1/patient/appointments", json=booking_payload, headers=pat_headers)
    assert r.status_code == 201, r.text
    booked_appt = r.json()
    appt_id = booked_appt["id"]
    assert booked_appt["status"] == "scheduled"
    assert booked_appt["doctor_name"] == "Dr. Sarah Adams"

    # ── Test 6: Conflict Prevention (Duplicate Booking on Same Slot) ──
    r_dup = await client.post("/api/v1/patient/appointments", json=booking_payload, headers=pat_headers)
    assert r_dup.status_code == 409
    assert "no longer available" in r_dup.text or "already have an appointment" in r_dup.text

    # Verify slot is marked unavailable
    r = await client.get(
        f"/api/v1/patient/doctors/{doc_profile.id}/slots?date={target_date}",
        headers=pat_headers,
    )
    matching = [s for s in r.json() if s["start_time"] == slot["start_time"]]
    assert len(matching) == 1
    assert matching[0]["is_available"] is False

    # ── Test 7: List My Appointments & Dashboard ──
    r = await client.get("/api/v1/patient/appointments", headers=pat_headers)
    assert r.status_code == 200
    my_appts = r.json()
    assert len(my_appts) >= 1
    assert my_appts[0]["id"] == appt_id

    r = await client.get("/api/v1/patient/dashboard", headers=pat_headers)
    assert r.status_code == 200
    dash = r.json()
    assert dash["upcoming_appointments_count"] >= 1
    assert dash["next_appointment"]["id"] == appt_id

    # ── Test 8: Cancel Appointment ──
    r = await client.post(
        f"/api/v1/patient/appointments/{appt_id}/cancel",
        json={"reason": "Schedule conflict"},
        headers=pat_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"

    # Slot should now become available again
    r = await client.get(
        f"/api/v1/patient/doctors/{doc_profile.id}/slots?date={target_date}",
        headers=pat_headers,
    )
    matching = [s for s in r.json() if s["start_time"] == slot["start_time"]]
    assert matching[0]["is_available"] is True
