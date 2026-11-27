import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearSavedNavState,
  readSavedNavState,
  syncUrlNavParams,
  writeSavedNavState,
} from '../features/navigation/navPersistence';

function installMockBrowser(initialUrl = 'https://eduverse.local/') {
  const storage = new Map<string, string>();
  let currentUrl = new URL(initialUrl);

  const mockWindow = {
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value));
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
    get location() {
      return {
        get href() {
          return currentUrl.href;
        },
        get pathname() {
          return currentUrl.pathname;
        },
        get search() {
          return currentUrl.search;
        },
        get hash() {
          return currentUrl.hash;
        },
      };
    },
    history: {
      replaceState: (_data: unknown, _unused: string, nextUrl?: string | URL | null) => {
        if (typeof nextUrl === 'string') {
          currentUrl = new URL(nextUrl, currentUrl.origin);
        }
      },
    },
  };

  (globalThis as unknown as { window?: unknown }).window = mockWindow;
  return {
    getHref: () => currentUrl.href,
    cleanup: () => {
      delete (globalThis as unknown as { window?: unknown }).window;
    },
  };
}

test('persists and restores navigation state isolated by expectedUserId', () => {
  const env = installMockBrowser('https://eduverse.local/');
  try {
    writeSavedNavState({
      userId: 'teacher-1',
      currentTab: 'timetable',
      programMode: 'school_erp',
      mobileTab: 'timetable',
      mobileTimetableMode: 'calendar',
    });

    const restoredSameUser = readSavedNavState('teacher-1');
    assert.ok(restoredSameUser);
    assert.equal(restoredSameUser.currentTab, 'timetable');
    assert.equal(restoredSameUser.mobileTab, 'timetable');
    assert.equal(restoredSameUser.mobileTimetableMode, 'calendar');

    // Different user must not inherit previous user's saved tab
    assert.equal(readSavedNavState('teacher-2'), null);
  } finally {
    env.cleanup();
  }
});

test('syncUrlNavParams updates ?tab/?mode/?mtab while preserving check-in deep links', () => {
  const env = installMockBrowser('https://eduverse.local/');
  try {
    syncUrlNavParams({
      currentTab: 'gradebook',
      programMode: 'lms_classroom',
      mobileTab: 'gradebook',
      isMobileView: true,
    });
    const updated = new URL(env.getHref());
    assert.equal(updated.searchParams.get('tab'), 'gradebook');
    assert.equal(updated.searchParams.get('mode'), 'lms_classroom');
    assert.equal(updated.searchParams.get('mtab'), 'gradebook');

    // URL query overrides session storage when reloading on same path
    const restoredFromUrl = readSavedNavState();
    assert.equal(restoredFromUrl?.currentTab, 'gradebook');
    assert.equal(restoredFromUrl?.programMode, 'lms_classroom');
    assert.equal(restoredFromUrl?.mobileTab, 'gradebook');
  } finally {
    env.cleanup();
  }

  // Deep-link URL must remain untouched
  const deepLinkEnv = installMockBrowser('https://eduverse.local/?token=abc123&courseId=c-9');
  try {
    syncUrlNavParams({
      currentTab: 'timetable',
      programMode: 'school_erp',
      isMobileView: false,
    });
    assert.equal(deepLinkEnv.getHref(), 'https://eduverse.local/?token=abc123&courseId=c-9');
  } finally {
    deepLinkEnv.cleanup();
  }
});

test('clearSavedNavState clears sessionStorage and nav query parameters', () => {
  const env = installMockBrowser('https://eduverse.local/?tab=homework&mode=lms_classroom&mtab=homework');
  try {
    writeSavedNavState({
      userId: 'student-1',
      currentTab: 'homework',
      programMode: 'lms_classroom',
      mobileTab: 'homework',
    });

    clearSavedNavState();

    assert.equal(readSavedNavState('student-1'), null);
    assert.equal(env.getHref(), 'https://eduverse.local/');
  } finally {
    env.cleanup();
  }
});
