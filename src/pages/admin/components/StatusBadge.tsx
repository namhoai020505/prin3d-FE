import React from 'react';

export type StatusBadgeTone =
  | 'cyan'
  | 'green'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'rose'
  | 'blue'
  | 'purple'
  | 'slate'
  | 'gray'
  | 'success'
  | 'danger'
  | 'warning'
  | 'neutral';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  variant?: StatusBadgeTone;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const toneStyles: Record<StatusBadgeTone, string> = {
  cyan: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.15)]',
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  amber: 'border-amber-400/40 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  red: 'border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
  rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
  blue: 'border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
  purple: 'border-purple-400/40 bg-purple-500/10 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
  slate: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  gray: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  danger: 'border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  neutral: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone,
  variant,
  icon,
  size = 'sm',
  className = '',
}) => {
  const resolvedTone = variant || tone || 'slate';
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide backdrop-blur-md transition-colors select-none ${toneStyles[resolvedTone] || toneStyles.slate} ${sizeClasses} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  );
};

export default StatusBadge;

