import { useState, useEffect } from 'react';
import { RefreshCw, Save, Check, Sparkles, Layers, HardDrive, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TierConfig {
  tier: 'free' | 'pro' | 'business' | 'enterprise';
  max_workspaces: number;
  max_collaborators_per_workspace: number;
  max_projects_per_workspace: number;
  max_saved_filters: number;
  storage_limit_mb: number;
  max_file_size_mb: number;
  history_retention_days: number;
  has_time_blocking: boolean;
  has_eisenhower_matrix: boolean;
  has_focus_engine: boolean;
  has_daily_habits: boolean;
  has_weekly_review: boolean;
  has_workspace_aggregate_stats: boolean;
  has_per_member_breakdown: boolean;
  can_export_data: boolean;
  updated_at?: string;
}

export function TierMatrix() {
  const [configs, setConfigs] = useState<Record<string, TierConfig>>({});
  const [loading, setLoading] = useState(true);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    tier: 'free' | 'pro' | 'business' | 'enterprise';
    applyGlobally: boolean;
    reason: string;
  } | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tier_configurations')
        .select('*');

      if (error) throw error;
      const mapped: Record<string, TierConfig> = {};
      (data || []).forEach((row: any) => {
        mapped[row.tier] = row;
      });
      setConfigs(mapped);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to load tier configurations.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleFieldChange = (tier: string, field: keyof TierConfig, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
  };

  const [modalError, setModalError] = useState<string | null>(null);

  const handleSaveSubmit = async () => {
    if (!confirmModal) return;
    const { tier, applyGlobally, reason } = confirmModal;
    const config = configs[tier];
    if (!config) return;

    setSavingTier(tier);
    setModalError(null);
    try {
      const { error } = await supabase.rpc('admin_update_tier_config', {
        target_tier: tier,
        max_workspaces: Number(config.max_workspaces),
        max_collaborators_per_workspace: Number(config.max_collaborators_per_workspace),
        max_projects_per_workspace: Number(config.max_projects_per_workspace),
        max_saved_filters: Number(config.max_saved_filters),
        storage_limit_mb: Number(config.storage_limit_mb),
        max_file_size_mb: Number(config.max_file_size_mb),
        history_retention_days: Number(config.history_retention_days),
        has_time_blocking: Boolean(config.has_time_blocking),
        has_eisenhower_matrix: Boolean(config.has_eisenhower_matrix),
        has_focus_engine: Boolean(config.has_focus_engine),
        has_daily_habits: Boolean(config.has_daily_habits),
        has_weekly_review: Boolean(config.has_weekly_review),
        has_workspace_aggregate_stats: Boolean(config.has_workspace_aggregate_stats),
        has_per_member_breakdown: Boolean(config.has_per_member_breakdown),
        can_export_data: Boolean(config.can_export_data),
        apply_globally: applyGlobally,
        reason: reason || `Updated ${tier.toUpperCase()} tier parameters via Admin Matrix`,
        request_id: crypto.randomUUID(),
      });

      if (error) throw error;

      setBanner({
        type: 'success',
        message: `${tier.toUpperCase()} tier successfully updated! ${
          applyGlobally
            ? 'Applied globally to all existing and new accounts.'
            : 'Applied to new signups (existing early adopters grandfathered).'
        }`,
      });
      setConfirmModal(null);
      fetchConfigs();
    } catch (err: any) {
      const msg = err.message || 'Failed to update tier configuration.';
      setModalError(msg);
      setBanner({ type: 'error', message: msg });
    } finally {
      setSavingTier(null);
    }
  };

  const tiers: Array<'free' | 'pro' | 'business' | 'enterprise'> = ['free', 'pro', 'business', 'enterprise'];

  const tierMeta = {
    free: { title: 'Free Tier', badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700', desc: 'Default baseline for new registrations' },
    pro: { title: 'Pro Tier', badgeColor: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80', desc: 'Power individuals and solo pros' },
    business: { title: 'Business Tier', badgeColor: 'bg-blue-950/60 text-blue-300 border-blue-800/80', desc: 'High-velocity collaborative teams' },
    enterprise: { title: 'Enterprise Tier', badgeColor: 'bg-purple-950/60 text-purple-300 border-purple-800/80', desc: 'Unlimited scalable corporate instances' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-rose-500" />
            <span>Plan & Tier Matrix Governance</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure dynamic quotas, independent feature flags, and storage caps per tier. Changes can be grandfathered or applied globally.
          </p>
        </div>
        <button
          onClick={fetchConfigs}
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

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => {
          const cfg = configs[tier];
          if (!cfg) return null;
          const meta = tierMeta[tier];
          const isSaving = savingTier === tier;

          return (
            <div
              key={tier}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-950/40">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${meta.badgeColor}`}>
                    {tier}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {cfg.updated_at ? new Date(cfg.updated_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-zinc-100">{meta.title}</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">{meta.desc}</p>
              </div>

              {/* Form Content */}
              <div className="p-4 space-y-5 text-xs flex-1">
                {/* Section: Quotas */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-rose-400" />
                    <span>Numeric Limits & Quotas</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Max Workspaces</span>
                      <input
                        type="number"
                        min="1"
                        value={cfg.max_workspaces}
                        onChange={(e) => handleFieldChange(tier, 'max_workspaces', parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Collaborators / WS</span>
                      <input
                        type="number"
                        min="0"
                        value={cfg.max_collaborators_per_workspace}
                        onChange={(e) => handleFieldChange(tier, 'max_collaborators_per_workspace', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Max Projects</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={cfg.max_projects_per_workspace}
                          onChange={(e) => handleFieldChange(tier, 'max_projects_per_workspace', parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleFieldChange(tier, 'max_projects_per_workspace', cfg.max_projects_per_workspace === -1 ? 5 : -1)}
                          className={`text-[9px] px-1 py-0.5 rounded font-mono ${cfg.max_projects_per_workspace === -1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                          ∞
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Saved Filters</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={cfg.max_saved_filters}
                          onChange={(e) => handleFieldChange(tier, 'max_saved_filters', parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleFieldChange(tier, 'max_saved_filters', cfg.max_saved_filters === -1 ? 3 : -1)}
                          className={`text-[9px] px-1 py-0.5 rounded font-mono ${cfg.max_saved_filters === -1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                          ∞
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Storage & Retention */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2.5 flex items-center gap-1.5">
                    <HardDrive className="h-3 w-3 text-blue-400" />
                    <span>Storage & Retention</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Storage (MB)</span>
                      <input
                        type="number"
                        value={cfg.storage_limit_mb}
                        onChange={(e) => handleFieldChange(tier, 'storage_limit_mb', parseInt(e.target.value) || 100)}
                        className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Max Upload (MB)</span>
                      <input
                        type="number"
                        value={cfg.max_file_size_mb}
                        onChange={(e) => handleFieldChange(tier, 'max_file_size_mb', parseInt(e.target.value) || 5)}
                        className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Retention (Days)</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={cfg.history_retention_days}
                          onChange={(e) => handleFieldChange(tier, 'history_retention_days', parseInt(e.target.value) || 30)}
                          className="w-16 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-zinc-100 text-xs focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleFieldChange(tier, 'history_retention_days', cfg.history_retention_days === -1 ? 30 : -1)}
                          className={`text-[9px] px-1 py-0.5 rounded font-mono ${cfg.history_retention_days === -1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                          ∞
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Feature Toggles (Independent Checkboxes) */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    <span>Independent Feature Gating</span>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Time-Blocking (Grid)</span>
                      <input
                        type="checkbox"
                        checked={cfg.has_time_blocking}
                        onChange={(e) => handleFieldChange(tier, 'has_time_blocking', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Eisenhower Matrix</span>
                      <input
                        type="checkbox"
                        checked={cfg.has_eisenhower_matrix}
                        onChange={(e) => handleFieldChange(tier, 'has_eisenhower_matrix', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Focus Engine</span>
                      <input
                        type="checkbox"
                        checked={cfg.has_focus_engine}
                        onChange={(e) => handleFieldChange(tier, 'has_focus_engine', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Daily Habits</span>
                      <input
                        type="checkbox"
                        checked={cfg.has_daily_habits}
                        onChange={(e) => handleFieldChange(tier, 'has_daily_habits', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Weekly Review</span>
                      <input
                        type="checkbox"
                        checked={cfg.has_weekly_review}
                        onChange={(e) => handleFieldChange(tier, 'has_weekly_review', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Workspace Aggregate</span>
                      <input
                        type="checkbox"
                        checked={cfg.has_workspace_aggregate_stats}
                        onChange={(e) => handleFieldChange(tier, 'has_workspace_aggregate_stats', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Per-Member Breakdown</span>
                      <input
                        type="checkbox"
                        checked={cfg.has_per_member_breakdown}
                        onChange={(e) => handleFieldChange(tier, 'has_per_member_breakdown', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-zinc-300">Data Export (CSV/JSON)</span>
                      <input
                        type="checkbox"
                        checked={cfg.can_export_data}
                        onChange={(e) => handleFieldChange(tier, 'can_export_data', e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setConfirmModal({
                      tier,
                      applyGlobally: false,
                      reason: `Admin matrix update for ${tier.toUpperCase()}`,
                    })
                  }
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-rose-600 text-zinc-100 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save {tier.toUpperCase()} Changes</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation & Grandfathering Scope Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-rose-500" />
              <span>Confirm {confirmModal.tier.toUpperCase()} Policy Changes</span>
            </h3>

            <p className="text-xs text-zinc-400">
              Select whether this configuration change should grandfather existing accounts or apply globally across all users.
            </p>

            <div className="space-y-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="applyScope"
                  checked={!confirmModal.applyGlobally}
                  onChange={() => setConfirmModal({ ...confirmModal, applyGlobally: false })}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <p className="font-semibold text-zinc-200">Apply to New Users Only (Grandfather Existing)</p>
                  <p className="text-[11px] text-zinc-500">
                    Existing users who joined previously keep their original settings locked in for life.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-zinc-900">
                <input
                  type="radio"
                  name="applyScope"
                  checked={confirmModal.applyGlobally}
                  onChange={() => setConfirmModal({ ...confirmModal, applyGlobally: true })}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <p className="font-semibold text-rose-300">Force Update Globally</p>
                  <p className="text-[11px] text-zinc-500">
                    Overrides legacy limits for all current active accounts immediately.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Audit Reason (Required)
              </label>
              <input
                type="text"
                value={confirmModal.reason}
                onChange={(e) => setConfirmModal({ ...confirmModal, reason: e.target.value })}
                placeholder="Why is this tier configuration being updated?"
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setModalError(null);
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubmit}
                disabled={!confirmModal.reason.trim() || savingTier !== null}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                {savingTier !== null ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm & Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
