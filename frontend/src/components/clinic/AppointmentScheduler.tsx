import React, { useState, useEffect } from 'react';
import { Clock, Plus } from 'lucide-react';
import { clinicApi } from '../../services/clinicApi';
import { api } from '../../services/api';
import type { Appointment, AppointmentCreateInput, Patient } from '../../types/clinic';
import type { DoctorProfile } from '../../types/organization';

interface AppointmentSchedulerProps {
  orgId: string;
}

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({ orgId }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState<AppointmentCreateInput>({
    patient_id: '',
    doctor_profile_id: '',
    appointment_date: selectedDate,
    start_time: '10:00',
    end_time: '10:30',
    appointment_type: 'consultation',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appts, pts, docs] = await Promise.all([
        clinicApi.getAppointments(orgId, selectedDate),
        clinicApi.getPatients(orgId),
        api.getDoctors(orgId),
      ]);
      setAppointments(appts);
      setPatients(pts);
      setDoctors(docs);
      if (docs.length > 0 && !formData.doctor_profile_id) {
        setFormData((prev) => ({ ...prev, doctor_profile_id: docs[0].id }));
      }
      if (pts.length > 0 && !formData.patient_id) {
        setFormData((prev) => ({ ...prev, patient_id: pts[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load appointments data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, selectedDate]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await clinicApi.updateAppointmentStatus(orgId, id, newStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await clinicApi.createAppointment(orgId, {
        ...formData,
        appointment_date: selectedDate,
      });
      setShowModal(false);
      setFormData({
        patient_id: patients[0]?.id || '',
        doctor_profile_id: doctors[0]?.id || '',
        appointment_date: selectedDate,
        start_time: '10:00',
        end_time: '10:30',
        appointment_type: 'consultation',
        reason: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Conflict or error creating appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
      confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      checked_in: 'bg-amber-50 text-amber-700 border-amber-200',
      in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
      no_show: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-600'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Appointment Management</h2>
          <p className="text-sm text-gray-500">Schedule appointments and manage daily consultations</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium text-gray-800"
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 font-medium text-gray-700 flex justify-between items-center">
          <span>Appointments for {selectedDate}</span>
          <span className="text-xs text-gray-500">{appointments.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Loading schedule...</td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No appointments scheduled for this date.</td>
                </tr>
              ) : (
                appointments.map((appt) => {
                  const pt = patients.find((p) => p.id === appt.patient_id);
                  return (
                    <tr key={appt.id} className="hover:bg-gray-50/80">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {appt.start_time} - {appt.end_time}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {pt?.full_name || 'Patient ID: ' + appt.patient_id.substring(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 capitalize">{appt.appointment_type}</td>
                      <td className="py-3.5 px-4 text-gray-500">{appt.reason || 'Routine Checkup'}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(appt.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {appt.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusChange(appt.id, 'confirmed')}
                              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded"
                            >
                              Confirm
                            </button>
                          )}
                          {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                            <button
                              onClick={() => handleStatusChange(appt.id, 'checked_in')}
                              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded"
                            >
                              Check-In
                            </button>
                          )}
                          {appt.status === 'checked_in' && (
                            <button
                              onClick={() => handleStatusChange(appt.id, 'completed')}
                              className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 rounded"
                            >
                              Complete
                            </button>
                          )}
                          {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusChange(appt.id, 'cancelled')}
                              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Book New Appointment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Doctor *</label>
                <select
                  required
                  value={formData.doctor_profile_id}
                  onChange={(e) => setFormData({ ...formData, doctor_profile_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.specialty} (Fee: ₹{d.consultation_fee})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    required
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    required
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Visit</label>
                <input
                  type="text"
                  placeholder="e.g. Follow-up, Fever, Consultation"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
