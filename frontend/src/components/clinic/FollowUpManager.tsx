import React, { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { clinicApi } from '../../services/clinicApi';
import { api } from '../../services/api';
import type { FollowUp, Patient } from '../../types/clinic';
import type { DoctorProfile } from '../../types/organization';

interface FollowUpManagerProps {
  orgId: string;
}

export const FollowUpManager: React.FC<FollowUpManagerProps> = ({ orgId }) => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fus, pts, docs] = await Promise.all([
        clinicApi.getFollowUps(orgId),
        clinicApi.getPatients(orgId),
        api.getDoctors(orgId),
      ]);
      setFollowUps(fus);
      setPatients(pts);
      setDoctors(docs);
      if (pts.length > 0 && !patientId) setPatientId(pts[0].id);
      if (docs.length > 0 && !doctorId) setDoctorId(docs[0].id);
    } catch (err: any) {
      console.error('Failed to load follow-ups', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !followUpDate) return;
    setSubmitting(true);
    try {
      await clinicApi.createFollowUp(orgId, {
        patient_id: patientId,
        doctor_profile_id: doctorId,
        follow_up_date: followUpDate,
        reason,
      });
      setShowModal(false);
      setReason('');
      setFollowUpDate('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error scheduling follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await clinicApi.updateFollowUpStatus(orgId, id, status);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Patient Follow-ups</h2>
          <p className="text-sm text-gray-500">Track and manage recall dates and routine checkups</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Follow-up Date</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">Loading follow-ups...</td>
                </tr>
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">No scheduled follow-ups found.</td>
                </tr>
              ) : (
                followUps.map((fu) => {
                  const pt = patients.find((p) => p.id === fu.patient_id);
                  return (
                    <tr key={fu.id} className="hover:bg-gray-50/80">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {fu.follow_up_date}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">{pt?.full_name || 'Patient'}</td>
                      <td className="py-3.5 px-4 text-gray-600">{fu.reason || 'Routine Checkup'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            fu.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : fu.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {fu.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {fu.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(fu.id, 'completed')}
                              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(fu.id, 'cancelled')}
                              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Schedule Follow-up</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Patient *</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Doctor *</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.specialty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Date *</label>
                <input
                  required
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Suture removal, BP review"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
                >
                  {submitting ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
