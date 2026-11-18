import React, { useState, useEffect, useCallback } from 'react';
import {
  BellRing,
  BellOff,
  CheckCircle2,
  Trash2,
  Settings2,
  Smartphone,
  Volume2,
  Vibrate,
  X,
  Clock,
  Sparkles,
  Send,
  AlertCircle,
  CalendarDays,
  Megaphone,
} from 'lucide-react';
import {
  EduVerseNotification,
  NotificationSettings,
  getScopedNotificationsForUser,
  markScopedNotificationsReadForUser,
  clearScopedNotificationsForUser,
  dismissScopedNotificationForUser,
  getNotificationSettings,
  saveNotificationSettings,
  requestPushPermission,
  getPushPermissionState,
  sendEduVerseNotification,
  isPushNotificationSupported,
} from '../../lib/pushNotifications';
import { Announcement, AppLanguage, AuthUser } from '../../types';
import {
  DEFAULT_PARENT_NOTIFICATION_PREFERENCES,
  ParentNotificationPreferences,
  clearParentNotifications,
  disableParentPushNotifications,
  enableParentPushNotifications,
  listParentNotifications,
  loadParentNotificationPreferences,
  markParentNotificationsRead,
  saveParentNotificationPreferences,
} from '../../lib/parentNotifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  schoolId?: string;
  ownStudentIds?: string[];
  announcements?: Announcement[];
  onUnreadCountChange?: (count: number) => void;
  lang?: AppLanguage;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  schoolId,
  ownStudentIds = [],
  announcements = [],
  onUnreadCountChange,
  lang = 'th',
}) => {
  const [notifications, setNotifications] = useState<EduVerseNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [parentPreferences, setParentPreferences] = useState<ParentNotificationPreferences>(DEFAULT_PARENT_NOTIFICATION_PREFERENCES);
  const [parentError, setParentError] = useState('');
  const [parentBusy, setParentBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [testSentNotice, setTestSentNotice] = useState(false);

  const effectiveSchoolId = schoolId || currentUser.schoolId;
  const canSimulateNotifications = ['admin', 'super_admin', 'teacher'].includes(currentUser.role);

  const loadScopedNotifications = useCallback(() => {
    return getScopedNotificationsForUser({
      currentUser,
      schoolId: effectiveSchoolId,
      ownStudentIds,
      announcements,
      lang,
    });
  }, [currentUser, effectiveSchoolId, ownStudentIds, announcements, lang]);

  useEffect(() => {
    if (!isOpen) return;
    setPermission(getPushPermissionState());
    if (currentUser.role === 'parent') {
      setParentError('');
      void Promise.all([listParentNotifications(), loadParentNotificationPreferences()])
        .then(([items, preferences]) => {
          // Merge parent-only announcements and holiday alerts without leaking push from other accounts
          const schoolAndHolidayAlerts = loadScopedNotifications().filter(
            (n) => n.sourceKind === 'announcement' || n.sourceKind === 'holiday'
          );
          const merged = [...items, ...schoolAndHolidayAlerts].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setNotifications(merged);
          setParentPreferences(preferences);
          onUnreadCountChange?.(merged.filter((item) => !item.read).length);
        })
        .catch((error: unknown) => {
          const fallback = loadScopedNotifications();
          setNotifications(fallback);
          onUnreadCountChange?.(fallback.filter((i) => !i.read).length);
          setParentError(error instanceof Error ? error.message : 'โหลดการแจ้งเตือนของนักเรียนไม่สำเร็จ');
        });
    } else {
      const scoped = loadScopedNotifications();
      setNotifications(scoped);
      setSettings(getNotificationSettings());
      onUnreadCountChange?.(scoped.filter((item) => !item.read).length);
    }
  }, [isOpen, currentUser.role, loadScopedNotifications, onUnreadCountChange]);

  useEffect(() => {
    if (!isOpen || currentUser.role !== 'parent') return;
    let active = true;
    const refresh = async () => {
      try {
        const items = await listParentNotifications();
        if (!active) return;
        const schoolAndHolidayAlerts = loadScopedNotifications().filter(
          (n) => n.sourceKind === 'announcement' || n.sourceKind === 'holiday'
        );
        const merged = [...items, ...schoolAndHolidayAlerts].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setNotifications(merged);
        onUnreadCountChange?.(merged.filter((item) => !item.read).length);
      } catch (error) {
        if (active) setParentError(error instanceof Error ? error.message : 'โหลดการแจ้งเตือนของนักเรียนไม่สำเร็จ');
      }
    };
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isOpen, currentUser.role, loadScopedNotifications, onUnreadCountChange]);

  // Listen to new notifications while modal is open
  useEffect(() => {
    if (currentUser.role === 'parent') return;
    const handler = () => {
      const scoped = loadScopedNotifications();
      setNotifications(scoped);
      onUnreadCountChange?.(scoped.filter((item) => !item.read).length);
    };
    window.addEventListener('eduverse:notification', handler);
    return () => window.removeEventListener('eduverse:notification', handler);
  }, [currentUser.role, loadScopedNotifications, onUnreadCountChange]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if (currentUser.role === 'parent') {
      await handleToggleParentPush();
      return;
    }
    const res = await requestPushPermission();
    setPermission(res);
    if (res === 'granted') {
      const updated = { ...settings, enabled: true };
      setSettings(updated);
      saveNotificationSettings(updated);
      await sendEduVerseNotification({
        title: lang === 'th' ? 'เปิดการแจ้งเตือน EduVerse สำเร็จ' : 'EduVerse Notifications Enabled',
        body:
          lang === 'th'
            ? 'คุณจะได้รับการแจ้งเตือนเวลาเข้า-ออก การบ้านใหม่ และประกาศจากโรงเรียนเฉพาะบัญชีของคุณ'
            : 'You will receive alerts for your attendance, homework, and school bulletins.',
        category: 'system',
        schoolId: effectiveSchoolId,
        targetUserIds: [currentUser.id],
      });
      setNotifications(loadScopedNotifications());
    }
  };

  const handleTestNotification = async (
    typeOrEvent?: 'gate_checkin' | 'period_start' | 'period_end' | 'late_alert' | 'teacher_leave' | React.MouseEvent
  ) => {
    if (!canSimulateNotifications) return;
    const type = typeof typeOrEvent === 'string' ? typeOrEvent : 'gate_checkin';
    const scopePayload = {
      schoolId: effectiveSchoolId,
      targetUserIds: [currentUser.id],
      targetRoles: [currentUser.role],
    };

    if (type === 'period_start') {
      await sendEduVerseNotification({
        ...scopePayload,
        title: '[ทดสอบ] ใกล้เริ่มคาบเรียนที่ 2 (09:20 - 10:10)',
        body: 'วิชา ว21101 วิทยาศาสตร์กายภาพ (ห้อง 402) อย่าลืมเช็คอินเข้าเรียน (Check-in)',
        category: 'attendance',
        priority: 'urgent',
      });
    } else if (type === 'period_end') {
      await sendEduVerseNotification({
        ...scopePayload,
        title: '[ทดสอบ] สิ้นสุดคาบเรียนที่ 2 (10:10 น.)',
        body: 'หมดเวลาคาบเรียนวิชา ว21101 กรุณาเช็คชื่อออก (Check-out)',
        category: 'attendance',
        priority: 'normal',
      });
    } else if (type === 'late_alert') {
      await sendEduVerseNotification({
        ...scopePayload,
        title: '[ทดสอบ] แจ้งเตือนลืมเช็คชื่อ / มาสาย',
        body: 'คาบเรียนที่ 2 เริ่มไปแล้ว 10 นาที ยังไม่พบการเช็คชื่อ กรุณาตรวจสอบ',
        category: 'attendance',
        priority: 'urgent',
      });
    } else if (type === 'teacher_leave') {
      await sendEduVerseNotification({
        ...scopePayload,
        title: '[ทดสอบ] แจ้งเตือนครูยื่นลาสอนรายคาบ (CC ผู้เกี่ยวข้อง)',
        body: 'ครูสมศรี ลาสอนคาบที่ 3 (ค21101) มอบหมาย ครูประเสริฐ สอนแทน | CC: หัวหน้าหมวด, รอง ผอ.วิชาการ',
        category: 'announcement',
        priority: 'urgent',
      });
    } else {
      await sendEduVerseNotification({
        ...scopePayload,
        title: lang === 'th' ? '[ทดสอบ] เช็คชื่อเข้าโรงเรียนสำเร็จ' : '[Test] School Check-In Verified',
        body:
          lang === 'th'
            ? 'สแกนผ่านประตูหลักโรงเรียน เวลา 07:42 น. (ตรงเวลาปกติ)'
            : 'Scanned at Main Gate 07:42 AM.',
        category: 'attendance',
        priority: 'urgent',
      });
    }
    setNotifications(loadScopedNotifications());
    setTestSentNotice(true);
    setTimeout(() => setTestSentNotice(false), 3000);
  };

  const handleMarkAllRead = () => {
    if (currentUser.role === 'parent') {
      setParentBusy(true);
      markScopedNotificationsReadForUser({
        currentUser,
        schoolId: effectiveSchoolId,
        ownStudentIds,
        announcements,
        lang,
      });
      void markParentNotificationsRead()
        .then(async () => {
          const items = await listParentNotifications();
          const schoolAndHolidayAlerts = loadScopedNotifications().filter(
            (n) => n.sourceKind === 'announcement' || n.sourceKind === 'holiday'
          );
          const merged = [...items, ...schoolAndHolidayAlerts].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setNotifications(merged);
          onUnreadCountChange?.(0);
        })
        .catch((error: unknown) => {
          setParentError(error instanceof Error ? error.message : 'อัปเดตสถานะการอ่านไม่สำเร็จ');
        })
        .finally(() => setParentBusy(false));
      return;
    }

    const updated = markScopedNotificationsReadForUser({
      currentUser,
      schoolId: effectiveSchoolId,
      ownStudentIds,
      announcements,
      lang,
    });
    setNotifications(updated);
    onUnreadCountChange?.(0);
  };

  const handleClearAll = () => {
    if (currentUser.role === 'parent') {
      setParentBusy(true);
      clearScopedNotificationsForUser({
        currentUser,
        schoolId: effectiveSchoolId,
        ownStudentIds,
        announcements,
        lang,
      });
      void clearParentNotifications()
        .then(() => {
          setNotifications([]);
          onUnreadCountChange?.(0);
        })
        .catch((error: unknown) => {
          setParentError(error instanceof Error ? error.message : 'ล้างประวัติไม่สำเร็จ');
        })
        .finally(() => setParentBusy(false));
      return;
    }

    clearScopedNotificationsForUser({
      currentUser,
      schoolId: effectiveSchoolId,
      ownStudentIds,
      announcements,
      lang,
    });
    setNotifications([]);
    onUnreadCountChange?.(0);
  };

  const handleDismissOne = (notifId: string) => {
    dismissScopedNotificationForUser(notifId, {
      currentUser,
      schoolId: effectiveSchoolId,
      ownStudentIds,
      announcements,
      lang,
    });
    setNotifications((prev) => {
      const next = prev.filter((item) => item.id !== notifId);
      onUnreadCountChange?.(next.filter((item) => !item.read).length);
      return next;
    });
  };

  const handleChangeRetentionDays = (days: 3 | 7 | 14 | 30) => {
    const next: NotificationSettings = {
      ...settings,
      retentionDays: days,
    };
    setSettings(next);
    saveNotificationSettings(next);
    const updated = loadScopedNotifications();
    setNotifications(updated);
    onUnreadCountChange?.(updated.filter((item) => !item.read).length);
  };

  const handleToggleParentPush = async () => {
    setParentBusy(true);
    setParentError('');
    try {
      if (parentPreferences.pushEnabled) {
        await disableParentPushNotifications();
        setParentPreferences((previous) => ({ ...previous, pushEnabled: false }));
      } else {
        await enableParentPushNotifications();
        setPermission('granted');
        setParentPreferences((previous) => ({ ...previous, pushEnabled: true }));
      }
    } catch (error) {
      let message = error instanceof Error ? error.message : 'ปรับการแจ้งเตือนไม่สำเร็จ';
      if (parentPreferences.pushEnabled) {
        try {
          setParentPreferences(await loadParentNotificationPreferences());
        } catch (refreshError) {
          message += ` (${refreshError instanceof Error ? refreshError.message : 'ไม่สามารถโหลดสถานะล่าสุดได้'})`;
        }
      }
      setParentError(message);
    } finally {
      setParentBusy(false);
    }
  };

  const handleToggleParentCategory = async (
    key: keyof Omit<ParentNotificationPreferences, 'pushEnabled'>
  ) => {
    const updated = { ...parentPreferences, [key]: !parentPreferences[key] };
    setParentBusy(true);
    setParentError('');
    try {
      await saveParentNotificationPreferences(updated);
      setParentPreferences(updated);
    } catch (error) {
      setParentError(error instanceof Error ? error.message : 'บันทึกหมวดการแจ้งเตือนไม่สำเร็จ');
    } finally {
      setParentBusy(false);
    }
  };

  const handleToggleSetting = (
    key: keyof NotificationSettings | 'category',
    subKey?: keyof NotificationSettings['categories']
  ) => {
    let next: NotificationSettings;
    if (key === 'category' && subKey) {
      next = {
        ...settings,
        categories: {
          ...settings.categories,
          [subKey]: !settings.categories[subKey],
        },
      };
    } else if (typeof settings[key as keyof NotificationSettings] === 'boolean') {
      next = {
        ...settings,
        [key]: !settings[key as keyof NotificationSettings],
      };
    } else {
      return;
    }
    setSettings(next);
    saveNotificationSettings(next);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl text-[var(--color-text-body)] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-card-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-xs">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--color-text-title)] flex items-center gap-2">
                <span>{lang === 'th' ? 'การแจ้งเตือนของคุณ' : 'Your Notifications'}</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white tabular-nums">
                    {unreadCount} {lang === 'th' ? 'ใหม่' : 'new'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {currentUser.role === 'parent'
                  ? lang === 'th'
                    ? 'แสดงเฉพาะข้อมูลบุตรหลานและประกาศจากโรงเรียน'
                    : 'Only notifications for linked children and school announcements'
                  : currentUser.role === 'student'
                    ? lang === 'th'
                      ? 'แสดงเฉพาะแจ้งเตือนส่วนตัวของนักเรียน วันหยุด และประกาศจากโรงเรียน'
                      : 'Personal student alerts, school holidays, and bulletins'
                    : lang === 'th'
                      ? 'แจ้งเตือนเฉพาะบัญชีของคุณและประกาศภายในโรงเรียน'
                      : 'Scoped real-time alerts for your school account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'list' ? 'settings' : 'list')}
              className={`min-h-[40px] min-w-[40px] p-2 rounded-xl border border-[var(--color-border)] transition cursor-pointer flex items-center justify-center ${
                activeTab === 'settings'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title={lang === 'th' ? 'ตั้งค่าการแจ้งเตือน' : 'Notification Settings'}
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] transition cursor-pointer flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Permission Request Banner */}
        {currentUser.role !== 'parent' && permission !== 'granted' && isPushNotificationSupported() && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                {lang === 'th'
                  ? 'ยังไม่ได้เปิดรับการแจ้งเตือนบนอุปกรณ์นี้'
                  : 'Push notifications are not active on this device'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition cursor-pointer shadow-xs"
            >
              {lang === 'th' ? 'อนุญาตการแจ้งเตือน' : 'Enable Push'}
            </button>
          </div>
        )}

        {currentUser.role === 'parent' && parentError && (
          <div className="px-4 py-2 border-b border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 text-xs">
            {parentError}
          </div>
        )}

        {canSimulateNotifications && testSentNotice && (
          <div className="p-2.5 bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{lang === 'th' ? 'ส่งการแจ้งเตือนทดสอบเรียบร้อยแล้ว' : 'Test notification dispatched'}</span>
          </div>
        )}

        {/* TAB 1: NOTIFICATION LIST */}
        {activeTab === 'list' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 bg-[var(--color-card)]">
              <div className="min-w-0">
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums block">
                  {lang === 'th' ? `รายการแจ้งเตือนทั้งหมด (${notifications.length})` : `Notifications (${notifications.length})`}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                  {lang === 'th'
                    ? `เก็บย้อนหลังอัตโนมัติ ${settings.retentionDays} วัน (สูงสุด 80 รายการ)`
                    : `Auto-cleaned after ${settings.retentionDays} days (max 80)`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    disabled={parentBusy}
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[var(--color-primary-text)] font-semibold hover:underline cursor-pointer"
                  >
                    {lang === 'th' ? 'อ่านทั้งหมดแล้ว' : 'Mark all read'}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    disabled={parentBusy}
                    onClick={handleClearAll}
                    className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === 'th' ? 'ล้างทั้งหมด' : 'Clear all'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Staff/Teacher simulation toolbar (never shown to students or parents) */}
            {canSimulateNotifications && (
              <div className="px-3 py-2 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] space-y-1.5 shrink-0 text-xs">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>ทดสอบส่งการแจ้งเตือน (เฉพาะบัญชีครู/แอดมิน):</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTestNotification('period_start')}
                    className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    เริ่มคาบ &amp; เช็คอิน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestNotification('period_end')}
                    className="px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    หมดคาบ &amp; เช็คเอาท์
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestNotification('late_alert')}
                    className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    ลืมเช็คชื่อ / มาสาย
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestNotification('teacher_leave')}
                    className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    ครูลาสอน (CC)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestNotification('gate_checkin')}
                    className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    เช็คชื่อเข้า รร.
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
              {notifications.length === 0 ? (
                <div className="text-center py-14 space-y-2 text-[var(--color-text-muted)]">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center mx-auto">
                    <BellOff className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ยังไม่มีการแจ้งเตือนใหม่' : 'No notifications yet'}
                  </p>
                  <p className="text-xs max-w-xs mx-auto leading-relaxed">
                    {lang === 'th'
                      ? 'รายการเช็คชื่อเข้า-ออก การบ้าน ผลการเรียน วันหยุดราชการ และประกาศจากโรงเรียนจะแสดงที่นี่'
                      : 'Your personal check-ins, homework, school holidays, and bulletins will appear here.'}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isHoliday = notif.sourceKind === 'holiday';
                  const isAnnouncement = notif.sourceKind === 'announcement';
                  const isGradeAlert = notif.metadata?.alertType === 'grade_update';

                  const categoryLabel = isHoliday
                    ? lang === 'th'
                      ? 'วันหยุดราชการ/โรงเรียน'
                      : 'Holiday'
                    : isAnnouncement
                      ? lang === 'th'
                        ? 'ประกาศโรงเรียน'
                        : 'School Notice'
                      : isGradeAlert
                        ? lang === 'th'
                          ? 'ผลการเรียน'
                          : 'Grade Alert'
                        : {
                            attendance: lang === 'th' ? 'เช็คชื่อ' : 'Attendance',
                            homework: lang === 'th' ? 'การบ้าน' : 'Homework',
                            announcement: lang === 'th' ? 'ประกาศ' : 'Bulletin',
                            billing: lang === 'th' ? 'ค่าเทอม' : 'Billing',
                            system: lang === 'th' ? 'ระบบ' : 'System',
                          }[notif.category];

                  const parsedDate = new Date(notif.timestamp);
                  const timeText = Number.isNaN(parsedDate.getTime())
                    ? ''
                    : parsedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) +
                      ' · ' +
                      parsedDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        notif.read
                          ? 'bg-[var(--color-card)] border-[var(--color-border)]'
                          : 'bg-[var(--color-primary-light)] border-[var(--color-primary)]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
                          {isHoliday ? (
                            <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                          ) : isAnnouncement ? (
                            <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                          ) : null}
                          <span>{categoryLabel}</span>
                          {!notif.read && (
                            <span className="text-[10px] font-bold text-[var(--color-primary-text)]">· ใหม่</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {timeText && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3" />
                              {timeText}
                            </span>
                          )}
                          {currentUser.role !== 'parent' && (
                            <button
                              type="button"
                              onClick={() => handleDismissOne(notif.id)}
                              className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition"
                              title={lang === 'th' ? 'ลบข้อความนี้' : 'Dismiss'}
                              aria-label={lang === 'th' ? 'ลบข้อความแจ้งเตือนนี้' : 'Dismiss notification'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-[var(--color-text-title)] mt-1 leading-snug">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-body)] mt-0.5 leading-relaxed">
                        {notif.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS */}
        {activeTab === 'settings' && currentUser.role === 'parent' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            <section className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-3">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-[var(--color-primary-text)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'แจ้งเตือนส่วนตัวผ่านแอป' : 'Private app notifications'}
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? 'ระบบจะแจ้งเฉพาะข้อมูลของนักเรียนที่โรงเรียนผูกกับบัญชีนี้ และประกาศจากทางโรงเรียนเท่านั้น'
                      : 'Only linked student alerts and school announcements are displayed.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={parentBusy}
                onClick={() => void handleToggleParentPush()}
                className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50 ${
                  parentPreferences.pushEnabled
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                    : 'bg-[var(--color-primary)] text-white'
                }`}
              >
                {parentBusy
                  ? lang === 'th'
                    ? 'กำลังบันทึก...'
                    : 'Saving...'
                  : parentPreferences.pushEnabled
                    ? lang === 'th'
                      ? 'ปิดการแจ้งเตือนผ่านแอปสำหรับบัญชีนี้'
                      : 'Turn off app notifications'
                    : lang === 'th'
                      ? 'เปิดการแจ้งเตือนผ่านแอปสำหรับบัญชีนี้'
                      : 'Enable app notifications'}
              </button>
            </section>

            <section className="space-y-2.5">
              <h4 className="font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'เลือกหมวดแจ้งเตือนในแอป' : 'Choose in-app notification categories'}
              </h4>
              {[
                { key: 'attendanceEnabled', labelTh: 'การเข้าเรียน มาสาย และการลา', labelEn: 'Attendance, late arrivals, and leave' },
                { key: 'billingEnabled', labelTh: 'ค่าใช้จ่ายและใบเสร็จ', labelEn: 'Billing and receipts' },
              ].map((item) => {
                const key = item.key as keyof Omit<ParentNotificationPreferences, 'pushEnabled'>;
                return (
                  <div key={item.key} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between gap-3">
                    <span>{lang === 'th' ? item.labelTh : item.labelEn}</span>
                    <button
                      type="button"
                      disabled={parentBusy}
                      aria-label={lang === 'th' ? item.labelTh : item.labelEn}
                      aria-pressed={parentPreferences[key]}
                      onClick={() => void handleToggleParentCategory(key)}
                      className={`w-10 h-5 rounded-full transition-colors relative disabled:opacity-50 ${
                        parentPreferences[key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                          parentPreferences[key] ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </section>
          </div>
        )}

        {activeTab === 'settings' && currentUser.role !== 'parent' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--color-text-title)] block">
                  {lang === 'th' ? 'เปิดรับการแจ้งเตือนทั้งหมด' : 'Enable Push Notifications'}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'แจ้งเตือนเด้งหน้าจอเมื่อมีรายการของบัญชีคุณ' : 'Receive push alerts on this device'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('enabled')}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                    settings.enabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold text-[var(--color-text-title)] uppercase tracking-wider text-[11px]">
                {lang === 'th' ? 'เสียงและการสั่น' : 'Sound & Vibration'}
              </h4>
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'th' ? 'เสียงแจ้งเตือน' : 'Notification sound'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting('sound')}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.sound ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                      settings.sound ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-purple-600" />
                  <span>{lang === 'th' ? 'การสั่นเตือนบนมือถือ' : 'Haptic vibration'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting('vibrate')}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.vibrate ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                      settings.vibrate ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold text-[var(--color-text-title)] uppercase tracking-wider text-[11px]">
                {lang === 'th' ? 'หมวดหมู่การแจ้งเตือน' : 'Notification Categories'}
              </h4>
              {[
                { key: 'attendance', labelTh: 'เช็คชื่อเข้า-ออก & ขาด ลา มาสาย', labelEn: 'Attendance & Late Alerts' },
                { key: 'homework', labelTh: 'การบ้านใหม่ & ผลการเรียน', labelEn: 'New Homework & Grades' },
                { key: 'announcement', labelTh: 'ประกาศจากโรงเรียน & วันหยุดราชการ', labelEn: 'School Bulletins & Holidays' },
                ...(currentUser.role !== 'student'
                  ? [{ key: 'billing', labelTh: 'ค่าธรรมเนียมและใบเสร็จ', labelEn: 'Tuition Invoices & Receipts' }]
                  : []),
              ].map((item) => (
                <div key={item.key} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between">
                  <span>{lang === 'th' ? item.labelTh : item.labelEn}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSetting('category', item.key as any)}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      settings.categories[item.key as keyof NotificationSettings['categories']]
                        ? 'bg-blue-600'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                        settings.categories[item.key as keyof NotificationSettings['categories']]
                          ? 'right-0.5'
                          : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-[var(--color-text-title)] uppercase tracking-wider text-[11px]">
                  {lang === 'th' ? 'ระยะเวลาเก็บข้อความ (ลบอัตโนมัติ)' : 'Auto-Delete Retention'}
                </h4>
                <span className="text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums">
                  {settings.retentionDays} {lang === 'th' ? 'วัน' : 'days'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {([3, 7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleChangeRetentionDays(days)}
                    className={`min-h-[36px] rounded-xl border text-xs font-bold tabular-nums cursor-pointer transition ${
                      settings.retentionDays === days
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                    }`}
                  >
                    {days} {lang === 'th' ? 'วัน' : 'd'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'ข้อความแจ้งเตือนที่เก่ากว่าจำนวนวันที่เลือกจะถูกลบออกจากรายการอัตโนมัติ (ค่าเริ่มต้น 7 วัน)'
                  : 'Notifications older than the selected days are removed automatically (default 7 days).'}
              </p>
            </div>

            {canSimulateNotifications && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'ทดสอบส่งการแจ้งเตือนเข้าอุปกรณ์เดี๋ยวนี้' : 'Dispatch Test Notification'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between text-xs shrink-0">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            Scoped Notifications · {currentUser.role.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-bold hover:bg-[var(--color-card-subtle)] cursor-pointer text-xs"
          >
            {lang === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
