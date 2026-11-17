import React, { useState } from 'react';

export interface PaginatedTableRowsProps<T> {
  items: readonly T[];
  colSpan: number;
  renderRow: (item: T) => React.ReactNode;
  pageSize?: number;
}

export const PaginatedTableRows = <T,>({
  items,
  colSpan,
  renderRow,
  pageSize = 8,
}: PaginatedTableRowsProps<T>) => {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  return (
    <>
      {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(renderRow)}
      {pageCount > 1 && (
        <tr>
          <td colSpan={colSpan} className="p-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer"
              >
                ก่อนหน้า
              </button>
              <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer"
              >
                ถัดไป
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
