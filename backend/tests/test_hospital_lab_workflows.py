import pytest
from httpx import AsyncClient
from decimal import Decimal

from conftest import create_test_token
from app.models.organization import Organization, OrganizationMember
from app.models.clinic import Patient
from app.models.user import Profile


@pytest.mark.asyncio
async def test_lab_and_hospital_workflows(client: AsyncClient, db_session):
    # Setup test user and organization
    user_id = "test-phase4-user"
    token = create_test_token(user_id, "user@test.com", "Phase 4 User")
    headers = {"Authorization": f"Bearer {token}"}

    profile = Profile(id=user_id, email="user@test.com", full_name="Phase 4 User")
    db_session.add(profile)

    org = Organization(
        id="org-lab-hosp-1",
        name="Apex Multi-specialty & Diagnostics",
        slug="apex-multi-diag",
        type="diagnostic_center",
    )
    db_session.add(org)

    member = OrganizationMember(
        organization_id=org.id,
        user_id=user_id,
        role="organization_owner",
        status="active",
    )
    db_session.add(member)

    patient = Patient(
        id="pt-phase4-1",
        organization_id=org.id,
        created_by=user_id,
        patient_code="PT-9999",
        full_name="John Diagnostic Doe",
        phone="9876543210",
    )
    db_session.add(patient)
    await db_session.commit()

    # 1. Create a Lab Test
    test_data = {
        "name": "Complete Blood Count",
        "code": "CBC-001",
        "category": "Hematology",
        "description": "Routine hemogram test",
        "price": 350.00,
        "specimen_type": "Whole Blood",
        "turnaround_minutes": 120,
    }
    r = await client.post(f"/api/v1/organizations/{org.id}/lab/tests", json=test_data, headers=headers)
    assert r.status_code == 201, r.text
    test_json = r.json()
    test_id = test_json["id"]
    assert test_json["name"] == "Complete Blood Count"

    # 2. List Tests
    r = await client.get(f"/api/v1/organizations/{org.id}/lab/tests", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # 3. Create a Lab Order
    order_data = {
        "patient_id": patient.id,
        "notes": "Fasting blood collection",
        "items": [{"lab_test_id": test_id}],
    }
    r = await client.post(f"/api/v1/organizations/{org.id}/lab/orders", json=order_data, headers=headers)
    assert r.status_code == 201, r.text
    order_json = r.json()
    order_id = order_json["id"]
    order_item_id = order_json["items"][0]["id"]
    assert order_json["status"] == "pending"

    # 4. Collect Sample
    sample_data = {
        "lab_order_id": order_id,
        "sample_type": "EDTA Blood",
    }
    r = await client.post(f"/api/v1/organizations/{org.id}/lab/samples", json=sample_data, headers=headers)
    assert r.status_code == 201, r.text
    sample_json = r.json()
    sample_id = sample_json["id"]

    # 5. Update Sample Status
    r = await client.patch(
        f"/api/v1/organizations/{org.id}/lab/samples/{sample_id}/status",
        json={"status": "received"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "received"

    # 6. Enter Result
    result_data = {
        "lab_order_item_id": order_item_id,
        "lab_sample_id": sample_id,
        "result_value": "14.5",
        "unit": "g/dL",
        "reference_range_low": "13.0",
        "reference_range_high": "17.0",
        "result_flag": "normal",
        "notes": "Hemoglobin within normal reference range",
    }
    r = await client.post(f"/api/v1/organizations/{org.id}/lab/results", json=result_data, headers=headers)
    assert r.status_code == 201, r.text
    result_json = r.json()
    result_id = result_json["id"]

    # 7. Validate Result
    r = await client.post(
        f"/api/v1/organizations/{org.id}/lab/results/{result_id}/validate",
        json={"notes": "Checked and approved by pathologist"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "validated"

    # 8. Create Diagnostic Report
    r = await client.post(f"/api/v1/organizations/{org.id}/lab/orders/{order_id}/reports", headers=headers)
    assert r.status_code == 201, r.text
    report_json = r.json()
    report_id = report_json["id"]

    # 9. Deliver Diagnostic Report
    delivery_data = {
        "delivered_to": "patient@test.com",
        "delivery_method": "in_app",
        "notes": "Report published to patient portal",
    }
    r = await client.post(
        f"/api/v1/organizations/{org.id}/lab/reports/{report_id}/deliver",
        json=delivery_data,
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["delivery_status"] == "delivered"

    # 10. Lab Dashboard Summary
    r = await client.get(f"/api/v1/organizations/{org.id}/lab/dashboard", headers=headers)
    assert r.status_code == 200
    dash_json = r.json()
    assert dash_json["total_tests_in_catalogue"] >= 1
    assert dash_json["orders_today"] >= 1

    # 11. Hospital Dashboard
    r = await client.get(f"/api/v1/organizations/{org.id}/hospital/dashboard", headers=headers)
    assert r.status_code == 200
    hosp_dash = r.json()
    assert "departments_count" in hosp_dash
    assert "staff_count" in hosp_dash
