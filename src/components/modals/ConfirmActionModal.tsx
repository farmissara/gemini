import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  detailNote?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

function ConfirmActionModal({
  isOpen,
  title,
  description,
  detailNote,
  confirmLabel,
  cancelLabel = 'ยกเลิก',
  tone = 'danger',
  isBusy = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isBusy, onCancel]);

  if (!isOpen) return null;

  const confirmStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
    primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:ring-[var(--color-primary)]',
  }[tone];

  const iconTileStyles = {
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  }[tone];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        aria-describedby="confirm-action-description"
        className="modal-enter w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconTileStyles}`}>
              <AlertTriangle aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 id="confirm-action-title" className="text-base font-bold text-[var(--color-text-title)]">{title}</h2>
              <p id="confirm-action-description" className="mt-1.5 text-sm leading-6 text-[var(--color-text-body)]">{description}</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={isBusy} aria-label="ปิด" className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] disabled:opacity-50 cursor-pointer">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {detailNote && <p className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">{detailNote}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} disabled={isBusy} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-4 py-2 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card)] disabled:opacity-50 cursor-pointer">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={isBusy} className={`rounded-xl px-4 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 cursor-pointer ${confirmStyles}`}>
            {isBusy ? 'กำลังดำเนินการ…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export { ConfirmActionModal };
export default ConfirmActionModal;
