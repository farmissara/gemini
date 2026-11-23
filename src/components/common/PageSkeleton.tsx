import React from 'react';

interface PageSkeletonProps {
  compact?: boolean;
  rows?: number;
}

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 5,
}) => (
  <div className="saas-card overflow-hidden">
    <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3">
      <div className="skeleton-shimmer h-4 w-40 rounded-md" />
      <div className="skeleton-shimmer h-7 w-24 rounded-lg" />
    </div>
    <div className="divide-y divide-[var(--color-border)]">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-4 py-3 flex items-center gap-3">
          <div className="skeleton-shimmer h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, colIdx) => (
              <div
                key={colIdx}
                className={`skeleton-shimmer h-3.5 rounded-md ${colIdx === 0 ? 'w-4/5' : colIdx === cols - 1 ? 'w-1/2 ml-auto' : 'w-3/5'}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="saas-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="skeleton-shimmer h-3 w-20 rounded" />
          <div className="skeleton-shimmer h-6 w-6 rounded-lg" />
        </div>
        <div className="skeleton-shimmer h-6 w-24 rounded-md" />
        <div className="skeleton-shimmer h-3 w-32 rounded" />
      </div>
    ))}
  </div>
);

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ compact = false, rows = 6 }) => (
  <div className="space-y-3.5 w-full" aria-busy="true" aria-label="กำลังโหลดหน้าจอ">
    <div className="app-page-header flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2 min-w-0 flex-1">
        <div className="skeleton-shimmer h-3 w-24 rounded" />
        <div className="skeleton-shimmer h-5 w-56 max-w-full rounded-md" />
        {!compact && <div className="skeleton-shimmer h-3 w-80 max-w-full rounded" />}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
        <div className="skeleton-shimmer h-8 w-28 rounded-lg" />
      </div>
    </div>

    {!compact && <CardGridSkeleton count={4} />}
    <TableSkeleton rows={rows} />
  </div>
);
