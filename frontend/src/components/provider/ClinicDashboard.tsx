import React from 'react';
import {
  Stethoscope,
  Clock,
  DollarSign,
  Users,
  Calendar,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { OrganizationWithRole, DoctorProfile, StaffMember } from '../../types/organization';
import type { ProviderActiveView } from '../common/Sidebar';

interface ClinicDashboardProps {
  currentOrg: OrganizationWithRole;
  doctors: DoctorProfile[];
  members: StaffMember[];
  onNavigate: (view: ProviderActiveView) => void;
}

export const ClinicDashboard: React.FC<ClinicDashboardProps> = ({
  currentOrg,
  doctors,
  members,
  onNavigate,
}) => {
  const primaryDoctor = doctors[0];
  const operatingHours = currentOrg.settings?.operating_hours || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Local Clinic Dashboard &bull; Solo Practice Mode
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{currentOrg.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentOrg.address || 'Clinical Facility'}, {currentOrg.city || ''} {currentOrg.state || ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('doctors')}
            className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-xl transition border border-teal-200 flex items-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4" />
            Manage Doctor Profile
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Primary Practitioner</span>
            <Stethoscope className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-base font-bold text-slate-900 truncate">
            {primaryDoctor?.doctor_name || 'Not Configured'}
          </p>
          <p className="text-xs text-slate-500">{primaryDoctor?.specialty || 'Click to set specialty'}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Consultation Fee</span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-base font-bold text-slate-900">
            {currentOrg.settings?.currency || 'INR'} {primaryDoctor?.consultation_fee || 0}
          </p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {primaryDoctor?.is_available ? 'Accepting Patients' : 'Doctor Away'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Active Staff</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-base font-bold text-slate-900">{members.length} Members</p>
          <p className="text-xs text-slate-500">Doctors & Receptionists</p>
        </div>

        <div
          onClick={() => onNavigate('queue')}
          className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 cursor-pointer hover:border-teal-400 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Today's Walk-in Queue</span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-base font-bold text-slate-900">Manage Queue &rarr;</p>
          <p className="text-xs text-teal-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Live Front-Desk Queue
          </p>
        </div>
      </div>

      {/* Main Content: Doctor Clinical Card & Operating Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Clinical Profile Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Doctor Credentials & Profile
            </h3>
            <button
              onClick={() => onNavigate('doctors')}
              className="text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              Edit Details
            </button>
          </div>

          {primaryDoctor ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 font-medium block">Specialty</span>
                  <span className="text-sm font-semibold text-slate-800">{primaryDoctor.specialty}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 font-medium block">Medical License</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    {primaryDoctor.license_number || 'Not Recorded'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 font-medium block">Qualifications</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {primaryDoctor.qualifications || 'MBBS'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 font-medium block">Clinical Experience</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {primaryDoctor.experience_years} Years
                  </span>
                </div>
              </div>

              {primaryDoctor.bio && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1">Doctor Biography</span>
                  <p className="text-slate-700 leading-relaxed">{primaryDoctor.bio}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">No doctor profile configured for this clinic yet.</p>
              <button
                onClick={() => onNavigate('doctors')}
                className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition"
              >
                Create Doctor Profile
              </button>
            </div>
          )}
        </div>

        {/* Operating Hours Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Clinic Timings
            </h3>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
              const schedule = operatingHours[day];
              return (
                <div key={day} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="capitalize text-slate-600 font-medium">{day}</span>
                  <span className="font-mono text-slate-800">
                    {schedule?.closed ? (
                      <span className="text-rose-500 font-sans">Closed</span>
                    ) : schedule?.open ? (
                      `${schedule.open} - ${schedule.close}`
                    ) : (
                      '09:00 - 18:00'
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Action Clinical Shortcuts */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            Clinic Workflow Shortcuts
          </h3>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
            Active Clinical Suite
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('appointments')}
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 text-left transition space-y-2 group"
          >
            <Calendar className="w-5 h-5 text-teal-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Appointment Calendar</h4>
              <p className="text-[10px] text-slate-500">Walk-in queue & booked slots</p>
            </div>
            <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
              ● Live Scheduler
            </span>
          </button>

          <button
            onClick={() => onNavigate('patients')}
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 text-left transition space-y-2 group"
          >
            <Users className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Patient Registry & EMR</h4>
              <p className="text-[10px] text-slate-500">Medical history & consultations</p>
            </div>
            <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
              ● Patient Directory
            </span>
          </button>

          <button
            onClick={() => onNavigate('prescriptions')}
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 text-left transition space-y-2 group"
          >
            <FileText className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Prescription Engine</h4>
              <p className="text-[10px] text-slate-500">Digital Rx & PDF printing</p>
            </div>
            <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
              ● Digital Rx System
            </span>
          </button>

          <button
            onClick={() => onNavigate('billing')}
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 text-left transition space-y-2 group"
          >
            <CreditCard className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Point of Sale & Billing</h4>
              <p className="text-[10px] text-slate-500">Invoices, receipts & payments</p>
            </div>
            <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
              ● Invoicing & POS
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
