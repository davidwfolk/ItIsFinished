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
  Lock, 
  LogIn,
  Zap,
  Plane,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseQuickAdd, type ParsedTaskInput } from '@app/core';
import { AuthModal } from './AuthModal';
import { useAuth } from '../hooks/useAuth';

const DEMO_PRESETS = [
  { label: '🩺 Doctor Checkup', text: 'Doctor appointment tomorrow 2pm p1 45m #Personal' },
  { label: '📊 Strategy Review', text: 'Team strategy review Friday 10am 1h p1 #Work' },
  { label: '🏃 Morning Run', text: 'Morning 5k run tomorrow 7am 30m #Health' },
  { label: '📖 Read 20 Pages', text: 'Read book tonight 8:30pm 30m #Habits' },
];

const COMPARISON_ROWS = [
  {
    metric: 'Speed & Responsiveness',
    finishedBadge: '⚡ Instant (0ms)',
    finishedDesc: 'Every click, checkmark, and view updates immediately with zero spinners.',
    legacyBadge: '⏳ Sluggish (300ms – 1s)',
    legacyDesc: 'Constantly waiting on cloud network requests.',
    legacyColor: 'text-zinc-400',
  },
  {
    metric: 'Offline Reliability',
    finishedBadge: '✈️ 100% Unrestricted',
    finishedDesc: 'Plan your day on an airplane, subway, or in spotty WiFi without missing a beat.',
    legacyBadge: '❌ Degraded or Blocked',
    legacyDesc: 'Features freeze, fail to save, or trigger messy sync conflicts.',
    legacyColor: 'text-red-400',
  },
  {
    metric: 'Reordering & Dragging',
    finishedBadge: '🚀 Butter-Smooth',
    finishedDesc: 'Drag, drop, and rearrange hundreds of tasks effortlessly without lag.',
    legacyBadge: '⚠️ Stuttery & Delayed',
    legacyDesc: 'Jumpy interface while cloud tables recalculate task positions.',
    legacyColor: 'text-zinc-400',
  },
  {
    metric: 'Privacy & Ownership',
    finishedBadge: '🛡️ Private & Protected',
    finishedDesc: 'Your tasks live securely on your device with modern encrypted cloud backup.',
    legacyBadge: '🔒 Centralized Cloud',
    legacyDesc: 'Your personal tasks sit on shared corporate databases.',
    legacyColor: 'text-zinc-400',
  },
];

export function LandingPage() {

  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('login') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { refreshAuth } = useAuth();

  const [demoInput, setDemoInput] = useState('Doctor appointment tomorrow 2pm p1 45m #Personal');
  const [activeTab, setActiveTab] = useState<'calendar' | 'matrix' | 'habits' | 'nlp'>('calendar');

  const parsedDemo: ParsedTaskInput = useMemo(() => {
    return parseQuickAdd(demoInput);
  }, [demoInput]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 sm:gap-3">
            <img 
              src="/logo.png" 
              alt="It Is Finished" 
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain shadow-lg shadow-blue-600/20" 
            />
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">It Is Finished</span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition">Features</a>
            <a href="#demo" className="hover:text-zinc-100 transition">Live Demo</a>
            <a href="#comparison" className="hover:text-zinc-100 transition">Why Finished</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-900 transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 sm:px-4 py-2 rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer"
            >
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition shadow-md shadow-blue-600/25 cursor-pointer"
            >
              Start Free
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 px-1 border-t border-zinc-800/80 mt-3 space-y-1 text-sm font-medium">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition"
            >
              Features & System
            </a>
            <a 
              href="#demo" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition"
            >
              Interactive Live Demo
            </a>
            <a 
              href="#comparison" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition"
            >
              Why Local-First
            </a>
            <div className="pt-2 border-t border-zinc-900 flex gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}
                className="flex-1 py-2 text-xs font-medium text-center rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}
                className="flex-1 py-2 text-xs font-semibold text-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[300px] sm:h-[400px] bg-blue-600/15 blur-[90px] sm:blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-[250px] sm:w-[400px] h-[200px] sm:h-[300px] bg-purple-600/10 blur-[80px] sm:blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] sm:text-xs font-medium text-zinc-300 shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Finished 2.0 is Live</span>
            <span className="text-zinc-600">•</span>
            <span className="text-blue-400 font-medium">Instant & Offline-First</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-zinc-100 leading-[1.15] sm:leading-[1.1]">
            Master Your Time.<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              At the speed of thought.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-zinc-400 leading-relaxed px-1 sm:px-0">
            Stop fighting sluggish apps and scattered to-do lists. 'It Is Finished' unites natural quick-capture, daily time-blocking, priority matrices, and habit tracking into one blisteringly fast, distraction-free space.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2 sm:pt-4 max-w-xs sm:max-w-none mx-auto">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              Start Organizing Free
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 font-medium text-sm transition flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              Try Live Demo
            </a>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 sm:py-3.5 rounded-xl text-zinc-400 hover:text-zinc-200 font-medium text-sm transition cursor-pointer"
            >
              Sign In
            </button>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-6 sm:pt-10 max-w-3xl mx-auto text-left">
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0"><Zap className="h-4 w-4" /></div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-200 truncate sm:overflow-visible">Instant Speed</div>
                <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate sm:overflow-visible">Zero loading spinners</div>
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0"><Plane className="h-4 w-4" /></div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-200 truncate sm:overflow-visible">100% Offline</div>
                <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate sm:overflow-visible">Works on flights</div>
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0"><ShieldCheck className="h-4 w-4" /></div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-200 truncate sm:overflow-visible">Private by Design</div>
                <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate sm:overflow-visible">Your data stays yours</div>
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10 text-orange-400 shrink-0"><Lock className="h-4 w-4" /></div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-200 truncate sm:overflow-visible">Bank-Grade Safety</div>
                <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate sm:overflow-visible">Two-factor protection</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive NLP Sandbox Section */}
      <section id="demo" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-semibold">
              Instant Natural Quick-Add
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Type the Way You Think
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto px-2">
              No clunky date pickers or endless dropdowns. Type naturally—Finished extracts dates, times, durations, and project tags in real time before your fingers leave the keys.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="relative">
              <input
                type="text"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="e.g. Doctor appointment tomorrow 2pm p1 45m #Personal"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 pr-22 sm:pr-24 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
              />
              <div className="absolute right-2.5 sm:right-3 top-2.5 sm:top-3 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400">
                0ms Instant
              </div>
            </div>

            {/* Quick Sample Chips */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
              <span className="text-xs text-zinc-500 font-medium">Try an example:</span>
              {DEMO_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setDemoInput(preset.text)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Extracted Tokens Badges */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase font-mono mr-1 sm:mr-2 self-center">
                Extracted:
              </span>
              <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                Title: <strong className="text-white">{parsedDemo.title || '(empty)'}</strong>
              </span>
              {parsedDemo.dueDate && (
                <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {parsedDemo.dueDate}
                </span>
              )}
              {parsedDemo.dueTime && (
                <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {parsedDemo.dueTime}
                </span>
              )}
              {parsedDemo.estimatedMinutes && (
                <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-mono text-orange-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {parsedDemo.estimatedMinutes}m duration
                </span>
              )}
              {parsedDemo.priority && (
                <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 font-bold">
                  P{parsedDemo.priority}
                </span>
              )}
              {parsedDemo.projectName && (
                <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> #{parsedDemo.projectName}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Showcase */}
      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="text-center space-y-2 sm:space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-semibold">
            Your Complete Daily System
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-100">
            Four Core Pillars. One Unified Flow.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto px-2">
            Most people juggle separate apps for their to-do list, calendar, and habit tracking. Finished unites them into one fluid rhythm.
          </p>
        </div>

        {/* Feature Navigation Tabs (Scrollable on mobile) */}
        <div className="flex justify-start sm:justify-center overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 text-xs font-medium gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'calendar' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="h-4 w-4 shrink-0" /> Time-Blocking Calendar
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'matrix' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Grid className="h-4 w-4 shrink-0" /> 2×2 Priority Matrix
            </button>
            <button
              onClick={() => setActiveTab('habits')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'habits' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="h-4 w-4 shrink-0" /> Daily Habit Tracker
            </button>
          </div>
        </div>

        {/* Dynamic Showcase Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl max-w-5xl mx-auto">
          {activeTab === 'calendar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div className="space-y-3 sm:space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
                  <Calendar className="h-3.5 w-3.5" /> Visual Time Grid
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
                  Visual Time-Blocking: Turn Lists into Reality
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  See your day as actual time, not an endless wishlist. Tasks render with true visual heights (15m, 30m, 1h+). Drag tasks directly from your Inbox onto your schedule, or drop them back to unschedule with zero lag.
                </p>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Drag top edge to adjust start times in clean 15-minute intervals.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Clean 12-hour AM/PM formatting with instant duration chips.</span>
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-inner space-y-2">
                <div className="text-[11px] font-mono text-zinc-500 flex justify-between border-b border-zinc-800 pb-2">
                  <span>Today's Schedule</span>
                  <span className="text-emerald-400 font-sans font-medium">Synced</span>
                </div>
                <div className="space-y-2 pt-1 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex justify-between items-center">
                    <span className="truncate mr-2">9:00 AM • Deep Focus: Core Project</span>
                    <span className="text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded shrink-0">1h</span>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 flex justify-between items-center">
                    <span className="truncate mr-2">10:30 AM • Team Planning & Sync</span>
                    <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded shrink-0">45m</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 flex justify-between items-center">
                    <span className="truncate mr-2">1:30 PM • Client Strategy Review</span>
                    <span className="text-[10px] bg-orange-500/20 px-1.5 py-0.5 rounded shrink-0">30m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div className="space-y-3 sm:space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono">
                  <Grid className="h-3.5 w-3.5" /> 2×2 Eisenhower Matrix
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
                  Kill Decision Fatigue with Instant Prioritization
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Easily separate what's truly urgent from what just feels loud. Drag tasks seamlessly between Q1 (Do First), Q2 (Schedule), Q3 (Delegate), and Q4 (Eliminate).
                </p>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-400 shrink-0" />
                    <span>Instant priority reassignments with zero lag.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-400 shrink-0" />
                    <span>Seamlessly integrates with your today view and calendar time-grid.</span>
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5 sm:p-3 text-xs font-mono">
                <div className="p-2.5 sm:p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                  <div className="text-red-400 font-bold text-[10px]">Q1: DO FIRST</div>
                  <div className="text-zinc-200 truncate text-[11px] sm:text-xs">Finalize deliverable</div>
                </div>
                <div className="p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1">
                  <div className="text-blue-400 font-bold text-[10px]">Q2: SCHEDULE</div>
                  <div className="text-zinc-200 truncate text-[11px] sm:text-xs">Quarterly roadmap</div>
                </div>
                <div className="p-2.5 sm:p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-1">
                  <div className="text-orange-400 font-bold text-[10px]">Q3: DELEGATE</div>
                  <div className="text-zinc-200 truncate text-[11px] sm:text-xs">Weekly check-ins</div>
                </div>
                <div className="p-2.5 sm:p-3 bg-zinc-800/40 border border-zinc-700/40 rounded-xl space-y-1">
                  <div className="text-zinc-400 font-bold text-[10px]">Q4: ELIMINATE</div>
                  <div className="text-zinc-400 truncate text-[11px] sm:text-xs">Clean promo inbox</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'habits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div className="space-y-3 sm:space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-mono">
                  <Flame className="h-3.5 w-3.5" /> Habit Streaks
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
                  Build Consistency That Lasts with Habit Streaks
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Track recurring routines, morning focus, and personal health with visual streak trackers. Single-click completions update instantly and keep your momentum going every day.
                </p>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0" />
                    <span>Real-time streak counting and visual progress.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0" />
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
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-zinc-500 font-mono">{d}</span>
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
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
      <section id="comparison" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              Why Local-First Changes Everything
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              The Speed Difference You Can Actually Feel
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto px-2">
              Most task apps make you wait on a remote server across the world for every single click. Finished lives directly on your device and syncs silently in the background.
            </p>
          </div>

          {/* Mobile Comparison Cards (Optimized for phones) */}
          <div className="md:hidden space-y-3">
            {COMPARISON_ROWS.map((row, idx) => (
              <div key={idx} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-xs text-zinc-200 uppercase tracking-wider font-mono">
                  {row.metric}
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono">Finished</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">{row.finishedBadge}</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{row.finishedDesc}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Legacy Cloud Apps</span>
                      <span className={`text-xs font-medium font-mono ${row.legacyColor}`}>{row.legacyBadge}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{row.legacyDesc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Comparison Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-800 rounded-2xl overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-300 font-mono uppercase text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="p-4 w-1/4">Experience</th>
                  <th className="p-4 w-3/8 text-blue-400 font-bold bg-blue-500/5">Finished (Local-First)</th>
                  <th className="p-4 w-3/8 text-zinc-500">Typical Cloud Apps (Todoist / TickTick)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-sans">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/50">
                    <td className="p-4 font-semibold text-zinc-200">{row.metric}</td>
                    <td className="p-4 bg-blue-500/5">
                      <div className="text-emerald-400 font-bold font-mono">{row.finishedBadge}</div>
                      <div className="text-[11px] text-zinc-400 pt-0.5">{row.finishedDesc}</div>
                    </td>
                    <td className="p-4">
                      <div className={`font-medium font-mono ${row.legacyColor}`}>{row.legacyBadge}</div>
                      <div className="text-[11px] text-zinc-500 pt-0.5">{row.legacyDesc}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-900/40 to-zinc-900 border border-blue-500/30 p-6 sm:p-10 md:p-12 text-center space-y-5 sm:space-y-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-100">
              End Every Day with Peace of Mind.
            </h2>
            <p className="text-xs sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed px-1 sm:px-0">
              Stop letting to-do lists overwhelm you. Plan faster, stay focused, and finish what you start—completely free.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2 max-w-xs sm:max-w-none mx-auto">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium text-sm transition cursor-pointer"
            >
              Sign In
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-6 pt-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Free to get started</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Instant sync across all devices</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 sm:py-10 px-4 sm:px-6 text-xs text-zinc-500 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 text-zinc-400">
            <img 
              src="/logo.png" 
              alt="It Is Finished" 
              className="h-6 w-6 rounded-lg object-contain" 
            />
            <span className="font-semibold text-zinc-300">It Is Finished</span>
            <span className="hidden sm:inline">— The instant daily planner for people who value their time.</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-[12px] text-zinc-400">
            <a href="#features" className="hover:text-zinc-200 transition">Features</a>
            <span>•</span>
            <a href="#demo" className="hover:text-zinc-200 transition">Live Demo</a>
            <span>•</span>
            <a href="#comparison" className="hover:text-zinc-200 transition">Why Finished</a>
            <span>•</span>
            <button onClick={() => setAuthModalOpen(true)} className="hover:text-zinc-200 transition cursor-pointer">Sign In</button>
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
