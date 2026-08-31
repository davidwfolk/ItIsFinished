import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { usePowerSync, useQuery } from '@powersync/react';
import { type TaskRow, getOrderIndexBetween } from '@app/core';

export interface SubtaskTreeProps {
  taskId: string;
}

export function SubtaskTree({ taskId }: SubtaskTreeProps) {
  const powersync = usePowerSync();
  const { data: subtasks = [] } = useQuery<TaskRow>(
    `SELECT * FROM tasks WHERE parent_id = ? AND deleted_at IS NULL ORDER BY order_index ASC`,
    [taskId]
  );

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const total = subtasks.length;
  const completed = subtasks.filter(t => t.completed_at || t.status === 'done').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = async (id: string, isCompleted: boolean) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET completed_at = ?, status = ?, updated_at = ? WHERE id = ?`,
        [isCompleted ? null : now, isCompleted ? 'todo' : 'done', now, id]
      );
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  const handleDelete = async (id: string) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, id]
      );
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?`,
        [editTitle.trim(), now, id]
      );
      setEditingId(null);
      setEditTitle('');
    } catch (err) {
      console.error('Failed to edit subtask:', err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const lastIndex = subtasks.length > 0 ? subtasks[subtasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    try {
      const parentTask = await powersync.get(
        'SELECT workspace_id, project_id, section_id, created_by FROM tasks WHERE id = ?',
        [taskId]
      );

      await powersync.execute(
        `INSERT INTO tasks (id, parent_id, workspace_id, project_id, section_id, created_by, title, priority, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          taskId,
          parentTask.workspace_id,
          parentTask.project_id,
          parentTask.section_id,
          parentTask.created_by,
          newSubtaskTitle.trim(),
          4,
          newIndex,
          'todo',
          now,
          now
        ]
      );
      setNewSubtaskTitle('');
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">
          Subtasks ({completed}/{total})
        </span>
        <span className="text-xs font-mono text-purple-400 font-bold">{percentage}%</span>
      </div>

      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <div 
          style={{ width: `${percentage}%` }}
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
        />
      </div>

      <div className="divide-y divide-zinc-900/60 pt-1">
        {subtasks.map(sub => {
          const isDone = !!sub.completed_at || sub.status === 'done';
          const isEditing = editingId === sub.id;

          return (
            <div key={sub.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-zinc-900/60 transition group text-xs">
              {!isEditing && (
                <button 
                  onClick={() => handleToggle(sub.id, isDone)}
                  className="text-zinc-500 hover:text-blue-400 transition shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {isEditing ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(sub.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    className="flex-1 bg-zinc-900 border border-blue-500/50 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={() => handleSaveEdit(sub.id)} className="p-1 text-emerald-400 hover:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={cancelEditing} className="p-1 text-zinc-400 hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}`} onClick={() => startEditing(sub.id, sub.title || '')}>
                    {sub.title}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEditing(sub.id, sub.title || '')}
                      className="text-zinc-600 hover:text-blue-400 p-0.5"
                      title="Edit subtask"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="text-zinc-600 hover:text-red-400 p-0.5"
                      title="Delete subtask"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          placeholder="Add a subtask..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!newSubtaskTitle.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </form>
    </div>
  );
}
