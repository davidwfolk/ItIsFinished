import { useState, useEffect } from 'react';
import { Filter, X, Plus, Check, Code, Save } from 'lucide-react';
import { compileFilterToSql, type FilterRule, type SavedSmartFilter } from '@app/core';

export interface SmartFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFilter: (filter: SavedSmartFilter) => void;
  initialFilter?: SavedSmartFilter | null;
}

export function SmartFilterModal({ isOpen, onClose, onSaveFilter, initialFilter }: SmartFilterModalProps) {
  const [filterName, setFilterName] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState<(1 | 2 | 3 | 4)[]>([1]);
  const [dueBefore, setDueBefore] = useState<string>('today');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  useEffect(() => {
    if (isOpen) {
      if (initialFilter) {
        setFilterName(initialFilter.name);
        setSelectedColor(initialFilter.color || '#3B82F6');
        setSelectedPriorities(initialFilter.rule.priority || []);
        setDueBefore(initialFilter.rule.dueBefore || '');
      } else {
        setFilterName('');
        setSelectedPriorities([1]);
        setDueBefore('today');
        setSelectedColor('#3B82F6');
      }
    }
  }, [isOpen, initialFilter]);

  if (!isOpen) return null;

  const currentRule: FilterRule = {
    priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
    dueBefore: dueBefore as any,
    includeCompleted: false,
  };

  const compiled = compileFilterToSql(currentRule);

  const togglePriority = (p: 1 | 2 | 3 | 4) => {
    if (selectedPriorities.includes(p)) {
      setSelectedPriorities(selectedPriorities.filter(x => x !== p));
    } else {
      setSelectedPriorities([...selectedPriorities, p]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterName.trim()) return;

    const newFilter: SavedSmartFilter = {
      id: initialFilter ? initialFilter.id : `custom-${Date.now()}`,
      name: filterName.trim(),
      color: selectedColor,
      icon: 'filter',
      rule: currentRule,
    };

    onSaveFilter(newFilter);
    setFilterName('');
    onClose();
  };

  const colorOptions = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-300 p-1 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <Filter className="h-4 w-4" /> Custom Smart Views
          </div>
          <h3 className="text-xl font-bold text-zinc-100 tracking-tight">{initialFilter ? 'Edit Smart Filter' : 'Create Smart Filter'}</h3>
          <p className="text-xs text-zinc-400">
            Build saved custom views with compiled 0ms local SQLite filters.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Filter Name</label>
            <input
              type="text"
              required
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="e.g. Urgent Sprint Blockers"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Priority Checkbox Selector */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">Include Priorities</label>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map(p => {
                const isSelected = selectedPriorities.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePriority(p)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold font-mono transition ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    P{p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date Range */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">Due Date Constraint</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '', label: 'Any Time' },
                { id: 'today', label: 'Due Today or Overdue' },
                { id: 'tomorrow', label: 'Due by Tomorrow' },
                { id: '7days', label: 'Next 7 Days' },
                { id: 'overdue', label: 'Strictly Overdue' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDueBefore(opt.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition ${
                    dueBefore === opt.id
                      ? 'bg-blue-600/15 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Tag */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">Filter Badge Color</label>
            <div className="flex gap-2">
              {colorOptions.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition shadow"
                >
                  {selectedColor === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Live Compiled SQL Preview */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
              <Code className="h-3 w-3" /> Compiled SQLite Query:
            </span>
            <code className="text-[11px] font-mono text-emerald-400 block truncate">
              SELECT * FROM tasks {compiled.sql || 'WHERE deleted_at IS NULL'}
            </code>
          </div>

          <button
            type="submit"
            disabled={!filterName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {initialFilter ? <><Save className="h-4 w-4" /> Save Changes</> : <><Plus className="h-4 w-4" /> Save Smart Filter</>}
          </button>
        </form>
      </div>
    </div>
  );
}
