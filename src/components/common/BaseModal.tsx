import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  hideHeader?: boolean;
  maxWidthClass?: string;
  heightClass?: string;
  zIndexClass?: string;
  role?: 'dialog' | 'alertdialog';
  showMobileHandle?: boolean;
  bodyClassName?: string;
  surfaceClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  fullscreen?: boolean;
  footer?: React.ReactNode;
  closeDisabled?: boolean;
  children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title = '',
  subtitle,
  icon,
  headerActions,
  hideHeader = false,
  maxWidthClass = 'max-w-2xl',
  heightClass = 'max-h-[92dvh]',
  zIndexClass = 'z-[95]',
  role = 'dialog',
  showMobileHandle = false,
  bodyClassName = 'flex-1 min-h-0 overflow-y-auto p-4 sm:p-5',
  surfaceClassName = '',
  headerClassName = '',
  footerClassName = '',
  fullscreen = false,
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
      className={`fixed inset-0 ${zIndexClass} flex ${fullscreen ? 'items-stretch p-0' : 'items-end sm:items-center p-0 sm:p-4'} justify-center bg-slate-950/60 backdrop-blur-[2px]`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose();
      }}
    >
      <section
        role={role}
        aria-modal="true"
        aria-label={typeof title === 'string' && title ? title : undefined}
        className={`modal-enter w-full ${fullscreen ? 'max-w-none h-dvh max-h-dvh rounded-none border-0' : `${maxWidthClass} ${heightClass} rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)]`} flex flex-col overflow-hidden bg-[var(--color-card)] text-[var(--color-text-body)] shadow-2xl ${surfaceClassName}`}
      >
        {showMobileHandle && (
          <div className="no-print pt-2 pb-0.5 flex justify-center sm:hidden shrink-0">
            <span className="w-10 h-1 rounded-full bg-[var(--color-border)]" aria-hidden="true" />
          </div>
        )}

        {!hideHeader && (
          <header className={`no-print px-4 sm:px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3 shrink-0 ${headerClassName}`}>
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
                  <div className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                disabled={closeDisabled}
                aria-label="ปิดหน้าต่าง"
                className="btn-icon-tool shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>
        )}

        <div className={bodyClassName}>
          {children}
        </div>

        {footer && (
          <footer className={`no-print px-4 sm:px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-end gap-2 shrink-0 ${footerClassName}`}>
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
};
