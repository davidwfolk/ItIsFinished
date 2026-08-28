import { useState } from 'react';
import { Users, Mail, Shield, UserPlus, X, Check, Trash2 } from 'lucide-react';

export interface ProjectMember {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'editor' | 'viewer';
  avatarUrl?: string;
}

export interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

export function ProjectMembersModal({ isOpen, onClose, projectName }: ProjectMembersModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [members, setMembers] = useState<ProjectMember[]>([
    { id: '1', email: 'you@workspace.com', displayName: 'You (Owner)', role: 'admin' },
    { id: '2', email: 'sarah.dev@company.com', displayName: 'Sarah Lin', role: 'editor' },
    { id: '3', email: 'alex.design@company.com', displayName: 'Alex Rivera', role: 'viewer' },
  ]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: ProjectMember = {
      id: crypto.randomUUID(),
      email: inviteEmail.trim(),
      displayName: inviteEmail.split('@')[0],
      role: inviteRole,
    };

    setMembers([...members, newMember]);
    setSuccessMessage(`Invitation sent to ${inviteEmail} as ${inviteRole.toUpperCase()}`);
    setInviteEmail('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  const roleDescriptions = {
    admin: 'Full access: manage project settings, members, and delete tasks',
    editor: 'Can create, edit, reorder, and complete tasks',
    viewer: 'Read-only access: view tasks, calendar, and comments',
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-300 p-1 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <Users className="h-4 w-4" /> Workspace Collaboration
          </div>
          <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
            Members of #{projectName}
          </h3>
          <p className="text-xs text-zinc-400">
            Control team permissions with PostgreSQL Row Level Security (RLS).
          </p>
        </div>

        {/* Invite Form */}
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
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
            >
              Invite
            </button>
          </div>
          {successMessage && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <Check className="h-3 w-3" /> {successMessage}
            </div>
          )}
        </form>

        {/* Active Members List */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            Active Members ({members.length})
          </span>
          <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto pr-1">
            {members.map((member) => (
              <div key={member.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">{member.displayName}</p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.id === '1' ? (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                      Owner
                    </span>
                  ) : (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                        className="bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 rounded px-2 py-1 focus:outline-none"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-zinc-600 hover:text-red-400 p-1 transition"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Explainer */}
        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300 flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-blue-400" /> PostgreSQL Role Enforcement:
          </p>
          <p>• <strong>Editor:</strong> {roleDescriptions.editor}</p>
          <p>• <strong>Viewer:</strong> {roleDescriptions.viewer}</p>
        </div>
      </div>
    </div>
  );
}
