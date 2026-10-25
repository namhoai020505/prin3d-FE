import React from 'react';

interface GlassBadgeProps {
  icon?: React.ReactNode;
  label: string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  icon,
  label,
  variant = 'cyan',
  className = '',
  size = 'md',
}) => {
  const variantStyles = {
    cyan: {
      badge: 'border-cyan-500/25 bg-cyan-950/20 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.08)]',
      tile: 'bg-gradient-to-t from-cyan-600/30 to-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]',
    },
    emerald: {
      badge: 'border-emerald-500/25 bg-emerald-950/20 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.08)]',
      tile: 'bg-gradient-to-t from-emerald-600/30 to-emerald-400/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    },
    amber: {
      badge: 'border-amber-500/25 bg-amber-950/20 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.08)]',
      tile: 'bg-gradient-to-t from-amber-600/30 to-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    },
    neutral: {
      badge: 'border-white/12 bg-white/[0.04] text-zinc-300 shadow-sm',
      tile: 'bg-white/10 text-white border border-white/20',
    },
  }[variant];

  const sizeStyles = {
    sm: 'h-7 px-2 text-[11px] gap-1.5',
    md: 'h-9 px-2.5 text-xs gap-2',
  }[size];

  const tileSizes = {
    sm: 'w-5 h-5 rounded-md text-[11px]',
    md: 'w-6 h-6 rounded-lg text-xs',
  }[size];

  return (
    <div
      className={`inline-flex items-center rounded-xl border backdrop-blur-xl font-medium tracking-wide select-none ${sizeStyles} ${variantStyles.badge} ${className}`}
    >
      {icon && (
        <span
          className={`flex items-center justify-center shrink-0 ${tileSizes} ${variantStyles.tile}`}
        >
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
    </div>
  );
};

export default GlassBadge;

