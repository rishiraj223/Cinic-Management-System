import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/common/Sidebar';
import type { ProviderActiveView } from '../components/common/Sidebar';
import { ProviderNavbar } from '../components/common/ProviderNavbar';
import { ClinicDashboard } from '../components/provider/ClinicDashboard';
import { HospitalDashboard } from '../components/provider/HospitalDashboard';
import { DiagnosticDashboard } from '../components/provider/DiagnosticDashboard';
import { DepartmentManager } from '../components/provider/DepartmentManager';
import { DoctorDirectory } from '../components/provider/DoctorDirectory';
import { ServiceCategoryManager } from '../components/provider/ServiceCategoryManager';
import { StaffManager } from '../components/provider/StaffManager';
import { FacilitySettingsView } from '../components/provider/FacilitySettingsView';
import { PhasePlaceholderView } from '../components/provider/PhasePlaceholderView';
import { OnboardingModal } from '../components/provider/OnboardingModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PatientManager } from '../components/clinic/PatientManager';
import { AppointmentScheduler } from '../components/clinic/AppointmentScheduler';
import { WalkInQueueView } from '../components/clinic/WalkInQueueView';
import { PrescriptionManager } from '../components/clinic/PrescriptionManager';
import { BillingManager } from '../components/clinic/BillingManager';
import { FollowUpManager } from '../components/clinic/FollowUpManager';
import { ClinicReportsView } from '../components/clinic/ClinicReportsView';
import { api } from '../services/api';
import type {
  OrganizationWithRole,
  Department,
  DoctorProfile,
  ServiceCategory,
  StaffMember,
} from '../types/organization';
import { Building2, Plus } from 'lucide-react';

interface ProviderPortalPageProps {
  currentOrg: OrganizationWithRole | null;
  organizations: OrganizationWithRole[];
  onSelectOrg: (org: OrganizationWithRole) => void;
  onOpenOnboarding: () => void;
  isOnboardingOpen: boolean;
  onCloseOnboarding: () => void;
  onOrgCreated: (newOrg: OrganizationWithRole) => void;
  onNavigateToAccount: () => void;
  backendHealthy: boolean;
}

export const ProviderPortalPage: React.FC<ProviderPortalPageProps> = ({
  currentOrg,
  organizations,
  onSelectOrg,
  onOpenOnboarding,
  isOnboardingOpen,
  onCloseOnboarding,
  onOrgCreated,
  onNavigateToAccount,
  backendHealthy,
}) => {
  const [activeView, setActiveView] = useState<ProviderActiveView>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Facility-specific datasets
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchFacilityData = async () => {
    if (!currentOrg) return;
    setDataLoading(true);

    try {
      const [membersData, docsData] = await Promise.all([
        api.getMembers(currentOrg.id).catch(() => []),
        api.getDoctors(currentOrg.id).catch(() => []),
      ]);
      setMembers(membersData);
      setDoctors(docsData);

      if (currentOrg.type === 'hospital') {
        const deptsData = await api.getDepartments(currentOrg.id).catch(() => []);
        setDepartments(deptsData);
      } else if (currentOrg.type === 'diagnostic_center') {
        const catsData = await api.getServiceCategories(currentOrg.id).catch(() => []);
        setServiceCategories(catsData);
      }
    } catch (err) {
      console.warn('Failed to load facility data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilityData();
    setActiveView('dashboard');
  }, [currentOrg?.id]);

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Healthcare Facility Selected</h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          You are currently not associated with an active healthcare organization. Onboard your clinic, hospital, or diagnostic center to enter the provider workspace.
        </p>
        <button
          onClick={onOpenOnboarding}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-200"
        >
          <Plus className="w-4 h-4" />
          Onboard Healthcare Facility
        </button>

        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={onCloseOnboarding}
          onSuccess={onOrgCreated}
        />
      </div>
    );
  }

  const renderActiveView = () => {
    if (dataLoading) {
      return (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="md" label="Loading facility data..." />
        </div>
      );
    }

    if (activeView.startsWith('placeholder-')) {
      return (
        <PhasePlaceholderView
          view={activeView}
          onBackToDashboard={() => setActiveView('dashboard')}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        if (currentOrg.type === 'clinic') {
          return (
            <ClinicDashboard
              currentOrg={currentOrg}
              doctors={doctors}
              members={members}
              onNavigate={setActiveView}
            />
          );
        } else if (currentOrg.type === 'hospital') {
          return (
            <HospitalDashboard
              currentOrg={currentOrg}
              departments={departments}
              doctors={doctors}
              members={members}
              onNavigate={setActiveView}
            />
          );
        } else {
          return (
            <DiagnosticDashboard
              currentOrg={currentOrg}
              serviceCategories={serviceCategories}
              members={members}
              onNavigate={setActiveView}
            />
          );
        }

      case 'departments':
        return (
          <DepartmentManager
            currentOrg={currentOrg}
            departments={departments}
            doctors={doctors}
            onRefresh={fetchFacilityData}
          />
        );

      case 'doctors':
        return (
          <DoctorDirectory
            currentOrg={currentOrg}
            doctors={doctors}
            members={members}
            onRefresh={fetchFacilityData}
          />
        );

      case 'service-categories':
        return (
          <ServiceCategoryManager
            currentOrg={currentOrg}
            serviceCategories={serviceCategories}
            onRefresh={fetchFacilityData}
          />
        );

      case 'staff':
        return (
          <StaffManager
            currentOrg={currentOrg}
            members={members}
            onRefresh={fetchFacilityData}
          />
        );

      case 'settings':
        return (
          <FacilitySettingsView
            currentOrg={currentOrg}
            onRefresh={fetchFacilityData}
          />
        );

      case 'patients':
        return <PatientManager orgId={currentOrg.id} />;

      case 'appointments':
        return <AppointmentScheduler orgId={currentOrg.id} />;

      case 'queue':
        return <WalkInQueueView orgId={currentOrg.id} />;

      case 'prescriptions':
        return <PrescriptionManager orgId={currentOrg.id} />;

      case 'billing':
        return <BillingManager orgId={currentOrg.id} />;

      case 'followups':
        return <FollowUpManager orgId={currentOrg.id} />;

      case 'reports':
        return <ClinicReportsView orgId={currentOrg.id} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Dynamic Sidebar */}
      <Sidebar
        currentOrg={currentOrg}
        activeView={activeView}
        onSelectView={setActiveView}
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ProviderNavbar
          currentOrg={currentOrg}
          organizations={organizations}
          onSelectOrg={onSelectOrg}
          onOpenOnboarding={onOpenOnboarding}
          activeView={activeView}
          onNavigateToAccount={onNavigateToAccount}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          backendHealthy={backendHealthy}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActiveView()}
        </main>
      </div>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={onCloseOnboarding}
        onSuccess={onOrgCreated}
      />
    </div>
  );
};
