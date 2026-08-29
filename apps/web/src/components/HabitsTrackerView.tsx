import { useState } from 'react';
import { 
  Flame, 
  Check, 
  Plus, 
  TrendingUp, 
  Award, 
  Trash2 
} from 'lucide-react';

export interface HabitItem {
  id: string;
  name: string;
  category: string;
  color: string;
  streak: number;
  completedDays: Record<string, boolean>; // YYYY-MM-DD -> boolean
}

export function HabitsTrackerView() {
  // Generate past 7 days dates
  const days: { dateStr: string; label: string; dayNum: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    days.push({ dateStr, label, dayNum });
  }

  const [habits, setHabits] = useState<HabitItem[]>([
    {
      id: '1',
      name: 'Morning Deep Work (90m)',
      category: 'Productivity',
      color: '#3B82F6',
      streak: 14,
      completedDays: {
        [days[0].dateStr]: true,
        [days[1].dateStr]: true,
        [days[2].dateStr]: true,
        [days[3].dateStr]: true,
        [days[4].dateStr]: true,
        [days[5].dateStr]: true,
        [days[6].dateStr]: true,
      },
    },
    {
      id: '2',
      name: 'Read 20 Pages',
      category: 'Learning',
      color: '#8B5CF6',
      streak: 8,
      completedDays: {
        [days[1].dateStr]: true,
        [days[2].dateStr]: true,
        [days[3].dateStr]: true,
        [days[5].dateStr]: true,
        [days[6].dateStr]: true,
      },
    },
    {
      id: '3',
      name: 'Physical Training / Cardio',
      category: 'Health',
      color: '#10B981',
      streak: 5,
      completedDays: {
        [days[2].dateStr]: true,
        [days[3].dateStr]: true,
        [days[4].dateStr]: true,
        [days[6].dateStr]: true,
      },
    },
    {
      id: '4',
      name: 'Evening Inbox Zero & Shutdown',
      category: 'Productivity',
      color: '#F59E0B',
      streak: 12,
      completedDays: {
        [days[0].dateStr]: true,
        [days[1].dateStr]: true,
        [days[2].dateStr]: true,
        [days[4].dateStr]: true,
        [days[5].dateStr]: true,
      },
    },
  ]);

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitColor, setNewHabitColor] = useState('#3B82F6');
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleHabitDay = (habitId: string, dateStr: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habitId) {
          const isDone = !!h.completedDays[dateStr];
          const updated = { ...h.completedDays, [dateStr]: !isDone };
          const newStreak = !isDone ? h.streak + 1 : Math.max(0, h.streak - 1);
          return { ...h, completedDays: updated, streak: newStreak };
        }
        return h;
      })
    );
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: HabitItem = {
      id: `habit-${Date.now()}`,
      name: newHabitName.trim(),
      category: 'Daily',
      color: newHabitColor,
      streak: 0,
      completedDays: {},
    };
    setHabits((prev) => [...prev, newHabit]);
    setNewHabitName('');
    setShowAddForm(false);
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Flame className="h-6 w-6 text-orange-400" /> Daily Habits & Streaks
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Consistency Tracker • 0ms Local SQLite Check-ins
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
        >
          <Plus className="h-4 w-4" /> New Habit
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Current Best Streak</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100">14 Days</p>
          <p className="text-[11px] text-zinc-500">Morning Deep Work (90m)</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Weekly Completion</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">86%</p>
          <p className="text-[11px] text-zinc-500">24/28 checks completed</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Active Habits</span>
            <Award className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-purple-400">{habits.length}</p>
          <p className="text-[11px] text-zinc-500">Tracked daily</p>
        </div>
      </div>

      {/* Habits Matrix Grid */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
            Habit Tracker (Past 7 Days)
          </span>

          <div className="flex items-center gap-4">
            {days.map((d, idx) => (
              <div key={d.dateStr} className="w-10 text-center">
                <p className="text-[10px] text-zinc-500 font-mono uppercase">{d.label}</p>
                <p className={`text-xs font-bold font-mono ${idx === 6 ? 'text-blue-400' : 'text-zinc-300'}`}>
                  {d.dayNum}
                </p>
              </div>
            ))}
            <div className="w-8" />
          </div>
        </div>

        <div className="divide-y divide-zinc-800/50">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition group"
            >
              {/* Habit Info */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                <div
                  style={{ backgroundColor: habit.color }}
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 truncate">{habit.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-500 font-mono">{habit.category}</span>
                    <span className="text-[10px] text-orange-400 font-mono font-bold flex items-center gap-0.5">
                      <Flame className="h-3 w-3" /> {habit.streak}d streak
                    </span>
                  </div>
                </div>
              </div>

              {/* Day Checkboxes */}
              <div className="flex items-center gap-4">
                {days.map((d) => {
                  const isDone = !!habit.completedDays[d.dateStr];
                  return (
                    <button
                      key={d.dateStr}
                      onClick={() => toggleHabitDay(habit.id, d.dateStr)}
                      style={{
                        backgroundColor: isDone ? habit.color : 'transparent',
                        borderColor: isDone ? habit.color : '#3F3F46',
                      }}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition shadow-sm ${
                        isDone ? 'text-white' : 'hover:border-zinc-500 text-transparent'
                      }`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>
                  );
                })}

                {/* Delete button */}
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="w-8 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition"
                  title="Delete habit"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Habit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Create New Habit</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Habit Name</label>
                <input
                  type="text"
                  placeholder="e.g. Read 30m, 10,000 steps, Meditate..."
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  autoFocus
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Color Theme</label>
                <div className="flex items-center gap-3 mt-2">
                  {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewHabitColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition ${
                        newHabitColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHabit}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
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

