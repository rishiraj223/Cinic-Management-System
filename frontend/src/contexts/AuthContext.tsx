import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { api } from '../services/api';
import type { Profile, MembershipSummary } from '../types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memberships: MembershipSummary[];
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    metadata?: Record<string, any>
  ) => Promise<{ error: Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<MembershipSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserProfile = async () => {
    try {
      const data = await api.getMyProfile();
      setProfile(data.profile);
      setMemberships(data.memberships);
    } catch (err) {
      console.warn('Could not fetch user profile from backend API:', err);
    }
  };

  useEffect(() => {
    // 1. Initial Session Check: Check local storage token first
    const savedToken = localStorage.getItem('healthcore_auth_token');
    const savedUser = localStorage.getItem('healthcore_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setSession({ access_token: savedToken } as any);
        fetchUserProfile().finally(() => setLoading(false));
      } catch (e) {
        localStorage.removeItem('healthcore_auth_token');
        localStorage.removeItem('healthcore_user');
      }
    }

    // 2. Also check Supabase Session
    supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
      if (supaSession?.user) {
        setSession(supaSession);
        setUser(supaSession.user);
        fetchUserProfile().finally(() => setLoading(false));
      } else if (!savedToken) {
        setLoading(false);
      }
    });

    // 3. Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, supaSession) => {
      if (supaSession?.user) {
        setSession(supaSession);
        setUser(supaSession.user);
        await fetchUserProfile();
      } else if (!localStorage.getItem('healthcore_auth_token')) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setMemberships([]);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // 1. Try Direct Backend Login First (Instant, never blocks on email confirmation)
    try {
      const res = await api.login({ email, password });
      if (res?.access_token && res?.user) {
        localStorage.setItem('healthcore_auth_token', res.access_token);
        localStorage.setItem('healthcore_user', JSON.stringify(res.user));
        setSession({ access_token: res.access_token } as any);
        setUser(res.user);
        await fetchUserProfile();
        return { error: null };
      }
    } catch (directErr) {
      console.warn('Direct backend login failed, trying Supabase auth:', directErr);
    }

    // 2. Fallback to Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error };
      setSession(data.session);
      setUser(data.user);
      if (data.session) {
        await fetchUserProfile();
      }
      return { error: null };
    } catch (supaErr: any) {
      return { error: supaErr };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    metadata?: Record<string, any>
  ) => {
    // 1. Try Direct Backend Registration (Instant account setup and immediate workspace opening)
    try {
      const res = await api.register({
        email,
        password,
        full_name: fullName,
        ...(metadata || {}),
      });
      if (res?.access_token && res?.user) {
        localStorage.setItem('healthcore_auth_token', res.access_token);
        localStorage.setItem('healthcore_user', JSON.stringify(res.user));
        setSession({ access_token: res.access_token } as any);
        setUser(res.user);
        await fetchUserProfile();
        return { error: null, user: res.user };
      }
    } catch (backendErr) {
      console.warn('Direct registration failed, trying Supabase fallback:', backendErr);
    }

    // 2. Fallback to Supabase
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ...(metadata || {}),
          },
        },
      });
      if (error) return { error };
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await fetchUserProfile();
      }
      return { error: null, user: data.user };
    } catch (supaErr: any) {
      return { error: supaErr };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('healthcore_auth_token');
    localStorage.removeItem('healthcore_user');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setMemberships([]);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        memberships,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
