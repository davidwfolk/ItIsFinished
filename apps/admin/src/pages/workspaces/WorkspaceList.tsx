import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Lock,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  User,
  Trash2,
  AlertOctagon,
  CheckSquare,
  KeyRound,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/Badge';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';

interface Workspace {
  id: string;
  name: string;
  is_personal: boolean;
  workspace_tier: 'free' | 'pro' | 'business' | 'enterprise';
  max_seats: number;
  workspace_status: 'active' | 'locked' | 'suspended' | 'archived';
  workspace_status_changed_at: string | null;
  workspace_status_reason: string | null;
  created_at: string;
  member_count?: number;
  owner_email?: string;
  owner_name?: string;
}

export function WorkspaceList() {
  const { user: currentAdmin } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'pro' | 'business' | 'enterprise' | 'flagged'>('all');
  const [statusModalWs, setStatusModalWs] = useState<Workspace | null>(null);
  const [targetStatus, setTargetStatus] = useState<Workspace['workspace_status'] | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 3-Step Nuclear Decommissioning Gauntlet State
  const [decommissionWs, setDecommissionWs] = useState<Workspace | null>(null);
  const [decommissionStep, setDecommissionStep] = useState<0 | 1 | 2 | 3>(0);
  const [stakeholderVerified, setStakeholderVerified] = useState(false);
  const [stakeholderContact, setStakeholderContact] = useState('');
  const [decommissionReason, setDecommissionReason] = useState('');
  const [typingInput, setTypingInput] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(5);
  const [sudoPassword, setSudoPassword] = useState('');
  const [sudoLoading, setSudoLoading] = useState(false);
  const [sudoError, setSudoError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          workspace_members (
            id,
            user_id,
            role,
            profiles:user_id (
              email,
              display_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((ws: any) => {
        const mems = ws.workspace_members || [];
        const owners = mems.filter((m: any) => m.role === 'owner');
        const primaryOwner = owners[0]?.profiles;
        const ownerEmail = primaryOwner?.email || (owners.length > 0 ? 'Unknown User' : 'No Owner Assigned');
        const ownerName = primaryOwner?.display_name || null;

        return {
          ...ws,
          member_count: mems.length,
          max_seats: ws.max_seats || 5,
          workspace_tier: ws.workspace_tier || 'free',
          owner_email: ownerEmail,
          owner_name: ownerName,
        };
      });

      setWorkspaces(mapped);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to fetch workspaces.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

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

  const handleStatusChange = async (reason: string, requestId: string) => {
    if (!statusModalWs || !targetStatus) return;

    const { data, error } = await supabase.rpc('admin_set_workspace_status', {
      workspace_id: statusModalWs.id,
      requested_status: targetStatus,
      reason,
      request_id: requestId,
    });

    if (error) throw new Error(error.message);

    setBanner({
      type: 'success',
      message: `Workspace "${statusModalWs.name}" status updated to ${targetStatus.toUpperCase()} (${data?.idempotent ? 'Idempotent Retry' : 'Applied'}).`,
    });
    setStatusModalWs(null);
    setTargetStatus(null);
    fetchWorkspaces();
  };

  const startDecommission = (ws: Workspace) => {
    setDecommissionWs(ws);
    setDecommissionStep(1);
    setStakeholderVerified(false);
    setStakeholderContact('');
    setDecommissionReason('');
    setTypingInput('');
    setCooldownSeconds(5);
    setSudoPassword('');
    setSudoError(null);
  };

  const handleSudoDecommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decommissionWs || !currentAdmin?.email || !sudoPassword) return;

    setSudoLoading(true);
    setSudoError(null);

    try {
      // 1. Re-authenticate Superadmin Password
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: currentAdmin.email,
        password: sudoPassword,
      });

      if (authErr) {
        throw new Error('Sudo password verification failed: ' + authErr.message);
      }

      // 2. Execute audited deletion
      const requestId = crypto.randomUUID();
      const { error: rpcErr } = await supabase.rpc('admin_delete_business_workspace', {
        workspace_id: decommissionWs.id,
        stakeholder_contact: stakeholderContact,
        reason: decommissionReason,
        request_id: requestId,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      setBanner({
        type: 'success',
        message: `Workspace "${decommissionWs.name}" was permanently decommissioned and purged.`,
      });
      setDecommissionStep(0);
      setDecommissionWs(null);
      fetchWorkspaces();
    } catch (err: any) {
      setSudoError(err.message || 'Decommissioning failed.');
    } finally {
      setSudoLoading(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch =
      ws.name?.toLowerCase().includes(search.toLowerCase()) ||
      ws.owner_email?.toLowerCase().includes(search.toLowerCase()) ||
      ws.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      ws.id.includes(search);

    if (!matchesSearch) return false;

    if (filter === 'free') return ws.workspace_tier === 'free';
    if (filter === 'pro') return ws.workspace_tier === 'pro';
    if (filter === 'business') return ws.workspace_tier === 'business';
    if (filter === 'enterprise') return ws.workspace_tier === 'enterprise';
    if (filter === 'flagged') return ws.workspace_status !== 'active';
    return true;
  });

  const requiredTypingPhrase = decommissionWs ? `DELETE ${decommissionWs.name}` : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Workspace Governance Directory</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Monitor organizations across Free, Pro, Business, and Enterprise tiers with seat utilization, lock toggles, and audited decommissioning.
          </p>
        </div>
        <button
          onClick={fetchWorkspaces}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-300 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspace, owner email, name, or UUID..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 p-1 border border-zinc-800 rounded-lg self-stretch sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'free', label: 'Free' },
            { id: 'pro', label: 'Pro' },
            { id: 'business', label: 'Business' },
            { id: 'enterprise', label: 'Enterprise' },
            { id: 'flagged', label: 'Non-Active' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition ${
                filter === tab.id
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Workspace Name</th>
                <th className="px-5 py-3">Owner / Account</th>
                <th className="px-5 py-3">Tier</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Seats / Members</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading && workspaces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                    Loading workspaces...
                  </td>
                </tr>
              ) : filteredWorkspaces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                    No workspaces matching criteria.
                  </td>
                </tr>
              ) : (
                filteredWorkspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/workspaces/${ws.id}`}
                        className="font-medium text-zinc-200 hover:text-rose-400 transition flex items-center gap-1.5"
                      >
                        <span>{ws.name}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-500" />
                      </Link>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        ID: {ws.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{ws.owner_email}</span>
                      </div>
                      {ws.owner_name && ws.owner_name !== ws.owner_email && (
                        <div className="text-[11px] text-zinc-500 mt-0.5 pl-5">
                          {ws.owner_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={ws.workspace_tier} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={ws.workspace_status} />
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300 font-mono text-[11px]">
                      {ws.is_personal ? (
                        <span className="text-zinc-500">1 Seat (Personal)</span>
                      ) : (
                        <span className={ws.member_count! >= ws.max_seats ? 'text-amber-400 font-semibold' : ''}>
                          {ws.member_count} / {ws.max_seats} Seats
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {ws.workspace_status === 'active' ? (
                        <button
                          onClick={() => {
                            setStatusModalWs(ws);
                            setTargetStatus('locked');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded text-[11px] font-medium transition"
                        >
                          <Lock className="h-3 w-3" />
                          <span>Lock</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setStatusModalWs(ws);
                            setTargetStatus('active');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded text-[11px] font-medium transition"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Unlock</span>
                        </button>
                      )}

                      <button
                        onClick={() => startDecommission(ws)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded text-[11px] font-medium transition"
                      >
                        <Trash2 className="h-3 w-3 text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Lock / Unlock */}
      {statusModalWs && targetStatus && (
        <ConfirmModal
          isOpen={true}
          onClose={() => {
            setStatusModalWs(null);
            setTargetStatus(null);
          }}
          onConfirm={handleStatusChange}
          title={`Transition Workspace: ${targetStatus.toUpperCase()}`}
          description={`Are you sure you want to transition "${statusModalWs.name}" from ${statusModalWs.workspace_status.toUpperCase()} to ${targetStatus.toUpperCase()}?`}
          confirmLabel={`Set to ${targetStatus.toUpperCase()}`}
          confirmVariant={targetStatus === 'active' ? 'primary' : 'warning'}
        />
      )}

      {/* ===================================================================== */}
      {/* 3-STEP NUCLEAR DECOMMISSIONING GAUNTLET MODALS */}
      {/* ===================================================================== */}

      {/* GATE 1: Administrative & Stakeholder Verification */}
      {decommissionStep === 1 && decommissionWs && (
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
                  Decommission Workspace
                </h3>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              You are preparing to permanently destroy workspace{' '}
              <strong className="text-white">"{decommissionWs.name}"</strong> (Owner:{' '}
              <span className="text-zinc-400 font-mono">{decommissionWs.owner_email}</span>). This action will purge all projects, tasks, and member associations.
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
                  onClick={() => {
                    setDecommissionStep(0);
                    setDecommissionWs(null);
                  }}
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
      {decommissionStep === 2 && decommissionWs && (
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
                  onClick={() => {
                    setDecommissionStep(0);
                    setDecommissionWs(null);
                  }}
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
      {decommissionStep === 3 && decommissionWs && (
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
              <strong>"{decommissionWs.name}"</strong>.
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
                  onClick={() => {
                    setDecommissionStep(0);
                    setDecommissionWs(null);
                  }}
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
