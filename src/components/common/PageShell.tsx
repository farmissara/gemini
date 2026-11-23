import React from 'react';

interface PageShellProps {
  kicker?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({
  kicker,
  title,
  description,
  icon,
  actions,
  toolbar,
  className = '',
  children,
}) => (
  <div className={`space-y-3.5 ${className}`}>
    <header className="app-page-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        {icon && (
          <div className="tone-chip h-10 w-10 rounded-xl shrink-0" aria-hidden="true">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {kicker && <div className="module-category-kicker">{kicker}</div>}
          <h1 className="type-page-title truncate">{title}</h1>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>

    {toolbar && <div className="toolbar-filter-zone">{toolbar}</div>}

    {children}
  </div>
);
