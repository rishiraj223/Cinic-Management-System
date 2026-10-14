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
} from 'lucide-react';

export const EmergencyAmbulanceView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'request' | 'my-requests' | 'tracking'>('request');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [emergencyType, setEmergencyType] = useState('General Emergency');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Requests History
  const [myRequests, setMyRequests] = useState<AmbulanceRequest[]>([]);
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<AmbulanceSimulatedTracking | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await (ambulanceApi as any).createRequest({
        patient_name: patientName,
        contact_phone: contactPhone,
        pickup_address: pickupAddress,
        emergency_type: emergencyType,
        additional_notes: additionalNotes,
      });

      showNotification('success', 'Emergency assistance request registered! Simulation active.');
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
    } catch (e: any) {
      showNotification('error', e.message || 'Could not load tracking simulation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'my-requests') loadMyRequests();
    if (activeSubTab === 'tracking' && activeTrackingId) loadTracking(activeTrackingId);
  }, [activeSubTab]);

  return (
    <div className="space-y-6">
      {/* Critical Mandatory Prototype Disclaimer */}
      <div className="bg-rose-600 text-white p-5 rounded-2xl shadow-lg shadow-rose-900/10 flex items-start gap-4">
        <AlertTriangle className="w-8 h-8 shrink-0 text-amber-300 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <h3 className="font-black text-base uppercase tracking-wider">
            Important Medical Prototype & Safety Disclaimer
          </h3>
          <p className="text-xs text-rose-100 leading-relaxed">
            This module is a demonstration prototype with <strong>simulated GPS movement and mock dispatch data</strong>. 
            It is <strong>NOT</strong> connected to real municipal or national ambulance services. 
            If you or someone nearby is experiencing a life-threatening medical emergency, please dial your local emergency hotline immediately: 
            <strong> 112 (India/EU) &bull; 911 (US) &bull; 108 (India Emergency Ambulance)</strong>.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveSubTab('request')}
          className={`pb-3 border-b-2 transition ${
            activeSubTab === 'request'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Request Emergency Ambulance
        </button>
        <button
          onClick={() => setActiveSubTab('my-requests')}
          className={`pb-3 border-b-2 transition ${
            activeSubTab === 'my-requests'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Request History
        </button>
        {activeTrackingId && (
          <button
            onClick={() => setActiveSubTab('tracking')}
            className={`pb-3 border-b-2 transition ${
              activeSubTab === 'tracking'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Live Tracking Simulation
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ─── TAB 1: EMERGENCY REQUEST FORM ─── */}
      {activeSubTab === 'request' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Emergency Ambulance Assistance</h2>
            <p className="text-xs text-slate-500 mt-1">
              Provide incident location, patient status, and contact phone number.
            </p>
          </div>

          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9820123456"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pickup Address / Landmark</label>
              <textarea
                required
                rows={2}
                placeholder="Exact building, apartment number, street name, and prominent landmark..."
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nature of Emergency</label>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm font-semibold bg-white text-slate-800"
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
                Additional Instructions for Paramedics (Optional)
              </label>
              <input
                type="text"
                placeholder="Gate code, floor, oxygen requirement..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-xl transition shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Truck className="w-5 h-5" />
              {loading ? 'Submitting Request...' : 'Submit Emergency Request (Simulation)'}
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 2: MY REQUESTS ─── */}
      {activeSubTab === 'my-requests' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">My Ambulance Request History</h2>
          {myRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              No previous emergency requests recorded.
            </div>
          ) : (
            myRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        req.status === 'arrived' || req.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800'
                          : req.status === 'on_the_way' || req.status === 'accepted'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{req.emergency_type}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{req.patient_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {req.pickup_address}
                  </p>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                    Requested: {new Date(req.requested_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      loadTracking(req.id);
                      setActiveSubTab('tracking');
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5 text-teal-400" /> Track Simulation
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── TAB 3: SIMULATED TRACKING VIEW ─── */}
      {activeSubTab === 'tracking' && trackingData && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Mock Dispatch Engine
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">Live Ambulance Tracking</h3>
              <p className="text-xs text-slate-500">
                Tracking Request Ref: <span className="font-mono text-slate-700">{trackingData.request_id}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => activeTrackingId && loadTracking(activeTrackingId)}
                className="px-3 py-1.5 border rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1 hover:bg-slate-50"
              >
                <RotateCw className="w-3.5 h-3.5" /> Refresh Coordinates
              </button>
              <div className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-extrabold">
                ETA: ~{trackingData.eta_minutes.toFixed(0)} mins
              </div>
            </div>
          </div>

          {/* Simulated Map Representation Graphic */}
          <div className="relative w-full h-64 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-6">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>

            {/* Simulated Road Path */}
            <div className="absolute w-3/4 h-1 border-t-2 border-dashed border-teal-500/60 rotate-12"></div>

            {/* Ambulance Marker */}
            <div className="absolute left-1/4 top-1/3 flex flex-col items-center animate-bounce">
              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/40">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full mt-1 shadow">
                {trackingData.vehicle_number}
              </span>
            </div>

            {/* Destination Marker */}
            <div className="absolute right-1/4 bottom-1/4 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/40">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black bg-teal-900 text-white px-2 py-0.5 rounded-full mt-1 shadow">
                Pickup Location
              </span>
            </div>

            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border text-[11px] font-bold text-slate-600">
              Simulated Coordinates: {trackingData.ambulance_latitude.toFixed(4)}, {trackingData.ambulance_longitude.toFixed(4)}
            </div>
          </div>

          {/* Driver & Status Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl">
              <span className="font-bold text-slate-400 uppercase">Dispatch Status</span>
              <p className="font-extrabold text-slate-900 mt-1 capitalize text-sm">
                {trackingData.status.replace('_', ' ')}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <span className="font-bold text-slate-400 uppercase">Assigned Paramedic Driver</span>
              <p className="font-extrabold text-slate-900 mt-1 text-sm">{trackingData.driver_name}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <span className="font-bold text-slate-400 uppercase">Emergency Contact Phone</span>
              <p className="font-extrabold text-slate-900 mt-1 text-sm font-mono">{trackingData.driver_phone}</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t pt-4 italic">
            {trackingData.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
