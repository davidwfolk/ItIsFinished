import { Sparkles, X, Check, Lock, ArrowRight } from 'lucide-react';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription?: string;
  onUpgrade?: () => void;
}

export function UpgradePromptModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  onUpgrade,
}: UpgradePromptModalProps) {
  if (!isOpen) return null;

  const proPerks = [
    'Unlimited projects and saved smart filters',
    'Up to 3 active workspaces for multi-venture work',
    'Interactive Time-Blocking Calendar Grid',
    'Priority 2×2 Eisenhower Matrix view',
    'Up to 5 collaborator seats per workspace',
    'Workspace aggregate and team analytics',
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with Lock Icon */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              Pro Feature
            </div>
            <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
              Unlock {featureName}
            </h3>
          </div>
        </div>

        {/* Feature pitch */}
        <p className="text-xs text-zinc-400 leading-relaxed">
          {featureDescription ||
            `${featureName} is an advanced productivity tool exclusive to the Pro plan. Upgrade now to optimize your workflow.`}
        </p>

        {/* Value Proposition Checklist */}
        <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-2xl space-y-2 text-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-blue-400" />
            <span>Included with Pro</span>
          </div>
          {proPerks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2 text-zinc-300">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="pt-1 flex flex-col gap-2">
          <button
            onClick={() => {
              if (onUpgrade) onUpgrade();
              else {
                alert('Upgrade flow: In a production environment, this redirects to Stripe Checkout.');
                onClose();
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2"
          >
            <span>Upgrade to Pro</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
