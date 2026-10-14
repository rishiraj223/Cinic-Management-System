import React, { useState } from 'react';
import { Activity, Lock, Mail, ArrowRight, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../components/common/Alert';

interface LoginPageProps {
  onNavigateRegister: (defaultRole?: 'doctor' | 'patient') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister }) => {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message || 'Failed to sign in. Please verify your credentials.');
    }
    setLoading(false);
  };

  const setDemoCredentials = (role: 'patient' | 'doctor' | 'hospital' | 'lab') => {
    if (role === 'patient') {
      setEmail('rahul.sharma@example.com');
      setPassword('Demo@1234');
    } else if (role === 'doctor') {
      setEmail('dr.sarah@apexhealth.com');
      setPassword('Demo@1234');
    } else if (role === 'hospital') {
      setEmail('dr.vikram@citygeneral.com');
      setPassword('Demo@1234');
    } else if (role === 'lab') {
      setEmail('dr.mehta@metropolis.com');
      setPassword('Demo@1234');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-200">
            <Activity className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign In to HealthCore
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Unified Healthcare Platform for Patients, Doctors, and Clinics
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          {!isConfigured && (
            <div className="mb-6">
              <Alert
                type="warning"
                title="Supabase Credentials Notice"
                message="Supabase is not configured yet. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env to enable live authentication."
              />
            </div>
          )}

          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {/* Quick Demo Login Fillers for Presentation */}
          <div className="mb-5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              ⚡ Quick Fill Demo Accounts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('patient')}
                className="py-1.5 px-2.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl font-bold text-slate-700 hover:text-teal-800 transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <User className="w-3.5 h-3.5 text-teal-600" /> Patient Account
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('doctor')}
                className="py-1.5 px-2.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl font-bold text-slate-700 hover:text-teal-800 transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" /> Doctor / Clinic
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-teal-200 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Dedicated Registration Links for Both Roles */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-3">
              Don't have an account yet?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateRegister('doctor')}
                className="w-full py-2 px-3 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition flex items-center justify-center gap-1.5 border border-teal-200/80"
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                Register as Doctor
              </button>
              <button
                type="button"
                onClick={() => onNavigateRegister('patient')}
                className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                Register as Patient
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
