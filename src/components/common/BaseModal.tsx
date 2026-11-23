import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  footer?: React.ReactNode;
  closeDisabled?: boolean;
  children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidthClass = 'max-w-2xl',
  footer,
  closeDisabled = false,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeDisabled]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-0 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className={`modal-enter w-full ${maxWidthClass} max-h-[92dvh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] shadow-2xl`}
      >
        <header className="px-4 sm:px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="ปิดหน้าต่าง"
            className="btn-icon-tool shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          {children}
        </div>

        {footer && (
          <footer className="px-4 sm:px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-end gap-2 shrink-0">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
};
