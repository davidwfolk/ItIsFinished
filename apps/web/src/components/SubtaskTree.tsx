import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';

export interface SubtaskNode {
  id: string;
  title: string;
  completed: boolean;
  children?: SubtaskNode[];
}

export interface SubtaskTreeProps {
  initialSubtasks?: SubtaskNode[];
  onSubtasksChange?: (subtasks: SubtaskNode[]) => void;
}

export function SubtaskTree({ initialSubtasks = [], onSubtasksChange }: SubtaskTreeProps) {
  const [subtasks, setSubtasks] = useState<SubtaskNode[]>(
    initialSubtasks.length > 0
      ? initialSubtasks
      : [
          {
            id: 'sub-1',
            title: 'Verify PostgreSQL WAL logical replication',
            completed: true,
          },
          {
            id: 'sub-2',
            title: 'Test local SQLite schema migrations',
            completed: true,
            children: [
              { id: 'sub-2-1', title: 'Verify COLLATE "C" index sorting', completed: true },
              { id: 'sub-2-2', title: 'Verify ISO-8601 string date conversions', completed: false },
            ],
          },
          {
            id: 'sub-3',
            title: 'Implement 120 FPS swipe gesture handlers',
            completed: false,
          },
        ]
  );

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Calculate completion percentage
  const countAll = (nodes: SubtaskNode[]): { total: number; completed: number } => {
    let total = 0;
    let completed = 0;
    for (const node of nodes) {
      total++;
      if (node.completed) completed++;
      if (node.children) {
        const childCounts = countAll(node.children);
        total += childCounts.total;
        completed += childCounts.completed;
      }
    }
    return { total, completed };
  };

  const { total, completed } = countAll(subtasks);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const toggleNode = (nodes: SubtaskNode[], id: string): SubtaskNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, completed: !node.completed };
      }
      if (node.children) {
        return { ...node, children: toggleNode(node.children, id) };
      }
      return node;
    });
  };

  const handleToggle = (id: string) => {
    const updated = toggleNode(subtasks, id);
    setSubtasks(updated);
    if (onSubtasksChange) onSubtasksChange(updated);
  };

  const handleAddRootSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newNode: SubtaskNode = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };

    const updated = [...subtasks, newNode];
    setSubtasks(updated);
    setNewSubtaskTitle('');
    if (onSubtasksChange) onSubtasksChange(updated);
  };

  const deleteNode = (nodes: SubtaskNode[], id: string): SubtaskNode[] => {
    return nodes
      .filter(node => node.id !== id)
      .map(node => {
        if (node.children) {
          return { ...node, children: deleteNode(node.children, id) };
        }
        return node;
      });
  };

  const handleDelete = (id: string) => {
    const updated = deleteNode(subtasks, id);
    setSubtasks(updated);
    if (onSubtasksChange) onSubtasksChange(updated);
  };

  const renderSubtaskItem = (node: SubtaskNode, depth = 0) => {
    return (
      <div key={node.id} className="space-y-1">
        <div 
          style={{ paddingLeft: `${depth * 20}px` }}
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-zinc-900/60 transition group text-xs"
        >
          <button 
            onClick={() => handleToggle(node.id)}
            className="text-zinc-500 hover:text-blue-400 transition"
          >
            {node.completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
          </button>

          <span className={`flex-1 ${node.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
            {node.title}
          </span>

          <button
            onClick={() => handleDelete(node.id)}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 p-0.5 transition"
            title="Delete subtask"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {node.children && node.children.map(child => renderSubtaskItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
      {/* Header & Progress Bar */}
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

      {/* Subtasks Tree List */}
      <div className="divide-y divide-zinc-900/60 pt-1">
        {subtasks.map(node => renderSubtaskItem(node, 0))}
      </div>

      {/* Add Subtask Input */}
      <form onSubmit={handleAddRootSubtask} className="flex gap-2 pt-2">
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
