import React, { useState } from 'react';

export interface PaginatedTableRowsProps<T> {
  items: readonly T[];
  colSpan: number;
  renderRow: (item: T, index: number, hiddenClass: string) => React.ReactNode;
  pageSize?: number;
  emptyState?: React.ReactNode;
  keepAllInDomForPrint?: boolean;
}

export const PaginatedTableRows = <T,>({
  items,
  colSpan,
  renderRow,
  pageSize = 8,
  emptyState,
  keepAllInDomForPrint = false,
}: PaginatedTableRowsProps<T>) => {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;

  if (items.length === 0) {
    if (!emptyState) return null;
    return (
      <tr>
        <td colSpan={colSpan} className="p-4">
          {emptyState}
        </td>
      </tr>
    );
  }

  return (
    <>
      {keepAllInDomForPrint
        ? items.map((item, idx) => {
            const isVisibleOnScreen = idx >= startIndex && idx < endIndex;
            return renderRow(item, idx, isVisibleOnScreen ? '' : 'hidden print:table-row');
          })
        : items.slice(startIndex, endIndex).map((item, localIdx) => renderRow(item, startIndex + localIdx, ''))}
      {pageCount > 1 && (
        <tr className="print:hidden">
          <td colSpan={colSpan} className="p-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                ก่อนหน้า
              </button>
              <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                {currentPage + 1} / {pageCount} · {items.length} รายการ
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer whitespace-nowrap"
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
