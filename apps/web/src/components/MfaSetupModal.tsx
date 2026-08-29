import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Key, CheckCircle2, X, ArrowRight, Trash2, Smartphone, Copy, Check } from 'lucide-react';
import type { Factor } from '@supabase/supabase-js';
import { authManager } from '../lib/auth';

export interface MfaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  factors: Factor[];
  onMfaChanged: () => void;
}

export function MfaSetupModal({ isOpen, onClose, factors, onMfaChanged }: MfaSetupModalProps) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  if (!isOpen) return null;

  const handleStartEnrollment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authManager.enrollMfa('totp', 'Finished Authenticator');
      if (data && data.totp) {
        setFactorId(data.id);
        setQrCodeSvg(data.totp.qr_code);
        setSecret(data.totp.secret);
        setIsEnrolling(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA enrollment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !verifyCode.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const challenge = await authManager.challengeMfa(factorId);
      await authManager.verifyMfa(factorId, challenge.id, verifyCode.trim());
      setSuccess('Two-Factor Authentication successfully enabled!');
      setIsEnrolling(false);
      setFactorId(null);
      setQrCodeSvg(null);
      setSecret(null);
      setVerifyCode('');
      onMfaChanged();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnenroll = async (id: string) => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) return;
    setIsLoading(true);
    setError(null);
    try {
      await authManager.unenrollMfa(id);
      setSuccess('Two-Factor Authentication factor removed.');
      onMfaChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to remove MFA factor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
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
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <ShieldCheck className="h-4 w-4" /> Security & Two-Factor Auth
          </div>
          <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
            Multi-Factor Authentication (MFA)
          </h3>
          <p className="text-xs text-zinc-400">
            Protect your workspace with Time-based One-Time Password (TOTP) 2FA using Google Authenticator, 1Password, or Apple Keychain.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Active Factors List */}
        {!isEnrolling && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Active Security Factors
            </div>
            {factors.length > 0 ? (
              <div className="space-y-2">
                {factors.map((factor) => (
                  <div
                    key={factor.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-200">{factor.friendly_name || 'Authenticator App'}</div>
                        <div className="text-zinc-500 font-mono text-[10px]">
                          Enrolled: {new Date(factor.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnenroll(factor.id)}
                      disabled={isLoading}
                      title="Remove factor"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
                <ShieldAlert className="h-6 w-6 text-amber-400 mx-auto" />
                <p className="text-xs text-zinc-300 font-medium">MFA is currently disabled</p>
                <p className="text-[11px] text-zinc-500">
                  Add an extra layer of security to require a 6-digit code on every login.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartEnrollment}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Key className="h-4 w-4" />
              {factors.length > 0 ? 'Add Another Authenticator' : 'Enable Two-Factor Auth'}
            </button>
          </div>
        )}

        {/* Enrollment Flow */}
        {isEnrolling && (
          <form onSubmit={handleVerifyEnrollment} className="space-y-4">
            <div className="text-xs text-zinc-300 font-medium">
              1. Scan this QR code with your authenticator app:
            </div>

            {/* QR Code Container */}
            {qrCodeSvg && (
              <div className="p-4 bg-white rounded-xl flex items-center justify-center mx-auto w-fit shadow-inner">
                <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} className="h-44 w-44 [&>svg]:w-full [&>svg]:h-full" />
              </div>
            )}

            {/* Secret Fallback */}
            {secret && (
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 block font-mono">Or enter secret key manually:</label>
                <div className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300">
                  <span className="truncate flex-1 select-all">{secret}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-zinc-400 hover:text-zinc-200 p-1"
                  >
                    {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 block">
                2. Enter the 6-digit code generated by your app:
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center text-lg tracking-widest font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsEnrolling(false); setVerifyCode(''); setError(null); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || verifyCode.length !== 6}
                className="flex-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                {isLoading ? 'Verifying...' : 'Verify & Activate 2FA'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
