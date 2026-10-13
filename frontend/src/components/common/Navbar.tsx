import React, { useState } from 'react';
import { Activity, Building2, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { OrganizationWithRole } from '../../types/organization';

interface NavbarProps {
  currentOrg: OrganizationWithRole | null;
  organizations: OrganizationWithRole[];
  onSelectOrg: (org: OrganizationWithRole) => void;
  onOpenCreateOrg: () => void;
  currentPage: 'dashboard' | 'profile';
  onNavigate: (page: 'dashboard' | 'profile') => void;
  backendHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentOrg,
  organizations,
  onSelectOrg,
  onOpenCreateOrg,
  currentPage,
  onNavigate,
  backendHealthy,
}) => {
  const { user, profile, signOut } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const formatRole = (role?: string) => {
    if (!role) return 'Member';
    return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatOrgType = (type?: string) => {
    switch (type) {
      case 'clinic':
        return 'Local Clinic';
      case 'hospital':
        return 'Hospital Center';
      case 'diagnostic_center':
        return 'Diagnostic Lab';
      default:
        return type || 'Healthcare Facility';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-8">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onNavigate('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-200">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  HealthCore <span className="text-teal-600 text-xs font-semibold px-2 py-0.5 bg-teal-50 rounded-full border border-teal-200">SaaS</span>
                </span>
                <span className="text-xs text-slate-500 block -mt-1">Healthcare Operating System</span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  currentPage === 'dashboard'
                    ? 'text-teal-700 bg-teal-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  currentPage === 'profile'
                    ? 'text-teal-700 bg-teal-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                My Account
              </button>
            </nav>
          </div>

          {/* Right: Organization Switcher & User Menu */}
          <div className="flex items-center gap-4">
            {/* Backend Health Dot */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500" title={backendHealthy ? "Backend API Online" : "Backend API Checking"}>
              <span className={`w-2.5 h-2.5 rounded-full ${backendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono text-[11px]">{backendHealthy ? 'API Active' : 'Connecting...'}</span>
            </div>

            {/* Organization Selector */}
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition"
              >
                <Building2 className="w-4 h-4 text-teal-600" />
                <div className="text-left max-w-[140px] sm:max-w-[180px] truncate">
                  <p className="font-medium text-xs truncate leading-tight">
                    {currentOrg ? currentOrg.name : 'Select Facility'}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {currentOrg ? formatOrgType(currentOrg.type) : 'No Organization'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {orgDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Your Organizations
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {organizations.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-slate-500 text-center">
                        No organizations found
                      </p>
                    ) : (
                      organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => {
                            onSelectOrg(org);
                            setOrgDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                            currentOrg?.id === org.id ? 'bg-teal-50 text-teal-900 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-medium truncate">{org.name}</p>
                            <p className="text-[10px] text-slate-500">{formatOrgType(org.type)}</p>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                            {formatRole(org.current_user_role)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-1.5 px-2">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false);
                        onOpenCreateOrg();
                      }}
                      className="w-full text-center py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded-md transition"
                    >
                      + Create New Organization
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {profile?.full_name || 'Healthcare Practitioner'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    {profile?.is_platform_admin && (
                      <span className="inline-block mt-1 text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded">
                        Platform Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('profile');
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
