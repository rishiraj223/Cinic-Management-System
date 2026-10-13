import { supabase } from '../config/supabase';
import type { UserProfileResponse, Profile } from '../types/auth';
import type {
  OrganizationWithRole,
  CreateOrganizationInput,
  OrganizationOnboardingInput,
  StaffMember,
  DoctorProfile,
  Department,
  ServiceCategory,
  MemberRole,
  MemberStatus,
} from '../types/organization';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    } catch (e) {
      console.warn('Could not retrieve Supabase session token:', e);
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getAuthHeaders();
    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    };

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Health
  async getHealth(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  }

  // User Profile
  async getMyProfile(): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>('/api/v1/me');
  }

  async updateMyProfile(payload: Partial<Profile>): Promise<Profile> {
    return this.request<Profile>('/api/v1/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Organizations
  async getOrganizations(): Promise<OrganizationWithRole[]> {
    return this.request<OrganizationWithRole[]>('/api/v1/organizations');
  }

  async createOrganization(payload: CreateOrganizationInput): Promise<OrganizationWithRole> {
    return this.request<OrganizationWithRole>('/api/v1/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async onboardOrganization(payload: OrganizationOnboardingInput): Promise<OrganizationWithRole> {
    return this.request<OrganizationWithRole>('/api/v1/organizations/onboard', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOrganization(orgId: string): Promise<OrganizationWithRole> {
    return this.request<OrganizationWithRole>(`/api/v1/organizations/${orgId}`);
  }

  async updateOrganization(orgId: string, payload: Partial<CreateOrganizationInput>): Promise<OrganizationWithRole> {
    return this.request<OrganizationWithRole>(`/api/v1/organizations/${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updateOrganizationSettings(orgId: string, payload: any): Promise<any> {
    return this.request<any>(`/api/v1/organizations/${orgId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Staff & Members
  async getMembers(orgId: string): Promise<StaffMember[]> {
    return this.request<StaffMember[]>(`/api/v1/organizations/${orgId}/members`);
  }

  async addMember(orgId: string, payload: { email: string; role: MemberRole; status?: MemberStatus }): Promise<StaffMember> {
    return this.request<StaffMember>(`/api/v1/organizations/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMember(orgId: string, memberId: string, payload: { role?: MemberRole; status?: MemberStatus }): Promise<StaffMember> {
    return this.request<StaffMember>(`/api/v1/organizations/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteMember(orgId: string, memberId: string): Promise<void> {
    await this.request<void>(`/api/v1/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // Doctor Profiles
  async getDoctors(orgId: string): Promise<DoctorProfile[]> {
    return this.request<DoctorProfile[]>(`/api/v1/organizations/${orgId}/doctors`);
  }

  async saveDoctorProfile(orgId: string, payload: Partial<DoctorProfile>): Promise<DoctorProfile> {
    return this.request<DoctorProfile>(`/api/v1/organizations/${orgId}/doctors`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Departments (Hospital)
  async getDepartments(orgId: string): Promise<Department[]> {
    return this.request<Department[]>(`/api/v1/organizations/${orgId}/departments`);
  }

  async createDepartment(orgId: string, payload: { name: string; description?: string }): Promise<Department> {
    return this.request<Department>(`/api/v1/organizations/${orgId}/departments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateDepartment(orgId: string, deptId: string, payload: Partial<Department>): Promise<Department> {
    return this.request<Department>(`/api/v1/organizations/${orgId}/departments/${deptId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteDepartment(orgId: string, deptId: string): Promise<void> {
    await this.request<void>(`/api/v1/organizations/${orgId}/departments/${deptId}`, {
      method: 'DELETE',
    });
  }

  async assignDoctorDepartment(orgId: string, deptId: string, doctorProfileId: string): Promise<any> {
    return this.request<any>(`/api/v1/organizations/${orgId}/departments/${deptId}/doctors`, {
      method: 'POST',
      body: JSON.stringify({ doctor_profile_id: doctorProfileId, is_primary: true }),
    });
  }

  async removeDoctorDepartment(orgId: string, deptId: string, doctorProfileId: string): Promise<any> {
    return this.request<any>(`/api/v1/organizations/${orgId}/departments/${deptId}/doctors/${doctorProfileId}`, {
      method: 'DELETE',
    });
  }

  // Service Categories (Diagnostic Lab)
  async getServiceCategories(orgId: string): Promise<ServiceCategory[]> {
    return this.request<ServiceCategory[]>(`/api/v1/organizations/${orgId}/service-categories`);
  }

  async createServiceCategory(orgId: string, payload: { name: string; description?: string; sample_type?: string }): Promise<ServiceCategory> {
    return this.request<ServiceCategory>(`/api/v1/organizations/${orgId}/service-categories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateServiceCategory(orgId: string, catId: string, payload: Partial<ServiceCategory>): Promise<ServiceCategory> {
    return this.request<ServiceCategory>(`/api/v1/organizations/${orgId}/service-categories/${catId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteServiceCategory(orgId: string, catId: string): Promise<void> {
    await this.request<void>(`/api/v1/organizations/${orgId}/service-categories/${catId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
