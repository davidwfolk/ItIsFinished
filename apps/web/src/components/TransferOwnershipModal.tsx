import { useState } from 'react';
import { ArrowRightLeft, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/powersync';
import { useQuery } from '@powersync/react';

export interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export function TransferOwnershipModal({ isOpen, onClose, workspaceId, workspaceName }: TransferOwnershipModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Fetch only eligible members (cannot transfer to yourself)
  const { data: members = [] } = useQuery<{
    user_id: string;
    display_name: string;
    email: string;
    role: string;
  }>(
    `SELECT wm.user_id, p.display_name, p.email, wm.role
     FROM workspace_members wm
     JOIN profiles p ON p.id = wm.user_id
     WHERE wm.workspace_id = ? AND wm.role != 'owner'`,
    [workspaceId]
  );

  if (!isOpen) return null;

  const handleTransfer = async () => {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('request_ownership_transfer', {
        p_workspace_id: workspaceId,
        p_to_user_id: selectedUserId
      });
      if (rpcError) throw rpcError;
      setSuccess(true);
      setTimeout(onClose, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to request transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-orange-400 mb-4">
          <ArrowRightLeft className="h-5 w-5" />
          <h2 className="text-lg font-bold text-zinc-100">Transfer Ownership</h2>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
            <p className="text-emerald-400 font-semibold text-sm">Transfer Request Sent!</p>
            <p className="text-xs text-emerald-400/80 mt-1">The recipient must accept the transfer on their dashboard.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Transferring ownership of <strong>{workspaceName}</strong> will downgrade you to an Admin.
              The new owner must have an active Pro subscription to accept.
            </p>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Select New Owner</label>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-orange-500"
              >
                <option value="" disabled>Choose a member...</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name || m.email} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleTransfer}
              disabled={!selectedUserId || isSubmitting}
              className="w-full mt-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition"
            >
              {isSubmitting ? 'Requesting...' : 'Request Transfer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
