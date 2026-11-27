import React from 'react';

interface PageHeaderProps {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  rawIcon?: boolean;
  actions?: React.ReactNode;
  subHeader?: React.ReactNode;
  subHeaderClassName?: string;
  tone?: string;
  compact?: boolean;
  noPrint?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  description,
  icon,
  rawIcon = false,
  actions,
  subHeader,
  subHeaderClassName = '',
  tone = '',
  compact = false,
  noPrint = false,
  className = '',
}) => (
  <header
    className={`${tone} app-page-header shrink-0 ${compact ? 'px-4 py-3' : 'px-4 py-3.5 sm:px-5 sm:py-4'} ${noPrint ? 'print:hidden' : ''} ${className}`}
  >
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        {icon && (
          rawIcon ? (
            <div className="shrink-0">{icon}</div>
          ) : (
            <div className="tone-chip h-10 w-10 rounded-xl flex items-center justify-center shrink-0" aria-hidden="true">
              {icon}
            </div>
          )
        )}
        <div className="min-w-0">
          {kicker && <div className="module-category-kicker">{kicker}</div>}
          <h1 className="type-page-title truncate">{title}</h1>
          {description && (
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
              {description}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>

    {subHeader && (
      <div className={`mt-3 pt-2.5 border-t border-[var(--color-border)] ${subHeaderClassName}`}>
        {subHeader}
      </div>
    )}
  </header>
);

interface PageShellProps {
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  subHeader?: React.ReactNode;
  toolbar?: React.ReactNode;
  tone?: string;
  compact?: boolean;
  noPrint?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({
  kicker,
  title,
  description,
  icon,
  actions,
  subHeader,
  toolbar,
  tone = '',
  compact = false,
  noPrint = false,
  className = '',
  children,
}) => (
  <div className={`${tone} space-y-3.5 ${className}`}>
    <PageHeader
      kicker={kicker}
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      subHeader={subHeader}
      compact={compact}
      noPrint={noPrint}
    />

    {toolbar && <div className="toolbar-filter-zone">{toolbar}</div>}

    {children}
  </div>
);
