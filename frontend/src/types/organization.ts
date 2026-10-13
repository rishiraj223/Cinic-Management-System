export type OrganizationType = 'clinic' | 'hospital' | 'diagnostic_center';
export type MemberRole = 'organization_owner' | 'doctor' | 'receptionist' | 'lab_staff';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  timezone: string;
  currency: string;
  operating_hours: Record<string, any>;
  notification_preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  settings?: OrganizationSettings | null;
}

export interface OrganizationWithRole extends Organization {
  current_user_role: MemberRole;
  membership_status: MemberStatus;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  type: OrganizationType;
  address?: string;
  phone?: string;
  email?: string;
}
