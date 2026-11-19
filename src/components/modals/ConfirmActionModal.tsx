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
  if (!isOpen) return null;

  const confirmStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
    primary: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
  }[tone];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        aria-describedby="confirm-action-description"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <AlertTriangle aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 id="confirm-action-title" className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
              <p id="confirm-action-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={isBusy} aria-label="ปิด" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {detailNote && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">{detailNote}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={isBusy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={isBusy} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${confirmStyles}`}>
            {isBusy ? 'กำลังดำเนินการ…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export { ConfirmActionModal };
export default ConfirmActionModal;
