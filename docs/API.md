# Backend REST API Reference

The backend exposes RESTful endpoints with automatic interactive documentation generated via OpenAPI / Swagger UI.

- **Swagger UI Interactive Explorer**: `http://localhost:8000/docs`
- **ReDoc Interactive Documentation**: `http://localhost:8000/redoc`
- **OpenAPI Schema (JSON)**: `http://localhost:8000/openapi.json`

---

## Authentication Mechanism

All protected endpoints require a Supabase-issued JWT Bearer token passed in the `Authorization` header:

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

Tokens are verified server-side on every request. Missing, invalid, or expired tokens receive:
```json
{
  "detail": "Authentication credentials were not provided"
}
```
HTTP Status: `401 Unauthorized`

---

## Endpoints

### 1. Health Check
`GET /health`
- **Authentication**: None (Public)
- **Description**: Returns server status, database connection state, and version.
- **Response (200 OK)**:
```json
{
  "status": "healthy",
  "service": "Healthcare Management SaaS API",
  "version": "1.0.0",
  "environment": "development",
  "supabase_configured": true,
  "database": "healthy",
  "timestamp": "2026-10-13T16:50:00.000000Z"
}
```

---

### 2. User Profile & Memberships
`GET /api/v1/me`
- **Authentication**: Required (`Bearer <token>`)
- **Description**: Returns authenticated user profile and list of organizations the user actively belongs to.
- **Response (200 OK)**:
```json
{
  "profile": {
    "id": "7b098199-a3fa-4a25-9c99-19ec0fa8d6be",
    "email": "dr.sharma@hospital.com",
    "full_name": "Dr. Rajesh Sharma",
    "phone": "+91 98200 12345",
    "avatar_url": null,
    "is_platform_admin": false,
    "created_at": "2026-10-13T16:50:00Z",
    "updated_at": "2026-10-13T16:50:00Z"
  },
  "memberships": [
    {
      "organization_id": "a1b2c3d4-0001-4000-8000-000000000001",
      "organization_name": "Apex Family Care Clinic",
      "organization_slug": "apex-family-care",
      "organization_type": "clinic",
      "role": "organization_owner",
      "status": "active"
    }
  ]
}
```

---

### 3. Update Profile
`PATCH /api/v1/me`
- **Authentication**: Required (`Bearer <token>`)
- **Body**:
```json
{
  "full_name": "Dr. Rajesh Sharma, MD",
  "phone": "+91 98200 99999"
}
```
- **Response (200 OK)**: Updated Profile object.

---

### 4. List User's Organizations
`GET /api/v1/organizations`
- **Authentication**: Required (`Bearer <token>`)
- **Description**: Returns **only** the organizations where the authenticated user is an active member. Enforces multi-tenant data isolation.
- **Response (200 OK)**: Array of `OrganizationWithRoleRead` objects.

---

### 5. Create Organization
`POST /api/v1/organizations`
- **Authentication**: Required (`Bearer <token>`)
- **Description**: Registers a new healthcare organization (`clinic`, `hospital`, or `diagnostic_center`), automatically assigns the creator as `organization_owner`, and provisions default settings.
- **Body**:
```json
{
  "name": "Metro Diagnostic Pathology Lab",
  "slug": "metro-diagnostic-lab",
  "type": "diagnostic_center",
  "address": "402 Medical Complex, Mumbai",
  "phone": "+91 22 2500 1234",
  "email": "info@metrolab.com"
}
```
- **Response (201 Created)**:
```json
{
  "id": "e4f8a371-1188-4db9-8b83-a7c862bc3861",
  "name": "Metro Diagnostic Pathology Lab",
  "slug": "metro-diagnostic-lab",
  "type": "diagnostic_center",
  "address": "402 Medical Complex, Mumbai",
  "phone": "+91 22 2500 1234",
  "email": "info@metrolab.com",
  "is_active": true,
  "created_at": "2026-10-13T16:50:00Z",
  "updated_at": "2026-10-13T16:50:00Z",
  "settings": {
    "id": "893d56f1-285f-46ff-b63f-27a126ba6ec8",
    "organization_id": "e4f8a371-1188-4db9-8b83-a7c862bc3861",
    "timezone": "UTC",
    "currency": "INR",
    "operating_hours": {},
    "notification_preferences": {}
  },
  "current_user_role": "organization_owner",
  "membership_status": "active"
}
```

---

### 6. Get Organization by ID
`GET /api/v1/organizations/{organization_id}`
- **Authentication**: Required (`Bearer <token>`)
- **Description**: Returns organization details **only** if the caller is an active member or global platform admin.
- **Security Check**:
  - If organization does not exist: returns `404 Not Found`.
  - If user is not an active member: returns `403 Forbidden` (`"Access denied: You are not an authorized member of this organization"`).
- **Response (200 OK)**: `OrganizationWithRoleRead` object.
