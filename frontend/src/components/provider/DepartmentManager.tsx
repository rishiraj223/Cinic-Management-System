import React, { useState } from 'react';
import { Building, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { api } from '../../services/api';
import type { Department, DoctorProfile, OrganizationWithRole } from '../../types/organization';
import { Alert } from '../common/Alert';

interface DepartmentManagerProps {
  currentOrg: OrganizationWithRole;
  departments: Department[];
  doctors: DoctorProfile[];
  onRefresh: () => void;
}

export const DepartmentManager: React.FC<DepartmentManagerProps> = ({
  currentOrg,
  departments,
  doctors,
  onRefresh,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDeptForDoc, setSelectedDeptForDoc] = useState<Department | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await api.createDepartment(currentOrg.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      setIsCreateOpen(false);
      setMessage(`Department '${name.trim()}' created successfully.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create department.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptForDoc || !selectedDoctorId) return;

    setLoading(true);
    setError(null);

    try {
      await api.assignDoctorDepartment(currentOrg.id, selectedDeptForDoc.id, selectedDoctorId);
      setSelectedDeptForDoc(null);
      setSelectedDoctorId('');
      setMessage('Doctor assigned to department successfully.');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to assign doctor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!window.confirm(`Are you sure you want to delete department '${deptName}'?`)) return;

    setLoading(true);
    setError(null);

    try {
      await api.deleteDepartment(currentOrg.id, deptId);
      setMessage(`Department '${deptName}' removed.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete department.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Hospital Departments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage clinical and surgical departments and assign consultant specialists.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Departments Grid */}
      {departments.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
          <Building className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Departments Established</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Departments allow you to organize physicians, beds, and diagnostic reporting by specialty.
          </p>
          {isOwner && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Create First Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{dept.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dept.doctor_count} Consultant{dept.doctor_count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {dept.description || 'Specialized clinical hospital department.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-medium">Status: Active</span>
                {isOwner && (
                  <button
                    onClick={() => setSelectedDeptForDoc(dept)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign Doctor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Department */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Add Clinical Department</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDepartment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cardiology, Neurology, Pediatrics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of clinical scope..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Doctor */}
      {selectedDeptForDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">
                Assign Doctor to {selectedDeptForDoc.name}
              </h3>
              <button onClick={() => setSelectedDeptForDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAssignDoctor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Doctor *</label>
                {doctors.length === 0 ? (
                  <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded-lg">
                    No doctor profiles found. Add a doctor profile in the Doctor Directory first.
                  </p>
                ) : (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.doctor_name || 'Dr.'} — {doc.specialty}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDeptForDoc(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedDoctorId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign to Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
