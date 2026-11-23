import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastInput {
  id?: string;
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItem extends Required<Pick<ToastInput, 'id' | 'message' | 'tone' | 'durationMs'>> {
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const APP_TOAST_EVENT = 'baanpakkru:toast';

export function emitAppToast(input: ToastInput) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastInput>(APP_TOAST_EVENT, { detail: input }));
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return {
    showToast: (input) => {
      emitAppToast(input);
      return input.id || 'toast-fallback';
    },
    dismissToast: () => undefined,
    success: (message, title) => {
      emitAppToast({ message, title, tone: 'success' });
      return 'toast-fallback';
    },
    error: (message, title) => {
      emitAppToast({ message, title, tone: 'error' });
      return 'toast-fallback';
    },
    warning: (message, title) => {
      emitAppToast({ message, title, tone: 'warning' });
      return 'toast-fallback';
    },
    info: (message, title) => {
      emitAppToast({ message, title, tone: 'info' });
      return 'toast-fallback';
    },
  };
}

const TONE_META: Record<
  ToastTone,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    borderClass: string;
    barClass: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-800/80',
    barClass: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-rose-600 dark:text-rose-400',
    borderClass: 'border-rose-200 dark:border-rose-800/80',
    barClass: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800/80',
    barClass: 'bg-amber-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-800/80',
    barClass: 'bg-blue-500',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, durationMs: number) => {
      const prevTimer = timersRef.current.get(id);
      if (prevTimer) window.clearTimeout(prevTimer);
      if (durationMs <= 0) return;
      const timer = window.setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, durationMs);
      timersRef.current.set(id, timer);
    },
    [],
  );

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = input.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const tone: ToastTone = input.tone || 'info';
      const durationMs = input.durationMs ?? (tone === 'error' ? 6000 : 4200);
      const nextItem: ToastItem = {
        id,
        title: input.title,
        message: input.message,
        tone,
        durationMs,
        actionLabel: input.actionLabel,
        onAction: input.onAction,
      };
      setToasts((prev) => {
        const deduped = prev.filter((item) => item.id !== id && item.message !== input.message);
        return [...deduped.slice(-3), nextItem];
      });
      scheduleDismiss(id, durationMs);
      return id;
    },
    [scheduleDismiss],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastInput>).detail;
      if (detail?.message) showToast(detail);
    };
    window.addEventListener(APP_TOAST_EVENT, handler);
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, handler);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [showToast]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      success: (message, title) => showToast({ message, title, tone: 'success' }),
      error: (message, title) => showToast({ message, title, tone: 'error' }),
      warning: (message, title) => showToast({ message, title, tone: 'warning' }),
      info: (message, title) => showToast({ message, title, tone: 'info' }),
    }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="no-print pointer-events-none fixed bottom-16 md:bottom-5 right-3 sm:right-5 z-[120] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2"
      >
        {toasts.map((item) => {
          const meta = TONE_META[item.tone];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              role="status"
              onMouseEnter={() => {
                const timer = timersRef.current.get(item.id);
                if (timer) {
                  window.clearTimeout(timer);
                  timersRef.current.delete(item.id);
                }
              }}
              onMouseLeave={() => scheduleDismiss(item.id, item.durationMs)}
              className={`toast-enter pointer-events-auto relative overflow-hidden rounded-xl border ${meta.borderClass} bg-[var(--color-card)] px-3.5 py-3 shadow-lg`}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${meta.barClass}`} aria-hidden="true" />
              <div className="flex items-start gap-2.5 pl-1">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  {item.title && (
                    <div className="text-xs font-bold text-[var(--color-text-title)] leading-snug">
                      {item.title}
                    </div>
                  )}
                  <div className="text-xs text-[var(--color-text-body)] leading-relaxed break-words">
                    {item.message}
                  </div>
                  {item.actionLabel && item.onAction && (
                    <button
                      type="button"
                      onClick={() => {
                        item.onAction?.();
                        dismissToast(item.id);
                      }}
                      className="mt-1.5 inline-flex items-center text-[11px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                    >
                      {item.actionLabel}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  aria-label="ปิดการแจ้งเตือน"
                  className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
