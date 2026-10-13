import React, { useState } from 'react';
import { Save, Clock, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import type { OrganizationWithRole } from '../../types/organization';
import { Alert } from '../common/Alert';

interface FacilitySettingsViewProps {
  currentOrg: OrganizationWithRole;
  onRefresh: () => void;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const FacilitySettingsView: React.FC<FacilitySettingsViewProps> = ({
  currentOrg,
  onRefresh,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';

  // Organization profile
  const [name, setName] = useState(currentOrg.name);
  const [address, setAddress] = useState(currentOrg.address || '');
  const [city, setCity] = useState(currentOrg.city || '');
  const [state, setState] = useState(currentOrg.state || '');
  const [postalCode, setPostalCode] = useState(currentOrg.postal_code || '');
  const [phone, setPhone] = useState(currentOrg.phone || '');
  const [email, setEmail] = useState(currentOrg.email || '');

  // Operational Settings
  const [timezone, setTimezone] = useState(currentOrg.settings?.timezone || 'Asia/Kolkata');
  const [currency, setCurrency] = useState(currentOrg.settings?.currency || 'INR');
  const [hours, setHours] = useState<Record<string, any>>(
    currentOrg.settings?.operating_hours || {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true },
    }
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleHourChange = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { open: '09:00', close: '18:00', closed: false }),
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // 1. Update facility profile
      await api.updateOrganization(currentOrg.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      // 2. Update operational settings
      await api.updateOrganizationSettings(currentOrg.id, {
        timezone,
        currency,
        operating_hours: hours,
      });

      setMessage('Facility profile and operational settings saved successfully.');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Facility Profile & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage physical address, operating schedule, currency, and timezone configurations.
        </p>
      </div>

      {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Physical Address & Contact Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-teal-600" />
            Facility Contact & Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Facility Name *</label>
              <input
                type="text"
                required
                disabled={!isOwner}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                disabled={!isOwner}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Suite, building number, street..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                disabled={!isOwner}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">State / Province</label>
              <input
                type="text"
                disabled={!isOwner}
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Postal Code</label>
              <input
                type="text"
                disabled={!isOwner}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                disabled={!isOwner}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                disabled={!isOwner}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours & Localization Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-teal-600" />
            Operating Schedule & Billing Localization
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Operating Timezone</label>
              <select
                disabled={!isOwner}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Invoicing Currency</label>
              <select
                disabled={!isOwner}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              >
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
              </select>
            </div>
          </div>

          {/* Weekly Hours Table */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Weekly Consultation Hours
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedule = hours[day] || { open: '09:00', close: '18:00', closed: false };
                return (
                  <div key={day} className="p-3 bg-white flex items-center justify-between text-xs gap-4">
                    <span className="capitalize font-semibold text-slate-800 w-28">{day}</span>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          disabled={!isOwner || daySchedule.closed}
                          value={daySchedule.open || '09:00'}
                          onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-xs disabled:opacity-40"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          disabled={!isOwner || daySchedule.closed}
                          value={daySchedule.close || '18:00'}
                          onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-xs disabled:opacity-40"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer ml-3 text-slate-600">
                        <input
                          type="checkbox"
                          disabled={!isOwner}
                          checked={daySchedule.closed || false}
                          onChange={(e) => handleHourChange(day, 'closed', e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Closed</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isOwner && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving Changes...' : 'Save Facility Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
