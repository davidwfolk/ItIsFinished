import { useState } from 'react';
import { 
  Plus, 
  Trash2,
  Edit2,
  Activity,
  Award,
  X,
  CheckCircle2
} from 'lucide-react';
import { usePowerSync, useQuery } from '@powersync/react';
import { useAuth } from '../hooks/useAuth';
import * as Icons from 'lucide-react';

const COLORS = [
  '#F43F5E', // Rose
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#71717A', // Zinc
];

const CURATED_ICONS = [
  'Flame', 'Heart', 'Activity', 'Brain', 'Book', 'BookOpen',
  'Dumbbell', 'Apple', 'Coffee', 'Moon', 'Sun', 'Target',
  'Briefcase', 'Code', 'PenTool', 'Music', 'Camera', 'Droplet',
  'Leaf', 'Zap', 'Star', 'CheckCircle', 'Smile', 'Compass'
];

export function HabitsTrackerView() {
  const powersync = usePowerSync();
  const { user } = useAuth();
  
  // Past 7 days
  const days: { dateStr: string; label: string; dayNum: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    const dayNum = d.getDate();
    days.push({ dateStr, label, dayNum });
  }

  // Fetch real data
  const { data: habits = [] } = useQuery<any>(
    `SELECT * FROM habits WHERE deleted_at IS NULL ORDER BY created_at ASC`
  );
  
  const { data: logs = [] } = useQuery<any>(
    `SELECT * FROM habit_logs`
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    icon: 'Flame',
    color: '#3B82F6',
    frequency_type: 'daily',
    target_count: 1
  });

  const openAddModal = () => {
    setEditingHabitId(null);
    setFormData({
      title: '',
      icon: 'Flame',
      color: '#3B82F6',
      frequency_type: 'daily',
      target_count: 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (habit: any) => {
    setEditingHabitId(habit.id);
    setFormData({
      title: habit.title,
      icon: habit.icon || 'Flame',
      color: habit.color || '#3B82F6',
      frequency_type: habit.frequency_type || 'daily',
      target_count: habit.target_count || 1
    });
    setIsModalOpen(true);
  };

  const saveHabit = async () => {
    if (!formData.title.trim()) return;
    const now = new Date().toISOString();
    const ownerId = user?.id || 'demo-user';

    try {
      if (editingHabitId) {
        await powersync.execute(
          `UPDATE habits SET title = ?, icon = ?, color = ?, target_count = ?, updated_at = ? WHERE id = ?`,
          [formData.title.trim(), formData.icon, formData.color, formData.target_count, now, editingHabitId]
        );
      } else {
        const id = crypto.randomUUID();
        await powersync.execute(
          `INSERT INTO habits (id, user_id, title, icon, color, frequency_type, target_count, is_archived, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [id, ownerId, formData.title.trim(), formData.icon, formData.color, 'daily', formData.target_count, now, now]
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving habit:', err);
    }
  };

  const deleteHabit = async (id: string) => {
    if (!confirm('Delete this habit? Your historical data will be preserved in analytics.')) return;
    try {
      await powersync.execute(
        `UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), new Date().toISOString(), id]
      );
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  const logProgress = async (habitId: string, dateStr: string, currentVal: number, maxVal: number, change: number) => {
    const newVal = Math.max(0, Math.min(maxVal, currentVal + change));
    if (newVal === currentVal) return;

    try {
      if (currentVal === 0) {
        // Insert
        await powersync.execute(
          `INSERT INTO habit_logs (habit_id, log_date, count, created_at) VALUES (?, ?, ?, ?)`,
          [habitId, dateStr, newVal, new Date().toISOString()]
        );
      } else if (newVal === 0) {
        // Delete
        await powersync.execute(
          `DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?`,
          [habitId, dateStr]
        );
      } else {
        // Update
        await powersync.execute(
          `UPDATE habit_logs SET count = ? WHERE habit_id = ? AND log_date = ?`,
          [newVal, habitId, dateStr]
        );
      }
    } catch (err) {
      console.error('Error logging habit:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-emerald-400" /> Daily Execution
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Build consistency. Don't break the chain.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
        >
          <Plus className="h-4 w-4" /> New Habit
        </button>
      </div>

      <div className="space-y-4">
        {habits.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/50">
            <Award className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-zinc-200 font-semibold mb-2">No habits yet</h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">
              Start small. Create a daily habit to track your progress and build momentum.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((habit) => {
              const IconComponent = (Icons as any)[habit.icon || 'Flame'] || Icons.Flame;
              const todayStr = days[6].dateStr;
              const todayLog = logs.find((l: any) => l.habit_id === habit.id && l.log_date === todayStr);
              const todayCount = todayLog ? todayLog.count : 0;
              const target = habit.target_count || 1;
              const isDoneToday = todayCount >= target;

              // Calculate current streak (simple logic for display)
              let streak = 0;
              let tempDate = new Date();
              while (true) {
                const ds = tempDate.toISOString().slice(0, 10);
                const l = logs.find((x: any) => x.habit_id === habit.id && x.log_date === ds);
                if (l && l.count >= target) {
                  streak++;
                  tempDate.setDate(tempDate.getDate() - 1);
                } else if (ds === todayStr) {
                  // If it's today and missed, just check yesterday
                  tempDate.setDate(tempDate.getDate() - 1);
                } else {
                  break;
                }
              }

              return (
                <div key={habit.id} className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-sm flex flex-col justify-between hover:border-zinc-700 transition group relative overflow-hidden">
                  {/* Background accent */}
                  <div 
                    className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] transform translate-x-8 -translate-y-8 rounded-full blur-2xl"
                    style={{ backgroundColor: habit.color }}
                  />

                  <div className="flex items-start justify-between mb-6 z-10">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${habit.color}15`, color: habit.color }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-zinc-100 font-semibold">{habit.title}</h3>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">
                          {streak} Day Streak 🔥
                        </p>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button onClick={() => openEditModal(habit)} className="p-1.5 text-zinc-500 hover:text-blue-400 rounded-lg hover:bg-zinc-800">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteHabit(habit.id)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between z-10">
                    {/* 7-Day Dots */}
                    <div className="flex items-center gap-1.5">
                      {days.map((d) => {
                        const l = logs.find((x: any) => x.habit_id === habit.id && x.log_date === d.dateStr);
                        const c = l ? l.count : 0;
                        const pct = Math.min(100, Math.round((c / target) * 100));
                        const isToday = d.dateStr === todayStr;

                        return (
                          <div key={d.dateStr} className="flex flex-col items-center gap-1.5" title={`${d.label}: ${c}/${target}`}>
                            <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-zinc-200' : 'text-zinc-600'}`}>
                              {d.label}
                            </span>
                            <div 
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isToday && !c ? 'ring-2 ring-zinc-800 ring-offset-2 ring-offset-zinc-900' : ''}`}
                              style={{
                                borderColor: pct > 0 ? habit.color : '#27272a',
                                backgroundColor: pct === 100 ? habit.color : 'transparent',
                              }}
                            >
                              {pct > 0 && pct < 100 && (
                                <div 
                                  className="w-full rounded-full"
                                  style={{ height: `${pct}%`, backgroundColor: habit.color, opacity: 0.5 }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Today's Action */}
                    <div className="flex items-center gap-2">
                      {target === 1 ? (
                        <button
                          onClick={() => logProgress(habit.id, todayStr, todayCount, target, todayCount > 0 ? -1 : 1)}
                          className="h-10 w-10 rounded-xl flex items-center justify-center transition shadow-sm"
                          style={{
                            backgroundColor: isDoneToday ? habit.color : '#27272a',
                            color: isDoneToday ? '#fff' : '#71717a'
                          }}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      ) : (
                        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden h-10">
                          <button 
                            onClick={() => logProgress(habit.id, todayStr, todayCount, target, -1)}
                            className="px-3 h-full hover:bg-zinc-800 text-zinc-400 transition"
                          >
                            -
                          </button>
                          <div className="px-2 font-mono text-xs font-bold text-zinc-200 min-w-[3rem] text-center">
                            {todayCount}/{target}
                          </div>
                          <button 
                            onClick={() => logProgress(habit.id, todayStr, todayCount, target, 1)}
                            className="px-3 h-full hover:bg-zinc-800 text-zinc-400 transition"
                            style={{ color: isDoneToday ? habit.color : undefined }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Habit Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/50">
              <h2 className="text-lg font-bold text-zinc-100">
                {editingHabitId ? 'Edit Habit' : 'New Habit'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Read 20 pages, Gym..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Type</label>
                  <select
                    value={formData.target_count === 1 ? 'yesno' : 'target'}
                    onChange={(e) => setFormData({ ...formData, target_count: e.target.value === 'yesno' ? 1 : 5 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="yesno">Yes / No</option>
                    <option value="target">Target Based</option>
                  </select>
                </div>

                {formData.target_count > 1 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Daily Goal</label>
                    <input
                      type="number"
                      min="2"
                      value={formData.target_count}
                      onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 2 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setFormData({ ...formData, color: c })}
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: formData.color === c ? '#fff' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Icon</label>
                <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {CURATED_ICONS.map(i => {
                    const Ic = (Icons as any)[i];
                    return (
                      <button
                        key={i}
                        onClick={() => setFormData({ ...formData, icon: i })}
                        className={`p-2 rounded-xl flex items-center justify-center transition ${formData.icon === i ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <Ic className="h-4 w-4" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-zinc-400 hover:text-zinc-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveHabit}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/20"
              >
                Save Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
