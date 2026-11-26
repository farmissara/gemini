import React from 'react';

export type StatusBadgeStatus =
  | 'complete'
  | 'pending'
  | 'delayed'
  | 'info'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger';

type NormalizedBadgeStatus = 'complete' | 'pending' | 'delayed' | 'info' | 'neutral';

export interface StatusBadgeProps {
  status?: StatusBadgeStatus;
  /** Optional legacy alias for `status` */
  tone?: StatusBadgeStatus;
  label?: React.ReactNode;
  size?: 'xs' | 'sm';
  dotOnly?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}

function normalizeStatus(status?: StatusBadgeStatus, tone?: StatusBadgeStatus): NormalizedBadgeStatus {
  const raw = status || tone || 'neutral';
  if (raw === 'success' || raw === 'complete') return 'complete';
  if (raw === 'warning' || raw === 'pending') return 'pending';
  if (raw === 'danger' || raw === 'delayed') return 'delayed';
  if (raw === 'info') return 'info';
  return 'neutral';
}

const DEFAULT_LABELS: Record<NormalizedBadgeStatus, string> = {
  complete: 'เสร็จสมบูรณ์',
  pending: 'รอดำเนินการ',
  delayed: 'ล่าช้า / มีปัญหา',
  info: 'กำลังดำเนินการ',
  neutral: 'ทั่วไป',
};

const DOT_STYLES: Record<NormalizedBadgeStatus, string> = {
  complete: 'bg-emerald-500 dark:bg-emerald-400',
  pending: 'bg-amber-400 dark:bg-amber-400',
  delayed: 'bg-rose-500 dark:bg-rose-400',
  info: 'bg-sky-500 dark:bg-sky-400',
  neutral: 'bg-slate-400 dark:bg-slate-500',
};

const TEXT_STYLES: Record<NormalizedBadgeStatus, string> = {
  complete: 'text-emerald-700 dark:text-emerald-300',
  pending: 'text-amber-700 dark:text-amber-300',
  delayed: 'text-rose-700 dark:text-rose-300',
  info: 'text-sky-700 dark:text-sky-300',
  neutral: 'text-[var(--color-text-muted)]',
};

const BG_STYLES: Record<NormalizedBadgeStatus, string> = {
  complete: 'bg-emerald-500/10 dark:bg-emerald-400/12',
  pending: 'bg-amber-500/12 dark:bg-amber-400/12',
  delayed: 'bg-rose-500/10 dark:bg-rose-400/12',
  info: 'bg-sky-500/10 dark:bg-sky-400/12',
  neutral: 'bg-[var(--color-card-subtle)]',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  tone,
  label,
  size = 'xs',
  dotOnly = false,
  title,
  ariaLabel,
  className = '',
  icon,
  pulse = false,
}) => {
  const normalized = normalizeStatus(status, tone);
  const resolvedLabel = label === undefined ? DEFAULT_LABELS[normalized] : label;
  const labelText = typeof resolvedLabel === 'string' ? resolvedLabel : undefined;
  const computedTitle = title || labelText || ariaLabel || DEFAULT_LABELS[normalized];
  const computedAriaLabel = ariaLabel || labelText || DEFAULT_LABELS[normalized];

  if (dotOnly) {
    return (
      <span
        role="status"
        title={computedTitle}
        aria-label={computedAriaLabel}
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${DOT_STYLES[normalized]} ${pulse ? 'animate-pulse' : ''}`}
        />
      </span>
    );
  }

  return (
    <span
      role="status"
      title={computedTitle}
      aria-label={computedAriaLabel}
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold whitespace-nowrap shrink-0 ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
      } ${BG_STYLES[normalized]} ${TEXT_STYLES[normalized]} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_STYLES[normalized]} ${pulse ? 'animate-pulse' : ''}`}
      />
      {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
      {resolvedLabel !== null && <span>{resolvedLabel}</span>}
    </span>
  );
};
