import React, { useState, useEffect } from 'react';
import {
  patientApi,
  type PatientDashboardSummary,
  type ProviderSearchResult,
  type ProviderDetailResponse,
  type AvailableSlot,
  type PatientAppointment,
  type PatientProfile,
} from '../services/patientApi';
import {
  Calendar,
  Clock,
  Search,
  Building,
  User,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  AlertCircle,
  ArrowRight,
  Truck,
} from 'lucide-react';
import { EmergencyAmbulanceView } from '../components/ambulance/EmergencyAmbulanceView';

interface PatientPortalPageProps {
  onNavigateToStaffPortal?: () => void;
}

export const PatientPortalPage: React.FC<PatientPortalPageProps> = ({ onNavigateToStaffPortal }) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'search' | 'appointments' | 'profile' | 'ambulance'
  >('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dashboard Data
  const [dashboard, setDashboard] = useState<PatientDashboardSummary | null>(null);

  // Search Providers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDetailResponse | null>(null);

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [bookingReason, setBookingReason] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // My Appointments
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);

  // Profile
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<PatientProfile>>({});

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await patientApi.getDashboard();
      setDashboard(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await patientApi.searchProviders({
        q: searchQuery || undefined,
        type: selectedType || undefined,
      });
      setProviders(results);
    } catch (e: any) {
      showNotification('error', e.message || 'Failed to search providers');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProvider = async (providerId: string) => {
    setLoading(true);
    try {
      const details = await patientApi.getProviderDetails(providerId);
      setSelectedProvider(details);
    } catch (e: any) {
      showNotification('error', e.message || 'Could not load facility details');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = async (doctor: any) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setBookingReason('');
    // Load slots for date
    try {
      const slots = await patientApi.getDoctorSlots(doctor.id, bookingDate);
      setAvailableSlots(slots);
    } catch (e: any) {
      setAvailableSlots([]);
    }
  };

  const handleDateChange = async (newDate: string) => {
    setBookingDate(newDate);
    setSelectedSlot(null);
    if (selectedDoctor) {
      try {
        const slots = await patientApi.getDoctorSlots(selectedDoctor.id, newDate);
        setAvailableSlots(slots);
      } catch (e: any) {
        setAvailableSlots([]);
      }
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !selectedDoctor || !selectedSlot) return;

    setIsBooking(true);
    try {
      await patientApi.bookAppointment({
        organization_id: selectedProvider.id,
        doctor_profile_id: selectedDoctor.id,
        appointment_date: bookingDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        reason: bookingReason,
      });
      showNotification('success', 'Appointment successfully confirmed!');
      setSelectedDoctor(null);
      setSelectedSlot(null);
      loadDashboard();
      loadAppointments();
      setActiveTab('appointments');
    } catch (e: any) {
      showNotification('error', e.message || 'Could not book slot');
    } finally {
      setIsBooking(false);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const list = await patientApi.getAppointments(false);
      setAppointments(list);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you wish to cancel this appointment?')) return;
    try {
      await patientApi.cancelAppointment(apptId, 'Cancelled from patient portal');
      showNotification('success', 'Appointment has been cancelled');
      loadAppointments();
      loadDashboard();
    } catch (e: any) {
      showNotification('error', e.message || 'Failed to cancel appointment');
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const p = await patientApi.getProfile();
      setProfile(p);
      setProfileForm({
        full_name: p.full_name || '',
        phone: p.phone || '',
        gender: p.gender || '',
        address: p.address || '',
        allergies: p.allergies || '',
        blood_group: p.blood_group || '',
        emergency_contact_name: p.emergency_contact_name || '',
        emergency_contact_phone: p.emergency_contact_phone || '',
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await patientApi.updateProfile(profileForm);
      setProfile(updated);
      setIsEditingProfile(false);
      showNotification('success', 'Patient profile updated successfully');
    } catch (e: any) {
      showNotification('error', e.message || 'Failed to save profile');
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'search') handleSearch();
    if (activeTab === 'appointments') loadAppointments();
    if (activeTab === 'profile') loadProfile();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-teal-200">
              H
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Patient Health Portal</h1>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full inline-block">
                Personal Care Account
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onNavigateToStaffPortal && (
              <button
                onClick={onNavigateToStaffPortal}
                className="text-xs font-semibold text-slate-600 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition"
              >
                Switch to Healthcare Provider Portal &rarr;
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
              {profile?.full_name?.charAt(0) || 'P'}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sub-bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8">
          {[
            { id: 'dashboard', label: 'My Dashboard', icon: Calendar },
            { id: 'search', label: 'Find Care & Book Slots', icon: Search },
            { id: 'appointments', label: 'My Bookings', icon: Clock },
            { id: 'profile', label: 'Medical Profile', icon: User },
            { id: 'ambulance', label: 'Emergency Ambulance', icon: Truck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedProvider(null);
                  setSelectedDoctor(null);
                  setActiveTab(tab.id as any);
                }}
                className={`py-4 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
                  active
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {loading && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            Fetching secure medical information...
          </div>
        )}

        {/* ─── TAB 1: DASHBOARD ─── */}
        {!loading && activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-teal-950/10">
              <h2 className="text-2xl font-bold">Welcome to Your Personal Health Portal</h2>
              <p className="text-teal-100 text-sm mt-1">
                Book consultations with specialized doctors, schedule lab tests, and track your clinical bookings.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-5 py-2.5 bg-white text-teal-900 font-bold text-sm rounded-xl hover:bg-teal-50 transition shadow"
                >
                  Book New Appointment &rarr;
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="px-5 py-2.5 bg-teal-800/80 text-white font-semibold text-sm rounded-xl hover:bg-teal-800 transition border border-teal-600"
                >
                  View My Scheduled Visits
                </button>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Upcoming Appointments
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">
                  {dashboard.upcoming_appointments_count}
                </p>
                <span className="text-xs text-slate-500 mt-1 block">Active upcoming healthcare visits</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Past Consultations
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">
                  {dashboard.past_appointments_count}
                </p>
                <span className="text-xs text-slate-500 mt-1 block">Completed visits in your record</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Cancelled Visits
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">
                  {dashboard.cancelled_appointments_count}
                </p>
                <span className="text-xs text-slate-500 mt-1 block">Cancelled or archived bookings</span>
              </div>
            </div>

            {/* Next Upcoming Appointment Highlight */}
            {dashboard.next_appointment ? (
              <div className="bg-white rounded-2xl border border-teal-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                    <h3 className="font-bold text-slate-900 text-sm">Next Scheduled Appointment</h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-teal-50 text-teal-800 rounded-full capitalize">
                    {dashboard.next_appointment.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Doctor</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {dashboard.next_appointment.doctor_name}
                    </p>
                    <span className="text-xs text-teal-700 font-medium">
                      {dashboard.next_appointment.doctor_specialty}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Healthcare Facility</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {dashboard.next_appointment.organization_name}
                    </p>
                    <span className="text-xs text-slate-500">
                      {dashboard.next_appointment.organization_address || 'Address on file'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Date & Time</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {dashboard.next_appointment.appointment_date}
                    </p>
                    <span className="text-xs text-slate-600 font-mono">
                      {dashboard.next_appointment.start_time} - {dashboard.next_appointment.end_time}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No appointments scheduled</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You do not have any upcoming visits booked. Search providers to find an available doctor.
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition"
                >
                  Find Doctors & Clinics
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: FIND CARE & BOOK SLOTS ─── */}
        {!loading && activeTab === 'search' && !selectedProvider && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Discover Healthcare Facilities & Doctors</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Search accredited clinics, hospitals, and diagnostic testing centres.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by clinic name, doctor, specialty, department or test..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-700 bg-white"
              >
                <option value="">All Facility Types</option>
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
                <option value="diagnostic_center">Diagnostic Centre</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-6 py-2.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow"
              >
                Search
              </button>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No healthcare providers found</p>
                  <span className="text-xs text-slate-400">Try modifying your search term or filter</span>
                </div>
              ) : (
                providers.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {p.type.replace('_', ' ')}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{p.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {p.city ? `${p.city}, ${p.state || ''}` : p.address || 'Address provided on file'}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs font-semibold text-slate-600">
                        <div>
                          <span className="text-teal-700 font-bold">{p.doctors_count}</span> Available Doctors
                        </div>
                        <div>
                          <span className="text-slate-900 font-bold">{p.services_count}</span> Services & Tests
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewProvider(p.id)}
                      className="mt-5 w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      View Facility & Book Slots <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── PROVIDER DETAILS & DOCTORS ─── */}
        {!loading && activeTab === 'search' && selectedProvider && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedProvider(null)}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              &larr; Back to Provider Search
            </button>

            {/* Provider Header */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
                    {selectedProvider.type.replace('_', ' ')}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedProvider.name}</h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {selectedProvider.address || 'Address provided on confirmation'} &bull;{' '}
                    {selectedProvider.city || ''}
                  </p>
                </div>
                {selectedProvider.phone && (
                  <div className="text-xs font-semibold text-slate-600 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {selectedProvider.phone}
                  </div>
                )}
              </div>

              {/* Departments & Services */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                {selectedProvider.departments.map((d: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700"
                  >
                    Dept: {d}
                  </span>
                ))}
                {selectedProvider.services.map((s: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800"
                  >
                    Service: {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Doctor Directory */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Available Doctors & Specialists</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProvider.doctors.length === 0 ? (
                  <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                    No doctor profiles listed for online appointment booking at this facility yet.
                  </div>
                ) : (
                  selectedProvider.doctors.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{doc.doctor_name}</h4>
                            <span className="text-xs font-bold text-teal-700 block mt-0.5">
                              {doc.specialty}
                            </span>
                          </div>
                          <span className="text-sm font-extrabold text-slate-900">
                            ${parseFloat(doc.consultation_fee as any).toFixed(2)}
                          </span>
                        </div>

                        {doc.qualifications && (
                          <p className="text-xs text-slate-500 mt-2 font-mono">
                            Qualifications: {doc.qualifications} ({doc.experience_years} yrs exp)
                          </p>
                        )}
                        {doc.bio && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{doc.bio}</p>}
                      </div>

                      <button
                        onClick={() => handleOpenBooking(doc)}
                        className="mt-4 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow"
                      >
                        Select Date & Available Slots &rarr;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── BOOKING MODAL / SLOT SELECTOR ─── */}
        {selectedDoctor && selectedProvider && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Book Appointment</h3>
                  <span className="text-xs text-slate-500">
                    {selectedDoctor.doctor_name} &bull; {selectedDoctor.specialty}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleConfirmBooking} className="space-y-4">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Appointment Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
                  />
                </div>

                {/* Slot Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Time Slot
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableSlots.length === 0 ? (
                      <div className="col-span-3 py-4 text-center text-xs text-slate-400">
                        No available slots on this date.
                      </div>
                    ) : (
                      availableSlots.map((slot, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={!slot.is_available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border ${
                            !slot.is_available
                              ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                              : selectedSlot?.start_time === slot.start_time
                              ? 'bg-teal-600 text-white border-teal-600 shadow'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500'
                          }`}
                        >
                          {slot.start_time}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Reason for Visit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chief Complaint / Reason for Visit
                  </label>
                  <textarea
                    rows={2}
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="Briefly describe your symptoms or reason for consulting..."
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDoctor(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedSlot || isBooking}
                    className="px-5 py-2 bg-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl hover:bg-teal-700 shadow"
                  >
                    {isBooking ? 'Securing Slot...' : 'Confirm Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB 3: MY APPOINTMENTS ─── */}
        {!loading && activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">My Appointments & Care History</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  View scheduled visits, check status updates, and manage cancellations.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition shadow"
              >
                + Book New Appointment
              </button>
            </div>

            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No appointment records found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You have not booked any consultations yet.
                  </p>
                </div>
              ) : (
                appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            appt.status === 'scheduled' || appt.status === 'confirmed'
                              ? 'bg-teal-50 text-teal-800'
                              : appt.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {appt.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {appt.appointment_type}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{appt.doctor_name}</h3>
                      <p className="text-xs text-teal-700 font-semibold">{appt.doctor_specialty}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {appt.organization_name} &bull; {appt.organization_address || 'Facility'}
                      </p>
                    </div>

                    <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
                      <div className="bg-slate-50 px-4 py-2 rounded-xl text-left md:text-right">
                        <span className="text-xs font-bold text-slate-900 block">
                          {appt.appointment_date}
                        </span>
                        <span className="text-xs font-mono text-slate-600 block">
                          {appt.start_time} - {appt.end_time}
                        </span>
                      </div>

                      {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-lg transition"
                        >
                          Cancel Appointment
                        </button>
                      )}
                      {appt.cancelled_reason && (
                        <span className="text-[11px] text-rose-500 italic">
                          Reason: {appt.cancelled_reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: MEDICAL PROFILE ─── */}
        {!loading && activeTab === 'profile' && profile && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Personal Patient Profile</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Secure medical identity, emergency contacts, and clinical notes.
                </p>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition"
                >
                  Edit Information
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        value={profileForm.full_name || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        className="w-full border rounded-xl p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={profileForm.phone || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full border rounded-xl p-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                      <input
                        type="text"
                        placeholder="e.g. O+, A+, B-"
                        value={profileForm.blood_group || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                        className="w-full border rounded-xl p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                      <input
                        type="text"
                        placeholder="Male / Female / Other"
                        value={profileForm.gender || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                        className="w-full border rounded-xl p-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={profileForm.address || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full border rounded-xl p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Documented Allergies</label>
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                      value={profileForm.allergies || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                      className="w-full border rounded-xl p-2.5 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={profileForm.emergency_contact_name || ''}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })
                        }
                        className="w-full border rounded-xl p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Phone</label>
                      <input
                        type="text"
                        value={profileForm.emergency_contact_phone || ''}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })
                        }
                        className="w-full border rounded-xl p-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl shadow"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 font-extrabold text-2xl flex items-center justify-center">
                      {profile.full_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{profile.full_name || 'Patient'}</h3>
                      <span className="text-xs text-slate-500 font-mono">{profile.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Contact Phone</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{profile.phone || 'Not documented'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Blood Group</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{profile.blood_group || 'Not documented'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Residential Address</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{profile.address || 'Not documented'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Allergies</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{profile.allergies || 'None documented'}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <span className="font-bold text-slate-400 uppercase text-xs">Emergency Contact</span>
                    <p className="font-semibold text-slate-900 text-xs mt-1">
                      {profile.emergency_contact_name
                        ? `${profile.emergency_contact_name} (${profile.emergency_contact_phone || 'No phone'})`
                        : 'No emergency contact set'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: EMERGENCY AMBULANCE ─── */}
        {!loading && activeTab === 'ambulance' && <EmergencyAmbulanceView />}
      </main>
    </div>
  );
};
