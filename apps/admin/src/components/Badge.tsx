import React from 'react';

interface BadgeProps {
  variant:
    | 'free'
    | 'pro'
    | 'active'
    | 'locked'
    | 'suspended'
    | 'archived'
    | 'owner'
    | 'admin'
    | 'member'
    | 'personal'
    | 'free_team'
    | 'business'
    | 'enterprise';
  children?: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const label = children || variant.replace('_', ' ').toUpperCase();

  const styles: Record<string, string> = {
    free: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    pro: 'bg-blue-950/70 text-blue-300 border-blue-800/60 font-semibold',
    active: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    locked: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
    suspended: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
    archived: 'bg-zinc-900 text-zinc-400 border-zinc-700',
    owner: 'bg-purple-950/70 text-purple-300 border-purple-800/60 font-semibold',
    admin: 'bg-sky-950/70 text-sky-300 border-sky-800/60',
    member: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    personal: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    free_team: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    business: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80 font-bold tracking-wide',
    enterprise: 'bg-amber-950/80 text-amber-300 border-amber-800/80 font-bold tracking-wide',
  };

  const style = styles[variant] || 'bg-zinc-800 text-zinc-300 border-zinc-700';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${style}`}
    >
      {label}
    </span>
  );
}
