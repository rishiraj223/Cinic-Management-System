import pytest
from datetime import date, timedelta
from httpx import AsyncClient
from tests.conftest import create_test_token


@pytest.mark.asyncio
async def test_clinic_full_workflow(client: AsyncClient):
    owner_id = "00000000-0000-0000-0000-000000000001"
    doc_id = "00000000-0000-0000-0000-000000000002"
    recep_id = "00000000-0000-0000-0000-000000000003"
    other_user_id = "00000000-0000-0000-0000-000000000099"

    owner_token = create_test_token(owner_id, "owner@clinic.com", "Clinic Owner")
    doc_token = create_test_token(doc_id, "dr.smith@clinic.com", "Dr. Smith")
    recep_token = create_test_token(recep_id, "receptionist@clinic.com", "Alice Receptionist")
    other_token = create_test_token(other_user_id, "intruder@other.com", "Intruder")

    # 1. Onboard clinic
    onboard_res = await client.post(
        "/api/v1/organizations/onboard",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "name": "HealthFirst Clinic",
            "type": "clinic",
            "phone": "+91 9876543210",
            "email": "contact@healthfirst.com",
            "city": "Mumbai",
            "state": "Maharashtra",
            "doctor_specialty": "General Medicine",
            "doctor_consultation_fee": 500.0,
        },
    )
    assert onboard_res.status_code == 201, onboard_res.text
    org_data = onboard_res.json()
    org_id = org_data["id"]

    # Add Dr. Smith as doctor member
    add_doc_res = await client.post(
        f"/api/v1/organizations/{org_id}/members",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"email": "dr.smith@clinic.com", "role": "doctor"},
    )
    assert add_doc_res.status_code == 201

    # Create Doctor Profile for Dr. Smith
    doc_prof_res = await client.post(
        f"/api/v1/organizations/{org_id}/doctors",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "user_id": doc_id,
            "specialty": "Cardiology",
            "license_number": "MED-12345",
            "consultation_fee": 700.0,
        },
    )
    assert doc_prof_res.status_code in [200, 201]
    doc_profile_id = doc_prof_res.json()["id"]

    # Add Receptionist
    add_rec_res = await client.post(
        f"/api/v1/organizations/{org_id}/members",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"email": "receptionist@clinic.com", "role": "receptionist"},
    )
    assert add_rec_res.status_code == 201

    # 2. Register Patient (Receptionist or Owner can do this)
    patient_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/patients",
        headers={"Authorization": f"Bearer {recep_token}"},
        json={
            "full_name": "Rohan Sharma",
            "phone": "+91 9123456789",
            "date_of_birth": "1990-05-15",
            "gender": "male",
            "blood_group": "B+",
            "allergies": "Penicillin",
        },
    )
    assert patient_res.status_code == 201
    patient_data = patient_res.json()
    patient_id = patient_data["id"]
    assert patient_data["patient_code"].startswith("PT-")

    # 3. Doctor Schedules setup
    sched_res = await client.put(
        f"/api/v1/organizations/{org_id}/clinic/doctors/{doc_profile_id}/schedules",
        headers={"Authorization": f"Bearer {doc_token}"},
        json=[
            {
                "day_of_week": 1,  # Tuesday
                "start_time": "09:00",
                "end_time": "17:00",
                "slot_duration_minutes": 30,
            }
        ],
    )
    assert sched_res.status_code == 200

    # 4. Book Appointment
    today_str = (date.today() + timedelta(days=1)).isoformat()
    appt_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/appointments",
        headers={"Authorization": f"Bearer {recep_token}"},
        json={
            "patient_id": patient_id,
            "doctor_profile_id": doc_profile_id,
            "appointment_date": today_str,
            "start_time": "10:00",
            "end_time": "10:30",
            "reason": "Chest pain follow up",
        },
    )
    assert appt_res.status_code == 201
    appt_id = appt_res.json()["id"]

    # 5. Attempt Conflicting Booking -> must be 409 Conflict
    conflict_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/appointments",
        headers={"Authorization": f"Bearer {recep_token}"},
        json={
            "patient_id": patient_id,
            "doctor_profile_id": doc_profile_id,
            "appointment_date": today_str,
            "start_time": "10:00",
            "end_time": "10:30",
            "reason": "Another checkup",
        },
    )
    assert conflict_res.status_code == 409

    # 6. Walk-in Queue workflow
    queue_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/queue",
        headers={"Authorization": f"Bearer {recep_token}"},
        json={
            "patient_id": patient_id,
            "doctor_profile_id": doc_profile_id,
            "walk_in_name": "Rohan Sharma Walkin",
        },
    )
    assert queue_res.status_code == 201
    entry_id = queue_res.json()["id"]

    # Advance queue: waiting -> called -> completed
    call_res = await client.patch(
        f"/api/v1/organizations/{org_id}/clinic/queue/{entry_id}/status",
        headers={"Authorization": f"Bearer {recep_token}"},
        json={"status": "called"},
    )
    assert call_res.status_code == 200
    assert call_res.json()["status"] == "called"

    # 7. Record Consultation and Clinical Notes (Doctor only)
    visit_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/visits",
        headers={"Authorization": f"Bearer {doc_token}"},
        json={
            "patient_id": patient_id,
            "appointment_id": appt_id,
            "doctor_profile_id": doc_profile_id,
            "chief_complaint": "Mild chest tightness upon exertion",
            "diagnosis": "Mild Hypertension Stage 1",
            "clinical_notes": "Advised lifestyle modifications and low sodium diet",
        },
    )
    assert visit_res.status_code == 201
    visit_id = visit_res.json()["id"]

    # 8. Create Prescription (Doctor only)
    rx_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/prescriptions",
        headers={"Authorization": f"Bearer {doc_token}"},
        json={
            "patient_id": patient_id,
            "visit_id": visit_id,
            "doctor_profile_id": doc_profile_id,
            "diagnosis_note": "Hypertension",
            "instructions": "Take medicines after meals",
            "items": [
                {
                    "medication_name": "Amlodipine 5mg",
                    "dosage": "1 tablet",
                    "frequency": "Once daily in morning",
                    "duration": "30 days",
                }
            ],
        },
    )
    assert rx_res.status_code == 201
    rx_id = rx_res.json()["id"]

    # Receptionist cannot finalize or create prescription
    rec_rx_fail = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/prescriptions/{rx_id}/finalize",
        headers={"Authorization": f"Bearer {recep_token}"},
    )
    assert rec_rx_fail.status_code == 403

    # Doctor finalizes prescription
    rx_fin_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/prescriptions/{rx_id}/finalize",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert rx_fin_res.status_code == 200
    assert rx_fin_res.json()["status"] == "finalized"

    # PDF generation download test
    rx_pdf_res = await client.get(
        f"/api/v1/organizations/{org_id}/clinic/prescriptions/{rx_id}/pdf",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert rx_pdf_res.status_code == 200
    assert rx_pdf_res.headers["content-type"] == "application/pdf"
    assert len(rx_pdf_res.content) > 100

    # 9. Invoice and Payment
    inv_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/invoices",
        headers={"Authorization": f"Bearer {recep_token}"},
        json={
            "patient_id": patient_id,
            "appointment_id": appt_id,
            "discount": 50.0,
            "items": [
                {"description": "Doctor Consultation Fee", "quantity": 1, "unit_price": 500.0},
                {"description": "ECG Basic Test", "quantity": 1, "unit_price": 250.0},
            ],
        },
    )
    assert inv_res.status_code == 201
    inv_data = inv_res.json()
    inv_id = inv_data["id"]
    # Total: 750 - 50 = 700
    assert float(inv_data["total"]) == 700.0
    assert float(inv_data["balance"]) == 700.0
    assert inv_data["status"] == "unpaid"

    # Record partial payment (300)
    pay_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/invoices/{inv_id}/payments",
        headers={"Authorization": f"Bearer {recep_token}"},
        json={
            "amount": 300.0,
            "method": "upi",
            "reference_number": "UPI-TXN-987654",
        },
    )
    assert pay_res.status_code == 201
    pay_data = pay_res.json()
    assert float(pay_data["amount"]) == 300.0

    # Check updated invoice status (partially_paid, balance 400)
    get_inv_res = await client.get(
        f"/api/v1/organizations/{org_id}/clinic/invoices/{inv_id}",
        headers={"Authorization": f"Bearer {recep_token}"},
    )
    assert get_inv_res.status_code == 200
    updated_inv = get_inv_res.json()
    assert updated_inv["status"] == "partially_paid"
    assert float(updated_inv["amount_paid"]) == 300.0
    assert float(updated_inv["balance"]) == 400.0

    # Invoice PDF download test
    inv_pdf_res = await client.get(
        f"/api/v1/organizations/{org_id}/clinic/invoices/{inv_id}/pdf",
        headers={"Authorization": f"Bearer {recep_token}"},
    )
    assert inv_pdf_res.status_code == 200
    assert inv_pdf_res.headers["content-type"] == "application/pdf"
    assert len(inv_pdf_res.content) > 100

    # 10. Schedule Follow-up
    fu_res = await client.post(
        f"/api/v1/organizations/{org_id}/clinic/followups",
        headers={"Authorization": f"Bearer {doc_token}"},
        json={
            "patient_id": patient_id,
            "doctor_profile_id": doc_profile_id,
            "visit_id": visit_id,
            "follow_up_date": (date.today() + timedelta(days=3)).isoformat(),
            "reason": "Blood pressure re-evaluation",
        },
    )
    assert fu_res.status_code == 201

    # 11. Dashboard summary verification
    dash_res = await client.get(
        f"/api/v1/organizations/{org_id}/clinic/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert dash_res.status_code == 200
    summary = dash_res.json()
    assert float(summary["outstanding_balance"]) >= 400.0
    assert summary["upcoming_followups"] >= 1

    # 12. Security: Cross-tenant isolation
    cross_res = await client.get(
        f"/api/v1/organizations/{org_id}/clinic/patients",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert cross_res.status_code == 403
