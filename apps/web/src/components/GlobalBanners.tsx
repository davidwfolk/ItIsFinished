import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { supabase } from '../lib/powersync';
import { useAuth } from '../hooks/useAuth';

export function GlobalBanners() {
  const { user } = useAuth();
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchTransfers();

    const channel = supabase.channel('ownership_transfer_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ownership_transfer_requests' },
        () => {
          fetchTransfers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTransfers = async () => {
    const { data } = await supabase
      .from('ownership_transfer_requests')
      .select('id, workspace_id, status, workspaces(name)')
      .eq('to_user_id', user?.id)
      .eq('status', 'pending');
    
    if (data) setPendingTransfers(data);
  };

  const handleAccept = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('accept_ownership_transfer', { p_request_id: requestId });
      if (error) throw error;
      fetchTransfers();
      alert('Ownership transfer accepted!');
    } catch (err: any) {
      alert(err.message || 'Failed to accept transfer.');
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('cancel_ownership_transfer', { p_request_id: requestId });
      if (error) throw error;
      fetchTransfers();
    } catch (err: any) {
      alert(err.message || 'Failed to decline transfer.');
    }
  };

  if (!pendingTransfers.length) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-lg px-4">
      {pendingTransfers.map(transfer => (
        <div key={transfer.id} className="bg-orange-500/90 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between backdrop-blur-md border border-orange-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Ownership Transfer: </span>
              You have been invited to take ownership of <strong>{transfer.workspaces?.name || 'a workspace'}</strong>.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAccept(transfer.id)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
              title="Accept"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDecline(transfer.id)}
              className="p-1.5 bg-black/10 hover:bg-black/20 rounded-lg transition"
              title="Decline"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
