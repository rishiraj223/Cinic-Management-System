import React, { useState } from 'react';
import { Users, UserPlus, Trash2, X, Mail, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../../services/api';
import type { MemberRole, MemberStatus, OrganizationWithRole, StaffMember } from '../../types/organization';
import { Alert } from '../common/Alert';

interface StaffManagerProps {
  currentOrg: OrganizationWithRole;
  members: StaffMember[];
  onRefresh: () => void;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  currentOrg,
  members,
  onRefresh,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>(
    currentOrg.type === 'diagnostic_center' ? 'lab_staff' : 'doctor'
  );
  const [statusVal, setStatusVal] = useState<MemberStatus>('active');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await api.addMember(currentOrg.id, {
        email: email.trim(),
        role,
        status: statusVal,
      });

      setEmail('');
      setIsInviteOpen(false);
      setMessage(`Staff member '${email.trim()}' added with role ${role.replace('_', ' ')}.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add staff member.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: MemberRole) => {
    setLoading(true);
    setError(null);

    try {
      await api.updateMember(currentOrg.id, memberId, { role: newRole });
      setMessage('Staff role updated successfully.');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update member role.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (member: StaffMember) => {
    const nextStatus: MemberStatus = member.status === 'active' ? 'suspended' : 'active';
    setLoading(true);
    setError(null);

    try {
      await api.updateMember(currentOrg.id, member.id, { status: nextStatus });
      setMessage(`Member status changed to ${nextStatus}.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update member status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (member: StaffMember) => {
    if (!window.confirm(`Are you sure you want to remove ${member.user_email || 'this member'}?`)) return;

    setLoading(true);
    setError(null);

    try {
      await api.deleteMember(currentOrg.id, member.id);
      setMessage('Staff member removed.');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Staff & Role-Based Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization members, doctors, receptionists, and lab personnel.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-200"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            Team Members ({members.length})
          </span>
          <span className="text-[11px] text-slate-400">Scoped strictly to this facility</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Member Name & Email</th>
                <th className="py-3 px-4">Role Assignment</th>
                <th className="py-3 px-4">Membership Status</th>
                <th className="py-3 px-4">Joined Date</th>
                {isOwner && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((mem) => (
                <tr key={mem.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{mem.user_full_name || 'Staff Member'}</p>
                    <p className="text-slate-400 text-[11px]">{mem.user_email}</p>
                  </td>

                  <td className="py-3 px-4">
                    {isOwner ? (
                      <select
                        value={mem.role}
                        onChange={(e) => handleUpdateRole(mem.id, e.target.value as MemberRole)}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-700"
                      >
                        <option value="organization_owner">Organization Owner</option>
                        <option value="doctor">Doctor</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="lab_staff">Lab Staff</option>
                      </select>
                    ) : (
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold capitalize">
                        {mem.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        mem.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : mem.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {mem.status === 'active' && <CheckCircle className="w-3 h-3" />}
                      {mem.status === 'pending' && <Clock className="w-3 h-3" />}
                      {mem.status === 'suspended' && <AlertTriangle className="w-3 h-3" />}
                      {mem.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(mem.created_at).toLocaleDateString()}
                  </td>

                  {isOwner && (
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(mem)}
                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 rounded-md hover:bg-slate-200 transition"
                      >
                        {mem.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteMember(mem)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Staff Member */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Add Staff Member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@healthcare.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="doctor">Doctor — Clinical workflows & consultations</option>
                  <option value="receptionist">Receptionist — Appointments & front desk</option>
                  <option value="lab_staff">Lab Staff — Test orders & sample tracking</option>
                  <option value="organization_owner">Organization Owner — Full facility control</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Initial Status</label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as MemberStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="active">Active (Immediate access)</option>
                  <option value="pending">Pending (Awaiting onboarding confirmation)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
