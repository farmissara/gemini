import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ToastProvider } from './components/common/ToastProvider';
import { triggerSingleChunkRecoveryReload } from './lib/lazyWithRetry';
import './index.css';

// Automatically register PWA Service Worker for offline support & installability
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // A previously installed production PWA worker can serve stale app code on
  // localhost and hide source edits. Keep the development app network-only.
  void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    if (!registrations.length) return;
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if (wasControlled) window.location.reload();
  }).catch(() => undefined);
} else if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let swUpdateReloadPending = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && swUpdateReloadPending) {
      swUpdateReloadPending = false;
      window.location.reload();
    }
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // A new version is ready: switch to it right away and reload once it takes control
      swUpdateReloadPending = true;
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Look for a newer deploy every 30 minutes and whenever the app comes back to the foreground
      const check = () => { void registration.update().catch(() => undefined); };
      window.setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onOfflineReady() {
      console.log('[PWA] BaanPakKru (บ้านพักครู) is ready for offline operation.');
    },
  });
}

// Recover gracefully if an outdated cached PWA chunk fails to preload after deploy
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    triggerSingleChunkRecoveryReload();
  });
}

const root = createRoot(document.getElementById('root')!);

if (import.meta.env.DEV && window.location.pathname === '/__ui-preview') {
  void import('./dev/UiPreview').then(({ UiPreview }) => {
    root.render(
      <StrictMode>
        <ToastProvider>
          <UiPreview />
        </ToastProvider>
      </StrictMode>,
    );
  });
} else {
  root.render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>,
  );
}
