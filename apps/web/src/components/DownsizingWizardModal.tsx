import { useState } from 'react';
import { Sparkles, AlertTriangle, Check, ArrowRight, ArrowLeft, Folder, Users, Building2, Timer, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/powersync';

interface WorkspaceItem {
  id: string;
  name: string;
}

interface ProjectItem {
  id: string;
  name: string;
  color?: string;
}

interface MemberItem {
  id: string;
  user_id: string;
  email?: string;
  display_name?: string;
  role: string;
}

interface DownsizingWizardModalProps {
  isOpen: boolean;
  activeWorkspaceId: string;
  workspaces: WorkspaceItem[];
  projects: ProjectItem[];
  members: MemberItem[];
  emergencyUsed: boolean;
  onSuccess: () => void;
  onStartEmergencyPass: () => void;
  onUpgrade?: () => void;
}

export function DownsizingWizardModal({
  isOpen,
  activeWorkspaceId,
  workspaces,
  projects,
  members,
  emergencyUsed,
  onSuccess,
  onStartEmergencyPass,
  onUpgrade,
}: DownsizingWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(
    workspaces.find((w) => w.id === activeWorkspaceId)?.id || workspaces[0]?.id || ''
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members.filter((m) => m.role !== 'owner')[0]?.user_id || ''
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startingEmergency, setStartingEmergency] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalSteps = workspaces.length > 1 ? 3 : 2;
  const showWorkspaceStep = workspaces.length > 1;

  const handleStartEmergency = async () => {
    setStartingEmergency(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.rpc('start_downgrade_emergency_wrap_up', {
        target_workspace_id: activeWorkspaceId,
      });
      if (error) throw error;
      onStartEmergencyPass();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start emergency wrap-up.');
    } finally {
      setStartingEmergency(false);
    }
  };

  const handleExecuteDownsizing = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.rpc('execute_workspace_downsizing', {
        primary_workspace_id: selectedWorkspaceId,
        kept_project_id: selectedProjectId || null,
        kept_collaborator_id: selectedMemberId || null,
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply downsizing.');
      setIsConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWsObj = workspaces.find((w) => w.id === selectedWorkspaceId);
  const selectedProjObj = projects.find((p) => p.id === selectedProjectId);
  const selectedMemObj = members.find((m) => m.user_id === selectedMemberId);

  const nonOwnerMembers = members.filter((m) => m.role !== 'owner');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Upsell & Emergency Bar */}
        <div className="bg-linear-to-r from-blue-900/60 to-purple-900/60 border-b border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold">
              Keep All Workspaces & Projects
            </span>
            <h4 className="text-xs font-semibold text-zinc-100">
              Re-activate Pro to bypass downsizing instantly
            </h4>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onUpgrade) onUpgrade();
              else alert('Redirecting to Stripe checkout to restore Pro tier...');
            }}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Re-activate Pro</span>
          </button>
        </div>

        {/* Wizard Header */}
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/40 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-100">Plan Downsizing Wizard</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
              Step {step} of {totalSteps}
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Your Pro grace period has concluded. Free accounts include 1 workspace, 1 active project, and 1 collaborator.
          </p>

          {/* Emergency 15-Minute Option */}
          {!emergencyUsed && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-amber-200">
                <Timer className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Need 15 minutes to organize tasks?</span>
              </div>
              <button
                type="button"
                disabled={startingEmergency}
                onClick={handleStartEmergency}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-[10px] font-bold transition whitespace-nowrap"
              >
                {startingEmergency ? 'Starting...' : 'Use 15m Pass'}
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Scrollable Step Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* STEP 1: Workspace Selection (if multiple workspaces exist) */}
          {showWorkspaceStep && step === 1 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-zinc-200 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  <span>Select Primary Workspace to Keep</span>
                </h4>
                <p className="text-zinc-400 text-[11px]">
                  Free accounts support 1 workspace. Extra Pro workspaces will be decommissioned and archived.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {workspaces.map((ws) => (
                  <label
                    key={ws.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedWorkspaceId === ws.id
                        ? 'bg-blue-600/15 border-blue-500/40 text-zinc-100'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="primaryWorkspace"
                        value={ws.id}
                        checked={selectedWorkspaceId === ws.id}
                        onChange={() => setSelectedWorkspaceId(ws.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-xs text-zinc-200">{ws.name}</span>
                    </div>
                    {selectedWorkspaceId === ws.id && (
                      <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">
                        Active Choice
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 (or 1 if 1 workspace): Project Selection */}
          {((showWorkspaceStep && step === 2) || (!showWorkspaceStep && step === 1)) && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-zinc-200 flex items-center gap-1.5">
                  <Folder className="h-4 w-4 text-emerald-400" />
                  <span>Select 1 Active Project to Keep</span>
                </h4>
                <p className="text-zinc-400 text-[11px]">
                  The Free plan includes 1 active project. Unselected projects will be safely archived (no data will be deleted) and can be restored if you re-upgrade.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {projects.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 bg-zinc-950 rounded-xl">
                    No extra projects found.
                  </div>
                ) : (
                  projects.map((proj) => (
                    <label
                      key={proj.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        selectedProjectId === proj.id
                          ? 'bg-emerald-600/15 border-emerald-500/40 text-zinc-100'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="keptProject"
                          value={proj.id}
                          checked={selectedProjectId === proj.id}
                          onChange={() => setSelectedProjectId(proj.id)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: proj.color || '#3B82F6' }}
                          />
                          <span className="font-semibold text-xs text-zinc-200">{proj.name}</span>
                        </div>
                      </div>
                      {selectedProjectId === proj.id && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                          Keep Active
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3 (or 2): Collaborator Selection */}
          {((showWorkspaceStep && step === 3) || (!showWorkspaceStep && step === 2)) && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-zinc-200 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>Select 1 Collaborator to Keep</span>
                </h4>
                <p className="text-zinc-400 text-[11px]">
                  Free accounts include 1 invited collaborator (in addition to you as owner). Select the 1 teammate to retain on this workspace.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {nonOwnerMembers.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 bg-zinc-950 rounded-xl">
                    You have no extra collaborators in this workspace.
                  </div>
                ) : (
                  nonOwnerMembers.map((mem) => (
                    <label
                      key={mem.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        selectedMemberId === mem.user_id
                          ? 'bg-purple-600/15 border-purple-500/40 text-zinc-100'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="keptMember"
                          value={mem.user_id}
                          checked={selectedMemberId === mem.user_id}
                          onChange={() => setSelectedMemberId(mem.user_id)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <p className="font-semibold text-xs text-zinc-200">
                            {mem.display_name || mem.email || 'Teammate'}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">{mem.email}</p>
                        </div>
                      </div>
                      {selectedMemberId === mem.user_id && (
                        <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                          Retain Seat
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-blue-600/25"
            >
              <span>Next Step</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-rose-600/25"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Review & Downsize</span>
            </button>
          )}
        </div>
      </div>

      {/* FINAL CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold text-sm text-zinc-100">Confirm Downsizing Choices</h3>
            </div>

            <p className="text-xs text-zinc-400">
              Please carefully review the summary of your choices. Once confirmed, extra workspaces and projects will be archived to comply with the Free plan.
            </p>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Primary Workspace:</span>
                <span className="font-semibold text-zinc-200">{selectedWsObj?.name || 'Current'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Kept Active Project:</span>
                <span className="font-semibold text-emerald-400">{selectedProjObj?.name || 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Kept Collaborator:</span>
                <span className="font-semibold text-purple-400">
                  {selectedMemObj?.display_name || selectedMemObj?.email || 'None'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              Archived projects and decommissioned workspaces can be restored at any time by upgrading to Pro.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={submitting}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleExecuteDownsizing}
                disabled={submitting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                {submitting ? 'Applying...' : 'Confirm and Downsize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
