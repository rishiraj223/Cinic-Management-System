export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface MembershipSummary {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  organization_type: 'clinic' | 'hospital' | 'diagnostic_center';
  role: 'organization_owner' | 'doctor' | 'receptionist' | 'lab_staff';
  status: 'active' | 'invited' | 'suspended';
}

export interface UserProfileResponse {
  profile: Profile;
  memberships: MembershipSummary[];
}
