// Web Push Notification & In-App Alert System for EduVerse
// Supports Android (Chrome), iOS 16.4+ (Safari Web Push), Desktop browsers,
// and strict per-user / per-school / role-scoped notification filtering.

import { Announcement, AppLanguage, AuthUser, UserRole } from '../types';
import { getBangkokDateInputValue } from './timetableCalendar';
import { getHolidayForDate, getUpcomingHolidays } from './thaiHolidays';

export interface EduVerseNotification {
  id: string;
  title: string;
  body: string;
  category: 'attendance' | 'homework' | 'announcement' | 'system';
  timestamp: string;
  icon?: string;
  url?: string;
  read: boolean;
  priority?: 'normal' | 'urgent';
  schoolId?: string;
  targetUserIds?: string[];
  targetStudentIds?: string[];
  targetRoles?: UserRole[];
  isBroadcast?: boolean;
  sourceKind?: 'push' | 'announcement' | 'holiday';
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  retentionDays: 3 | 7 | 14 | 30;
  categories: {
    attendance: boolean;
    homework: boolean;
    announcement: boolean;
  };
}

const STORAGE_KEY_NOTIFICATIONS = 'eduverse_notifications_history';
const STORAGE_KEY_SETTINGS = 'eduverse_notification_settings';
const STORAGE_KEY_USER_READ_PREFIX = 'eduverse_notif_read_ids_';
const STORAGE_KEY_USER_DISMISSED_PREFIX = 'eduverse_notif_dismissed_ids_';
const STORAGE_KEY_USER_CLEARED_AT_PREFIX = 'eduverse_notif_cleared_at_';
const MAX_STORED_NOTIFICATIONS = 80;
const MAX_USER_STATE_IDS = 1000;
export const DEFAULT_NOTIFICATION_RETENTION_DAYS: 3 | 7 | 14 | 30 = 7;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  sound: true,
  vibrate: true,
  retentionDays: DEFAULT_NOTIFICATION_RETENTION_DAYS,
  categories: {
    attendance: true,
    homework: true,
    announcement: true,
  },
};

function normalizeRetentionDays(value: unknown): 3 | 7 | 14 | 30 {
  if (value === 3 || value === 7 || value === 14 || value === 30) return value;
  return DEFAULT_NOTIFICATION_RETENTION_DAYS;
}

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!saved) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...parsed,
      retentionDays: normalizeRetentionDays(parsed?.retentionDays),
      categories: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories,
        ...(parsed?.categories || {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    // Immediately prune notifications if retention window was shortened
    const current = getStoredNotifications(settings.retentionDays);
    saveStoredNotifications(current, settings.retentionDays);
  } catch (err) {
    console.warn('Failed to save notification settings:', err);
  }
}

export function pruneNotificationsByAge(
  list: EduVerseNotification[],
  retentionDays: number = getNotificationSettings().retentionDays
): EduVerseNotification[] {
  const days = normalizeRetentionDays(retentionDays);
  const cutoffMs = Date.now() - days * 86_400_000;
  return list
    .filter((item) => {
      const ts = new Date(item.timestamp).getTime();
      return Number.isNaN(ts) || ts >= cutoffMs;
    })
    .slice(0, MAX_STORED_NOTIFICATIONS);
}

export function getStoredNotifications(retentionDaysOverride?: number): EduVerseNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const pruned = pruneNotificationsByAge(parsed, retentionDaysOverride);
    if (pruned.length !== parsed.length) {
      try {
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(pruned));
      } catch {
        // ignore quota errors
      }
    }
    return pruned;
  } catch {
    return [];
  }
}

export function saveStoredNotifications(
  list: EduVerseNotification[],
  retentionDaysOverride?: number
): void {
  if (typeof window === 'undefined') return;
  try {
    const pruned = pruneNotificationsByAge(list, retentionDaysOverride);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(pruned));
  } catch (err) {
    console.warn('Failed to save notifications history:', err);
  }
}

function resolveScopedSchoolId(
  currentUser: AuthUser | null | undefined,
  schoolId?: string
): string | undefined {
  const normalized = (schoolId || currentUser?.schoolId || '').trim();
  return normalized || undefined;
}

function getUserStateKey(prefix: string, userId: string, schoolId?: string): string {
  return `${prefix}${userId || 'anon'}_${schoolId || 'all'}`;
}

function getUserIdSet(prefix: string, userId: string, schoolId?: string): Set<string> {
  if (typeof window === 'undefined' || !userId) return new Set();
  try {
    const raw = localStorage.getItem(getUserStateKey(prefix, userId, schoolId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveUserIdSet(prefix: string, userId: string, schoolId: string | undefined, ids: Set<string>): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(
      getUserStateKey(prefix, userId, schoolId),
      JSON.stringify(Array.from(ids).slice(-MAX_USER_STATE_IDS))
    );
  } catch {
    // ignore quota errors
  }
}

function getUserClearedAt(userId: string, schoolId?: string): number {
  if (typeof window === 'undefined' || !userId) return 0;
  try {
    const raw = localStorage.getItem(getUserStateKey(STORAGE_KEY_USER_CLEARED_AT_PREFIX, userId, schoolId));
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function setUserClearedAt(userId: string, schoolId: string | undefined, timestampMs: number): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(
      getUserStateKey(STORAGE_KEY_USER_CLEARED_AT_PREFIX, userId, schoolId),
      String(timestampMs)
    );
  } catch {
    // ignore quota errors
  }
}

function emitNotificationStateChanged(detail?: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eduverse:notification', { detail }));
  }
}

function parseAnnouncementTimestampMs(publishedAt?: string): number | null {
  if (!publishedAt) return null;
  const trimmed = publishedAt.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}(?::\d{2})?))?/);
  if (match) {
    const isoCandidate = match[2] ? `${match[1]}T${match[2]}` : `${match[1]}T00:00:00`;
    const parsed = new Date(isoCandidate).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  const direct = new Date(trimmed).getTime();
  return Number.isNaN(direct) ? null : direct;
}

function isDismissedItem(item: EduVerseNotification, dismissedSet: Set<string>, clearedAt: number): boolean {
  if (dismissedSet.has(item.id)) return true;
  const dedupeTag = item.metadata?.dedupeTag;
  if (typeof dedupeTag === 'string' && dedupeTag && dismissedSet.has(dedupeTag)) return true;
  if (clearedAt > 0 && item.sourceKind !== 'holiday' && item.sourceKind !== 'announcement') {
    const itemMs = new Date(item.timestamp).getTime();
    if (!Number.isNaN(itemMs) && itemMs <= clearedAt) {
      return true;
    }
  }
  return false;
}

function isAnnouncementAudienceMatch(
  targetAudience: Announcement['targetAudience'],
  role?: UserRole
): boolean {
  if (!role || role === 'admin' || role === 'super_admin') return true;
  if (targetAudience === 'all') return true;
  if (role === 'teacher') return targetAudience === 'teachers';
  if (role === 'student') return targetAudience === 'students';
  if (role === 'parent') return targetAudience === 'parents';
  return false;
}

export function isNotificationVisibleForUser(
  notif: EduVerseNotification,
  currentUser: AuthUser | null | undefined,
  activeSchoolId?: string,
  ownStudentIds: string[] = []
): boolean {
  if (!currentUser) return false;

  const notifSchoolId = notif.schoolId || notif.metadata?.schoolId;
  if (notifSchoolId && activeSchoolId && notifSchoolId !== activeSchoolId) {
    return false;
  }

  const targetUserIds: string[] =
    notif.targetUserIds || (Array.isArray(notif.metadata?.targetUserIds) ? notif.metadata.targetUserIds : []);
  const targetStudentIds: string[] =
    notif.targetStudentIds ||
    (Array.isArray(notif.metadata?.targetStudentIds)
      ? notif.metadata.targetStudentIds
      : notif.metadata?.studentId
        ? [String(notif.metadata.studentId)]
        : []);
  const targetRoles: UserRole[] =
    notif.targetRoles || (Array.isArray(notif.metadata?.targetRoles) ? notif.metadata.targetRoles : []);
  const isBroadcast = Boolean(notif.isBroadcast || notif.metadata?.isBroadcast);

  const personalIds = new Set<string>([
    currentUser.id,
    ...(currentUser.studentRecordId ? [currentUser.studentRecordId] : []),
    ...(currentUser.studentIdNumber ? [currentUser.studentIdNumber] : []),
    ...ownStudentIds.filter(Boolean),
  ]);

  const role = currentUser.role;

  // Student & Parent strict isolation
  if (role === 'student' || role === 'parent') {
    const hasExplicitScope =
      targetUserIds.length > 0 || targetStudentIds.length > 0 || targetRoles.length > 0 || isBroadcast;

    // Never leak legacy/unscoped notifications into student/parent views
    if (!hasExplicitScope) return false;

    if (targetStudentIds.length > 0) {
      const matchesOwnStudent = targetStudentIds.some((id) => personalIds.has(id));
      if (!matchesOwnStudent) return false;
    }

    if (targetUserIds.length > 0) {
      const matchesOwnUser = targetUserIds.includes(currentUser.id);
      if (!matchesOwnUser && targetStudentIds.length === 0) return false;
    }

    if (targetRoles.length > 0 && !targetRoles.includes(role)) {
      return false;
    }

    return true;
  }

  // Teacher & Admin isolation
  if (targetUserIds.length > 0 && !isBroadcast) {
    if (targetUserIds.includes(currentUser.id)) return true;
    // If explicitly targeted at specific roles too (e.g. teacher/admin report), check role
    if (targetRoles.length > 0 && targetRoles.includes(role)) return true;
    return false;
  }

  if (targetRoles.length > 0 && !targetRoles.includes(role)) {
    return false;
  }

  return true;
}

export interface ScopedNotificationsParams {
  currentUser: AuthUser | null | undefined;
  schoolId?: string;
  ownStudentIds?: string[];
  announcements?: Announcement[];
  lang?: AppLanguage;
}

export function getScopedNotificationsForUser({
  currentUser,
  schoolId,
  ownStudentIds = [],
  announcements = [],
  lang = 'th',
}: ScopedNotificationsParams): EduVerseNotification[] {
  if (!currentUser) return [];

  const effectiveSchoolId = resolveScopedSchoolId(currentUser, schoolId);
  const readSet = getUserIdSet(STORAGE_KEY_USER_READ_PREFIX, currentUser.id, effectiveSchoolId);
  const dismissedSet = getUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, effectiveSchoolId);
  const clearedAt = getUserClearedAt(currentUser.id, effectiveSchoolId);

  const rawStored = getStoredNotifications();
  const visibleStored = rawStored
    .filter((item) => !isDismissedItem(item, dismissedSet, clearedAt))
    .filter((item) => isNotificationVisibleForUser(item, currentUser, effectiveSchoolId, ownStudentIds))
    .map((item) => ({
      ...item,
      sourceKind: item.sourceKind || ('push' as const),
      read: item.read || readSet.has(item.id),
    }));

  // Merge school announcements relevant to user's role within retention window
  const retentionDays = getNotificationSettings().retentionDays;
  const announcementCutoffMs = Date.now() - retentionDays * 86_400_000;
  const pinnedCutoffMs = Date.now() - Math.max(retentionDays, 14) * 86_400_000;
  const announcementItems: EduVerseNotification[] = announcements
    .filter((ann) => (!ann.schoolId || !effectiveSchoolId || ann.schoolId === effectiveSchoolId))
    .filter((ann) => isAnnouncementAudienceMatch(ann.targetAudience, currentUser.role))
    .filter((ann) => {
      const publishedMs = parseAnnouncementTimestampMs(ann.publishedAt);
      if (publishedMs === null) return true;
      return publishedMs >= (ann.pinned ? pinnedCutoffMs : announcementCutoffMs);
    })
    .map((ann) => {
      const id = `ann-notif-${ann.id}`;
      const parsedMs = parseAnnouncementTimestampMs(ann.publishedAt);
      return {
        id,
        title: `${ann.pinned ? '📌 ' : '📢 '}${ann.title}`,
        body: ann.content,
        category: 'announcement' as const,
        timestamp: parsedMs !== null ? new Date(parsedMs).toISOString() : new Date(0).toISOString(),
        read: readSet.has(id),
        priority: ann.category === 'urgent' ? ('urgent' as const) : ('normal' as const),
        schoolId: ann.schoolId || effectiveSchoolId,
        isBroadcast: true,
        sourceKind: 'announcement' as const,
        metadata: {
          announcementId: ann.id,
          author: ann.author,
          targetAudience: ann.targetAudience,
        },
      };
    })
    .filter((item) => !dismissedSet.has(item.id));

  // Merge official Thai public holidays & school holidays (today + next 7 days)
  const todayStr = getBangkokDateInputValue();
  const todayHoliday = getHolidayForDate(todayStr, effectiveSchoolId);
  const upcomingHolidays = getUpcomingHolidays(todayStr, 7, effectiveSchoolId).filter((h) => h.date !== todayStr);
  const holidayList = [
    ...(todayHoliday ? [{ holiday: todayHoliday, isToday: true }] : []),
    ...upcomingHolidays.map((h) => ({ holiday: h, isToday: false })),
  ];

  const holidayItems: EduVerseNotification[] = holidayList
    .map(({ holiday, isToday }) => {
      const id = `hol-notif-${holiday.date}-${holiday.id}`;
      const typeLabel =
        holiday.type === 'school'
          ? lang === 'th'
            ? 'วันหยุดพิเศษโรงเรียน'
            : 'School Holiday'
          : lang === 'th'
            ? 'วันหยุดราชการ'
            : 'Public Holiday';
      return {
        id,
        title: isToday
          ? lang === 'th'
            ? `📅 วันนี้เป็น${typeLabel}: ${holiday.nameTh}`
            : `📅 Today is ${holiday.nameEn}`
          : lang === 'th'
            ? `🗓️ กำลังจะถึง${typeLabel}: ${holiday.nameTh} (${holiday.date})`
            : `🗓️ Upcoming Holiday: ${holiday.nameEn} (${holiday.date})`,
        body:
          holiday.isSchoolDayOff
            ? lang === 'th'
              ? `${holiday.nameTh} (${holiday.nameEn}) • งดการเรียนการสอนและการแจ้งเตือนเช็คชื่อรายคาบ`
              : `${holiday.nameEn} • No regular classes or period attendance today.`
            : `${holiday.nameTh} (${holiday.nameEn})`,
        category: 'announcement' as const,
        timestamp: `${holiday.date}T06:00:00+07:00`,
        read: readSet.has(id),
        priority: isToday ? ('urgent' as const) : ('normal' as const),
        schoolId: effectiveSchoolId,
        isBroadcast: true,
        sourceKind: 'holiday' as const,
        metadata: {
          holidayDate: holiday.date,
          holidayType: holiday.type,
        },
      };
    })
    .filter((item) => !dismissedSet.has(item.id));

  const deduped = new Map<string, EduVerseNotification>();
  [...holidayItems, ...visibleStored, ...announcementItems].forEach((item) => {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item);
    }
  });

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getScopedUnreadCountForUser(params: ScopedNotificationsParams): number {
  return getScopedNotificationsForUser(params).filter((item) => !item.read).length;
}

export function markScopedNotificationsReadForUser(params: ScopedNotificationsParams): EduVerseNotification[] {
  const { currentUser, schoolId } = params;
  if (!currentUser) return [];

  const effectiveSchoolId = resolveScopedSchoolId(currentUser, schoolId);
  const visible = getScopedNotificationsForUser({ ...params, schoolId: effectiveSchoolId });
  const visibleIds = new Set(visible.map((v) => v.id));

  const readSet = getUserIdSet(STORAGE_KEY_USER_READ_PREFIX, currentUser.id, effectiveSchoolId);
  visibleIds.forEach((id) => readSet.add(id));
  saveUserIdSet(STORAGE_KEY_USER_READ_PREFIX, currentUser.id, effectiveSchoolId, readSet);

  // Only mutate personal-targeted items in global storage (never mark shared items read for others)
  const stored = getStoredNotifications();
  const updatedStored = stored.map((item) => {
    if (!visibleIds.has(item.id)) return item;
    const isShared = Boolean(item.isBroadcast || (item.targetRoles && item.targetRoles.length > 1));
    return isShared ? item : { ...item, read: true };
  });
  saveStoredNotifications(updatedStored);
  emitNotificationStateChanged({ action: 'mark_read', userId: currentUser.id, schoolId: effectiveSchoolId });

  return visible.map((item) => ({ ...item, read: true }));
}

export function clearScopedNotificationsForUser(params: ScopedNotificationsParams): void {
  const { currentUser, schoolId } = params;
  if (!currentUser) return;

  const effectiveSchoolId = resolveScopedSchoolId(currentUser, schoolId);
  const visible = getScopedNotificationsForUser({ ...params, schoolId: effectiveSchoolId });
  const dismissedSet = getUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, effectiveSchoolId);
  visible.forEach((item) => {
    dismissedSet.add(item.id);
    if (typeof item.metadata?.dedupeTag === 'string' && item.metadata.dedupeTag) {
      dismissedSet.add(item.metadata.dedupeTag);
    }
  });
  saveUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, effectiveSchoolId, dismissedSet);
  setUserClearedAt(currentUser.id, effectiveSchoolId, Date.now());

  // Also remove single-owner personal items from stored list
  const visibleIds = new Set(visible.map((v) => v.id));
  const stored = getStoredNotifications();
  const remaining = stored.filter((item) => {
    if (!visibleIds.has(item.id)) return true;
    const isPersonalOnly =
      Array.isArray(item.targetUserIds) &&
      item.targetUserIds.length === 1 &&
      item.targetUserIds[0] === currentUser.id &&
      !item.isBroadcast;
    return !isPersonalOnly;
  });
  saveStoredNotifications(remaining);
  emitNotificationStateChanged({ action: 'clear_all', userId: currentUser.id, schoolId: effectiveSchoolId });
}

export function dismissScopedNotificationForUser(
  notifId: string,
  params: ScopedNotificationsParams
): void {
  const { currentUser, schoolId } = params;
  if (!currentUser || !notifId) return;

  const effectiveSchoolId = resolveScopedSchoolId(currentUser, schoolId);
  const dismissedSet = getUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, effectiveSchoolId);
  dismissedSet.add(notifId);

  const stored = getStoredNotifications();
  const targetItem = stored.find((item) => item.id === notifId);
  if (typeof targetItem?.metadata?.dedupeTag === 'string' && targetItem.metadata.dedupeTag) {
    dismissedSet.add(targetItem.metadata.dedupeTag);
  }
  saveUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, effectiveSchoolId, dismissedSet);

  const remaining = stored.filter((item) => {
    if (item.id !== notifId) return true;
    const isPersonalOnly =
      Array.isArray(item.targetUserIds) &&
      item.targetUserIds.length === 1 &&
      item.targetUserIds[0] === currentUser.id &&
      !item.isBroadcast;
    return !isPersonalOnly;
  });
  saveStoredNotifications(remaining);
  emitNotificationStateChanged({ action: 'dismiss_one', notifId, userId: currentUser.id, schoolId: effectiveSchoolId });
}

// Check if browser supports Web Notifications
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Check current browser permission state ('default' | 'granted' | 'denied')
export function getPushPermissionState(): NotificationPermission {
  if (!isPushNotificationSupported()) return 'denied';
  return Notification.permission;
}

// Request permission from the user
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

// Audio synthesizer for notification chime
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore autoplay or audio context errors
  }
}

// Dispatch Web Push + In-App notification
export async function sendEduVerseNotification(params: {
  title: string;
  body: string;
  category: 'attendance' | 'homework' | 'announcement' | 'system';
  url?: string;
  priority?: 'normal' | 'urgent';
  tag?: string;
  dedupeByTag?: boolean;
  schoolId?: string;
  targetUserIds?: string[];
  targetStudentIds?: string[];
  targetRoles?: UserRole[];
  isBroadcast?: boolean;
  sourceKind?: 'push' | 'announcement' | 'holiday';
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<EduVerseNotification> {
  const settings = getNotificationSettings();
  const timeNow = new Date().toISOString();
  const currentHistory = getStoredNotifications(settings.retentionDays);
  const resolvedSchoolId = params.schoolId || params.metadata?.schoolId;

  if (params.tag && params.dedupeByTag) {
    const existing = currentHistory.find(
      (item) => item.id === params.tag || item.metadata?.dedupeTag === params.tag
    );
    if (existing) {
      return existing;
    }

    if (params.targetUserIds?.length === 1 && !params.isBroadcast) {
      const targetUserId = params.targetUserIds[0];
      const dismissedSet = getUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, targetUserId, resolvedSchoolId);
      if (dismissedSet.has(params.tag)) {
        return {
          id: params.tag,
          title: params.title,
          body: params.body,
          category: params.category,
          timestamp: timeNow,
          read: true,
          priority: params.priority || 'normal',
          schoolId: resolvedSchoolId,
          targetUserIds: params.targetUserIds,
          targetRoles: params.targetRoles,
          sourceKind: params.sourceKind || 'push',
          metadata: { ...(params.metadata || {}), dedupeTag: params.tag },
        };
      }
    }
  }

  const notifItem: EduVerseNotification = {
    id: params.tag
      ? params.dedupeByTag
        ? params.tag
        : `${params.tag}-${Date.now()}`
      : `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: params.title,
    body: params.body,
    category: params.category,
    timestamp: timeNow,
    icon: '/pwa-192x192.png',
    url: params.url || '/',
    read: false,
    priority: params.priority || 'normal',
    schoolId: resolvedSchoolId,
    targetUserIds: params.targetUserIds || params.metadata?.targetUserIds,
    targetStudentIds: params.targetStudentIds || params.metadata?.targetStudentIds,
    targetRoles: params.targetRoles || params.metadata?.targetRoles,
    isBroadcast: params.isBroadcast ?? params.metadata?.isBroadcast,
    sourceKind: params.sourceKind || 'push',
    metadata: params.tag
      ? { ...(params.metadata || {}), dedupeTag: params.tag }
      : params.metadata,
  };

  // 1. Record in local notification history (auto-pruned to retentionDays & max count)
  saveStoredNotifications([notifItem, ...currentHistory], settings.retentionDays);

  // Dispatch custom window event so UI badges update instantly
  emitNotificationStateChanged(notifItem as unknown as Record<string, unknown>);

  // 2. Play sound if configured
  if (settings.sound) {
    playNotificationChime();
  }

  // 3. Trigger haptic vibration on mobile
  if (settings.vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 80, 120]);
    } catch {
      // Ignore vibration errors
    }
  }

  // 4. Fire Web Push Notification (Desktop / Android / iOS Standalone)
  if (
    settings.enabled &&
    (params.category === 'system' || settings.categories[params.category]) &&
    isPushNotificationSupported() &&
    Notification.permission === 'granted'
  ) {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          registration.showNotification(params.title, {
            body: params.body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: notifItem.id,
            data: { url: notifItem.url },
          } as any);
          return notifItem;
        }
      }

      new Notification(params.title, {
        body: params.body,
        icon: '/pwa-192x192.png',
      });
    } catch (err) {
      console.warn('Native notification failed, stored in in-app notification center:', err);
    }
  }

  return notifItem;
}
