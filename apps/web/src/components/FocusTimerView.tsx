import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Timer,
  ChevronDown
} from 'lucide-react';
import { usePowerSync, useQuery } from '@powersync/react';
import type { TaskRow, FocusSessionRow } from '@app/core';

export interface FocusTimerViewProps {
  initialTaskId?: string | null;
  onNavigateToTask?: (taskId: string) => void;
}

export function FocusTimerView({ initialTaskId }: FocusTimerViewProps) {
  const powersync = usePowerSync();

  // Query active tasks from SQLite for the task selector
  const { data: dbTasks = [] } = useQuery<TaskRow & { project_name?: string }>(
    `SELECT t.*, p.name as project_name 
     FROM tasks t 
     LEFT JOIN projects p ON t.project_id = p.id 
     WHERE t.deleted_at IS NULL AND t.completed_at IS NULL AND t.parent_id IS NULL
     ORDER BY t.order_index ASC`
  );

  // Query completed focus sessions today
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: dbSessions = [] } = useQuery<FocusSessionRow & { task_title?: string }>(
    `SELECT fs.*, t.title as task_title 
     FROM focus_sessions fs 
     LEFT JOIN tasks t ON fs.task_id = t.id 
     WHERE fs.started_at >= ? 
     ORDER BY fs.started_at DESC`,
    [todayStr + 'T00:00:00.000Z']
  );

  // Selected Task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId || null);

  // Modes & Timer State
  const [mode, setMode] = useState<'focus_25' | 'focus_50' | 'break_5' | 'break_15'>('focus_25');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'whitenoise' | 'cafe'>('none');
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  // Web Audio Context for Synthesized Ambient Soundscape
  const audioCtxRef = useRef<AudioContext | null>(null);

  const modeDurations: Record<typeof mode, number> = {
    focus_25: 25 * 60,
    focus_50: 50 * 60,
    break_5: 5 * 60,
    break_15: 15 * 60,
  };

  const totalDuration = modeDurations[mode];
  const progressPercent = ((totalDuration - secondsLeft) / totalDuration) * 100;

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      if (!sessionStartTime) setSessionStartTime(new Date().toISOString());
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && secondsLeft === 0) {
      setIsActive(false);
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  // Audio synthesis for ambient soundscapes
  useEffect(() => {
    if (ambientSound === 'none' || !isActive) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      // Generate Pink Noise / Soft Rain buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.05;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Low pass filter to make it gentle rain sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = ambientSound === 'rain' ? 800 : ambientSound === 'cafe' ? 1200 : 400;

      const gain = ctx.createGain();
      gain.gain.value = 0.15;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(0);
    } catch (e) {
      console.warn('Web Audio not supported or blocked by browser policy', e);
    }

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [ambientSound, isActive]);

  const handleSessionComplete = async () => {
    const totalMinutes = Math.round(totalDuration / 60);
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `INSERT INTO focus_sessions (id, user_id, task_id, duration_minutes, completed, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          'demo-user',
          selectedTaskId || null,
          totalMinutes,
          1,
          sessionStartTime || now,
          now
        ]
      );
    } catch (err) {
      console.error('Failed to save focus session in SQLite:', err);
    }
    setSessionStartTime(null);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(modeDurations[mode]);
    setSessionStartTime(null);
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setIsActive(false);
    setSecondsLeft(modeDurations[newMode]);
    setSessionStartTime(null);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalFocusMinutesToday = dbSessions
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-zinc-950 p-8 max-w-5xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Timer className="h-6 w-6 text-blue-400" /> Focus Engine
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Pomodoro deep work intervals with ambient audio & automatic SQLite logging
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs font-bold">
          <Flame className="h-4 w-4" /> {totalFocusMinutesToday}m Focused Today
        </div>
      </div>

      {/* Main Focus Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Timer Hub */}
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
          {/* Mode Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono mb-6">
            <button
              onClick={() => switchMode('focus_25')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                mode === 'focus_25' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Focus 25m
            </button>
            <button
              onClick={() => switchMode('focus_50')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                mode === 'focus_50' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Deep 50m
            </button>
            <button
              onClick={() => switchMode('break_5')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                mode === 'break_5' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Break 5m
            </button>
            <button
              onClick={() => switchMode('break_15')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                mode === 'break_15' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Break 15m
            </button>
          </div>

          {/* Linked Task Selector Pill */}
          <div className="w-full max-w-sm mb-6">
            <div className="relative">
              <select
                value={selectedTaskId || ''}
                onChange={(e) => setSelectedTaskId(e.target.value || null)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 font-medium focus:outline-none focus:border-blue-500 appearance-none cursor-pointer pr-8"
              >
                <option value="">✨ General Deep Work (Unlinked)</option>
                {dbTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.project_name || 'Inbox'} • {t.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Circular Countdown Display with SVG Ring */}
          <div className="relative flex items-center justify-center my-4">
            <svg className="w-64 h-64 transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r={radius}
                className="text-zinc-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="128"
                cy="128"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  mode.startsWith('break') ? 'text-emerald-500' : 'text-blue-500'
                }`}
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-mono font-bold tracking-tight text-zinc-100">
                {timeString}
              </span>
              <span className={`text-[10px] font-mono font-bold tracking-widest uppercase mt-2 ${
                mode.startsWith('break') ? 'text-emerald-400' : 'text-blue-400'
              }`}>
                {isActive ? 'SESSION ACTIVE' : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={resetTimer}
              title="Reset Timer"
              className="p-3 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              onClick={toggleTimer}
              className={`px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 text-white shadow-xl transition transform active:scale-95 ${
                isActive
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
              }`}
            >
              {isActive ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              <span>{isActive ? 'Pause' : 'Start Focus'}</span>
            </button>

            {/* Ambient Soundscape Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  const options: ('none' | 'rain' | 'whitenoise' | 'cafe')[] = ['none', 'rain', 'whitenoise', 'cafe'];
                  const next = options[(options.indexOf(ambientSound) + 1) % options.length];
                  setAmbientSound(next);
                }}
                title="Toggle Ambient Audio"
                className={`p-3 rounded-full border transition flex items-center gap-1.5 ${
                  ambientSound !== 'none'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ambientSound === 'none' ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {ambientSound !== 'none' && (
            <span className="text-[11px] font-mono text-blue-400/80 mt-4 animate-pulse">
              🎵 Synthesized Audio: {ambientSound.toUpperCase()}
            </span>
          )}
        </div>

        {/* Right Session History Log & Info */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Today's Focus Log
              </span>
              <span className="text-xs font-mono text-zinc-500">{dbSessions.length} sessions</span>
            </h3>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {dbSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs space-y-0.5"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-zinc-200 truncate">
                      {session.task_title || 'General Deep Work'}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {session.started_at ? new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    +{session.duration_minutes}m
                  </span>
                </div>
              ))}

              {dbSessions.length === 0 && (
                <div className="text-center py-12 text-zinc-500 text-xs italic">
                  No focus sessions logged yet today. Click "Start Focus" to begin!
                </div>
              )}
            </div>
          </div>

          {/* Quick Focus Tips */}
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-200">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" /> The Pomodoro Technique
            </p>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Work for 25 minutes with zero interruptions, then take a 5-minute break. After 4 sessions, reward yourself with an extended 15-minute rest.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

