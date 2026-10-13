import uuid
import pytest
from tests.conftest import create_test_token


@pytest.mark.asyncio
async def test_clinic_onboarding_with_doctor_profile(client):
    """Test clinic onboarding creates organization and doctor profile."""
    user_id = str(uuid.uuid4())
    token = create_test_token(user_id, "dr.kumar@clinic.com", "Dr. Rajesh Kumar")
    headers = {"Authorization": f"Bearer {token}"}

    onboarding_payload = {
        "name": "Kumar Family Clinic",
        "type": "clinic",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "phone": "+91 98200 11111",
        "email": "contact@kumarclinic.com",
        "doctor_specialty": "General Medicine",
        "doctor_license": "MCI-48291",
        "doctor_qualifications": "MBBS, MD (General Medicine)",
        "doctor_consultation_fee": 600.0,
    }

    resp = await client.post("/api/v1/organizations/onboard", json=onboarding_payload, headers=headers)
    assert resp.status_code == 201
    org = resp.json()
    org_id = org["id"]
    assert org["name"] == "Kumar Family Clinic"
    assert org["type"] == "clinic"
    assert org["city"] == "Mumbai"

    # Verify doctor profile was created
    doc_resp = await client.get(f"/api/v1/organizations/{org_id}/doctors", headers=headers)
    assert doc_resp.status_code == 200
    doctors = doc_resp.json()
    assert len(doctors) == 1
    assert doctors[0]["specialty"] == "General Medicine"
    assert doctors[0]["license_number"] == "MCI-48291"
    assert doctors[0]["consultation_fee"] == 600.0


@pytest.mark.asyncio
async def test_hospital_onboarding_and_department_management(client):
    """Test hospital onboarding with departments, and doctor-department association."""
    user_id = str(uuid.uuid4())
    token = create_test_token(user_id, "admin@metrohealth.org", "Director Mehta")
    headers = {"Authorization": f"Bearer {token}"}

    onboarding_payload = {
        "name": "Metro Super Specialty Hospital",
        "type": "hospital",
        "city": "Navi Mumbai",
        "initial_departments": ["Cardiology", "Neurology", "Pediatrics"],
    }

    resp = await client.post("/api/v1/organizations/onboard", json=onboarding_payload, headers=headers)
    assert resp.status_code == 201
    org_id = resp.json()["id"]

    # Verify departments created
    depts_resp = await client.get(f"/api/v1/organizations/{org_id}/departments", headers=headers)
    assert depts_resp.status_code == 200
    departments = depts_resp.json()
    assert len(departments) == 3
    dept_names = [d["name"] for d in departments]
    assert "Cardiology" in dept_names
    assert "Neurology" in dept_names

    # Add a doctor member to the hospital
    doctor_user_id = str(uuid.uuid4())
    doctor_token = create_test_token(doctor_user_id, "dr.sen@metrohealth.org", "Dr. Sen")
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}

    add_mem_resp = await client.post(
        f"/api/v1/organizations/{org_id}/members",
        json={"email": "dr.sen@metrohealth.org", "role": "doctor", "status": "active"},
        headers=headers,
    )
    assert add_mem_resp.status_code == 201

    # Create doctor profile for Dr. Sen
    create_doc_resp = await client.post(
        f"/api/v1/organizations/{org_id}/doctors",
        json={
            "user_id": doctor_user_id,
            "specialty": "Interventional Cardiology",
            "qualifications": "MD, DM (Cardiology)",
            "consultation_fee": 1200.0,
        },
        headers=headers,
    )
    assert create_doc_resp.status_code == 200
    doc_profile_id = create_doc_resp.json()["id"]

    # Associate Dr. Sen with Cardiology department
    cardio_dept_id = next(d["id"] for d in departments if d["name"] == "Cardiology")
    assign_resp = await client.post(
        f"/api/v1/organizations/{org_id}/departments/{cardio_dept_id}/doctors",
        json={"doctor_profile_id": doc_profile_id, "is_primary": True},
        headers=headers,
    )
    assert assign_resp.status_code == 200

    # Verify doctor profile lists Cardiology
    doc_list_resp = await client.get(f"/api/v1/organizations/{org_id}/doctors", headers=headers)
    doctors = doc_list_resp.json()
    sen = next(d for d in doctors if d["id"] == doc_profile_id)
    assert "Cardiology" in sen["department_names"]


@pytest.mark.asyncio
async def test_diagnostic_centre_and_service_categories(client):
    """Test diagnostic center onboarding with service categories."""
    owner_id = str(uuid.uuid4())
    token = create_test_token(owner_id, "lab_owner@precisionlabs.com", "Lab Director")
    headers = {"Authorization": f"Bearer {token}"}

    onboarding_payload = {
        "name": "Precision Pathology & Diagnostics",
        "type": "diagnostic_center",
        "initial_service_categories": ["Hematology", "Clinical Biochemistry", "Microbiology"],
    }

    resp = await client.post("/api/v1/organizations/onboard", json=onboarding_payload, headers=headers)
    assert resp.status_code == 201
    org_id = resp.json()["id"]

    # Verify categories
    cats_resp = await client.get(f"/api/v1/organizations/{org_id}/service-categories", headers=headers)
    assert cats_resp.status_code == 200
    cats = cats_resp.json()
    assert len(cats) == 3
    cat_names = [c["name"] for c in cats]
    assert "Hematology" in cat_names

    # Add a lab staff member
    lab_staff_id = str(uuid.uuid4())
    lab_token = create_test_token(lab_staff_id, "tech@precisionlabs.com", "Lab Tech Rohit")
    lab_headers = {"Authorization": f"Bearer {lab_token}"}

    await client.post(
        f"/api/v1/organizations/{org_id}/members",
        json={"email": "tech@precisionlabs.com", "role": "lab_staff", "status": "active"},
        headers=headers,
    )

    # Lab staff can add service categories
    create_cat_resp = await client.post(
        f"/api/v1/organizations/{org_id}/service-categories",
        json={"name": "Molecular Diagnostics", "sample_type": "DNA / PCR Swab"},
        headers=lab_headers,
    )
    assert create_cat_resp.status_code == 201
    assert create_cat_resp.json()["name"] == "Molecular Diagnostics"


@pytest.mark.asyncio
async def test_rbac_and_cross_organization_security(client):
    """
    CRITICAL SECURITY TEST:
    1. A receptionist cannot add departments (403 Forbidden).
    2. User from Clinic A cannot view or access Hospital B's staff or departments (403 Forbidden).
    """
    # 1. Setup Hospital B owned by Owner B
    owner_b_id = str(uuid.uuid4())
    token_b = create_test_token(owner_b_id, "owner_b@hospital.com", "Owner B")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp_b = await client.post(
        "/api/v1/organizations/onboard",
        json={"name": "Hospital B", "type": "hospital", "initial_departments": ["General Surgery"]},
        headers=headers_b,
    )
    assert resp_b.status_code == 201
    org_b_id = resp_b.json()["id"]

    # 2. Add a receptionist to Hospital B
    receptionist_id = str(uuid.uuid4())
    receptionist_token = create_test_token(receptionist_id, "recep@hospital.com", "Recep Rita")
    headers_recep = {"Authorization": f"Bearer {receptionist_token}"}

    await client.post(
        f"/api/v1/organizations/{org_b_id}/members",
        json={"email": "recep@hospital.com", "role": "receptionist", "status": "active"},
        headers=headers_b,
    )

    # Receptionist attempts to create department -> MUST BE REJECTED with 403 Forbidden
    non_owner_attempt = await client.post(
        f"/api/v1/organizations/{org_b_id}/departments",
        json={"name": "Unauthorized Dept"},
        headers=headers_recep,
    )
    assert non_owner_attempt.status_code == 403, "Receptionist must not be able to create departments"

    # 3. User A from Clinic A tries to access Hospital B's departments -> MUST BE REJECTED with 403 Forbidden
    user_a_id = str(uuid.uuid4())
    token_a = create_test_token(user_a_id, "doctor_a@clinica.com", "Dr. A")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    cross_tenant_attempt = await client.get(
        f"/api/v1/organizations/{org_b_id}/departments",
        headers=headers_a,
    )
    assert cross_tenant_attempt.status_code == 403, "Cross-tenant access must be rejected"
