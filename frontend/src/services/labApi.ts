import { supabase } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class LabApiService {
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
        // default
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Catalogue
  async getTests(orgId: string, category?: string) {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<any[]>(`/api/v1/organizations/${orgId}/lab/tests${q}`);
  }

  async createTest(orgId: string, data: any) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/tests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Orders
  async getOrders(orgId: string, status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<any[]>(`/api/v1/organizations/${orgId}/lab/orders${q}`);
  }

  async createOrder(orgId: string, data: any) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Samples
  async getSamples(orgId: string, status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<any[]>(`/api/v1/organizations/${orgId}/lab/samples${q}`);
  }

  async createSample(orgId: string, data: any) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/samples`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSampleStatus(orgId: string, sampleId: string, status: string, reason?: string) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/samples/${sampleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejected_reason: reason }),
    });
  }

  // Results
  async getResults(orgId: string) {
    return this.request<any[]>(`/api/v1/organizations/${orgId}/lab/results`);
  }

  async enterResult(orgId: string, data: any) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/results`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validateResult(orgId: string, resultId: string, notes?: string) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/results/${resultId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // Reports
  async createReport(orgId: string, orderId: string) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/orders/${orderId}/reports`, {
      method: 'POST',
    });
  }

  async deliverReport(orgId: string, reportId: string, data: any) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/reports/${reportId}/deliver`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboard(orgId: string) {
    return this.request<any>(`/api/v1/organizations/${orgId}/lab/dashboard`);
  }

  // Hospital Dashboard & Analytics
  async getHospitalDashboard(orgId: string) {
    return this.request<any>(`/api/v1/organizations/${orgId}/hospital/dashboard`);
  }

  async getHospitalDepartmentsReport(orgId: string) {
    return this.request<any[]>(`/api/v1/organizations/${orgId}/hospital/departments-report`);
  }
}

export const labApi = new LabApiService();
