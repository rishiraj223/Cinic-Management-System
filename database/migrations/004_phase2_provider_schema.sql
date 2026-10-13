-- ==============================================================================
-- Migration 004: Phase 2 Healthcare Provider Portal Schema
-- Adds: city/state/postal_code to organizations, doctor_profiles,
-- departments, doctor_departments, service_categories with RLS policies.
-- ==============================================================================

-- 1. Extend organizations with address fields
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- 2. DOCTOR_PROFILES Table
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    specialty TEXT NOT NULL,
    license_number TEXT,
    qualifications TEXT,
    experience_years INTEGER NOT NULL DEFAULT 0,
    consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bio TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_doctor_org UNIQUE (user_id, organization_id)
);

COMMENT ON TABLE public.doctor_profiles IS 'Clinical doctor credentials and consultation settings per organization';

-- 3. DEPARTMENTS Table (for Hospitals and Multi-doctor facilities)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    head_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_dept_org_name UNIQUE (organization_id, name)
);

COMMENT ON TABLE public.departments IS 'Clinical and operational departments within hospitals and multi-doctor clinics';

-- 4. DOCTOR_DEPARTMENTS (Doctor-to-Department Many-to-Many Association)
CREATE TABLE IF NOT EXISTS public.doctor_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_doctor_dept UNIQUE (department_id, doctor_profile_id)
);

COMMENT ON TABLE public.doctor_departments IS 'Association between doctors and departments';

-- 5. SERVICE_CATEGORIES Table (for Diagnostic Centres and Laboratories)
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sample_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_service_cat_org_name UNIQUE (organization_id, name)
);

COMMENT ON TABLE public.service_categories IS 'Laboratory test categories for diagnostic centres (e.g. Hematology, Biochemistry, Radiology)';

-- ------------------------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_doc_profiles_org ON public.doctor_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_profiles_user ON public.doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_profiles_specialty ON public.doctor_profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_depts_dept ON public.doctor_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_doc_depts_doctor ON public.doctor_departments(doctor_profile_id);
CREATE INDEX IF NOT EXISTS idx_service_cat_org ON public.service_categories(organization_id);

-- ------------------------------------------------------------------------------
-- TRIGGERS for updated_at
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_doctor_profiles_updated_at ON public.doctor_profiles;
CREATE TRIGGER set_doctor_profiles_updated_at
BEFORE UPDATE ON public.doctor_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_departments_updated_at ON public.departments;
CREATE TRIGGER set_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_service_categories_updated_at ON public.service_categories;
CREATE TRIGGER set_service_categories_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- 1. Doctor Profiles Policies
CREATE POLICY "doc_profiles_select_policy"
ON public.doctor_profiles FOR SELECT
TO authenticated
USING (
    public.is_org_member(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "doc_profiles_insert_policy"
ON public.doctor_profiles FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_owner(organization_id)
    OR (user_id = auth.uid() AND public.is_org_member(organization_id))
    OR public.is_platform_admin()
);

CREATE POLICY "doc_profiles_update_policy"
ON public.doctor_profiles FOR UPDATE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR user_id = auth.uid()
    OR public.is_platform_admin()
);

CREATE POLICY "doc_profiles_delete_policy"
ON public.doctor_profiles FOR DELETE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);

-- 2. Departments Policies
CREATE POLICY "departments_select_policy"
ON public.departments FOR SELECT
TO authenticated
USING (
    public.is_org_member(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "departments_insert_policy"
ON public.departments FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "departments_update_policy"
ON public.departments FOR UPDATE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "departments_delete_policy"
ON public.departments FOR DELETE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);

-- 3. Doctor Departments Policies
CREATE POLICY "doc_departments_select_policy"
ON public.doctor_departments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = doctor_departments.department_id
          AND (public.is_org_member(d.organization_id) OR public.is_platform_admin())
    )
);

CREATE POLICY "doc_departments_insert_policy"
ON public.doctor_departments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = doctor_departments.department_id
          AND (public.is_org_owner(d.organization_id) OR public.is_platform_admin())
    )
);

CREATE POLICY "doc_departments_delete_policy"
ON public.doctor_departments FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = doctor_departments.department_id
          AND (public.is_org_owner(d.organization_id) OR public.is_platform_admin())
    )
);

-- 4. Service Categories Policies
CREATE POLICY "service_cat_select_policy"
ON public.service_categories FOR SELECT
TO authenticated
USING (
    public.is_org_member(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "service_cat_insert_policy"
ON public.service_categories FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = service_categories.organization_id
          AND user_id = auth.uid()
          AND role = 'lab_staff'
          AND status = 'active'
    )
);

CREATE POLICY "service_cat_update_policy"
ON public.service_categories FOR UPDATE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "service_cat_delete_policy"
ON public.service_categories FOR DELETE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);
