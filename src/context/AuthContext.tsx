import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AppUser } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  function makeFallbackUser(s: Session): AppUser {
    return {
      id: s.user.id,
      email: s.user.email || '',
      full_name: s.user.email?.split('@')[0] || '',
      role: 'cashier',
      is_active: true,
      branch_id: null,
      created_at: new Date().toISOString(),
    } as AppUser;
  }

  async function loadUser(s: Session | null): Promise<void> {
    if (!s) {
      setUser(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', s.user.id)
        .maybeSingle();

      if (error) {
        console.warn('loadUser query error:', error.message);
        setUser(makeFallbackUser(s));
        return;
      }

      if (data) {
        setUser(data as AppUser);
        return;
      }

      const { data: insertData } = await supabase
        .from('users')
        .insert({
          id: s.user.id,
          email: s.user.email || '',
          full_name: s.user.email?.split('@')[0] || '',
          role: 'cashier',
        })
        .select()
        .maybeSingle();

      if (insertData) {
        setUser(insertData as AppUser);
      } else {
        setUser(makeFallbackUser(s));
      }
    } catch (err) {
      console.warn('loadUser fallback:', err);
      setUser(makeFallbackUser(s));
    }
  }

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth timeout — forcing loading=false');
        setLoading(false);
      }
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        if (!mounted) return;
        setSession(s);
        return loadUser(s);
      })
      .catch((err) => {
        console.warn('getSession error:', err);
      })
      .finally(() => {
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      loadUser(s).catch(() => {});
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'cashier',
      }).catch(() => {});
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    await loadUser(session);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
