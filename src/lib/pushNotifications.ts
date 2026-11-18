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
  category: 'attendance' | 'homework' | 'announcement' | 'billing' | 'system';
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
  categories: {
    attendance: boolean;
    homework: boolean;
    announcement: boolean;
    billing: boolean;
  };
}

const STORAGE_KEY_NOTIFICATIONS = 'eduverse_notifications_history';
const STORAGE_KEY_SETTINGS = 'eduverse_notification_settings';
const STORAGE_KEY_USER_READ_PREFIX = 'eduverse_notif_read_ids_';
const STORAGE_KEY_USER_DISMISSED_PREFIX = 'eduverse_notif_dismissed_ids_';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  sound: true,
  vibrate: true,
  categories: {
    attendance: true,
    homework: true,
    announcement: true,
    billing: true,
  },
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) } : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save notification settings:', err);
  }
}

export function getStoredNotifications(): EduVerseNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(list: EduVerseNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep last 120 notifications
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list.slice(0, 120)));
  } catch (err) {
    console.warn('Failed to save notifications history:', err);
  }
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
      JSON.stringify(Array.from(ids).slice(-300))
    );
  } catch {
    // ignore quota errors
  }
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

  const readSet = getUserIdSet(STORAGE_KEY_USER_READ_PREFIX, currentUser.id, schoolId);
  const dismissedSet = getUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, schoolId);

  const rawStored = getStoredNotifications();
  const visibleStored = rawStored
    .filter((item) => !dismissedSet.has(item.id))
    .filter((item) => isNotificationVisibleForUser(item, currentUser, schoolId, ownStudentIds))
    .map((item) => ({
      ...item,
      sourceKind: item.sourceKind || ('push' as const),
      read: item.read || readSet.has(item.id),
    }));

  // Merge school announcements relevant to user's role
  const announcementItems: EduVerseNotification[] = announcements
    .filter((ann) => (!ann.schoolId || !schoolId || ann.schoolId === schoolId))
    .filter((ann) => isAnnouncementAudienceMatch(ann.targetAudience, currentUser.role))
    .map((ann) => {
      const id = `ann-notif-${ann.id}`;
      return {
        id,
        title: `${ann.pinned ? '📌 ' : '📢 '}${ann.title}`,
        body: ann.content,
        category: 'announcement' as const,
        timestamp: /^\d{4}-\d{2}-\d{2}/.test(ann.publishedAt)
          ? new Date(ann.publishedAt).toISOString()
          : new Date().toISOString(),
        read: readSet.has(id),
        priority: ann.category === 'urgent' ? ('urgent' as const) : ('normal' as const),
        schoolId: ann.schoolId || schoolId,
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

  // Merge official Thai public holidays & school holidays (today + next 3 days)
  const todayStr = getBangkokDateInputValue();
  const todayHoliday = getHolidayForDate(todayStr, schoolId);
  const upcomingHolidays = getUpcomingHolidays(todayStr, 3, schoolId).filter((h) => h.date !== todayStr);
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
        schoolId,
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

  const visible = getScopedNotificationsForUser(params);
  const visibleIds = new Set(visible.map((v) => v.id));

  const readSet = getUserIdSet(STORAGE_KEY_USER_READ_PREFIX, currentUser.id, schoolId);
  visibleIds.forEach((id) => readSet.add(id));
  saveUserIdSet(STORAGE_KEY_USER_READ_PREFIX, currentUser.id, schoolId, readSet);

  // Only mutate personal-targeted items in global storage (never mark shared items read for others)
  const stored = getStoredNotifications();
  const updatedStored = stored.map((item) => {
    if (!visibleIds.has(item.id)) return item;
    const isShared = Boolean(item.isBroadcast || (item.targetRoles && item.targetRoles.length > 1));
    return isShared ? item : { ...item, read: true };
  });
  saveStoredNotifications(updatedStored);

  return visible.map((item) => ({ ...item, read: true }));
}

export function clearScopedNotificationsForUser(params: ScopedNotificationsParams): void {
  const { currentUser, schoolId } = params;
  if (!currentUser) return;

  const visible = getScopedNotificationsForUser(params);
  const dismissedSet = getUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, schoolId);
  visible.forEach((item) => dismissedSet.add(item.id));
  saveUserIdSet(STORAGE_KEY_USER_DISMISSED_PREFIX, currentUser.id, schoolId, dismissedSet);

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
  category: 'attendance' | 'homework' | 'announcement' | 'billing' | 'system';
  url?: string;
  priority?: 'normal' | 'urgent';
  tag?: string;
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

  const notifItem: EduVerseNotification = {
    id: params.tag ? `${params.tag}-${Date.now()}` : `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: params.title,
    body: params.body,
    category: params.category,
    timestamp: timeNow,
    icon: '/pwa-192x192.png',
    url: params.url || '/',
    read: false,
    priority: params.priority || 'normal',
    schoolId: params.schoolId || params.metadata?.schoolId,
    targetUserIds: params.targetUserIds || params.metadata?.targetUserIds,
    targetStudentIds: params.targetStudentIds || params.metadata?.targetStudentIds,
    targetRoles: params.targetRoles || params.metadata?.targetRoles,
    isBroadcast: params.isBroadcast ?? params.metadata?.isBroadcast,
    sourceKind: params.sourceKind || 'push',
    metadata: params.metadata,
  };

  // 1. Record in local notification history
  const currentHistory = getStoredNotifications();
  saveStoredNotifications([notifItem, ...currentHistory]);

  // Dispatch custom window event so UI badges update instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eduverse:notification', { detail: notifItem }));
  }

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
