export type OrganizationType = 'clinic' | 'hospital' | 'diagnostic_center';
export type MemberRole = 'organization_owner' | 'doctor' | 'receptionist' | 'lab_staff';
export type MemberStatus = 'active' | 'invited' | 'pending' | 'suspended';

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
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
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
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  operating_hours?: Record<string, any>;
}

export interface OrganizationOnboardingInput extends CreateOrganizationInput {
  doctor_specialty?: string;
  doctor_license?: string;
  doctor_qualifications?: string;
  doctor_consultation_fee?: number;
  initial_departments?: string[];
  initial_service_categories?: string[];
}

export interface StaffMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  user_email?: string | null;
  user_full_name?: string | null;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  organization_id: string;
  specialty: string;
  license_number?: string | null;
  qualifications?: string | null;
  experience_years: number;
  consultation_fee: number;
  bio?: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  doctor_name?: string | null;
  doctor_email?: string | null;
  department_names?: string[];
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  head_doctor_id?: string | null;
  head_doctor_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  doctor_count: number;
}

export interface ServiceCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  sample_type?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
