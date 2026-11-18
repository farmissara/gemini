export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Treat smartphones in both portrait (<768px width) and landscape (height < 560px on phone-width devices) as mobile
  return w < 768 || (h < 560 && w <= 1024);
}

export function isLandscapeViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight;
}

export async function enterLandscapeGameMode(
  targetElement?: HTMLElement | null
): Promise<{ ok: boolean; reason?: 'locked' | 'fullscreen_only' | 'unsupported' }> {
  if (typeof document === 'undefined') return { ok: false, reason: 'unsupported' };
  const target = targetElement || document.documentElement;
  let fullscreenOk = Boolean(document.fullscreenElement);

  if (!fullscreenOk && typeof target.requestFullscreen === 'function') {
    try {
      await target.requestFullscreen();
      fullscreenOk = true;
    } catch {
      fullscreenOk = false;
    }
  }

  try {
    const orientationApi = (
      screen as unknown as {
        orientation?: {
          lock?: (orientation: string) => Promise<void>;
        };
      }
    ).orientation;
    if (orientationApi && typeof orientationApi.lock === 'function') {
      await orientationApi.lock('landscape');
      return { ok: true, reason: 'locked' };
    }
  } catch {
    // iOS Safari & desktop browsers restrict programmatic orientation.lock; physical device rotation still works
  }

  return fullscreenOk
    ? { ok: true, reason: 'fullscreen_only' }
    : { ok: false, reason: 'unsupported' };
}

export async function exitLandscapeGameMode(): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    const orientationApi = (
      screen as unknown as {
        orientation?: {
          unlock?: () => void;
        };
      }
    ).orientation;
    if (orientationApi && typeof orientationApi.unlock === 'function') {
      orientationApi.unlock();
    }
  } catch {
    // ignore
  }

  if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
    try {
      await document.exitFullscreen();
    } catch {
      // ignore
    }
  }
}
