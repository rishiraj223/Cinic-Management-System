import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, CheckCircle2 } from 'lucide-react';
import { clinicApi } from '../../services/clinicApi';
import type { Patient, PatientCreateInput } from '../../types/clinic';

interface PatientManagerProps {
  orgId: string;
}

export const PatientManager: React.FC<PatientManagerProps> = ({ orgId }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState<PatientCreateInput>({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: 'male',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    allergies: '',
    blood_group: 'O+',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const data = await clinicApi.getPatients(orgId, searchTerm);
      setPatients(data);
    } catch (err: any) {
      console.error('Failed to load patients', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [orgId, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await clinicApi.createPatient(orgId, formData);
      setMessage('Patient successfully registered!');
      setShowModal(false);
      setFormData({
        full_name: '',
        phone: '',
        date_of_birth: '',
        gender: 'male',
        email: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        allergies: '',
        blood_group: 'O+',
      });
      loadPatients();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error registering patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Patient Directory</h2>
          <p className="text-sm text-gray-500">Manage patient records and registrations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Register Patient
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search patients by name, code, or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Patient Code</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Gender & DOB</th>
                <th className="py-3.5 px-4">Blood Group</th>
                <th className="py-3.5 px-4">Allergies</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">Loading patients...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">No patients found.</td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-700">{p.patient_code}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">{p.full_name}</td>
                    <td className="py-3.5 px-4 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{p.phone}</td>
                    <td className="py-3.5 px-4 capitalize">{p.gender || 'N/A'} {p.date_of_birth ? `(${p.date_of_birth})` : ''}</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">{p.blood_group || 'N/A'}</span></td>
                    <td className="py-3.5 px-4 text-xs text-amber-700">{p.allergies || 'None'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPatient(p)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Patient Profile: {selectedPatient.full_name}</h3>
            <p className="text-xs font-mono text-emerald-600 mb-4">{selectedPatient.patient_code}</p>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><span className="text-gray-400 block text-xs">Phone</span>{selectedPatient.phone}</div>
              <div><span className="text-gray-400 block text-xs">Email</span>{selectedPatient.email || 'None'}</div>
              <div><span className="text-gray-400 block text-xs">Blood Group</span>{selectedPatient.blood_group || 'N/A'}</div>
              <div><span className="text-gray-400 block text-xs">Allergies</span>{selectedPatient.allergies || 'None'}</div>
              <div className="col-span-2"><span className="text-gray-400 block text-xs">Address</span>{selectedPatient.address || 'None'}</div>
              <div><span className="text-gray-400 block text-xs">Emergency Contact</span>{selectedPatient.emergency_contact_name || 'N/A'}</div>
              <div><span className="text-gray-400 block text-xs">Emergency Phone</span>{selectedPatient.emergency_contact_phone || 'N/A'}</div>
            </div>
            <button
              onClick={() => setSelectedPatient(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Register New Patient</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                  {submitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
