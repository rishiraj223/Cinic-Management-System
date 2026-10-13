# System Architecture & Technical Specifications

## 1. High-Level Overview

HealthCore is a multi-tenant healthcare software-as-a-service (SaaS) platform tailored for local single-doctor clinics, multispecialty hospitals, and diagnostic/pathology centres.

The application follows a decoupled modern architecture:

```
┌────────────────────────────────────────────────────────┐
│             Client Layer (Browser / SPA)               │
│  React 19 + TypeScript + Vite + Tailwind CSS           │
└────────────────────────────────────────────────────────┘
          │                                  │
          │ Supabase Client                  │ REST API (Bearer JWT)
          │ (Auth / Session)                 │
          ▼                                  ▼
┌──────────────────────────┐      ┌─────────────────────────────┐
│  Supabase Auth Service   │      │    FastAPI Application      │
│  - Email / Password      │      │  - PyJWT Token Verification │
│  - Session Management    │◄─────┤  - Multi-Tenant RBAC Guard  │
│  - Token Minting         │      │  - REST Endpoints           │
└──────────────────────────┘      └──────────────┬──────────────┘
                                                 │
                                                 │ Async SQLAlchemy
                                                 ▼
┌────────────────────────────────────────────────────────┐
│             Database Layer (PostgreSQL)                │
│  - Row-Level Security (RLS) Policies                   │
│  - Multi-Tenant Schema (Organizations & Memberships)   │
│  - Automated Triggers & Timestamp Handlers             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenant Organization & Security Model

### Tenant Classification
Every medical facility is modeled as an `Organization` with one of three primary classifications:
- `clinic`: Local single-doctor clinic or solo practice.
- `hospital`: Multi-doctor poly-clinic or hospital center.
- `diagnostic_center`: Standalone pathology laboratory or diagnostic center.

### Scoped Role-Based Access Control (RBAC)
User permissions are strictly scoped per organization in `organization_members`:
- `platform_admin`: Global platform operator.
- `organization_owner`: Executive owner of the facility; can manage settings, staff, and billing.
- `doctor`: Clinical practitioner; accesses patient records, queues, and prescriptions.
- `receptionist`: Front-desk operator; manages walk-in queue, appointments, and check-in.
- `lab_staff`: Pathologist/technician; manages specimen tracking, test catalog, and test results.

> **Crucial Tenancy Invariant**:
> Being an `organization_owner` or `doctor` in Clinic A **never** grants access to Hospital B. Every database query filters by `organization_id` and cross-tenant access returns HTTP 403 Forbidden.

---

## 3. Database Schema

### `public.profiles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) | Auth identity reference |
| `email` | TEXT | NOT NULL | User email |
| `full_name` | TEXT | NULLABLE | Practitioner / user name |
| `phone` | TEXT | NULLABLE | Phone contact |
| `avatar_url` | TEXT | NULLABLE | Profile picture URL |
| `is_platform_admin` | BOOLEAN | DEFAULT FALSE | Global super-admin flag |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

### `public.organizations`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Facility ID |
| `name` | TEXT | NOT NULL | Display name |
| `slug` | TEXT | UNIQUE, NOT NULL | URL-safe identifier |
| `type` | TEXT | CHECK IN ('clinic', 'hospital', 'diagnostic_center') | Facility category |
| `address` | TEXT | NULLABLE | Physical location |
| `phone` | TEXT | NULLABLE | Phone contact |
| `email` | TEXT | NULLABLE | Official email |
| `is_active` | BOOLEAN | DEFAULT TRUE | Operational flag |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

### `public.organization_members`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Membership ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE | Associated organization |
| `user_id` | UUID | REFERENCES profiles(id) ON DELETE CASCADE | Member user |
| `role` | TEXT | CHECK IN ('organization_owner', 'doctor', 'receptionist', 'lab_staff') | Scoped role |
| `status` | TEXT | DEFAULT 'active' CHECK IN ('active', 'invited', 'suspended') | Membership status |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

*Unique Constraint: `(organization_id, user_id)`.*

### `public.organization_settings`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Setting ID |
| `organization_id` | UUID | UNIQUE, REFERENCES organizations(id) ON DELETE CASCADE | Target facility |
| `timezone` | TEXT | DEFAULT 'UTC' | Operating timezone |
| `currency` | TEXT | DEFAULT 'INR' | Invoicing currency |
| `operating_hours` | JSONB | NOT NULL | Weekly schedule configuration |
| `notification_preferences` | JSONB | NOT NULL | Email/SMS alerts configuration |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

---

## 4. Row-Level Security (RLS) Implementation

Row-Level Security is active on all four tables. Three security definer functions provide fast, non-recursive permission evaluations:
1. `public.is_platform_admin()`: Verifies if the caller has global platform privileges.
2. `public.is_org_member(target_org_id UUID)`: Verifies if `auth.uid()` has an active membership in the organization.
3. `public.is_org_owner(target_org_id UUID)`: Verifies if `auth.uid()` is an active owner of the organization.

Access rules:
- **Profiles**: Users read/update their own profile. Colleagues within the same active organization can view each other's basic profile.
- **Organizations**: Users can only query organizations they actively belong to. Any authenticated user can register a new organization.
- **Organization Members**: Organization owners can manage members; members can view staff in their own facility.
- **Organization Settings**: Only organization owners can edit configurations; members can view.
