import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  Bell,
  LogOut,
  User as UserIcon,
  Plus,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { OrganizationWithRole } from '../../types/organization';
import type { ProviderActiveView } from './Sidebar';

interface ProviderNavbarProps {
  currentOrg: OrganizationWithRole;
  organizations: OrganizationWithRole[];
  onSelectOrg: (org: OrganizationWithRole) => void;
  onOpenOnboarding: () => void;
  activeView: ProviderActiveView;
  onNavigateToAccount: () => void;
  onToggleMobileSidebar: () => void;
  backendHealthy: boolean;
}

export const ProviderNavbar: React.FC<ProviderNavbarProps> = ({
  currentOrg,
  organizations,
  onSelectOrg,
  onOpenOnboarding,
  activeView,
  onNavigateToAccount,
  onToggleMobileSidebar,
  backendHealthy,
}) => {
  const { user, profile, signOut } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Facility Overview';
      case 'departments':
        return 'Departments Management';
      case 'doctors':
        return currentOrg.type === 'clinic' ? 'Doctor Profile' : 'Doctors Directory';
      case 'service-categories':
        return 'Diagnostic Test Categories';
      case 'staff':
        return 'Staff & Permissions';
      case 'settings':
        return 'Facility Settings';
      case 'placeholder-appointments':
        return 'Appointments (Phase 3)';
      case 'placeholder-patients':
        return 'Patient Records (Phase 3)';
      case 'placeholder-prescriptions':
        return 'Prescription Engine (Phase 3)';
      case 'placeholder-billing':
        return 'Billing & POS (Phase 3)';
      case 'placeholder-lab-orders':
        return 'Lab Orders (Phase 4)';
      case 'placeholder-sample-tracking':
        return 'Sample Tracking (Phase 4)';
      default:
        return 'Healthcare Workspace';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left: Mobile hamburger & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileSidebar}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-400 hidden sm:inline">
                {currentOrg.name} /
              </span>
              <span className="font-bold text-sm text-slate-800">
                {getBreadcrumbTitle()}
              </span>
            </div>
          </div>

          {/* Right: Actions, Notifications, Switcher & User */}
          <div className="flex items-center gap-3">
            {/* Backend health status dot */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-mono text-[11px]">{backendHealthy ? 'API Online' : 'Connecting'}</span>
            </div>

            {/* Facility Switcher */}
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition"
              >
                <Building2 className="w-4 h-4 text-teal-600" />
                <span className="font-semibold max-w-[120px] sm:max-w-[160px] truncate">
                  {currentOrg.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {orgDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Your Healthcare Facilities
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {organizations.length} total
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          onSelectOrg(org);
                          setOrgDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                          currentOrg.id === org.id ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="truncate">{org.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">
                            {org.type.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {org.current_user_role.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-1.5 px-2">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false);
                        onOpenOnboarding();
                      }}
                      className="w-full text-center py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add New Healthcare Facility
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-teal-500 absolute top-1.5 right-1.5" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="font-bold text-slate-800">Notifications Area</span>
                    <span className="text-[10px] text-slate-400">0 unread</span>
                  </div>
                  <p className="text-slate-500 text-center py-4">
                    Real-time clinical alerts and appointment queue reminders will arrive here in Phase 3.
                  </p>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {profile?.full_name || 'Healthcare Practitioner'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded font-semibold capitalize">
                      {currentOrg.current_user_role.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigateToAccount();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    Account Settings
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
