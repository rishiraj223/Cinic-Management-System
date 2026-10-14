import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProviderPortalPage } from './pages/ProviderPortalPage';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { api } from './services/api';
import type { OrganizationWithRole } from './types/organization';
import { ArrowLeft } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, memberships, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole] = useState<'doctor' | 'patient'>('doctor');
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile'>('dashboard');

  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrganizationWithRole | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<any>(null);

  const fetchOrganizations = async () => {
    try {
      const orgs = await api.getOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0 && !currentOrg) {
        setCurrentOrg(orgs[0]);
      } else if (currentOrg) {
        const refreshed = orgs.find((o) => o.id === currentOrg.id);
        if (refreshed) setCurrentOrg(refreshed);
      }
    } catch (err) {
      console.warn('Could not fetch organizations:', err);
    }
  };

  const checkHealth = async () => {
    try {
      const health = await api.getHealth();
      setBackendHealth(health);
    } catch (err) {
      setBackendHealth({ status: 'offline', database: 'unavailable' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" label="Initializing secure healthcare workspace..." />
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <LoginPage
        onNavigateRegister={(role) => {
          setRegisterRole(role || 'doctor');
          setAuthView('register');
        }}
      />
    ) : (
      <RegisterPage
        onNavigateLogin={() => setAuthView('login')}
        defaultRole={registerRole}
      />
    );
  }

  const handleOrgCreated = (newOrg: OrganizationWithRole) => {
    setOrganizations((prev) => [newOrg, ...prev.filter((o) => o.id !== newOrg.id)]);
    setCurrentOrg(newOrg);
    setIsOnboardingOpen(false);
  };

  if (currentPage === 'profile') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-teal-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Healthcare Dashboard
          </button>
          <span className="text-xs font-mono text-slate-400">HealthCore SaaS &bull; Account Center</span>
        </header>

        <main className="flex-1 p-6">
          <ProfilePage />
        </main>
      </div>
    );
  }

  // Strict Role-Based View Separation:
  // Healthcare providers & clinic/hospital staff access ProviderPortalPage.
  // Individual patient users access PatientPortalPage.
  // There is NO arbitrary manual switcher, preventing patients from accessing hospital controls.
  const isDoctorOrStaff =
    organizations.length > 0 ||
    memberships.length > 0 ||
    user?.user_metadata?.account_type === 'doctor' ||
    user?.user_metadata?.role === 'doctor';

  if (!isDoctorOrStaff) {
    return <PatientPortalPage />;
  }

  return (
    <ProviderPortalPage
      currentOrg={currentOrg}
      organizations={organizations}
      onSelectOrg={setCurrentOrg}
      onOpenOnboarding={() => setIsOnboardingOpen(true)}
      isOnboardingOpen={isOnboardingOpen}
      onCloseOnboarding={() => setIsOnboardingOpen(false)}
      onOrgCreated={handleOrgCreated}
      onNavigateToAccount={() => setCurrentPage('profile')}
      backendHealthy={backendHealth?.status === 'healthy'}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
