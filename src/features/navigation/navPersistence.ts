import type { AppProgramMode } from '../../types';
import type { NavTab } from '../../components/layout/Sidebar';
import type { DashboardSubTab } from '../../views/DashboardView';
import type { StudentsViewSubTab } from '../../views/StudentsView';
import type { SystemSettingsTab } from '../../views/SystemSettingsView';
import type { SuperAdminSubTab } from './useTabNavigation';
import type { MobileTab } from '../mobile-shell/types';

export interface PersistedNavState {
  version: 1;
  userId?: string;
  currentTab: NavTab;
  programMode: AppProgramMode;
  dashboardInitialSubTab?: DashboardSubTab;
  systemSettingsInitialTab?: SystemSettingsTab;
  superAdminSubTab?: SuperAdminSubTab;
  studentsSubTab?: StudentsViewSubTab;
  mobileTab?: MobileTab;
  mobileTimetableMode?: 'day' | 'week' | 'grid' | 'calendar';
  isSuperAdminSchoolView?: boolean;
  schoolId?: string;
}

const NAV_STORAGE_KEY = 'eduverse:nav-state:v1';

const VALID_NAV_TABS = new Set<string>([
  'dashboard',
  'realtime_daily',
  'executive_monitor',
  'report_insights',
  'obec_executive_dashboard',
  'pp6_executive_dashboard',
  'executive_warning',
  'students',
  'teachers',
  'courses',
  'games',
  'study_streak',
  'boss_raid',
  'ai_diagnostic',
  'socratic_tutor',
  'realworld_quests',
  'subject_labs',
  'hall_of_fame',
  'career_quest',
  'central_exam_hub',
  'timetable',
  'homework',
  'attendance',
  'mobile_checkin',
  'student_id_cards',
  'behavior_sdq',
  'infirmary',
  'portfolio',
  'gradebook',
  'student_development_book',
  'qualitative_summary',
  'announcements',
  'school_gps',
  'school_permissions',
  'admin_student_accounts',
  'admin_saas_audit',
  'admin_superadmin_desk',
  'system_settings',
  'super_admin_console',
  'super_admin_approvals',
  'super_admin_schools',
  'super_admin_packages',
  'super_admin_promotions',
  'super_admin_permissions',
  'super_admin_central_exams',
  'super_admin_exam_payment',
  'super_admin_audit',
  'super_admin_backup',
]);

const VALID_PROGRAM_MODES = new Set<AppProgramMode>([
  'school_erp',
  'lms_classroom',
  'parent_portal',
]);

const VALID_MOBILE_TABS = new Set<string>([
  'home',
  'admin_quick',
  'super_schools',
  'executive',
  'checkin',
  'student_attendance',
  'leave',
  'gradebook',
  'timetable',
  'homework',
  'announcements',
  'games',
  'career_quest',
  'profile',
  'student_grades',
  'attendance_history',
  'portfolio',
  'lms',
  'behavior_sdq',
  'infirmary',
]);

export function readSavedNavState(expectedUserId?: string): PersistedNavState | null {
  if (typeof window === 'undefined') return null;

  let stored: PersistedNavState | null = null;
  try {
    const raw = window.sessionStorage.getItem(NAV_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedNavState>;
      if (parsed && parsed.version === 1) {
        if (!expectedUserId || !parsed.userId || parsed.userId === expectedUserId) {
          stored = {
            version: 1,
            userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
            currentTab:
              typeof parsed.currentTab === 'string' && VALID_NAV_TABS.has(parsed.currentTab)
                ? (parsed.currentTab as NavTab)
                : 'dashboard',
            programMode:
              typeof parsed.programMode === 'string' &&
              VALID_PROGRAM_MODES.has(parsed.programMode as AppProgramMode)
                ? (parsed.programMode as AppProgramMode)
                : 'school_erp',
            dashboardInitialSubTab: parsed.dashboardInitialSubTab,
            systemSettingsInitialTab: parsed.systemSettingsInitialTab,
            superAdminSubTab: parsed.superAdminSubTab,
            studentsSubTab: parsed.studentsSubTab,
            mobileTab:
              typeof parsed.mobileTab === 'string' && VALID_MOBILE_TABS.has(parsed.mobileTab)
                ? (parsed.mobileTab as MobileTab)
                : undefined,
            mobileTimetableMode:
              parsed.mobileTimetableMode === 'calendar' ||
              parsed.mobileTimetableMode === 'day' ||
              parsed.mobileTimetableMode === 'week' ||
              parsed.mobileTimetableMode === 'grid'
                ? parsed.mobileTimetableMode
                : undefined,
            isSuperAdminSchoolView: Boolean(parsed.isSuperAdminSchoolView),
            schoolId: typeof parsed.schoolId === 'string' ? parsed.schoolId : undefined,
          };
        }
      }
    }
  } catch {
    stored = null;
  }

  // URL search params act as explicit route override/fallback when not in a check-in deep-link
  try {
    const params = new URLSearchParams(window.location.search);
    const hasCheckinDeepLink =
      params.has('token') || params.has('courseId') || params.has('code');
    if (!hasCheckinDeepLink) {
      const urlTab = params.get('tab');
      const urlMode = params.get('mode');
      const urlMobileTab = params.get('mtab');
      const hasUrlTab = Boolean(urlTab && VALID_NAV_TABS.has(urlTab));
      const hasUrlMode = Boolean(urlMode && VALID_PROGRAM_MODES.has(urlMode as AppProgramMode));
      const hasUrlMtab = Boolean(urlMobileTab && VALID_MOBILE_TABS.has(urlMobileTab));
      if (hasUrlTab || hasUrlMode || hasUrlMtab) {
        return {
          ...(stored || {
            version: 1,
            currentTab: 'dashboard' as NavTab,
            programMode: 'school_erp' as AppProgramMode,
          }),
          ...(hasUrlTab ? { currentTab: urlTab as NavTab } : {}),
          ...(hasUrlMode ? { programMode: urlMode as AppProgramMode } : {}),
          ...(hasUrlMtab ? { mobileTab: urlMobileTab as MobileTab } : {}),
        };
      }
    }
  } catch {
    // Ignore malformed query strings
  }

  return stored;
}

export function writeSavedNavState(patch: Partial<PersistedNavState>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readSavedNavState() || {
      version: 1 as const,
      currentTab: 'dashboard' as NavTab,
      programMode: 'school_erp' as AppProgramMode,
    };
    const next: PersistedNavState = {
      ...existing,
      ...patch,
      version: 1,
    };
    window.sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore sessionStorage quota or privacy mode errors
  }
}

export function syncUrlNavParams(params: {
  currentTab?: NavTab;
  programMode?: AppProgramMode;
  mobileTab?: MobileTab;
  isMobileView?: boolean;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    // Preserve explicit check-in QR deep links untouched
    if (
      url.searchParams.has('token') ||
      url.searchParams.has('courseId') ||
      url.searchParams.has('code')
    ) {
      return;
    }

    if (params.currentTab) {
      url.searchParams.set('tab', params.currentTab);
    }
    if (params.programMode && params.programMode !== 'school_erp') {
      url.searchParams.set('mode', params.programMode);
    } else {
      url.searchParams.delete('mode');
    }
    if (params.isMobileView && params.mobileTab) {
      url.searchParams.set('mtab', params.mobileTab);
    } else if (!params.isMobileView) {
      url.searchParams.delete('mtab');
    }

    const nextRelativeUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextRelativeUrl !== currentRelativeUrl) {
      window.history.replaceState(null, '', nextRelativeUrl);
    }
  } catch {
    // Ignore history API restrictions in sandboxed frames
  }
}

export function clearSavedNavState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(NAV_STORAGE_KEY);
    const url = new URL(window.location.href);
    if (!url.searchParams.has('token') && !url.searchParams.has('courseId')) {
      url.searchParams.delete('tab');
      url.searchParams.delete('mode');
      url.searchParams.delete('mtab');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // Ignore cleanup errors
  }
}
