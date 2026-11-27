import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';

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
    <BaseModal
      isOpen={isOpen}
      onClose={() => {
        if (!isBusy) onCancel();
      }}
      closeDisabled={isBusy}
      role="alertdialog"
      zIndexClass="z-[110]"
      maxWidthClass="max-w-md"
      title={title}
      icon={
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconTileStyles}`}>
          <AlertTriangle aria-hidden="true" size={18} />
        </span>
      }
      bodyClassName="p-5 space-y-3"
      footer={
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 cursor-pointer ${confirmStyles}`}
          >
            {isBusy ? 'กำลังดำเนินการ…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-[var(--color-text-body)]">{description}</p>
      {detailNote && (
        <p className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {detailNote}
        </p>
      )}
    </BaseModal>
  );
}

export { ConfirmActionModal };
export default ConfirmActionModal;

