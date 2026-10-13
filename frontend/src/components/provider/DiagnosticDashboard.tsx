import React from 'react';
import {
  FlaskConical,
  TestTube2,
  Users,
  ShieldCheck,
  ClipboardList,
  FileCheck,
  CreditCard,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { OrganizationWithRole, ServiceCategory, StaffMember } from '../../types/organization';
import type { ProviderActiveView } from '../common/Sidebar';

interface DiagnosticDashboardProps {
  currentOrg: OrganizationWithRole;
  serviceCategories: ServiceCategory[];
  members: StaffMember[];
  onNavigate: (view: ProviderActiveView) => void;
}

export const DiagnosticDashboard: React.FC<DiagnosticDashboardProps> = ({
  currentOrg,
  serviceCategories,
  members,
  onNavigate,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';
  const isLabStaff = currentOrg.current_user_role === 'lab_staff';

  const labStaffMembers = members.filter((m) => m.role === 'lab_staff');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Diagnostic & Pathology Lab Mode
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{currentOrg.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentOrg.address || 'Diagnostics Center'}, {currentOrg.city || ''} {currentOrg.state || ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isOwner || isLabStaff) && (
            <button
              onClick={() => onNavigate('service-categories')}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl transition border border-amber-200 flex items-center gap-1.5"
            >
              <FlaskConical className="w-4 h-4" />
              Configure Service Categories
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Active Test Categories</span>
            <FlaskConical className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{serviceCategories.length}</p>
          <p className="text-xs text-slate-500">Pathology & Radiology Menus</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Authorized Lab Staff</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{labStaffMembers.length}</p>
          <p className="text-xs text-slate-500">Certified Pathologists & Techs</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Sample Security</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-base font-bold text-slate-900">RLS Enforced</p>
          <p className="text-xs text-emerald-600">Patient Results Confidential</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Sample Collection</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-base font-bold text-slate-900">07:00 - 20:00</p>
          <p className="text-xs text-slate-500">Walk-in & Home Collection</p>
        </div>
      </div>

      {/* Main Grid: Active Service Categories & Authorized Technicians */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Categories Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-600" />
              Service Categories ({serviceCategories.length})
            </h3>
            <button
              onClick={() => onNavigate('service-categories')}
              className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {serviceCategories.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <p>No test categories configured yet.</p>
              <button
                onClick={() => onNavigate('service-categories')}
                className="mt-2 text-amber-700 font-semibold hover:underline"
              >
                + Add Service Category
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {serviceCategories.slice(0, 5).map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{cat.name}</h4>
                    <p className="text-slate-500 text-[11px]">{cat.description || 'Laboratory test category'}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-medium text-[11px]">
                    {cat.sample_type || 'Specimen'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Authorized Lab Staff */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Laboratory Staff & Technicians
            </h3>
            {isOwner && (
              <button
                onClick={() => onNavigate('staff')}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                Manage Staff <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <p className="text-center py-6 text-slate-400 text-xs">No team members registered yet.</p>
          ) : (
            <div className="space-y-2.5">
              {members.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{mem.user_full_name || 'Staff Member'}</h4>
                    <p className="text-slate-500 text-[11px]">{mem.user_email}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono text-[11px] capitalize">
                    {mem.role.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Planned Lab Processing Workflows (Phase 4) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Diagnostic Workflows
          </h3>
          <span className="text-[11px] text-slate-400">Scheduled for Phase 4</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('placeholder-lab-orders')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <TestTube2 className="w-5 h-5 text-amber-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Test Catalogue Menu</h4>
              <p className="text-[10px] text-slate-500">Test pricing, TAT & codes</p>
            </div>
            <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Coming in Phase 4
            </span>
          </button>

          <button
            onClick={() => onNavigate('placeholder-sample-tracking')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <ClipboardList className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Specimen Tracking</h4>
              <p className="text-[10px] text-slate-500">Barcode & sample lifecycle</p>
            </div>
            <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Coming in Phase 4
            </span>
          </button>

          <button
            onClick={() => onNavigate('placeholder-lab-orders')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <FileCheck className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Report Entry & Sign-off</h4>
              <p className="text-[10px] text-slate-500">Pathologist authentication</p>
            </div>
            <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Coming in Phase 4
            </span>
          </button>

          <button
            onClick={() => onNavigate('placeholder-billing')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <CreditCard className="w-5 h-5 text-teal-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Lab Invoicing</h4>
              <p className="text-[10px] text-slate-500">Bills, receipts & insurance</p>
            </div>
            <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Coming in Phase 4
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
