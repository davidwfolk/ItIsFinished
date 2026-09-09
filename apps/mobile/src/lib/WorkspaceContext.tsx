import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, setupPowerSync } from './powersync';
import { SupabaseConnector } from './SupabaseConnector';
import { checkAndEnforceTTL, getOrGenerateEncryptionKey } from './sqlcipher';
import { PowerSyncContext, usePowerSync } from '@powersync/react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { AbstractPowerSyncDatabase } from '@powersync/react-native';

interface WorkspaceContextType {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  isLoading: boolean;
  syncStatus: any;
  isAuthenticated: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  activeWorkspaceId: null,
  setActiveWorkspaceId: () => {},
  switchWorkspace: async () => {},
  isLoading: true,
  syncStatus: null,
  isAuthenticated: false,
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connector] = useState(() => new SupabaseConnector());
  const [powerSyncDb, setPowerSyncDb] = useState<AbstractPowerSyncDatabase | null>(null);
  
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = !!rootNavigationState?.key;

  // Separate effect to handle routing when auth state changes or finishes loading
  useEffect(() => {
    if (!isNavigationReady || isLoading) return;

    if (!isAuthenticated && segments[0] !== 'login') {
      router.replace('/login');
    } else if (isAuthenticated && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [isNavigationReady, isLoading, isAuthenticated, segments, router]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Check TTL and Enforce SQLCipher lock before accessing DB
      const isLocked = await checkAndEnforceTTL();
      if (isLocked) {
        console.warn('TTL Expired or Keystore Invalidated. Database is cryptographically locked.');
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      // 2. Load active workspace & Auth state
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error && error.message.includes('Invalid Refresh Token')) {
        console.error('Session revoked:', error.message);
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      } else if (!session) {
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      if (mounted) setIsAuthenticated(true);
      const currentActiveId = session.user?.user_metadata?.active_workspace_id || null;
      if (mounted) setActiveWorkspaceId(currentActiveId);
      
      // 3. Initialize SQLCipher and connect PowerSync
      try {
        const key = await getOrGenerateEncryptionKey();
        const db = await setupPowerSync(key);
        if (mounted) setPowerSyncDb(db);
        
        await db.connect(connector);

        if (!currentActiveId) {
          try {
            const ws = await db.getAll<{ id: string; is_personal: number }>(
              `SELECT id, is_personal FROM workspaces ORDER BY is_personal DESC LIMIT 1`
            );
            if (ws.length > 0 && mounted) {
              setActiveWorkspaceId(ws[0].id);
            }
          } catch (e) {
            console.warn('Could not load initial workspace from SQLite:', e);
          }
        }
      } catch (err) {
        console.error('Failed to init PowerSync:', err);
      }
      
      if (mounted) setIsLoading(false);
    };

    init();

    // Listen for Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setActiveWorkspaceId(null);
        if (powerSyncDb) await powerSyncDb.disconnectAndClear();
      } else if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setActiveWorkspaceId(session.user?.user_metadata?.active_workspace_id || null);
        
        const key = await getOrGenerateEncryptionKey();
        const db = await setupPowerSync(key);
        setPowerSyncDb(db);
        await db.connect(connector);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [connector]);

  const switchWorkspace = async (workspaceId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { active_workspace_id: workspaceId }
      });
      if (error) throw error;

      setActiveWorkspaceId(workspaceId);

      if (powerSyncDb) {
        await powerSyncDb.disconnect();
        await powerSyncDb.connect(connector);
      }
    } catch (err) {
      console.error('Failed to switch workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PowerSyncContext.Provider value={powerSyncDb as any}>
      <WorkspaceContext.Provider value={{ activeWorkspaceId, setActiveWorkspaceId, switchWorkspace, isLoading, syncStatus: null, isAuthenticated }}>
        {children}
      </WorkspaceContext.Provider>
    </PowerSyncContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  const powerSync = usePowerSync();
  return {
    ...context,
    syncStatus: powerSync?.currentStatus
  };
};
