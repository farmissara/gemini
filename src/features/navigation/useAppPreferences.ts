import { useEffect, useState } from 'react';
import type { AppLanguage, AppTheme, ThemePalette } from '../../types';
import { isMobileViewport } from '../../lib/screenOrientation';
import {
  STORAGE_KEYS,
  safeGetStorageItem,
  safeSetStorageItem,
} from '../../services/storage/localStorageService';

export function useAppPreferences() {
  const [lang, setLang] = useState<AppLanguage>('th');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [themePalette, setThemePalette] = useState<ThemePalette>('light_warm');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCompactViewport, setIsSidebarCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1360,
  );
  const [isSidebarExpandedForCompactViewport, setIsSidebarExpandedForCompactViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    () => safeGetStorageItem(STORAGE_KEYS.sidebarCollapsed) === 'true',
  );

  useEffect(() => {
    safeSetStorageItem(STORAGE_KEYS.sidebarCollapsed, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const updateViewportSidebar = () => {
      const compact = window.innerWidth < 1360;
      setIsSidebarCompactViewport(compact);
      if (!compact) setIsSidebarExpandedForCompactViewport(false);
    };
    window.addEventListener('resize', updateViewportSidebar, { passive: true });
    return () => window.removeEventListener('resize', updateViewportSidebar);
  }, []);

  const sidebarIsCollapsed =
    isSidebarCollapsed || (isSidebarCompactViewport && !isSidebarExpandedForCompactViewport);

  const [focusMode, setFocusMode] = useState<boolean>(
    () => safeGetStorageItem(STORAGE_KEYS.focusMode) === '1',
  );

  useEffect(() => {
    if (focusMode) {
      setIsMobileMenuOpen(false);
    }
    safeSetStorageItem(STORAGE_KEYS.focusMode, focusMode ? '1' : '0');
  }, [focusMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFocusMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const [adminSimplifiedView, setAdminSimplifiedView] = useState<boolean>(
    () => safeGetStorageItem(STORAGE_KEYS.adminSimplifiedView) === '1',
  );

  useEffect(() => {
    safeSetStorageItem(STORAGE_KEYS.adminSimplifiedView, adminSimplifiedView ? '1' : '0');
  }, [adminSimplifiedView]);

  const [isGuideTourEnabled, setIsGuideTourEnabled] = useState<boolean>(
    () => safeGetStorageItem(STORAGE_KEYS.guideTourEnabled) !== '0',
  );

  const handleToggleGuideTour = (next?: boolean) => {
    setIsGuideTourEnabled((prev) => {
      const resolved = typeof next === 'boolean' ? next : !prev;
      safeSetStorageItem(STORAGE_KEYS.guideTourEnabled, resolved ? '1' : '0');
      return resolved;
    });
  };

  const [isMascotHidden, setIsMascotHidden] = useState<boolean>(
    () => safeGetStorageItem(STORAGE_KEYS.mascotHidden) === '1',
  );

  const handleToggleMascotHidden = (next?: boolean) => {
    setIsMascotHidden((prev) => {
      const resolved = typeof next === 'boolean' ? next : !prev;
      safeSetStorageItem(STORAGE_KEYS.mascotHidden, resolved ? '1' : '0');
      return resolved;
    });
  };

  // Screen size detection and user view preference ('auto' | 'mobile' | 'desktop')
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => isMobileViewport());
  const [isPortraitScreen, setIsPortraitScreen] = useState<boolean>(() => (
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  ));
  const [deviceViewPreference, setDeviceViewPreference] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(isMobileViewport());
      setIsPortraitScreen(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const shouldShowMobileView =
    deviceViewPreference === 'mobile' || (deviceViewPreference === 'auto' && isMobileScreen);
  const isMobileInDesktopView = isMobileScreen && deviceViewPreference === 'desktop';

  // Sync Tailwind .dark class and custom CSS theme variables with active themePalette
  useEffect(() => {
    const isDarkTheme = themePalette?.includes('dark') || themePalette === 'sapphire';
    const rootEl = document.documentElement;
    rootEl.classList.toggle('dark', isDarkTheme);
    rootEl.classList.remove('theme-light_warm', 'theme-light_sky', 'theme-sapphire', 'theme-light', 'theme-dark');
    if (themePalette) {
      rootEl.classList.add(`theme-${themePalette}`);
    }
    setTheme(isDarkTheme ? 'dark' : 'light');
  }, [themePalette]);

  return {
    lang,
    setLang,
    theme,
    setTheme,
    themePalette,
    setThemePalette,
    searchQuery,
    setSearchQuery,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSidebarCompactViewport,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setIsSidebarExpandedForCompactViewport,
    sidebarIsCollapsed,
    focusMode,
    setFocusMode,
    adminSimplifiedView,
    setAdminSimplifiedView,
    isGuideTourEnabled,
    handleToggleGuideTour,
    isMascotHidden,
    handleToggleMascotHidden,
    isMobileScreen,
    isPortraitScreen,
    deviceViewPreference,
    setDeviceViewPreference,
    shouldShowMobileView,
    isMobileInDesktopView,
  };
}
