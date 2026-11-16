import { useEffect, useRef } from 'react';
import type { NavTab } from '../components/layout/Sidebar';

export const QUICK_ACTION_EVENT = 'baanpakkru:quick-action';
export const OPEN_GLOBAL_SEARCH_EVENT = 'baanpakkru:open-search';

export interface QuickActionPayload {
  tab: NavTab;
  action: string;
}

/**
 * Emit a contextual quick-action event targeted at a specific tab view.
 * Slightly defers if the view is mounting after navigation.
 */
export function emitQuickAction(tab: NavTab, action: string, delayMs = 0): void {
  if (typeof window === 'undefined') return;
  const dispatch = () => {
    window.dispatchEvent(
      new CustomEvent<QuickActionPayload>(QUICK_ACTION_EVENT, {
        detail: { tab, action },
      })
    );
  };
  if (delayMs > 0) {
    window.setTimeout(dispatch, delayMs);
  } else {
    dispatch();
  }
}

export function emitOpenGlobalSearch(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_GLOBAL_SEARCH_EVENT));
}

export function useQuickActionListener(
  tab: NavTab,
  handler: (action: string) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onEvent = (event: Event) => {
      const custom = event as CustomEvent<QuickActionPayload>;
      if (!custom.detail || custom.detail.tab !== tab) return;
      handlerRef.current(custom.detail.action);
    };
    window.addEventListener(QUICK_ACTION_EVENT, onEvent);
    return () => window.removeEventListener(QUICK_ACTION_EVENT, onEvent);
  }, [tab]);
}
