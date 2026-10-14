import { supabase } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface PatientProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string;
  blood_group?: string;
}

export interface ProviderSearchResult {
  id: string;
  name: string;
  slug: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  doctors_count: number;
  services_count: number;
}

export interface DoctorSearchResult {
  id: string;
  doctor_name: string;
  specialty: string;
  qualifications?: string;
  experience_years: number;
  consultation_fee: number;
  bio?: string;
  is_available: boolean;
  department_name?: string;
}

export interface ProviderDetailResponse {
  id: string;
  name: string;
  slug: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  doctors: DoctorSearchResult[];
  departments: string[];
  services: string[];
}

export interface AvailableSlot {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface PatientAppointment {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_type: string;
  organization_address?: string;
  doctor_profile_id: string;
  doctor_name: string;
  doctor_specialty: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  reason?: string;
  notes?: string;
  status: string;
  cancelled_reason?: string;
  scheduled_at: string;
}

export interface PatientDashboardSummary {
  upcoming_appointments_count: number;
  past_appointments_count: number;
  cancelled_appointments_count: number;
  next_appointment?: PatientAppointment;
}

class PatientApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const localToken = localStorage.getItem('healthcore_auth_token');
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      } else {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          headers['Authorization'] = `Bearer ${data.session.access_token}`;
        }
      }
    } catch (e) {
      console.warn('Could not retrieve session token:', e);
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
        // default message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Profile
  async getProfile(): Promise<PatientProfile> {
    return this.request<PatientProfile>('/api/v1/patient/profile');
  }

  async updateProfile(data: Partial<PatientProfile>): Promise<PatientProfile> {
    return this.request<PatientProfile>('/api/v1/patient/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Provider Discovery
  async searchProviders(params?: {
    q?: string;
    type?: string;
    specialty?: string;
    city?: string;
  }): Promise<ProviderSearchResult[]> {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.type) query.append('type', params.type);
    if (params?.specialty) query.append('specialty', params.specialty);
    if (params?.city) query.append('city', params.city);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<ProviderSearchResult[]>(`/api/v1/patient/providers${queryString}`);
  }

  async getProviderDetails(providerId: string): Promise<ProviderDetailResponse> {
    return this.request<ProviderDetailResponse>(`/api/v1/patient/providers/${providerId}`);
  }

  async getDoctorSlots(doctorProfileId: string, date: string): Promise<AvailableSlot[]> {
    return this.request<AvailableSlot[]>(
      `/api/v1/patient/doctors/${doctorProfileId}/slots?date=${encodeURIComponent(date)}`
    );
  }

  // Appointments
  async bookAppointment(data: {
    organization_id: string;
    doctor_profile_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    appointment_type?: string;
    reason?: string;
    notes?: string;
  }): Promise<PatientAppointment> {
    return this.request<PatientAppointment>('/api/v1/patient/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAppointments(upcomingOnly: boolean = false): Promise<PatientAppointment[]> {
    return this.request<PatientAppointment[]>(
      `/api/v1/patient/appointments?upcoming_only=${upcomingOnly}`
    );
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<PatientAppointment> {
    return this.request<PatientAppointment>(`/api/v1/patient/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Cancelled by patient' }),
    });
  }

  // Dashboard
  async getDashboard(): Promise<PatientDashboardSummary> {
    return this.request<PatientDashboardSummary>('/api/v1/patient/dashboard');
  }
}

export const patientApi = new PatientApiService();
