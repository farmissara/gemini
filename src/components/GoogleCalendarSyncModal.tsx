import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { TimetableSlot } from '../types';
import {
  addCalendarDays,
  buildTimetableIcs,
  formatCalendarDate,
} from '../lib/timetableCalendar';
import { parseSlotTeachersFromRaw } from '../lib/timetableTeachers';
import {
  deleteSyncedTimetableEvents,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
  getGoogleCalendarToken,
  getGoogleCalendarUser,
  GoogleCalendarEventItem,
  GoogleCalendarListItem,
  googleCalendarSignIn,
  googleCalendarSignOut,
  listSyncedTimetableEvents,
  subscribeGoogleCalendarAuth,
  syncTimetableSlotsToGoogleCalendar,
} from '../lib/googleCalendar';

interface GoogleCalendarSyncModalProps {
  slots: TimetableSlot[];
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

type PendingConfirmation =
  | { type: 'sync' }
  | { type: 'delete'; eventIds: string[] }
  | null;

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  slots,
  schoolId,
  schoolName,
  academicYear,
  semester,
  filterLabel,
  defaultStartDate,
  defaultEndDate,
  calendarWeekStart,
  onClose,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(() => getGoogleCalendarUser());
  const [accessToken, setAccessToken] = useState<string | null>(() => getGoogleCalendarToken());
  const [activeTab, setActiveTab] = useState<'sync' | 'events'>('sync');

  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [liveEvents, setLiveEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [syncedEvents, setSyncedEvents] = useState<GoogleCalendarEventItem[]>([]);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const coTaughtCount = useMemo(
    () => slots.filter((s) => Boolean(parseSlotTeachersFromRaw(s.teacherName, s.coTeacherName).coTeacherName)).length,
    [slots]
  );

  const selectedCalendar = useMemo(
    () => calendars.find((c) => c.id === selectedCalendarId) || null,
    [calendars, selectedCalendarId]
  );

  useEffect(() => {
    const unsubscribe = subscribeGoogleCalendarAuth((user) => {
      setGoogleUser(user);
      const token = getGoogleCalendarToken();
      setAccessToken(token);
      if (!user || !token) {
        setCalendars([]);
        setLiveEvents([]);
        setSyncedEvents([]);
      }
    });
    return unsubscribe;
  }, []);

  const loadCalendarWorkspaceData = useCallback(
    async (token: string, calendarId: string) => {
      setIsLoadingData(true);
      setErrorMsg('');
      try {
        const list = await fetchGoogleCalendars(token);
        setCalendars(list);
        const targetId =
          list.some((c) => c.id === calendarId)
            ? calendarId
            : list.find((c) => c.primary)?.id || list[0]?.id || 'primary';
        setSelectedCalendarId(targetId);

        const weekStartIso = `${calendarWeekStart}T00:00:00+07:00`;
        const weekEndIso = `${addCalendarDays(calendarWeekStart, 6)}T23:59:59+07:00`;
        const termKey = `${academicYear}-${semester}`;

        const [events, synced] = await Promise.all([
          fetchGoogleCalendarEvents(token, targetId, weekStartIso, weekEndIso),
          listSyncedTimetableEvents(token, targetId, schoolId, termKey),
        ]);
        setLiveEvents(events);
        setSyncedEvents(synced);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูล Google Calendar ได้';
        setErrorMsg(message);
        if (!getGoogleCalendarToken()) {
          setAccessToken(null);
        }
      } finally {
        setIsLoadingData(false);
      }
    },
    [academicYear, calendarWeekStart, schoolId, semester]
  );

  useEffect(() => {
    if (accessToken) {
      void loadCalendarWorkspaceData(accessToken, selectedCalendarId);
    }
  }, [accessToken, calendarWeekStart]);

  const handleSignIn = async () => {
    setIsConnecting(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const { user, accessToken: freshToken } = await googleCalendarSignIn();
      setGoogleUser(user);
      setAccessToken(freshToken);
      setStatusMsg(`เชื่อมต่อบัญชี Google (${user.email || user.displayName || 'สำเร็จ'}) เรียบร้อยแล้ว`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบ Google ได้');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg('');
    setStatusMsg('');
    try {
      await googleCalendarSignOut();
      setAccessToken(null);
      setCalendars([]);
      setLiveEvents([]);
      setSyncedEvents([]);
      setStatusMsg('ยกเลิกการเชื่อมต่อ Google Calendar เรียบร้อยแล้ว');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถออกจากระบบ Google ได้');
    }
  };

  const handleCalendarChange = async (newCalId: string) => {
    setSelectedCalendarId(newCalId);
    if (!accessToken) return;
    await loadCalendarWorkspaceData(accessToken, newCalId);
  };

  const handleConfirmSync = async () => {
    if (!accessToken) return;
    setIsMutating(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const result = await syncTimetableSlotsToGoogleCalendar({
        token: accessToken,
        calendarId: selectedCalendarId,
        slots,
        schoolId,
        startDateValue: startDate,
        endDateValue: endDate,
      });

      const summaryParts = [
        result.createdCount > 0 ? `สร้างใหม่ ${result.createdCount} คาบ` : '',
        result.updatedCount > 0 ? `อัปเดต ${result.updatedCount} คาบ` : '',
        result.skippedCount > 0 ? `ข้าม ${result.skippedCount} คาบ` : '',
      ].filter(Boolean);

      if (result.errors.length > 0) {
        setErrorMsg(`บางรายการซิงค์ไม่สำเร็จ: ${result.errors.slice(0, 3).join(', ')}`);
      }
      setStatusMsg(
        `ซิงค์ตารางเรียนไปยังปฏิทิน "${selectedCalendar?.summary || selectedCalendarId}" สำเร็จ (${summaryParts.join(' · ') || 'ตรวจสอบแล้ว'})`
      );
      setPendingConfirmation(null);
      await loadCalendarWorkspaceData(accessToken, selectedCalendarId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถซิงค์ข้อมูลขึ้น Google Calendar ได้');
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmDeleteSynced = async (eventIds: string[]) => {
    if (!accessToken) return;
    setIsMutating(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const result = await deleteSyncedTimetableEvents(accessToken, selectedCalendarId, eventIds);
      if (result.errors.length > 0) {
        setErrorMsg(`ลบบางรายการไม่สำเร็จ: ${result.errors[0]}`);
      }
      setStatusMsg(`ลบกิจกรรมตารางสอนที่เคยซิงค์ออกจากปฏิทินแล้ว ${result.deletedCount} รายการ`);
      setPendingConfirmation(null);
      await loadCalendarWorkspaceData(accessToken, selectedCalendarId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถลบกิจกรรมออกจาก Google Calendar ได้');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDownloadIcsFallback = () => {
    setErrorMsg('');
    try {
      const icsContent = buildTimetableIcs(
        slots,
        startDate,
        endDate,
        `${schoolName} - ตารางเรียน (${academicYear}/${semester})`,
        schoolId
      );
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable-${academicYear}-${semester}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusMsg('ดาวน์โหลดไฟล์ .ics สำเร็จแล้ว');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ .ics ได้');
    }
  };

  const formatEventTimeRange = (ev: GoogleCalendarEventItem) => {
    const startRaw = ev.start?.dateTime || ev.start?.date || '';
    const endRaw = ev.end?.dateTime || ev.end?.date || '';
    if (!startRaw) return 'ตลอดวัน';
    if (!ev.start?.dateTime) return `${startRaw} (ทั้งวัน)`;
    const startDateObj = new Date(startRaw);
    const endDateObj = endRaw ? new Date(endRaw) : null;
    const dateLabel = startDateObj.toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const startTime = startDateObj.toLocaleTimeString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const endTime = endDateObj
      ? endDateObj.toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '';
    return `${dateLabel} · ${startTime}${endTime ? ` - ${endTime}` : ''}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">เชื่อมต่อ Google Calendar</h3>
              <p className="text-xs text-slate-500">
                {filterLabel} · {slots.length} คาบ{coTaughtCount > 0 ? ` (มีสอนคู่ ${coTaughtCount} คาบ)` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status & Error Alerts */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {statusMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Google Account Connection Panel */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            {!accessToken ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {googleUser
                      ? `บัญชี: ${googleUser.email || googleUser.displayName} (กรุณายืนยันสิทธิ์ใหม่)`
                      : 'ยังไม่ได้เชื่อมต่อบัญชี Google'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    เข้าสู่ระบบด้วย Google เพื่อซิงค์คาบเรียนแบบรายสัปดาห์และดูตารางกิจกรรมจริงจาก Google Calendar
                  </p>
                </div>

                {/* Official Google Sign-In Button Styling */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isConnecting}
                  className="inline-flex items-center justify-center gap-3 h-10 px-4 rounded-full bg-white border border-[#747775] text-[#1f1f1f] text-sm font-medium shadow-xs hover:bg-slate-50 disabled:opacity-60 transition shrink-0"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48" aria-hidden="true">
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
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {googleUser?.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName || 'Google'}
                        className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                        {(googleUser?.displayName || googleUser?.email || 'G')[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {googleUser?.displayName || 'บัญชี Google'}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          เชื่อมต่อแล้ว
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">{googleUser?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => accessToken && void loadCalendarWorkspaceData(accessToken, selectedCalendarId)}
                      disabled={isLoadingData}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                      รีเฟรช
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>

                {/* Target Calendar Picker */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    เลือกปฏิทิน Google Calendar ปลายทาง
                  </label>
                  <select
                    value={selectedCalendarId}
                    onChange={(e) => void handleCalendarChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {calendars.length === 0 ? (
                      <option value="primary">ปฏิทินหลัก (Primary)</option>
                    ) : (
                      calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary} {cal.primary ? '(ปฏิทินหลัก)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          {accessToken && (
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('sync')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'sync'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ซิงค์ตารางเรียนขึ้น Google Calendar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'events'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                กิจกรรมในปฏิทินสัปดาห์นี้ ({liveEvents.length})
              </button>
            </div>
          )}

          {/* Sync Controls */}
          {(!accessToken || activeTab === 'sync') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">วันเริ่มต้นภาคเรียน</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">วันสิ้นสุดภาคเรียน</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                  />
                </div>
              </div>

              {accessToken && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-blue-950">
                        พร้อมซิงค์ {slots.length} คาบเรียนแบบรายสัปดาห์ (Asia/Bangkok)
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        ระบบจะอัปเดตคาบที่เคยซิงค์ไว้แล้วอัตโนมัติ (ไม่สร้างซ้ำ) และแนบชื่อครูสอนคู่ในรายละเอียดกิจกรรม
                      </p>
                      {syncedEvents.length > 0 && (
                        <p className="text-[11px] font-bold text-slate-600 mt-1.5">
                          พบคาบที่เคยซิงค์จาก EduVerse ในภาคเรียนนี้แล้ว {syncedEvents.length} รายการ
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={slots.length === 0 || isMutating || isLoadingData}
                      onClick={() => setPendingConfirmation({ type: 'sync' })}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <UploadCloud className="w-4 h-4" />
                      ซิงค์ขึ้น Google Calendar ({slots.length} คาบ)
                    </button>

                    {syncedEvents.length > 0 && (
                      <button
                        type="button"
                        disabled={isMutating || isLoadingData}
                        onClick={() =>
                          setPendingConfirmation({
                            type: 'delete',
                            eventIds: syncedEvents.map((ev) => ev.id),
                          })
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 disabled:opacity-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        ลบคาบที่เคยซิงค์ออก ({syncedEvents.length})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ICS Fallback Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">ส่งออกไฟล์ .ics (Apple Calendar / Outlook / นำเข้าด้วยตนเอง)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ดาวน์โหลดไฟล์มาตรฐานปฏิทินสากลรวมรายชื่อครูผู้สอนหลักและครูสอนคู่
                  </p>
                </div>
                <button
                  type="button"
                  disabled={slots.length === 0}
                  onClick={handleDownloadIcsFallback}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  ดาวน์โหลด .ics
                </button>
              </div>
            </div>
          )}

          {/* Live Google Calendar Events Tab */}
          {accessToken && activeTab === 'events' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  ช่วงวันที่ {formatCalendarDate(calendarWeekStart)} – {formatCalendarDate(addCalendarDays(calendarWeekStart, 6))}
                </span>
                <span className="font-bold text-slate-700">{selectedCalendar?.summary || selectedCalendarId}</span>
              </div>

              {isLoadingData ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  กำลังโหลดกิจกรรมจาก Google Calendar...
                </div>
              ) : liveEvents.length === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                  ยังไม่มีกิจกรรมในสัปดาห์นี้บนปฏิทินที่เลือก
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {liveEvents.map((ev) => {
                    const isEduverse = Boolean(ev.extendedProperties?.private?.eduverseSlotId);
                    return (
                      <div
                        key={ev.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 transition flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {ev.summary || '(ไม่มีหัวข้อ)'}
                            </p>
                            {isEduverse && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                                EduVerse
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatEventTimeRange(ev)}
                            </span>
                            {ev.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {ev.location}
                              </span>
                            )}
                          </div>
                          {ev.description && ev.description.includes('ครูสอนคู่:') && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-1 inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {ev.description
                                .split('\n')
                                .find((line) => line.startsWith('ครูสอนคู่:'))}
                            </p>
                          )}
                        </div>
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
                            title="เปิดดูใน Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Explicit Confirmation Overlay Before Any Google Calendar Write/Delete */}
        {pendingConfirmation && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    pendingConfirmation.type === 'delete'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {pendingConfirmation.type === 'delete' ? (
                    <Trash2 className="w-5 h-5" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {pendingConfirmation.type === 'delete'
                      ? 'ยืนยันการลบกิจกรรมออกจาก Google Calendar'
                      : 'ยืนยันการซิงค์ตารางเรียนขึ้น Google Calendar'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {pendingConfirmation.type === 'delete'
                      ? `กำลังจะลบกิจกรรมที่ซิงค์จาก EduVerse จำนวน ${pendingConfirmation.eventIds.length} รายการ ออกจากปฏิทิน "${selectedCalendar?.summary || selectedCalendarId}" การลบไม่สามารถกู้คืนได้`
                      : `กำลังจะสร้าง/อัปเดตคาบเรียนรายสัปดาห์จำนวน ${slots.length} คาบ ลงในปฏิทิน "${selectedCalendar?.summary || selectedCalendarId}" ช่วงวันที่ ${startDate} ถึง ${endDate}`}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => setPendingConfirmation(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => {
                    if (pendingConfirmation.type === 'sync') {
                      void handleConfirmSync();
                    } else {
                      void handleConfirmDeleteSynced(pendingConfirmation.eventIds);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-60 ${
                    pendingConfirmation.type === 'delete'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {pendingConfirmation.type === 'delete' ? 'ยืนยันลบกิจกรรม' : 'ยืนยันซิงค์ข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
