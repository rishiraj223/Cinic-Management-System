import uuid
import pytest
from tests.conftest import create_test_token


@pytest.mark.asyncio
async def test_unauthenticated_requests_rejected(client):
    """Verify that unauthenticated requests to protected endpoints return 401 Unauthorized."""
    endpoints = [
        "/api/v1/me",
        "/api/v1/organizations",
        f"/api/v1/organizations/{uuid.uuid4()}",
    ]
    for endpoint in endpoints:
        resp = await client.get(endpoint)
        assert resp.status_code == 401, f"Expected 401 for {endpoint}, got {resp.status_code}"


@pytest.mark.asyncio
async def test_invalid_token_rejected(client):
    """Verify that forged or malformed tokens are rejected."""
    headers = {"Authorization": "Bearer invalid.malformed.token"}
    resp = await client.get("/api/v1/me", headers=headers)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated(client):
    """Verify that valid token returns user profile and memberships."""
    user_id = str(uuid.uuid4())
    token = create_test_token(user_id, "dr.smith@example.com", "Dr. Jane Smith")
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"]["id"] == user_id
    assert data["profile"]["email"] == "dr.smith@example.com"
    assert data["profile"]["full_name"] == "Dr. Jane Smith"
    assert data["memberships"] == []


@pytest.mark.asyncio
async def test_create_organization_and_owner_role(client):
    """Verify organization creation assigns the caller as organization_owner."""
    user_id = str(uuid.uuid4())
    token = create_test_token(user_id, "clinic_admin@example.com", "Admin John")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "Apex Community Clinic",
        "slug": "apex-community-clinic",
        "type": "clinic",
        "address": "45 Health Road",
        "phone": "+91 98765 43210",
        "email": "contact@apexclinic.com",
    }
    resp = await client.post("/api/v1/organizations", json=payload, headers=headers)
    assert resp.status_code == 201
    org = resp.json()
    assert org["name"] == "Apex Community Clinic"
    assert org["slug"] == "apex-community-clinic"
    assert org["type"] == "clinic"
    assert org["current_user_role"] == "organization_owner"
    assert org["settings"]["currency"] == "INR"

    # Verify organization appears in user's organization list
    list_resp = await client.get("/api/v1/organizations", headers=headers)
    assert list_resp.status_code == 200
    orgs = list_resp.json()
    assert len(orgs) == 1
    assert orgs[0]["id"] == org["id"]


@pytest.mark.asyncio
async def test_multi_tenant_isolation(client):
    """
    CRITICAL SECURITY TEST:
    Verify that User A cannot read or access User B's organization data.
    """
    # 1. Setup User A and Organization A
    user_a_id = str(uuid.uuid4())
    token_a = create_test_token(user_a_id, "user_a@clinic.com", "Dr. A")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    resp_a = await client.post(
        "/api/v1/organizations",
        json={"name": "Alpha Clinic", "type": "clinic"},
        headers=headers_a,
    )
    assert resp_a.status_code == 201
    org_a_id = resp_a.json()["id"]

    # 2. Setup User B and Organization B
    user_b_id = str(uuid.uuid4())
    token_b = create_test_token(user_b_id, "user_b@hospital.com", "Dr. B")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp_b = await client.post(
        "/api/v1/organizations",
        json={"name": "Beta Hospital", "type": "hospital"},
        headers=headers_b,
    )
    assert resp_b.status_code == 201
    org_b_id = resp_b.json()["id"]

    # 3. User A can access Org A, but CANNOT access Org B
    resp_a_on_a = await client.get(f"/api/v1/organizations/{org_a_id}", headers=headers_a)
    assert resp_a_on_a.status_code == 200
    assert resp_a_on_a.json()["name"] == "Alpha Clinic"

    resp_a_on_b = await client.get(f"/api/v1/organizations/{org_b_id}", headers=headers_a)
    assert resp_a_on_b.status_code == 403, "User A must NOT be able to access Org B!"

    # 4. User B can access Org B, but CANNOT access Org A
    resp_b_on_b = await client.get(f"/api/v1/organizations/{org_b_id}", headers=headers_b)
    assert resp_b_on_b.status_code == 200
    assert resp_b_on_b.json()["name"] == "Beta Hospital"

    resp_b_on_a = await client.get(f"/api/v1/organizations/{org_a_id}", headers=headers_b)
    assert resp_b_on_a.status_code == 403, "User B must NOT be able to access Org A!"

    # 5. Organizations listing must only return organizations each user belongs to
    list_a = await client.get("/api/v1/organizations", headers=headers_a)
    org_ids_for_a = [o["id"] for o in list_a.json()]
    assert org_a_id in org_ids_for_a
    assert org_b_id not in org_ids_for_a

    list_b = await client.get("/api/v1/organizations", headers=headers_b)
    org_ids_for_b = [o["id"] for o in list_b.json()]
    assert org_b_id in org_ids_for_b
    assert org_a_id not in org_ids_for_b
