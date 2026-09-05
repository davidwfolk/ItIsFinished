import { useState, useEffect } from 'react';
import { Timer, AlertCircle } from 'lucide-react';

interface EmergencyWrapUpBannerProps {
  expiresAt: string | null;
  onExpire?: () => void;
}

export function EmergencyWrapUpBanner({ expiresAt, onExpire }: EmergencyWrapUpBannerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins default

  useEffect(() => {
    if (!expiresAt) return;

    const calculate = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
      if (diff <= 0 && onExpire) {
        onExpire();
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-200 animate-pulse">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-6 w-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
          <span className="font-bold text-rose-300">
            Emergency 15-Minute Wrap-Up Pass:
          </span>
          <span className="text-[11px] text-rose-200/90 truncate">
            Move tasks to your 1 Free project now. Screen locks when clock hits zero.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono font-bold text-sm bg-black/40 px-3 py-1 rounded-lg border border-rose-500/30 text-rose-300 shrink-0">
        <Timer className="h-4 w-4 text-rose-400" />
        <span>{timeFormatted}</span>
      </div>
    </div>
  );
}
