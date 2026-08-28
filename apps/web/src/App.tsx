import { useState, useMemo } from 'react';
import { parseQuickAdd, getOrderIndexBetween, DEFAULT_SMART_FILTERS, type ParsedTaskInput, type SavedSmartFilter, type TaskRow } from '@app/core';
import { usePowerSync, useQuery } from '@powersync/react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  Tag, 
  Folder, 
  Plus, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  GripVertical,
  Trash2,
  Users,
  MessageSquare,
  LogIn,
  TrendingUp,
  Filter,
  ListTree,
  Grid
} from 'lucide-react';
import { CalendarTimeGrid } from './components/CalendarTimeGrid';
import { AuthModal } from './components/AuthModal';
import { ProjectMembersModal } from './components/ProjectMembersModal';
import { TaskCommentsDrawer } from './components/TaskCommentsDrawer';
import { SmartFilterModal } from './components/SmartFilterModal';
import { SubtaskTree } from './components/SubtaskTree';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { EisenhowerMatrixView } from './components/EisenhowerMatrixView';

export interface ViewTask {
  id: string;
  title: string;
  order_index: string;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number | null;
  priority: 1 | 2 | 3 | 4;
  project: string;
  tags: string[];
  completed: boolean;
  hasSubtasks?: boolean;
}

export default function App() {
  const powersync = usePowerSync();
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'matrix' | 'analytics'>('today');
  const [quickAddText, setQuickAddText] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);

  // Modals & Drawers State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeCommentTask, setActiveCommentTask] = useState<ViewTask | null>(null);
  const [smartFilters, setSmartFilters] = useState<SavedSmartFilter[]>(DEFAULT_SMART_FILTERS);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>({
    email: 'admin@workspace.com',
    name: 'You (Alex)'
  });

  // Live Reactive SQLite Query
  const { data: rawTasks = [] } = useQuery<TaskRow & { project_name?: string }>(
    `SELECT t.*, p.name as project_name 
     FROM tasks t 
     LEFT JOIN projects p ON t.project_id = p.id 
     WHERE t.deleted_at IS NULL 
     ORDER BY t.order_index ASC`
  );

  // Map raw database rows to UI Task models
  const tasks: ViewTask[] = useMemo(() => {
    return rawTasks.map((t) => ({
      id: t.id,
      title: t.title,
      order_index: t.order_index,
      due_date: t.due_date,
      due_time: t.due_time,
      estimated_minutes: t.estimated_minutes,
      priority: (t.priority || 4) as 1 | 2 | 3 | 4,
      project: t.project_name || 'Inbox',
      tags: [],
      completed: !!t.completed_at || t.status === 'done',
      hasSubtasks: false,
    }));
  }, [rawTasks]);

  // Real-time live NLP extraction as user types
  const parsedPreview: ParsedTaskInput = useMemo(() => {
    return parseQuickAdd(quickAddText);
  }, [quickAddText]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    const parsed = parseQuickAdd(quickAddText);
    const lastIndex = tasks.length > 0 ? tasks[tasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    try {
      await powersync.execute(
        `INSERT INTO tasks (id, project_id, title, priority, due_date, due_time, estimated_minutes, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          'proj-core-arch',
          parsed.title,
          parsed.priority || 4,
          parsed.dueDate || null,
          parsed.dueTime || null,
          parsed.estimatedMinutes || null,
          newIndex,
          'todo',
          now,
          now
        ]
      );
      setQuickAddText('');
    } catch (err) {
      console.error('Failed to insert task into SQLite:', err);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const isCompleted = !task.completed;
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `UPDATE tasks SET completed_at = ?, status = ?, updated_at = ? WHERE id = ?`,
        [isCompleted ? now : null, isCompleted ? 'done' : 'todo', now, id]
      );
    } catch (err) {
      console.error('Failed to toggle task in SQLite:', err);
    }
  };

  const deleteTask = async (id: string) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, id]
      );
    } catch (err) {
      console.error('Failed to soft delete task in SQLite:', err);
    }
  };

  const updateTaskPriority = async (id: string, newPriority: 1 | 2 | 3 | 4) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?`,
        [newPriority, now, id]
      );
    } catch (err) {
      console.error('Failed to update task priority in SQLite:', err);
    }
  };

  const addTaskToQuadrant = async (priority: 1 | 2 | 3 | 4, title: string) => {
    const lastIndex = tasks.length > 0 ? tasks[tasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `INSERT INTO tasks (id, project_id, title, priority, due_date, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          'proj-core-arch',
          title,
          priority,
          now.slice(0, 10),
          newIndex,
          'todo',
          now,
          now
        ]
      );
    } catch (err) {
      console.error('Failed to add quadrant task to SQLite:', err);
    }
  };

  // Drag-and-Drop Reordering using Fractional Lexicographical Indexing
  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnTask = async (targetTaskId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const currentIdx = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIdx = tasks.findIndex(t => t.id === targetTaskId);
    if (currentIdx === -1 || targetIdx === -1) return;

    let newOrderIndex: string;
    if (targetIdx === 0) {
      newOrderIndex = getOrderIndexBetween(null, tasks[0].order_index);
    } else if (targetIdx === tasks.length - 1) {
      newOrderIndex = getOrderIndexBetween(tasks[tasks.length - 1].order_index, null);
    } else {
      const prev = targetIdx > currentIdx ? tasks[targetIdx].order_index : tasks[targetIdx - 1].order_index;
      const next = targetIdx > currentIdx ? tasks[targetIdx + 1]?.order_index : tasks[targetIdx].order_index;
      newOrderIndex = getOrderIndexBetween(prev, next);
    }

    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET order_index = ?, updated_at = ? WHERE id = ?`,
        [newOrderIndex, now, draggedTaskId]
      );
    } catch (err) {
      console.error('Failed to reorder task in SQLite:', err);
    }
    setDraggedTaskId(null);
  };

  const priorityColors = {
    1: 'text-red-400 border-red-500/30 bg-red-500/10',
    2: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    3: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    4: 'text-zinc-400 border-zinc-700 bg-zinc-800/40',
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 antialiased overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-900/40 flex flex-col p-4">
        {/* Workspace Brand */}
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
              F
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-zinc-100">Finished</h1>
              <p className="text-[11px] text-zinc-400 font-mono">Local-First 0ms</p>
            </div>
          </div>

          <button
            onClick={() => setAuthModalOpen(true)}
            title="Account & Auth"
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition"
          >
            <LogIn className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* User Badge */}
        {currentUser && (
          <div className="px-2 py-2 mb-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <p className="font-semibold text-zinc-200 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-zinc-500 font-mono truncate">{currentUser.email}</p>
            </div>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              PRO
            </span>
          </div>
        )}

        <nav className="space-y-1 flex-1 text-sm font-medium overflow-y-auto pr-1">
          <button
            onClick={() => { setActiveTab('today'); setSelectedFilterId(null); }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              activeTab === 'today' && !selectedFilterId
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Today Focus
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 font-mono">
              {tasks.filter(t => !t.completed).length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('calendar'); setSelectedFilterId(null); }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              activeTab === 'calendar'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Time-Blocking
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">
              Grid
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('matrix'); setSelectedFilterId(null); }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              activeTab === 'matrix'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Grid className="h-4 w-4" /> Eisenhower Matrix
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">
              2×2
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('analytics'); setSelectedFilterId(null); }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              activeTab === 'analytics'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Productivity Stats
            </span>
          </button>

          <button
            onClick={() => setMembersModalOpen(true)}
            className="w-full px-2.5 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Members
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-semibold">
              3
            </span>
          </button>

          {/* Smart Filters Section */}
          <div className="pt-4 pb-1">
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              <span>Saved Filters</span>
              <button
                onClick={() => setFilterModalOpen(true)}
                title="Create Smart Filter"
                className="hover:text-blue-400 transition"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1 mt-2">
              {smartFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setSelectedFilterId(filter.id);
                    setActiveTab('today');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                    selectedFilterId === filter.id
                      ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                      : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span style={{ backgroundColor: filter.color }} className="w-2 h-2 rounded-full shrink-0" />
                    <span className="truncate">{filter.name}</span>
                  </span>
                  <Filter className="h-3 w-3 opacity-40 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Cloud Status Footer */}
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" /> Supabase Connected
          </div>
          <div className="font-mono text-[10px] text-zinc-500 truncate">
            Project: hyrffgsjmobdffpgoalw
          </div>
          <div className="font-mono text-[10px] text-zinc-500">
            Region: us-west-2 (PostgreSQL 17)
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeTab === 'calendar' ? (
          <CalendarTimeGrid />
        ) : activeTab === 'matrix' ? (
          <EisenhowerMatrixView
            tasks={tasks.map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              project: t.project,
              dueDate: t.due_date,
              dueTime: t.due_time,
              estimatedMinutes: t.estimated_minutes,
              completed: t.completed,
            }))}
            onToggleComplete={toggleTask}
            onUpdatePriority={updateTaskPriority}
            onAddTaskToQuadrant={addTaskToQuadrant}
            onDeleteTask={deleteTask}
          />
        ) : activeTab === 'analytics' ? (
          <AnalyticsDashboard />
        ) : (
          <>
            {/* Header */}
            <header className="h-14 border-b border-zinc-800/80 px-8 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold tracking-tight">
                  {selectedFilterId 
                    ? smartFilters.find(f => f.id === selectedFilterId)?.name 
                    : "Today's Focus"}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  Drag ↕ to reorder with Fractional Indexing
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMembersModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5 transition font-medium"
                >
                  <Users className="h-3.5 w-3.5 text-blue-400" /> Share Project
                </button>
              </div>
            </header>

            {/* Tasks Container */}
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto space-y-6">
              {/* NLP Quick Add Bar */}
              <form onSubmit={handleAddTask} className="relative">
                <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 shadow-2xl focus-within:border-blue-500/60 transition focus-within:ring-1 focus-within:ring-blue-500/30">
                  <div className="flex items-center px-3 py-1.5 gap-2">
                    <Sparkles className="h-4 w-4 text-blue-400 shrink-0 animate-pulse" />
                    <input
                      type="text"
                      value={quickAddText}
                      onChange={(e) => setQuickAddText(e.target.value)}
                      placeholder="Quick add: 'Ship MVP tomorrow at 3pm for 45m #Core /Sprint1 @urgent p1'"
                      className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!quickAddText.trim()}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>

                  {/* Live NLP Tokenizer Preview */}
                  {quickAddText.trim() && (
                    <div className="border-t border-zinc-800/80 px-3 py-2 bg-zinc-900/90 rounded-b-lg flex flex-wrap gap-2 text-xs items-center">
                      <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-mono">Parsed:</span>
                      {parsedPreview.dueDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                          <Calendar className="h-3 w-3" /> {parsedPreview.dueDate} {parsedPreview.dueTime || ''}
                        </span>
                      )}
                      {parsedPreview.estimatedMinutes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                          <Clock className="h-3 w-3" /> {parsedPreview.estimatedMinutes}m
                        </span>
                      )}
                      {parsedPreview.projectName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Folder className="h-3 w-3" /> #{parsedPreview.projectName}
                        </span>
                      )}
                      {parsedPreview.tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          <Tag className="h-3 w-3" /> @{t}
                        </span>
                      ))}
                      {parsedPreview.priority && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono ${priorityColors[parsedPreview.priority]}`}>
                          P{parsedPreview.priority}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </form>

              {/* Draggable Task List */}
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(task.id, e)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnTask(task.id, e)}
                      className="group flex items-start gap-3 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-blue-500/40 transition cursor-grab active:cursor-grabbing shadow-sm"
                    >
                      <GripVertical className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 mt-0.5 shrink-0" />

                      <button
                        onClick={() => toggleTask(task.id)}
                        className="mt-0.5 text-zinc-500 hover:text-blue-400 transition shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                            {task.title}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${priorityColors[task.priority]}`}>
                            P{task.priority}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Folder className="h-3 w-3" /> {task.project}
                          </span>
                          {task.due_date && (
                            <span className="flex items-center gap-1 text-zinc-400 font-mono">
                              <Calendar className="h-3 w-3" /> {task.due_date} {task.due_time ? task.due_time.slice(0, 5) : ''}
                            </span>
                          )}
                          {task.estimated_minutes && (
                            <span className="flex items-center gap-1 text-purple-400/80 font-mono">
                              <Clock className="h-3 w-3" /> {task.estimated_minutes}m
                            </span>
                          )}
                          {task.tags.map(tag => (
                            <span key={tag} className="text-zinc-400 font-mono">
                              #{tag}
                            </span>
                          ))}
                          <span className="ml-auto font-mono text-[10px] text-zinc-500 font-bold">
                            idx: {task.order_index}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Subtask Expander Toggle */}
                        <button
                          onClick={() => setExpandedSubtaskId(expandedSubtaskId === task.id ? null : task.id)}
                          title="Toggle Subtask Tree"
                          className={`p-1 transition ${expandedSubtaskId === task.id ? 'text-purple-400' : 'text-zinc-500 hover:text-purple-400'}`}
                        >
                          <ListTree className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveCommentTask(task)}
                          title="Discussion & Comments"
                          className="p-1 hover:text-blue-400 text-zinc-500 transition"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          title="Delete Task"
                          className="p-1 hover:text-red-400 text-zinc-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Render Expanded Subtask Tree */}
                    {expandedSubtaskId === task.id && (
                      <div className="pl-6 pt-1">
                        <SubtaskTree />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(email, name) => setCurrentUser({ email, name })}
      />

      {/* Project Members / Share Modal */}
      <ProjectMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        projectName="Core Architecture"
      />

      {/* Smart Filter Builder Modal */}
      <SmartFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onSaveFilter={(filter) => {
          setSmartFilters([...smartFilters, filter]);
          setSelectedFilterId(filter.id);
        }}
      />

      {/* Task Comments Drawer */}
      {activeCommentTask && (
        <TaskCommentsDrawer
          isOpen={!!activeCommentTask}
          onClose={() => setActiveCommentTask(null)}
          taskTitle={activeCommentTask.title}
          taskId={activeCommentTask.id}
        />
      )}
    </div>
  );
}
