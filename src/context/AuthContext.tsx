import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as api from '../api';
import type { AppUser, SubscriptionStatus } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: AppUser | null;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: { code: string; message: string } | null }>;
  signInWithUsername: (username: string, pin: string) => Promise<{ error: { code: string; message: string } | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
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

  async function loadSubscriptionFor(u: AppUser | null): Promise<void> {
    if (!u?.branch_id) {
      setSubscription(null);
      return;
    }
    try {
      const { data } = await api.subscriptions.status({ p_branch_id: u.branch_id });
      setSubscription(data as SubscriptionStatus | null);
    } catch {
      setSubscription(null);
    }
  }

  async function loadUser(s: Session | null): Promise<void> {
    if (!s) {
      setUser(null);
      setSubscription(null);
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
        const fb = makeFallbackUser(s);
        setUser(fb);
        loadSubscriptionFor(fb).catch(() => {});
        return;
      }

      if (data) {
        const u = data as AppUser;
        setUser(u);
        loadSubscriptionFor(u).catch(() => {});
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
        const u = insertData as AppUser;
        setUser(u);
        loadSubscriptionFor(u).catch(() => {});
      } else {
        const fb = makeFallbackUser(s);
        setUser(fb);
        loadSubscriptionFor(fb).catch(() => {});
      }
    } catch (err) {
      console.warn('loadUser fallback:', err);
      const fb = makeFallbackUser(s);
      setUser(fb);
      loadSubscriptionFor(fb).catch(() => {});
    }
  }

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth timeout â€” forcing loading=false');
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
    if (error) {
      // Best-effort: the lockout counter is keyed by username; an email login
      // may not match one, but it is harmless and covers username=email setups.
      await api.admin.recordLoginFailure({ p_username: email }).catch(() => {});
      return { error: { code: error.code ?? '', message: error.message } };
    }
    const s = (await supabase.auth.getSession()).data.session;
    if (s?.user.id) await api.admin.recordLoginSuccess({ p_user_id: s.user.id }).catch(() => {});
    return { error: null };
  };

  const signInWithUsername = async (username: string, pin: string) => {
    const normalized = username.trim().toLowerCase();
    const { data, error } = await api.admin.getLoginEmail({
      p_username: normalized,
    });
    if (error) return { error: { code: 'rpc_error', message: error.message } };
    const result = data as { success?: boolean; email?: string; error?: string } | null;
    if (!result?.success || !result.email) {
      return { error: { code: result?.error === 'USER_INACTIVE' ? 'user_inactive' : result?.error === 'USER_LOCKED' ? 'user_locked' : 'user_not_found', message: '' } };
    }
    const { error: signError } = await supabase.auth.signInWithPassword({ email: result.email, password: pin });
    if (signError) {
      await api.admin.recordLoginFailure({ p_username: normalized }).catch(() => {});
      return { error: { code: signError.code ?? '', message: signError.message } };
    }
    const s = (await supabase.auth.getSession()).data.session;
    if (s?.user.id) await api.admin.recordLoginSuccess({ p_user_id: s.user.id }).catch(() => {});
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSubscription(null);
  };

  const refreshUser = async () => {
    await loadUser(session);
  };

  const refreshSubscription = async () => {
    await loadSubscriptionFor(user);
  };

  return (
    <AuthContext.Provider value={{ session, user, subscription, loading, signIn, signInWithUsername, signOut, refreshUser, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
