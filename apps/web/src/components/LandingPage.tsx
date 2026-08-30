import { useState, useMemo } from 'react';
import { 
  Calendar, 
  Grid,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ArrowRight, 
  Sparkles, 
  Clock, 
  Tag, 
  Database, 
  Lock, 
  Cpu, 
  LogIn
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseQuickAdd, type ParsedTaskInput } from '@app/core';
import { AuthModal } from './AuthModal';
import { useAuth } from '../hooks/useAuth';

export function LandingPage() {

  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('login') === 'true';
  });
  const { refreshAuth } = useAuth();

  const [demoInput, setDemoInput] = useState('Deploy release to production tomorrow 3pm p1 45m #DevOps');
  const [activeTab, setActiveTab] = useState<'calendar' | 'matrix' | 'habits' | 'nlp'>('calendar');

  const parsedDemo: ParsedTaskInput = useMemo(() => {
    return parseQuickAdd(demoInput);
  }, [demoInput]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30">
              F
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">It Is Finished</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition">Features</a>
            <a href="#demo" className="hover:text-zinc-100 transition">Live Demo</a>
            <a href="#architecture" className="hover:text-zinc-100 transition">Architecture</a>
            <a href="#comparison" className="hover:text-zinc-100 transition">Comparison</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-900 transition flex items-center gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer"
            >
              Launch App
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Finished 2.0 Engine is Live</span>
            <span className="text-zinc-600">•</span>
            <span className="text-blue-400 font-mono">SQLite + PowerSync Sync</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-100 leading-[1.1]">
            Master Your Time.<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              0ms Latency. 100% Offline.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed">
            The next-generation productivity system combining natural language quick-add, 
            2×2 Eisenhower matrix prioritization, proportional time-blocking calendar, and habit streaks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              Launch App
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 font-medium text-sm transition"
            >
              Sign In to Cloud
            </button>
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 font-medium text-sm transition flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              Try Interactive Demo
            </a>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Cpu className="h-4 w-4" /></div>
              <div>
                <div className="text-xs font-bold text-zinc-200">0ms SQLite</div>
                <div className="text-[11px] text-zinc-500 font-mono">Zero spinner UI</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Database className="h-4 w-4" /></div>
              <div>
                <div className="text-xs font-bold text-zinc-200">Offline First</div>
                <div className="text-[11px] text-zinc-500 font-mono">Works on planes</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><ShieldCheck className="h-4 w-4" /></div>
              <div>
                <div className="text-xs font-bold text-zinc-200">Zero-Trust RLS</div>
                <div className="text-[11px] text-zinc-500 font-mono">PostgreSQL 17</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400"><Lock className="h-4 w-4" /></div>
              <div>
                <div className="text-xs font-bold text-zinc-200">TOTP MFA</div>
                <div className="text-[11px] text-zinc-500 font-mono">Hardware grade</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive NLP Sandbox Section */}
      <section id="demo" className="py-16 px-6 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-semibold">
              Live Interactive Parser Demo
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Natural Language Processing in 0 Milliseconds
            </h2>
            <p className="text-sm text-zinc-400 max-w-xl mx-auto">
              Type anything into the box below. Watch our real-time client NLP parser instantly extract priorities, dates, times, durations, and project tags before you even press Enter.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="relative">
              <input
                type="text"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="e.g. Doctor appointment tomorrow 2pm p1 30m #Personal"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
              />
              <div className="absolute right-3 top-3 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400">
                0ms Local
              </div>
            </div>

            {/* Extracted Tokens Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase font-mono mr-2 self-center">
                Extracted:
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                Title: <strong className="text-white">{parsedDemo.title || '(empty)'}</strong>
              </span>
              {parsedDemo.dueDate && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {parsedDemo.dueDate}
                </span>
              )}
              {parsedDemo.dueTime && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {parsedDemo.dueTime}
                </span>
              )}
              {parsedDemo.estimatedMinutes && (
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-mono text-orange-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {parsedDemo.estimatedMinutes}m duration
                </span>
              )}
              {parsedDemo.priority && (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 font-bold">
                  P{parsedDemo.priority}
                </span>
              )}
              {parsedDemo.projectName && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> #{parsedDemo.projectName}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Showcase */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-semibold">
            Complete Productivity Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-100">
            Four Core Pillars. One Unified System.
          </h2>
          <p className="text-sm text-zinc-400 max-w-2xl mx-auto">
            Switch effortlessly between time-blocking, prioritization matrix, habit tracking, and fast lists.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex justify-center">
          <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 text-xs font-medium gap-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'calendar' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="h-4 w-4" /> Time-Blocking Calendar
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'matrix' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Grid className="h-4 w-4" /> 2×2 Eisenhower Matrix
            </button>
            <button
              onClick={() => setActiveTab('habits')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'habits' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="h-4 w-4" /> Daily Habit Matrix
            </button>
          </div>
        </div>

        {/* Dynamic Showcase Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl max-w-5xl mx-auto">
          {activeTab === 'calendar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
                  <Calendar className="h-3.5 w-3.5" /> Visual Time Grid
                </div>
                <h3 className="text-2xl font-bold text-zinc-100">
                  Proportional Time-Blocking with 2-Way Inbox Drag
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Schedule your day down to the minute. Tasks render with true proportional heights (15m, 30m, 45m, 60m+). Drag any unscheduled task from your Inbox right into your calendar, or drop it back to unschedule in 0ms.
                </p>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    <span>Top-edge dragging to adjust start times in 15-minute intervals.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    <span>Clean 12-hour AM/PM formatting with right-aligned duration chips.</span>
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-inner space-y-2">
                <div className="text-[11px] font-mono text-zinc-500 flex justify-between border-b border-zinc-800 pb-2">
                  <span>Today's Time-Grid</span>
                  <span className="text-emerald-400">Synced</span>
                </div>
                <div className="space-y-2 pt-1 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex justify-between items-center">
                    <span>9:00 AM • Architecture Review</span>
                    <span className="text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded">30m</span>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 flex justify-between items-center">
                    <span>10:00 AM • Deep Focus: Core Engine</span>
                    <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded">1h</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 flex justify-between items-center">
                    <span>1:30 PM • Client Sync & Demo</span>
                    <span className="text-[10px] bg-orange-500/20 px-1.5 py-0.5 rounded">45m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono">
                  <Grid className="h-3.5 w-3.5" /> 2×2 Eisenhower Matrix
                </div>
                <h3 className="text-2xl font-bold text-zinc-100">
                  Kill Decision Fatigue with Eisenhower Prioritization
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Instantly categorize what needs urgent attention vs. what drives high-impact long-term leverage. Drag tasks seamlessly between Q1 (Do First), Q2 (Schedule), Q3 (Delegate), and Q4 (Eliminate).
                </p>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-400" />
                    <span>Instant priority reassignments in SQLite with zero latency.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-400" />
                    <span>Automatic integration with today focus and calendar time-blocks.</span>
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs font-mono">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                  <div className="text-red-400 font-bold text-[10px]">Q1: DO FIRST</div>
                  <div className="text-zinc-200 truncate">Prod hotfix deploy</div>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1">
                  <div className="text-blue-400 font-bold text-[10px]">Q2: SCHEDULE</div>
                  <div className="text-zinc-200 truncate">Q4 Strategy review</div>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-1">
                  <div className="text-orange-400 font-bold text-[10px]">Q3: DELEGATE</div>
                  <div className="text-zinc-200 truncate">Update changelog</div>
                </div>
                <div className="p-3 bg-zinc-800/40 border border-zinc-700/40 rounded-xl space-y-1">
                  <div className="text-zinc-400 font-bold text-[10px]">Q4: ELIMINATE</div>
                  <div className="text-zinc-400 truncate">Clean old inbox</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'habits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-mono">
                  <Flame className="h-3.5 w-3.5" /> Habit Streaks
                </div>
                <h3 className="text-2xl font-bold text-zinc-100">
                  Build Ironclad Consistency with Habit Matrices
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Track recurring routines, morning focus sessions, and workouts with interactive streak visualizers. Single-click completions update your SQLite database and calculate your active streak instantly.
                </p>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-400" />
                    <span>Real-time streak calculation with zero round-trip latency.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-400" />
                    <span>Daily completion rates with weekly and monthly trend tracking.</span>
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">Daily Deep Work (2h)</span>
                  <span className="text-orange-400 font-mono font-bold flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" /> 14 Days
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-zinc-500 font-mono">{d}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        i < 6 ? 'bg-orange-500 text-black shadow-sm' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {i < 6 ? '✓' : '•'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Comparison Grid Section */}
      <section id="comparison" className="py-16 px-6 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              The Architecture Difference
            </span>
            <h2 className="text-3xl font-bold text-zinc-100">
              Why Local-First Outperforms Legacy Apps
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-800 rounded-2xl overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-300 font-mono uppercase text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="p-4">Feature Metric</th>
                  <th className="p-4 text-blue-400 font-bold bg-blue-500/5">Finished (Local-First)</th>
                  <th className="p-4 text-zinc-500">Legacy Cloud Tasks (Todoist/TickTick)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-mono">
                <tr className="hover:bg-zinc-900/50">
                  <td className="p-4 font-sans font-medium text-zinc-200">Read & Write Latency</td>
                  <td className="p-4 text-emerald-400 font-bold bg-blue-500/5">⚡ 0ms (Local SQLite)</td>
                  <td className="p-4 text-zinc-400">⏳ 300ms - 1200ms (Cloud API)</td>
                </tr>
                <tr className="hover:bg-zinc-900/50">
                  <td className="p-4 font-sans font-medium text-zinc-200">Offline Functionality</td>
                  <td className="p-4 text-emerald-400 font-bold bg-blue-500/5">✅ 100% full read, write, reorder</td>
                  <td className="p-4 text-red-400">❌ Degraded / Blocked / Conflicts</td>
                </tr>
                <tr className="hover:bg-zinc-900/50">
                  <td className="p-4 font-sans font-medium text-zinc-200">Reordering Engine</td>
                  <td className="p-4 text-emerald-400 font-bold bg-blue-500/5">🚀 Fractional Lexicographical (O(1))</td>
                  <td className="p-4 text-zinc-400">⚠️ Bulk Table Rewrites (O(N))</td>
                </tr>
                <tr className="hover:bg-zinc-900/50">
                  <td className="p-4 font-sans font-medium text-zinc-200">Data Privacy & Security</td>
                  <td className="p-4 text-emerald-400 font-bold bg-blue-500/5">🛡️ Zero-Trust Supabase RLS + TOTP MFA</td>
                  <td className="p-4 text-zinc-400">🔒 Basic Shared Cloud Tables</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-blue-900/40 to-zinc-900 border border-blue-500/30 p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-100">
              Ready for Zero-Latency Productivity?
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto">
              Join the future of local-first software. Your data stays in your hands, synced securely across every screen you own.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Launch Finished Now
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium text-sm transition"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 px-6 text-xs text-zinc-500 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              F
            </div>
            <span className="font-semibold text-zinc-300">Finished</span>
            <span>— 0ms Local-First Task & Calendar System</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>PostgreSQL 17</span>
            <span>•</span>
            <span>PowerSync SQLite</span>
            <span>•</span>
            <span>Supabase Auth & MFA</span>
          </div>
        </div>
      </footer>
    
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          // clear url param if present
          window.history.replaceState({}, '', '/');
        }}
        onSuccess={async () => {
          await refreshAuth();
          navigate('/app');
        }}
      />
  </div>
  );
}
