import { supabase } from '../config/supabase';
import type {
  Patient,
  PatientCreateInput,
  Appointment,
  AppointmentCreateInput,
  QueueEntry,
  Prescription,
  Invoice,
  Payment,
  FollowUp,
  DashboardSummary,
} from '../types/clinic';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ClinicApiService {
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
    } catch (err) {
      console.warn('Could not read session token:', err);
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Fallback to text
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ── Patients ─────────────────────────────────────────────────────────────
  async getPatients(orgId: string, search?: string): Promise<Patient[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Patient[]>(`/api/v1/organizations/${orgId}/clinic/patients${query}`);
  }

  async getPatient(orgId: string, patientId: string): Promise<Patient> {
    return this.request<Patient>(`/api/v1/organizations/${orgId}/clinic/patients/${patientId}`);
  }

  async createPatient(orgId: string, input: PatientCreateInput): Promise<Patient> {
    return this.request<Patient>(`/api/v1/organizations/${orgId}/clinic/patients`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ── Appointments ─────────────────────────────────────────────────────────
  async getAppointments(orgId: string, date?: string, doctorId?: string, status?: string): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (doctorId) params.append('doctor_id', doctorId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Appointment[]>(`/api/v1/organizations/${orgId}/clinic/appointments${qs}`);
  }

  async createAppointment(orgId: string, input: AppointmentCreateInput): Promise<Appointment> {
    return this.request<Appointment>(`/api/v1/organizations/${orgId}/clinic/appointments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateAppointmentStatus(orgId: string, appointmentId: string, status: string, cancelledReason?: string): Promise<Appointment> {
    return this.request<Appointment>(`/api/v1/organizations/${orgId}/clinic/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancelled_reason: cancelledReason }),
    });
  }

  // ── Queue ────────────────────────────────────────────────────────────────
  async getQueue(orgId: string, date?: string): Promise<QueueEntry[]> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<QueueEntry[]>(`/api/v1/organizations/${orgId}/clinic/queue${query}`);
  }

  async addQueueEntry(orgId: string, input: { patient_id?: string; doctor_profile_id?: string; walk_in_name?: string }): Promise<QueueEntry> {
    return this.request<QueueEntry>(`/api/v1/organizations/${orgId}/clinic/queue`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateQueueStatus(orgId: string, entryId: string, status: string): Promise<QueueEntry> {
    return this.request<QueueEntry>(`/api/v1/organizations/${orgId}/clinic/queue/${entryId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ── Prescriptions ────────────────────────────────────────────────────────
  async getPrescriptions(orgId: string, patientId: string): Promise<Prescription[]> {
    return this.request<Prescription[]>(`/api/v1/organizations/${orgId}/clinic/patients/${patientId}/prescriptions`);
  }

  async createPrescription(orgId: string, input: any): Promise<Prescription> {
    return this.request<Prescription>(`/api/v1/organizations/${orgId}/clinic/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async finalizePrescription(orgId: string, prescriptionId: string): Promise<Prescription> {
    return this.request<Prescription>(`/api/v1/organizations/${orgId}/clinic/prescriptions/${prescriptionId}/finalize`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async downloadPrescriptionPdf(orgId: string, prescriptionId: string): Promise<Blob> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1/organizations/${orgId}/clinic/prescriptions/${prescriptionId}/pdf`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    return response.blob();
  }

  // ── Invoices & Billing ───────────────────────────────────────────────────
  async getInvoices(orgId: string, patientId?: string, status?: string): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Invoice[]>(`/api/v1/organizations/${orgId}/clinic/invoices${qs}`);
  }

  async createInvoice(orgId: string, input: any): Promise<Invoice> {
    return this.request<Invoice>(`/api/v1/organizations/${orgId}/clinic/invoices`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async recordPayment(orgId: string, invoiceId: string, input: any): Promise<Payment> {
    return this.request<Payment>(`/api/v1/organizations/${orgId}/clinic/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async downloadInvoicePdf(orgId: string, invoiceId: string): Promise<Blob> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1/organizations/${orgId}/clinic/invoices/${invoiceId}/pdf`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to download Invoice PDF');
    return response.blob();
  }

  // ── Follow-ups ───────────────────────────────────────────────────────────
  async getFollowUps(orgId: string, doctorId?: string, status?: string): Promise<FollowUp[]> {
    const params = new URLSearchParams();
    if (doctorId) params.append('doctor_id', doctorId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<FollowUp[]>(`/api/v1/organizations/${orgId}/clinic/followups${qs}`);
  }

  async createFollowUp(orgId: string, input: any): Promise<FollowUp> {
    return this.request<FollowUp>(`/api/v1/organizations/${orgId}/clinic/followups`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateFollowUpStatus(orgId: string, followupId: string, status: string): Promise<FollowUp> {
    return this.request<FollowUp>(`/api/v1/organizations/${orgId}/clinic/followups/${followupId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ── Dashboard & Reports ──────────────────────────────────────────────────
  async getDashboardSummary(orgId: string, date?: string): Promise<DashboardSummary> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<DashboardSummary>(`/api/v1/organizations/${orgId}/clinic/dashboard${qs}`);
  }

  async getDailyReport(orgId: string, date?: string): Promise<any> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<any>(`/api/v1/organizations/${orgId}/clinic/reports/daily${qs}`);
  }

  async getMonthlyReport(orgId: string, year?: number, month?: number): Promise<any> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/api/v1/organizations/${orgId}/clinic/reports/monthly${qs}`);
  }
}

export const clinicApi = new ClinicApiService();
