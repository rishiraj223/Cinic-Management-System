-- ==============================================================================
-- Seed Data: Sample Healthcare Organizations, Doctors, Departments & Lab Menus
-- Run this after running migrations 001, 002, 003, and 004.
-- ==============================================================================

-- 1. Sample Organizations
INSERT INTO public.organizations (id, name, slug, type, address, city, state, postal_code, phone, email, is_active)
VALUES
    (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Apex Family Care Clinic',
        'apex-family-care',
        'clinic',
        '101 Wellness Boulevard, Suite A',
        'Mumbai',
        'Maharashtra',
        '400001',
        '+91 98200 12345',
        'contact@apexfamilycare.com',
        TRUE
    ),
    (
        'a1b2c3d4-0002-4000-8000-000000000002',
        'City Memorial Multispecialty Hospital',
        'city-memorial-hospital',
        'hospital',
        '400 Healthcare Expressway, Sector 4',
        'Navi Mumbai',
        'Maharashtra',
        '400703',
        '+91 22 2770 5000',
        'info@citymemorial.org',
        TRUE
    ),
    (
        'a1b2c3d4-0003-4000-8000-000000000003',
        'Precise PathLabs & Diagnostic Center',
        'precise-pathlabs',
        'diagnostic_center',
        '12 Diagnostic Square, Opp Central Station',
        'Mumbai',
        'Maharashtra',
        '400012',
        '+91 98200 98765',
        'reports@precisepath.com',
        TRUE
    )
ON CONFLICT (slug) DO UPDATE
SET city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code;

-- 2. Default Organization Settings
INSERT INTO public.organization_settings (organization_id, timezone, currency, operating_hours, notification_preferences)
VALUES
    (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Asia/Kolkata',
        'INR',
        '{
            "monday": {"open": "09:00", "close": "19:00", "closed": false},
            "tuesday": {"open": "09:00", "close": "19:00", "closed": false},
            "wednesday": {"open": "09:00", "close": "19:00", "closed": false},
            "thursday": {"open": "09:00", "close": "19:00", "closed": false},
            "friday": {"open": "09:00", "close": "19:00", "closed": false},
            "saturday": {"open": "09:00", "close": "15:00", "closed": false},
            "sunday": {"open": "00:00", "close": "00:00", "closed": true}
        }'::jsonb,
        '{"email_enabled": true, "sms_enabled": true, "appointment_reminders": true}'::jsonb
    ),
    (
        'a1b2c3d4-0002-4000-8000-000000000002',
        'Asia/Kolkata',
        'INR',
        '{
            "monday": {"open": "00:00", "close": "23:59", "closed": false},
            "tuesday": {"open": "00:00", "close": "23:59", "closed": false},
            "wednesday": {"open": "00:00", "close": "23:59", "closed": false},
            "thursday": {"open": "00:00", "close": "23:59", "closed": false},
            "friday": {"open": "00:00", "close": "23:59", "closed": false},
            "saturday": {"open": "00:00", "close": "23:59", "closed": false},
            "sunday": {"open": "00:00", "close": "23:59", "closed": false}
        }'::jsonb,
        '{"email_enabled": true, "sms_enabled": true, "appointment_reminders": true}'::jsonb
    ),
    (
        'a1b2c3d4-0003-4000-8000-000000000003',
        'Asia/Kolkata',
        'INR',
        '{
            "monday": {"open": "07:30", "close": "20:00", "closed": false},
            "tuesday": {"open": "07:30", "close": "20:00", "closed": false},
            "wednesday": {"open": "07:30", "close": "20:00", "closed": false},
            "thursday": {"open": "07:30", "close": "20:00", "closed": false},
            "friday": {"open": "07:30", "close": "20:00", "closed": false},
            "saturday": {"open": "07:30", "close": "18:00", "closed": false},
            "sunday": {"open": "08:00", "close": "13:00", "closed": false}
        }'::jsonb,
        '{"email_enabled": true, "sms_enabled": true, "appointment_reminders": true}'::jsonb
    )
ON CONFLICT (organization_id) DO NOTHING;

-- 3. Hospital Departments (City Memorial Multispecialty Hospital)
INSERT INTO public.departments (id, organization_id, name, description, is_active)
VALUES
    (
        'b2c3d4e5-0001-4000-8000-000000000001',
        'a1b2c3d4-0002-4000-8000-000000000002',
        'General Medicine',
        'Outpatient and inpatient primary clinical diagnostics and care',
        TRUE
    ),
    (
        'b2c3d4e5-0002-4000-8000-000000000002',
        'a1b2c3d4-0002-4000-8000-000000000002',
        'Cardiology',
        'Comprehensive cardiac care, ECG, 2D-Echo and coronary intervention',
        TRUE
    ),
    (
        'b2c3d4e5-0003-4000-8000-000000000003',
        'a1b2c3d4-0002-4000-8000-000000000002',
        'Pediatrics & Neonatology',
        'Specialized infant, child, and adolescent clinical care',
        TRUE
    ),
    (
        'b2c3d4e5-0004-4000-8000-000000000004',
        'a1b2c3d4-0002-4000-8000-000000000002',
        'Emergency & Trauma Care',
        '24/7 acute resuscitation and critical medical stabilization',
        TRUE
    )
ON CONFLICT (organization_id, name) DO NOTHING;

-- 4. Diagnostic Service Categories (Precise PathLabs)
INSERT INTO public.service_categories (id, organization_id, name, description, sample_type, is_active)
VALUES
    (
        'c3d4e5f6-0001-4000-8000-000000000001',
        'a1b2c3d4-0003-4000-8000-000000000003',
        'Hematology',
        'Complete blood counts (CBC), ESR, peripheral blood smears',
        'Whole Blood / Serum',
        TRUE
    ),
    (
        'c3d4e5f6-0002-4000-8000-000000000002',
        'a1b2c3d4-0003-4000-8000-000000000003',
        'Clinical Biochemistry',
        'Liver function tests, kidney function, lipid profiles, diabetes HbA1c',
        'Whole Blood / Serum',
        TRUE
    ),
    (
        'c3d4e5f6-0003-4000-8000-000000000003',
        'a1b2c3d4-0003-4000-8000-000000000003',
        'Microbiology & Serology',
        'Culture and antibiotic sensitivity testing, viral serology antibodies',
        'Blood / Urine / Swab',
        TRUE
    ),
    (
        'c3d4e5f6-0004-4000-8000-000000000004',
        'a1b2c3d4-0003-4000-8000-000000000003',
        'Radiology & Diagnostic Imaging',
        'High-resolution digital X-Rays, Ultrasound, and CT scans',
        'Diagnostic Imaging',
        TRUE
    )
ON CONFLICT (organization_id, name) DO NOTHING;
