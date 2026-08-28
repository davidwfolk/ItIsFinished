import { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Sparkles, X, ArrowRight } from 'lucide-react';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string, displayName: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'magiclink'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      if (mode === 'magiclink') {
        setMessage(`✨ Magic link sent to ${email}. Check your inbox!`);
      } else {
        onSuccess(email, displayName || email.split('@')[0]);
        onClose();
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-300 p-1 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <ShieldCheck className="h-4 w-4" /> Supabase Zero-Trust Auth
          </div>
          <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Finished Account'}
            {mode === 'magiclink' && 'Sign In with Magic Link'}
          </h3>
          <p className="text-xs text-zinc-400">
            {mode === 'signin' && 'Access your encrypted offline-first workspaces.'}
            {mode === 'signup' && '0ms Local SQLite sync across all your devices.'}
            {mode === 'magiclink' && 'We’ll email you a passwordless instant login link.'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setMode('signin'); setMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg transition ${mode === 'signin' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg transition ${mode === 'signup' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setMode('magiclink'); setMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg transition ${mode === 'magiclink' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Magic Link
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Your Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {mode !== 'magiclink' && (
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20 mt-4 cursor-pointer"
          >
            {isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Magic Link'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
