import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusIndicatorProps {
  tone: StatusTone;
  label?: React.ReactNode;
  size?: 'xs' | 'sm';
  dotOnly?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}

const DOT_TONES: Record<StatusTone, string> = {
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-400 dark:bg-amber-400',
  danger: 'bg-rose-500 dark:bg-rose-400',
  info: 'bg-sky-500 dark:bg-sky-400',
  neutral: 'bg-slate-400 dark:bg-slate-500',
};

const TEXT_TONES: Record<StatusTone, string> = {
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
  info: 'text-sky-700 dark:text-sky-300',
  neutral: 'text-[var(--color-text-muted)]',
};

const BG_TONES: Record<StatusTone, string> = {
  success: 'bg-emerald-500/10 dark:bg-emerald-400/12',
  warning: 'bg-amber-500/12 dark:bg-amber-400/12',
  danger: 'bg-rose-500/10 dark:bg-rose-400/12',
  info: 'bg-sky-500/10 dark:bg-sky-400/12',
  neutral: 'bg-[var(--color-card-subtle)]',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  tone,
  label,
  size = 'sm',
  dotOnly = false,
  title,
  ariaLabel,
  className = '',
  icon,
  pulse = false,
}) => {
  const computedTitle = title || (typeof label === 'string' ? label : ariaLabel);

  if (dotOnly) {
    return (
      <span
        role="status"
        title={computedTitle}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${DOT_TONES[tone]} ${pulse ? 'animate-pulse' : ''}`}
        />
      </span>
    );
  }

  return (
    <span
      title={computedTitle}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold whitespace-nowrap shrink-0 ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
      } ${BG_TONES[tone]} ${TEXT_TONES[tone]} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_TONES[tone]} ${pulse ? 'animate-pulse' : ''}`}
      />
      {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
      {label !== undefined && label !== null && <span>{label}</span>}
    </span>
  );
};
