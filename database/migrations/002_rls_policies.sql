-- ==============================================================================
-- Migration 002: Row Level Security (RLS) Policies
-- Enforces multi-tenant data isolation and role-based permissions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Helper Security Functions (SECURITY DEFINER to avoid recursive policy loops)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_platform_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_owner(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
          AND role = 'organization_owner'
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- Enable Row Level Security (RLS) on all tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- Users can view their own profile, colleagues in shared orgs, or platform admin
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.organization_members m1
        JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
        WHERE m1.user_id = auth.uid()
          AND m2.user_id = public.profiles.id
          AND m1.status = 'active'
          AND m2.status = 'active'
    )
);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    id = auth.uid()
);

-- Users can update their own profile (cannot change is_platform_admin unless already admin)
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid() OR public.is_platform_admin()
)
WITH CHECK (
    (id = auth.uid() AND is_platform_admin = (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()))
    OR public.is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 2. ORGANIZATIONS POLICIES
-- ------------------------------------------------------------------------------

-- Members can only select organizations they actively belong to, or platform admin
CREATE POLICY "organizations_select_policy"
ON public.organizations
FOR SELECT
TO authenticated
USING (
    public.is_org_member(id)
    OR public.is_platform_admin()
);

-- Any authenticated user can create an organization
CREATE POLICY "organizations_insert_policy"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
    auth.role() = 'authenticated'
);

-- Only organization owners or platform admins can update organization details
CREATE POLICY "organizations_update_policy"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
    public.is_org_owner(id)
    OR public.is_platform_admin()
)
WITH CHECK (
    public.is_org_owner(id)
    OR public.is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 3. ORGANIZATION_MEMBERS POLICIES
-- ------------------------------------------------------------------------------

-- Users can view memberships if they belong to the organization or are the member
CREATE POLICY "org_members_select_policy"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_org_member(organization_id)
    OR public.is_platform_admin()
);

-- Organization owners can add members, OR a creator can add themselves as owner
CREATE POLICY "org_members_insert_policy"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_owner(organization_id)
    OR (user_id = auth.uid() AND role = 'organization_owner')
    OR public.is_platform_admin()
);

-- Only organization owners or platform admin can update member roles/status
CREATE POLICY "org_members_update_policy"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
)
WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);

-- Only organization owners can remove members (except self-removal handled separately)
CREATE POLICY "org_members_delete_policy"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR user_id = auth.uid()
    OR public.is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 4. ORGANIZATION_SETTINGS POLICIES
-- ------------------------------------------------------------------------------

-- Members can view organization settings
CREATE POLICY "org_settings_select_policy"
ON public.organization_settings
FOR SELECT
TO authenticated
USING (
    public.is_org_member(organization_id)
    OR public.is_platform_admin()
);

-- Owners can insert settings for their organization
CREATE POLICY "org_settings_insert_policy"
ON public.organization_settings
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);

-- Only owners can update settings
CREATE POLICY "org_settings_update_policy"
ON public.organization_settings
FOR UPDATE
TO authenticated
USING (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
)
WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_platform_admin()
);
