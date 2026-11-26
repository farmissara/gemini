import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'neutral';
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = '',
}) => {
  const PrimaryIcon = action?.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      className={`rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] text-center flex flex-col items-center justify-center ${
        compact ? 'px-4 py-7' : 'px-6 py-12'
      } ${className}`}
    >
      <div
        className={`tone-chip ${
          compact ? 'h-11 w-11 rounded-xl mb-3' : 'h-14 w-14 rounded-2xl mb-4'
        }`}
        aria-hidden="true"
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={2} />
      </div>

      <h3 className="text-sm font-bold text-[var(--color-text-title)] text-balance max-w-md">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)] max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={
                action.variant === 'neutral'
                  ? 'btn-tool-neutral px-3.5 py-2'
                  : 'btn-action-primary px-4 py-2'
              }
            >
              {PrimaryIcon && <PrimaryIcon className="h-3.5 w-3.5 shrink-0" />}
              <span>{action.label}</span>
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="btn-tool-neutral px-3.5 py-2"
            >
              {SecondaryIcon && <SecondaryIcon className="h-3.5 w-3.5 shrink-0" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
