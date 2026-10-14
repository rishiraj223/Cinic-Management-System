-- Phase 4 Migration: Hospital & Diagnostic Centre (Lab) Schema
-- Run this migration in Supabase SQL Editor if operating directly on PostgreSQL

-- 1. Lab Tests (Test Catalogue)
CREATE TABLE IF NOT EXISTS lab_tests (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    specimen_type VARCHAR(100),
    prep_instructions TEXT,
    turnaround_minutes INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lab_test_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_lab_tests_org ON lab_tests(organization_id);

-- 2. Lab Orders
CREATE TABLE IF NOT EXISTS lab_orders (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    referring_doctor_id VARCHAR(36) REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_org ON lab_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);

-- 3. Lab Order Items
CREATE TABLE IF NOT EXISTS lab_order_items (
    id VARCHAR(36) PRIMARY KEY,
    lab_order_id VARCHAR(36) NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    lab_test_id VARCHAR(36) NOT NULL REFERENCES lab_tests(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ordered',
    price_at_order NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_order_items_order ON lab_order_items(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_test ON lab_order_items(lab_test_id);

-- 4. Lab Samples
CREATE TABLE IF NOT EXISTS lab_samples (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lab_order_id VARCHAR(36) NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    sample_ref VARCHAR(100) UNIQUE NOT NULL,
    sample_type VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending_collection',
    collected_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    collected_at TIMESTAMPTZ,
    received_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_samples_org ON lab_samples(organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_order ON lab_samples(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_status ON lab_samples(status);

-- 5. Lab Results
CREATE TABLE IF NOT EXISTS lab_results (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lab_order_item_id VARCHAR(36) UNIQUE NOT NULL REFERENCES lab_order_items(id) ON DELETE CASCADE,
    lab_sample_id VARCHAR(36) REFERENCES lab_samples(id) ON DELETE SET NULL,
    result_value TEXT,
    unit VARCHAR(50),
    reference_range_low VARCHAR(50),
    reference_range_high VARCHAR(50),
    result_flag VARCHAR(20),
    entered_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ,
    validated_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    validated_at TIMESTAMPTZ,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_org ON lab_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_status ON lab_results(status);

-- 6. Lab Result History
CREATE TABLE IF NOT EXISTS lab_result_history (
    id VARCHAR(36) PRIMARY KEY,
    lab_result_id VARCHAR(36) NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
    changed_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_res_history ON lab_result_history(lab_result_id);

-- 7. Diagnostic Reports
CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lab_order_id VARCHAR(36) NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    report_ref VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    validated_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    validated_at TIMESTAMPTZ,
    released_by VARCHAR(36) REFERENCES profiles(id) ON DELETE SET NULL,
    released_at TIMESTAMPTZ,
    pdf_path VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_org ON diagnostic_reports(organization_id);

-- 8. Report Delivery Events
CREATE TABLE IF NOT EXISTS report_delivery_events (
    id VARCHAR(36) PRIMARY KEY,
    diagnostic_report_id VARCHAR(36) NOT NULL REFERENCES diagnostic_reports(id) ON DELETE CASCADE,
    delivered_to VARCHAR(255),
    delivery_method VARCHAR(50),
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'attempted',
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_report ON report_delivery_events(diagnostic_report_id);
