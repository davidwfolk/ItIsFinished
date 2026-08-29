import { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  Folder, 
  Flag, 
  ListTree, 
  MessageSquare,
  Sparkles,
  Send,
  User,
  Timer,
  Repeat
} from 'lucide-react';
import type { TaskRow } from '@app/core';
import { SubtaskTree } from './SubtaskTree';

export interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  task: {
    id: string;
    title: string;
    description?: string | null;
    priority: 1 | 2 | 3 | 4;
    project_id?: string | null;
    project?: string;
    due_date?: string | null;
    due_time?: string | null;
    estimated_minutes?: number | null;
    recurrence_rule?: string | null;
    assigned_to?: string | null;
    completed: boolean;
  } | null;
  projects: { id: string; name: string; color?: string | null }[];
  members?: { id: string; name: string; email?: string; color?: string; role?: string }[];
  onUpdateTask: (id: string, updates: Partial<TaskRow>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onStartFocus?: (taskId: string) => void;
}

export function TaskDetailDrawer({
  isOpen,
  onClose,
  taskId,
  task,
  projects,
  members = [
    { id: 'user-1', name: 'Alex (You)', color: '#3B82F6', role: 'Owner' },
    { id: 'user-2', name: 'Sarah K.', color: '#10B981', role: 'Editor' },
    { id: 'user-3', name: 'David W.', color: '#F59E0B', role: 'Editor' },
  ],
  onUpdateTask,
  onDeleteTask,
  onStartFocus,
}: TaskDetailDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [projectId, setProjectId] = useState<string>('proj-core-arch');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments'>('details');

  // Comments mock state
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    { id: 'c1', author: 'Alex', text: 'Started working on this task.', time: '2h ago' },
  ]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 4);
      setProjectId(task.project_id || (projects[0]?.id || 'proj-core-arch'));
      setDueDate(task.due_date || '');
      setDueTime(task.due_time ? task.due_time.slice(0, 5) : '');
      setEstimatedMinutes(task.estimated_minutes || null);
      setRecurrenceRule(task.recurrence_rule || null);
      setAssignedTo(task.assigned_to || null);
    }
  }, [task, taskId]);

  if (!isOpen || !task || !taskId) return null;

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdateTask(taskId, { title: title.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (task.description || '')) {
      onUpdateTask(taskId, { description: description.trim() });
    }
  };

  const handlePriorityChange = (newP: 1 | 2 | 3 | 4) => {
    setPriority(newP);
    onUpdateTask(taskId, { priority: newP });
  };

  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    onUpdateTask(taskId, { project_id: newProjId });
  };

  const handleDateChange = (newDate: string) => {
    setDueDate(newDate);
    onUpdateTask(taskId, { due_date: newDate || null });
  };

  const handleTimeChange = (newTime: string) => {
    setDueTime(newTime);
    onUpdateTask(taskId, { due_time: newTime ? newTime + ':00' : null });
  };

  const handleDurationChange = (duration: number | null) => {
    setEstimatedMinutes(duration);
    onUpdateTask(taskId, { estimated_minutes: duration });
  };

  const handleRecurrenceChange = (rule: string | null) => {
    setRecurrenceRule(rule);
    onUpdateTask(taskId, { recurrence_rule: rule });
  };

  const handleAssigneeChange = (memberId: string | null) => {
    setAssignedTo(memberId);
    onUpdateTask(taskId, { assigned_to: memberId });
  };

  const handleToggleComplete = () => {
    const now = new Date().toISOString();
    const isCompleted = !task.completed;
    onUpdateTask(taskId, {
      completed_at: isCompleted ? now : null,
      status: isCompleted ? 'done' : 'todo',
    });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      onDeleteTask(taskId);
      onClose();
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      {
        id: crypto.randomUUID(),
        author: 'You (Alex)',
        text: newComment.trim(),
        time: 'Just now',
      },
    ]);
    setNewComment('');
  };

  const priorityStyles = {
    1: 'bg-red-500/20 text-red-300 border-red-500/40',
    2: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    3: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    4: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  const durationOptions = [15, 30, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleComplete}
              className="text-zinc-500 hover:text-emerald-400 transition"
              title={task.completed ? 'Mark Incomplete' : 'Mark Complete'}
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              {task.completed ? 'Completed Task' : 'Active Task'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onStartFocus && (
              <button
                onClick={() => {
                  onStartFocus(taskId);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs font-semibold text-orange-400 flex items-center gap-1.5 transition"
              >
                <Timer className="h-3.5 w-3.5" /> Start Focus
              </button>
            )}
            <button
              onClick={handleDelete}
              title="Delete Task"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title Editor */}
          <div className="space-y-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Task Title"
              className="w-full bg-transparent text-xl font-bold text-zinc-100 placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-blue-500/50 pb-1 transition"
            />
          </div>

          {/* Key Properties Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
            {/* Project Picker */}
            <div className="space-y-1">
              <label className="text-zinc-500 font-mono flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-blue-400" /> Project
              </label>
              <select
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1">
              <label className="text-zinc-500 font-mono flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-orange-400" /> Priority
              </label>
              <div className="flex gap-1">
                {([1, 2, 3, 4] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePriorityChange(p)}
                    className={`flex-1 py-1 rounded-md font-mono text-[11px] font-bold border transition ${
                      priority === p ? priorityStyles[p] : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    P{p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-zinc-500 font-mono flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Due Time */}
            <div className="space-y-1">
              <label className="text-zinc-500 font-mono flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-400" /> Time Block
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Duration Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Estimated Duration</span>
              {estimatedMinutes && (
                <button
                  onClick={() => handleDurationChange(null)}
                  className="text-zinc-500 hover:text-zinc-300 text-[10px] lowercase"
                >
                  clear
                </button>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {durationOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleDurationChange(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                    estimatedMinutes === m
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Repeat / Recurrence */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-cyan-400" /> Repeat
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Does not repeat', rule: null },
                { label: 'Daily', rule: 'FREQ=DAILY' },
                { label: 'Weekdays', rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
                { label: 'Weekly', rule: 'FREQ=WEEKLY' },
                { label: 'Monthly', rule: 'FREQ=MONTHLY' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleRecurrenceChange(item.rule)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    recurrenceRule === item.rule
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-400" /> Assignee
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleAssigneeChange(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  !assignedTo
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Unassigned
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleAssigneeChange(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition ${
                    assignedTo === m.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  <span
                    style={{ backgroundColor: m.color || '#3B82F6' }}
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                  />
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description & Notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Notes & Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add details, links, markdown, or instructions..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition resize-none"
            />
          </div>

          {/* Tabs for Subtasks & Comments */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="flex border-b border-zinc-800 mb-4">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Overview
              </button>
              <button
                onClick={() => setActiveTab('subtasks')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
                  activeTab === 'subtasks'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ListTree className="h-3.5 w-3.5" /> Subtasks
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
                  activeTab === 'comments'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Discussion ({comments.length})
              </button>
            </div>

            {/* Subtask Tree Tab */}
            {activeTab === 'subtasks' && (
              <div className="space-y-3">
                <SubtaskTree />
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {comments.map((c: { id: string; author: string; text: string; time: string }) => (
                    <div key={c.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                        <span className="font-semibold text-zinc-300 flex items-center gap-1">
                          <User className="h-3 w-3 text-blue-400" /> {c.author}
                        </span>
                        <span>{c.time}</span>
                      </div>
                      <p className="text-xs text-zinc-300">{c.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 shadow-md shadow-blue-600/20"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

