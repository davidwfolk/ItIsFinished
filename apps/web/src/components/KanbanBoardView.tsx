import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Repeat, 
  ChevronRight, 
  Hourglass,
  Trash2,
  Edit2,
  MoreHorizontal,
  GripVertical
} from 'lucide-react';
import { formatRecurrenceLabel } from '@app/core';
import type { SectionRow } from '@app/core';

export interface KanbanTaskItem {
  id: string;
  title: string;
  section_id?: string | null;
  priority?: 1 | 2 | 3 | 4 | number | null;
  due_date?: string | null;
  recurrence_rule?: string | null;
  estimated_minutes?: number | null;
  assigned_to?: string | null;
  assignedTo?: { id?: string; name: string; color: string } | null;
  completed?: boolean;
  completed_at?: string | null;
}

export interface KanbanBoardViewProps {
  sections: SectionRow[];
  tasks: KanbanTaskItem[];
  onTaskClick: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onMoveTaskToSection: (taskId: string, sectionId: string | null) => Promise<void>;
  onCreateTaskInSection: (title: string, sectionId: string | null) => Promise<void>;
  onCreateSection?: (name: string) => Promise<void>;
  onDeleteSection?: (sectionId: string) => Promise<void> | void;
  onRenameSection?: (sectionId: string, newName: string) => Promise<void> | void;
  onReorderSection?: (sourceSectionId: string, targetSectionId: string) => Promise<void> | void;
}

export function KanbanBoardView({
  sections,
  tasks,
  onTaskClick,
  onToggleComplete,
  onMoveTaskToSection,
  onCreateTaskInSection,
  onCreateSection,
  onDeleteSection,
  onRenameSection,
  onReorderSection,
}: KanbanBoardViewProps) {
  const [quickInputSectionId, setQuickInputSectionId] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Column Menu & Renaming State
  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuColId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const priorityStyles: Record<number, { pill: string; text: string }> = {
    1: { pill: 'bg-red-500/20 text-red-300 border-red-500/40', text: 'P1' },
    2: { pill: 'bg-orange-500/20 text-orange-300 border-orange-500/40', text: 'P2' },
    3: { pill: 'bg-blue-500/20 text-blue-300 border-blue-500/40', text: 'P3' },
    4: { pill: 'bg-zinc-800 text-zinc-400 border-zinc-700', text: 'P4' },
  };

  const allColumns = [
    { id: '__no_section__', name: 'Backlog / To Do' },
    ...sections,
  ];

  const handleQuickAdd = async (sectionId: string | null) => {
    if (!quickTaskTitle.trim()) return;
    await onCreateTaskInSection(quickTaskTitle.trim(), sectionId);
    setQuickTaskTitle('');
    setQuickInputSectionId(null);
  };

  const handleCreateNewSection = async () => {
    if (!newSectionName.trim() || !onCreateSection) return;
    await onCreateSection(newSectionName.trim());
    setNewSectionName('');
    setIsAddingSection(false);
  };

  const handleDeleteColumn = async (sectionId: string, sectionName: string) => {
    setActiveMenuColId(null);
    if (!onDeleteSection) return;
    if (window.confirm(`Delete column "${sectionName}"? Any tasks in this column will be moved to Backlog.`)) {
      await onDeleteSection(sectionId);
    }
  };

  const handleStartRename = (sectionId: string, currentName: string) => {
    setActiveMenuColId(null);
    setEditingSectionId(sectionId);
    setEditingName(currentName);
  };

  const handleSaveRename = async (sectionId: string) => {
    if (editingName.trim() && onRenameSection) {
      await onRenameSection(sectionId, editingName.trim());
    }
    setEditingSectionId(null);
    setEditingName('');
  };

  return (
    <div className="flex-1 overflow-x-auto p-6 bg-zinc-950 flex items-start gap-5 select-none animate-in fade-in duration-200">
      {allColumns.map((col) => {
        const colId = col.id === '__no_section__' ? null : col.id;
        const colTasks = tasks.filter((t) => {
          if (col.id === '__no_section__') {
            return !t.section_id || t.section_id === '__no_section__';
          }
          return t.section_id === col.id;
        });

        const isCustomSection = col.id !== '__no_section__';
        const isDragOver = dragOverColId === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedColId && isCustomSection && draggedColId !== col.id) {
                setDragOverColId(col.id);
              }
            }}
            onDragLeave={() => {
              if (dragOverColId === col.id) setDragOverColId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColId(null);
              const sourceColId = e.dataTransfer.getData('text/column-id');
              const taskId = e.dataTransfer.getData('text/task-id') || e.dataTransfer.getData('text/plain');

              if (sourceColId && sourceColId !== col.id && isCustomSection && onReorderSection) {
                onReorderSection(sourceColId, col.id);
                setDraggedColId(null);
              } else if (taskId) {
                onMoveTaskToSection(taskId, colId);
              }
            }}
            className={`w-80 shrink-0 bg-zinc-900/40 border rounded-2xl flex flex-col max-h-[calc(100vh-140px)] shadow-xl transition-all duration-150 group/col relative ${
              isDragOver ? 'border-blue-500 ring-2 ring-blue-500/30 scale-[1.01]' : 'border-zinc-800/80'
            }`}
          >
            {/* Column Header (Draggable) */}
            <div 
              draggable={isCustomSection}
              onDragStart={(e) => {
                if (!isCustomSection) return;
                setDraggedColId(col.id);
                e.dataTransfer.setData('text/column-id', col.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggedColId(null);
                setDragOverColId(null);
              }}
              className={`p-3.5 border-b border-zinc-800/80 flex items-center justify-between gap-2 bg-zinc-900/60 rounded-t-2xl ${
                isCustomSection ? 'cursor-grab active:cursor-grabbing hover:bg-zinc-850/70' : ''
              }`}
            >
              {/* Column Name */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isCustomSection && (
                  <GripVertical className="h-3.5 w-3.5 text-zinc-600 group-hover/col:text-zinc-400 shrink-0" />
                )}

                {editingSectionId === col.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(col.id);
                      if (e.key === 'Escape') setEditingSectionId(null);
                    }}
                    onBlur={() => handleSaveRename(col.id)}
                    autoFocus
                    className="w-full bg-zinc-950 border border-blue-500 rounded px-2 py-0.5 text-xs font-bold text-zinc-100 focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span 
                      onDoubleClick={() => isCustomSection && handleStartRename(col.id, col.name)}
                      className="text-xs font-bold text-zinc-200 tracking-tight truncate"
                      title={isCustomSection ? "Drag header to reorder • Double-click to rename" : undefined}
                    >
                      {col.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono text-[10px] font-bold shrink-0">
                      {colTasks.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Column Right Controls */}
              <div className="flex items-center gap-1 shrink-0 relative">
                <button
                  onClick={() => setQuickInputSectionId(col.id)}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
                  title="Add task to column"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Column More Menu (...) */}
                {isCustomSection && (
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuColId(activeMenuColId === col.id ? null : col.id)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
                      title="Column options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {activeMenuColId === col.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-7 w-36 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          onClick={() => handleStartRename(col.id, col.name)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-blue-400" /> Rename
                        </button>
                        <button
                          onClick={() => handleDeleteColumn(col.id, col.name)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Column Cards Scroll */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {colTasks.map((task) => {
                const priority = task.priority || 4;
                const isCompleted = !!task.completed_at || !!task.completed;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/task-id', task.id);
                      e.dataTransfer.setData('text/plain', task.id);
                    }}
                    onClick={() => onTaskClick(task.id)}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 shadow-sm hover:shadow-md transition cursor-pointer group space-y-2.5"
                  >
                    {/* Card Top: Title & Checkbox */}
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(task.id);
                        }}
                        className="mt-0.5 text-zinc-600 hover:text-emerald-400 transition shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </button>

                      <span
                        className={`text-xs font-medium text-zinc-200 leading-snug flex-1 ${
                          isCompleted ? 'line-through text-zinc-500' : ''
                        }`}
                      >
                        {task.title}
                      </span>

                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          priorityStyles[priority].pill
                        }`}
                      >
                        {priorityStyles[priority].text}
                      </span>
                    </div>

                    {/* Card Meta Row */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-900">
                      <div className="flex items-center gap-2 truncate">
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Calendar className="h-3 w-3" /> {task.due_date}
                          </span>
                        )}
                        {task.recurrence_rule && (
                          <span className="flex items-center gap-1 text-cyan-400" title={formatRecurrenceLabel(task.recurrence_rule)}>
                            <Repeat className="h-3 w-3" />
                          </span>
                        )}
                        {task.estimated_minutes && (
                          <span className="flex items-center gap-1 text-purple-400">
                            <Hourglass className="h-3 w-3" /> {task.estimated_minutes}m
                          </span>
                        )}
                        {task.assignedTo && (
                          <span
                            style={{ backgroundColor: task.assignedTo.color }}
                            className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center shrink-0 shadow-sm"
                            title={task.assignedTo.name}
                          >
                            {task.assignedTo.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Advance Column button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = allColumns.findIndex((c) => c.id === col.id);
                          const nextColumn = allColumns[(currentIndex + 1) % allColumns.length];
                          onMoveTaskToSection(
                            task.id,
                            nextColumn.id === '__no_section__' ? null : nextColumn.id
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition"
                        title="Move to next column"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Quick Add Inline Card */}
              {quickInputSectionId === col.id && (
                <div className="p-3 rounded-xl bg-zinc-950 border border-blue-500/50 space-y-2">
                  <input
                    type="text"
                    placeholder="Task title..."
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd(colId);
                      if (e.key === 'Escape') setQuickInputSectionId(null);
                    }}
                    autoFocus
                    className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none placeholder:text-zinc-600"
                  />
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => setQuickInputSectionId(null)}
                      className="px-2 py-1 rounded text-[10px] text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleQuickAdd(colId)}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {colTasks.length === 0 && quickInputSectionId !== col.id && (
                <div className="py-12 text-center text-zinc-600 text-xs italic">
                  No tasks in this stage
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add Column Button */}
      {onCreateSection && (
        <div className="w-80 shrink-0">
          {isAddingSection ? (
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <input
                type="text"
                placeholder="Column name (e.g. QA, Review)..."
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewSection();
                  if (e.key === 'Escape') setIsAddingSection(false);
                }}
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsAddingSection(false)}
                  className="px-3 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewSection}
                  className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Create Column
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSection(true)}
              className="w-full py-4 border-2 border-dashed border-zinc-800/80 hover:border-zinc-700 rounded-2xl text-xs font-semibold text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-2 transition"
            >
              <Plus className="h-4 w-4" /> Add Column
            </button>
          )}
        </div>
      )}
    </div>
  );
}

