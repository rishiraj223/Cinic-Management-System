import React from 'react';
import {
  Building,
  Users,
  Stethoscope,
  Clock,
  Layers,
  Calendar,
  ClipboardList,
  CreditCard,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { OrganizationWithRole, Department, DoctorProfile, StaffMember } from '../../types/organization';
import type { ProviderActiveView } from '../common/Sidebar';

interface HospitalDashboardProps {
  currentOrg: OrganizationWithRole;
  departments: Department[];
  doctors: DoctorProfile[];
  members: StaffMember[];
  onNavigate: (view: ProviderActiveView) => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({
  currentOrg,
  departments,
  doctors,
  members,
  onNavigate,
}) => {
  const isOwner = currentOrg.current_user_role === 'organization_owner';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Hospital Operations &bull; Multispecialty Facility Mode
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{currentOrg.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentOrg.address || 'Hospital Complex'}, {currentOrg.city || ''} {currentOrg.state || ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => onNavigate('departments')}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition border border-blue-200 flex items-center gap-1.5"
            >
              <Building className="w-4 h-4" />
              Manage Departments
            </button>
          )}
          <button
            onClick={() => onNavigate('doctors')}
            className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-xl transition border border-teal-200 flex items-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4" />
            Doctors Roster
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Active Departments</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{departments.length}</p>
          <p className="text-xs text-slate-500">Clinical & Surgical Units</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Consultant Doctors</span>
            <Stethoscope className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{doctors.length}</p>
          <p className="text-xs text-slate-500">Across All Departments</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Hospital Staff</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{members.length}</p>
          <p className="text-xs text-slate-500">Doctors, Nurses & Front Desk</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Emergency & OPD</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-base font-bold text-slate-900">24/7 Operational</p>
          <p className="text-xs text-emerald-600 font-medium">Emergency Roster Ready</p>
        </div>
      </div>

      {/* Main Grid: Departments Directory & Doctors Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Clinical Departments ({departments.length})
            </h3>
            <button
              onClick={() => onNavigate('departments')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {departments.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <p>No departments configured yet.</p>
              <button
                onClick={() => onNavigate('departments')}
                className="mt-2 text-blue-600 font-semibold hover:underline"
              >
                + Create Department
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {departments.slice(0, 5).map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{dept.name}</h4>
                    <p className="text-slate-500 text-[11px]">{dept.description || 'Clinical specialty department'}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-mono font-semibold text-[11px]">
                    {dept.doctor_count} Doctors
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctors Roster Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Specialist Doctors ({doctors.length})
            </h3>
            <button
              onClick={() => onNavigate('doctors')}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Full Roster <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {doctors.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <p>No doctors associated with this hospital yet.</p>
              <button
                onClick={() => onNavigate('doctors')}
                className="mt-2 text-teal-600 font-semibold hover:underline"
              >
                + Add Doctor Profile
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {doctors.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{doc.doctor_name || 'Dr. Specialist'}</h4>
                    <p className="text-teal-700 font-medium text-[11px]">{doc.specialty}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-700 block">
                      {currentOrg.settings?.currency || 'INR'} {doc.consultation_fee}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {doc.department_names?.join(', ') || 'General OPD'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hospital Modules Preview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Hospital Workflows
          </h3>
          <span className="text-[11px] text-slate-400">Scheduled for Phase 3 & 4</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('placeholder-appointments')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <Calendar className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">OPD Appointments</h4>
              <p className="text-[10px] text-slate-500">Department duty schedules</p>
            </div>
            <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Coming in Phase 3
            </span>
          </button>

          <button
            onClick={() => onNavigate('placeholder-patients')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <ClipboardList className="w-5 h-5 text-purple-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Centralized EMR</h4>
              <p className="text-[10px] text-slate-500">Multi-doctor patient records</p>
            </div>
            <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Coming in Phase 3
            </span>
          </button>

          <button
            onClick={() => onNavigate('placeholder-prescriptions')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <Layers className="w-5 h-5 text-teal-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Inpatient Wards</h4>
              <p className="text-[10px] text-slate-500">Admissions & bed tracking</p>
            </div>
            <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Coming in Phase 4
            </span>
          </button>

          <button
            onClick={() => onNavigate('placeholder-billing')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition space-y-2 group"
          >
            <CreditCard className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Consolidated Billing</h4>
              <p className="text-[10px] text-slate-500">Inpatient & OPD accounts</p>
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
