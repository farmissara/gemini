import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface TableActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  dividerBefore?: boolean;
}

interface TableActionMenuProps {
  items: TableActionItem[];
  triggerLabel?: string;
  ariaLabel?: string;
  align?: 'right' | 'left';
}

export const TableActionMenu: React.FC<TableActionMenuProps> = ({
  items,
  triggerLabel,
  ariaLabel = 'จัดการรายการ',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = items.filter(Boolean);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 220;
    const estimatedHeight = Math.min(320, visibleItems.length * 38 + 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    const rawLeft = align === 'right' ? rect.right - menuWidth : rect.left;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - menuWidth - 8));
    const top = openUp ? Math.max(8, rect.top - 6) : Math.min(window.innerHeight - 16, rect.bottom + 6);
    setCoords({ top, left, openUp });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const handleViewportChange = () => setIsOpen(false);

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [isOpen]);

  if (visibleItems.length === 0) return null;

  const variantClasses: Record<NonNullable<TableActionItem['variant']>, string> = {
    default: 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]',
    primary: 'text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] font-semibold',
    success: 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-semibold',
    warning: 'text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 font-semibold',
    danger: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-semibold',
  };

  return (
    <div className="inline-flex items-center justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1 rounded-lg border transition cursor-pointer whitespace-nowrap ${
          triggerLabel ? 'px-2.5 py-1 text-xs font-semibold' : 'p-1.5'
        } ${
          isOpen
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
            : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-text)]'
        }`}
      >
        {triggerLabel && <span>{triggerLabel}</span>}
        <MoreVertical className="w-3.5 h-3.5 shrink-0" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: 220,
              transform: coords.openUp ? 'translateY(-100%)' : 'none',
            }}
            className="z-[90] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-xl space-y-0.5 max-h-[320px] overflow-y-auto"
          >
            {visibleItems.map((item) => (
              <React.Fragment key={item.id}>
                {item.dividerBefore && (
                  <div className="my-1 border-t border-[var(--color-border)]" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    variantClasses[item.variant || 'default']
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
