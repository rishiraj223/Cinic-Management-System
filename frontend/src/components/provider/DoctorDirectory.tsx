import React, { useState } from 'react';
import { Stethoscope, Plus, X, Edit } from 'lucide-react';
import { api } from '../../services/api';
import type { DoctorProfile, OrganizationWithRole, StaffMember } from '../../types/organization';
import { Alert } from '../common/Alert';

interface DoctorDirectoryProps {
  currentOrg: OrganizationWithRole;
  doctors: DoctorProfile[];
  members: StaffMember[];
  onRefresh: () => void;
}

export const DoctorDirectory: React.FC<DoctorDirectoryProps> = ({
  currentOrg,
  doctors,
  members,
  onRefresh,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorProfile | null>(null);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [qualifications, setQualifications] = useState('MBBS, MD');
  const [experienceYears, setExperienceYears] = useState(5);
  const [consultationFee, setConsultationFee] = useState(500);
  const [bio, setBio] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingDoctor(null);
    setSelectedUserId(members[0]?.user_id || '');
    setSpecialty('General Medicine');
    setLicenseNumber('');
    setQualifications('MBBS, MD');
    setExperienceYears(5);
    setConsultationFee(500);
    setBio('');
    setIsAvailable(true);
    setIsModalOpen(true);
  };

  const openEditModal = (doc: DoctorProfile) => {
    setEditingDoctor(doc);
    setSelectedUserId(doc.user_id);
    setSpecialty(doc.specialty);
    setLicenseNumber(doc.license_number || '');
    setQualifications(doc.qualifications || '');
    setExperienceYears(doc.experience_years);
    setConsultationFee(doc.consultation_fee);
    setBio(doc.bio || '');
    setIsAvailable(doc.is_available);
    setIsModalOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.saveDoctorProfile(currentOrg.id, {
        user_id: selectedUserId || undefined,
        specialty,
        license_number: licenseNumber || undefined,
        qualifications: qualifications || undefined,
        experience_years: experienceYears,
        consultation_fee: consultationFee,
        bio: bio || undefined,
        is_available: isAvailable,
      });

      setIsModalOpen(false);
      setMessage('Doctor profile saved successfully.');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save doctor profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {currentOrg.type === 'clinic' ? 'Doctor Profile' : 'Doctors & Specialists Roster'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clinical credentials, specialty domains, fees, and consultation availability.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-200"
        >
          <Plus className="w-4 h-4" />
          {currentOrg.type === 'clinic' ? 'Update Doctor Profile' : 'Add Doctor'}
        </button>
      </div>

      {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Doctor Cards */}
      {doctors.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Doctor Profiles Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Configure clinical credentials for practicing doctors to enable appointment scheduling and digital prescriptions.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700 transition"
          >
            Create Doctor Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm shadow-xs">
                      {doc.doctor_name ? doc.doctor_name.charAt(0).toUpperCase() : 'Dr'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{doc.doctor_name || 'Dr. Specialist'}</h3>
                      <p className="text-xs text-teal-700 font-semibold">{doc.specialty}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(doc)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-lg transition"
                    title="Edit Doctor Profile"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Qualifications:</span>
                    <span className="font-semibold text-slate-800">{doc.qualifications || 'MBBS'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Medical License:</span>
                    <span className="font-mono text-slate-800">{doc.license_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Consultation Fee:</span>
                    <span className="font-bold text-slate-900">
                      {currentOrg.settings?.currency || 'INR'} {doc.consultation_fee}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Experience:</span>
                    <span className="text-slate-800">{doc.experience_years} Years</span>
                  </div>
                </div>

                {doc.department_names && doc.department_names.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {doc.department_names.map((dept) => (
                      <span
                        key={dept}
                        className="text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold text-xs ${
                    doc.is_available ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      doc.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  {doc.is_available ? 'Available' : 'Unavailable'}
                </span>
                <span className="text-[11px] text-slate-400">{doc.doctor_email}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create/Edit Doctor Profile */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">
                {editingDoctor ? 'Update Doctor Profile' : 'Add Doctor Credentials'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="p-6 space-y-4">
              {!editingDoctor && isOwner && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Staff Member to Provision as Doctor *
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user_full_name || m.user_email} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Specialty *</label>
                  <input
                    type="text"
                    required
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, General Physician"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Medical License Number</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. MCI-2024-912"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Qualifications</label>
                  <input
                    type="text"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    placeholder="MBBS, MD"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Experience (Yrs)</label>
                  <input
                    type="number"
                    min="0"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fee ({currentOrg.settings?.currency || 'INR'})</label>
                  <input
                    type="number"
                    min="0"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Biography / Clinical Scope</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Doctor's background, clinical areas of interest, achievements..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="avail"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="avail" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Available for Patient Consultations
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Doctor Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
