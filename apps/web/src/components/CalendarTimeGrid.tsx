import { useState, useMemo } from 'react';
import { usePowerSync, useQuery } from '@powersync/react';
import { type TaskRow, getOrderIndexBetween } from '@app/core';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Folder, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
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
}

export interface InboxTask {
  id: string;
  title: string;
  priority: 1 | 2 | 3 | 4;
  project: string;
  durationMinutes: number;
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00'
];

export function CalendarTimeGrid() {
  const powersync = usePowerSync();
  // Current view reference date (defaults to current week)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'workweek' | 'fullweek'>('fullweek');

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

  // Derived tasks from SQLite query
  const inboxTasks: InboxTask[] = useMemo(() => {
    return dbTasks
      .filter(t => !t.due_time && !t.completed_at)
      .map(t => ({
        id: t.id,
        title: t.title,
        priority: (t.priority || 4) as 1 | 2 | 3 | 4,
        project: t.project_name || 'Inbox',
        durationMinutes: t.estimated_minutes || 30,
      }));
  }, [dbTasks]);

  const scheduledTasks: CalendarTask[] = useMemo(() => {
    return dbTasks
      .filter(t => !!t.due_time && !t.completed_at)
      .map(t => ({
        id: t.id,
        title: t.title,
        dateStr: t.due_date || weekDays[0]?.dateStr || new Date().toISOString().slice(0, 10),
        startTime: t.due_time!.slice(0, 5),
        durationMinutes: t.estimated_minutes || 45,
        priority: (t.priority || 4) as 1 | 2 | 3 | 4,
        project: t.project_name || 'General',
      }));
  }, [dbTasks, weekDays]);

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

  // Week Date Range Title (e.g. "Aug 24 – Aug 30, 2026")
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

  // Convert time to pixels (60px = 1 hour)
  const getTopOffset = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number);
    const startHour = 8;
    const hourHeight = 60;
    const minutes = (h - startHour) * 60 + (m || 0);
    return (minutes / 60) * hourHeight;
  };

  // Drag-and-Drop Handlers
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

  // Duration Resizing (Cycle through 15m, 30m, 45m, 60m, 90m, 120m)
  const handleCycleDuration = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const durations = [15, 30, 45, 60, 90, 120];
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task) return;
    const nextIdx = (durations.indexOf(task.durationMinutes) + 1) % durations.length;
    const nextDuration = durations[nextIdx];
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `UPDATE tasks SET estimated_minutes = ?, updated_at = ? WHERE id = ?`,
        [nextDuration, now, taskId]
      );
    } catch (err) {
      console.error('Failed to cycle task duration in SQLite:', err);
    }
  };

  // Remove Scheduled Task back to Inbox
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

  // Create Custom Task on Slot Click
  const handleCreateOnSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !newSlotTaskTitle.trim()) return;

    const lastIndex = dbTasks.length > 0 ? dbTasks[dbTasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `INSERT INTO tasks (id, project_id, title, priority, due_date, due_time, estimated_minutes, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
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
        {/* Calendar Toolbar with Dynamic Month/Week Switcher */}
        <div className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold tracking-tight">Time Blocking Grid</h2>
            <div className="flex items-center gap-1 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button 
                onClick={handlePrevWeek}
                title="Previous Week"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 font-semibold text-zinc-100 min-w-[170px] text-center">{weekRangeTitle}</span>
              <button 
                onClick={handleNextWeek}
                title="Next Week"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleJumpToToday}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition"
            >
              Today
            </button>

            {/* View Mode Toggle: 5 Days vs 7 Days */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode('workweek')}
                className={`px-2 py-0.5 rounded transition ${viewMode === 'workweek' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                5 Days
              </button>
              <button
                onClick={() => setViewMode('fullweek')}
                className={`px-2 py-0.5 rounded transition ${viewMode === 'fullweek' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                7 Days
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Interactive Drag & Drop
          </div>
        </div>

        {/* Days Header */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="w-16 shrink-0 border-r border-zinc-800/80" />
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`flex-1 py-2 text-center border-r border-zinc-800/80 last:border-r-0 flex flex-col items-center justify-center gap-0.5 ${
                day.isToday ? 'bg-blue-500/10' : ''
              }`}
            >
              <span className={`text-[11px] font-mono font-bold tracking-wider ${day.isToday ? 'text-blue-400' : 'text-zinc-500'}`}>
                {day.weekday}
              </span>
              <span className={`h-6 w-6 flex items-center justify-center rounded-full text-xs font-bold ${
                day.isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40' : 'text-zinc-200'
              }`}>
                {day.dayOfMonth}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable Hourly Time Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex min-h-[780px] relative">
            {/* Hour Axis */}
            <div className="w-16 shrink-0 border-r border-zinc-800/80 bg-zinc-950">
              {HOURS.map((hour) => (
                <div key={hour} className="h-[60px] text-right pr-3 text-[11px] font-mono text-zinc-600 border-b border-zinc-900/60 flex items-start justify-end pt-1">
                  {hour}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => (
              <div
                key={day.dateStr}
                className={`flex-1 border-r border-zinc-800/80 last:border-r-0 relative ${
                  day.isToday ? 'bg-blue-950/5' : 'bg-zinc-950/50'
                }`}
              >
                {/* Hour Grid Lines (Click to create, Drop target) */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnSlot(day.dateStr, hour, e)}
                    onClick={() => setSelectedSlot({ dateStr: day.dateStr, hour })}
                    className="h-[60px] border-b border-zinc-900/60 hover:bg-zinc-800/30 cursor-pointer transition relative group"
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
                          height: `${Math.max(40, height)}px`,
                        }}
                        className={`absolute left-1 right-1 rounded-lg border p-2 shadow-xl transition select-none flex flex-col justify-between cursor-grab active:cursor-grabbing group ${
                          priorityColors[task.priority]
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-xs leading-tight truncate">
                            {task.title}
                          </span>
                          <button
                            onClick={(e) => handleUnscheduleTask(task.id, e)}
                            title="Unschedule back to Inbox"
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[10px] opacity-80 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> {task.startTime} • #{task.project}
                          </span>
                          {/* Duration Badge with Resize click trigger */}
                          <button
                            onClick={(e) => handleCycleDuration(task.id, e)}
                            title="Click to adjust duration"
                            className="px-1.5 py-0.2 rounded bg-black/40 hover:bg-black/80 font-bold transition"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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
