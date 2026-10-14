export interface Patient {
  id: string;
  organization_id: string;
  created_by?: string;
  patient_code: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  phone: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string;
  blood_group?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientCreateInput {
  full_name: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string;
  blood_group?: string;
}

export interface Appointment {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_profile_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  reason?: string;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  cancelled_reason?: string;
  scheduled_at: string;
  confirmed_at?: string;
  checked_in_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
}

export interface AppointmentCreateInput {
  patient_id: string;
  doctor_profile_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type?: string;
  reason?: string;
  notes?: string;
}

export interface QueueEntry {
  id: string;
  organization_id: string;
  patient_id?: string;
  doctor_profile_id?: string;
  queue_number: number;
  walk_in_name?: string;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'cancelled';
  arrived_at: string;
  called_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface PrescriptionItem {
  id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  route?: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  organization_id: string;
  patient_id: string;
  visit_id?: string;
  doctor_profile_id: string;
  prescription_ref: string;
  status: 'draft' | 'finalized';
  diagnosis_note?: string;
  instructions?: string;
  finalized_at?: string;
  created_at: string;
  items: PrescriptionItem[];
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface Invoice {
  id: string;
  organization_id: string;
  patient_id: string;
  appointment_id?: string;
  visit_id?: string;
  invoice_number: string;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance: number;
  notes?: string;
  due_date?: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  recorded_by?: string;
  amount: number;
  method: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  organization_id: string;
  patient_id: string;
  visit_id?: string;
  doctor_profile_id: string;
  follow_up_date: string;
  reason?: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface DashboardSummary {
  today_appointments: number;
  checked_in: number;
  waiting: number;
  completed: number;
  cancelled: number;
  no_show: number;
  today_collection: number;
  outstanding_balance: number;
  upcoming_followups: number;
}
