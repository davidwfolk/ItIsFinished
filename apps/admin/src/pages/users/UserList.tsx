import { useEffect, useState } from 'react';
import { Search, Sparkles, ArrowDownCircle, RefreshCw, Award, Check, HardDrive, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/Badge';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  entitlement_tier: 'free' | 'pro';
  entitlement_source: 'default' | 'stripe' | 'admin_override';
  entitlement_override_expires_at: string | null;
  entitlement_updated_at: string;
  created_at: string;
  is_early_adopter?: boolean;
  is_vip?: boolean;
  grandfathered_plan_version?: string;
  grandfathered_limits?: any;
  vip_custom_perks?: any;
}

export function UserList() {
  const { user: currentAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [superAdminIds, setSuperAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'pro'>('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [targetTier, setTargetTier] = useState<'free' | 'pro' | null>(null);
  const [badgeModalUser, setBadgeModalUser] = useState<Profile | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    is_early_adopter: false,
    is_vip: false,
    max_workspaces: 1,
    max_collaborators_per_workspace: 1,
    max_projects_per_workspace: 1,
    max_saved_filters: 1,
    storage_limit_mb: 100,
    max_file_size_mb: 5,
    history_retention_days: 30,
    has_time_blocking: false,
    has_eisenhower_matrix: false,
    has_focus_engine: true,
    has_daily_habits: true,
    has_weekly_review: false,
    has_workspace_aggregate_stats: false,
    has_per_member_breakdown: false,
    can_export_data: false,
    reason: '',
  });
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const [profilesRes, saRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('super_admins').select('user_id').is('revoked_at', null),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      setProfiles(profilesRes.data || []);

      if (saRes.data) {
        setSuperAdminIds(new Set(saRes.data.map((s: any) => s.user_id)));
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to fetch profiles.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleTierChange = async (reason: string, requestId: string) => {
    if (!selectedUser || !targetTier) return;

    const { data, error } = await supabase.rpc('admin_set_profile_tier', {
      target_user_id: selectedUser.id,
      requested_tier: targetTier,
      reason,
      request_id: requestId,
    });

    if (error) {
      throw new Error(error.message);
    }

    setBanner({
      type: 'success',
      message: `User ${selectedUser.email} successfully updated to ${targetTier.toUpperCase()} (${data?.idempotent ? 'Idempotent Retry' : 'Applied'}).`,
    });
    setSelectedUser(null);
    setTargetTier(null);
    fetchProfiles();
  };

  const openBadgeModal = (profile: Profile) => {
    setBadgeModalUser(profile);
    setBadgeForm({
      is_early_adopter: !!profile.is_early_adopter,
      is_vip: !!profile.is_vip,
      max_workspaces: profile.vip_custom_perks?.max_workspaces ?? 1,
      max_collaborators_per_workspace: profile.vip_custom_perks?.max_collaborators_per_workspace ?? 1,
      max_projects_per_workspace: profile.vip_custom_perks?.max_projects_per_workspace ?? 1,
      max_saved_filters: profile.vip_custom_perks?.max_saved_filters ?? 1,
      storage_limit_mb: profile.vip_custom_perks?.storage_limit_mb ?? 100,
      max_file_size_mb: profile.vip_custom_perks?.max_file_size_mb ?? 5,
      history_retention_days: profile.vip_custom_perks?.history_retention_days ?? 30,
      has_time_blocking: profile.vip_custom_perks?.has_time_blocking ?? false,
      has_eisenhower_matrix: profile.vip_custom_perks?.has_eisenhower_matrix ?? false,
      has_focus_engine: profile.vip_custom_perks?.has_focus_engine ?? true,
      has_daily_habits: profile.vip_custom_perks?.has_daily_habits ?? true,
      has_weekly_review: profile.vip_custom_perks?.has_weekly_review ?? false,
      has_workspace_aggregate_stats: profile.vip_custom_perks?.has_workspace_aggregate_stats ?? false,
      has_per_member_breakdown: profile.vip_custom_perks?.has_per_member_breakdown ?? false,
      can_export_data: profile.vip_custom_perks?.can_export_data ?? false,
      reason: `Updated badges and perks for ${profile.email}`,
    });
  };

  const handleBadgeSubmit = async () => {
    if (!badgeModalUser) return;
    try {
      const vipPerks = badgeForm.is_vip
        ? {
            max_workspaces: Number(badgeForm.max_workspaces),
            max_collaborators_per_workspace: Number(badgeForm.max_collaborators_per_workspace),
            max_projects_per_workspace: Number(badgeForm.max_projects_per_workspace),
            max_saved_filters: Number(badgeForm.max_saved_filters),
            storage_limit_mb: Number(badgeForm.storage_limit_mb),
            max_file_size_mb: Number(badgeForm.max_file_size_mb),
            history_retention_days: Number(badgeForm.history_retention_days),
            has_time_blocking: Boolean(badgeForm.has_time_blocking),
            has_eisenhower_matrix: Boolean(badgeForm.has_eisenhower_matrix),
            has_focus_engine: Boolean(badgeForm.has_focus_engine),
            has_daily_habits: Boolean(badgeForm.has_daily_habits),
            has_weekly_review: Boolean(badgeForm.has_weekly_review),
            has_workspace_aggregate_stats: Boolean(badgeForm.has_workspace_aggregate_stats),
            has_per_member_breakdown: Boolean(badgeForm.has_per_member_breakdown),
            can_export_data: Boolean(badgeForm.can_export_data),
          }
        : null;

      const { error } = await supabase.rpc('admin_set_user_badges', {
        target_user_id: badgeModalUser.id,
        is_early_adopter: badgeForm.is_early_adopter,
        is_vip: badgeForm.is_vip,
        vip_custom_perks: vipPerks,
        reason: badgeForm.reason || 'Admin updated badges',
        request_id: crypto.randomUUID(),
      });

      if (error) throw error;

      setBanner({
        type: 'success',
        message: `Successfully updated badges for ${badgeModalUser.email}!`,
      });
      setBadgeModalUser(null);
      fetchProfiles();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update badges.' });
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.id.includes(search);

    const matchesTier = tierFilter === 'all' || p.entitlement_tier === tierFilter;

    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>User Entitlement Directory</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage individual user tiers (Free/Pro), inspect effective entitlement sources, and apply audited overrides.
          </p>
        </div>
        <button
          onClick={fetchProfiles}
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
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, or UUID..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 p-1 border border-zinc-800 rounded-lg self-stretch sm:self-auto">
          {(['all', 'free', 'pro'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTierFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition ${
                tierFilter === tab
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab}
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
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Entitlement Tier</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading && profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-zinc-200 flex items-center gap-2 flex-wrap">
                        <span>{profile.email}</span>
                        {superAdminIds.has(profile.id) && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 text-[10px] font-mono font-bold tracking-wider uppercase">
                            SUPERADMIN {profile.id === currentAdmin?.id ? '(YOU)' : ''}
                          </span>
                        )}
                        {profile.is_early_adopter && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tracking-wider">
                            ⭐ EARLY ADOPTER
                          </span>
                        )}
                        {profile.is_vip && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold tracking-wider">
                            👑 VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {profile.display_name || 'No display name'} • ID: {profile.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={profile.entitlement_tier} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-zinc-400 font-mono text-[11px]">
                        {profile.entitlement_source}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono text-[11px]">
                      {new Date(profile.entitlement_updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openBadgeModal(profile)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg font-medium text-xs transition"
                          title="Manage Early Adopter & VIP Badges"
                        >
                          <Award className="h-3.5 w-3.5 text-amber-400" />
                          <span>Badges & VIP</span>
                        </button>

                        {profile.entitlement_tier === 'free' ? (
                          <button
                            onClick={() => {
                              setSelectedUser(profile);
                              setTargetTier('pro');
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/80 rounded-lg font-medium text-xs transition"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Upgrade to Pro</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedUser(profile);
                              setTargetTier('free');
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg font-medium text-xs transition"
                          >
                            <ArrowDownCircle className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Downgrade to Free</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedUser && targetTier && (
        <ConfirmModal
          isOpen={true}
          onClose={() => {
            setSelectedUser(null);
            setTargetTier(null);
          }}
          onConfirm={handleTierChange}
          title={targetTier === 'pro' ? 'Upgrade User to Pro' : 'Downgrade User to Free'}
          description={`Are you sure you want to set the effective entitlement for ${selectedUser.email} to ${targetTier.toUpperCase()}?`}
          confirmLabel={targetTier === 'pro' ? 'Confirm Pro Upgrade' : 'Confirm Downgrade'}
          confirmVariant={targetTier === 'pro' ? 'primary' : 'warning'}
        />
      )}

      {/* Badge & VIP Management Modal */}
      {badgeModalUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              <span>Manage Badges & VIP: {badgeModalUser.email}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-zinc-200">⭐ Early Adopter</p>
                  <p className="text-[11px] text-zinc-500">Locks in original Free tier limits for life</p>
                </div>
                <input
                  type="checkbox"
                  checked={badgeForm.is_early_adopter}
                  onChange={(e) => setBadgeForm({ ...badgeForm, is_early_adopter: e.target.checked })}
                  className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-400 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-purple-300">👑 VIP Custom Entitlements</p>
                  <p className="text-[11px] text-zinc-500">Grant custom workspace & collaborator limits</p>
                </div>
                <input
                  type="checkbox"
                  checked={badgeForm.is_vip}
                  onChange={(e) => setBadgeForm({ ...badgeForm, is_vip: e.target.checked })}
                  className="rounded bg-zinc-900 border-zinc-700 text-purple-500 focus:ring-purple-400 h-4 w-4"
                />
              </label>

              {badgeForm.is_vip && (
                <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {/* Quotas */}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      <span>Numeric Limits & Quotas</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Max Workspaces</span>
                        <input type="number" min="1" value={badgeForm.max_workspaces} onChange={(e) => setBadgeForm({ ...badgeForm, max_workspaces: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 bg-zinc-950 border border-purple-800/50 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Collaborators / WS</span>
                        <input type="number" min="0" value={badgeForm.max_collaborators_per_workspace} onChange={(e) => setBadgeForm({ ...badgeForm, max_collaborators_per_workspace: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1 bg-zinc-950 border border-purple-800/50 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Max Projects</span>
                        <input type="number" value={badgeForm.max_projects_per_workspace} onChange={(e) => setBadgeForm({ ...badgeForm, max_projects_per_workspace: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 bg-zinc-950 border border-purple-800/50 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Saved Filters</span>
                        <input type="number" value={badgeForm.max_saved_filters} onChange={(e) => setBadgeForm({ ...badgeForm, max_saved_filters: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 bg-zinc-950 border border-purple-800/50 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-purple-500" />
                      </div>
                    </div>
                  </div>

                  {/* Storage */}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2.5 flex items-center gap-1.5">
                      <HardDrive className="h-3 w-3" />
                      <span>Storage & Retention</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Storage (MB)</span>
                        <input type="number" value={badgeForm.storage_limit_mb} onChange={(e) => setBadgeForm({ ...badgeForm, storage_limit_mb: parseInt(e.target.value) || 100 })} className="w-20 px-2 py-1 bg-zinc-950 border border-purple-800/50 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Max Upload (MB)</span>
                        <input type="number" value={badgeForm.max_file_size_mb} onChange={(e) => setBadgeForm({ ...badgeForm, max_file_size_mb: parseInt(e.target.value) || 5 })} className="w-20 px-2 py-1 bg-zinc-950 border border-purple-800/50 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Retention (Days)</span>
                        <input type="number" value={badgeForm.history_retention_days} onChange={(e) => setBadgeForm({ ...badgeForm, history_retention_days: parseInt(e.target.value) || 30 })} className="w-20 px-2 py-1 bg-zinc-950 border border-purple-800/50 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-purple-500" />
                      </div>
                    </div>
                  </div>

                  {/* Feature Flags */}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2.5 flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Independent Feature Gating</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { key: 'has_time_blocking', label: 'Time-Blocking (Grid)' },
                        { key: 'has_eisenhower_matrix', label: 'Eisenhower Matrix' },
                        { key: 'has_focus_engine', label: 'Focus Engine' },
                        { key: 'has_daily_habits', label: 'Daily Habits' },
                        { key: 'has_weekly_review', label: 'Weekly Review' },
                        { key: 'has_workspace_aggregate_stats', label: 'Workspace Aggregate' },
                        { key: 'has_per_member_breakdown', label: 'Per-Member Breakdown' },
                        { key: 'can_export_data', label: 'Data Export (CSV/JSON)' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between cursor-pointer py-0.5">
                          <span className="text-zinc-300">{label}</span>
                          <input
                            type="checkbox"
                            checked={(badgeForm as any)[key]}
                            onChange={(e) => setBadgeForm({ ...badgeForm, [key]: e.target.checked })}
                            className="rounded bg-zinc-950 border-purple-800/50 text-purple-600 focus:ring-purple-500 h-4 w-4"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Audit Reason (Required)
                </label>
                <input
                  type="text"
                  value={badgeForm.reason}
                  onChange={(e) => setBadgeForm({ ...badgeForm, reason: e.target.value })}
                  placeholder="Reason for badge / perk modification..."
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setBadgeModalUser(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBadgeSubmit}
                disabled={!badgeForm.reason.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Badge Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
