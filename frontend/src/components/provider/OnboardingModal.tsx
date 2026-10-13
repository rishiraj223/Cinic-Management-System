import React, { useState } from 'react';
import {
  Building2,
  X,
  Stethoscope,
  Building,
  FlaskConical,
  Check,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../services/api';
import type { OrganizationType, OrganizationWithRole, OrganizationOnboardingInput } from '../../types/organization';
import { Alert } from '../common/Alert';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrg: OrganizationWithRole) => void;
}

const DEFAULT_HOSPITAL_DEPTS = [
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Gynecology & Obstetrics',
  'Emergency & Trauma',
  'General Surgery',
  'Neurology',
];

const DEFAULT_LAB_CATEGORIES = [
  'Hematology (Blood Counts)',
  'Clinical Biochemistry',
  'Microbiology & Serology',
  'Radiology & X-Ray',
  'Histopathology & Biopsy',
  'Molecular Diagnostics (PCR)',
  'Urine & Body Fluid Analysis',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Type
  const [type, setType] = useState<OrganizationType>('clinic');

  // Step 2: Organization Info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Step 3 Clinic: Doctor Profile
  const [specialty, setSpecialty] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [qualifications, setQualifications] = useState('MBBS, MD');
  const [consultationFee, setConsultationFee] = useState<number>(500);

  // Step 3 Hospital: Departments
  const [selectedDepts, setSelectedDepts] = useState<string[]>([
    'General Medicine',
    'Cardiology',
    'Pediatrics',
    'Emergency & Trauma',
  ]);
  const [customDept, setCustomDept] = useState('');

  // Step 3 Diagnostic Lab: Service Categories
  const [selectedCats, setSelectedCats] = useState<string[]>([
    'Hematology (Blood Counts)',
    'Clinical Biochemistry',
    'Microbiology & Serology',
    'Urine & Body Fluid Analysis',
  ]);
  const [customCat, setCustomCat] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDept = (dept: string) => {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const addCustomDept = () => {
    if (customDept.trim() && !selectedDepts.includes(customDept.trim())) {
      setSelectedDepts((prev) => [...prev, customDept.trim()]);
      setCustomDept('');
    }
  };

  const toggleCat = (cat: string) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addCustomCat = () => {
    if (customCat.trim() && !selectedCats.includes(customCat.trim())) {
      setSelectedCats((prev) => [...prev, customCat.trim()]);
      setCustomCat('');
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: OrganizationOnboardingInput = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        type,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        timezone,
      };

      if (type === 'clinic') {
        payload.doctor_specialty = specialty;
        payload.doctor_license = licenseNumber || undefined;
        payload.doctor_qualifications = qualifications || undefined;
        payload.doctor_consultation_fee = consultationFee;
      } else if (type === 'hospital') {
        payload.initial_departments = selectedDepts;
      } else if (type === 'diagnostic_center') {
        payload.initial_service_categories = selectedCats;
      }

      const newOrg = await api.onboardOrganization(payload);
      onSuccess(newOrg);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Onboarding failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Healthcare Provider Onboarding
              </h3>
              <p className="text-xs text-slate-500">
                Step {step} of 3: {step === 1 ? 'Classification' : step === 2 ? 'Facility Details' : 'Initial Setup'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-teal-600' : 'bg-slate-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-teal-600' : 'bg-slate-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step >= 3 ? 'bg-teal-600' : 'bg-slate-200'}`} />
          </div>
        </div>

        <div className="p-6">
          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError(null)} /></div>}

          {/* STEP 1: SELECT TYPE */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Select your healthcare facility model. This adapts dashboards, team permissions, and clinical workflows.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <div
                  onClick={() => setType('clinic')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-4 ${
                    type === 'clinic'
                      ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Local Clinic / Solo Practitioner</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Streamlined queue management, direct consultations, doctor availability, and prescription generation.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setType('hospital')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-4 ${
                    type === 'hospital'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Multispecialty Hospital / Poly-Clinic</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Multi-doctor directories, clinical departments, hierarchical staff roles, and centralized operations.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setType('diagnostic_center')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-4 ${
                    type === 'diagnostic_center'
                      ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Diagnostic Center & Pathology Lab</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Laboratory test catalog categories, sample collection tracking, and certified pathologist workflows.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-200"
                >
                  Continue to Facility Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FACILITY DETAILS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Facility Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === 'clinic'
                      ? 'e.g. Apex Family Health Clinic'
                      : type === 'hospital'
                      ? 'e.g. Metro Multispecialty Hospital'
                      : 'e.g. Precise PathLabs & Diagnostics'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Address / Street</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Suite, Street Address"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 400001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@facility.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Custom Slug (optional)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. apex-care"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-200 disabled:opacity-50"
                >
                  Next: Customize Setup
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TYPE-SPECIFIC INITIALIZATION */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Clinic: Doctor Profile Setup */}
              {type === 'clinic' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Set up your primary doctor profile for this clinic.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Specialty *</label>
                      <input
                        type="text"
                        required
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="e.g. General Physician"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Medical License / Registration No.</label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. MCI-2024-819"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Qualifications</label>
                      <input
                        type="text"
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                        placeholder="e.g. MBBS, MD"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Consultation Fee (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hospital: Department Selection */}
              {type === 'hospital' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Select the initial clinical departments to activate in your hospital:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_HOSPITAL_DEPTS.map((dept) => {
                      const selected = selectedDepts.includes(dept);
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleDept(dept)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                            selected
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          {dept}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={customDept}
                      onChange={(e) => setCustomDept(e.target.value)}
                      placeholder="Add another department..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomDept}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {/* Diagnostic Lab: Service Categories */}
              {type === 'diagnostic_center' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Select the initial testing categories offered by your diagnostic laboratory:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_LAB_CATEGORIES.map((cat) => {
                      const selected = selectedCats.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCat(cat)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                            selected
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={customCat}
                      onChange={(e) => setCustomCat(e.target.value)}
                      placeholder="Add another test category..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomCat}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-200 disabled:opacity-50"
                >
                  {loading ? 'Creating Facility...' : 'Complete Facility Onboarding'}
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
