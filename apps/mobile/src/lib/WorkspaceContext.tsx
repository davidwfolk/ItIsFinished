import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, powersync } from './powersync';
import { SupabaseConnector } from './SupabaseConnector';
import { checkAndEnforceTTL } from './sqlcipher';

interface WorkspaceContextType {
  activeWorkspaceId: string | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  activeWorkspaceId: null,
  switchWorkspace: async () => {},
  isLoading: true,
});

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connector] = useState(() => new SupabaseConnector());

  useEffect(() => {
    // Initial setup
    const init = async () => {
      // 1. Check TTL and Enforce SQLCipher lock before accessing DB
      const isLocked = await checkAndEnforceTTL();
      if (isLocked) {
        console.warn('TTL Expired. Database is cryptographically locked.');
        // UI should render a lock screen
        return;
      }

      // 2. Load active workspace from user metadata (JWT)
      const { data: { user } } = await supabase.auth.getUser();
      const currentActiveId = user?.user_metadata?.active_workspace_id || null;
      setActiveWorkspaceId(currentActiveId);
      
      // 3. Connect PowerSync (will automatically pull the deep data for the active workspace)
      await powersync.connect(connector);
      setIsLoading(false);
    };
    init();
  }, [connector]);

  const switchWorkspace = async (workspaceId: string) => {
    setIsLoading(true);
    try {
      // 1. Update Supabase Auth to mint a new JWT with the new active_workspace_id
      const { data, error } = await supabase.auth.updateUser({
        data: { active_workspace_id: workspaceId }
      });
      if (error) throw error;

      setActiveWorkspaceId(workspaceId);

      // 2. Disconnect and reconnect PowerSync to trigger the Tiered Hydration parameter swap
      await powersync.disconnect();
      await powersync.connect(connector);
    } catch (err) {
      console.error('Failed to switch workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WorkspaceContext.Provider value={{ activeWorkspaceId, switchWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
