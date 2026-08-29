import { useState, useMemo, useRef } from 'react';
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
  Trash2, 
  Inbox 
} from 'lucide-react';

export interface CalendarTask {
  id: string;
  title: string;
  dateStr: string; // "YYYY-MM-DD"
  startTime: string; // "09:00" or "09:15"
  durationMinutes: number; // 15, 30, 45, 60, 90, 120
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

export interface CalendarTimeGridProps {
  onTaskClick?: (taskId: string) => void;
}

const HOURS = [
  '08', '09', '10', '11', 
  '12', '13', '14', '15', 
  '16', '17', '18', '19', '20'
];

const QUARTERS = ['00', '15', '30', '45'];

const TEAM_MEMBERS = [
  { id: 'all', name: 'Everyone', color: '#6366F1' },
  { id: 'user-1', name: 'Alex (You)', color: '#3B82F6' },
  { id: 'user-2', name: 'Sarah K.', color: '#10B981' },
  { id: 'user-3', name: 'David W.', color: '#F59E0B' },
];

function formatHourLabel(hourStr: string): string {
  const h = parseInt(hourStr, 10);
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function formatTimeTo12h(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function CalendarTimeGrid({ onTaskClick }: CalendarTimeGridProps) {
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

  const isDraggingOrResizingRef = useRef(false);

  const [draggedItem, setDraggedItem] = useState<{ source: 'inbox' | 'calendar'; id: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ dateStr: string; exactTime: string } | null>(null);
  const [newSlotTaskTitle, setNewSlotTaskTitle] = useState('');
  const [inboxDropActive, setInboxDropActive] = useState(false);

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

  // Deterministic Week Date Range Title (e.g. "Aug 24 – Aug 30, 2026")
  const weekRangeTitle = useMemo(() => {
    if (weekDays.length === 0) return '';
    const firstDay = weekDays[0].rawDate;
    const lastDay = weekDays[weekDays.length - 1].rawDate;
    
    const startMonth = firstDay.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });
    const startDay = firstDay.getDate();
    const endDay = lastDay.getDate();
    const year = lastDay.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  }, [weekDays]);

  // Convert time to pixels (60px = 1 hour, 15px = 15 mins)
  const getTopOffset = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number);
    const startHour = 8;
    const hourHeight = 60;
    const minutes = (h - startHour) * 60 + (m || 0);
    return (minutes / 60) * hourHeight;
  };

  // Drag-and-Drop Handlers
  const handleDragStart = (source: 'inbox' | 'calendar', id: string, e: React.DragEvent) => {
    isDraggingOrResizingRef.current = true;
    setDraggedItem({ source, id });
    e.dataTransfer.setData('text/plain', JSON.stringify({ source, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      isDraggingOrResizingRef.current = false;
    }, 200);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 15-Minute Precision Drop Handler
  const handleDropOnQuarterSlot = async (targetDateStr: string, hour: string, quarter: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;

    const exactTime = `${hour}:${quarter}:00`;
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET due_date = ?, due_time = ?, updated_at = ? WHERE id = ?`,
        [targetDateStr, exactTime, now, draggedItem.id]
      );
    } catch (err) {
      console.error('Failed to schedule task in SQLite:', err);
    }
    setDraggedItem(null);
    setTimeout(() => {
      isDraggingOrResizingRef.current = false;
    }, 200);
  };

  const handleDropOnInbox = async (e: React.DragEvent) => {
    e.preventDefault();
    setInboxDropActive(false);
    if (!draggedItem) return;

    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET due_time = NULL, updated_at = ? WHERE id = ?`,
        [now, draggedItem.id]
      );
    } catch (err) {
      console.error('Failed to unschedule task to inbox in SQLite:', err);
    }
    setDraggedItem(null);
    setTimeout(() => {
      isDraggingOrResizingRef.current = false;
    }, 200);
  };

  // Interactive Top Edge Resize (Drag to adjust start time in 15m steps)
  const handleTopResizeStart = (task: CalendarTask, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingOrResizingRef.current = true;
    const startY = e.clientY;
    const [origH, origM] = task.startTime.split(':').map(Number);
    const origStartMinutes = origH * 60 + origM;
    const origDuration = task.durationMinutes;
    const endMinutes = origStartMinutes + origDuration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMinutes = Math.round(deltaY / 15) * 15; // 15-minute steps
      let newStartMinutes = origStartMinutes + deltaMinutes;
      
      // Clamp: minimum start 8:00 AM (480 mins), maximum end - 15m
      newStartMinutes = Math.max(8 * 60, Math.min(endMinutes - 15, newStartMinutes));
      const newDuration = endMinutes - newStartMinutes;
      
      const newH = Math.floor(newStartMinutes / 60);
      const newM = newStartMinutes % 60;
      const newTimeStr = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;

      powersync.execute(
        `UPDATE tasks SET due_time = ?, estimated_minutes = ?, updated_at = ? WHERE id = ?`,
        [newTimeStr, newDuration, new Date().toISOString(), task.id]
      );
    };

    const handleMouseUp = () => {
      setTimeout(() => {
        isDraggingOrResizingRef.current = false;
      }, 200);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Interactive Bottom Edge Resize (Drag to adjust duration in 15m steps, e.g. 75m, 90m)
  const handleBottomResizeStart = (task: CalendarTask, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingOrResizingRef.current = true;
    const startY = e.clientY;
    const origDuration = task.durationMinutes;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMinutes = Math.round(deltaY / 15) * 15; // 15-minute steps
      const newDuration = Math.max(15, origDuration + deltaMinutes);

      powersync.execute(
        `UPDATE tasks SET estimated_minutes = ?, updated_at = ? WHERE id = ?`,
        [newDuration, new Date().toISOString(), task.id]
      );
    };

    const handleMouseUp = () => {
      setTimeout(() => {
        isDraggingOrResizingRef.current = false;
      }, 200);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCardClick = (taskId: string, e: React.MouseEvent) => {
    if (isDraggingOrResizingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onTaskClick?.(taskId);
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
          selectedSlot.exactTime,
          30,
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
      {/* Left Inbox Drawer (Draggable Tasks & Drop Target to Unschedule) */}
      <div 
        onDragOver={(e) => {
          handleDragOver(e);
          if (!inboxDropActive) setInboxDropActive(true);
        }}
        onDragLeave={() => setInboxDropActive(false)}
        onDrop={handleDropOnInbox}
        className={`w-80 border-r border-zinc-800/80 bg-zinc-900/30 flex flex-col p-4 transition-all duration-150 relative ${
          inboxDropActive ? 'bg-blue-950/20 border-r-blue-500 ring-2 ring-blue-500/30' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-blue-400" /> Unscheduled Inbox
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            {inboxTasks.length}
          </span>
        </div>
        <p className="text-xs text-zinc-400 px-2 mb-4">
          🖐️ <span className="font-semibold text-zinc-300">Drag to slot</span> (snaps to 15m), or <span className="font-semibold text-zinc-300">drag back here</span> to unschedule.
        </p>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {inboxTasks.map((t) => (
            <div
              key={t.id}
              draggable
              onClick={(e) => handleCardClick(t.id, e)}
              onDragStart={(e) => handleDragStart('inbox', t.id, e)}
              onDragEnd={handleDragEnd}
              className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:border-blue-500/50 hover:bg-zinc-800/80 cursor-pointer active:cursor-grabbing transition text-xs space-y-1.5 shadow-md group"
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
                    className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center shrink-0 ml-auto shadow-sm"
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
            <div className="text-center py-10 text-xs text-zinc-500 italic border border-dashed border-zinc-800/80 rounded-xl p-4">
              Inbox is clear! Drop tasks here anytime to unschedule.
            </div>
          )}
        </div>
      </div>

      {/* Main Calendar Grid Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Calendar Toolbar with 12h Time Range & Team Filter */}
        <div className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-400" /> Time Blocking Grid
            </h2>
            
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

            <span className="text-xs font-mono font-semibold text-zinc-300">
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
            Time
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

        {/* Scrollable Hourly Time Grid with 15-Minute Precision Slots */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="grid relative min-h-[780px]" style={{ gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)` }}>
            {/* Left Time Axis Labels (12-Hour AM/PM) */}
            <div className="border-r border-zinc-800/60 bg-zinc-950/60">
              {HOURS.map((hour) => (
                <div key={hour} className="h-[60px] border-b border-zinc-800/40 pr-2 pt-1 text-right text-[10px] font-mono font-medium text-zinc-500">
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => (
              <div
                key={day.dateStr}
                className={`border-r border-zinc-800/60 relative ${day.isToday ? 'bg-blue-950/5' : ''}`}
              >
                {/* Hourly Slots (Each divided into four 15-minute sub-slots) */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-zinc-800/40 relative flex flex-col"
                  >
                    {QUARTERS.map((quarter) => (
                      <div
                        key={quarter}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnQuarterSlot(day.dateStr, hour, quarter, e)}
                        onClick={() => setSelectedSlot({ dateStr: day.dateStr, exactTime: `${hour}:${quarter}:00` })}
                        className="h-[15px] border-b border-zinc-900/30 hover:bg-blue-500/10 transition cursor-pointer relative group flex items-center justify-end pr-2"
                        title={`Time block at ${formatTimeTo12h(`${hour}:${quarter}`)}`}
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-[8px] text-zinc-500 font-mono">
                          +{quarter === '00' ? formatHourLabel(hour) : `:${quarter}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Render Scheduled Task Blocks on this Day */}
                {scheduledTasks
                  .filter((t) => t.dateStr === day.dateStr)
                  .map((task) => {
                    const top = getTopOffset(task.startTime);
                    // True proportional height: 15m = 15px, 30m = 30px, 45m = 45px, 60m = 60px, 75m = 75px
                    const height = (task.durationMinutes / 60) * 60;
                    const isCompact = task.durationMinutes <= 35; // 15m and 30m

                    return (
                      <div
                        key={task.id}
                        draggable
                        onClick={(e) => handleCardClick(task.id, e)}
                        onDragStart={(e) => handleDragStart('calendar', task.id, e)}
                        onDragEnd={handleDragEnd}
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(15, height - 1)}px`,
                        }}
                        className={`absolute left-0.5 right-0.5 rounded border shadow-md transition select-none cursor-pointer active:cursor-grabbing group overflow-hidden px-1.5 ${
                          isCompact ? (task.durationMinutes <= 20 ? 'py-0' : 'pt-1 pb-0.5') : 'pt-1 pb-1'
                        } ${priorityColors[task.priority]}`}
                      >
                        {/* Top Resize Handle (Drag to adjust start time earlier/later in 15m steps) */}
                        <div
                          onMouseDown={(e) => handleTopResizeStart(task, e)}
                          className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-20 hover:bg-blue-400/40 transition rounded-t"
                          title="Drag top edge to adjust start time (15m increments)"
                        />

                        {/* Unschedule Hover Button (Uniform Top-Right across ALL cards) */}
                        <button
                          onClick={(e) => handleUnscheduleTask(task.id, e)}
                          title="Unschedule back to Inbox"
                          className="absolute top-0.5 right-1 opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 bg-zinc-900/90 rounded border border-white/10 transition z-10"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>

                        {isCompact ? (
                          /* Slim 1-line for 15m and 30m tasks */
                          <div className="flex items-start justify-between gap-1.5 w-full h-full">
                            {/* Left Side: Assignee Dot + Task Title */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                              {task.assignedTo && (
                                <span
                                  style={{ backgroundColor: task.assignedTo.color }}
                                  className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                                  title={task.assignedTo.name}
                                />
                              )}
                              <span className="font-semibold truncate text-[11px] leading-none">
                                {task.title}
                              </span>
                            </div>

                            {/* Right Side: Exact same right-aligned Clock + Duration */}
                            <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-zinc-300 font-semibold leading-none">
                              <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                              <span>{formatDurationLabel(task.durationMinutes)}</span>
                            </div>
                          </div>
                        ) : task.durationMinutes < 55 ? (
                          /* 45m Layout: Title on top, Project & Duration on Line 2 */
                          <div className="flex flex-col h-full w-full">
                            {/* Line 1: Title */}
                            <div className="flex items-start justify-between gap-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {task.assignedTo && (
                                  <span
                                    style={{ backgroundColor: task.assignedTo.color }}
                                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                    title={task.assignedTo.name}
                                  />
                                )}
                                <span className="font-bold text-xs leading-none truncate">
                                  {task.title}
                                </span>
                              </div>
                            </div>

                            {/* Line 2: Project (left) & Duration (right) */}
                            <div className="flex items-center justify-between text-[10px] font-mono gap-1 mt-1 min-w-0">
                              <span className="text-[11px] font-medium text-zinc-400 truncate">
                                #{task.project}
                              </span>
                              <div className="flex items-center text-zinc-300 font-semibold shrink-0 ml-2">
                                <Clock className="h-3 w-3 mr-1 text-zinc-400 shrink-0" />
                                <span>{formatDurationLabel(task.durationMinutes)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Spacious Layout for 60m, 75m, 90m, 120m+: Duration at the Bottom-Right */
                          <div className="flex flex-col justify-between h-full w-full">
                            {/* Top: Title with Project directly underneath */}
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {task.assignedTo && (
                                  <span
                                    style={{ backgroundColor: task.assignedTo.color }}
                                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                    title={task.assignedTo.name}
                                  />
                                )}
                                <span className="font-bold text-xs leading-none truncate">
                                  {task.title}
                                </span>
                              </div>
                              <div className="text-[11px] font-medium text-zinc-400 truncate mt-1">
                                #{task.project}
                              </div>
                            </div>

                            {/* Bottom: Duration aligned to the right */}
                            <div className="flex items-center justify-end text-[10px] font-mono text-zinc-300 font-semibold">
                              <Clock className="h-3 w-3 mr-1 text-zinc-400 shrink-0" />
                              <span>{formatDurationLabel(task.durationMinutes)}</span>
                            </div>
                          </div>
                        )}

                        {/* Bottom Resize Handle (Drag to adjust duration in 15m steps) */}
                        <div
                          onMouseDown={(e) => handleBottomResizeStart(task, e)}
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 hover:bg-blue-400/40 transition flex items-center justify-center group/resize rounded-b"
                          title="Drag bottom edge to adjust duration (15m increments)"
                        >
                          <div className="w-8 h-0.5 bg-white/20 group-hover/resize:bg-white/70 rounded-full" />
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
                <Plus className="h-4 w-4 text-blue-400" /> Time-Block at {formatTimeTo12h(selectedSlot.exactTime.slice(0, 5))}
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

