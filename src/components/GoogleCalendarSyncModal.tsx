import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Image as ImageIcon,
  ListChecks,
  LogOut,
  MapPin,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { Assignment, Course, SchoolPeriodTime, TimetableSlot } from '../types';
import { buildTimetableIcs } from '../lib/timetableCalendar';
import { parseSlotTeachersFromRaw } from '../lib/timetableTeachers';
import { getHolidaysInRange } from '../lib/thaiHolidays';
import {
  GoogleCalendarAuthExpiredError,
  buildAssignmentCalendarTemplateUrl,
  buildGoogleCalendarEventPayloads,
  buildTimetableSlotCalendarTemplateUrl,
  syncTimetableToGoogleCalendar,
} from '../lib/googleCalendar';
import {
  GoogleCalendarAuthUser,
  clearGoogleCalendarAccessToken,
  disconnectGoogleCalendarUser,
  getCurrentGoogleCalendarUser,
  getGoogleCalendarAccessToken,
  initGoogleCalendarAuth,
  signInGoogleCalendarUser,
} from '../lib/googleCalendarAuth';
import {
  TIMETABLE_WALLPAPER_THEMES,
  WallpaperLayoutMode,
  WallpaperThemeId,
  downloadTimetableWallpaperPng,
  renderTimetableWallpaperDataUrl,
  shareTimetableWallpaperPng,
} from '../lib/timetableWallpaper';

interface GoogleCalendarSyncModalProps {
  slots: TimetableSlot[];
  schoolPeriods?: SchoolPeriodTime[];
  assignments?: Assignment[];
  courses?: Course[];
  schoolId: string;
  schoolName: string;
  academicYear: string;
  semester: string;
  filterLabel: string;
  defaultStartDate: string;
  defaultEndDate: string;
  calendarWeekStart: string;
  onClose: () => void;
}

const DAY_LABELS_TH: Record<string, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
};

const REMINDER_OPTIONS = [
  { value: 0, label: 'ไม่แจ้งเตือน' },
  { value: 5, label: 'ล่วงหน้า 5 นาที' },
  { value: 10, label: 'ล่วงหน้า 10 นาที' },
  { value: 15, label: 'ล่วงหน้า 15 นาที (แนะนำ)' },
  { value: 30, label: 'ล่วงหน้า 30 นาที' },
];

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  slots,
  schoolPeriods = [],
  assignments = [],
  courses = [],
  schoolId,
  schoolName,
  academicYear,
  semester,
  filterLabel,
  defaultStartDate,
  defaultEndDate,
  onClose,
}) => {
  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status !== 'closed' && Boolean(a.dueDate)),
    [assignments]
  );

  const [activeTab, setActiveTab] = useState<'export' | 'wallpaper' | 'preview'>('export');
  const [includeTimetable, setIncludeTimetable] = useState(slots.length > 0);
  const [includeAssignments, setIncludeAssignments] = useState(activeAssignments.length > 0);
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Per-user Google Account & direct Calendar sync state (in-memory token only)
  const [googleUser, setGoogleUser] = useState<GoogleCalendarAuthUser | null>(() =>
    getCurrentGoogleCalendarUser()
  );
  const [googleToken, setGoogleToken] = useState<string | null>(() =>
    getGoogleCalendarAccessToken()
  );
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    completed: number;
    total: number;
    summary: string;
  } | null>(null);
  const [syncCompletedCount, setSyncCompletedCount] = useState<{
    created: number;
    updated: number;
  } | null>(null);

  // Phone Wallpaper state
  const [wallpaperTheme, setWallpaperTheme] = useState<WallpaperThemeId>('midnight');
  const [wallpaperLayout, setWallpaperLayout] = useState<WallpaperLayoutMode>('lockscreen');
  const [wallpaperPreviewUrl, setWallpaperPreviewUrl] = useState<string>('');
  const [isExportingWallpaper, setIsExportingWallpaper] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const coTaughtCount = useMemo(
    () =>
      slots.filter((s) =>
        Boolean(parseSlotTeachersFromRaw(s.teacherName, s.coTeacherName).coTeacherName)
      ).length,
    [slots]
  );

  const holidaysInRange = useMemo(
    () => getHolidaysInRange(startDate, endDate, schoolId),
    [startDate, endDate, schoolId]
  );

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const targetSlotCount = includeTimetable ? slots.length : 0;
  const targetAssignmentCount = includeAssignments ? activeAssignments.length : 0;
  const targetHolidayCount = includeHolidays ? holidaysInRange.length : 0;
  const totalExportCount = targetSlotCount + targetAssignmentCount + targetHolidayCount;

  useEffect(() => {
    const unsubscribe = initGoogleCalendarAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeTab !== 'wallpaper') return;
    try {
      const dataUrl = renderTimetableWallpaperDataUrl({
        slots,
        schoolPeriods,
        schoolName,
        filterLabel,
        academicYear,
        semester,
        themeId: wallpaperTheme,
        layoutMode: wallpaperLayout,
      });
      setWallpaperPreviewUrl(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถสร้างตัวอย่างภาพหน้าจอได้');
    }
  }, [
    activeTab,
    slots,
    schoolPeriods,
    schoolName,
    filterLabel,
    academicYear,
    semester,
    wallpaperTheme,
    wallpaperLayout,
  ]);

  const handleConnectGoogleAccount = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setSyncCompletedCount(null);
    setIsConnectingGoogle(true);
    try {
      const result = await signInGoogleCalendarUser();
      setGoogleUser(result.user);
      setGoogleToken(result.accessToken);
      setStatusMsg(`เชื่อมต่อบัญชี Google (${result.user.email || result.user.displayName}) สำเร็จ พร้อมซิงค์เข้าปฏิทินแล้ว`);
    } catch (err) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('ยกเลิกการเลือกบัญชี Google กรุณากดปุ่มเชื่อมต่อใหม่อีกครั้งเมื่อพร้อม');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้แล้วลองใหม่อีกครั้ง');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชี Google ได้');
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogleAccount = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setShowSyncConfirm(false);
    setSyncCompletedCount(null);
    try {
      await disconnectGoogleCalendarUser();
      setGoogleUser(null);
      setGoogleToken(null);
      setStatusMsg('ยกเลิกการเชื่อมต่อบัญชี Google เรียบร้อยแล้ว');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถออกจากบัญชี Google ได้');
    }
  };

  const handleRequestGoogleSync = () => {
    setErrorMsg('');
    setStatusMsg('');
    if (!googleToken || !googleUser) {
      setErrorMsg('กรุณาเชื่อมต่อบัญชี Google ของคุณก่อนเริ่มซิงค์');
      return;
    }
    if (totalExportCount === 0) {
      setErrorMsg('กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูลที่ต้องการซิงค์');
      return;
    }
    setShowSyncConfirm(true);
  };

  const handleExecuteGoogleSync = async () => {
    if (!googleToken) {
      setShowSyncConfirm(false);
      setErrorMsg('เซสชันการเชื่อมต่อ Google หมดอายุ กรุณาเชื่อมต่อบัญชี Google ใหม่อีกครั้ง');
      return;
    }

    setShowSyncConfirm(false);
    setErrorMsg('');
    setStatusMsg('');
    setSyncCompletedCount(null);
    setIsSyncingGoogle(true);
    setSyncProgress({ completed: 0, total: totalExportCount, summary: 'กำลังเตรียมรายการ...' });

    try {
      const payloads = buildGoogleCalendarEventPayloads({
        slots,
        assignments: activeAssignments,
        courses,
        holidays: holidaysInRange,
        schoolId,
        academicYear,
        semester,
        startDateValue: startDate,
        endDateValue: endDate,
        includeTimetable,
        includeAssignments,
        includeHolidays,
        reminderMinutes,
        excludeHolidays,
      });

      const result = await syncTimetableToGoogleCalendar({
        accessToken: googleToken,
        payloads,
        onProgress: (progress) => setSyncProgress(progress),
      });

      setSyncCompletedCount({ created: result.created, updated: result.updated });
      setStatusMsg(
        `ซิงค์เข้า Google Calendar (${googleUser?.email || ''}) สำเร็จทั้งหมด ${result.total} รายการ (สร้างใหม่ ${result.created}, อัปเดต ${result.updated})${reminderMinutes > 0 ? ` พร้อมแจ้งเตือนล่วงหน้า ${reminderMinutes} นาที` : ''}`
      );
    } catch (err) {
      if (err instanceof GoogleCalendarAuthExpiredError) {
        clearGoogleCalendarAccessToken();
        setGoogleToken(null);
        setGoogleUser(null);
      }
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดระหว่างซิงค์เข้า Google Calendar');
    } finally {
      setIsSyncingGoogle(false);
      setSyncProgress(null);
    }
  };

  const handleDownloadIcs = () => {
    setErrorMsg('');
    setStatusMsg('');
    try {
      const icsContent = buildTimetableIcs(
        slots,
        startDate,
        endDate,
        `${schoolName} - ปฏิทินการเรียนการสอน (${academicYear}/${semester})`,
        schoolId,
        {
          assignments: activeAssignments,
          courses,
          includeTimetable,
          includeAssignments,
          includeHolidays,
          reminderMinutes,
          excludeHolidays,
        }
      );
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        slots.length === 0 && activeAssignments.length > 0
          ? `assignments-${academicYear}-${semester}.ics`
          : `timetable-${academicYear}-${semester}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusMsg(
        `ดาวน์โหลดไฟล์ .ics สำเร็จ (${targetSlotCount} คาบเรียน${reminderMinutes > 0 ? ` · แจ้งเตือนล่วงหน้า ${reminderMinutes} นาที` : ''}, ${targetAssignmentCount} กำหนดส่งงาน, ${targetHolidayCount} วันหยุด)`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ .ics ได้');
    }
  };

  const handleDownloadWallpaper = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setIsExportingWallpaper(true);
    try {
      await downloadTimetableWallpaperPng({
        slots,
        schoolPeriods,
        schoolName,
        filterLabel,
        academicYear,
        semester,
        themeId: wallpaperTheme,
        layoutMode: wallpaperLayout,
      });
      setStatusMsg('บันทึกรูปภาพตารางเรียนขนาดมือถือ (9:16) เรียบร้อยแล้ว นำไปตั้งเป็นภาพหน้าจอล็อก/หน้าจอหลักได้ทันที');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถดาวน์โหลดรูปภาพได้');
    } finally {
      setIsExportingWallpaper(false);
    }
  };

  const handleShareWallpaper = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setIsExportingWallpaper(true);
    try {
      const outcome = await shareTimetableWallpaperPng({
        slots,
        schoolPeriods,
        schoolName,
        filterLabel,
        academicYear,
        semester,
        themeId: wallpaperTheme,
        layoutMode: wallpaperLayout,
      });
      setStatusMsg(
        outcome === 'shared'
          ? 'เปิดหน้าต่างแชร์/บันทึกรูปภาพไปยังมือถือเรียบร้อยแล้ว'
          : 'บันทึกรูปภาพ .png ลงเครื่องเรียบร้อยแล้ว เปิดคลังภาพเพื่อตั้งเป็น Wallpaper ได้เลย'
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถแชร์รูปภาพได้');
    } finally {
      setIsExportingWallpaper(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-card)] text-[var(--color-text-body)] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--color-border)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-card-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] flex items-center justify-center border border-[var(--color-border)]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-title)]">
                เชื่อมต่อปฏิทินแจ้งเตือน &amp; ภาพหน้าจอมือถือ
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                {filterLabel} · {slots.length} คาบ{coTaughtCount > 0 ? ` (สอนคู่ ${coTaughtCount})` : ''} · {activeAssignments.length} งาน · {holidaysInRange.length} วันหยุด
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {statusMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>ซิงค์ปฏิทิน Google &amp; .ics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wallpaper')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'wallpaper'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>ภาพหน้าจอมือถือ (9:16)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>เพิ่มทีละคาบ ({totalExportCount})</span>
            </button>
          </div>

          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* Scope Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={includeTimetable}
                    disabled={slots.length === 0}
                    onChange={(e) => setIncludeTimetable(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-title)] tabular-nums">
                      ตารางเรียน ({slots.length} คาบ)
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      รายสัปดาห์ตลอดภาคเรียน
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={includeAssignments}
                    disabled={activeAssignments.length === 0}
                    onChange={(e) => setIncludeAssignments(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1 tabular-nums">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      กำหนดส่งงาน ({activeAssignments.length})
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      แจ้งเตือนล่วงหน้า 24 ชม.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-rose-400">
                  <input
                    type="checkbox"
                    checked={includeHolidays}
                    onChange={(e) => setIncludeHolidays(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1 tabular-nums">
                      <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                      วันหยุดราชการ ({holidaysInRange.length})
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      รวมวันหยุดชดเชย &amp; โรงเรียน
                    </p>
                  </div>
                </label>
              </div>

              {/* Notification & Holiday Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4">
                <label className="space-y-1.5 text-xs font-bold text-[var(--color-text-title)]">
                  <span className="inline-flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-amber-500" />
                    <span>แจ้งเตือนก่อนเข้าคาบเรียนในปฏิทิน</span>
                  </span>
                  <select
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)] outline-none"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] cursor-pointer self-end">
                  <input
                    type="checkbox"
                    checked={excludeHolidays}
                    onChange={(e) => setExcludeHolidays(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[var(--color-text-title)] block">
                      งดสร้างคาบเรียนตรงวันหยุดอัตโนมัติ
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      ข้ามวันหยุดนักขัตฤกษ์/โรงเรียนใน Google Calendar
                    </span>
                  </div>
                </label>
              </div>

              {(includeTimetable || includeHolidays) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-title)] mb-1.5">
                      วันเริ่มต้นช่วงปฏิทิน
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-title)] mb-1.5">
                      วันสิ้นสุดช่วงปฏิทิน
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Direct Per-User Google Calendar Sync Card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-light)] p-4 space-y-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>ซิงค์เข้า Google Calendar ของฉันโดยตรง</span>
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      ครูและนักเรียนเชื่อมต่อบัญชี Google ของตัวเอง เพื่อนำตาราง ({targetSlotCount} คาบ · {targetAssignmentCount} งาน · {targetHolidayCount} วันหยุด) ลงปฏิทินพร้อมแจ้งเตือนอัตโนมัติ
                    </p>
                  </div>
                </div>

                {!googleToken || !googleUser ? (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isConnectingGoogle}
                      onClick={() => void handleConnectGoogleAccount()}
                      className="gsi-material-button"
                    >
                      <div className="gsi-material-button-state" />
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 48 48"
                            style={{ display: 'block' }}
                          >
                            <path
                              fill="#EA4335"
                              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                            />
                            <path
                              fill="#4285F4"
                              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                            />
                            <path
                              fill="#34A853"
                              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                            />
                            <path fill="none" d="M0 0h48v48H0z" />
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">
                          {isConnectingGoogle ? 'กำลังเชื่อมต่อ Google...' : 'เชื่อมต่อ Google ของฉัน (Sign in with Google)'}
                        </span>
                      </div>
                    </button>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      เลือกบัญชี Google ส่วนตัวได้ทุกเมื่อ
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {googleUser.photoURL ? (
                          <img
                            src={googleUser.photoURL}
                            alt={googleUser.displayName}
                            className="w-8 h-8 rounded-full border border-[var(--color-border)] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {googleUser.displayName}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                            {googleUser.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isConnectingGoogle || isSyncingGoogle}
                          onClick={() => void handleConnectGoogleAccount()}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-card)] cursor-pointer disabled:opacity-50"
                        >
                          สลับบัญชี
                        </button>
                        <button
                          type="button"
                          disabled={isSyncingGoogle}
                          onClick={() => void handleDisconnectGoogleAccount()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>ออก</span>
                        </button>
                      </div>
                    </div>

                    {showSyncConfirm ? (
                      <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-[var(--color-card)] p-4 space-y-3 shadow-sm">
                        <div className="flex items-start gap-2.5">
                          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-xs">
                            <p className="font-bold text-[var(--color-text-title)]">
                              ยืนยันการเพิ่มและอัปเดตกิจกรรมลงใน Google Calendar?
                            </p>
                            <p className="text-[var(--color-text-muted)]">
                              ระบบจะบันทึกรายการต่อไปนี้เข้าบัญชี{' '}
                              <span className="font-semibold text-[var(--color-text-title)]">
                                {googleUser.email}
                              </span>
                            </p>
                            <ul className="list-disc list-inside text-[11px] text-[var(--color-text-body)] space-y-0.5 pt-1 tabular-nums">
                              {includeTimetable && (
                                <li>
                                  ตารางเรียนรายสัปดาห์ {targetSlotCount} คาบ ({startDate} ถึง {endDate})
                                  {excludeHolidays ? ' · ข้ามวันหยุดให้อัตโนมัติ' : ''}
                                </li>
                              )}
                              {includeAssignments && (
                                <li>กำหนดส่งงาน {targetAssignmentCount} รายการ (แจ้งเตือนล่วงหน้า 24 ชม.)</li>
                              )}
                              {includeHolidays && (
                                <li>วันหยุดราชการและวันหยุดโรงเรียน {targetHolidayCount} วัน</li>
                              )}
                              <li>
                                การแจ้งเตือนก่อนเข้าเรียน:{' '}
                                {reminderMinutes > 0
                                  ? `แจ้งเตือนล่วงหน้า ${reminderMinutes} นาที`
                                  : 'ปิดการแจ้งเตือน'}
                              </li>
                            </ul>
                            <p className="text-[11px] text-[var(--color-text-muted)] pt-0.5">
                              หากเคยซิงค์ไว้แล้ว ระบบจะอัปเดตรายการเดิมให้แทนการสร้างซ้ำ
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowSyncConfirm(false)}
                            className="px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold text-[var(--color-text-title)] hover:opacity-90 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleExecuteGoogleSync()}
                            className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 cursor-pointer"
                          >
                            ยืนยันซิงค์ลง Google Calendar ({totalExportCount} รายการ)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={isSyncingGoogle || totalExportCount === 0}
                          onClick={handleRequestGoogleSync}
                          className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
                          <span>
                            {isSyncingGoogle && syncProgress
                              ? `กำลังซิงค์ ${syncProgress.completed}/${syncProgress.total} รายการ...`
                              : `ซิงค์ลง Google Calendar ของฉัน (${totalExportCount} รายการ)`}
                          </span>
                        </button>

                        {syncCompletedCount && (
                          <a
                            href="https://calendar.google.com/calendar/r"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>เปิดดูใน Google Calendar</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Alternative Offline / Apple / Outlook Export & Phone Wallpaper */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-title)] tabular-nums">
                    ทางเลือกอื่น: ดาวน์โหลดไฟล์ .ics หรือทำภาพหน้าจอมือถือ ({targetSlotCount} คาบ · {targetAssignmentCount} งาน · {targetHolidayCount} วันหยุด)
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    ไฟล์ .ics แนบการแจ้งเตือน (VALARM) และข้ามวันหยุดในตัว สำหรับ iPhone/Apple Calendar, Outlook หรือใช้ออฟไลน์
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={totalExportCount === 0}
                    onClick={handleDownloadIcs}
                    className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] disabled:opacity-50 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์ .ics</span>
                  </button>

                  <a
                    href="https://calendar.google.com/calendar/r/settings/export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>หน้านำเข้า .ics</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveTab('wallpaper')}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>ทำภาพหน้าจอมือถือ (9:16)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'wallpaper' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Controls */}
                <div className="md:col-span-7 space-y-4">
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-title)]">
                      <ImageIcon className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>ปรับแต่งภาพตารางเรียนสำหรับหน้าจอมือถือ (1080 × 1920 px)</span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--color-text-muted)] block">
                        ตำแหน่งสำหรับหน้าจอมือถือ
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWallpaperLayout('lockscreen')}
                          className={`px-3 py-2 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                            wallpaperLayout === 'lockscreen'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)]'
                          }`}
                        >
                          <div>หน้าจอล็อก (Lockscreen)</div>
                          <div className="text-[10px] font-normal opacity-80">เว้นด้านบนไม่ให้นาฬิกาบัง</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWallpaperLayout('homescreen')}
                          className={`px-3 py-2 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                            wallpaperLayout === 'homescreen'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)]'
                          }`}
                        >
                          <div>หน้าจอหลัก / รูปอ้างอิง</div>
                          <div className="text-[10px] font-normal opacity-80">ตารางเต็มจอ ช่องใหญ่ขึ้น</div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--color-text-muted)] block">
                        โทนสีภาพหน้าจอ
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(TIMETABLE_WALLPAPER_THEMES) as WallpaperThemeId[]).map((themeKey) => {
                          const t = TIMETABLE_WALLPAPER_THEMES[themeKey];
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setWallpaperTheme(t.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                wallpaperTheme === t.id
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)]'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full border border-slate-400/50 shrink-0"
                                style={{ background: `linear-gradient(135deg, ${t.bgStart}, ${t.bgEnd})` }}
                              />
                              <span className="truncate">{t.labelTh}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={isExportingWallpaper || slots.length === 0}
                      onClick={() => void handleDownloadWallpaper()}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isExportingWallpaper ? 'กำลังสร้างรูป...' : 'บันทึกรูปภาพ (.png)'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isExportingWallpaper || slots.length === 0}
                      onClick={() => void handleShareWallpaper()}
                      className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] disabled:opacity-50 transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>แชร์ / ส่งเข้ามือถือ</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    วิธีตั้งเป็นภาพหน้าจอ: กด <strong>บันทึกรูปภาพ (.png)</strong> แล้วเปิดแอปคลังภาพในมือถือ → เลือกเมนู <strong>ใช้เป็นภาพหน้าจอ (Set as Wallpaper)</strong> สำหรับหน้าจอล็อกหรือหน้าจอหลัก
                  </p>
                </div>

                {/* Live Phone Preview */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="w-[215px] rounded-[2rem] border-4 border-slate-800 dark:border-slate-600 bg-slate-950 p-1.5 shadow-xl">
                    <div className="relative rounded-[1.5rem] overflow-hidden bg-slate-900 aspect-[9/16] flex items-center justify-center">
                      {wallpaperPreviewUrl ? (
                        <img
                          src={wallpaperPreviewUrl}
                          alt="ตัวอย่างภาพตารางเรียนสำหรับหน้าจอมือถือ"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">กำลังสร้างตัวอย่าง...</span>
                      )}
                      {wallpaperLayout === 'lockscreen' && (
                        <div className="pointer-events-none absolute top-4 inset-x-0 text-center text-white/85 drop-shadow">
                          <div className="text-[10px] font-medium">วันจันทร์ที่ 24 พ.ย.</div>
                          <div className="text-2xl font-black tracking-tight leading-none mt-0.5">08:15</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {totalExportCount === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                  กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูลในแท็บปฏิทินเพื่อดูรายการ
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {includeTimetable &&
                    slots.map((slot) => {
                      const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(
                        slot.teacherName,
                        slot.coTeacherName
                      );
                      const addUrl = buildTimetableSlotCalendarTemplateUrl({
                        slot,
                        startDateValue: startDate,
                        endDateValue: endDate,
                      });
                      return (
                        <div
                          key={slot.id}
                          className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-blue-400 transition flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                              {slot.courseCode} - {slot.courseTitleTh || slot.courseTitleEn} · {slot.classRoom}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                วัน{DAY_LABELS_TH[slot.dayOfWeek] || slot.dayOfWeek} · คาบ {slot.periodNumber} ({slot.startTime} - {slot.endTime})
                              </span>
                              {(slot.room || slot.classRoom) && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {slot.room || slot.classRoom}
                                </span>
                              )}
                            </div>
                            {(teacherName || coTeacherName) && (
                              <p className="text-[11px] text-[var(--color-text-muted)] mt-1 inline-flex items-center gap-1">
                                <Users className="w-3 h-3 text-emerald-600" />
                                {teacherName}
                                {coTeacherName ? ` · ครูสอนคู่: ${coTeacherName}` : ''}
                              </p>
                            )}
                          </div>
                          {addUrl && (
                            <a
                              href={addUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-title)] hover:text-blue-600 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              เพิ่มลงปฏิทิน
                            </a>
                          )}
                        </div>
                      );
                    })}

                  {includeAssignments &&
                    activeAssignments.map((assignment) => {
                      const course = courseMap.get(assignment.courseId);
                      const courseCode = assignment.courseCode || course?.code || '';
                      const addUrl = buildAssignmentCalendarTemplateUrl({
                        assignment,
                        courses,
                      });
                      return (
                        <div
                          key={assignment.id}
                          className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-indigo-400 transition flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                              {courseCode ? `[${courseCode}] ` : ''}
                              {assignment.titleTh || assignment.titleEn} · กำหนดส่งงาน
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                ครบกำหนด: {assignment.dueDate}
                              </span>
                            </div>
                          </div>
                          {addUrl && (
                            <a
                              href={addUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-title)] hover:text-indigo-600 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              เพิ่มลงปฏิทิน
                            </a>
                          )}
                        </div>
                      );
                    })}

                  {includeHolidays &&
                    holidaysInRange.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            {holiday.nameTh} · {holiday.type === 'school' ? 'วันหยุดโรงเรียน' : 'วันหยุดราชการ'}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-1 tabular-nums">
                            {holiday.date} · {holiday.nameEn}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
