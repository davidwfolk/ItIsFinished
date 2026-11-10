import { useState, useEffect, useCallback } from 'react';
import type { User, Session, Factor } from '@supabase/supabase-js';
import { supabase } from '../lib/powersync';
import { authManager } from '../lib/auth';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaFactors: Factor[];
  hasMfa: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([]);

  const fetchMfaFactors = useCallback(async () => {
    try {
      const factors = await authManager.listMfaFactors();
      const totpFactors = factors?.totp || [];
      const verifiedFactors = totpFactors.filter((f: Factor) => f.status === 'verified');
      setMfaFactors(verifiedFactors);
    } catch {
      setMfaFactors([]);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchMfaFactors();
      } else {
        setMfaFactors([]);
      }
    } catch (err) {
      console.error('Error refreshing auth:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchMfaFactors]);

  useEffect(() => {
    // Initial fetch
    refreshAuth();

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchMfaFactors();
      } else {
        setMfaFactors([]);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuth, fetchMfaFactors]);

  const signOut = useCallback(async () => {
    try {
      const { powersync } = await import('../lib/powersync');

      // Don't silently destroy edits that haven't reached the server yet.
      const pending = await powersync.getCrudBatch(1);
      if (pending && pending.crud.length > 0) {
        const proceed = window.confirm(
          'Some recent changes have not finished syncing. Signing out now will discard them. Sign out anyway?'
        );
        if (!proceed) return;
      }

      // Wipe the local database so the next user on this device can't see this user's data.
      await powersync.disconnectAndClear();
      await authManager.signOut();
      setUser(null);
      setSession(null);
      setMfaFactors([]);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  }, []);

  return {
    user,
    session,
    loading,
    mfaFactors,
    hasMfa: mfaFactors.length > 0,
    isGuest: !user,
    signOut,
    refreshAuth,
  };
}
