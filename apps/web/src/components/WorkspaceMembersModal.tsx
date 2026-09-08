import { useState } from 'react';
import { Users, Mail, Shield, UserPlus, X, Check, Trash2, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { supabase, powersync } from '../lib/powersync';
import { useQuery } from '@powersync/react';
import { useAuth } from '../hooks/useAuth';

export interface WorkspaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  currentUserRole: string;
}

export function WorkspaceMembersModal({ isOpen, onClose, workspaceId, workspaceName, currentUserRole }: WorkspaceMembersModalProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: members = [] } = useQuery<{
    id: string;
    user_id: string;
    role: string;
    email: string;
    display_name: string;
  }>(
    `SELECT wm.id, wm.user_id, wm.role, p.email, p.display_name 
     FROM workspace_members wm 
     JOIN profiles p ON p.id = wm.user_id 
     WHERE wm.workspace_id = ? 
     ORDER BY wm.role DESC`,
    [workspaceId]
  );

  if (!isOpen) return null;

  const isAdmin = currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';
  const canManageMembers = isOwner || isAdmin;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !canManageMembers) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.rpc('invite_user_to_workspace', {
        p_workspace_id: workspaceId,
        p_email: inviteEmail.trim(),
        p_role: inviteRole
      });

      if (error) throw error;

      setSuccessMessage(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send invite');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this member from the workspace?')) return;
    try {
      await powersync.execute(
        `DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
        [workspaceId, userId]
      );
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <Users className="h-4 w-4" /> Workspace Members
          </div>
          <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
            Members of {workspaceName}
          </h3>
          <p className="text-xs text-zinc-400">
            Control who has access to this workspace and its projects.
          </p>
        </div>

        {canManageMembers && (
          <form onSubmit={handleInvite} className="space-y-2.5 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-blue-400" /> Invite Collaborator
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <Mail className="absolute left-3 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                disabled={isAdmin} // Admins can only invite members
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium disabled:opacity-50"
              >
                <option value="member">Member</option>
                {!isAdmin && <option value="admin">Admin</option>}
              </select>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
              >
                Invite
              </button>
            </div>
            {errorMessage && (
              <div className="text-[11px] text-red-400 mt-1">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <Check className="h-3 w-3" /> {successMessage}
              </div>
            )}
          </form>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            <span>Active Team Members ({members.length})</span>
          </div>
          <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto pr-1">
            {members.map((member, i) => (
              <div key={member.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5] }}
                    className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                  >
                    {(member.display_name || member.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                      {member.display_name || 'User'}
                      {member.role === 'owner' && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                          Owner
                        </span>
                      )}
                      {member.role === 'admin' && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canManageMembers && member.id !== user?.id && (
                    <>
                      {/* Only Owners can remove Admins/Owners. Admins can only remove Members */}
                      {(isOwner || (isAdmin && member.role === 'member')) && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition"
                          title="Remove member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300 flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-blue-400" /> PostgreSQL Role Enforcement:
          </p>
          <p>• <strong>Owner:</strong> Full access + billing + member management.</p>
          <p>• <strong>Admin:</strong> View all projects, can invite/remove Members.</p>
          <p>• <strong>Member:</strong> Can only view and edit projects explicitly assigned to them.</p>
        </div>
      </div>
    </div>
  );
}
