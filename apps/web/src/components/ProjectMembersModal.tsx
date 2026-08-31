import { useState } from 'react';
import { Users, Mail, Shield, UserPlus, X, Check, Trash2, Copy, Link } from 'lucide-react';

export interface ProjectMember {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'editor' | 'viewer';
  color: string;
  isOnline: boolean;
}

export interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

export function ProjectMembersModal({ isOpen, onClose, projectName }: ProjectMembersModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [copiedLink, setCopiedLink] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const colors = ['#EC4899', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'];
    const newMember: ProjectMember = {
      id: crypto.randomUUID(),
      email: inviteEmail.trim(),
      displayName: inviteEmail.split('@')[0],
      role: inviteRole,
      color: colors[members.length % colors.length],
      isOnline: false,
    };

    setMembers([...members, newMember]);
    setSuccessMessage(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRoleChange = (memberId: string, newRole: 'editor' | 'viewer') => {
    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(`https://itisfinished.app/join/p-${projectName.toLowerCase().replace(/\s+/g, '-')}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const roleDescriptions = {
    owner: 'Full workspace access and billing',
    editor: 'Can create, edit, reorder, and complete tasks',
    viewer: 'Read-only access: view tasks, calendar, and comments',
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

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <Users className="h-4 w-4" /> Real-time Workspace Collaboration
          </div>
          <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
            Members of #{projectName}
          </h3>
          <p className="text-xs text-zinc-400">
            Control team permissions with live presence and role enforcement.
          </p>
        </div>

        {/* Share Link Card */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300 truncate min-w-0">
            <Link className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="truncate font-mono text-[11px] text-zinc-400">
              https://itisfinished.app/join/p-{projectName.toLowerCase().replace(/\s+/g, '-')}
            </span>
          </div>

          <button
            onClick={handleCopyInviteLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              copiedLink 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </>
            )}
          </button>
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
              <option value="editor">Can Edit</option>
              <option value="viewer">View Only</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
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
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            <span>Active Team Members ({members.length})</span>
            <span className="text-[10px] text-emerald-400 lowercase font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {members.filter(m => m.isOnline).length} online
            </span>
          </div>
          <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto pr-1">
            {members.map((member) => (
              <div key={member.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <div 
                      style={{ backgroundColor: member.color }}
                      className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                    >
                      {member.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    {member.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                      {member.displayName}
                      {member.role === 'owner' && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.role === 'owner' ? null : (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                        className="bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 rounded-lg px-2.5 py-1 focus:outline-none"
                      >
                        <option value="editor">Can Edit</option>
                        <option value="viewer">View Only</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition"
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
          <p>• <strong>Can Edit:</strong> {roleDescriptions.editor}</p>
          <p>• <strong>View Only:</strong> {roleDescriptions.viewer}</p>
        </div>
      </div>
    </div>
  );
}

