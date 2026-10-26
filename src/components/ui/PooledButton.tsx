import React from 'react';

interface PooledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const PooledButton: React.FC<PooledButtonProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  }[size];

  const variantClass = {
    cyan: 'btn-pooled-cyan',
    emerald: 'btn-pooled-emerald',
    subtle: 'btn-pooled-subtle',
  }[variant];

  return (
    <button
      {...props}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 font-bold tracking-tight rounded-xl select-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClass} ${className}`}
    >
      {icon && <span className="relative z-[2] shrink-0">{icon}</span>}
      <span className="relative z-[2] truncate">{children}</span>
    </button>
  );
};

export default PooledButton;

