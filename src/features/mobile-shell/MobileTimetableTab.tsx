import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  Edit3,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  RefreshCw,
  StickyNote,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  Course,
  LeaveRequest,
  PeriodAttendanceRecord,
  School,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../../types';
import { slotMatchesLoggedInTeacher } from '../../lib/courseTeacherFilter';
import { getSlotAttendanceAndLeaveSummary } from '../../lib/timetableAttendanceStatus';
import { getTimetableSlotActivityStatus, type BangkokClockSnapshot } from '../../lib/timetableCalendar';
import {
  CALENDAR_NOTE_COLORS,
  CALENDAR_NOTES_UPDATED_EVENT,
  CalendarNote,
  CalendarNoteColor,
  CalendarNoteScope,
  deleteCalendarNote,
  getCalendarNoteColorMeta,
  getVisibleCalendarNotesForDate,
  saveCalendarNote,
} from '../../lib/calendarNotes';
import {
  getHolidaysForDate,
  getHolidaysForYear,
  getHolidaysInMonth,
  getThaiHolidayCategoryLabel,
  isWeekendDate,
  type HolidaySyncStatus,
  type ThaiHoliday,
} from '../../lib/thaiHolidays';
import { PeriodTimeMissionsCard } from '../../components/PeriodTimeMissionsCard';
import { enterLandscapeGameMode, exitLandscapeGameMode } from '../../lib/screenOrientation';
import { printTimetableLandscape, setTimetableLandscapePageRule } from '../../lib/timetablePrint';
import { getTimetableSlotCardStyle } from '../../lib/timetableColors';

interface MobileTimetableTabProps {
  activeSchool: School;
  currentUser: AuthUser | null;
  currentRole: UserRole;
  lang: AppLanguage;
  isRestrictedViewer: boolean;
  canSelfCheckin: boolean;
  courses: Course[];
  scopedCourses: Course[];
  scopedTimetableSlots: TimetableSlot[];
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  schoolPeriods: SchoolPeriodTime[];
  matchedTeacher: Teacher | undefined;
  bangkokClock: BangkokClockSnapshot;
  todayBangkokStr: string;
  currentBangkokYear: number;
  todayDayKey: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  todayHoliday: ThaiHoliday | null;
  todayMySlots: TimetableSlot[];
  mobileTimetableMode: 'day' | 'calendar';
  setMobileTimetableMode: (mode: 'day' | 'calendar') => void;
  timetableOnlyMine: boolean;
  setTimetableOnlyMine: React.Dispatch<React.SetStateAction<boolean>>;
  mobileCalendarMonthCursor: { year: number; month: number };
  setMobileCalendarMonthCursor: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>;
  holidaySyncStatus: HolidaySyncStatus | null;
  isSyncingHolidays: boolean;
  onManualHolidaySync: (targetYear?: number) => Promise<void>;
  onOpenCalendarSync: () => void;
  onOpenPeriodCheckinTab: () => void;
  getSlotTodayCheckStatus: (
    slot: TimetableSlot,
    dateValue: string
  ) => { hasCheckIn: boolean; hasCheckOut: boolean };
  openPeriodCheckinFromSlot: (
    slot: TimetableSlot,
    dateValue: string,
    checkType: 'check_in' | 'check_out'
  ) => void;
  onOpenPeriodRoster: (target: { slot: TimetableSlot; date: string }) => void;
  onBackHome: () => void;
}

export const MobileTimetableTab: React.FC<MobileTimetableTabProps> = ({
  activeSchool,
  currentUser,
  currentRole,
  lang,
  isRestrictedViewer,
  canSelfCheckin,
  courses,
  scopedCourses,
  scopedTimetableSlots,
  students,
  teachers,
  attendance,
  periodAttendance,
  leaveRequests,
  schoolPeriods,
  matchedTeacher,
  bangkokClock,
  todayBangkokStr,
  currentBangkokYear,
  todayDayKey,
  todayHoliday,
  todayMySlots,
  mobileTimetableMode,
  setMobileTimetableMode,
  timetableOnlyMine,
  setTimetableOnlyMine,
  mobileCalendarMonthCursor,
  setMobileCalendarMonthCursor,
  holidaySyncStatus,
  isSyncingHolidays,
  onManualHolidaySync,
  onOpenCalendarSync,
  onOpenPeriodCheckinTab,
  getSlotTodayCheckStatus,
  openPeriodCheckinFromSlot,
  onOpenPeriodRoster,
  onBackHome,
}) => {
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<
    'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  >(todayDayKey);
  const [mobileSelectedCalendarDate, setMobileSelectedCalendarDate] = useState<string>(todayBangkokStr);
  const [mobileCalendarNotesTick, setMobileCalendarNotesTick] = useState(0);
  const [showMobileNoteForm, setShowMobileNoteForm] = useState(false);
  const [mobileEditingNoteId, setMobileEditingNoteId] = useState<string | null>(null);
  const [mobileNoteTitle, setMobileNoteTitle] = useState('');
  const [mobileNoteContent, setMobileNoteContent] = useState('');
  const [mobileNoteScope, setMobileNoteScope] = useState<CalendarNoteScope>('personal');
  const [mobileNoteColor, setMobileNoteColor] = useState<CalendarNoteColor>('amber');
  const [showLandscapeWeekly, setShowLandscapeWeekly] = useState(false);
  const landscapeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimetableLandscapePageRule(showLandscapeWeekly);
    return () => {
      setTimetableLandscapePageRule(false);
    };
  }, [showLandscapeWeekly]);

  useEffect(() => {
    const onNotesUpdated = () => setMobileCalendarNotesTick((v) => v + 1);
    window.addEventListener(CALENDAR_NOTES_UPDATED_EVENT, onNotesUpdated);
    return () => {
      window.removeEventListener(CALENDAR_NOTES_UPDATED_EVENT, onNotesUpdated);
    };
  }, []);

  const monthHolidays = getHolidaysInMonth(
    mobileCalendarMonthCursor.year,
    mobileCalendarMonthCursor.month,
    activeSchool.id
  );
  const firstDayOfMonth = new Date(
    Date.UTC(mobileCalendarMonthCursor.year, mobileCalendarMonthCursor.month, 1)
  );
  const daysInMonth = new Date(
    Date.UTC(mobileCalendarMonthCursor.year, mobileCalendarMonthCursor.month + 1, 0)
  ).getUTCDate();
  const leadingBlanks = (firstDayOfMonth.getUTCDay() + 6) % 7;
  const monthCells: Array<{ dateStr: string; dayNum: number } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${mobileCalendarMonthCursor.year}-${String(mobileCalendarMonthCursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { dateStr, dayNum: d };
    }),
  ];
  const monthTitleTh = firstDayOfMonth.toLocaleDateString('th-TH', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
  const selectedCalDateObj = new Date(`${mobileSelectedCalendarDate}T00:00:00Z`);
  const calDayKey =
    ([null, 'mon', 'tue', 'wed', 'thu', 'fri', null] as const)[selectedCalDateObj.getUTCDay()] || null;
  const selectedDateHolidays = getHolidaysForDate(mobileSelectedCalendarDate, activeSchool.id);
  const selectedCalDaySlots = calDayKey
    ? scopedTimetableSlots
        .filter((s) => s.dayOfWeek === calDayKey)
        .filter(
          (s) =>
            !(currentRole === 'teacher' && timetableOnlyMine) ||
            slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, courses)
        )
        .slice()
        .sort((a, b) => a.periodNumber - b.periodNumber)
    : [];

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[40px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {canSelfCheckin && (currentRole === 'student' || currentRole === 'teacher') && (
            <button
              type="button"
              onClick={onOpenPeriodCheckinTab}
              className="min-h-[36px] px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>เช็คอินรายคาบ</span>
            </button>
          )}
          {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin') && (
            <button
              type="button"
              disabled={isSyncingHolidays}
              onClick={() => void onManualHolidaySync(mobileCalendarMonthCursor.year)}
              className="min-h-[36px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-text-title)] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-card-subtle)] disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-500 ${isSyncingHolidays ? 'animate-spin' : ''}`} />
              <span>{isSyncingHolidays ? 'กำลังซิงค์...' : 'ซิงค์วันหยุด'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCalendarSync}
            className="min-h-[36px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-primary-text)] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-card-subtle)]"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'เชื่อมต่อ Calendar' : 'Sync .ics'}</span>
          </button>
        </div>
      </div>

      {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin') && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 truncate">
            <span className="font-bold text-[var(--color-text-title)]">
              วันหยุดราชการไทย ({currentBangkokYear + 543})
            </span>
            <span className="text-[var(--color-text-muted)] ml-1.5 tabular-nums">
              · {getHolidaysForYear(currentBangkokYear, activeSchool.id).length} วัน
              {holidaySyncStatus && !holidaySyncStatus.usedFallback ? ' (ซิงค์ API แล้ว)' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileTimetableMode('calendar')}
            className="text-[11px] font-bold text-[var(--color-primary-text)] shrink-0 cursor-pointer"
          >
            ดูปฏิทินวันหยุด
          </button>
        </div>
      )}

      {/* Mode Switch: Day vs Month Calendar + Landscape Weekly */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <button
            type="button"
            onClick={() => setMobileTimetableMode('day')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer transition ${
              mobileTimetableMode === 'day'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-body)]'
            }`}
          >
            {currentRole === 'teacher' ? 'รายวัน (สอน)' : 'ตารางเรียนรายวัน'}
          </button>
          <button
            type="button"
            onClick={() => setMobileTimetableMode('calendar')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer transition ${
              mobileTimetableMode === 'calendar'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-body)]'
            }`}
          >
            ปฏิทิน + วันหยุด
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setShowLandscapeWeekly(true);
              void enterLandscapeGameMode(landscapeContainerRef.current);
            }}
            className="min-h-[36px] px-3 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'ตารางสัปดาห์แนวนอน' : 'Landscape Grid'}</span>
          </button>

          {currentRole === 'teacher' && (
            <button
              type="button"
              onClick={() => setTimetableOnlyMine((prev) => !prev)}
              className={`min-h-[36px] px-3 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                timetableOnlyMine
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)]'
              }`}
            >
              {timetableOnlyMine ? (lang === 'th' ? 'คาบฉัน' : 'Mine') : lang === 'th' ? 'ทั้งหมด' : 'All'}
            </button>
          )}
        </div>
      </div>

      {mobileTimetableMode === 'day' ? (
        <>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            {(
              [
                { id: 'mon', th: 'จ.', en: 'Mon' },
                { id: 'tue', th: 'อ.', en: 'Tue' },
                { id: 'wed', th: 'พ.', en: 'Wed' },
                { id: 'thu', th: 'พฤ.', en: 'Thu' },
                { id: 'fri', th: 'ศ.', en: 'Fri' },
                { id: 'sat', th: 'ส.', en: 'Sat' },
                { id: 'sun', th: 'อา.', en: 'Sun' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedTimetableDay(d.id)}
                className={`min-h-[36px] flex-1 px-3 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
                  selectedTimetableDay === d.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                {lang === 'th' ? d.th : d.en}
              </button>
            ))}
          </div>

          {selectedTimetableDay === todayDayKey && todayHoliday && (
            <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-3.5 text-xs space-y-1">
              <p className="font-bold text-rose-700 dark:text-rose-200 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>วันนี้หยุด: {todayHoliday.nameTh}</span>
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-300">
                งดการเรียนการสอนปกติตามปฏิทินวันหยุดราชการ/โรงเรียน
              </p>
            </div>
          )}

          {selectedTimetableDay === todayDayKey &&
            !todayHoliday &&
            !isWeekendDate(todayBangkokStr) &&
            canSelfCheckin &&
            (currentRole === 'student' || currentRole === 'teacher') &&
            todayMySlots.length > 0 && (
              <PeriodTimeMissionsCard
                compact={true}
                slots={todayMySlots}
                schoolPeriods={schoolPeriods}
                bangkokClock={bangkokClock}
                schoolId={activeSchool.id}
                targetDateStr={todayBangkokStr}
                currentRole={currentRole}
                lang={lang}
                canSelfCheckin={canSelfCheckin}
                getSlotCheckStatus={(s, d) => getSlotTodayCheckStatus(s, d)}
                onTriggerCheckin={openPeriodCheckinFromSlot}
                periodAttendance={periodAttendance}
              />
            )}

          {(() => {
            const daySlots = scopedTimetableSlots
              .filter((s) => s.dayOfWeek === selectedTimetableDay)
              .filter((s) => {
                if (currentRole === 'teacher' && timetableOnlyMine) {
                  return slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, courses);
                }
                return true;
              })
              .slice()
              .sort((a, b) => a.periodNumber - b.periodNumber);

            if (daySlots.length === 0) {
              return (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-muted)] space-y-2">
                  <Calendar className="w-8 h-8 mx-auto opacity-60" />
                  <p>{lang === 'th' ? 'ไม่มีคาบเรียนในวันที่เลือก' : 'No scheduled periods for this day'}</p>
                </div>
              );
            }

            return (
              <div className="space-y-2.5">
                {daySlots.map((slot) => {
                  const course = scopedCourses.find((c) => c.id === slot.courseId || c.code === slot.courseCode);
                  const status = getSlotTodayCheckStatus(slot, todayBangkokStr);
                  const slotActivity = getTimetableSlotActivityStatus({
                    slot,
                    schoolPeriods,
                    now: bangkokClock,
                    schoolId: activeSchool.id,
                  });
                  const nextCheckType: 'check_in' | 'check_out' =
                    status.hasCheckIn && !status.hasCheckOut ? 'check_out' : 'check_in';
                  const canShowMobileDayCheckin =
                    (currentRole === 'teacher' || currentRole === 'student') &&
                    canSelfCheckin &&
                    (slotActivity.isActive ||
                      (selectedTimetableDay === todayDayKey &&
                        slotActivity.isTodayWeekday &&
                        !slotActivity.isHolidayOff));
                  return (
                    <div
                      key={slot.id}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
                        slotActivity.isActive
                          ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/75 dark:bg-rose-950/35 shadow-sm'
                          : 'border-[var(--color-border)] bg-[var(--color-card)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums">
                            <span>{lang === 'th' ? `คาบที่ ${slot.periodNumber}` : `Period ${slot.periodNumber}`}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {slotActivity.startTime || '--:--'} - {slotActivity.endTime || '--:--'}
                            </span>
                            {slotActivity.isActive && (
                              <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                ถึงคาบเรียน
                                {slotActivity.remainingMinutes !== null
                                  ? ` · เหลือ ${slotActivity.remainingMinutes} น.`
                                  : ''}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                            {slot.courseCode} ·{' '}
                            {lang === 'th'
                              ? course?.titleTh || slot.courseTitleTh || slot.courseCode || 'รายวิชา'
                              : course?.titleEn || slot.courseTitleEn || slot.courseCode || 'Course'}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {slot.classRoom || ''}
                            {slot.room ? ` · ห้อง ${slot.room}` : ''}
                            {slot.teacherName ? ` · ${slot.teacherName}` : ''}
                          </p>
                        </div>
                        {(status.hasCheckIn || status.hasCheckOut) && slot.dayOfWeek === todayDayKey && (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {status.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                          </span>
                        )}
                      </div>

                      {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin') &&
                        (() => {
                          const slotSummary = getSlotAttendanceAndLeaveSummary({
                            slot,
                            dateStr: todayBangkokStr,
                            courses: scopedCourses,
                            students,
                            teachers,
                            attendance,
                            periodAttendance,
                            leaveRequests,
                          });
                          const leavingTeacher = slotSummary.teacherStatuses.find(
                            (ts) => ts.status === 'on_leave_approved' || ts.status === 'on_leave_pending'
                          );
                          const primaryTeacher = slotSummary.teacherStatuses[0];
                          return (
                            <div className="space-y-2 pt-1.5 border-t border-[var(--color-border)]">
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                {leavingTeacher ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold">
                                    ครูลา
                                    {leavingTeacher.substituteTeacherName
                                      ? ` · แทน ${leavingTeacher.substituteTeacherName}`
                                      : ''}
                                  </span>
                                ) : selectedTimetableDay === todayDayKey && primaryTeacher ? (
                                  primaryTeacher.status === 'checked_in' ? (
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold tabular-nums">
                                      ครูเข้า รร.{primaryTeacher.checkInTime ? ` ${primaryTeacher.checkInTime}` : ''}
                                    </span>
                                  ) : primaryTeacher.status === 'late' ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold">
                                      ครูสาย รร.
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold">
                                      ครูยังไม่เช็คอิน รร.
                                    </span>
                                  )
                                ) : null}
                                {slotSummary.periodCheckedTotal > 0 ? (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 font-bold tabular-nums">
                                      มา {slotSummary.periodPresent + slotSummary.periodLate}/
                                      {slotSummary.expectedTotal}
                                    </span>
                                    {slotSummary.periodExcused > 0 && (
                                      <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold tabular-nums">
                                        ลา {slotSummary.periodExcused}
                                      </span>
                                    )}
                                    {slotSummary.periodAbsent > 0 && (
                                      <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold tabular-nums">
                                        ขาด {slotSummary.periodAbsent}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {slotSummary.studentLeaveCount > 0 && (
                                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold tabular-nums">
                                        นร.ลา {slotSummary.studentLeaveCount}
                                      </span>
                                    )}
                                    {selectedTimetableDay === todayDayKey &&
                                      slotSummary.hasAnyGateRecordsForDate &&
                                      slotSummary.expectedTotal > 0 && (
                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold tabular-nums">
                                          เข้า รร. {slotSummary.gatePresentCount}/{slotSummary.expectedTotal}
                                        </span>
                                      )}
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => onOpenPeriodRoster({ slot, date: todayBangkokStr })}
                                className="w-full min-h-[40px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                              >
                                <UserCheck className="w-4 h-4 shrink-0" />
                                <span>รายชื่อ / เช็กชื่อนักเรียน</span>
                              </button>
                            </div>
                          );
                        })()}

                      {canShowMobileDayCheckin && (
                        <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
                          <button
                            type="button"
                            onClick={() => openPeriodCheckinFromSlot(slot, todayBangkokStr, nextCheckType)}
                            className={`flex-1 min-h-[44px] px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm ${
                              slotActivity.isActive
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : nextCheckType === 'check_out'
                                  ? 'bg-slate-800 hover:bg-slate-900'
                                  : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                            }`}
                          >
                            {nextCheckType === 'check_out' ? (
                              <LogOut className="w-4 h-4" />
                            ) : (
                              <LogIn className="w-4 h-4" />
                            )}
                            <span>
                              {status.hasCheckIn && status.hasCheckOut
                                ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
                                : nextCheckType === 'check_out'
                                  ? 'เช็คเอาท์คาบเรียน'
                                  : slotActivity.isActive
                                    ? 'เช็คอินเข้าคาบตอนนี้'
                                    : 'เช็คอินเข้าคาบเรียน'}
                            </span>
                          </button>
                          {!status.hasCheckIn && (
                            <button
                              type="button"
                              onClick={() => openPeriodCheckinFromSlot(slot, todayBangkokStr, 'check_out')}
                              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                                slotActivity.isActive
                                  ? 'border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-200'
                                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                              }`}
                            >
                              <LogOut className="w-4 h-4" />
                              <span>เช็คเอาท์</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      ) : (
        <div className="space-y-3">
          {/* Month Selector Header */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            <button
              type="button"
              onClick={() =>
                setMobileCalendarMonthCursor((prev) =>
                  prev.month === 0
                    ? { year: prev.year - 1, month: 11 }
                    : { year: prev.year, month: prev.month - 1 }
                )
              }
              className="min-h-[38px] px-3 rounded-xl border border-[var(--color-border)] text-xs font-bold cursor-pointer"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileCalendarMonthCursor({
                  year: Number(todayBangkokStr.slice(0, 4)),
                  month: Number(todayBangkokStr.slice(5, 7)) - 1,
                });
                setMobileSelectedCalendarDate(todayBangkokStr);
              }}
              className="text-sm font-bold text-[var(--color-text-title)] cursor-pointer"
            >
              {monthTitleTh}
            </button>
            <button
              type="button"
              onClick={() =>
                setMobileCalendarMonthCursor((prev) =>
                  prev.month === 11
                    ? { year: prev.year + 1, month: 0 }
                    : { year: prev.year, month: prev.month + 1 }
                )
              }
              className="min-h-[38px] px-3 rounded-xl border border-[var(--color-border)] text-xs font-bold cursor-pointer"
            >
              ถัดไป
            </button>
          </div>

          {/* Mobile 7-col Calendar */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--color-text-muted)]">
              {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((d, i) => (
                <div key={d} className={i >= 5 ? 'text-rose-500' : ''}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, idx) => {
                if (!cell) return <div key={`mblank-${idx}`} className="h-12" />;
                const cellHol = monthHolidays.find((h) => h.date === cell.dateStr);
                void mobileCalendarNotesTick;
                const cellHasNote =
                  getVisibleCalendarNotesForDate(
                    activeSchool.id,
                    cell.dateStr,
                    currentUser?.id,
                    currentRole
                  ).length > 0;
                const isToday = cell.dateStr === todayBangkokStr;
                const isSel = cell.dateStr === mobileSelectedCalendarDate;
                const isWknd = isWeekendDate(cell.dateStr);
                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setMobileSelectedCalendarDate(cell.dateStr)}
                    className={`h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs font-bold tabular-nums cursor-pointer transition ${
                      isSel
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                        : cellHol
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          : isWknd
                            ? 'border-transparent text-[var(--color-text-muted)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-title)]'
                    }`}
                  >
                    <span className={isToday ? 'underline decoration-2' : ''}>{cell.dayNum}</span>
                    {(cellHol || cellHasNote) && (
                      <span className="flex items-center gap-0.5">
                        {cellHol && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        {cellHasNote && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Calendar Day Details */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                วันที่ {mobileSelectedCalendarDate}
              </h3>
              <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                {selectedDateHolidays.length > 0 ? 'วันหยุด' : `${selectedCalDaySlots.length} คาบ`}
              </span>
            </div>

            {selectedDateHolidays.map((h) => (
              <div
                key={h.id}
                className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs space-y-0.5"
              >
                <p className="font-bold text-rose-700 dark:text-rose-200">{h.nameTh}</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-300">
                  {h.nameEn} · {getThaiHolidayCategoryLabel(h, lang)}
                </p>
              </div>
            ))}

            {/* Mobile Calendar Notes Section */}
            {(() => {
              void mobileCalendarNotesTick;
              const mobileDayNotes = getVisibleCalendarNotesForDate(
                activeSchool.id,
                mobileSelectedCalendarDate,
                currentUser?.id,
                currentRole
              );
              const resetMobileNoteForm = () => {
                setShowMobileNoteForm(false);
                setMobileEditingNoteId(null);
                setMobileNoteTitle('');
                setMobileNoteContent('');
                setMobileNoteScope('personal');
                setMobileNoteColor('amber');
              };
              const handleMobileSaveNote = (e: React.FormEvent) => {
                e.preventDefault();
                if (!mobileNoteTitle.trim() && !mobileNoteContent.trim()) return;
                saveCalendarNote({
                  id: mobileEditingNoteId || undefined,
                  schoolId: activeSchool.id,
                  date: mobileSelectedCalendarDate,
                  title: mobileNoteTitle.trim() || mobileNoteContent.trim().slice(0, 40),
                  content: mobileNoteContent.trim(),
                  scope: isRestrictedViewer ? 'personal' : mobileNoteScope,
                  color: mobileNoteColor,
                  authorId: currentUser?.id || `role:${currentRole}`,
                  authorName: currentUser?.fullNameTh || currentUser?.fullNameEn || currentRole,
                  authorRole: currentRole,
                });
                resetMobileNoteForm();
                setMobileCalendarNotesTick((v) => v + 1);
              };
              const handleMobileEditNote = (note: CalendarNote) => {
                setMobileEditingNoteId(note.id);
                setMobileNoteTitle(note.title);
                setMobileNoteContent(note.content);
                setMobileNoteScope(note.scope);
                setMobileNoteColor(note.color);
                setShowMobileNoteForm(true);
              };
              return (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                      <span>โน้ตประจำวัน ({mobileDayNotes.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => (showMobileNoteForm ? resetMobileNoteForm() : setShowMobileNoteForm(true))}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      {showMobileNoteForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      <span>{showMobileNoteForm ? 'ปิด' : 'เพิ่มโน้ต'}</span>
                    </button>
                  </div>

                  {showMobileNoteForm && (
                    <form onSubmit={handleMobileSaveNote} className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={mobileNoteTitle}
                        onChange={(e) => setMobileNoteTitle(e.target.value)}
                        placeholder="หัวข้อโน้ต / เตือนความจำ"
                        className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs text-[var(--color-text-title)]"
                      />
                      <textarea
                        rows={2}
                        value={mobileNoteContent}
                        onChange={(e) => setMobileNoteContent(e.target.value)}
                        placeholder="รายละเอียดเพิ่มเติม..."
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)] resize-none"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {CALENDAR_NOTE_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setMobileNoteColor(c.id)}
                              className={`w-5 h-5 rounded-full ${c.dotClass} flex items-center justify-center cursor-pointer ${
                                mobileNoteColor === c.id
                                  ? 'ring-2 ring-offset-1 ring-[var(--color-text-title)]'
                                  : 'opacity-70'
                              }`}
                            >
                              {mobileNoteColor === c.id && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                        </div>
                        {!isRestrictedViewer && (
                          <select
                            value={mobileNoteScope}
                            onChange={(e) => setMobileNoteScope(e.target.value as CalendarNoteScope)}
                            className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-[11px] font-semibold"
                          >
                            <option value="personal">ส่วนตัว</option>
                            <option value="school">โน้ตโรงเรียน</option>
                          </select>
                        )}
                        <button
                          type="submit"
                          disabled={!mobileNoteTitle.trim() && !mobileNoteContent.trim()}
                          className="h-8 rounded-lg bg-emerald-600 text-white px-3 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {mobileEditingNoteId ? 'อัปเดต' : 'บันทึก'}
                        </button>
                      </div>
                    </form>
                  )}

                  {mobileDayNotes.length === 0 && !showMobileNoteForm ? (
                    <p className="text-[11px] text-[var(--color-text-muted)]">ยังไม่มีโน้ตสำหรับวันที่นี้</p>
                  ) : (
                    <div className="space-y-1.5">
                      {mobileDayNotes.map((note) => {
                        const cm = getCalendarNoteColorMeta(note.color);
                        const canEdit =
                          note.authorId === (currentUser?.id || `role:${currentRole}`) ||
                          currentRole === 'admin' ||
                          currentRole === 'super_admin';
                        return (
                          <div
                            key={note.id}
                            className={`rounded-xl border p-2.5 text-xs flex items-start justify-between gap-2 ${cm.cardClass}`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--color-text-title)]">{note.title}</p>
                              {note.content && (
                                <p className="text-[11px] text-[var(--color-text-body)] mt-0.5 whitespace-pre-line">
                                  {note.content}
                                </p>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMobileEditNote(note)}
                                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                                  title="แก้ไข"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteCalendarNote(activeSchool.id, note.id);
                                    setMobileCalendarNotesTick((v) => v + 1);
                                  }}
                                  className="p-1 text-rose-600 cursor-pointer"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedCalDaySlots.map((slot) => {
              const slotActivity = getTimetableSlotActivityStatus({
                slot,
                schoolPeriods,
                now: bangkokClock,
                schoolId: activeSchool.id,
                targetDateStr: mobileSelectedCalendarDate,
              });
              const calStatus = getSlotTodayCheckStatus(slot, mobileSelectedCalendarDate);
              const nextCheckType: 'check_in' | 'check_out' =
                calStatus.hasCheckIn && !calStatus.hasCheckOut ? 'check_out' : 'check_in';
              const canShowMobileCalCheckin =
                (currentRole === 'teacher' || currentRole === 'student') &&
                canSelfCheckin &&
                (slotActivity.isActive ||
                  (mobileSelectedCalendarDate === todayBangkokStr &&
                    slotActivity.isTodayWeekday &&
                    !slotActivity.isHolidayOff));
              return (
                <div
                  key={slot.id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    slotActivity.isActive
                      ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/75 dark:bg-rose-950/35'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums flex flex-wrap items-center gap-1.5">
                        <span>
                          คาบ {slot.periodNumber} · {slotActivity.startTime}–{slotActivity.endTime}
                        </span>
                        {slotActivity.isActive && (
                          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                            ถึงคาบเรียน
                            {slotActivity.remainingMinutes !== null
                              ? ` · เหลือ ${slotActivity.remainingMinutes} น.`
                              : ''}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-bold text-[var(--color-text-title)]">
                        {slot.courseCode} · {slot.courseTitleTh}
                      </p>
                    </div>
                    {(calStatus.hasCheckIn || calStatus.hasCheckOut) && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {calStatus.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                      </span>
                    )}
                  </div>
                  {canShowMobileCalCheckin && (
                    <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => openPeriodCheckinFromSlot(slot, mobileSelectedCalendarDate, nextCheckType)}
                        className={`flex-1 min-h-[42px] rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          slotActivity.isActive
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : nextCheckType === 'check_out'
                              ? 'bg-slate-800 hover:bg-slate-900'
                              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                        }`}
                      >
                        {nextCheckType === 'check_out' ? (
                          <LogOut className="w-4 h-4" />
                        ) : (
                          <LogIn className="w-4 h-4" />
                        )}
                        <span>
                          {calStatus.hasCheckIn && calStatus.hasCheckOut
                            ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
                            : nextCheckType === 'check_out'
                              ? 'เช็คเอาท์คาบเรียน'
                              : slotActivity.isActive
                                ? 'เช็คอินเข้าคาบตอนนี้'
                                : 'เช็คอินเข้าคาบเรียน'}
                        </span>
                      </button>
                      {!calStatus.hasCheckIn && (
                        <button
                          type="button"
                          onClick={() =>
                            openPeriodCheckinFromSlot(slot, mobileSelectedCalendarDate, 'check_out')
                          }
                          className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                            slotActivity.isActive
                              ? 'border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-200'
                              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                          }`}
                        >
                          เช็คเอาท์
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {monthHolidays.length > 0 && (
              <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
                <p className="text-xs font-bold text-[var(--color-text-title)]">
                  วันหยุดประจำเดือน ({monthHolidays.length})
                </p>
                {monthHolidays.map((h) => (
                  <p key={h.id} className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{h.date}</span> · {h.nameTh}{' '}
                    ({getThaiHolidayCategoryLabel(h, lang)})
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showLandscapeWeekly && (
        <div
          ref={landscapeContainerRef}
          className="timetable-print-area print-area fixed inset-0 z-[120] bg-[var(--color-canvas)] flex flex-col p-2.5 sm:p-4 overflow-hidden print:static print:p-0"
        >
          <div className="hidden print:flex items-center justify-between gap-4 pb-2 mb-2 border-b-2 border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn} · {lang === 'th' ? 'ตารางเรียน / ตารางสอนรายสัปดาห์' : 'Weekly Timetable'}
              </h2>
              <p className="text-[11px] text-slate-700">
                {currentRole === 'teacher' && timetableOnlyMine
                  ? (lang === 'th' ? 'เฉพาะคาบสอนของฉัน' : 'My teaching periods')
                  : (lang === 'th' ? 'ทุกคาบในความรับผิดชอบ' : 'All visible periods')}
              </p>
            </div>
            <div className="text-right text-[10px] text-slate-600 tabular-nums">
              {todayBangkokStr} · A4 แนวนอน
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)] print:hidden">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                {lang === 'th' ? 'ตารางสัปดาห์แบบแนวนอน' : 'Landscape Weekly Timetable'}
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                {lang === 'th' ? 'เลื่อนซ้าย-ขวาเพื่อดูครบทุกคาบ หรือกดพิมพ์ A4 แนวนอน' : 'Scroll horizontally or print in A4 landscape'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={printTimetableLandscape}
                className="min-h-[36px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-text-title)] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'พิมพ์ A4 แนวนอน' : 'Print A4'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLandscapeWeekly(false);
                  void exitLandscapeGameMode();
                }}
                className="min-h-[36px] px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ปิด' : 'Close'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto pt-2 print:overflow-visible print:pt-0">
            <div className="overflow-x-auto print:overflow-visible">
              <table
                style={{ minWidth: `${Math.max(820, 90 + schoolPeriods.length * 105)}px` }}
                className="w-full table-fixed border-collapse bg-[var(--color-card)] rounded-xl overflow-hidden border border-[var(--color-border)] print:!min-w-0"
              >
                <thead>
                  <tr className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[10px]">
                    <th className="p-1.5 w-20 text-center font-bold text-[var(--color-text-title)] border-r border-[var(--color-border)]">
                      วัน / คาบ
                    </th>
                    {schoolPeriods
                      .slice()
                      .sort((a, b) => a.periodNumber - b.periodNumber)
                      .map((p) => (
                        <th
                          key={p.periodNumber}
                          className={`p-1.5 text-center border-r border-[var(--color-border)] ${
                            p.isBreak ? 'bg-amber-100/80 dark:bg-amber-950/60 w-16' : ''
                          }`}
                        >
                          <div className="font-bold text-[var(--color-text-title)]">
                            {p.labelTh || (p.isBreak ? 'พัก' : `คาบ ${p.periodNumber}`)}
                          </div>
                          <div className="text-[9px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                            {p.startTime}-{p.endTime}
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-[10px]">
                  {(
                    [
                      { key: 'mon', th: 'จันทร์' },
                      { key: 'tue', th: 'อังคาร' },
                      { key: 'wed', th: 'พุธ' },
                      { key: 'thu', th: 'พฤหัสบดี' },
                      { key: 'fri', th: 'ศุกร์' },
                    ] as const
                  ).map((day) => {
                    const visibleDaySlots = scopedTimetableSlots
                      .filter((s) => s.dayOfWeek === day.key)
                      .filter(
                        (s) =>
                          !(currentRole === 'teacher' && timetableOnlyMine) ||
                          slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, courses)
                      );
                    return (
                      <tr key={day.key}>
                        <td className="p-1.5 text-center font-bold text-[var(--color-text-title)] border-r border-[var(--color-border)] bg-[var(--color-card-subtle)]/50">
                          {day.th}
                        </td>
                        {schoolPeriods
                          .slice()
                          .sort((a, b) => a.periodNumber - b.periodNumber)
                          .map((p) => {
                            if (p.isBreak) {
                              return (
                                <td
                                  key={p.periodNumber}
                                  className="p-1 text-center bg-amber-50/70 dark:bg-amber-950/30 border-r border-[var(--color-border)] text-[9px] font-bold text-amber-800 dark:text-amber-200"
                                >
                                  {p.labelTh || 'พัก'}
                                </td>
                              );
                            }
                            const cellSlots = visibleDaySlots.filter((s) => s.periodNumber === p.periodNumber);
                            if (cellSlots.length === 0) {
                              return (
                                <td
                                  key={p.periodNumber}
                                  className="p-1 text-center border-r border-[var(--color-border)] text-[var(--color-text-muted)]"
                                >
                                  -
                                </td>
                              );
                            }
                            return (
                              <td key={p.periodNumber} className="p-1 border-r border-[var(--color-border)] align-top space-y-1">
                                {cellSlots.map((slot) => {
                                  const slotColor = getTimetableSlotCardStyle(slot.colorTag);
                                  return (
                                    <div
                                      key={slot.id}
                                      style={slotColor.style}
                                      className={`rounded-md border p-1 ${slotColor.className}`}
                                    >
                                      <div className="font-mono text-[9px] font-bold truncate">{slot.courseCode}</div>
                                      <div className="font-bold text-[10px] leading-tight line-clamp-1">
                                        {slot.courseTitleTh}
                                      </div>
                                      <div className="text-[9px] opacity-85 truncate">
                                        {slot.classRoom}{slot.room ? ` · ${slot.room}` : ''}
                                      </div>
                                    </div>
                                  );
                                })}
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
