-- Phase 6 Migration: Ambulance Fleet & Emergency Dispatch Schema
-- Run this migration in Supabase SQL Editor if operating directly on PostgreSQL

-- 1. Ambulance Vehicles Table
CREATE TABLE IF NOT EXISTS ambulances (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'Basic',
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    service_area VARCHAR(255),
    is_available BOOLEAN NOT NULL DEFAULT true,
    base_latitude FLOAT NOT NULL DEFAULT 19.0760,
    base_longitude FLOAT NOT NULL DEFAULT 72.8777,
    current_latitude FLOAT NOT NULL DEFAULT 19.0760,
    current_longitude FLOAT NOT NULL DEFAULT 72.8777,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambulances_org ON ambulances(organization_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_avail ON ambulances(is_available);

-- 2. Ambulance Emergency Requests Table
CREATE TABLE IF NOT EXISTS ambulance_requests (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE SET NULL,
    user_id VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_latitude FLOAT NOT NULL DEFAULT 19.0760,
    pickup_longitude FLOAT NOT NULL DEFAULT 72.8777,
    emergency_type VARCHAR(100),
    additional_notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    assigned_ambulance_id VARCHAR(36) REFERENCES ambulances(id) ON DELETE SET NULL,
    eta_minutes FLOAT DEFAULT 15.0,
    cancellation_reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ambulance_requests_org ON ambulance_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_user ON ambulance_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_status ON ambulance_requests(status);

-- 3. Row Level Security Policies
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulance_requests ENABLE ROW LEVEL SECURITY;

-- Patients can view and create their own emergency assistance requests
CREATE POLICY "Patients can view own ambulance requests"
ON ambulance_requests FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Anyone or authenticated patient can create emergency requests"
ON ambulance_requests FOR INSERT
WITH CHECK (true);

-- Hospital and ambulance operators can view and manage requests assigned to their organization
CREATE POLICY "Facility staff can view and manage assigned ambulance requests"
ON ambulance_requests FOR ALL
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()::text AND status = 'active'
    )
);

CREATE POLICY "Facility staff can manage fleet ambulances"
ON ambulances FOR ALL
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()::text AND status = 'active'
    )
);
