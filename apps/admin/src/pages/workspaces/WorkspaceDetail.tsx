import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  UserCheck,
  Lock,
  CheckCircle,
  RefreshCw,
  UserPlus,
  UserMinus,
  Crown,
  Layers,
  Trash2,
  AlertOctagon,
  KeyRound,
  CheckSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/Badge';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  profiles?: {
    email: string;
    display_name: string | null;
  };
}

export function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentAdmin } = useAuth();

  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Transfer Ownership Modal State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [oldOwnerRole, setOldOwnerRole] = useState<'admin' | 'member'>('admin');

  // Status Change Modal State
  const [targetStatus, setTargetStatus] = useState<string | null>(null);

  // Tier & Seats Modal State
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [targetTier, setTargetTier] = useState<string>('business');
  const [targetSeats, setTargetSeats] = useState<number>(10);

  // Add Member Modal State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addUserRole, setAddUserRole] = useState<'owner' | 'admin' | 'member'>('member');

  // Remove Member Modal State
  const [removingMember, setRemovingMember] = useState<WorkspaceMember | null>(null);

  // Change Role Modal State
  const [roleChangingMember, setRoleChangingMember] = useState<WorkspaceMember | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<'owner' | 'admin' | 'member'>('member');

  // ============================================================================
  // 3-STEP NUCLEAR DECOMMISSIONING GAUNTLET STATE
  // ============================================================================
  const [decommissionStep, setDecommissionStep] = useState<0 | 1 | 2 | 3>(0);
  const [stakeholderVerified, setStakeholderVerified] = useState(false);
  const [stakeholderContact, setStakeholderContact] = useState('');
  const [decommissionReason, setDecommissionReason] = useState('');

  const [typingInput, setTypingInput] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(5);

  const [sudoPassword, setSudoPassword] = useState('');
  const [sudoLoading, setSudoLoading] = useState(false);
  const [sudoError, setSudoError] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [wsRes, memRes, logRes, profRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', id).single(),
        supabase.from('workspace_members').select('*, profiles:user_id(email, display_name)').eq('workspace_id', id),
        supabase.from('admin_audit_logs').select('*').eq('workspace_id', id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, email, display_name').order('email'),
      ]);

      if (wsRes.error) throw wsRes.error;
      setWorkspace(wsRes.data);
      setTargetTier(wsRes.data.workspace_tier || 'business');
      setTargetSeats(wsRes.data.max_seats || 5);

      if (memRes.error) throw memRes.error;
      setMembers((memRes.data as any) || []);

      if (logRes.error) throw logRes.error;
      setAuditLogs(logRes.data || []);

      if (profRes.data) setAllProfiles(profRes.data);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to load workspace details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Countdown timer for Step 2 of Decommissioning Gauntlet
  useEffect(() => {
    let interval: any;
    if (decommissionStep === 2 && cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [decommissionStep, cooldownSeconds]);

  // Handler: Change Workspace Tier & Seats
  const handleTierAndSeats = async (reason: string, requestId: string) => {
    if (!id) return;
    const { data, error } = await supabase.rpc('admin_set_workspace_tier', {
      workspace_id: id,
      requested_tier: targetTier,
      requested_max_seats: targetSeats,
      reason,
      request_id: requestId,
    });
    if (error) throw new Error(error.message);

    setBanner({
      type: 'success',
      message: `Workspace tier successfully set to ${targetTier.toUpperCase()} (${targetSeats} seats) (${data?.idempotent ? 'Idempotent Retry' : 'Applied'}).`,
    });
    setIsTierModalOpen(false);
    fetchDetails();
  };

  // Handler: Add Member
  const handleAddMember = async (reason: string, requestId: string) => {
    if (!id || !addUserId) return;
    const { data, error } = await supabase.rpc('admin_add_workspace_member', {
      workspace_id: id,
      user_id: addUserId,
      role: addUserRole,
      reason,
      request_id: requestId,
    });
    if (error) throw new Error(error.message);

    setBanner({
      type: 'success',
      message: `Member added to workspace as ${addUserRole.toUpperCase()} (${data?.idempotent ? 'Idempotent' : 'Applied'}).`,
    });
    setIsAddMemberOpen(false);
    setAddUserId('');
    fetchDetails();
  };

  // Handler: Remove Member
  const handleRemoveMember = async (reason: string, requestId: string) => {
    if (!id || !removingMember) return;
    const { data, error } = await supabase.rpc('admin_remove_workspace_member', {
      workspace_id: id,
      user_id: removingMember.user_id,
      reason,
      request_id: requestId,
    });
    if (error) throw new Error(error.message);

    setBanner({
      type: 'success',
      message: `Member removed from workspace (${data?.idempotent ? 'Idempotent' : 'Applied'}).`,
    });
    setRemovingMember(null);
    fetchDetails();
  };

  // Handler: Change Member Role
  const handleChangeRole = async (reason: string, requestId: string) => {
    if (!id || !roleChangingMember) return;
    const { data, error } = await supabase.rpc('admin_set_workspace_member_role', {
      workspace_id: id,
      user_id: roleChangingMember.user_id,
      new_role: newMemberRole,
      reason,
      request_id: requestId,
    });
    if (error) throw new Error(error.message);

    setBanner({
      type: 'success',
      message: `Member role updated to ${newMemberRole.toUpperCase()} (${data?.idempotent ? 'Idempotent' : 'Applied'}).`,
    });
    setRoleChangingMember(null);
    fetchDetails();
  };

  // Handler: Transfer Ownership
  const handleTransferOwnership = async (reason: string, requestId: string) => {
    if (!id || !newOwnerId) return;
    const { data, error } = await supabase.rpc('admin_transfer_workspace_ownership', {
      workspace_id: id,
      new_owner_user_id: newOwnerId,
      reason,
      previous_owner_resulting_role: oldOwnerRole,
      request_id: requestId,
    });
    if (error) throw new Error(error.message);

    setBanner({
      type: 'success',
      message: `Ownership successfully transferred to user ${newOwnerId} (${data?.idempotent ? 'Idempotent' : 'Applied'}).`,
    });
    setIsTransferOpen(false);
    setNewOwnerId('');
    fetchDetails();
  };

  // Handler: Status Change
  const handleStatusChange = async (reason: string, requestId: string) => {
    if (!id || !targetStatus) return;
    const { data, error } = await supabase.rpc('admin_set_workspace_status', {
      workspace_id: id,
      requested_status: targetStatus,
      reason,
      request_id: requestId,
    });
    if (error) throw new Error(error.message);

    setBanner({
      type: 'success',
      message: `Workspace status successfully transitioned to ${targetStatus.toUpperCase()} (${data?.idempotent ? 'Idempotent' : 'Applied'}).`,
    });
    setTargetStatus(null);
    fetchDetails();
  };

  // ============================================================================
  // Handler: Nuclear Decommissioning (Step 3 Sudo Execution)
  // ============================================================================
  const handleSudoDecommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin?.email || !sudoPassword) return;

    setSudoLoading(true);
    setSudoError(null);

    try {
      // Re-authenticate Superadmin Password
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: currentAdmin.email,
        password: sudoPassword,
      });

      if (authErr) {
        throw new Error('Sudo password verification failed: ' + authErr.message);
      }

      // Execute atomic audited deletion
      const requestId = crypto.randomUUID();
      const { error: rpcErr } = await supabase.rpc('admin_delete_business_workspace', {
        workspace_id: id,
        stakeholder_contact: stakeholderContact,
        reason: decommissionReason,
        request_id: requestId,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      alert(`Workspace "${workspace.name}" has been permanently decommissioned and purged.`);
      navigate('/workspaces');
    } catch (err: any) {
      setSudoError(err.message || 'Decommissioning failed.');
    } finally {
      setSudoLoading(false);
    }
  };

  if (loading && !workspace) {
    return (
      <div className="py-12 flex justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading workspace data...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="py-12 text-center text-zinc-400">
        <p>Workspace not found.</p>
        <Link to="/workspaces" className="text-rose-400 text-xs mt-2 inline-block">
          ← Back to directory
        </Link>
      </div>
    );
  }

  const ownerCount = members.filter((m) => m.role === 'owner').length;
  const eligibleNewOwners = members.filter((m) => m.role !== 'owner');
  const existingMemberIds = new Set(members.map((m) => m.user_id));
  const availableUsersToAdd = allProfiles.filter((p) => !existingMemberIds.has(p.id));
  const requiredTypingPhrase = `DELETE ${workspace.name}`;

  return (
    <div className="space-y-8">
      {/* Header Breadcrumbs */}
      <div>
        <Link
          to="/workspaces"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Workspaces</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">{workspace.name}</h1>
              <Badge variant={workspace.workspace_tier} />
              <Badge variant={workspace.workspace_status} />
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-1">UUID: {workspace.id}</p>
          </div>

          {/* Top Actions Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {!workspace.is_personal && (
              <>
                <button
                  onClick={() => setIsTierModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/70 text-indigo-200 border border-indigo-800/80 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Tier & Seats</span>
                </button>

                <button
                  onClick={() => setIsTransferOpen(true)}
                  className="px-3 py-1.5 bg-purple-950/70 hover:bg-purple-900/70 text-purple-200 border border-purple-800/80 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Shield className="h-3.5 w-3.5 text-purple-400" />
                  <span>Transfer Ownership</span>
                </button>
              </>
            )}

            {workspace.workspace_status === 'active' ? (
              <button
                onClick={() => setTargetStatus('locked')}
                className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900/70 text-amber-200 border border-amber-800/80 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Lock Workspace</span>
              </button>
            ) : (
              <button
                onClick={() => setTargetStatus('active')}
                className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-200 border border-emerald-800/80 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Restore to Active</span>
              </button>
            )}

            {/* Nuclear Decommission Button (Business only) */}
            {!workspace.is_personal && (
              <button
                onClick={() => {
                  setDecommissionStep(1);
                  setStakeholderVerified(false);
                  setStakeholderContact('');
                  setDecommissionReason('');
                  setTypingInput('');
                  setCooldownSeconds(5);
                  setSudoPassword('');
                  setSudoError(null);
                }}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Decommission Business</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {banner && (
        <div
          className={`p-3 rounded-lg text-xs border ${
            banner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Tier & Plan</div>
          <div className="text-lg font-bold text-zinc-100 mt-1 capitalize">
            {workspace.workspace_tier.replace('_', ' ')}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {workspace.is_personal ? 'Single User Account' : `${workspace.max_seats} Max Seats Allocated`}
          </div>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Seat Utilization</div>
          <div className="text-lg font-bold text-zinc-100 mt-1 flex items-center gap-2">
            <span>{members.length}</span>
            <span className="text-xs text-zinc-400 font-normal">/ {workspace.max_seats} Seats</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${
                members.length >= workspace.max_seats ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{
                width: `${Math.min(100, (members.length / (workspace.max_seats || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Active Owners</div>
          <div className="text-lg font-bold text-zinc-100 mt-1 flex items-center gap-2">
            <span>{ownerCount}</span>
            {ownerCount === 1 && !workspace.is_personal && (
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                Protected
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Database Invariant Guarded</div>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Status Reason</div>
          <div className="text-sm font-medium text-zinc-300 mt-1 truncate">
            {workspace.workspace_status_reason || 'Operating normally'}
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-zinc-400" />
              <span>Workspace Members & Seat Roster</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage member roles or offboard personnel. Invariants prevent demoting or removing the last owner.
            </p>
          </div>

          {!workspace.is_personal && (
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
              <span>Add Member</span>
            </button>
          )}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Member Email / Name</th>
                <th className="px-5 py-3">User ID</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Member Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-zinc-200 flex items-center gap-2">
                      <span>{m.profiles?.email || 'Unknown Email'}</span>
                      {m.role === 'owner' && <Crown className="h-3 w-3 text-amber-400" />}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {m.profiles?.display_name || 'No display name'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">
                    {m.user_id.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={m.role} />
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 font-mono text-[11px]">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    {!workspace.is_personal && (
                      <>
                        <button
                          onClick={() => {
                            setRoleChangingMember(m);
                            setNewMemberRole(m.role === 'admin' ? 'member' : 'admin');
                          }}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium transition"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => setRemovingMember(m)}
                          disabled={m.role === 'owner' && ownerCount <= 1}
                          title={
                            m.role === 'owner' && ownerCount <= 1
                              ? 'Cannot remove the sole owner of a business'
                              : 'Remove member from workspace'
                          }
                          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded text-[11px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <UserMinus className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail for this workspace */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-400" />
          <span>Workspace Audit History</span>
        </h2>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No administrative audit events recorded for this workspace.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Admin</th>
                  <th className="px-5 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-3 text-zinc-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-rose-300 font-semibold">{log.action}</td>
                    <td className="px-5 py-3 text-zinc-400 text-[11px]">
                      {log.admin_id.slice(0, 8)}...
                    </td>
                    <td className="px-5 py-3 text-zinc-300 font-sans text-xs">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODALS SECTION */}
      {/* ===================================================================== */}

      {/* Tier & Seats Modal */}
      {isTierModalOpen && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setIsTierModalOpen(false)}
          onConfirm={handleTierAndSeats}
          title="Adjust Workspace Tier & Seat Limits"
          description={`Update business tier and seat licensing for "${workspace.name}".`}
          confirmLabel="Apply Tier & Seats"
          confirmVariant="primary"
          extraFields={
            <div className="space-y-3 mb-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Workspace Plan
                </label>
                <select
                  value={targetTier}
                  onChange={(e) => setTargetTier(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="free">Free (1 Workspace, Basic Features)</option>
                  <option value="pro">Pro (Up to 3 Workspaces, Advanced Features)</option>
                  <option value="business">Business (Up to 15 Workspaces, Team Controls & Advanced Features)</option>
                  <option value="enterprise">Enterprise (Custom Allocation & Tailored Business Setup)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Maximum Seats Allowed
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={targetSeats}
                  onChange={(e) => setTargetSeats(parseInt(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          }
        />
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <ConfirmModal
          isOpen={true}
          onClose={() => {
            setIsAddMemberOpen(false);
            setAddUserId('');
          }}
          onConfirm={handleAddMember}
          title="Add Member to Business Workspace"
          description={`Attach an existing user profile directly to "${workspace.name}".`}
          confirmLabel="Add Member"
          confirmVariant="primary"
          extraFields={
            <div className="space-y-3 mb-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  User to Add
                </label>
                <select
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="">Select a user by email...</option>
                  {availableUsersToAdd.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.email} ({p.display_name || 'No Name'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Assigned Role</label>
                <select
                  value={addUserRole}
                  onChange={(e) => setAddUserRole(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="member">MEMBER (Standard Collaboration)</option>
                  <option value="admin">ADMIN (Workspace Management)</option>
                  <option value="owner">OWNER (Co-Owner)</option>
                </select>
              </div>
            </div>
          }
        />
      )}

      {/* Remove Member Modal */}
      {removingMember && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setRemovingMember(null)}
          onConfirm={handleRemoveMember}
          title="Remove Member from Workspace"
          description={`Revoke workspace access for ${removingMember.profiles?.email || removingMember.user_id}. Their task contributions will be preserved.`}
          confirmLabel="Revoke Access"
          confirmVariant="danger"
        />
      )}

      {/* Change Role Modal */}
      {roleChangingMember && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setRoleChangingMember(null)}
          onConfirm={handleChangeRole}
          title="Change Member Role"
          description={`Update permission role for ${roleChangingMember.profiles?.email || roleChangingMember.user_id}.`}
          confirmLabel="Update Role"
          confirmVariant="primary"
          extraFields={
            <div className="mb-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">New Role</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                <option value="member">MEMBER</option>
                <option value="admin">ADMIN</option>
                <option value="owner">OWNER (Promote to Co-Owner)</option>
              </select>
            </div>
          }
        />
      )}

      {/* Transfer Ownership Modal */}
      {isTransferOpen && (
        <ConfirmModal
          isOpen={true}
          onClose={() => {
            setIsTransferOpen(false);
            setNewOwnerId('');
          }}
          onConfirm={handleTransferOwnership}
          title="Transfer Workspace Ownership"
          description="Designate a replacement owner. The previous owner will be atomically demoted to preserve the owner invariant."
          confirmLabel="Execute Transfer"
          confirmVariant="danger"
          extraFields={
            <div className="space-y-3 mb-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Designated Replacement Owner
                </label>
                <select
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="">Select an active member...</option>
                  {eligibleNewOwners.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.email || m.user_id} ({m.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Previous Owner Resulting Role
                </label>
                <select
                  value={oldOwnerRole}
                  onChange={(e) => setOldOwnerRole(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="admin">ADMIN (Recommended: maintains administrative access)</option>
                  <option value="member">MEMBER (Standard user privileges)</option>
                </select>
              </div>
            </div>
          }
        />
      )}

      {/* Status Change Modal */}
      {targetStatus && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setTargetStatus(null)}
          onConfirm={handleStatusChange}
          title={`Transition Workspace: ${targetStatus.toUpperCase()}`}
          description={`Are you sure you want to transition "${workspace.name}" to ${targetStatus.toUpperCase()}?`}
          confirmLabel={`Set to ${targetStatus.toUpperCase()}`}
          confirmVariant={targetStatus === 'active' ? 'primary' : 'warning'}
        />
      )}

      {/* ===================================================================== */}
      {/* 3-STEP NUCLEAR DECOMMISSIONING GAUNTLET MODALS */}
      {/* ===================================================================== */}

      {/* GATE 1: Administrative & Stakeholder Verification */}
      {decommissionStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-rose-800/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                  Gate 1 of 3: Administrative Verification
                </span>
                <h3 className="text-base font-bold text-zinc-100">
                  Decommission Business Account
                </h3>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              You are preparing to permanently destroy workspace{' '}
              <strong className="text-white">"{workspace.name}"</strong>. This will drop all
              projects, tasks, and member associations.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDecommissionStep(2);
                setCooldownSeconds(5);
              }}
              className="space-y-4"
            >
              <label className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition">
                <input
                  type="checkbox"
                  checked={stakeholderVerified}
                  onChange={(e) => setStakeholderVerified(e.target.checked)}
                  required
                  className="mt-0.5 rounded border-zinc-700 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-zinc-300">
                  I have directly contacted and confirmed deletion authorization with the primary
                  executive stakeholder.
                </span>
              </label>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Stakeholder Contact Details <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={stakeholderContact}
                  onChange={(e) => setStakeholderContact(e.target.value)}
                  placeholder="e.g. Jane Doe, CEO — verified via call on 9/4"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Administrative Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={decommissionReason}
                  onChange={(e) => setDecommissionReason(e.target.value)}
                  placeholder="Official reason for decommission (contract termination, GDPR purge)..."
                  rows={2}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDecommissionStep(0)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!stakeholderVerified || !stakeholderContact.trim() || !decommissionReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                >
                  Proceed to Safety Interlock →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GATE 2: Typing Challenge + 5-Second Cooldown Timer */}
      {decommissionStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-rose-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-700 text-rose-400">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                  Gate 2 of 3: Safety Interlock
                </span>
                <h3 className="text-base font-bold text-zinc-100">
                  Exact-Match Typing Challenge
                </h3>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-3">
              To prevent accidental deletion, type the exact phrase below:
            </p>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-rose-300 font-bold select-all mb-4">
              {requiredTypingPhrase}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDecommissionStep(3);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                placeholder={`Type "${requiredTypingPhrase}"`}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-rose-600"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDecommissionStep(0)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-lg"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={typingInput !== requiredTypingPhrase || cooldownSeconds > 0}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {cooldownSeconds > 0
                    ? `Safety Hold (${cooldownSeconds}s)...`
                    : 'Proceed to Sudo Authentication →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GATE 3: Sudo Password Re-Authentication */}
      {decommissionStep === 3 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
          <div className="bg-zinc-900 border-2 border-rose-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-600 text-rose-400">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                  Gate 3 of 3: Sudo Mode Re-Authentication
                </span>
                <h3 className="text-base font-bold text-zinc-100">
                  Authorize Nuclear Execution
                </h3>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-4">
              Re-enter your Superadmin account password (<span className="text-white font-mono">{currentAdmin?.email}</span>) to cryptographically authorize the permanent destruction of{' '}
              <strong>"{workspace.name}"</strong>.
            </p>

            {sudoError && (
              <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-xs text-rose-300 mb-4">
                {sudoError}
              </div>
            )}

            <form onSubmit={handleSudoDecommission} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Superadmin Password
                </label>
                <input
                  type="password"
                  value={sudoPassword}
                  onChange={(e) => setSudoPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoFocus
                  disabled={sudoLoading}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={sudoLoading}
                  onClick={() => setDecommissionStep(0)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sudoLoading || !sudoPassword}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                >
                  {sudoLoading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Purging Organization...</span>
                    </>
                  ) : (
                    'Permanently Destroy Workspace'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
