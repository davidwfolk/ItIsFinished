import { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Sparkles, X, ArrowRight, Key, AlertCircle } from 'lucide-react';
import { authManager } from '../lib/auth';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'magiclink' | 'mfa_challenge'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setError(null);
    setMessage(null);
    setMfaCode('');
    setMfaFactorId(null);
    setMfaChallengeId(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === 'mfa_challenge') {
      if (!mfaFactorId || !mfaChallengeId || mfaCode.length !== 6) return;
      setIsLoading(true);
      try {
        await authManager.verifyMfa(mfaFactorId, mfaChallengeId, mfaCode);
        setMessage('✅ MFA Verified successfully!');
        if (onSuccess) onSuccess();
        setTimeout(onClose, 600);
      } catch (err: any) {
        setError(err.message || 'Invalid 6-digit MFA code.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim()) return;

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        await authManager.signInWithEmail(email.trim(), password);
        // Check if MFA is required (AAL2)
        const assurance = await authManager.getAssuranceLevel();
        if (assurance && assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
          const factors = await authManager.listMfaFactors();
          const totpFactor = factors.totp?.find(f => f.status === 'verified');
          if (totpFactor) {
            const challenge = await authManager.challengeMfa(totpFactor.id);
            setMfaFactorId(totpFactor.id);
            setMfaChallengeId(challenge.id);
            setMode('mfa_challenge');
            setIsLoading(false);
            return;
          }
        }

        if (onSuccess) onSuccess();
        onClose();
      } else if (mode === 'signup') {
        await authManager.signUpWithEmail(email.trim(), password, displayName.trim());
        setMessage(`🎉 Account created! Check ${email} for confirmation link or sign in.`);
      } else if (mode === 'magiclink') {
        await authManager.sendMagicLink(email.trim());
        setMessage(`✨ Magic link sent to ${email}. Check your inbox to sign in instantly!`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setError(null);
    setIsLoading(true);
    try {
      await authManager.signInWithOAuth(provider);
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}.`);
      setIsLoading(false);
    }
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
            {mode === 'mfa_challenge' && 'Two-Factor Authentication'}
          </h3>
          <p className="text-xs text-zinc-400">
            {mode === 'signin' && 'Access your encrypted offline-first workspaces.'}
            {mode === 'signup' && '0ms Local SQLite sync across all your devices.'}
            {mode === 'magiclink' && 'We’ll email you a passwordless instant login link.'}
            {mode === 'mfa_challenge' && 'Enter the 6-digit code from your authenticator app.'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        {mode !== 'mfa_challenge' && (
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setMode('signin'); handleReset(); }}
              className={`flex-1 py-1.5 rounded-lg transition ${mode === 'signin' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); handleReset(); }}
              className={`flex-1 py-1.5 rounded-lg transition ${mode === 'signup' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setMode('magiclink'); handleReset(); }}
              className={`flex-1 py-1.5 rounded-lg transition ${mode === 'magiclink' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Magic Link
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Message Banner */}
        {message && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* OAuth Buttons (Only in normal signin/signup modes) */}
        {mode !== 'mfa_challenge' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin('apple')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 transition"
            >
              <svg className="h-4 w-4 fill-current text-zinc-100" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.7-11.71-13.98-5.65-8.6-10.08-18.42-13.3-29.47-3.21-11.04-4.82-21.7-4.82-31.97 0-14.28 3.59-25.86 10.77-34.74 7.18-8.88 16.09-13.43 26.74-13.65 4.89 0 10.35 1.25 16.38 3.75 6.03 2.5 10.05 3.79 12.06 3.86 1.74 0 5.86-1.36 12.37-4.07 6.51-2.71 12.06-3.8 16.65-3.28 12.28 1.19 21.9 6.28 28.87 15.28-10.87 6.63-16.19 15.65-15.98 27.06.22 8.91 3.69 16.3 10.43 22.17 6.74 5.87 14.67 9.29 23.8 10.27-2.17 6.74-4.89 13.04-8.15 18.91zM119.22 31.85c0-7.17 2.61-13.75 7.82-19.74 5.22-5.98 11.52-9.89 18.91-11.74.87 7.07-1.63 13.69-7.5 19.85-5.87 6.16-12.27 9.94-19.23 11.35-.11.09-.23.18-.35.28z" />
              </svg>
              Apple
            </button>
          </div>
        )}

        {mode !== 'mfa_challenge' && (
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-3 text-[10px] uppercase font-mono text-zinc-500 absolute">
              or with email
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3">
          {mode === 'mfa_challenge' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">
                  Authenticator 6-Digit Code
                </label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-center text-lg tracking-widest font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                {isLoading ? 'Verifying...' : 'Verify MFA Code'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setMode('signin'); handleReset(); }}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-1"
              >
                Back to password login
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </form>
      </div>
    </div>
  );
}
