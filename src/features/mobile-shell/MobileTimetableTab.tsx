import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Columns3,
  Edit3,
  Grid3X3,
  List,
  LogIn,
  LogOut,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  RefreshCw,
  StickyNote,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { TableActionMenu, type TableActionItem } from '../../components/common/TableActionMenu';
import { StatusBadge } from '../../components/common/StatusBadge';
import type {
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  Course,
  DayOfWeek,
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
import {
  addCalendarDays,
  formatCalendarDate,
  getCalendarWeekStart,
  getTimetableSlotActivityStatus,
  type BangkokClockSnapshot,
} from '../../lib/timetableCalendar';
import {
  CALENDAR_NOTE_COLORS,
  CALENDAR_NOTES_UPDATED_EVENT,
  CalendarNote,
  CalendarNoteColor,
  CalendarNoteScope,
  deleteCalendarNote,
  getCalendarNoteColorMeta,
  getVisibleCalendarNotesForDate,
  getVisibleCalendarNotesMapForMonth,
  saveCalendarNote,
} from '../../lib/calendarNotes';
import {
  addSchoolCustomHoliday,
  getHolidaysForDate,
  getHolidaysForYear,
  getHolidaysInMonth,
  getThaiHolidayCategoryLabel,
  isWeekendDate,
  removeSchoolCustomHoliday,
  type HolidaySyncStatus,
  type ThaiHoliday,
} from '../../lib/thaiHolidays';
import { PeriodTimeMissionsCard } from '../../components/PeriodTimeMissionsCard';
import { enterLandscapeGameMode, exitLandscapeGameMode } from '../../lib/screenOrientation';
import { printTimetableLandscape, setTimetableLandscapePageRule } from '../../lib/timetablePrint';
import {
  getTimetableSlotCardStyle,
  hasDiverseSlotColorTags,
  resolveTimetableSlotColorTag,
} from '../../lib/timetableColors';
import { dedupeTimetableRooms, isSameTimetableRoom } from '../../lib/timetableRoomMatch';
import { formatSlotTeachersDisplay, getSlotTeachers } from '../../lib/timetableTeachers';

type MobileTimetableMode = 'day' | 'week' | 'grid' | 'calendar';
type AnyDayKey = DayOfWeek | 'sat' | 'sun';

const ALL_ROOMS_VALUE = '__all__';

const THAI_DAY_META: Array<{
  id: AnyDayKey;
  shortTh: string;
  fullTh: string;
  shortEn: string;
  fullEn: string;
  swatchHex: string;
  activeBtnClass: string;
  badgeClass: string;
  headerBgClass: string;
}> = [
  {
    id: 'mon',
    shortTh: 'จ.',
    fullTh: 'จันทร์',
    shortEn: 'Mon',
    fullEn: 'Monday',
    swatchHex: '#d97706',
    activeBtnClass: 'bg-amber-500 text-white border-amber-600 shadow-xs',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700',
    headerBgClass: 'bg-amber-50/75 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80',
  },
  {
    id: 'tue',
    shortTh: 'อ.',
    fullTh: 'อังคาร',
    shortEn: 'Tue',
    fullEn: 'Tuesday',
    swatchHex: '#db2777',
    activeBtnClass: 'bg-pink-600 text-white border-pink-700 shadow-xs',
    badgeClass: 'bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-700',
    headerBgClass: 'bg-pink-50/75 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800/80',
  },
  {
    id: 'wed',
    shortTh: 'พ.',
    fullTh: 'พุธ',
    shortEn: 'Wed',
    fullEn: 'Wednesday',
    swatchHex: '#059669',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
    headerBgClass: 'bg-emerald-50/75 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80',
  },
  {
    id: 'thu',
    shortTh: 'พฤ.',
    fullTh: 'พฤหัสบดี',
    shortEn: 'Thu',
    fullEn: 'Thursday',
    swatchHex: '#ea580c',
    activeBtnClass: 'bg-orange-600 text-white border-orange-700 shadow-xs',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700',
    headerBgClass: 'bg-orange-50/75 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/80',
  },
  {
    id: 'fri',
    shortTh: 'ศ.',
    fullTh: 'ศุกร์',
    shortEn: 'Fri',
    fullEn: 'Friday',
    swatchHex: '#0284c7',
    activeBtnClass: 'bg-sky-600 text-white border-sky-700 shadow-xs',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700',
    headerBgClass: 'bg-sky-50/75 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/80',
  },
  {
    id: 'sat',
    shortTh: 'ส.',
    fullTh: 'เสาร์',
    shortEn: 'Sat',
    fullEn: 'Saturday',
    swatchHex: '#9333ea',
    activeBtnClass: 'bg-purple-600 text-white border-purple-700 shadow-xs',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700',
    headerBgClass: 'bg-purple-50/75 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80',
  },
  {
    id: 'sun',
    shortTh: 'อา.',
    fullTh: 'อาทิตย์',
    shortEn: 'Sun',
    fullEn: 'Sunday',
    swatchHex: '#e11d48',
    activeBtnClass: 'bg-rose-600 text-white border-rose-700 shadow-xs',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700',
    headerBgClass: 'bg-rose-50/75 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80',
  },
];

const DAY_META_MAP: Record<AnyDayKey, (typeof THAI_DAY_META)[number]> = Object.fromEntries(
  THAI_DAY_META.map((d) => [d.id, d])
) as Record<AnyDayKey, (typeof THAI_DAY_META)[number]>;

function formatShortThaiDateLabel(dateStr: string): string {
  const dt = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short' });
}

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
  assignments?: Assignment[];
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
  todayDayKey: AnyDayKey;
  todayHoliday: ThaiHoliday | null;
  todayMySlots: TimetableSlot[];
  mobileTimetableMode: MobileTimetableMode;
  setMobileTimetableMode: (mode: MobileTimetableMode) => void;
  timetableOnlyMine: boolean;
  setTimetableOnlyMine: React.Dispatch<React.SetStateAction<boolean>>;
  mobileCalendarMonthCursor: { year: number; month: number };
  setMobileCalendarMonthCursor: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>;
  holidaySyncStatus: HolidaySyncStatus | null;
  isSyncingHolidays: boolean;
  onManualHolidaySync: (targetYear?: number) => Promise<void>;
  onHolidayMutated?: () => void;
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
  assignments = [],
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
  onHolidayMutated,
  onOpenCalendarSync,
  onOpenPeriodCheckinTab,
  getSlotTodayCheckStatus,
  openPeriodCheckinFromSlot,
  onOpenPeriodRoster,
  onBackHome,
}) => {
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<AnyDayKey>(todayDayKey);
  const [selectedClassRoom, setSelectedClassRoom] = useState<string>(ALL_ROOMS_VALUE);
  const [weeklyStartDate, setWeeklyStartDate] = useState<string>(() => getCalendarWeekStart(todayBangkokStr));
  const [mobileSelectedCalendarDate, setMobileSelectedCalendarDate] = useState<string>(todayBangkokStr);
  const [mobileCalendarNotesTick, setMobileCalendarNotesTick] = useState(0);
  const [holidayLocalTick, setHolidayLocalTick] = useState(0);
  const [showMobileNoteForm, setShowMobileNoteForm] = useState(false);
  const [mobileEditingNoteId, setMobileEditingNoteId] = useState<string | null>(null);
  const [mobileNoteTitle, setMobileNoteTitle] = useState('');
  const [mobileNoteContent, setMobileNoteContent] = useState('');
  const [mobileNoteScope, setMobileNoteScope] = useState<CalendarNoteScope>('personal');
  const [mobileNoteColor, setMobileNoteColor] = useState<CalendarNoteColor>('amber');
  const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState(todayBangkokStr);
  const [newHolidayNameTh, setNewHolidayNameTh] = useState('');
  const [showLandscapeWeekly, setShowLandscapeWeekly] = useState(false);
  const [inspectSlotTarget, setInspectSlotTarget] = useState<{
    slot: TimetableSlot;
    dateStr: string;
  } | null>(null);
  const landscapeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimetableLandscapePageRule(showLandscapeWeekly || mobileTimetableMode === 'grid');
    return () => {
      setTimetableLandscapePageRule(false);
    };
  }, [showLandscapeWeekly, mobileTimetableMode]);

  useEffect(() => {
    const onNotesUpdated = () => setMobileCalendarNotesTick((v) => v + 1);
    const onHolidaysUpdated = () => setHolidayLocalTick((v) => v + 1);
    window.addEventListener(CALENDAR_NOTES_UPDATED_EVENT, onNotesUpdated);
    window.addEventListener('eduverse:holidays-updated', onHolidaysUpdated);
    return () => {
      window.removeEventListener(CALENDAR_NOTES_UPDATED_EVENT, onNotesUpdated);
      window.removeEventListener('eduverse:holidays-updated', onHolidaysUpdated);
    };
  }, []);

  const canManageHolidays =
    !isRestrictedViewer &&
    (currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin');
  const canOpenPeriodRoster =
    currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin';

  const hasTeacherTimetableMatch =
    !isRestrictedViewer &&
    (currentRole === 'teacher' ||
      Boolean(
        currentUser &&
          scopedTimetableSlots.some((s) =>
            slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, courses)
          )
      ));

  const scopeFilteredSlots = useMemo(() => {
    return scopedTimetableSlots.filter((s) => {
      if (hasTeacherTimetableMatch && timetableOnlyMine) {
        return slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, courses);
      }
      return true;
    });
  }, [scopedTimetableSlots, hasTeacherTimetableMatch, timetableOnlyMine, currentUser, matchedTeacher, courses]);

  const availableRooms = useMemo(
    () => dedupeTimetableRooms([scopeFilteredSlots.map((s) => s.classRoom)]).sort((a, b) => a.localeCompare(b, 'th')),
    [scopeFilteredSlots]
  );

  useEffect(() => {
    if (selectedClassRoom !== ALL_ROOMS_VALUE && !availableRooms.some((r) => isSameTimetableRoom(r, selectedClassRoom))) {
      setSelectedClassRoom(ALL_ROOMS_VALUE);
    }
  }, [availableRooms, selectedClassRoom]);

  const visibleSlots = useMemo(() => {
    if (selectedClassRoom === ALL_ROOMS_VALUE) return scopeFilteredSlots;
    return scopeFilteredSlots.filter((s) => isSameTimetableRoom(s.classRoom, selectedClassRoom));
  }, [scopeFilteredSlots, selectedClassRoom]);

  const diverseSlotColors = useMemo(() => hasDiverseSlotColorTags(scopedTimetableSlots), [scopedTimetableSlots]);

  const getSlotColor = (slot: TimetableSlot) => {
    const course =
      scopedCourses.find((c) => c.id === slot.courseId || c.code === slot.courseCode) ||
      courses.find((c) => c.id === slot.courseId || c.code === slot.courseCode);
    const resolvedTag = resolveTimetableSlotColorTag({
      slot,
      course,
      hasDiverseColors: diverseSlotColors,
    });
    return getTimetableSlotCardStyle(resolvedTag);
  };

  const orderedPeriods = useMemo(
    () => schoolPeriods.slice().sort((a, b) => a.periodNumber - b.periodNumber),
    [schoolPeriods]
  );

  const hasWeekendSlots = useMemo(
    () => visibleSlots.some((s) => (s.dayOfWeek as string) === 'sat' || (s.dayOfWeek as string) === 'sun'),
    [visibleSlots]
  );

  const weekDayKeys = useMemo<AnyDayKey[]>(
    () => (hasWeekendSlots ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] : ['mon', 'tue', 'wed', 'thu', 'fri']),
    [hasWeekendSlots]
  );

  const weeklyDaysWithDates = useMemo(() => {
    return weekDayKeys.map((key, idx) => {
      const dateStr = addCalendarDays(weeklyStartDate, idx);
      return {
        ...DAY_META_MAP[key],
        dateStr,
      };
    });
  }, [weekDayKeys, weeklyStartDate]);

  const currentWeekDaysWithDates = useMemo(() => {
    const thisWeekStart = getCalendarWeekStart(todayBangkokStr);
    return weekDayKeys.map((key, idx) => {
      const dateStr = addCalendarDays(thisWeekStart, idx);
      return {
        ...DAY_META_MAP[key],
        dateStr,
      };
    });
  }, [weekDayKeys, todayBangkokStr]);

  const weeklyRangeLabel = useMemo(() => {
    const first = weeklyDaysWithDates[0]?.dateStr;
    const last = weeklyDaysWithDates[weeklyDaysWithDates.length - 1]?.dateStr;
    if (!first || !last) return '';
    return `${formatShortThaiDateLabel(first)} – ${formatShortThaiDateLabel(last)}`;
  }, [weeklyDaysWithDates]);

  void holidayLocalTick;
  void mobileCalendarNotesTick;

  const monthHolidays = getHolidaysInMonth(
    mobileCalendarMonthCursor.year,
    mobileCalendarMonthCursor.month,
    activeSchool.id
  );
  const monthNotesMap = getVisibleCalendarNotesMapForMonth(
    activeSchool.id,
    mobileCalendarMonthCursor.year,
    mobileCalendarMonthCursor.month,
    currentUser?.id,
    currentRole
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
  const monthPrefix = `${mobileCalendarMonthCursor.year}-${String(mobileCalendarMonthCursor.month + 1).padStart(2, '0')}-`;
  const monthAssignments = assignments.filter(
    (a) => a.status !== 'closed' && (a.dueDate || '').slice(0, 10).startsWith(monthPrefix)
  );

  const selectedCalDateObj = new Date(`${mobileSelectedCalendarDate}T00:00:00Z`);
  const calDayKey =
    ([null, 'mon', 'tue', 'wed', 'thu', 'fri', null] as const)[selectedCalDateObj.getUTCDay()] || null;
  const selectedDateHolidays = getHolidaysForDate(mobileSelectedCalendarDate, activeSchool.id);
  const selectedDateAssignments = assignments.filter(
    (a) => a.status !== 'closed' && (a.dueDate || '').slice(0, 10) === mobileSelectedCalendarDate
  );
  const selectedCalDaySlots = calDayKey
    ? visibleSlots
        .filter((s) => s.dayOfWeek === calDayKey)
        .slice()
        .sort((a, b) => a.periodNumber - b.periodNumber)
    : [];

  const getActivePeriodLabel = (slot: TimetableSlot, dateStr: string) => {
    const slotActivity = getTimetableSlotActivityStatus({
      slot,
      schoolPeriods,
      now: bangkokClock,
      schoolId: activeSchool.id,
      targetDateStr: dateStr,
    });
    const status = getSlotTodayCheckStatus(slot, dateStr);
    const nextCheckType: 'check_in' | 'check_out' =
      status.hasCheckIn && !status.hasCheckOut ? 'check_out' : 'check_in';
    const canCheckinNow =
      (currentRole === 'teacher' || currentRole === 'student') &&
      canSelfCheckin &&
      (slotActivity.isActive ||
        (dateStr === todayBangkokStr &&
          slotActivity.isTodayWeekday &&
          !slotActivity.isHolidayOff));
    return { slotActivity, status, nextCheckType, canCheckinNow };
  };

  const renderSlotActionMenu = (slot: TimetableSlot, dateStr: string) => {
    const { slotActivity, status, nextCheckType, canCheckinNow } = getActivePeriodLabel(slot, dateStr);
    const items: TableActionItem[] = [];
    if (canOpenPeriodRoster) {
      items.push({
        id: 'period-roster',
        label: 'รายชื่อ / เช็กชื่อนักเรียน',
        icon: <UserCheck className="w-4 h-4" />,
        onClick: () => onOpenPeriodRoster({ slot, date: dateStr }),
        variant: 'success',
      });
    }
    if (canCheckinNow) {
      items.push({
        id: 'period-checkin',
        label:
          status.hasCheckIn && status.hasCheckOut
            ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
            : nextCheckType === 'check_out'
              ? 'เช็คเอาท์คาบเรียน'
              : slotActivity.isActive
                ? 'เช็คอินเข้าคาบตอนนี้'
                : 'เช็คอินเข้าคาบเรียน',
        icon: nextCheckType === 'check_out' ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />,
        onClick: () => openPeriodCheckinFromSlot(slot, dateStr, nextCheckType),
        variant: 'primary',
        dividerBefore: canOpenPeriodRoster,
      });
      if (!status.hasCheckIn) {
        items.push({
          id: 'period-checkout',
          label: 'เช็คเอาท์',
          icon: <LogOut className="w-4 h-4" />,
          onClick: () => openPeriodCheckinFromSlot(slot, dateStr, 'check_out'),
        });
      }
    }
    return items;
  };

  const renderMatrixTable = (compactCells: boolean) => {
    const minTableWidth = Math.max(760, 88 + orderedPeriods.length * (compactCells ? 96 : 110));
    return (
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] print:overflow-visible">
        <table
          style={{ minWidth: `${minTableWidth}px` }}
          className="w-full table-fixed border-collapse text-[11px] print:!min-w-0"
        >
          <thead>
            <tr className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)]">
              <th className="sticky left-0 z-20 w-20 bg-[var(--color-card-subtle)] p-2 text-center font-bold text-[var(--color-text-title)] border-r border-[var(--color-border)]">
                {lang === 'th' ? 'วัน / คาบ' : 'Day / Period'}
              </th>
              {orderedPeriods.map((p) => (
                <th
                  key={p.periodNumber}
                  className={`p-1.5 text-center border-r border-[var(--color-border)] ${
                    p.isBreak
                      ? 'w-16 bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200'
                      : 'text-[var(--color-text-title)]'
                  }`}
                >
                  <div className="font-bold leading-tight truncate">
                    {p.labelTh || (p.isBreak ? 'พัก' : `คาบ ${p.periodNumber}`)}
                  </div>
                  <div className="text-[9px] font-mono text-[var(--color-text-muted)] whitespace-nowrap tabular-nums">
                    {p.startTime}–{p.endTime}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {currentWeekDaysWithDates.map((day) => {
              const dayHolidays = getHolidaysForDate(day.dateStr, activeSchool.id);
              const primaryHoliday = dayHolidays[0] || null;
              const isTodayRow = day.id === todayDayKey;
              const daySlots = visibleSlots.filter((s) => s.dayOfWeek === day.id);

              return (
                <tr
                  key={day.id}
                  className={
                    primaryHoliday
                      ? 'bg-rose-50/40 dark:bg-rose-950/20'
                      : isTodayRow
                        ? 'bg-blue-50/35 dark:bg-blue-950/20'
                        : ''
                  }
                >
                  <td className="sticky left-0 z-10 bg-[var(--color-card)] p-1.5 text-center border-r border-[var(--color-border)] align-middle">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold border ${day.badgeClass}`}
                    >
                      {lang === 'th' ? day.fullTh : day.shortEn}
                    </span>
                    <div className="mt-0.5 text-[9px] font-semibold text-[var(--color-text-muted)] tabular-nums">
                      {formatShortThaiDateLabel(day.dateStr)}
                      {isTodayRow && (
                        <span className="ml-1 text-[var(--color-primary-text)] font-bold">· วันนี้</span>
                      )}
                    </div>
                    {primaryHoliday && (
                      <div className="mt-0.5 rounded bg-rose-100 dark:bg-rose-950/80 px-1 py-0.5 text-[8px] font-bold text-rose-700 dark:text-rose-200 leading-tight line-clamp-2">
                        หยุด: {primaryHoliday.nameTh}
                      </div>
                    )}
                  </td>
                  {orderedPeriods.map((p) => {
                    if (p.isBreak) {
                      return (
                        <td
                          key={p.periodNumber}
                          className="p-1.5 text-center bg-amber-50/80 dark:bg-amber-950/40 border-r border-[var(--color-border)] text-[9px] font-bold text-amber-800 dark:text-amber-200 align-middle"
                        >
                          {p.labelTh || 'พัก'}
                        </td>
                      );
                    }
                    const cellSlots = daySlots.filter((s) => s.periodNumber === p.periodNumber);
                    if (cellSlots.length === 0) {
                      return (
                        <td
                          key={p.periodNumber}
                          className="p-1 text-center border-r border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]/60"
                        >
                          ว่าง
                        </td>
                      );
                    }
                    return (
                      <td
                        key={p.periodNumber}
                        className="p-1 border-r border-[var(--color-border)] align-top space-y-1"
                      >
                        {cellSlots.map((slot) => {
                          const slotColor = getSlotColor(slot);
                          const { slotActivity, status } = getActivePeriodLabel(slot, day.dateStr);
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setInspectSlotTarget({ slot, dateStr: day.dateStr })}
                              style={slotColor.style}
                              className={`w-full text-left rounded-lg border p-1.5 space-y-0.5 cursor-pointer transition ${slotColor.className} ${
                                slotActivity.isActive
                                  ? 'ring-2 ring-rose-500 border-rose-500 shadow-sm'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  style={{ backgroundColor: slotColor.swatchHex }}
                                  className="inline-block rounded px-1 py-0.5 text-[9px] font-mono font-bold text-white leading-none truncate max-w-full"
                                >
                                  {slot.courseCode}
                                </span>
                                {(status.hasCheckIn || status.hasCheckOut) && day.id === todayDayKey && (
                                  <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-300 shrink-0" />
                                )}
                              </div>
                              <div className="font-bold text-[10px] leading-tight line-clamp-2">
                                {lang === 'th'
                                  ? slot.courseTitleTh || slot.courseCode
                                  : slot.courseTitleEn || slot.courseTitleTh || slot.courseCode}
                              </div>
                              <div className="text-[9px] opacity-85 truncate">
                                {slot.classRoom}
                                {slot.room ? ` · ${slot.room}` : ''}
                              </div>
                              {slotActivity.isActive && (
                                <div className="text-[8px] font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                                  ถึงคาบ · {slotActivity.remainingMinutes ?? ''} น.
                                </div>
                              )}
                            </button>
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
    );
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[40px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <div className="flex items-center gap-1.5 justify-end">
          {canSelfCheckin && (currentRole === 'student' || currentRole === 'teacher') && (
            <button
              type="button"
              onClick={onOpenPeriodCheckinTab}
              className="min-h-[38px] px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เช็คอินรายคาบ' : 'Period Check-in'}</span>
            </button>
          )}
          <TableActionMenu
            ariaLabel={lang === 'th' ? 'เครื่องมือตารางเรียน/สอน' : 'Timetable tools'}
            size="md"
            menuWidth={236}
            items={[
              {
                id: 'landscape_grid',
                label: lang === 'th' ? 'ตารางสัปดาห์เต็มจอแนวนอน' : 'Fullscreen Landscape Grid',
                icon: <Maximize2 className="w-3.5 h-3.5" />,
                variant: 'primary',
                onClick: () => {
                  setShowLandscapeWeekly(true);
                  void enterLandscapeGameMode(landscapeContainerRef.current);
                },
              },
              {
                id: 'print_a4',
                label: lang === 'th' ? 'พิมพ์ตารางเรียน A4 (แนวนอน)' : 'Print A4 Landscape',
                icon: <Printer className="w-3.5 h-3.5" />,
                onClick: () => {
                  setMobileTimetableMode('grid');
                  setTimeout(() => printTimetableLandscape(), 120);
                },
              },
              ...(canManageHolidays
                ? [
                    {
                      id: 'sync_holidays',
                      label: isSyncingHolidays ? 'กำลังซิงค์วันหยุด...' : 'ซิงค์วันหยุดราชการ',
                      icon: <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHolidays ? 'animate-spin' : ''}`} />,
                      disabled: isSyncingHolidays,
                      dividerBefore: true,
                      onClick: () => void onManualHolidaySync(mobileCalendarMonthCursor.year),
                    },
                  ]
                : []),
              {
                id: 'calendar_sync',
                label: lang === 'th' ? 'เชื่อมต่อ Calendar & ภาพหน้าจอ' : 'Calendar & Wallpaper',
                icon: <Calendar className="w-3.5 h-3.5" />,
                dividerBefore: true,
                onClick: onOpenCalendarSync,
              },
            ]}
          />
        </div>
      </div>

      {/* 4-Mode Segmented Navigation: Daily / Weekly / Grid Table / Calendar */}
      <div
        role="tablist"
        aria-label={lang === 'th' ? 'รูปแบบการแสดงตารางสอน' : 'Timetable view modes'}
        className="grid grid-cols-4 gap-1 p-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]"
      >
        {(
          [
            { id: 'day', labelTh: 'รายวัน', labelEn: 'Daily', icon: List },
            { id: 'week', labelTh: 'รายสัปดาห์', labelEn: 'Weekly', icon: Columns3 },
            { id: 'grid', labelTh: 'แบบตาราง', labelEn: 'Table', icon: Grid3X3 },
            { id: 'calendar', labelTh: 'ปฏิทิน', labelEn: 'Calendar', icon: CalendarDays },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = mobileTimetableMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMobileTimetableMode(tab.id)}
              className={`min-h-[42px] px-1.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer transition whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? tab.labelTh : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Scope & Classroom Filter Bar */}
      {(hasTeacherTimetableMatch || availableRooms.length > 1) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2">
          {hasTeacherTimetableMatch && (
            <div
              role="group"
              aria-label={lang === 'th' ? 'ขอบเขตตารางสอน' : 'Timetable scope'}
              className="flex items-center gap-1 p-0.5 rounded-xl bg-[var(--color-card-subtle)]"
            >
              <button
                type="button"
                aria-pressed={timetableOnlyMine}
                onClick={() => setTimetableOnlyMine(true)}
                className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap ${
                  timetableOnlyMine
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-body)]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'คาบฉัน' : 'Mine'}</span>
              </button>
              <button
                type="button"
                aria-pressed={!timetableOnlyMine}
                onClick={() => setTimetableOnlyMine(false)}
                className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap ${
                  !timetableOnlyMine
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-body)]'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'ทั้งโรงเรียน' : 'School'}</span>
              </button>
            </div>
          )}

          {availableRooms.length > 1 && (
            <select
              aria-label={lang === 'th' ? 'เลือกห้องเรียน' : 'Select classroom'}
              value={selectedClassRoom}
              onChange={(e) => setSelectedClassRoom(e.target.value)}
              className="min-h-[36px] flex-1 min-w-[130px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 text-xs font-bold text-[var(--color-text-title)]"
            >
              <option value={ALL_ROOMS_VALUE}>
                {lang === 'th' ? `ทุกห้อง (${availableRooms.length} ห้อง)` : `All rooms (${availableRooms.length})`}
              </option>
              {availableRooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ==================== 1. DAILY VIEW ==================== */}
      {mobileTimetableMode === 'day' && (
        <div className="space-y-3">
          {/* Thai-Day Color Coded Day Selector */}
          <div className="grid grid-cols-7 gap-1 p-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
            {THAI_DAY_META.map((d) => {
              const isSelected = selectedTimetableDay === d.id;
              const isToday = todayDayKey === d.id;
              const countForDay = visibleSlots.filter((s) => s.dayOfWeek === d.id).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedTimetableDay(d.id)}
                  className={`min-h-[46px] px-1 py-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition ${
                    isSelected
                      ? d.activeBtnClass
                      : 'border-transparent text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                  }`}
                >
                  <span className="leading-none">{lang === 'th' ? d.shortTh : d.shortEn}</span>
                  <span
                    className={`text-[9px] tabular-nums leading-none ${
                      isSelected ? 'text-white/90' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isToday ? 'วันนี้' : countForDay > 0 ? `${countForDay} คาบ` : '-'}
                  </span>
                </button>
              );
            })}
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
            const daySlots = visibleSlots
              .filter((s) => s.dayOfWeek === selectedTimetableDay)
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

            const breakPeriods = orderedPeriods.filter((p) => p.isBreak);
            const timelineItems: Array<
              | { kind: 'slot'; sortOrder: number; slot: TimetableSlot }
              | { kind: 'break'; sortOrder: number; period: SchoolPeriodTime }
            > = [
              ...daySlots.map((slot) => ({
                kind: 'slot' as const,
                sortOrder: slot.periodNumber,
                slot,
              })),
              ...breakPeriods.map((period) => ({
                kind: 'break' as const,
                sortOrder: period.periodNumber,
                period,
              })),
            ].sort((a, b) => a.sortOrder - b.sortOrder);

            // Only show breaks that sit between or next to actual scheduled slots
            const minPeriodNum = daySlots[0].periodNumber;
            const maxPeriodNum = daySlots[daySlots.length - 1].periodNumber;
            const filteredTimeline = timelineItems.filter(
              (item) =>
                item.kind === 'slot' ||
                (item.period.periodNumber >= minPeriodNum && item.period.periodNumber <= maxPeriodNum)
            );

            return (
              <div className="space-y-2.5">
                {filteredTimeline.map((entry) => {
                  if (entry.kind === 'break') {
                    const bp = entry.period;
                    return (
                      <div
                        key={`break-${bp.periodNumber}`}
                        className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/45 px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200"
                      >
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          <Coffee className="w-3.5 h-3.5 shrink-0" />
                          <span>{bp.labelTh || 'พักกลางวัน'}</span>
                        </span>
                        <span className="text-[11px] font-mono tabular-nums">
                          {bp.startTime} – {bp.endTime}
                        </span>
                      </div>
                    );
                  }

                  const slot = entry.slot;
                  const course = scopedCourses.find((c) => c.id === slot.courseId || c.code === slot.courseCode);
                  const slotColor = getSlotColor(slot);
                  const { slotActivity, status, nextCheckType, canCheckinNow } = getActivePeriodLabel(
                    slot,
                    todayBangkokStr
                  );
                  const dayActionItems = renderSlotActionMenu(slot, todayBangkokStr);
                  const hasCoTeacher = getSlotTeachers(slot).length > 1;

                  return (
                    <div
                      key={slot.id}
                      style={slotColor.style}
                      onClick={() => setInspectSlotTarget({ slot, dateStr: todayBangkokStr })}
                      className={`p-3.5 rounded-2xl border space-y-2.5 cursor-pointer transition ${slotColor.className} ${
                        slotActivity.isActive ? 'border-rose-500 ring-2 ring-rose-500/45 shadow-sm' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold tabular-nums">
                            <span
                              style={{ backgroundColor: slotColor.swatchHex }}
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                            >
                              {lang === 'th' ? `คาบที่ ${slot.periodNumber}` : `Period ${slot.periodNumber}`}
                            </span>
                            <span className="font-mono">
                              {slotActivity.startTime || '--:--'} – {slotActivity.endTime || '--:--'}
                            </span>
                            {slotActivity.isActive && (
                              <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                ถึงคาบเรียน
                                {slotActivity.remainingMinutes !== null
                                  ? ` · เหลือ ${slotActivity.remainingMinutes} น.`
                                  : ''}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold leading-snug">
                            <span className="font-mono mr-1.5">{slot.courseCode}</span>
                            <span>
                              {lang === 'th'
                                ? course?.titleTh || slot.courseTitleTh || slot.courseCode || 'รายวิชา'
                                : course?.titleEn || slot.courseTitleEn || slot.courseCode || 'Course'}
                            </span>
                          </h3>
                          <p className="text-xs opacity-90 truncate">
                            {slot.classRoom || ''}
                            {slot.room ? ` · ห้อง ${slot.room}` : ''}
                            {slot.teacherName ? ` · ${formatSlotTeachersDisplay(slot)}` : ''}
                            {hasCoTeacher ? ' (สอนคู่)' : ''}
                          </p>
                        </div>
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(status.hasCheckIn || status.hasCheckOut) && slot.dayOfWeek === todayDayKey && (
                            <StatusBadge
                              size="xs"
                              status="complete"
                              label={status.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                            />
                          )}
                          {dayActionItems.length > 0 && (
                            <TableActionMenu
                              ariaLabel={`เมนูดำเนินการคาบที่ ${slot.periodNumber}`}
                              triggerClassName="min-h-10 min-w-10 justify-center shrink-0"
                              items={dayActionItems}
                            />
                          )}
                        </div>
                      </div>

                      {canOpenPeriodRoster &&
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
                            <div className="pt-2 border-t border-current/15 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {leavingTeacher ? (
                                  <StatusBadge
                                    size="xs"
                                    status="info"
                                    label={`ครูลา${leavingTeacher.substituteTeacherName ? ` · แทน ${leavingTeacher.substituteTeacherName}` : ''}`}
                                  />
                                ) : selectedTimetableDay === todayDayKey && primaryTeacher ? (
                                  primaryTeacher.status === 'checked_in' ? (
                                    <StatusBadge
                                      size="xs"
                                      status="complete"
                                      label={`ครูเข้า รร.${primaryTeacher.checkInTime ? ` ${primaryTeacher.checkInTime}` : ''}`}
                                    />
                                  ) : primaryTeacher.status === 'late' ? (
                                    <StatusBadge size="xs" status="pending" label="ครูสาย รร." />
                                  ) : (
                                    <StatusBadge size="xs" status="pending" label="ครูยังไม่เช็คอิน รร." />
                                  )
                                ) : null}
                                {slotSummary.periodCheckedTotal > 0 ? (
                                  <>
                                    <span className="font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
                                      มา {slotSummary.periodPresent + slotSummary.periodLate}/
                                      {slotSummary.expectedTotal}
                                    </span>
                                    {slotSummary.periodExcused > 0 && (
                                      <span className="font-bold text-indigo-800 dark:text-indigo-200 tabular-nums">
                                        ลา {slotSummary.periodExcused}
                                      </span>
                                    )}
                                    {slotSummary.periodAbsent > 0 && (
                                      <span className="font-bold text-rose-800 dark:text-rose-200 tabular-nums">
                                        ขาด {slotSummary.periodAbsent}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {slotSummary.studentLeaveCount > 0 && (
                                      <span className="font-bold text-amber-800 dark:text-amber-200 tabular-nums">
                                        นร.ลา {slotSummary.studentLeaveCount}
                                      </span>
                                    )}
                                    {selectedTimetableDay === todayDayKey &&
                                      slotSummary.hasAnyGateRecordsForDate &&
                                      slotSummary.expectedTotal > 0 && (
                                        <span className="font-semibold opacity-80 tabular-nums">
                                          เข้า รร. {slotSummary.gatePresentCount}/{slotSummary.expectedTotal}
                                        </span>
                                      )}
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenPeriodRoster({ slot, date: todayBangkokStr });
                                }}
                                className="min-h-[32px] px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>เช็กชื่อคาบ</span>
                              </button>
                            </div>
                          );
                        })()}

                      {canCheckinNow && !canOpenPeriodRoster && (
                        <div className="pt-2 border-t border-current/15" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openPeriodCheckinFromSlot(slot, todayBangkokStr, nextCheckType)}
                            className={`w-full min-h-[38px] rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                              slotActivity.isActive
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : nextCheckType === 'check_out'
                                  ? 'bg-slate-800 hover:bg-slate-900'
                                  : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                            }`}
                          >
                            {nextCheckType === 'check_out' ? (
                              <LogOut className="w-3.5 h-3.5" />
                            ) : (
                              <LogIn className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {status.hasCheckIn && status.hasCheckOut
                                ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
                                : nextCheckType === 'check_out'
                                  ? 'เช็คเอาท์คาบเรียน'
                                  : 'เช็คอินเข้าคาบเรียน'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ==================== 2. WEEKLY VIEW ==================== */}
      {mobileTimetableMode === 'week' && (
        <div className="space-y-3">
          {/* Week Navigator */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5">
            <button
              type="button"
              aria-label="สัปดาห์ก่อนหน้า"
              onClick={() => setWeeklyStartDate((prev) => addCalendarDays(prev, -7))}
              className="min-h-[38px] min-w-[38px] rounded-xl border border-[var(--color-border)] grid place-items-center cursor-pointer hover:bg-[var(--color-card-subtle)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeeklyStartDate(getCalendarWeekStart(todayBangkokStr))}
              className="text-center cursor-pointer"
            >
              <div className="text-xs font-bold text-[var(--color-text-title)] tabular-nums">
                {weeklyRangeLabel}
              </div>
              <div className="text-[10px] text-[var(--color-primary-text)] font-semibold tabular-nums">
                รวม {visibleSlots.length} คาบ/สัปดาห์ · แตะเพื่อกลับสัปดาห์นี้
              </div>
            </button>
            <button
              type="button"
              aria-label="สัปดาห์ถัดไป"
              onClick={() => setWeeklyStartDate((prev) => addCalendarDays(prev, 7))}
              className="min-h-[38px] min-w-[38px] rounded-xl border border-[var(--color-border)] grid place-items-center cursor-pointer hover:bg-[var(--color-card-subtle)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekly Day-by-Day Color Separated Sections */}
          <div className="space-y-3">
            {weeklyDaysWithDates.map((day) => {
              const dayHolidays = getHolidaysForDate(day.dateStr, activeSchool.id);
              const primaryHoliday = dayHolidays[0] || null;
              const dayNotes = getVisibleCalendarNotesForDate(
                activeSchool.id,
                day.dateStr,
                currentUser?.id,
                currentRole
              );
              const dayAssignments = assignments.filter(
                (a) => a.status !== 'closed' && (a.dueDate || '').slice(0, 10) === day.dateStr
              );
              const daySlots = visibleSlots
                .filter((s) => s.dayOfWeek === day.id)
                .slice()
                .sort((a, b) => a.periodNumber - b.periodNumber);
              const isToday = day.dateStr === todayBangkokStr;

              return (
                <section
                  key={day.id}
                  className={`rounded-2xl border overflow-hidden ${
                    primaryHoliday
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                      : isToday
                        ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30 bg-[var(--color-card)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card)]'
                  }`}
                >
                  {/* Day Header with Thai Day Color */}
                  <div
                    className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 ${
                      primaryHoliday
                        ? 'bg-rose-100/80 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                        : day.headerBgClass
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold shrink-0 ${day.badgeClass}`}
                      >
                        {lang === 'th' ? day.fullTh : day.fullEn}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-text-title)] tabular-nums truncate">
                        {formatShortThaiDateLabel(day.dateStr)}
                      </span>
                      {isToday && (
                        <span className="rounded-md bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0">
                          วันนี้
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-[var(--color-text-muted)] tabular-nums shrink-0">
                      {primaryHoliday ? (
                        <span className="text-rose-700 dark:text-rose-300 font-bold">วันหยุด</span>
                      ) : (
                        `${daySlots.length} คาบ`
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 space-y-1.5">
                    {primaryHoliday && (
                      <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-xs text-rose-700 dark:text-rose-200 flex items-center gap-1.5 font-bold">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        <span>หยุด: {primaryHoliday.nameTh}</span>
                      </div>
                    )}

                    {dayAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-1.5 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5"
                      >
                        <BookOpenCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300 shrink-0" />
                        <span className="font-bold truncate">
                          ส่งงาน: {a.courseCode ? `[${a.courseCode}] ` : ''}
                          {a.titleTh || a.titleEn}
                        </span>
                      </div>
                    ))}

                    {dayNotes.map((n) => {
                      const cm = getCalendarNoteColorMeta(n.color);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setMobileSelectedCalendarDate(day.dateStr);
                            setMobileTimetableMode('calendar');
                          }}
                          className={`w-full text-left rounded-xl border px-3 py-1.5 text-[11px] flex items-center justify-between gap-2 cursor-pointer ${cm.cardClass}`}
                        >
                          <span className="font-bold text-[var(--color-text-title)] truncate">
                            โน้ต: {n.title}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${cm.badgeClass}`}>
                            {n.scope === 'school' ? 'โรงเรียน' : 'ส่วนตัว'}
                          </span>
                        </button>
                      );
                    })}

                    {daySlots.length === 0 ? (
                      <p className="py-3 text-center text-[11px] text-[var(--color-text-muted)]">
                        {lang === 'th' ? 'ไม่มีคาบเรียนในวันนี้' : 'No classes scheduled'}
                      </p>
                    ) : (
                      daySlots.map((slot) => {
                        const slotColor = getSlotColor(slot);
                        const { slotActivity, status } = getActivePeriodLabel(slot, day.dateStr);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setInspectSlotTarget({ slot, dateStr: day.dateStr })}
                            style={slotColor.style}
                            className={`w-full text-left rounded-xl border px-3 py-2 flex items-center justify-between gap-2.5 cursor-pointer transition ${slotColor.className} ${
                              slotActivity.isActive ? 'border-rose-500 ring-2 ring-rose-500/40' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                style={{ backgroundColor: slotColor.swatchHex }}
                                className="w-11 py-1 rounded-lg text-center text-[10px] font-bold text-white shrink-0 tabular-nums leading-tight"
                              >
                                คาบ {slot.periodNumber}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold truncate">
                                  <span className="font-mono shrink-0">{slot.courseCode}</span>
                                  <span className="truncate">
                                    {lang === 'th'
                                      ? slot.courseTitleTh || slot.courseCode
                                      : slot.courseTitleEn || slot.courseTitleTh || slot.courseCode}
                                  </span>
                                </div>
                                <div className="text-[10px] opacity-85 truncate tabular-nums">
                                  {slotActivity.startTime || '--:--'}–{slotActivity.endTime || '--:--'} ·{' '}
                                  {slot.classRoom}
                                  {slot.room ? ` · ห้อง ${slot.room}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {slotActivity.isActive && (
                                <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                  กำลังเรียน
                                </span>
                              )}
                              {(status.hasCheckIn || status.hasCheckOut) && isToday && (
                                <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                              )}
                              <ChevronRight className="w-4 h-4 opacity-60" />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== 3. INLINE GRID / TABLE VIEW ==================== */}
      {mobileTimetableMode === 'grid' && (
        <div className="space-y-2.5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ตารางเรียน/สอนแบบตารางรายสัปดาห์' : 'Weekly Timetable Matrix'}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'แยกสีตามกลุ่มวิชาและวัน · แตะช่องวิชาเพื่อเช็กชื่อ/เช็คอิน'
                  : 'Color-coded by subject & day · Tap any slot for details'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => printTimetableLandscape()}
                className="min-h-[36px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-bold text-[var(--color-text-title)] inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                <span>พิมพ์ A4</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLandscapeWeekly(true);
                  void enterLandscapeGameMode(landscapeContainerRef.current);
                }}
                className="min-h-[36px] px-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>เต็มจอแนวนอน</span>
              </button>
            </div>
          </div>

          {renderMatrixTable(false)}
        </div>
      )}

      {/* ==================== 4. CALENDAR + HOLIDAYS + ACTIVITIES VIEW ==================== */}
      {mobileTimetableMode === 'calendar' && (
        <div className="space-y-3">
          {/* Month Selector Header */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5">
            <button
              type="button"
              onClick={() =>
                setMobileCalendarMonthCursor((prev) =>
                  prev.month === 0
                    ? { year: prev.year - 1, month: 11 }
                    : { year: prev.year, month: prev.month - 1 }
                )
              }
              className="min-h-[38px] px-3 rounded-xl border border-[var(--color-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-card-subtle)]"
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
              className="text-center cursor-pointer"
            >
              <div className="text-sm font-bold text-[var(--color-text-title)]">{monthTitleTh}</div>
              <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                วันหยุด {monthHolidays.length} วัน · กิจกรรม/งาน {monthAssignments.length}
              </div>
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
              className="min-h-[38px] px-3 rounded-xl border border-[var(--color-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-card-subtle)]"
            >
              ถัดไป
            </button>
          </div>

          {/* Color Legend + Holiday Actions */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-[var(--color-text-body)]">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>วันหยุด</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                <span>กิจกรรม/ส่งงาน</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>โน้ตโรงเรียน</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>โน้ตส่วนตัว</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                <span>วันนี้</span>
              </span>
            </div>

            {canManageHolidays && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border)] text-[11px]">
                <span className="text-[var(--color-text-muted)] tabular-nums">
                  วันหยุด พ.ศ. {mobileCalendarMonthCursor.year + 543} (
                  {getHolidaysForYear(mobileCalendarMonthCursor.year, activeSchool.id).length} วัน)
                  {holidaySyncStatus && !holidaySyncStatus.usedFallback ? ' · ซิงค์ API แล้ว' : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isSyncingHolidays}
                    onClick={() => void onManualHolidaySync(mobileCalendarMonthCursor.year)}
                    className="min-h-[32px] px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingHolidays ? 'animate-spin' : ''}`} />
                    <span>ซิงค์วันหยุด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewHolidayDate(mobileSelectedCalendarDate);
                      setShowAddHolidayForm((v) => !v);
                    }}
                    className="min-h-[32px] px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มวันหยุด รร.</span>
                  </button>
                </div>
              </div>
            )}

            {canManageHolidays && showAddHolidayForm && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 p-2.5 space-y-2 text-xs">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs"
                  />
                  <input
                    type="text"
                    value={newHolidayNameTh}
                    onChange={(e) => setNewHolidayNameTh(e.target.value)}
                    placeholder="ชื่อวันหยุด / กิจกรรมงดเรียน"
                    className="flex-1 min-w-[160px] h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddHolidayForm(false)}
                    className="h-8 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[11px] font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newHolidayDate || !newHolidayNameTh.trim()) return;
                      addSchoolCustomHoliday(activeSchool.id, {
                        date: newHolidayDate,
                        nameTh: newHolidayNameTh.trim(),
                      });
                      setNewHolidayNameTh('');
                      setShowAddHolidayForm(false);
                      setMobileSelectedCalendarDate(newHolidayDate);
                      setHolidayLocalTick((v) => v + 1);
                      onHolidayMutated?.();
                    }}
                    className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    บันทึกวันหยุด
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile 7-col Calendar */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 space-y-1.5">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--color-text-muted)]">
              {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((d, i) => (
                <div key={d} className={i >= 5 ? 'text-rose-600 dark:text-rose-400' : ''}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, idx) => {
                if (!cell) return <div key={`mblank-${idx}`} className="h-14 rounded-xl bg-[var(--color-card-subtle)]/35" />;
                const cellHol = monthHolidays.find((h) => h.date === cell.dateStr);
                const cellNotes = monthNotesMap.get(cell.dateStr) || [];
                const hasSchoolNote = cellNotes.some((n) => n.scope === 'school');
                const hasPersonalNote = cellNotes.some((n) => n.scope === 'personal');
                const cellAssignments = assignments.filter(
                  (a) => a.status !== 'closed' && (a.dueDate || '').slice(0, 10) === cell.dateStr
                );
                const isToday = cell.dateStr === todayBangkokStr;
                const isSel = cell.dateStr === mobileSelectedCalendarDate;
                const isWknd = isWeekendDate(cell.dateStr);
                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setMobileSelectedCalendarDate(cell.dateStr)}
                    className={`h-14 rounded-xl border p-1 flex flex-col items-center justify-between text-xs font-bold tabular-nums cursor-pointer transition ${
                      isSel
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                        : cellHol
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          : cellAssignments.length > 0
                            ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/35 text-indigo-800 dark:text-indigo-200'
                            : isWknd
                              ? 'border-transparent bg-[var(--color-card-subtle)]/50 text-[var(--color-text-muted)]'
                              : 'border-[var(--color-border)] text-[var(--color-text-title)]'
                    }`}
                  >
                    <span
                      className={
                        isToday
                          ? 'w-5 h-5 rounded-md bg-[var(--color-primary)] text-white inline-flex items-center justify-center text-[11px]'
                          : ''
                      }
                    >
                      {cell.dayNum}
                    </span>

                    <div className="w-full flex flex-col items-center gap-0.5">
                      {cellHol && (
                        <span className="w-full rounded bg-rose-600 text-white text-[8px] font-bold leading-tight px-0.5 truncate text-center">
                          หยุด
                        </span>
                      )}
                      {!cellHol && cellAssignments.length > 0 && (
                        <span className="w-full rounded bg-indigo-600 text-white text-[8px] font-bold leading-tight px-0.5 truncate text-center">
                          งาน {cellAssignments.length}
                        </span>
                      )}
                      {cellNotes.length > 0 && (
                        <span className="flex items-center justify-center gap-0.5">
                          {hasSchoolNote && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          {hasPersonalNote && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Calendar Day Details */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  {formatCalendarDate(mobileSelectedCalendarDate)}
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  {mobileSelectedCalendarDate}
                  {selectedDateHolidays.length > 0
                    ? ' · วันหยุด'
                    : ` · ${selectedCalDaySlots.length} คาบ`}
                </p>
              </div>
              {mobileSelectedCalendarDate === todayBangkokStr && (
                <span className="rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
                  วันนี้
                </span>
              )}
            </div>

            {selectedDateHolidays.map((h) => (
              <div
                key={h.id}
                className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/45 p-3 text-xs flex items-start justify-between gap-2"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-rose-700 dark:text-rose-200 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span>{h.nameTh}</span>
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-300">
                    {h.nameEn} · {getThaiHolidayCategoryLabel(h, lang)}
                  </p>
                </div>
                {canManageHolidays && h.type === 'school' && (
                  <button
                    type="button"
                    onClick={() => {
                      removeSchoolCustomHoliday(activeSchool.id, h.id);
                      setHolidayLocalTick((v) => v + 1);
                      onHolidayMutated?.();
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer shrink-0"
                    title="ลบวันหยุดโรงเรียน"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {selectedDateAssignments.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <BookOpenCheck className="w-3.5 h-3.5" />
                  <span>กิจกรรม / กำหนดส่งงาน ({selectedDateAssignments.length})</span>
                </p>
                {selectedDateAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 p-2.5 text-xs"
                  >
                    <p className="font-bold text-indigo-950 dark:text-indigo-100">
                      {a.courseCode ? `[${a.courseCode}] ` : ''}
                      {a.titleTh || a.titleEn}
                    </p>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 tabular-nums">
                      ครบกำหนด: {a.dueDate}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile Calendar Notes Section */}
            {(() => {
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
                      <span>โน้ต / กิจกรรม ({mobileDayNotes.length})</span>
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
                        placeholder="หัวข้อโน้ต / กิจกรรม / เตือนความจำ"
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
                              title={c.labelTh}
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
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${cm.dotClass} shrink-0`} />
                                <p className="font-bold text-[var(--color-text-title)]">{note.title}</p>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${cm.badgeClass}`}>
                                  {note.scope === 'school' ? 'โรงเรียน' : 'ส่วนตัว'}
                                </span>
                              </div>
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

            {/* Scheduled Periods on Selected Calendar Date (Color Coded) */}
            {selectedCalDaySlots.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
                  ตารางเรียน/สอนวันที่เลือก ({selectedCalDaySlots.length} คาบ)
                </p>
                {selectedCalDaySlots.map((slot) => {
                  const slotColor = getSlotColor(slot);
                  const { slotActivity, status } = getActivePeriodLabel(slot, mobileSelectedCalendarDate);
                  const calendarActionItems = renderSlotActionMenu(slot, mobileSelectedCalendarDate);
                  return (
                    <div
                      key={slot.id}
                      style={slotColor.style}
                      onClick={() => setInspectSlotTarget({ slot, dateStr: mobileSelectedCalendarDate })}
                      className={`rounded-xl border p-3 space-y-2 cursor-pointer transition ${slotColor.className} ${
                        slotActivity.isActive ? 'border-rose-500 ring-2 ring-rose-500/35' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold tabular-nums flex flex-wrap items-center gap-1.5">
                            <span
                              style={{ backgroundColor: slotColor.swatchHex }}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                            >
                              คาบ {slot.periodNumber}
                            </span>
                            <span>
                              {slotActivity.startTime}–{slotActivity.endTime}
                            </span>
                            {slotActivity.isActive && (
                              <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
                                ถึงคาบเรียน
                                {slotActivity.remainingMinutes !== null
                                  ? ` · เหลือ ${slotActivity.remainingMinutes} น.`
                                  : ''}
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-bold mt-1">
                            {slot.courseCode} · {slot.courseTitleTh}
                          </p>
                          <p className="text-[11px] opacity-85 truncate">
                            {slot.classRoom}
                            {slot.room ? ` · ห้อง ${slot.room}` : ''}
                            {slot.teacherName ? ` · ${formatSlotTeachersDisplay(slot)}` : ''}
                          </p>
                        </div>
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(status.hasCheckIn || status.hasCheckOut) && (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              {status.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                            </span>
                          )}
                          {calendarActionItems.length > 0 && (
                            <TableActionMenu
                              ariaLabel={`เมนูดำเนินการคาบที่ ${slot.periodNumber}`}
                              triggerClassName="min-h-10 min-w-10 justify-center shrink-0"
                              items={calendarActionItems}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {monthHolidays.length > 0 && (
              <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
                <p className="text-xs font-bold text-[var(--color-text-title)]">
                  วันหยุดประจำเดือน ({monthHolidays.length})
                </p>
                <div className="space-y-1">
                  {monthHolidays.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setMobileSelectedCalendarDate(h.date)}
                      className="w-full text-left rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 px-2.5 py-1.5 text-[11px] tabular-nums flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate font-semibold text-rose-800 dark:text-rose-200">
                        {h.nameTh}
                      </span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-300 shrink-0">
                        {formatShortThaiDateLabel(h.date)} · {getThaiHolidayCategoryLabel(h, lang)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SLOT DETAIL BOTTOM SHEET ==================== */}
      {inspectSlotTarget &&
        (() => {
          const { slot, dateStr } = inspectSlotTarget;
          const slotColor = getSlotColor(slot);
          const course = scopedCourses.find((c) => c.id === slot.courseId || c.code === slot.courseCode);
          const { slotActivity, status, nextCheckType, canCheckinNow } = getActivePeriodLabel(slot, dateStr);
          const hasCoTeacher = getSlotTeachers(slot).length > 1;
          const dayInfo = DAY_META_MAP[slot.dayOfWeek as AnyDayKey];
          return (
            <div
              className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setInspectSlotTarget(null)}
            >
              <div
                className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-3 mb-1 sm:hidden" />
                <div
                  style={slotColor.style}
                  className={`mx-3 mt-2 rounded-2xl border p-3.5 ${slotColor.className}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span
                          style={{ backgroundColor: slotColor.swatchHex }}
                          className="rounded-md px-2 py-0.5 text-[10px] text-white tabular-nums"
                        >
                          คาบ {slot.periodNumber}
                        </span>
                        {dayInfo && <span>วัน{dayInfo.fullTh}</span>}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {slotActivity.startTime || '--:--'} – {slotActivity.endTime || '--:--'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold leading-snug">
                        {slot.courseCode} ·{' '}
                        {lang === 'th'
                          ? course?.titleTh || slot.courseTitleTh || slot.courseCode
                          : course?.titleEn || slot.courseTitleEn || slot.courseCode}
                      </h3>
                    </div>
                    <button
                      type="button"
                      aria-label="ปิดรายละเอียดคาบ"
                      onClick={() => setInspectSlotTarget(null)}
                      className="min-h-[36px] min-w-[36px] rounded-xl bg-black/10 dark:bg-white/10 grid place-items-center cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                        ชั้น / ห้องเรียน
                      </span>
                      <p className="font-bold text-[var(--color-text-title)]">{slot.classRoom || '-'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>ห้องสถานที่</span>
                      </span>
                      <p className="font-bold text-[var(--color-text-title)]">{slot.room || 'ไม่ระบุ'}</p>
                    </div>
                    <div className="col-span-2 space-y-0.5 pt-1 border-t border-[var(--color-border)]">
                      <span className="text-[10px] font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
                        {hasCoTeacher ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        <span>ครูผู้สอน{hasCoTeacher ? ' (สอนคู่)' : ''}</span>
                      </span>
                      <p className="font-bold text-[var(--color-text-title)]">
                        {formatSlotTeachersDisplay(slot) || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {canOpenPeriodRoster && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectSlotTarget(null);
                          onOpenPeriodRoster({ slot, date: dateStr });
                        }}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>รายชื่อ / เช็กชื่อนักเรียน</span>
                      </button>
                    )}
                    {canCheckinNow && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectSlotTarget(null);
                          openPeriodCheckinFromSlot(slot, dateStr, nextCheckType);
                        }}
                        className={`flex-1 min-h-[44px] px-4 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
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
                              : 'เช็คอินเข้าคาบเรียน'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ==================== FULLSCREEN LANDSCAPE WEEKLY OVERLAY ==================== */}
      {showLandscapeWeekly && (
        <div
          ref={landscapeContainerRef}
          className="timetable-print-area print-area fixed inset-0 z-[120] bg-[var(--color-canvas)] flex flex-col p-2.5 sm:p-4 overflow-hidden print:static print:p-0"
        >
          <div className="hidden print:flex items-center justify-between gap-4 pb-2 mb-2 border-b-2 border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn} ·{' '}
                {lang === 'th' ? 'ตารางเรียน / ตารางสอนรายสัปดาห์' : 'Weekly Timetable'}
              </h2>
              <p className="text-[11px] text-slate-700">
                {currentRole === 'teacher' && timetableOnlyMine
                  ? lang === 'th'
                    ? 'เฉพาะคาบสอนของฉัน'
                    : 'My teaching periods'
                  : lang === 'th'
                    ? 'ทุกคาบในความรับผิดชอบ'
                    : 'All visible periods'}
                {selectedClassRoom !== ALL_ROOMS_VALUE ? ` · ${selectedClassRoom}` : ''}
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
                {lang === 'th'
                  ? 'เลื่อนซ้าย-ขวาเพื่อดูครบทุกคาบ หรือกดพิมพ์ A4 แนวนอน'
                  : 'Scroll horizontally or print in A4 landscape'}
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
            {renderMatrixTable(true)}
          </div>
        </div>
      )}
    </div>
  );
};
