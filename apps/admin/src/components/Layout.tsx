import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { Users, Building2, ShieldAlert, LogOut, ShieldCheck, CheckCircle2, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, isSuperAdmin, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Verifying Superadmin Authorization...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center shadow-xl">
          <div className="h-12 w-12 bg-rose-950/60 border border-rose-800/60 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Access Denied</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Your authenticated account (<span className="text-zinc-200 font-mono text-xs">{user.email}</span>) does not have active Superadmin privileges in the database.
          </p>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-500 text-left mb-6 font-mono">
            User ID: {user.id}
          </div>
          <button
            onClick={() => signOut()}
            className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/users', label: 'Users & Tiers', icon: Users },
    { to: '/tier-matrix', label: 'Plan Matrix', icon: Layers },
    { to: '/workspaces', label: 'Workspaces', icon: Building2 },
    { to: '/audit-logs', label: 'Audit Trail', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-900/40 flex flex-col shrink-0">
        {/* Brand header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm text-zinc-100">It Is Finished</span>
              <span className="px-1.5 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800/80 rounded text-[10px] font-mono font-bold tracking-wider uppercase">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">God Mode Backoffice</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Security & User footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 mb-2 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>RPC Audited Session</span>
          </div>
          <div className="text-xs text-zinc-300 font-medium truncate mb-1">
            {user.email}
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition mt-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
