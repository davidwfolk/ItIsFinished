import { useState, useEffect } from 'react';
import { X, Trash2, Folder, Briefcase, Code, Sparkles, Star, Tag, Book, Heart, Flame, Shield, Target, Home } from 'lucide-react';
import type { ProjectRow } from '@app/core';

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectRow | null;
  onSave: (name: string, color: string, icon: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#71717A', // Zinc
];

const PRESET_ICONS = [
  { name: 'Folder', icon: Folder },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Code', icon: Code },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Star', icon: Star },
  { name: 'Tag', icon: Tag },
  { name: 'Book', icon: Book },
  { name: 'Heart', icon: Heart },
  { name: 'Flame', icon: Flame },
  { name: 'Shield', icon: Shield },
  { name: 'Target', icon: Target },
  { name: 'Home', icon: Home },
];

export function ProjectModal({ isOpen, onClose, project, onSave, onDelete }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('Folder');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setColor(project.color || '#3B82F6');
      setIcon(project.icon || 'Folder');
    } else {
      setName('');
      setColor('#3B82F6');
      setIcon('Folder');
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave(name.trim(), color, icon);
      onClose();
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !onDelete || isSubmitting) return;
    if (confirm(`Are you sure you want to delete "${project.name}"? Tasks inside will remain in your archive.`)) {
      setIsSubmitting(true);
      try {
        await onDelete(project.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete project:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span style={{ backgroundColor: color }} className="w-3 h-3 rounded-full shrink-0 shadow-sm" />
            {project ? 'Edit Project' : 'New Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Project Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Campaign, Mobile UX"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
            />
          </div>

          {/* Color Palette Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Theme Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-8 rounded-lg transition transform active:scale-95 flex items-center justify-center ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={`h-9 rounded-lg border flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            {project && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition flex items-center gap-1.5 font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition shadow-lg shadow-blue-600/20"
              >
                {project ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

