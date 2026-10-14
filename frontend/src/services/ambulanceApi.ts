import { supabase } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Ambulance {
  id: string;
  organization_id: string;
  vehicle_number: string;
  vehicle_type: string;
  driver_name?: string;
  driver_phone?: string;
  service_area?: string;
  is_available: boolean;
  current_latitude: number;
  current_longitude: number;
  created_at: string;
}

export interface AmbulanceRequest {
  id: string;
  organization_id?: string;
  user_id?: string;
  patient_name: string;
  contact_phone: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  emergency_type?: string;
  additional_notes?: string;
  status: string; // requested / accepted / on_the_way / arrived / completed / rejected / cancelled
  assigned_ambulance_id?: string;
  eta_minutes?: number;
  cancellation_reason?: string;
  requested_at: string;
  assigned_ambulance?: Ambulance;
}

export interface AmbulanceSimulatedTracking {
  request_id: string;
  status: string;
  eta_minutes: number;
  ambulance_latitude: number;
  ambulance_longitude: number;
  pickup_latitude: number;
  pickup_longitude: number;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  disclaimer: string;
}

class AmbulanceApiService {
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
          errorMessage =
            typeof errorData.detail === 'string'
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

  // Patient / Public Emergency Assistance
  async createRequest(data: {
    organization_id?: string;
    patient_name: string;
    contact_phone: string;
    pickup_address: string;
    pickup_latitude?: number;
    pickup_longitude?: number;
    emergency_type?: string;
    additional_notes?: string;
  }): Promise<AmbulanceRequest> {
    return this.request<AmbulanceRequest>('/api/v1/ambulance/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyRequests(): Promise<AmbulanceRequest[]> {
    return this.request<AmbulanceRequest[]>('/api/v1/ambulance/requests/my');
  }

  async getTracking(requestId: string): Promise<AmbulanceSimulatedTracking> {
    return this.request<AmbulanceSimulatedTracking>(
      `/api/v1/ambulance/requests/${requestId}/tracking`
    );
  }

  // Operator / Facility Fleet & Dispatch
  async getAmbulances(orgId: string, availableOnly: boolean = false): Promise<Ambulance[]> {
    return this.request<Ambulance[]>(
      `/api/v1/ambulance/organizations/${orgId}/ambulances?available_only=${availableOnly}`
    );
  }

  async registerAmbulance(
    orgId: string,
    data: {
      vehicle_number: string;
      vehicle_type: string;
      driver_name?: string;
      driver_phone?: string;
      service_area?: string;
      is_available?: boolean;
    }
  ): Promise<Ambulance> {
    return this.request<Ambulance>(`/api/v1/ambulance/organizations/${orgId}/ambulances`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFacilityRequests(orgId: string, status?: string): Promise<AmbulanceRequest[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<AmbulanceRequest[]>(
      `/api/v1/ambulance/organizations/${orgId}/requests${q}`
    );
  }

  async updateRequestStatus(
    orgId: string,
    requestId: string,
    data: {
      status: string;
      assigned_ambulance_id?: string;
      cancellation_reason?: string;
      eta_minutes?: number;
    }
  ): Promise<AmbulanceRequest> {
    return this.request<AmbulanceRequest>(
      `/api/v1/ambulance/organizations/${orgId}/requests/${requestId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }
}

export const ambulanceApi = new AmbulanceApiService();
