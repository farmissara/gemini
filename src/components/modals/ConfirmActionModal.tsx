import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  detailNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  tone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  title,
  description,
  detailNote,
  confirmLabel = 'ยืนยันการลบ / ยกเลิก',
  cancelLabel = 'ปิด',
  isBusy = false,
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBusy, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                tone === 'danger'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-[var(--color-primary-light)] border-[var(--color-border)] text-[var(--color-primary-text)]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="confirm-action-title" className="text-sm font-bold text-[var(--color-text-title)]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer disabled:opacity-40"
            aria-label="ปิดหน้าต่างยืนยัน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 text-xs">
          <p className="text-[var(--color-text-body)] leading-relaxed font-medium">
            {description}
          </p>
          {detailNote && (
            <div className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              {detailNote}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3.5 bg-[var(--color-card-subtle)] border-t border-[var(--color-border)]">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] cursor-pointer disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onConfirm()}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white cursor-pointer disabled:opacity-50 transition ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
            }`}
          >
            {isBusy ? 'กำลังดำเนินการ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
