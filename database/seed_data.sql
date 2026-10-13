-- ==============================================================================
-- Seed Data: Sample Healthcare Organizations & Settings for Local Testing
-- Run this after running migrations 001, 002, and 003.
-- Note: Replace USER_UUID with your actual auth.users ID to bind memberships.
-- ==============================================================================

-- 1. Sample Organizations
INSERT INTO public.organizations (id, name, slug, type, address, phone, email, is_active)
VALUES
    (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Apex Family Care Clinic',
        'apex-family-care',
        'clinic',
        '101 Wellness Boulevard, Suite A, Mumbai',
        '+91 98200 12345',
        'contact@apexfamilycare.com',
        TRUE
    ),
    (
        'a1b2c3d4-0002-4000-8000-000000000002',
        'City Memorial Multispecialty Hospital',
        'city-memorial-hospital',
        'hospital',
        '400 Healthcare Expressway, Sector 4, Navi Mumbai',
        '+91 22 2770 5000',
        'info@citymemorial.org',
        TRUE
    ),
    (
        'a1b2c3d4-0003-4000-8000-000000000003',
        'Precise PathLabs & Diagnostic Center',
        'precise-pathlabs',
        'diagnostic_center',
        '12 Diagnostic Square, Opp Central Station, Mumbai',
        '+91 98200 98765',
        'reports@precisepath.com',
        TRUE
    )
ON CONFLICT (slug) DO NOTHING;

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
