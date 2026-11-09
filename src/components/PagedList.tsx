import React, { useEffect, useState } from 'react';

interface PagedListProps<T> {
  items: readonly T[];
  pageSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  previousLabel?: string;
  nextLabel?: string;
  paginationLabel?: string;
}

export function PagedList<T>({
  items,
  pageSize,
  renderItem,
  emptyState,
  previousLabel = 'ก่อนหน้า',
  nextLabel = 'ถัดไป',
  paginationLabel = 'Pagination'
}: PagedListProps<T>) {
  const [page, setPage] = useState(0);
  const safePageSize = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize));

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [pageCount]);

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  const currentPage = Math.min(page, pageCount - 1);
  const startIndex = currentPage * safePageSize;
  const pageItems = items.slice(startIndex, startIndex + safePageSize);

  return (
    <div className="space-y-2.5">
      {pageItems.map((item, index) => renderItem(item, startIndex + index))}
      {pageCount > 1 && (
        <nav aria-label={paginationLabel} className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            {previousLabel}
          </button>
          <span aria-live="polite" className="text-[11px] font-medium text-slate-500">
            {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.min(pageCount - 1, currentPage + 1))}
            disabled={currentPage === pageCount - 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            {nextLabel}
          </button>
        </nav>
      )}
    </div>
  );
}
