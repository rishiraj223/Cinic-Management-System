import React from 'react';
import {
  Building2,
  Stethoscope,
  Building,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Users,
  Settings,
  Server,
  Database,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { OrganizationWithRole } from '../types/organization';

interface DashboardPageProps {
  currentOrg: OrganizationWithRole | null;
  organizations: OrganizationWithRole[];
  onSelectOrg: (org: OrganizationWithRole) => void;
  onOpenCreateOrg: () => void;
  backendHealth: any;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentOrg,
  organizations,
  onSelectOrg,
  onOpenCreateOrg,
  backendHealth,
}) => {
  const { profile, user } = useAuth();

  const getOrgTypeIcon = (type?: string) => {
    switch (type) {
      case 'clinic':
        return <Stethoscope className="w-5 h-5 text-teal-600" />;
      case 'hospital':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'diagnostic_center':
        return <FlaskConical className="w-5 h-5 text-amber-600" />;
      default:
        return <Building2 className="w-5 h-5 text-slate-600" />;
    }
  };

  const getOrgTypeBadge = (type?: string) => {
    switch (type) {
      case 'clinic':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
            Local Clinic
          </span>
        );
      case 'hospital':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Multispecialty Hospital
          </span>
        );
      case 'diagnostic_center':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Diagnostic & Lab
          </span>
        );
      default:
        return null;
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return 'Member';
    return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Welcome */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-teal-600 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            Healthcare Provider Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile?.full_name || 'Practitioner'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Logged in as <span className="font-mono text-slate-700">{user?.email}</span>
            {profile?.is_platform_admin && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                Platform Admin
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateOrg}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition shadow-sm shadow-teal-200"
          >
            <Plus className="w-4 h-4" />
            Create Facility
          </button>
        </div>
      </div>

      {/* Main Grid: Active Facility Overview + System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Organization Details */}
        <div className="lg:col-span-2 space-y-6">
          {currentOrg ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-6">
              {/* Facility Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {getOrgTypeIcon(currentOrg.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900">{currentOrg.name}</h2>
                      {getOrgTypeBadge(currentOrg.type)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      Slug: {currentOrg.slug} &bull; ID: {currentOrg.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Your Permissions
                  </span>
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {formatRole(currentOrg.current_user_role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Facility Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                    <Clock className="w-4 h-4 text-teal-600" />
                    Timezone
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {currentOrg.settings?.timezone || 'UTC'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                    <DollarSign className="w-4 h-4 text-teal-600" />
                    Billing Currency
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {currentOrg.settings?.currency || 'INR'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Tenant Isolation
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Enforced
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="text-sm space-y-1.5 pt-2">
                <p className="text-slate-600">
                  <strong className="text-slate-700">Address:</strong>{' '}
                  {currentOrg.address || 'Not specified'}
                </p>
                <p className="text-slate-600">
                  <strong className="text-slate-700">Phone:</strong>{' '}
                  {currentOrg.phone || 'Not specified'}
                </p>
                <p className="text-slate-600">
                  <strong className="text-slate-700">Email:</strong>{' '}
                  {currentOrg.email || 'Not specified'}
                </p>
              </div>

              {/* Phase 2 Teaser */}
              <div className="mt-4 p-4 rounded-xl bg-teal-50/50 border border-teal-100 flex items-start gap-3 text-xs text-teal-900">
                <Settings className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">Phase 1 Foundation Active</strong>
                  Provider dashboards (Local Clinic queue, Hospital multi-doctor schedules, and Diagnostic Lab catalogs) will hook into this authenticated tenant shell in Phase 2.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-200/80 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Healthcare Facilities Found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                You are currently not associated with any healthcare facility. Create your clinic, hospital, or diagnostic lab to begin.
              </p>
              <button
                onClick={onOpenCreateOrg}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                Register First Facility
              </button>
            </div>
          )}

          {/* All Associated Facilities */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Your Accessible Facilities ({organizations.length})
              </h3>
            </div>

            {organizations.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No facilities registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => onSelectOrg(org)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition flex items-start justify-between ${
                      currentOrg?.id === org.id
                        ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {getOrgTypeIcon(org.type)}
                        <h4 className="font-semibold text-sm text-slate-900">{org.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 capitalize">{org.type.replace('_', ' ')}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {formatRole(org.current_user_role)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Platform Architecture & Health */}
        <div className="space-y-6">
          {/* System Health Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-teal-600" />
              Platform Diagnostics
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-slate-400" /> FastAPI Backend
                </span>
                <span className={`font-semibold ${backendHealth?.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {backendHealth?.status || 'Connecting...'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-slate-400" /> Database Connection
                </span>
                <span className={`font-semibold ${backendHealth?.database === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {backendHealth?.database || 'Pending'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Supabase Auth
                </span>
                <span className="text-emerald-600 font-semibold">Active Session</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Row-Level Security
                </span>
                <span className="text-emerald-600 font-semibold">Enabled (RLS)</span>
              </div>
            </div>
          </div>

          {/* Role-Based Access Control Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Configured Roles
            </h3>
            <p className="text-xs text-slate-500">
              Each user's permissions are scoped strictly per organization:
            </p>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <strong>Organization Owner:</strong> Full facility control
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <strong>Doctor:</strong> Clinical workflows & prescriptions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <strong>Receptionist:</strong> Appointments & queues
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <strong>Lab Staff:</strong> Test catalogue & specimens
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
