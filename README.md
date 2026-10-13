# HealthCore SaaS — Healthcare Management Platform

An integrated, multi-tenant healthcare software-as-a-service platform built for:
- **Local Clinics / Solo Practitioners**
- **Multispecialty Hospitals**
- **Diagnostic Laboratories & Pathology Centres**
- **Patients & Emergency Services**

---

## Tech Stack (Phase 1)

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons
- **Backend**: Python 3.13 + FastAPI + Pydantic v2 + SQLAlchemy (Async)
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth (Email/Password) with JWT validation in FastAPI
- **Testing**: Pytest + Pytest-Asyncio + In-Memory SQLite Engine

---

## Directory Structure

```
DT_project/
├── .gitignore                      # Git ignore for Python, Node, Vite & secrets
├── README.md                       # Project overview and quick start
├── docs/                           # Architecture, setup, and API specifications
│   ├── ARCHITECTURE.md             # System design, tenancy model, and RLS
│   ├── SETUP.md                    # Step-by-step setup and env guide
│   └── API.md                      # REST endpoints and Swagger specs
├── database/
│   ├── migrations/                 # PostgreSQL & Supabase migrations
│   │   ├── 001_initial_schema.sql  # profiles, organizations, members, settings
│   │   ├── 002_rls_policies.sql    # Row-Level Security policies & helpers
│   │   └── 003_auth_triggers.sql   # auth.users auto-sync trigger & timestamps
│   └── seed_data.sql               # Demo facilities and settings
├── backend/
│   ├── .env.example                # Backend environment template
│   ├── requirements.txt            # Python dependencies
│   ├── pytest.ini                  # Pytest configuration
│   ├── app/
│   │   ├── main.py                 # FastAPI application & CORS
│   │   ├── config.py               # Pydantic Settings
│   │   ├── database.py             # Async SQLAlchemy engine & sessionmaker
│   │   ├── dependencies.py         # Bearer token validation & RBAC guards
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic validation models
│   │   ├── routers/                # Health, Users, and Organizations routers
│   │   └── services/               # AuthService & OrganizationService
│   └── tests/                      # Automated unit and integration tests
└── frontend/
    ├── .env.example                # Frontend environment template
    ├── package.json                # Frontend dependencies
    ├── vite.config.ts              # Vite bundler configuration
    ├── tailwind.config.js          # Tailwind CSS styling configuration
    └── src/
        ├── App.tsx                 # Main application controller
        ├── config/supabase.ts      # Supabase client configuration
        ├── contexts/AuthContext.tsx# Authentication and session management
        ├── services/api.ts         # Authenticated REST API client
        ├── components/             # Navbar, Modals, Spinners, Alerts
        └── pages/                  # Login, Register, Dashboard, Profile
```

---

## Quickstart

### 1. Database
Run the scripts in `database/migrations/` in your Supabase SQL editor:
1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_auth_triggers.sql`

### 2. Backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # On Windows
pip install -r requirements.txt
cp .env.example .env          # Set Supabase credentials
pytest -v                     # Run test suite
uvicorn app.main:app --reload --port 8000
```
Swagger UI: `http://localhost:8000/docs`

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env          # Set Supabase URL & anon key
npm run dev
```
Web App: `http://localhost:5173`
