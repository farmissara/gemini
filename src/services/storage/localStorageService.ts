import type { CampusGateGeofence, PortfolioItem, TuitionInvoice } from '../../types';

export type PendingAvatarCache = {
  self?: string;
  students?: Record<string, string>;
  teachers?: Record<string, string>;
};

export const STORAGE_KEYS = {
  sidebarCollapsed: 'eduverse_sidebar_collapsed',
  focusMode: 'baanpakkru_focus_mode',
  adminSimplifiedView: 'baanpakkru_admin_simplified_view',
  guideTourEnabled: 'eduverse_guide_tour_enabled',
  firedScheduleAlertsPrefix: 'eduverse_fired_schedule_alerts_v1_',
  pendingAvatarsPrefix: 'eduverse_pending_avatars_v1_',
  schoolCustomSettingsPrefix: 'eduverse_school_custom_settings_',
  schoolGpsPrefix: 'eduverse_school_gps_',
  campusGatesPrefix: 'eduverse_campus_gates_',
  deletedStudentIdsPrefix: 'eduverse_deleted_student_ids_',
  deletedTeacherIdsPrefix: 'eduverse_deleted_teacher_ids_',
  deletedCourseIdsPrefix: 'eduverse_deleted_course_ids_',
  studentsCachePrefix: 'eduverse_students_',
  teachersCachePrefix: 'eduverse_teachers_',
  coursesCachePrefix: 'eduverse_courses_',
  gradesCachePrefix: 'eduverse_grades_',
  timetableSlotsCachePrefix: 'eduverse_timetable_slots_',
  invoiceSlipsPrefix: 'eduverse_invoice_slips_v1_',
  portfolioItemsPrefix: 'eduverse_portfolio_items_',
} as const;

export function safeGetStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage quota errors
  }
}

export function safeRemoveStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

export function safeReadJson<T>(key: string, fallback: T): T {
  const raw = safeGetStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeWriteJson(key: string, value: unknown): void {
  try {
    safeSetStorageItem(key, JSON.stringify(value));
  } catch {
    // ignore serialization / quota errors
  }
}

export function readPendingAvatarCache(schoolId: string, userId: string): PendingAvatarCache {
  if (!schoolId || !userId) return {};
  return safeReadJson<PendingAvatarCache>(
    `${STORAGE_KEYS.pendingAvatarsPrefix}${schoolId}_${userId}`,
    {},
  );
}

export function writePendingAvatarCache(
  schoolId: string,
  userId: string,
  updater: (prev: PendingAvatarCache) => PendingAvatarCache,
): void {
  if (!schoolId || !userId) return;
  const key = `${STORAGE_KEYS.pendingAvatarsPrefix}${schoolId}_${userId}`;
  const next = updater(readPendingAvatarCache(schoolId, userId));
  const hasEntries =
    Boolean(next.self) ||
    Object.keys(next.students || {}).length > 0 ||
    Object.keys(next.teachers || {}).length > 0;
  if (hasEntries) {
    safeWriteJson(key, next);
  } else {
    safeRemoveStorageItem(key);
  }
}

export function readDeletedIdsCache(
  kind: 'student' | 'teacher' | 'course',
  schoolId: string,
): string[] {
  if (!schoolId) return [];
  const prefix =
    kind === 'student'
      ? STORAGE_KEYS.deletedStudentIdsPrefix
      : kind === 'teacher'
        ? STORAGE_KEYS.deletedTeacherIdsPrefix
        : STORAGE_KEYS.deletedCourseIdsPrefix;
  const parsed = safeReadJson<unknown>(`${prefix}${schoolId}`, []);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
}

export function appendDeletedIdsCache(
  kind: 'student' | 'teacher' | 'course',
  schoolId: string,
  ids: string[],
): void {
  if (!schoolId || ids.length === 0) return;
  const prefix =
    kind === 'student'
      ? STORAGE_KEYS.deletedStudentIdsPrefix
      : kind === 'teacher'
        ? STORAGE_KEYS.deletedTeacherIdsPrefix
        : STORAGE_KEYS.deletedCourseIdsPrefix;
  const existing = readDeletedIdsCache(kind, schoolId);
  const merged = Array.from(new Set([...existing, ...ids]));
  safeWriteJson(`${prefix}${schoolId}`, merged);
}

export function readCampusGatesCache(schoolId: string): CampusGateGeofence[] {
  if (!schoolId) return [];
  const parsed = safeReadJson<unknown>(`${STORAGE_KEYS.campusGatesPrefix}${schoolId}`, []);
  return Array.isArray(parsed) ? (parsed as CampusGateGeofence[]) : [];
}

export function writeCampusGatesCache(schoolId: string, gates: CampusGateGeofence[]): void {
  if (!schoolId) return;
  const key = `${STORAGE_KEYS.campusGatesPrefix}${schoolId}`;
  if (gates.length > 0) {
    safeWriteJson(key, gates);
  } else {
    safeRemoveStorageItem(key);
  }
}

export function readInvoiceSlipsCache(schoolId: string): Record<string, Partial<TuitionInvoice>> {
  if (!schoolId) return {};
  const parsed = safeReadJson<unknown>(`${STORAGE_KEYS.invoiceSlipsPrefix}${schoolId}`, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, Partial<TuitionInvoice>>)
    : {};
}

export function updateInvoiceSlipCache(
  schoolId: string,
  invoiceId: string,
  patch: Partial<TuitionInvoice>,
): void {
  if (!schoolId || !invoiceId) return;
  const map = readInvoiceSlipsCache(schoolId);
  map[invoiceId] = { ...(map[invoiceId] || {}), ...patch };
  safeWriteJson(`${STORAGE_KEYS.invoiceSlipsPrefix}${schoolId}`, map);
}

export function removeInvoiceSlipsFromCache(schoolId: string, invoiceIds: Iterable<string>): void {
  if (!schoolId) return;
  const map = readInvoiceSlipsCache(schoolId);
  let changed = false;
  for (const invId of invoiceIds) {
    if (invId in map) {
      delete map[invId];
      changed = true;
    }
  }
  if (changed) {
    safeWriteJson(`${STORAGE_KEYS.invoiceSlipsPrefix}${schoolId}`, map);
  }
}

export function readPortfolioItemsCache(schoolId: string): PortfolioItem[] | null {
  if (!schoolId) return null;
  const parsed = safeReadJson<unknown>(`${STORAGE_KEYS.portfolioItemsPrefix}${schoolId}`, null);
  return Array.isArray(parsed) ? (parsed as PortfolioItem[]) : null;
}

export function writePortfolioItemsCache(schoolId: string, items: PortfolioItem[]): void {
  if (!schoolId) return;
  safeWriteJson(`${STORAGE_KEYS.portfolioItemsPrefix}${schoolId}`, items);
}
