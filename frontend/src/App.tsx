import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { Navbar } from './components/common/Navbar';
import { CreateOrgModal } from './components/organization/CreateOrgModal';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { api } from './services/api';
import type { OrganizationWithRole } from './types/organization';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile'>('dashboard');

  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrganizationWithRole | null>(null);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<any>(null);

  const fetchOrganizations = async () => {
    try {
      const orgs = await api.getOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0 && !currentOrg) {
        setCurrentOrg(orgs[0]);
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
      <LoginPage onNavigateRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onNavigateLogin={() => setAuthView('login')} />
    );
  }

  const handleOrgCreated = (newOrg: OrganizationWithRole) => {
    setOrganizations((prev) => [newOrg, ...prev]);
    setCurrentOrg(newOrg);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Navbar
        currentOrg={currentOrg}
        organizations={organizations}
        onSelectOrg={setCurrentOrg}
        onOpenCreateOrg={() => setIsCreateOrgOpen(true)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        backendHealthy={backendHealth?.status === 'healthy'}
      />

      <main className="flex-1">
        {currentPage === 'dashboard' ? (
          <DashboardPage
            currentOrg={currentOrg}
            organizations={organizations}
            onSelectOrg={setCurrentOrg}
            onOpenCreateOrg={() => setIsCreateOrgOpen(true)}
            backendHealth={backendHealth}
          />
        ) : (
          <ProfilePage />
        )}
      </main>

      <CreateOrgModal
        isOpen={isCreateOrgOpen}
        onClose={() => setIsCreateOrgOpen(false)}
        onSuccess={handleOrgCreated}
      />

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        <p>HealthCore SaaS &bull; Phase 1 Foundation &bull; React + FastAPI + Supabase PostgreSQL</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
