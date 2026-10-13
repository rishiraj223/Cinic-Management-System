import { supabase } from '../config/supabase';
import type { UserProfileResponse, Profile } from '../types/auth';
import type { OrganizationWithRole, CreateOrganizationInput } from '../types/organization';

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

  async getOrganization(orgId: string): Promise<OrganizationWithRole> {
    return this.request<OrganizationWithRole>(`/api/v1/organizations/${orgId}`);
  }
}

export const api = new ApiService();
