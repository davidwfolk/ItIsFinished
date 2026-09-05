import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditLog {
  id: string;
  created_at: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  workspace_id: string | null;
  request_id: string | null;
  reason: string | null;
  before_state: any;
  after_state: any;
  metadata: any;
}

export function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.reason?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id?.includes(search) ||
      log.admin_id.includes(search) ||
      log.workspace_id?.includes(search);

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Immutable Administrative Audit Trail</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Server-enforced, append-only historical log of all privileged commands and state transitions.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-300 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, reason, target UUID..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
          >
            <option value="all">All Action Types</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
            <tr>
              <th className="w-8 px-4 py-3"></th>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Target</th>
              <th className="px-5 py-3">Superadmin</th>
              <th className="px-5 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 font-sans">
                  Loading audit stream...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 font-sans">
                  No audit records match the current filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      className="hover:bg-zinc-800/30 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-zinc-500">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-5 py-3 text-zinc-400 text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-rose-300 font-semibold">
                        {log.action}
                      </td>
                      <td className="px-5 py-3 text-zinc-300 text-[11px]">
                        <span className="text-zinc-500">{log.target_type}:</span>{' '}
                        {log.target_id ? log.target_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="px-5 py-3 text-zinc-400 text-[11px]">
                        {log.admin_id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3 text-zinc-300 font-sans text-xs max-w-sm truncate">
                        {log.reason || '—'}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-zinc-950/80">
                        <td colSpan={6} className="px-6 py-4 border-y border-zinc-800/60 font-sans">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] text-zinc-400 uppercase font-semibold">
                                Before State
                              </span>
                              <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-48">
                                {JSON.stringify(log.before_state, null, 2)}
                              </pre>
                            </div>

                            <div className="space-y-1">
                              <span className="font-mono text-[11px] text-emerald-400 uppercase font-semibold">
                                After State
                              </span>
                              <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-48">
                                {JSON.stringify(log.after_state, null, 2)}
                              </pre>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-mono text-zinc-500">
                            <div>Audit Event UUID: {log.id}</div>
                            {log.request_id && <div>Idempotency Request ID: {log.request_id}</div>}
                            {log.workspace_id && <div>Workspace UUID: {log.workspace_id}</div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
