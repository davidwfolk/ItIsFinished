import { useState, useMemo } from 'react';
import { usePowerSync, useQuery } from '@powersync/react';
import { type TaskRow, getOrderIndexBetween } from '@app/core';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Folder, 
  ChevronLeft, 
  ChevronRight, 
  GripVertical,
  Plus,
  Trash2
} from 'lucide-react';

export interface CalendarTask {
  id: string;
  title: string;
  dateStr: string; // "YYYY-MM-DD"
  startTime: string; // "09:00"
  durationMinutes: number; // 30, 45, 60, 90, 120
  priority: 1 | 2 | 3 | 4;
  project: string;
  assignedTo?: { id: string; name: string; color: string } | null;
}

export interface InboxTask {
  id: string;
  title: string;
  priority: 1 | 2 | 3 | 4;
  project: string;
  durationMinutes: number;
  assignedTo?: { id: string; name: string; color: string } | null;
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00'
];

const TEAM_MEMBERS = [
  { id: 'all', name: 'Everyone', color: '#6366F1' },
  { id: 'user-1', name: 'Alex (You)', color: '#3B82F6' },
  { id: 'user-2', name: 'Sarah K.', color: '#10B981' },
  { id: 'user-3', name: 'David W.', color: '#F59E0B' },
];

export function CalendarTimeGrid() {
  const powersync = usePowerSync();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'workweek' | 'fullweek'>('fullweek');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  // Live Query from PowerSync SQLite
  const { data: dbTasks = [] } = useQuery<TaskRow & { project_name?: string }>(
    `SELECT t.*, p.name as project_name 
     FROM tasks t 
     LEFT JOIN projects p ON t.project_id = p.id 
     WHERE t.deleted_at IS NULL 
     ORDER BY t.order_index ASC`
  );

  // Compute the days for the currently selected week
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(d);
    monday.setDate(d.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    const nowLocal = new Date();
    const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
    const totalDays = viewMode === 'workweek' ? 5 : 7;

    for (let i = 0; i < totalDays; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);

      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;

      const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dayOfMonth = dayDate.getDate();

      days.push({
        dateStr,
        weekday,
        dayOfMonth,
        isToday: dateStr === todayStr,
        dayIndex: i,
        rawDate: dayDate,
      });
    }
    return days;
  }, [currentDate, viewMode]);

  // Derived tasks from SQLite query (filtered by team member)
  const inboxTasks: InboxTask[] = useMemo(() => {
    return dbTasks
      .filter((t) => {
        if (t.due_time || t.completed_at) return false;
        if (selectedMemberId !== 'all' && t.assigned_to !== selectedMemberId) return false;
        return true;
      })
      .map((t) => {
        const member = TEAM_MEMBERS.find((m) => m.id === t.assigned_to);
        return {
          id: t.id,
          title: t.title,
          priority: (t.priority || 4) as 1 | 2 | 3 | 4,
          project: t.project_name || 'Inbox',
          durationMinutes: t.estimated_minutes || 30,
          assignedTo: member ? { id: member.id, name: member.name, color: member.color } : null,
        };
      });
  }, [dbTasks, selectedMemberId]);

  const scheduledTasks: CalendarTask[] = useMemo(() => {
    return dbTasks
      .filter((t) => {
        if (!t.due_time || t.completed_at) return false;
        if (selectedMemberId !== 'all' && t.assigned_to !== selectedMemberId) return false;
        return true;
      })
      .map((t) => {
        const member = TEAM_MEMBERS.find((m) => m.id === t.assigned_to);
        return {
          id: t.id,
          title: t.title,
          dateStr: t.due_date || weekDays[0]?.dateStr || new Date().toISOString().slice(0, 10),
          startTime: t.due_time!.slice(0, 5),
          durationMinutes: t.estimated_minutes || 45,
          priority: (t.priority || 4) as 1 | 2 | 3 | 4,
          project: t.project_name || 'General',
          assignedTo: member ? { id: member.id, name: member.name, color: member.color } : null,
        };
      });
  }, [dbTasks, weekDays, selectedMemberId]);

  const [draggedItem, setDraggedItem] = useState<{ source: 'inbox' | 'calendar'; id: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ dateStr: string; hour: string } | null>(null);
  const [newSlotTaskTitle, setNewSlotTaskTitle] = useState('');

  const priorityColors = {
    1: 'bg-red-500/20 border-red-500/50 text-red-300',
    2: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
    3: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    4: 'bg-zinc-800/80 border-zinc-700 text-zinc-300',
  };

  // Week Navigation Handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleJumpToToday = () => {
    setCurrentDate(new Date());
  };

  const weekRangeTitle = useMemo(() => {
    if (weekDays.length === 0) return '';
    const firstDay = weekDays[0].rawDate;
    const lastDay = weekDays[weekDays.length - 1].rawDate;
    
    const startStr = firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = lastDay.toLocaleDateString('en-US', { 
      month: firstDay.getMonth() === lastDay.getMonth() ? undefined : 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
    return `${startStr} – ${endStr}`;
  }, [weekDays]);

  const getTopOffset = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number);
    const startHour = 8;
    const hourHeight = 60;
    const minutes = (h - startHour) * 60 + (m || 0);
    return (minutes / 60) * hourHeight;
  };

  const handleDragStart = (source: 'inbox' | 'calendar', id: string, e: React.DragEvent) => {
    setDraggedItem({ source, id });
    e.dataTransfer.setData('text/plain', JSON.stringify({ source, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSlot = async (targetDateStr: string, targetHour: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;

    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET due_date = ?, due_time = ?, updated_at = ? WHERE id = ?`,
        [targetDateStr, targetHour + ':00', now, draggedItem.id]
      );
    } catch (err) {
      console.error('Failed to schedule task in SQLite:', err);
    }
    setDraggedItem(null);
  };

  const handleCycleDuration = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = scheduledTasks.find((t) => t.id === taskId);
    if (!task) return;

    const durations = [15, 30, 45, 60, 90, 120];
    const currentIndex = durations.indexOf(task.durationMinutes);
    const nextDuration = durations[(currentIndex + 1) % durations.length];

    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET estimated_minutes = ?, updated_at = ? WHERE id = ?`,
        [nextDuration, now, taskId]
      );
    } catch (err) {
      console.error('Failed to update task duration in SQLite:', err);
    }
  };

  const handleUnscheduleTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET due_time = NULL, updated_at = ? WHERE id = ?`,
        [now, taskId]
      );
    } catch (err) {
      console.error('Failed to unschedule task in SQLite:', err);
    }
  };

  const handleCreateOnSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !newSlotTaskTitle.trim()) return;

    const now = new Date().toISOString();
    const newId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const lastIndex = dbTasks.length > 0 ? dbTasks[dbTasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);

    try {
      await powersync.execute(
        `INSERT INTO tasks (id, project_id, title, priority, due_date, due_time, estimated_minutes, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          'proj-core-arch',
          newSlotTaskTitle.trim(),
          2,
          selectedSlot.dateStr,
          selectedSlot.hour + ':00',
          45,
          newIndex,
          'todo',
          now,
          now
        ]
      );
      setNewSlotTaskTitle('');
      setSelectedSlot(null);
    } catch (err) {
      console.error('Failed to create calendar slot task in SQLite:', err);
    }
  };

  return (
    <div className="flex h-full w-full bg-zinc-950 overflow-hidden">
      {/* Left Inbox Drawer (Draggable Tasks) */}
      <div className="w-80 border-r border-zinc-800/80 bg-zinc-900/30 flex flex-col p-4">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-blue-400" /> Unscheduled Inbox
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            {inboxTasks.length}
          </span>
        </div>
        <p className="text-xs text-zinc-400 px-2 mb-4">
          🖐️ <span className="font-semibold text-zinc-300">Drag any task</span> directly onto an hourly calendar slot to time-block it.
        </p>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {inboxTasks.map((t) => (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => handleDragStart('inbox', t.id, e)}
              className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:border-blue-500/50 hover:bg-zinc-800/80 cursor-grab active:cursor-grabbing transition text-xs space-y-1.5 shadow-md group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <GripVertical className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                  {t.title}
                </span>
                <span className="font-mono text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  {t.durationMinutes}m
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-[11px] pl-5">
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" /> {t.project}
                </span>
                {t.assignedTo && (
                  <span
                    style={{ backgroundColor: t.assignedTo.color }}
                    className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center shrink-0 ml-auto"
                    title={t.assignedTo.name}
                  >
                    {t.assignedTo.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-zinc-400 font-semibold">P{t.priority}</span>
              </div>
            </div>
          ))}
          {inboxTasks.length === 0 && (
            <div className="text-center py-10 text-xs text-zinc-500 italic">
              Inbox is clear! All tasks are time-blocked.
            </div>
          )}
        </div>
      </div>

      {/* Main Calendar Grid Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Calendar Toolbar with Team Member Switcher */}
        <div className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold tracking-tight">Time Blocking Grid</h2>
            
            {/* Week Navigation */}
            <div className="flex items-center gap-1 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button 
                onClick={handlePrevWeek}
                title="Previous Week"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleJumpToToday}
                className="px-2 py-0.5 hover:bg-zinc-800 rounded font-medium text-xs text-zinc-200 transition"
              >
                Today
              </button>
              <button 
                onClick={handleNextWeek}
                title="Next Week"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="text-xs font-mono font-semibold text-zinc-400">
              {weekRangeTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Team Member Filter Bar */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
              {TEAM_MEMBERS.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                    selectedMemberId === member.id
                      ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span
                    style={{ backgroundColor: member.color }}
                    className="w-2 h-2 rounded-full shrink-0"
                  />
                  <span>{member.name}</span>
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setViewMode('workweek')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  viewMode === 'workweek' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Work Week (5d)
              </button>
              <button
                onClick={() => setViewMode('fullweek')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  viewMode === 'fullweek' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Full Week (7d)
              </button>
            </div>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid border-b border-zinc-800/80 bg-zinc-900/40" style={{ gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)` }}>
          <div className="p-3 text-[11px] font-mono text-zinc-500 uppercase text-center border-r border-zinc-800/60">
            GMT
          </div>
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`p-3 text-center border-r border-zinc-800/60 transition ${
                day.isToday ? 'bg-blue-500/10' : ''
              }`}
            >
              <span className={`text-[11px] font-mono font-semibold uppercase ${day.isToday ? 'text-blue-400' : 'text-zinc-400'}`}>
                {day.weekday}
              </span>
              <div className={`text-sm font-bold mt-0.5 ${day.isToday ? 'text-blue-400 font-mono' : 'text-zinc-200'}`}>
                {day.dayOfMonth}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Hourly Time Grid */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="grid relative min-h-[780px]" style={{ gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)` }}>
            {/* Left Time Axis Labels */}
            <div className="border-r border-zinc-800/60 bg-zinc-950/60">
              {HOURS.map((hour) => (
                <div key={hour} className="h-[60px] border-b border-zinc-800/40 pr-2 pt-1 text-right text-[10px] font-mono text-zinc-500">
                  {hour}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => (
              <div
                key={day.dateStr}
                className={`border-r border-zinc-800/60 relative ${day.isToday ? 'bg-blue-950/5' : ''}`}
              >
                {/* Hourly Slots (Drop Targets) */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnSlot(day.dateStr, hour, e)}
                    onClick={() => setSelectedSlot({ dateStr: day.dateStr, hour })}
                    className="h-[60px] border-b border-zinc-800/40 hover:bg-zinc-800/20 transition cursor-pointer relative group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute top-1 right-2 text-[10px] text-zinc-500 font-mono">
                      + Block
                    </span>
                  </div>
                ))}

                {/* Render Scheduled Task Blocks on this Day */}
                {scheduledTasks
                  .filter((t) => t.dateStr === day.dateStr)
                  .map((task) => {
                    const top = getTopOffset(task.startTime);
                    const height = (task.durationMinutes / 60) * 60;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart('calendar', task.id, e)}
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(46, height)}px`,
                        }}
                        className={`absolute left-1 right-1 rounded-lg border p-1.5 shadow-md transition select-none flex flex-col justify-between cursor-grab active:cursor-grabbing group overflow-hidden ${
                          priorityColors[task.priority]
                        }`}
                      >
                        {/* Top Line: Full Width Task Title */}
                        <div className="flex items-start justify-between gap-1 min-w-0">
                          <span className="font-semibold text-xs leading-tight truncate flex-1 flex items-center gap-1">
                            {task.assignedTo && (
                              <span
                                style={{ backgroundColor: task.assignedTo.color }}
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                title={task.assignedTo.name}
                              />
                            )}
                            <span className="truncate">{task.title}</span>
                          </span>
                          <button
                            onClick={(e) => handleUnscheduleTask(task.id, e)}
                            title="Unschedule back to Inbox"
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition shrink-0"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        {/* Bottom Line: Time + Truncated Project with ... and Duration Pill on the right */}
                        <div className="flex items-center justify-between text-[10px] opacity-80 font-mono gap-1 min-w-0">
                          <span className="flex items-center gap-1 min-w-0 flex-1 truncate">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            <span className="shrink-0">{task.startTime} •</span>
                            <span className="truncate">#{task.project}</span>
                          </span>

                          {/* Duration Badge (Resizer) */}
                          <button
                            onClick={(e) => handleCycleDuration(task.id, e)}
                            title="Click to adjust duration"
                            className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 font-bold transition shrink-0 whitespace-nowrap text-[9px] leading-none"
                          >
                            {task.durationMinutes}m ↕
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Add Dialog when clicking on a Calendar slot */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-400" /> Time-Block at {selectedSlot.hour}
              </h4>
              <span className="text-xs font-mono text-zinc-500">{selectedSlot.dateStr}</span>
            </div>

            <form onSubmit={handleCreateOnSlot} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={newSlotTaskTitle}
                onChange={(e) => setNewSlotTaskTitle(e.target.value)}
                placeholder="Task title (e.g., Deep Work Sprint)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSlotTaskTitle.trim()}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium rounded-lg"
                >
                  Schedule Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

