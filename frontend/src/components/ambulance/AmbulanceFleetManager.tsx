import React, { useState, useEffect } from 'react';
import {
  ambulanceApi,
  type Ambulance,
  type AmbulanceRequest,
} from '../../services/ambulanceApi';
import { Phone, MapPin, Plus } from 'lucide-react';

interface AmbulanceFleetManagerProps {
  orgId: string;
}

export const AmbulanceFleetManager: React.FC<AmbulanceFleetManagerProps> = ({ orgId }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'fleet'>('requests');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [fleet, setFleet] = useState<Ambulance[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Ambulance Form
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Basic');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [serviceArea, setServiceArea] = useState('City Central');

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, ambList] = await Promise.all([
        ambulanceApi.getFacilityRequests(orgId),
        ambulanceApi.getAmbulances(orgId),
      ]);
      setRequests(reqList);
      setFleet(ambList);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ambulanceApi.registerAmbulance(orgId, {
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        driver_name: driverName,
        driver_phone: driverPhone,
        service_area: serviceArea,
        is_available: true,
      });
      setShowAddModal(false);
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to register ambulance');
    }
  };

  const handleUpdateStatus = async (
    reqId: string,
    newStatus: string,
    ambulanceId?: string
  ) => {
    try {
      await ambulanceApi.updateRequestStatus(orgId, reqId, {
        status: newStatus,
        assigned_ambulance_id: ambulanceId,
        eta_minutes: newStatus === 'on_the_way' ? 8.0 : newStatus === 'arrived' ? 0.0 : undefined,
      });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Status update failed');
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ambulance Fleet & Dispatch Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage hospital ambulance fleet, monitor emergency calls, and dispatch units.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" /> Add Ambulance Vehicle
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'requests'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Emergency Dispatch Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'fleet'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Fleet Vehicles ({fleet.length})
        </button>
      </div>

      {loading && <div className="py-8 text-center text-xs text-slate-400">Updating dispatch queue...</div>}

      {/* ─── REQUESTS DISPATCH TABLE ─── */}
      {!loading && activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 font-bold text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left">Patient & Contact</th>
                <th className="px-6 py-3 text-left">Emergency & Address</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Assigned Unit</th>
                <th className="px-6 py-3 text-right">Dispatch Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No active ambulance dispatch calls.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 block">{req.patient_name}</span>
                      <span className="text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {req.contact_phone}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="font-bold text-rose-700 block">{req.emergency_type}</span>
                      <span className="text-slate-600 text-[11px] line-clamp-1 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {req.pickup_address}
                      </span>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">
                      {req.assigned_ambulance?.vehicle_number || (
                        <span className="text-slate-400 font-normal">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'requested' && (
                        <div className="flex justify-end gap-1.5">
                          {fleet.filter((a) => a.is_available).length > 0 ? (
                            <button
                              onClick={() =>
                                handleUpdateStatus(
                                  req.id,
                                  'accepted',
                                  fleet.filter((a) => a.is_available)[0].id
                                )
                              }
                              className="px-2.5 py-1 bg-teal-600 text-white rounded-lg text-[11px] font-bold hover:bg-teal-700"
                            >
                              Accept & Assign
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No Units Free</span>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            className="px-2.5 py-1 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-bold hover:bg-rose-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'on_the_way')}
                          className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold hover:bg-amber-700"
                        >
                          Dispatch (On the Way)
                        </button>
                      )}
                      {req.status === 'on_the_way' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'arrived')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {req.status === 'arrived' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'completed')}
                          className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800"
                        >
                          Complete Transfer
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── FLEET LIST ─── */}
      {!loading && activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fleet.length === 0 ? (
            <div className="col-span-full py-8 text-center bg-white rounded-2xl border text-xs text-slate-400">
              No ambulance vehicles registered in fleet yet.
            </div>
          ) : (
            fleet.map((amb) => (
              <div
                key={amb.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {amb.vehicle_number}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        amb.is_available ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {amb.is_available ? 'Available' : 'Dispatched'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-teal-700 mt-1 block">
                    Type: {amb.vehicle_type}
                  </span>
                  <div className="mt-3 text-xs text-slate-600 space-y-1">
                    <p>Driver: {amb.driver_name || 'Assigned per shift'}</p>
                    <p>Phone: {amb.driver_phone || 'Helpdesk'}</p>
                    <p className="text-slate-400">Zone: {amb.service_area || 'Metropolitan'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Ambulance Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Register Ambulance Vehicle</h3>
            <form onSubmit={handleRegisterAmbulance} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registration #</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-02-CD-5678"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full border rounded-xl p-2 text-sm uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full border rounded-xl p-2 text-sm bg-white"
                >
                  <option value="Basic">Basic Life Support (BLS)</option>
                  <option value="Advanced Cardiac">Advanced Cardiac Life Support (ACLS)</option>
                  <option value="ICU / Mobile Trauma">Mobile ICU / Trauma Unit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Shinde"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full border rounded-xl p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Contact Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 9811223344"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full border rounded-xl p-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Area / Zone</label>
                <input
                  type="text"
                  placeholder="e.g. South Zone / Suburban Sector"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="w-full border rounded-xl p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
