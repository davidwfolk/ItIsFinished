import { useState } from 'react';
import { 
  Flame, 
  Calendar, 
  Users, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Folder,
  GripVertical
} from 'lucide-react';

export interface MatrixTask {
  id: string;
  title: string;
  priority: 1 | 2 | 3 | 4;
  project: string;
  projectColor?: string;
  dueDate: string | null;
  dueTime: string | null;
  estimatedMinutes: number | null;
  completed: boolean;
}

export interface EisenhowerMatrixViewProps {
  tasks: MatrixTask[];
  onToggleComplete: (id: string) => void;
  onUpdatePriority: (id: string, newPriority: 1 | 2 | 3 | 4) => void;
  onAddTaskToQuadrant: (priority: 1 | 2 | 3 | 4, title: string) => void;
  onDeleteTask: (id: string) => void;
}

export function EisenhowerMatrixView({
  tasks,
  onToggleComplete,
  onUpdatePriority,
  onAddTaskToQuadrant,
  onDeleteTask,
}: EisenhowerMatrixViewProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeQuadrantAdd, setActiveQuadrantAdd] = useState<1 | 2 | 3 | 4 | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnQuadrant = (priority: 1 | 2 | 3 | 4, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    onUpdatePriority(draggedTaskId, priority);
    setDraggedTaskId(null);
  };

  const handleQuickAdd = (priority: 1 | 2 | 3 | 4, e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTaskToQuadrant(priority, newTitle.trim());
    setNewTitle('');
    setActiveQuadrantAdd(null);
  };

  const quadrants: {
    priority: 1 | 2 | 3 | 4;
    title: string;
    action: string;
    subtitle: string;
    color: string;
    borderColor: string;
    bgColor: string;
    icon: typeof Flame;
  }[] = [
    {
      priority: 1,
      title: 'Do First',
      action: 'Urgent & Important',
      subtitle: 'Critical crises, deadlines, and pressing blockers.',
      color: 'text-red-400',
      borderColor: 'border-red-500/40',
      bgColor: 'bg-red-500/5',
      icon: Flame,
    },
    {
      priority: 2,
      title: 'Schedule',
      action: 'Important, Not Urgent',
      subtitle: 'Strategic planning, deep work, and high-leverage goals.',
      color: 'text-orange-400',
      borderColor: 'border-orange-500/40',
      bgColor: 'bg-orange-500/5',
      icon: Calendar,
    },
    {
      priority: 3,
      title: 'Delegate',
      action: 'Urgent, Not Important',
      subtitle: 'Interruptions, routine reviews, and tasks for collaborators.',
      color: 'text-blue-400',
      borderColor: 'border-blue-500/40',
      bgColor: 'bg-blue-500/5',
      icon: Users,
    },
    {
      priority: 4,
      title: 'Eliminate',
      action: 'Neither Urgent nor Important',
      subtitle: 'Time wasters, low-value busywork, and backlogged trivia.',
      color: 'text-zinc-400',
      borderColor: 'border-zinc-700/60',
      bgColor: 'bg-zinc-900/40',
      icon: Trash2,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            Eisenhower Matrix (2×2 Priority Triage)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            🖐️ Drag and drop tasks between quadrants to instantly update their priority.
          </p>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-160px)] min-h-[500px]">
        {quadrants.map((q) => {
          const qTasks = tasks.filter((t) => t.priority === q.priority && !t.completed);
          const Icon = q.icon;

          return (
            <div
              key={q.priority}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnQuadrant(q.priority, e)}
              className={`rounded-2xl border ${q.borderColor} ${q.bgColor} p-4 flex flex-col transition shadow-lg relative group/quadrant`}
            >
              {/* Quadrant Header */}
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-2.5 mb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${q.color}`} />
                    <h3 className={`font-bold text-sm ${q.color}`}>{q.title}</h3>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold ml-1">
                      P{q.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{q.action}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                    {qTasks.length}
                  </span>
                  <button
                    onClick={() => setActiveQuadrantAdd(activeQuadrantAdd === q.priority ? null : q.priority)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                    title={`Add task to P${q.priority}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Inline Add Input */}
              {activeQuadrantAdd === q.priority && (
                <form onSubmit={(e) => handleQuickAdd(q.priority, e)} className="mb-2.5 flex gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={`New task in ${q.title}...`}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-2.5 py-1 rounded-lg text-xs"
                  >
                    Add
                  </button>
                </form>
              )}

              {/* Task List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {qTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(task.id, e)}
                    className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/90 hover:border-zinc-700 hover:bg-zinc-850 cursor-grab active:cursor-grabbing transition shadow-sm flex items-start gap-2.5 group/item"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-zinc-600 group-hover/item:text-zinc-400 mt-0.5 shrink-0" />

                    <button
                      onClick={() => onToggleComplete(task.id)}
                      className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1 font-medium truncate" style={{ color: task.projectColor || '#a1a1aa' }}>
                          <Folder className="h-2.5 w-2.5" /> {task.project}
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1 font-mono text-zinc-400 shrink-0">
                            <Clock className="h-2.5 w-2.5" /> {task.dueDate}
                          </span>
                        )}
                        {task.estimatedMinutes && (
                          <span className="font-mono text-purple-400 shrink-0">
                            {task.estimatedMinutes}m
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="opacity-0 group-hover/item:opacity-100 text-zinc-600 hover:text-red-400 p-0.5 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {qTasks.length === 0 && (
                  <div className="h-full flex items-center justify-center text-center p-6 text-xs text-zinc-600 italic">
                    Drop tasks here to set as {q.title} (P{q.priority})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
