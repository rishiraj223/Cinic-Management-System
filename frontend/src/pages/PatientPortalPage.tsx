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
  LogOut,
  Compass,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EmergencyAmbulanceView } from '../components/ambulance/EmergencyAmbulanceView';
import {
  getBrowserLocation,
  calculateDistanceKm,
  estimateDriveTimeMinutes,
  formatDistance,
  getFacilityCoordinates,
  DEFAULT_DEMO_LOCATION,
  type GeoLocation,
} from '../utils/geoUtils';

export const PatientPortalPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'search' | 'appointments' | 'profile' | 'ambulance'
  >('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real GPS & Location Proximity State
  const [userLocation, setUserLocation] = useState<GeoLocation>(DEFAULT_DEMO_LOCATION);
  const [locating, setLocating] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(true);

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
  const [customTime, setCustomTime] = useState('10:30');
  const [bookingReason, setBookingReason] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const flexibleSlotPresets = [
    { label: '09:30 AM', start: '09:30', end: '10:00' },
    { label: '10:30 AM', start: '10:30', end: '11:00' },
    { label: '11:30 AM', start: '11:30', end: '12:00' },
    { label: '02:30 PM', start: '14:30', end: '15:00' },
    { label: '03:30 PM', start: '15:30', end: '16:00' },
    { label: '04:30 PM', start: '16:30', end: '17:00' },
    { label: '05:30 PM', start: '17:30', end: '18:00' },
  ];

  const selectCustomTimeSlot = (timeString: string) => {
    if (!timeString) return;
    const parts = timeString.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    const endMinutes = m + 30;
    const endHour = h + Math.floor(endMinutes / 60);
    const finalEndM = endMinutes % 60;
    const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(finalEndM).padStart(2, '0')}`;
    setSelectedSlot({
      date: bookingDate,
      start_time: timeString,
      end_time: endTimeStr,
      is_available: true,
    });
  };

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

  // Real Geolocation Detection
  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const loc = await getBrowserLocation();
      setUserLocation(loc);
      showNotification(
        'success',
        loc.isRealGps
          ? `Real GPS coordinates locked: ${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E`
          : 'Using benchmark demo location (Central Mumbai)'
      );
    } catch (err: any) {
      showNotification('error', 'Could not detect device GPS.');
    } finally {
      setLocating(false);
    }
  };

  // Auto-detect GPS silently on load if browser already granted permission
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            label: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
            isRealGps: true,
          });
        },
        () => {
          // Keep DEFAULT_DEMO_LOCATION silently
        },
        { timeout: 3500, maximumAge: 60000 }
      );
    }
  }, []);

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

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {profile?.full_name || user?.email?.split('@')[0] || 'Patient User'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                {user?.email}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shadow-xs">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'P'}
            </div>
            <button
              onClick={() => signOut()}
              title="Sign Out of Patient Account"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
            {dashboard.next_appointment ? (() => {
              const nextCoords = getFacilityCoordinates(
                (dashboard.next_appointment as any).organization_id || 'demo-clinic-01',
                null,
                dashboard.next_appointment.organization_address
              );
              const nextDistKm = calculateDistanceKm(
                userLocation.latitude,
                userLocation.longitude,
                nextCoords.lat,
                nextCoords.lon
              );
              const nextDriveMin = estimateDriveTimeMinutes(nextDistKm);

              return (
                <div className="bg-white rounded-2xl border border-teal-200/80 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                      <h3 className="font-bold text-slate-900 text-sm">Next Scheduled Appointment</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 bg-teal-50 text-teal-800 rounded-full capitalize border border-teal-100">
                        {dashboard.next_appointment.status}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full flex items-center gap-1.5 border border-slate-200">
                        <Navigation className="w-3 h-3 text-teal-600" />
                        {formatDistance(nextDistKm)} away (~{nextDriveMin} mins)
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
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
              );
            })() : (
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
        {!loading && activeTab === 'search' && !selectedProvider && (() => {
          // Calculate distance and drive time for each facility from the patient's current coordinates
          const evaluatedProviders = providers.map((p) => {
            const coords = getFacilityCoordinates(p.id, p.city, p.address);
            const distanceKm = calculateDistanceKm(
              userLocation.latitude,
              userLocation.longitude,
              coords.lat,
              coords.lon
            );
            const driveMin = estimateDriveTimeMinutes(distanceKm);
            return { ...p, coords, distanceKm, driveMin };
          });

          if (sortByDistance) {
            evaluatedProviders.sort((a, b) => a.distanceKm - b.distanceKm);
          }

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Discover Healthcare Facilities & Doctors</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Search accredited clinics, hospitals, and diagnostic testing centres with live proximity distance.
                </p>
              </div>

              {/* Real GPS & Proximity Hub Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      userLocation.isRealGps
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-inner'
                        : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    }`}
                  >
                    <Compass className={`w-6 h-6 ${locating ? 'animate-spin text-teal-300' : ''}`} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-teal-300">
                        Proximity Care Radar
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          userLocation.isRealGps
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            userLocation.isRealGps ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                          }`}
                        />
                        {userLocation.isRealGps ? 'Live Real GPS Active' : 'Demo Benchmark Location'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                      {userLocation.label ||
                        `${userLocation.latitude.toFixed(4)}° N, ${userLocation.longitude.toFixed(4)}° E`}
                    </p>
                    <span className="text-[11px] text-slate-300">
                      Doctors and facilities are ranked by physical road distance and average transit times.
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-2"
                  >
                    <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                    {locating ? 'Detecting GPS...' : '📍 Detect Real Location'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortByDistance(!sortByDistance)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                      sortByDistance
                        ? 'bg-teal-900/60 text-teal-200 border-teal-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {sortByDistance ? '✓ Nearest First' : 'Sort: Default'}
                  </button>
                </div>
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

              {/* Provider Grid with Distances */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {evaluatedProviders.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No healthcare providers found</p>
                    <span className="text-xs text-slate-400">Try modifying your search term or filter</span>
                  </div>
                ) : (
                  evaluatedProviders.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group hover:border-teal-300"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {p.type.replace('_', ' ')}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-2.5 group-hover:text-teal-700 transition">
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {p.city ? `${p.city}, ${p.state || ''}` : p.address || 'Address provided on file'}
                        </p>

                        {/* Distance and Estimated Driving Time */}
                        <div className="mt-3.5 p-2.5 rounded-xl bg-teal-50/70 border border-teal-100/80 flex items-center justify-between text-xs font-semibold text-teal-900">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Navigation className="w-3.5 h-3.5 text-teal-600" />
                            {formatDistance(p.distanceKm)} from you
                          </span>
                          <span className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            ~{p.driveMin} min transit
                          </span>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-4 text-xs font-semibold text-slate-600">
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
                        className="mt-5 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                      >
                        View Facility & Available Doctors <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        {/* ─── PROVIDER DETAILS & DOCTORS ─── */}
        {!loading && activeTab === 'search' && selectedProvider && (() => {
          const provCoords = getFacilityCoordinates(
            selectedProvider.id,
            selectedProvider.city,
            selectedProvider.address
          );
          const provDistanceKm = calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            provCoords.lat,
            provCoords.lon
          );
          const provDriveMin = estimateDriveTimeMinutes(provDistanceKm);

          return (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedProvider(null)}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                &larr; Back to Provider Search
              </button>

              {/* Provider Header with Distance & Travel Time */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
                      {selectedProvider.type.replace('_', ' ')}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedProvider.name}</h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {selectedProvider.address || 'Address provided on confirmation'} &bull;{' '}
                      {selectedProvider.city || ''}
                    </p>

                    {/* Facility Distance from User Current Location */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs font-bold shadow-xs">
                        <Navigation className="w-3.5 h-3.5 text-teal-600" />
                        {formatDistance(provDistanceKm)} from your location (~{provDriveMin} min drive)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Source: {userLocation.isRealGps ? 'Your Real Device GPS' : 'Demo Hub (Central Mumbai)'}
                      </span>
                    </div>
                  </div>
                  {selectedProvider.phone && (
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
                      <Phone className="w-4 h-4 text-teal-600" />
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Available Doctors & Specialists</h3>
                    <p className="text-xs text-slate-500">
                      Consultation distances computed from your current position.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    {selectedProvider.doctors.length} Specialist{selectedProvider.doctors.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedProvider.doctors.length === 0 ? (
                    <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                      No doctor profiles listed for online appointment booking at this facility yet.
                    </div>
                  ) : (
                    selectedProvider.doctors.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-teal-300 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-base">{doc.doctor_name}</h4>
                              <span className="text-xs font-bold text-teal-700 block mt-0.5">
                                {doc.specialty}
                              </span>
                            </div>
                            <span className="text-sm font-extrabold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                              ${parseFloat(doc.consultation_fee as any).toFixed(2)}
                            </span>
                          </div>

                          {doc.qualifications && (
                            <p className="text-xs text-slate-500 mt-2 font-mono">
                              Qualifications: {doc.qualifications} ({doc.experience_years} yrs exp)
                            </p>
                          )}
                          {doc.bio && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{doc.bio}</p>}

                          {/* Doctor Distance from Patient Location */}
                          <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                            <span className="font-semibold text-teal-800 flex items-center gap-1.5">
                              <Navigation className="w-3.5 h-3.5 text-teal-600" />
                              {formatDistance(provDistanceKm)} from you
                            </span>
                            <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              ~{provDriveMin} min transit
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenBooking(doc)}
                          className="mt-4 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                        >
                          Book Consultation & Available Slots &rarr;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Select Consultation Time Slot
                    </label>
                    <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
                      30 min slot
                    </span>
                  </div>

                  {availableSlots.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Doctor's Scheduled Slots:
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1">
                        {availableSlots.map((slot, i) => (
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
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flexible & Walk-in Slot Selector (Guarantees user can always book) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        {availableSlots.length === 0
                          ? 'No routine slots scheduled? Request Flexible / Walk-in Time:'
                          : 'Or Request Flexible / Walk-in Time:'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Guaranteed Slot
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {flexibleSlotPresets.map((preset) => {
                        const isSelected = selectedSlot?.start_time === preset.start;
                        return (
                          <button
                            key={preset.start}
                            type="button"
                            onClick={() =>
                              setSelectedSlot({
                                date: bookingDate,
                                start_time: preset.start,
                                end_time: preset.end,
                                is_available: true,
                              })
                            }
                            className={`py-1.5 px-1 text-center rounded-xl text-[11px] font-bold transition border ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Time Selection Input */}
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-600 shrink-0">
                        Custom Preferred Time:
                      </span>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => selectCustomTimeSlot(customTime)}
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-600 hover:text-white border border-teal-200 rounded-lg text-xs font-bold text-teal-800 transition"
                      >
                        Set Custom Slot
                      </button>
                    </div>
                  </div>

                  {selectedSlot && (
                    <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
                      <span className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Selected Slot: <strong>{selectedSlot.start_time} - {selectedSlot.end_time}</strong>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-100">
                        {bookingDate}
                      </span>
                    </div>
                  )}
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
