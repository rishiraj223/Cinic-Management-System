# Setup & Installation Guide

This guide walks you through setting up Supabase, the FastAPI backend, and the React frontend.

---

## Prerequisites

- **Node.js**: v18+ or v20+ (Node v24.16 installed)
- **Python**: 3.10+ (Python 3.13 installed)
- **Supabase Account**: A free project at [supabase.com](https://supabase.com) (or local Supabase CLI)

---

## 1. Database Setup (Supabase PostgreSQL)

1. Open your Supabase Dashboard and navigate to the **SQL Editor**.
2. Run the migration scripts in sequential order:
   - `database/migrations/001_initial_schema.sql` (Creates tables, constraints, indexes)
   - `database/migrations/002_rls_policies.sql` (Enables RLS and creates security policies)
   - `database/migrations/003_auth_triggers.sql` (Configures auto user profile sync trigger)
3. *(Optional)* Run `database/seed_data.sql` to populate sample clinics, hospitals, and diagnostic labs.

---

## 2. Backend Configuration & Startup

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase project credentials:
   ```ini
   ENVIRONMENT=development
   PORT=8000
   HOST=0.0.0.0
   CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

   SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
   SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
   SUPABASE_SERVICE_ROLE_KEY=[YOUR-SUPABASE-SERVICE-ROLE-KEY]
   SUPABASE_JWT_SECRET=[YOUR-SUPABASE-JWT-SECRET]

   # Optional direct connection (or default sqlite for local dev)
   DATABASE_URL=sqlite+aiosqlite:///./healthcare_dev.db
   ```

5. Run automated test suite:
   ```bash
   pytest -v
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Interactive Swagger docs are accessible at: `http://localhost:8000/docs`

---

## 3. Frontend Configuration & Startup

1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your public Supabase keys:
   ```ini
   VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
   VITE_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`

---

## 4. Environment Variables Reference

| Variable | Location | Client-Safe? | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `frontend/.env` | **Yes** | Public Supabase project API URL |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | **Yes** | Public anonymous client API key |
| `VITE_API_BASE_URL` | `frontend/.env` | **Yes** | FastAPI backend endpoint |
| `SUPABASE_URL` | `backend/.env` | Server-only | Supabase project API URL |
| `SUPABASE_ANON_KEY` | `backend/.env` | Server-only | Public fallback client key |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | **CRITICAL: Server-only** | Admin key with RLS bypass capability |
| `SUPABASE_JWT_SECRET` | `backend/.env` | **CRITICAL: Server-only** | HMAC secret for verifying JWT signatures |
| `DATABASE_URL` | `backend/.env` | **CRITICAL: Server-only** | Database connection URI |
