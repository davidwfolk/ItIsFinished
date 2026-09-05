import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, requestId: string) => Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  extraFields?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  confirmVariant = 'primary',
  extraFields,
}: ConfirmModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A written reason is required for administrative audit compliance.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const requestId = crypto.randomUUID();
      await onConfirm(reason.trim(), requestId);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const buttonStyles = {
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  }[confirmVariant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-zinc-500 hover:text-zinc-300 transition p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          {extraFields}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Administrative Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="Provide context for this change (e.g. VIP comp, customer support ticket #1234, TOS violation)..."
              rows={3}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              This action is logged atomically to the immutable admin audit trail with your identity.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition flex items-center gap-2 ${buttonStyles} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
