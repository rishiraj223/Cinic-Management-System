import React from 'react';
import {
  LayoutDashboard,
  Building,
  Users,
  Stethoscope,
  FlaskConical,
  Settings,
  Calendar,
  ClipboardList,
  FileText,
  CreditCard,
  TestTube2,
  Sparkles,
} from 'lucide-react';
import type { OrganizationWithRole } from '../../types/organization';

export type ProviderActiveView =
  | 'dashboard'
  | 'departments'
  | 'doctors'
  | 'service-categories'
  | 'staff'
  | 'settings'
  | 'patients'
  | 'appointments'
  | 'queue'
  | 'prescriptions'
  | 'billing'
  | 'followups'
  | 'reports'
  | 'lab-management'
  | 'hospital-operations'
  | 'placeholder-appointments'
  | 'placeholder-patients'
  | 'placeholder-prescriptions'
  | 'placeholder-billing'
  | 'placeholder-lab-orders'
  | 'placeholder-sample-tracking';

interface SidebarProps {
  currentOrg: OrganizationWithRole;
  activeView: ProviderActiveView;
  onSelectView: (view: ProviderActiveView) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentOrg,
  activeView,
  onSelectView,
  isOpen,
  onCloseMobile,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';
  const orgType = currentOrg.type;

  const handleNav = (view: ProviderActiveView) => {
    onSelectView(view);
    onCloseMobile();
  };

  const formatRole = (role: string) => {
    return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Facility Info Card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                orgType === 'clinic'
                  ? 'bg-teal-100 text-teal-800'
                  : orgType === 'hospital'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {orgType === 'clinic'
                ? 'Local Clinic'
                : orgType === 'hospital'
                ? 'Hospital Center'
                : 'Diagnostic Lab'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200/80 rounded text-slate-700 font-semibold">
              {formatRole(currentOrg.current_user_role)}
            </span>
          </div>
          <h2 className="font-bold text-sm text-slate-900 truncate" title={currentOrg.name}>
            {currentOrg.name}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            {currentOrg.city ? `${currentOrg.city}, ${currentOrg.state || ''}` : 'Facility Workspace'}
          </p>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Main Workflows */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
              Provider Workflows
            </p>

            {/* Dashboard Overview */}
            <button
              onClick={() => handleNav('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeView === 'dashboard'
                  ? 'bg-teal-50 text-teal-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-teal-600 shrink-0" />
              Facility Overview
            </button>

            {/* Hospital: Departments */}
            {orgType === 'hospital' && (
              <button
                onClick={() => handleNav('departments')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'departments'
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Building className="w-4 h-4 text-blue-600 shrink-0" />
                Hospital Departments
              </button>
            )}

            {/* Clinic & Hospital: Doctors Directory */}
            {(orgType === 'clinic' || orgType === 'hospital') && (
              <button
                onClick={() => handleNav('doctors')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'doctors'
                    ? 'bg-teal-50 text-teal-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                {orgType === 'clinic' ? 'Doctor Profile' : 'Doctors Directory'}
              </button>
            )}

            {/* Diagnostic Lab: Service Categories */}
            {orgType === 'diagnostic_center' && (
              <button
                onClick={() => handleNav('service-categories')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'service-categories'
                    ? 'bg-amber-50 text-amber-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
                Test Service Categories
              </button>
            )}

            {/* Staff & Members (Only for Owner) */}
            {isOwner && (
              <button
                onClick={() => handleNav('staff')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'staff'
                    ? 'bg-teal-50 text-teal-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-teal-600 shrink-0" />
                Staff & Roles
              </button>
            )}

            {/* Facility Settings */}
            <button
              onClick={() => handleNav('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeView === 'settings'
                  ? 'bg-teal-50 text-teal-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-500 shrink-0" />
              Facility Settings
            </button>
          </div>

          {/* Planned Healthcare Modules (Explicitly marked Coming in Phase 3/4) */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <p className="px-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Later Healthcare Phases
            </p>

            {(orgType === 'clinic' || orgType === 'hospital') && (
              <>
                <button
                  onClick={() => handleNav('patients')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeView === 'patients'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-emerald-600 shrink-0" />
                  Patients (EMR)
                </button>

                <button
                  onClick={() => handleNav('appointments')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeView === 'appointments'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  Appointments
                </button>

                <button
                  onClick={() => handleNav('queue')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeView === 'queue'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-600 shrink-0" />
                  Walk-in Queue
                </button>

                <button
                  onClick={() => handleNav('prescriptions')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeView === 'prescriptions'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                  Prescriptions (PDF)
                </button>

                <button
                  onClick={() => handleNav('billing')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeView === 'billing'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  Billing & Receipts
                </button>

                <button
                  onClick={() => handleNav('followups')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeView === 'followups'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  Follow-ups
                </button>

                <button
                  onClick={() => handleNav('reports')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeView === 'reports'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-600 shrink-0" />
                  Clinic Reports
                </button>
              </>
            )}

            {orgType === 'hospital' && (
              <button
                onClick={() => handleNav('hospital-operations')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'hospital-operations'
                    ? 'bg-indigo-50 text-indigo-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                Hospital Operations
              </button>
            )}

            {orgType === 'diagnostic_center' && (
              <button
                onClick={() => handleNav('lab-management')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'lab-management'
                    ? 'bg-indigo-50 text-indigo-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <TestTube2 className="w-4 h-4 text-indigo-600 shrink-0" />
                Laboratory & Diagnostics
              </button>
            )}
          </div>
        </div>

        {/* Security Isolation Status Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">Tenant Isolated (RLS Active)</span>
        </div>
      </aside>
    </>
  );
};
