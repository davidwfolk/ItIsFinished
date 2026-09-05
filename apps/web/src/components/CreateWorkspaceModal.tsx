import { useState } from 'react';
import { X, Briefcase, User, Users, Sparkles, Loader2 } from 'lucide-react';
import { usePowerSync } from '@powersync/react';
import { supabase } from '../lib/powersync';
import { createWorkspace } from '@app/core';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newWorkspaceId: string) => void;
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
}: CreateWorkspaceModalProps) {
  const powersync = usePowerSync();
  const [name, setName] = useState('');
  const [workspaceType, setWorkspaceType] = useState<'personal' | 'team'>('team');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a workspace name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error('You must be signed in to create a workspace');
      }

      // 1. Create workspace locally in SQLite via PowerSync
      const isPersonal = workspaceType === 'personal';
      const newId = await createWorkspace(powersync, userId, {
        name: trimmed,
        is_personal: isPersonal,
      });

      // 2. Update Supabase Auth user metadata so PowerSync deep data syncs for this workspace
      try {
        await supabase.auth.updateUser({
          data: { active_workspace_id: newId },
        });
      } catch (authErr) {
        console.warn('Could not update active_workspace_id in auth metadata:', authErr);
      }

      // 3. Reset form and inform parent
      setName('');
      setWorkspaceType('team');
      onCreated(newId);
      onClose();
    } catch (err: any) {
      console.error('Failed to create workspace:', err);
      setError(err?.message || 'Failed to create workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
              Create New Workspace
            </h3>
            <p className="text-xs text-zinc-400">
              Workspaces isolate projects, tasks, and team members.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Acme Corp, Side Projects, Consulting"
              disabled={isSubmitting}
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Workspace Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setWorkspaceType('team')}
                disabled={isSubmitting}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  workspaceType === 'team'
                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-400'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200 mb-1">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>Team Workspace</span>
                </div>
                <span className="text-[11px] text-zinc-500 leading-tight">
                  Collaborative workspace. Invite team members anytime.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceType('personal')}
                disabled={isSubmitting}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  workspaceType === 'personal'
                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-400'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200 mb-1">
                  <User className="h-4 w-4 text-emerald-400" />
                  <span>Personal</span>
                </div>
                <span className="text-[11px] text-zinc-500 leading-tight">
                  Private solo workspace. Exclusively for your own use.
                </span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-xs shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Create Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
