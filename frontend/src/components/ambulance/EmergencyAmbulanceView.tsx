import React, { useState, useEffect } from 'react';
import {
  ambulanceApi,
  type AmbulanceRequest,
  type AmbulanceSimulatedTracking,
} from '../../services/ambulanceApi';
import {
  AlertTriangle,
  MapPin,
  Compass,
  Truck,
  RotateCw,
  Navigation,
  Clock,
  PhoneCall,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Gauge,
  Activity,
} from 'lucide-react';
import {
  getBrowserLocation,
  calculateDistanceKm,
  estimateDriveTimeMinutes,
  formatDistance,
  DEFAULT_DEMO_LOCATION,
  type GeoLocation,
} from '../../utils/geoUtils';

export const EmergencyAmbulanceView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'request' | 'my-requests' | 'tracking'>('request');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real GPS & Location State
  const [userLocation, setUserLocation] = useState<GeoLocation>(DEFAULT_DEMO_LOCATION);
  const [locating, setLocating] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [emergencyType, setEmergencyType] = useState('General Emergency');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Requests History & Live Tracking
  const [myRequests, setMyRequests] = useState<AmbulanceRequest[]>([]);
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<AmbulanceSimulatedTracking | null>(null);

  // Live ETA countdown in seconds
  const [countdownSeconds, setCountdownSeconds] = useState<number>(360);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  // Real Geolocation Detection
  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const loc = await getBrowserLocation();
      setUserLocation(loc);
      const addressString = loc.isRealGps
        ? `GPS Location (${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E) - Near Current Position`
        : `Central Mumbai Hub (${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E)`;
      setPickupAddress(addressString);
      showNotification(
        'success',
        loc.isRealGps
          ? 'Real GPS location detected and locked successfully!'
          : 'Using calibrated central demo location.'
      );
    } catch (e: any) {
      showNotification('error', 'Could not read GPS location. Using default.');
    } finally {
      setLocating(false);
    }
  };

  // Form Submission
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await (ambulanceApi as any).createRequest({
        patient_name: patientName,
        contact_phone: contactPhone,
        pickup_address: pickupAddress || `GPS Location (${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)})`,
        emergency_type: emergencyType,
        additional_notes: additionalNotes,
      });

      showNotification('success', 'Emergency assistance request registered! Ambulance dispatch simulated.');
      setPatientName('');
      setContactPhone('');
      setPickupAddress('');
      setAdditionalNotes('');
      setActiveTrackingId(created.id);
      setActiveSubTab('tracking');
      loadTracking(created.id);
    } catch (e: any) {
      showNotification('error', e.message || 'Failed to submit assistance request');
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    setLoading(true);
    try {
      const list = await (ambulanceApi as any).getMyRequests();
      setMyRequests(list);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTracking = async (reqId: string) => {
    setLoading(true);
    try {
      const track = await (ambulanceApi as any).getTracking(reqId);
      setTrackingData(track);
      setActiveTrackingId(reqId);
      // Initialize countdown from ETA minutes
      const initialMinutes = track.eta_minutes || 6;
      setCountdownSeconds(Math.round(initialMinutes * 60));
    } catch (e: any) {
      showNotification('error', e.message || 'Could not load tracking simulation');
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer effect during live tracking
  useEffect(() => {
    if (activeSubTab !== 'tracking' || !trackingData) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 10 ? prev - 1 : 10));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSubTab, trackingData]);

  useEffect(() => {
    if (activeSubTab === 'my-requests') loadMyRequests();
    if (activeSubTab === 'tracking' && activeTrackingId) loadTracking(activeTrackingId);
  }, [activeSubTab]);

  // Derived Distance & Average Timing
  const calculatedDistance = trackingData
    ? calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        trackingData.ambulance_latitude,
        trackingData.ambulance_longitude
      )
    : 2.8;

  const dynamicEtaMinutes = estimateDriveTimeMinutes(calculatedDistance);
  const minutesLeft = Math.floor(countdownSeconds / 60);
  const secondsLeft = countdownSeconds % 60;

  return (
    <div className="space-y-6">
      {/* Prototype Warning Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white p-5 rounded-2xl shadow-lg shadow-rose-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-100">
              Prototype & Simulation Notice — Not for Real Emergencies
            </h3>
            <p className="text-xs text-rose-100/90 mt-0.5 max-w-xl">
              This module demonstrates simulated ambulance dispatch, GPS positioning, and ETA calculation.
              For genuine medical emergencies, call national emergency services immediately.
            </p>
          </div>
        </div>

        {/* 1-Tap SOS Call Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <a
            href="tel:108"
            className="flex-1 sm:flex-initial px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Call 108 (Ambulance)
          </a>
          <a
            href="tel:112"
            className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> 112 (Emergency)
          </a>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex space-x-6 border-b border-slate-200 text-sm font-bold">
        <button
          onClick={() => setActiveSubTab('request')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'request'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" /> Request Emergency Ambulance
        </button>
        <button
          onClick={() => setActiveSubTab('my-requests')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'my-requests'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> My Request History
        </button>
        {activeTrackingId && (
          <button
            onClick={() => setActiveSubTab('tracking')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeSubTab === 'tracking'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Tracking & ETA
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {message.text}
        </div>
      )}

      {/* ─── TAB 1: EMERGENCY REQUEST FORM WITH REAL GPS ─── */}
      {activeSubTab === 'request' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-800">
                Dispatch Request Engine
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Emergency Ambulance Request</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lock your current location, report patient condition, and request nearest emergency vehicle.
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* GPS Location Status Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${userLocation.isRealGps ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`} />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {userLocation.isRealGps ? '📍 Real GPS Location Detected' : '📍 Demo Location Active (Mumbai Hub)'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {userLocation.latitude.toFixed(4)}° N, {userLocation.longitude.toFixed(4)}° E
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              {locating ? 'Acquiring GPS...' : 'Detect Real Location'}
            </button>
          </div>

          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 98201 12233"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Pickup Address / GPS Coordinates *</label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-teal-600" /> Auto-fill My GPS
                </button>
              </div>
              <textarea
                required
                rows={2}
                placeholder="Exact apartment/house number, road, landmark, or GPS coordinates..."
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nature of Emergency *</label>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="General Emergency">General Medical Emergency</option>
                <option value="Cardiac / Chest Pain">Cardiac / Severe Chest Pain</option>
                <option value="Road Accident / Trauma">Road Accident / Physical Trauma</option>
                <option value="Breathing Difficulty">Severe Respiratory Distress</option>
                <option value="Stroke / Neurological">Stroke / Unconsciousness</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Notes / Patient Condition
              </label>
              <textarea
                rows={2}
                placeholder="Consciousness level, bleeding, preexisting conditions..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              {loading ? 'Submitting Emergency Request...' : 'Dispatch Nearest Ambulance (Simulation)'}
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 2: REQUEST HISTORY ─── */}
      {activeSubTab === 'my-requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Your Emergency Request History</h3>
            <button
              onClick={loadMyRequests}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No emergency requests registered</p>
              <span className="text-xs text-slate-400">
                Any requests submitted from this account will appear here with live tracking.
              </span>
            </div>
          ) : (
            myRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        req.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800'
                          : req.status === 'on_the_way'
                          ? 'bg-amber-50 text-amber-800 animate-pulse'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{req.emergency_type}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{req.patient_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {req.pickup_address}
                  </p>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                    Requested: {new Date(req.requested_at).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => {
                    loadTracking(req.id);
                    setActiveSubTab('tracking');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Compass className="w-3.5 h-3.5 text-teal-400" /> Track Ambulance Live
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── TAB 3: SIMULATED LIVE TRACKING, RADAR & ESTIMATED TIME TO ARRIVE (ETA) ─── */}
      {activeSubTab === 'tracking' && trackingData && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-md space-y-6">
          {/* Header & Prominent ETA Card */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  Live Dispatch Radar (Simulation)
                </span>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Signal Active
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-1">Live Ambulance Tracking</h3>
              <p className="text-xs text-slate-500">
                Assigned Unit: <span className="font-bold text-slate-800">{trackingData.vehicle_number}</span> &bull; Ref: <span className="font-mono text-slate-700">{trackingData.request_id}</span>
              </p>
            </div>

            {/* BIG PROMINENT AVERAGE ARRIVAL TIMING (ETA) DISPLAY */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">
                  Estimated Arrival Time (ETA)
                </span>
                <div className="text-2xl font-black tracking-tight mt-0.5">
                  {minutesLeft}m {secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}s
                </div>
                <span className="text-[10px] text-amber-100 font-semibold block">
                  Avg. ~{dynamicEtaMinutes} mins ({formatDistance(calculatedDistance)} away)
                </span>
              </div>

              <button
                onClick={() => activeTrackingId && loadTracking(activeTrackingId)}
                title="Refresh Coordinates"
                className="p-3 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 transition"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tactical High-Tech Interactive Radar / Map Grid */}
          <div className="relative w-full h-80 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden p-6 shadow-inner flex flex-col justify-between">
            {/* Radar Grid Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a10_1px,transparent_1px),linear-gradient(to_bottom,#0f172a10_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

            {/* Radar Sweep Animation Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-teal-500/10 rounded-full animate-ping pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-teal-500/20 rounded-full pointer-events-none"></div>

            {/* Simulated Road Trajectory Path */}
            <div className="absolute left-[28%] top-[38%] w-[45%] h-0.5 bg-gradient-to-r from-rose-500 via-amber-400 to-teal-400 rotate-6 shadow-[0_0_12px_rgba(20,184,166,0.6)]"></div>

            {/* AMBULANCE MARKER (Left / Origin) */}
            <div className="absolute left-[20%] top-[28%] flex flex-col items-center z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 animate-bounce">
                  <Truck className="w-6 h-6" />
                </div>
                <span className="w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 absolute -top-1 -right-1 animate-ping"></span>
              </div>
              <div className="mt-1.5 text-center">
                <span className="text-[11px] font-black bg-slate-900/90 text-white px-2 py-0.5 rounded-lg border border-slate-700 shadow">
                  {trackingData.vehicle_number}
                </span>
                <span className="text-[9px] text-amber-300 font-bold block mt-0.5 font-mono">
                  {trackingData.ambulance_latitude.toFixed(4)}°, {trackingData.ambulance_longitude.toFixed(4)}°
                </span>
              </div>
            </div>

            {/* USER LOCATION MARKER (Right / Destination) */}
            <div className="absolute right-[20%] bottom-[25%] flex flex-col items-center z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/50">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 absolute -top-1 -right-1 animate-ping"></span>
              </div>
              <div className="mt-1.5 text-center">
                <span className="text-[11px] font-black bg-teal-950 text-teal-300 px-2 py-0.5 rounded-lg border border-teal-800 shadow">
                  Your Location
                </span>
                <span className="text-[9px] text-teal-200 font-bold block mt-0.5 font-mono">
                  {userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°
                </span>
              </div>
            </div>

            {/* Real-time Telemetry HUD Pill (Top Left) */}
            <div className="z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-4 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Gauge className="w-3.5 h-3.5" /> 45 km/h
              </div>
              <div className="text-slate-500">|</div>
              <div>Dist: <span className="text-white font-bold">{formatDistance(calculatedDistance)}</span></div>
              <div className="text-slate-500">|</div>
              <div>Status: <span className="text-amber-400 font-bold capitalize">{trackingData.status.replace('_', ' ')}</span></div>
            </div>

            {/* Route Status HUD (Bottom Left) */}
            <div className="z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3.5 py-1.5 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span>Optimal Route: Clear flow via arterial corridor &bull; Demo Simulation</span>
            </div>
          </div>

          {/* Driver & Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                Average Arrival Window
              </span>
              <p className="font-black text-slate-900 mt-1 text-base">
                ~{dynamicEtaMinutes} Minutes
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Estimated for current traffic</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                Distance to Location
              </span>
              <p className="font-black text-teal-700 mt-1 text-base">
                {formatDistance(calculatedDistance)}
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">From nearest active depot</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                Assigned Paramedic Driver
              </span>
              <p className="font-extrabold text-slate-900 mt-1 text-sm">{trackingData.driver_name}</p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Certified ALS Paramedic</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                  Driver Contact
                </span>
                <p className="font-mono font-bold text-slate-900 mt-1 text-sm">{trackingData.driver_phone}</p>
              </div>
              <a
                href={`tel:${trackingData.driver_phone}`}
                className="mt-2 text-center py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition"
              >
                Call Driver Direct
              </a>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 italic">
            {trackingData.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
