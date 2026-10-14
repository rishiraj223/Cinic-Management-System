import React, { useState } from 'react';
import {
  Activity,
  Lock,
  Mail,
  User,
  ArrowRight,
  Stethoscope,
  MapPin,
  Phone,
  Building,
  Award,
  Calendar,
  Heart,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { patientApi } from '../services/patientApi';
import { Alert } from '../components/common/Alert';

interface RegisterPageProps {
  onNavigateLogin: () => void;
  defaultRole?: 'doctor' | 'patient';
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateLogin,
  defaultRole = 'doctor',
}) => {
  const { signUp, isConfigured } = useAuth();
  const [accountType, setAccountType] = useState<'doctor' | 'patient'>(defaultRole);

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Address Fields
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Doctor Specific Fields
  const [specialty, setSpecialty] = useState('General Medicine');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('500');
  const [experienceYears, setExperienceYears] = useState('5');
  const [qualifications, setQualifications] = useState('MBBS, MD');

  // Patient Specific Fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const medicalSpecialties = [
    'General Medicine',
    'Cardiology',
    'Pediatrics',
    'Dermatology',
    'Orthopedics',
    'Gynecology & Obstetrics',
    'Neurology',
    'Psychiatry',
    'Ophthalmology',
    'ENT / Otorhinolaryngology',
    'General Surgery',
    'Dentistry',
    'Other / Specialized Practice',
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !phone) {
      setError('Please fill in all required primary fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!streetAddress || !city) {
      setError('Please provide your complete address (street and city).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const fullAddress = `${streetAddress}, ${city}${state ? `, ${state}` : ''}${
      postalCode ? ` - ${postalCode}` : ''
    }`;

    try {
      if (accountType === 'doctor') {
        const resolvedSpecialty =
          specialty === 'Other / Specialized Practice' && customSpecialty
            ? customSpecialty
            : specialty;

        const effectiveClinicName =
          clinicName.trim() ||
          (fullName.startsWith('Dr.') ? `${fullName}'s Clinic` : `Dr. ${fullName}'s Medical Practice`);

        // Sign up with doctor role metadata
        const { error: signUpError } = await signUp(email, password, fullName, {
          role: 'doctor',
          account_type: 'doctor',
          phone,
          address: fullAddress,
          city,
          state,
          postal_code: postalCode,
          specialty: resolvedSpecialty,
          license_number: licenseNumber,
          clinic_name: effectiveClinicName,
        });

        if (signUpError) {
          throw new Error(signUpError.message || 'Registration failed.');
        }

        // Auto-provision clinic organization
        try {
          await api.onboardOrganization({
            name: effectiveClinicName,
            type: 'clinic',
            address: streetAddress,
            city,
            state,
            postal_code: postalCode,
            phone,
            email,
            doctor_specialty: resolvedSpecialty,
            doctor_license: licenseNumber || 'REG-PENDING',
            doctor_qualifications: qualifications,
            doctor_consultation_fee: parseFloat(consultationFee) || 500.0,
          });
        } catch (orgErr) {
          console.warn('Note: Organization onboarding deferred until initial login:', orgErr);
        }

        setSuccess(
          'Doctor account registered successfully! Entering your clinical workspace...'
        );
      } else {
        // Patient account registration
        const { error: signUpError } = await signUp(email, password, fullName, {
          role: 'patient',
          account_type: 'patient',
          phone,
          address: fullAddress,
          city,
          state,
          postal_code: postalCode,
          gender,
          blood_group: bloodGroup,
          date_of_birth: dateOfBirth,
        });

        if (signUpError) {
          throw new Error(signUpError.message || 'Registration failed.');
        }

        // Auto-initialize patient medical profile
        try {
          await patientApi.updateProfile({
            full_name: fullName,
            phone,
            address: fullAddress,
            gender,
            blood_group: bloodGroup,
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
          });
        } catch (profileErr) {
          console.warn('Profile initialization note:', profileErr);
        }

        setSuccess(
          'Patient account created successfully! Redirecting to your personal health portal...'
        );
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200 mb-3">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Your Healthcare Account
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          Choose whether you are registering as a medical practitioner or as an individual patient.
        </p>

        {/* 2 Big Account Type Selection Buttons */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {/* Option 1: Doctor */}
          <button
            type="button"
            onClick={() => {
              setAccountType('doctor');
              setError(null);
            }}
            className={`p-4 rounded-2xl border-2 transition flex items-start gap-3.5 ${
              accountType === 'doctor'
                ? 'border-teal-600 bg-teal-50/70 shadow-md ring-2 ring-teal-600/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                accountType === 'doctor'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm">Doctor / Medical Specialist</span>
                {accountType === 'doctor' && (
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                For clinics, OPD doctors, hospital practitioners & diagnostic directors.
              </p>
            </div>
          </button>

          {/* Option 2: Patient */}
          <button
            type="button"
            onClick={() => {
              setAccountType('patient');
              setError(null);
            }}
            className={`p-4 rounded-2xl border-2 transition flex items-start gap-3.5 ${
              accountType === 'patient'
                ? 'border-teal-600 bg-teal-50/70 shadow-md ring-2 ring-teal-600/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                accountType === 'patient'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm">Patient / Individual User</span>
                {accountType === 'patient' && (
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                For searching accredited providers, booking consultations & lab tests.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Registration Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100">
          {!isConfigured && (
            <div className="mb-6">
              <Alert
                type="warning"
                title="Supabase Environment Notice"
                message="To enable user registration, set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env."
              />
            </div>
          )}

          {error && (
            <div className="mb-6">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {success && (
            <div className="mb-6">
              <Alert type="success" message={success} />
            </div>
          )}

          <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {accountType === 'doctor'
                  ? 'Doctor & Medical Practice Registration'
                  : 'Patient Account & Medical Profile'}
              </h2>
              <span className="text-xs text-slate-500">
                Please provide accurate contact and address details.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-teal-50 text-teal-800">
              {accountType === 'doctor' ? 'Provider Mode' : 'Patient Mode'}
            </span>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Section 1: Basic Account Credentials */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-600" /> 1. Account Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {accountType === 'doctor' ? 'Doctor Full Name *' : 'Patient Full Name *'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={accountType === 'doctor' ? 'Dr. Sarah Jenkins' : 'Rahul Sharma'}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        accountType === 'doctor'
                          ? 'sarah.jenkins@clinic.com'
                          : 'rahul.sharma@example.com'
                      }
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password * (min 6 chars)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Address Information (Tailored for Doctor / Patient) */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" /> 2.{' '}
                {accountType === 'doctor' ? 'Practice / Clinic Address' : 'Residential Address'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {accountType === 'doctor'
                      ? 'Clinic / Hospital Street Address *'
                      : 'Residential Street / Flat / Society Address *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder={
                      accountType === 'doctor'
                        ? 'Suite 402, Metro Medical Chambers, MG Road'
                        : 'Flat 102, Shanti Heights, Shivaji Nagar'
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Postal / PIN Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="400001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Specialized Information */}
            {accountType === 'doctor' ? (
              /* DOCTOR PROFESSIONAL DETAILS */
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-teal-600" /> 3. Medical Specialty & Practice Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary Specialty *
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      {medicalSpecialties.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {specialty === 'Other / Specialized Practice' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Specify Specialty *
                      </label>
                      <input
                        type="text"
                        required
                        value={customSpecialty}
                        onChange={(e) => setCustomSpecialty(e.target.value)}
                        placeholder="e.g. Endocrinology"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Clinic / Hospital Facility Name
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={clinicName}
                          onChange={(e) => setClinicName(e.target.value)}
                          placeholder="e.g. Apex Health Clinic"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medical Council Registration / License No.
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="MCI-2018-987654"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      placeholder="500"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Qualifications
                    </label>
                    <input
                      type="text"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="MBBS, MD, DNB"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="5"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* PATIENT PERSONAL & MEDICAL DETAILS */
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-teal-600" /> 3. Patient Health & Emergency Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Contact Person Name
                    </label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="e.g. Priya Sharma (Spouse / Parent)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Phone
                    </label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="+91 98200 11223"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-teal-600/20 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? 'Setting Up Account...'
                : accountType === 'doctor'
                ? 'Register & Access Doctor Workspace'
                : 'Register & Open Patient Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateLogin}
                className="font-bold text-teal-600 hover:text-teal-700 transition"
              >
                Sign In Here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
