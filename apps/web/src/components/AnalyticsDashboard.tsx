import { BarChart3, Flame, Clock, CheckCircle2, TrendingUp, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { useQuery } from '@powersync/react';

export function AnalyticsDashboard() {
  const { data: habits = [] } = useQuery<any>(
    `SELECT * FROM habits WHERE deleted_at IS NULL ORDER BY created_at ASC`
  );
  
  // Fetch recent logs (e.g., last 40 days to cover the calendar view)
  const { data: logs = [] } = useQuery<any>(
    `SELECT * FROM habit_logs`
  );

  // Fetch actual tasks
  const { data: allTasks = [] } = useQuery<any>(
    `SELECT * FROM tasks WHERE deleted_at IS NULL`
  );

  // Fetch actual focus sessions
  const { data: allFocusSessions = [] } = useQuery<any>(
    `SELECT * FROM focus_sessions`
  );

  const now = new Date();
  
  // 1. Calculate Weekly Velocity (Last 7 Days)
  const weeklyVelocity = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toISOString().split('T')[0];
    
    const completed = allTasks.filter((t: any) => t.completed_at && t.completed_at.startsWith(dateStr)).length;
    
    return { day: dayStr, completed, target: 10 };
  });

  // 2. Calculate Priority Breakdown for Active Tasks
  const activeTasks = allTasks.filter((t: any) => !t.completed_at);
  const totalActive = activeTasks.length || 1;

  const priorityBreakdown = [
    { label: 'P1 Urgent', level: 1, color: 'bg-red-500', text: 'text-red-400' },
    { label: 'P2 High', level: 2, color: 'bg-orange-500', text: 'text-orange-400' },
    { label: 'P3 Medium', level: 3, color: 'bg-blue-500', text: 'text-blue-400' },
    { label: 'P4 Low', level: 4, color: 'bg-zinc-500', text: 'text-zinc-400' },
  ].map(p => {
    const count = activeTasks.filter((t: any) => t.priority === p.level || (!t.priority && p.level === 4)).length;
    const percentage = Math.round((count / totalActive) * 100);
    return { ...p, count, percentage: totalActive === 1 && count === 0 ? 0 : percentage };
  });

  const maxCompleted = Math.max(...weeklyVelocity.map(d => d.completed), 1); // Avoid 0

  // 3. KPI Calculations
  const totalCompleted7Days = weeklyVelocity.reduce((sum, d) => sum + d.completed, 0);
  
  const totalCompletedPrev7Days = allTasks.filter((t: any) => {
    if (!t.completed_at) return false;
    const diffDays = Math.ceil(Math.abs(now.getTime() - new Date(t.completed_at).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7 && diffDays <= 14;
  }).length;
  
  const completionTrend = totalCompletedPrev7Days === 0 
    ? 100 
    : Math.round(((totalCompleted7Days - totalCompletedPrev7Days) / totalCompletedPrev7Days) * 100);

  const focusTimeTotalMinutes = allFocusSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
  const focusTimeHours = (focusTimeTotalMinutes / 60).toFixed(1);
  const focusTimeBlocks = allFocusSessions.length;

  // Habit Consistency (Last 14 Days)
  const fourteenDaysAgoStr = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recentLogs = logs.filter((l: any) => l.log_date >= fourteenDaysAgoStr);
  
  let totalHabitTargets = 0;
  let totalHabitCompletions = 0;
  
  habits.forEach((h: any) => {
    totalHabitTargets += (h.target_count || 1) * 14;
    const habitLogs = recentLogs.filter((l: any) => l.habit_id === h.id);
    totalHabitCompletions += habitLogs.reduce((sum: number, l: any) => sum + Math.min(l.count, h.target_count || 1), 0);
  });
  
  const habitConsistencyPct = totalHabitTargets === 0 ? 0 : Math.round((totalHabitCompletions / totalHabitTargets) * 100);

  // Task Completion Rate
  const tasksAdded7Days = allTasks.filter((t: any) => {
    if (!t.created_at) return false;
    const diffDays = Math.ceil(Math.abs(now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;
  
  const taskCompletionRate = tasksAdded7Days === 0 ? (totalCompleted7Days > 0 ? 100 : 0) : Math.round((totalCompleted7Days / tasksAdded7Days) * 100);


  // Generate Calendar Grid
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
  const calendarDays = [];
  
  // Fill previous month days
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, -startOffset + i + 1);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }
  
  // Fill current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ date: d, isCurrentMonth: true });
  }
  
  // Fill next month days to complete the grid (usually 5-6 weeks = 35 or 42 days)
  const remaining = (calendarDays.length % 7) === 0 ? 0 : 7 - (calendarDays.length % 7);
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl w-full mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" /> Productivity & Consistency Hub
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Weekly velocity, priority distribution, and habit analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Velocity: {totalCompleted7Days} Tasks / Week
          </span>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Completed (7 Days)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100">{totalCompleted7Days}</p>
          <span className={`text-[11px] font-medium ${completionTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {completionTrend >= 0 ? '↑' : '↓'} {Math.abs(completionTrend)}% vs last week
          </span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Focus Time Logged</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100">{focusTimeHours} <span className="text-sm font-normal text-zinc-400">hrs</span></p>
          <span className="text-[11px] text-purple-400 font-medium">{focusTimeBlocks} Pomodoro blocks</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Habit Consistency</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100">{habitConsistencyPct}%</p>
          <span className="text-[11px] text-orange-400 font-medium">14-day consistency</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Task Completion Rate</span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100">{taskCompletionRate}%</p>
          <span className="text-[11px] text-blue-400 font-medium">{totalCompleted7Days} completed / {tasksAdded7Days} added</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Velocity Chart */}
        <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" /> Daily Completion Velocity
            </h3>
            <span className="text-xs font-mono text-zinc-500">Target: 10 / day</span>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {weeklyVelocity.map((d) => {
              const heightPercent = Math.round((d.completed / (maxCompleted * 1.2)) * 100);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition">
                    {d.completed}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all group-hover:from-blue-500 group-hover:to-blue-300 shadow-lg shadow-blue-500/10 min-h-[12px]"
                  />
                  <span className="text-xs font-mono text-zinc-400 font-medium">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200">Tasks by Priority</h3>

          <div className="space-y-3.5 pt-2">
            {priorityBreakdown.map((p) => (
              <div key={p.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className={`font-semibold ${p.text}`}>{p.label}</span>
                  <span className="font-mono text-zinc-400">{p.count} ({p.percentage}%)</span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    style={{ width: `${p.percentage}%` }}
                    className={`h-full ${p.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Habit Consistency Heatmap */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl mt-8">
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-purple-400" /> Habit Consistency Matrix
          </h3>
          <span className="text-xs font-bold text-zinc-400 uppercase font-mono">
            {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="p-5 overflow-x-auto custom-scrollbar">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 min-w-[700px]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {calendarDays.map((dayInfo, i) => {
              const dateStr = dayInfo.date.toISOString().slice(0, 10);
              
              // Find habits logged on this day
              const dayLogs = habits.map((h: any) => {
                const log = logs.find((l: any) => l.habit_id === h.id && l.log_date === dateStr);
                const target = h.target_count || 1;
                const count = log ? log.count : 0;
                const pct = Math.min(100, Math.round((count / target) * 100));
                return { habit: h, pct, count, target };
              }).filter(item => item.pct > 0);

              const isToday = dateStr === now.toISOString().slice(0, 10);

              return (
                <div 
                  key={i} 
                  className={`min-h-[80px] p-2 rounded-xl border flex flex-col gap-1 ${
                    isToday ? 'border-blue-500/50 bg-blue-500/5' : 
                    dayInfo.isCurrentMonth ? 'border-zinc-800/60 bg-zinc-950/40' : 'border-zinc-800/20 bg-zinc-950/20 opacity-50'
                  }`}
                >
                  <span className={`text-xs font-mono font-bold mb-1 ${isToday ? 'text-blue-400' : 'text-zinc-500'}`}>
                    {dayInfo.date.getDate()}
                  </span>
                  
                  {/* Render Habit Bars */}
                  <div className="space-y-1 flex-1">
                    {dayLogs.slice(0, 5).map((logItem, idx) => {
                      const isComplete = logItem.pct >= 100;
                      return (
                        <div 
                          key={idx}
                          title={`${logItem.habit.title} (${logItem.count}/${logItem.target})`}
                          className={`h-1.5 rounded-full w-full ${isComplete ? '' : 'border border-dashed'}`}
                          style={{
                            backgroundColor: isComplete ? logItem.habit.color : 'transparent',
                            borderColor: !isComplete ? logItem.habit.color : undefined,
                            opacity: isComplete ? 1 : 0.6,
                          }}
                        />
                      );
                    })}
                    
                    {dayLogs.length > 5 && (
                      <div className="text-[9px] font-mono font-bold text-zinc-500 text-right mt-1">
                        +{dayLogs.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
