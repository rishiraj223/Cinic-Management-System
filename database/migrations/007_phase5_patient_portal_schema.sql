-- Phase 5 Migration: Patient Portal & Authentication Linking Schema
-- Run this migration in Supabase SQL Editor if operating directly on PostgreSQL

-- 1. Ensure user_id column exists on patients table to link authenticated patient accounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE patients ADD COLUMN user_id VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL;
        CREATE INDEX idx_patients_user_id ON patients(user_id);
    END IF;
END $$;

-- 2. Make organization_id nullable on patients to support standalone patient accounts
ALTER TABLE patients ALTER COLUMN organization_id DROP NOT NULL;

-- 3. Row Level Security policies for patients accessing their own appointments & profile
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Patients can view and update their own patient profile
CREATE POLICY "Patients can view own patient record" 
ON patients FOR SELECT 
USING (auth.uid()::text = user_id OR auth.uid()::text = created_by);

CREATE POLICY "Patients can update own patient record" 
ON patients FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Patients can view and create their own appointments
CREATE POLICY "Patients can view own appointments" 
ON appointments FOR SELECT 
USING (
    auth.uid()::text = created_by 
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()::text)
);

CREATE POLICY "Patients can create own appointments" 
ON appointments FOR INSERT 
WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Patients can cancel own appointments" 
ON appointments FOR UPDATE 
USING (
    auth.uid()::text = created_by 
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()::text)
);
