import React from 'react';
import { Sparkles, ArrowLeft, Calendar, ClipboardList, FileText, CreditCard, TestTube2, Layers } from 'lucide-react';
import type { ProviderActiveView } from '../common/Sidebar';

interface PhasePlaceholderViewProps {
  view: ProviderActiveView;
  onBackToDashboard: () => void;
}

export const PhasePlaceholderView: React.FC<PhasePlaceholderViewProps> = ({
  view,
  onBackToDashboard,
}) => {
  const configs: Record<
    string,
    { title: string; phase: string; icon: React.ReactNode; desc: string; features: string[] }
  > = {
    'placeholder-appointments': {
      title: 'Appointment Calendar & Walk-in Queue',
      phase: 'Phase 3 (Clinic Management)',
      icon: <Calendar className="w-10 h-10 text-teal-600" />,
      desc: 'Interactive appointment scheduling calendar, live walk-in waiting queue, time slot allocation, and doctor availability integration.',
      features: [
        'Real-time token and walk-in queue management',
        'Doctor daily schedule & slot configuration',
        'Patient check-in & call-next status updates',
        'Automatic SMS / Email appointment reminders',
      ],
    },
    'placeholder-patients': {
      title: 'Patient Registry & Electronic Medical Records',
      phase: 'Phase 3 (Clinic Management)',
      icon: <ClipboardList className="w-10 h-10 text-blue-600" />,
      desc: 'Comprehensive patient health charts, medical history timelines, allergies, previous visits, and vital signs tracking.',
      features: [
        'Secure patient identity registration',
        'Consultation notes & vitals logging',
        'Medical history & chronic illness records',
        'Cross-visit timeline tracking',
      ],
    },
    'placeholder-prescriptions': {
      title: 'Prescription Engine & PDF Generator',
      phase: 'Phase 3 (Clinic Management)',
      icon: <FileText className="w-10 h-10 text-indigo-600" />,
      desc: 'Standardized digital prescription writer with drug dosages, instructions, diagnosis codes, and high-fidelity downloadable/printable PDF output.',
      features: [
        'Drug dosage, frequency, and duration picker',
        'Clinical diagnosis notes & dietary advice',
        'Automatic PDF generation on clinic letterhead',
        'Follow-up visit date scheduling',
      ],
    },
    'placeholder-billing': {
      title: 'Point of Sale, Billing & Receipts',
      phase: 'Phase 3 (Clinic Management)',
      icon: <CreditCard className="w-10 h-10 text-emerald-600" />,
      desc: 'Point-of-sale invoicing, receipt printing, payment status tracking (Paid, Unpaid, Partial), and daily collection summaries.',
      features: [
        'Custom invoice line items for consultation and procedures',
        'Itemized tax and discount computation',
        'Instant receipt generation with print support',
        'Daily revenue and settlement reports',
      ],
    },
    'placeholder-lab-orders': {
      title: 'Test Catalogue, Lab Orders & Requisitions',
      phase: 'Phase 4 (Diagnostic Modules)',
      icon: <TestTube2 className="w-10 h-10 text-amber-600" />,
      desc: 'Laboratory test menu with pricing, turnaround times (TAT), specimen collection guidelines, and physician order requisitions.',
      features: [
        'Complete test menu with standard reference ranges',
        'Outpatient and inpatient lab requisition intake',
        'Turnaround time alerts and specimen protocols',
        'Integrated diagnostic billing',
      ],
    },
    'placeholder-sample-tracking': {
      title: 'Sample Barcoding & Pathology Verification',
      phase: 'Phase 4 (Diagnostic Modules)',
      icon: <Layers className="w-10 h-10 text-teal-600" />,
      desc: 'End-to-end specimen lifecycle tracking (Collected -> In-Lab -> Analyzed -> Verified), barcode scanning, and pathologist digital sign-off.',
      features: [
        'Specimen barcode label generation',
        'Sample collection & accessioning workflow',
        'Clinical result entry with critical alert ranges',
        'Certified pathologist verification & PDF delivery',
      ],
    },
  };

  const current = configs[view] || {
    title: 'Healthcare Workflow Module',
    phase: 'Later Phase',
    icon: <Sparkles className="w-10 h-10 text-teal-600" />,
    desc: 'This module is scheduled for implementation in upcoming project milestones.',
    features: ['Workflow interfaces and database schemas prepared in Phase 2'],
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <button
        onClick={onBackToDashboard}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Facility Overview
      </button>

      <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm space-y-6 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-xs">
            {current.icon}
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {current.phase}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{current.title}</h1>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-xl">
              {current.desc}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Planned Capabilities in {current.phase}
          </h3>
          <ul className="space-y-2 text-xs text-slate-600">
            {current.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onBackToDashboard}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
