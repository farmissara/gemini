import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  CheckCircle2, 
  Trash2, 
  Settings2, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  X, 
  Clock, 
  Sparkles, 
  Send,
  AlertCircle
} from 'lucide-react';
import { 
  EduVerseNotification, 
  NotificationSettings, 
  getStoredNotifications, 
  saveStoredNotifications, 
  getNotificationSettings, 
  saveNotificationSettings, 
  requestPushPermission, 
  getPushPermissionState, 
  sendEduVerseNotification,
  isPushNotificationSupported
} from '../lib/pushNotifications';
import { AppLanguage } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: AppLanguage;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  lang = 'th',
}) => {
  const [notifications, setNotifications] = useState<EduVerseNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [testSentNotice, setTestSentNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotifications(getStoredNotifications());
      setSettings(getNotificationSettings());
      setPermission(getPushPermissionState());
    }
  }, [isOpen]);

  // Listen to new notifications while modal is open
  useEffect(() => {
    const handler = () => {
      setNotifications(getStoredNotifications());
    };
    window.addEventListener('eduverse:notification', handler);
    return () => window.removeEventListener('eduverse:notification', handler);
  }, []);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestPushPermission();
    setPermission(res);
    if (res === 'granted') {
      const updated = { ...settings, enabled: true };
      setSettings(updated);
      saveNotificationSettings(updated);
      // Fire greeting push notification
      await sendEduVerseNotification({
        title: lang === 'th' ? '🔔 เปิดการแจ้งเตือน EduVerse สำเร็จ' : '🔔 EduVerse Notifications Enabled',
        body: lang === 'th' 
          ? 'คุณจะได้รับการแจ้งเตือนเวลาเข้า-ออกโรงเรียน, การบ้านใหม่ และประกาศสำคัญ' 
          : 'You will receive real-time alerts for attendance, homework, and urgent bulletins.',
        category: 'system',
      });
      setNotifications(getStoredNotifications());
    }
  };

  const handleTestNotification = async (typeOrEvent?: 'gate_checkin' | 'period_start' | 'period_end' | 'late_alert' | 'teacher_leave' | React.MouseEvent) => {
    const type = typeof typeOrEvent === 'string' ? typeOrEvent : 'gate_checkin';
    if (type === 'period_start') {
      await sendEduVerseNotification({
        title: '⏰ [ทดสอบ] ใกล้เริ่มคาบเรียนที่ 2 (09:20 - 10:10)',
        body: 'วิชา ว21101 วิทยาศาสตร์กายภาพ (ห้อง 402) อย่าลืมสแกน Barcode/QR เช็กชื่อเข้าเรียน (Check-in)',
        category: 'attendance',
        priority: 'urgent',
      });
    } else if (type === 'period_end') {
      await sendEduVerseNotification({
        title: '🔔 [ทดสอบ] สิ้นสุดคาบเรียนที่ 2 (10:10 น.)',
        body: 'หมดเวลาคาบเรียนวิชา ว21101 กรุณาเช็กชื่อออก (Check-out) และเตรียมตัวสำหรับคาบเรียนถัดไป',
        category: 'attendance',
        priority: 'normal',
      });
    } else if (type === 'late_alert') {
      await sendEduVerseNotification({
        title: '⚠️ [ทดสอบ] แจ้งเตือนลืมเช็กชื่อ / มาสาย',
        body: 'คาบเรียนที่ 2 เริ่มไปแล้ว 10 นาที ระบบยังไม่พบการเช็กชื่อของ ด.ช. ภัทรดนัย กรุณาสแกนหรือติดต่อครูผู้สอน',
        category: 'attendance',
        priority: 'urgent',
      });
    } else if (type === 'teacher_leave') {
      await sendEduVerseNotification({
        title: '📋 [ทดสอบ] แจ้งเตือนครูยื่นลาสอนรายคาบ (CC ผู้เกี่ยวข้อง)',
        body: 'ครูสมศรี ลาสอนคาบที่ 3 (ค21101) มอบหมาย ครูประเสริฐ สอนแทน | CC: หัวหน้าหมวด, รอง ผอ.วิชาการ',
        category: 'announcement',
        priority: 'urgent',
      });
    } else {
      await sendEduVerseNotification({
        title: lang === 'th' ? '✅ [ทดสอบ] ด.ช. ภัทรดนัย เข้าโรงเรียนแล้ว' : '✅ [Test] Student Checked In',
        body: lang === 'th'
          ? 'สแกนผ่านประตูหลักโรงเรียน เวลา 07:42 น. (ตรงเวลาปกติ) ผู้ปกครองสามารถดูรายละเอียดได้'
          : 'Student scanned at Main Gate 07:42 AM. Real-time parent notification verified.',
        category: 'attendance',
        priority: 'urgent',
      });
    }
    setNotifications(getStoredNotifications());
    setTestSentNotice(true);
    setTimeout(() => setTestSentNotice(false), 3000);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleClearAll = () => {
    setNotifications([]);
    saveStoredNotifications([]);
  };

  const handleToggleSetting = (key: keyof NotificationSettings | 'category', subKey?: keyof NotificationSettings['categories']) => {
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

  const unreadCount = notifications.filter(n => !n.read).length;

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
                <span>{lang === 'th' ? 'ศูนย์การแจ้งเตือน Web Push' : 'Notification Center'}</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    {unreadCount} {lang === 'th' ? 'ใหม่' : 'new'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {lang === 'th' ? 'แจ้งเตือนเรียลไทม์บนหน้าจอล็อก (Android / iOS / PC)' : 'Real-time Push Alerts on Lock Screen'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'list' ? 'settings' : 'list')}
              className={`p-2 rounded-xl border border-[var(--color-border)] transition cursor-pointer ${
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
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Permission Request Banner if not yet granted */}
        {permission !== 'granted' && isPushNotificationSupported() && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                {lang === 'th'
                  ? 'ยังไม่ได้เปิดรับการแจ้งเตือนบนเบราว์เซอร์นี้'
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

        {/* Test Alert Banner Feedback */}
        {testSentNotice && (
          <div className="p-2.5 bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 animate-bounce shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{lang === 'th' ? 'ส่งการแจ้งเตือนทดสอบเรียบร้อยแล้ว!' : 'Test notification dispatched!'}</span>
          </div>
        )}

        {/* TAB 1: NOTIFICATION LIST */}
        {activeTab === 'list' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Action Bar */}
            <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between text-xs shrink-0 bg-[var(--color-card)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                {lang === 'th' ? `ประวัติการแจ้งเตือนทั้งหมด (${notifications.length})` : `History (${notifications.length})`}
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[var(--color-primary-text)] font-semibold hover:underline cursor-pointer"
                  >
                    {lang === 'th' ? 'อ่านทั้งหมดแล้ว' : 'Mark all read'}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === 'th' ? 'ล้างประวัติ' : 'Clear'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Test & Simulation Suite */}
            <div className="px-3 py-2 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] space-y-1.5 shrink-0 text-xs">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>จำลองการแจ้งเตือนตามเงื่อนไข (Simulate Real-time Notifications):</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestNotification('period_start')}
                  className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                >
                  ⏰ เริ่มคาบ &amp; เช็กอิน
                </button>
                <button
                  type="button"
                  onClick={() => handleTestNotification('period_end')}
                  className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                >
                  🔔 หมดคาบ &amp; เช็กเอ้าท์
                </button>
                <button
                  type="button"
                  onClick={() => handleTestNotification('late_alert')}
                  className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                >
                  ⚠️ ลืมเช็กชื่อ / มาสาย
                </button>
                <button
                  type="button"
                  onClick={() => handleTestNotification('teacher_leave')}
                  className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                >
                  📋 ครูลาสอน (CC)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestNotification('gate_checkin')}
                  className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-[10px] font-bold hover:opacity-90 cursor-pointer"
                >
                  ☀️ เช็กชื่อเข้า รร.
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
              {notifications.length === 0 ? (
                <div className="text-center py-16 space-y-2 text-[var(--color-text-muted)]">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
                    <BellOff className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ยังไม่มีการแจ้งเตือนใหม่' : 'No notifications yet'}
                  </p>
                  <p className="text-xs max-w-xs mx-auto">
                    {lang === 'th'
                      ? 'เมื่อมีนักเรียนสแกนเข้าเรียน การบ้านใหม่ หรือประกาศ จะปรากฏที่นี่'
                      : 'Attendance check-ins, new homework, and school bulletins will appear here.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] text-xs font-bold hover:opacity-90 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{lang === 'th' ? 'ลองส่งแจ้งเตือนทดสอบ' : 'Send Test Notification'}</span>
                  </button>
                </div>
              ) : (
                notifications.map((notif) => {
                  const categoryBadge = {
                    attendance: { label: lang === 'th' ? 'เช็คชื่อ' : 'Attendance', color: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' },
                    homework: { label: lang === 'th' ? 'การบ้าน' : 'Homework', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' },
                    announcement: { label: lang === 'th' ? 'ประกาศ' : 'Bulletin', color: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' },
                    billing: { label: lang === 'th' ? 'ค่าเทอม' : 'Billing', color: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300' },
                    system: { label: lang === 'th' ? 'ระบบ' : 'System', color: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300' },
                  }[notif.category];

                  return (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl border transition shadow-2xs ${
                        notif.read
                          ? 'bg-[var(--color-card)] border-[var(--color-border)]'
                          : 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${categoryBadge.color}`}>
                            {categoryBadge.label}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
        {activeTab === 'settings' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {/* Main Toggle */}
            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--color-text-title)] block">
                  {lang === 'th' ? 'เปิดรับการแจ้งเตือนทั้งหมด' : 'Enable Push Notifications'}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'ส่งแจ้งเตือนเด้งหน้าจอเมื่อมีเหตุการณ์สำคัญ' : 'Receive real-time push alerts on device'}
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

            {/* Sound & Vibration */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-[var(--color-text-title)] uppercase tracking-wider text-[11px]">
                {lang === 'th' ? 'เสียงและการสั่น' : 'Sound & Vibration'}
              </h4>

              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'th' ? 'เสียงแจ้งเตือน (Chime sound)' : 'Notification sound'}</span>
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
                  <span>{lang === 'th' ? 'การสั่นเตือนบนมือถือ (Haptic vibrate)' : 'Haptic vibration'}</span>
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

            {/* Category Subscriptions */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-[var(--color-text-title)] uppercase tracking-wider text-[11px]">
                {lang === 'th' ? 'หมวดหมู่การแจ้งเตือน' : 'Notification Categories'}
              </h4>

              {[
                { key: 'attendance', labelTh: 'เช็คชื่อเข้า-ออก & ขาด ลา มาสาย', labelEn: 'Attendance & Late Alerts' },
                { key: 'homework', labelTh: 'การบ้านใหม่ & คะแนนสอบเก็บคะแนน', labelEn: 'New Homework & Test Scores' },
                { key: 'announcement', labelTh: 'ประกาศด่วนจากโรงเรียน & ผอ.', labelEn: 'School Urgent Bulletins' },
                { key: 'billing', labelTh: 'ใบแจ้งชำระค่าเทอม & ใบเสร็จ', labelEn: 'Tuition Invoices & Receipts' },
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

            {/* Test Trigger */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestNotification}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ทดสอบยิง Push Notification เข้าอุปกรณ์เดี๋ยวนี้' : 'Dispatch Test Push Notification'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between text-xs shrink-0">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            EduVerse Push Service • PWA Standards
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
