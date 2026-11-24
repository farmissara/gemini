import React, { lazy } from 'react';

const CHUNK_RELOAD_AT_KEY = 'baanpakkru_chunk_reload_at';
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error || '')).toLowerCase();
  if (!message) return false;
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('unable to preload css')
  );
}

export function triggerSingleChunkRecoveryReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const now = Date.now();
    const lastRaw = window.sessionStorage.getItem(CHUNK_RELOAD_AT_KEY);
    const lastAt = lastRaw ? Number(lastRaw) : 0;
    if (Number.isFinite(lastAt) && lastAt > 0 && now - lastAt < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_AT_KEY, String(now));
  } catch {
    // Ignore sessionStorage restrictions in private/embedded contexts
  }

  void hardReloadApp();
  return true;
}

export async function hardReloadApp(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update().catch(() => undefined);
      }
    }
  } catch {
    // Ignore SW update errors and proceed to reload
  }
  window.location.reload();
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (firstError) {
      if (!isChunkLoadError(firstError)) {
        throw firstError;
      }

      // Retry once with a short delay in case of transient network hiccup
      try {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return await factory();
      } catch (retryError) {
        if (isChunkLoadError(retryError) && triggerSingleChunkRecoveryReload()) {
          // Keep Suspense fallback mounted until the browser completes the reload
          return new Promise<{ default: T }>(() => undefined);
        }
        throw retryError;
      }
    }
  });
}

export function lazyNamedWithRetry<T extends Record<string, any>, K extends keyof T>(
  factory: () => Promise<T>,
  exportName: K,
): React.LazyExoticComponent<T[K]> {
  return lazyWithRetry(() => factory().then((mod) => ({ default: mod[exportName] })));
}
