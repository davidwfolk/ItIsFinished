import { useState, useEffect } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

interface DowngradeGraceBannerProps {
  expiresAt: string | null;
  onUpgrade?: () => void;
}

export function DowngradeGraceBanner({ expiresAt, onUpgrade }: DowngradeGraceBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('Grace period active');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Grace period expiring now');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h remaining`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-6 w-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
          <span className="font-semibold text-amber-300 whitespace-nowrap">
            Free Plan Downgrade ({timeLeft}):
          </span>
          <span className="text-[11px] text-amber-200/80 truncate">
            Wrap up and organize tasks before downsizing is required.
          </span>
        </div>
      </div>

      <button
        onClick={() => {
          if (onUpgrade) onUpgrade();
          else alert('Redirecting to Stripe checkout to re-activate Pro...');
        }}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Re-activate Pro</span>
      </button>
    </div>
  );
}
