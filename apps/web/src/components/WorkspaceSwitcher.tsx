import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@powersync/react';
import { ChevronDown, Briefcase, User as UserIcon, Check } from 'lucide-react';

interface WorkspaceSwitcherProps {
  activeWorkspaceId: string | null;
  onSwitch: (id: string) => void;
}

export function WorkspaceSwitcher({ activeWorkspaceId, onSwitch }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all workspaces the user has access to
  const { data: workspaces = [] } = useQuery<{ id: string; name: string; is_personal: number }>(
    `SELECT * FROM workspaces ORDER BY is_personal DESC, name ASC`
  );

  useEffect(() => {
    // If no workspace is active, default to the Personal workspace
    if (!activeWorkspaceId && workspaces.length > 0) {
      const personalWorkspace = workspaces.find(w => w.is_personal === 1) || workspaces[0];
      onSwitch(personalWorkspace.id);
    }
  }, [activeWorkspaceId, workspaces, onSwitch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  if (workspaces.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800/50 transition-all text-left"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20 shrink-0">
            {activeWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm tracking-tight text-zinc-100 truncate">
              {activeWorkspace?.name || 'Loading...'}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">
              {activeWorkspace?.is_personal === 1 ? 'Personal Workspace' : 'Team Workspace'}
            </span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Workspaces
          </div>
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                onSwitch(w.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors ${
                activeWorkspaceId === w.id 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {w.is_personal === 1 ? (
                  <UserIcon className="h-4 w-4 opacity-70" />
                ) : (
                  <Briefcase className="h-4 w-4 opacity-70" />
                )}
                <span className="truncate">{w.name}</span>
              </div>
              {activeWorkspaceId === w.id && (
                <Check className="h-4 w-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
