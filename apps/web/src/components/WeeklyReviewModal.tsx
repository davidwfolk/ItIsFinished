import { useState } from 'react';
import { 
  X, 
  Sparkles, 
  AlertCircle, 
  PieChart, 
  Trophy, 
  Check, 
  Inbox, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-react';
import type { TaskRow, ProjectRow } from '@app/core';

export interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskRow[];
  projects: ProjectRow[];
  onUpdateTask: (taskId: string, updates: Partial<TaskRow>) => Promise<void>;
}

export function WeeklyReviewModal({
  isOpen,
  onClose,
  tasks,
  projects,
  onUpdateTask,
}: WeeklyReviewModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextMondayDate = new Date();
  nextMondayDate.setDate(nextMondayDate.getDate() + ((1 + 7 - nextMondayDate.getDay()) % 7 || 7));
  const nextMondayStr = nextMondayDate.toISOString().slice(0, 10);

  const unscheduledTasks = tasks.filter((t) => !t.due_date && !t.completed_at && !t.deleted_at);
  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < todayStr && !t.completed_at && !t.deleted_at);

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
    } else {
      onClose();
      setCurrentStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Top Progress Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Sunday Weekly Review</h2>
              <p className="text-[11px] font-mono text-zinc-400">Step {currentStep} of 4</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-32">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step <= currentStep ? 'bg-blue-500' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Inbox Zero */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5 pb-4 border-b border-zinc-800">
                <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
                  <Inbox className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-100">Clear the Inbox</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Give every unscheduled task a date, or check it off if already done.
                </p>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{task.title}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Unscheduled</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onUpdateTask(task.id, { due_date: todayStr })}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => onUpdateTask(task.id, { due_date: tomorrowStr })}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                      >
                        Tomorrow
                      </button>
                      <button
                        onClick={() => onUpdateTask(task.id, { due_date: nextMondayStr })}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                      >
                        Next Week
                      </button>
                      <button
                        onClick={() => onUpdateTask(task.id, { completed_at: new Date().toISOString() })}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {unscheduledTasks.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <Sparkles className="h-8 w-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-zinc-200">Inbox is at Zero!</p>
                    <p className="text-xs text-zinc-500">All tasks have dates assigned. Outstanding work.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Clean Up Overdue */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5 pb-4 border-b border-zinc-800">
                <div className="inline-flex p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-2">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-100">Clean Up Overdue Tasks</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Reschedule past-due tasks so your mental slate is 100% clean.
                </p>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{task.title}</p>
                      <p className="text-[10px] text-red-400 font-mono mt-0.5">Was due: {task.due_date}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onUpdateTask(task.id, { due_date: todayStr })}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                      >
                        Move to Today
                      </button>
                      <button
                        onClick={() => onUpdateTask(task.id, { due_date: tomorrowStr })}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                      >
                        Tomorrow
                      </button>
                      <button
                        onClick={() => onUpdateTask(task.id, { completed_at: new Date().toISOString() })}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {overdueTasks.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-zinc-200">No Overdue Tasks!</p>
                    <p className="text-xs text-zinc-500">You are completely caught up. Zero backlog lag.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Project Pulse */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5 pb-4 border-b border-zinc-800">
                <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2">
                  <PieChart className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-100">Project Pulse Check</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Review completion percentages across all active projects.
                </p>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {projects.map((proj) => {
                  const projTasks = tasks.filter((t) => t.project_id === proj.id && !t.deleted_at);
                  const completed = projTasks.filter((t) => !!t.completed_at).length;
                  const total = projTasks.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <div key={proj.id} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 flex items-center gap-2">
                          <span
                            style={{ backgroundColor: proj.color || '#3B82F6' }}
                            className="w-2.5 h-2.5 rounded-full"
                          />
                          {proj.name}
                        </span>
                        <span className="font-mono text-zinc-400">
                          {completed}/{total} ({pct}%)
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          style={{
                            width: `${pct}%`,
                            backgroundColor: proj.color || '#3B82F6',
                          }}
                          className="h-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Celebration & Ready */}
          {currentStep === 4 && (
            <div className="py-6 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
                <Trophy className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-zinc-100">Weekly Review Complete!</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Your inbox is cleared, overdue items are rescheduled, and your projects are primed for high execution.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                  <p className="text-2xl font-bold font-mono text-blue-400">
                    {tasks.filter((t) => !!t.completed_at && !t.deleted_at).length}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">Done</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                  <p className="text-2xl font-bold font-mono text-orange-400">
                    {tasks.filter((t) => !t.completed_at && !t.deleted_at).length}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">Pending</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                  <p className="text-2xl font-bold font-mono text-emerald-400">
                    {projects.length}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">Projects</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Action */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={handleNextStep}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <span>{currentStep === 4 ? 'Finish Review 🎯' : 'Next Step'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

