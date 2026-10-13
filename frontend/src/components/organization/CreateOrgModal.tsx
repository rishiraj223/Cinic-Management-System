import React, { useState } from 'react';
import { Building2, X, Stethoscope, Building, FlaskConical } from 'lucide-react';
import { api } from '../../services/api';
import type { OrganizationType, OrganizationWithRole } from '../../types/organization';
import { Alert } from '../common/Alert';

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrg: OrganizationWithRole) => void;
}

export const CreateOrgModal: React.FC<CreateOrgModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<OrganizationType>('clinic');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an organization name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newOrg = await api.createOrganization({
        name: name.trim(),
        slug: slug.trim() || undefined,
        type,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      onSuccess(newOrg);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create organization. Please verify input.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add Healthcare Facility</h3>
              <p className="text-xs text-slate-500">Configure a clinic, hospital or laboratory tenant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* Organization Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Facility Classification *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setType('clinic')}
                className={`p-3 rounded-xl border text-left transition flex flex-col items-center text-center gap-1.5 ${
                  type === 'clinic'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <span className="text-xs font-semibold">Local Clinic</span>
                <span className="text-[10px] text-slate-400 leading-tight">Solo practitioner</span>
              </button>

              <button
                type="button"
                onClick={() => setType('hospital')}
                className={`p-3 rounded-xl border text-left transition flex flex-col items-center text-center gap-1.5 ${
                  type === 'hospital'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Building className="w-5 h-5 text-teal-600" />
                <span className="text-xs font-semibold">Hospital</span>
                <span className="text-[10px] text-slate-400 leading-tight">Multi-doctor</span>
              </button>

              <button
                type="button"
                onClick={() => setType('diagnostic_center')}
                className={`p-3 rounded-xl border text-left transition flex flex-col items-center text-center gap-1.5 ${
                  type === 'diagnostic_center'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <FlaskConical className="w-5 h-5 text-teal-600" />
                <span className="text-xs font-semibold">Diagnostic Lab</span>
                <span className="text-[10px] text-slate-400 leading-tight">Pathology center</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Multispecialty Care"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Identifier Slug (optional)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. apex-care (auto-generated if empty)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none text-xs"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Location Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Suite, Street, City"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 00000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@facility.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-teal-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Facility'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
