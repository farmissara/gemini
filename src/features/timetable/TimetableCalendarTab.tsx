import React from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
  ChevronRight,
  Edit3,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  Course,
  DayOfWeek,
  LeaveRequest,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../../types';
import {
  addCalendarDays,
  BangkokClockSnapshot,
  formatCalendarDate,
  getBangkokDateInputValue,
  getCalendarWeekStart,
  getTimetableSlotActivityStatus,
} from '../../lib/timetableCalendar';
import {
  addSchoolCustomHoliday,
  getHolidayForDate,
  getHolidaysForDate,
  getHolidaysForYear,
  getHolidaysInMonth,
  getThaiHolidayCategoryLabel,
  HolidaySyncStatus,
  isWeekendDate,
  removeSchoolCustomHoliday,
  ThaiHoliday,
} from '../../lib/thaiHolidays';
import {
  CALENDAR_NOTE_COLORS,
  CalendarNote,
  CalendarNoteColor,
  CalendarNoteScope,
  deleteCalendarNote,
  getCalendarNoteColorMeta,
  getVisibleCalendarNotesForDate,
  getVisibleCalendarNotesMapForMonth,
  saveCalendarNote,
} from '../../lib/calendarNotes';
import { formatSlotTeachersDisplay, getSlotTeachers } from '../../lib/timetableTeachers';
import { getTimetableSlotCardStyle } from '../../lib/timetableColors';
import { DAYS, formatTimeMinutes } from './types';
import { SlotStaffStatusBadges } from './SlotStaffStatusBadges';

interface TimetableCalendarTabProps {
  schoolId: string;
  lang: AppLanguage;
  isAdmin: boolean;
  isPersonalViewer: boolean;
  currentRole: UserRole;
  currentUser: AuthUser | null;
  todayBangkokDate: string;
  bangkokClock: BangkokClockSnapshot;
  activeSlots: TimetableSlot[];
  assignments: Assignment[];
  courses: Course[];
  students: Student[];
  teachers: Teacher[];
  schoolPeriods: SchoolPeriodTime[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  conflictingSlotIds: Set<string>;
  calendarLayoutMode: 'week' | 'month';
  setCalendarLayoutMode: (mode: 'week' | 'month') => void;
  calendarMonthCursor: { year: number; month: number };
  setCalendarMonthCursor: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>;
  selectedCalendarDate: string;
  setSelectedCalendarDate: (date: string) => void;
  calendarWeekStart: string;
  setCalendarWeekStart: React.Dispatch<React.SetStateAction<string>>;
  calendarWeekDays: Array<(typeof DAYS)[number] & { date: string }>;
  calendarWeekRangeLabel: string;
  holidaySyncStatus: HolidaySyncStatus | null;
  isSyncingHolidays: boolean;
  handleManualHolidaySync: (targetYear?: number) => Promise<void>;
  todayHoliday: ThaiHoliday | null;
  upcomingHolidaysList: ThaiHoliday[];
  showAddHolidayForm: boolean;
  setShowAddHolidayForm: React.Dispatch<React.SetStateAction<boolean>>;
  newHolidayDate: string;
  setNewHolidayDate: (val: string) => void;
  newHolidayNameTh: string;
  setNewHolidayNameTh: (val: string) => void;
  setHolidayRefreshTick: React.Dispatch<React.SetStateAction<number>>;
  calendarNotesTick: number;
  setCalendarNotesTick: React.Dispatch<React.SetStateAction<number>>;
  showNoteForm: boolean;
  setShowNoteForm: (val: boolean) => void;
  editingNoteId: string | null;
  setEditingNoteId: (val: string | null) => void;
  noteTitleDraft: string;
  setNoteTitleDraft: (val: string) => void;
  noteContentDraft: string;
  setNoteContentDraft: (val: string) => void;
  noteScopeDraft: CalendarNoteScope;
  setNoteScopeDraft: (val: CalendarNoteScope) => void;
  noteColorDraft: CalendarNoteColor;
  setNoteColorDraft: (val: CalendarNoteColor) => void;
  canUsePeriodCheckin: boolean;
  canOpenPeriodRoster: boolean;
  getSlotTimeRange: (slot: Pick<TimetableSlot, 'periodNumber' | 'startTime' | 'endTime'>) => { start: number; end: number } | null;
  getSlotCheckStatusForDate: (slot: TimetableSlot, dateStr: string) => {
    resolvedCourseId: string;
    hasCheckIn: boolean;
    hasCheckOut: boolean;
  };
  triggerSlotCheckin: (slot: TimetableSlot, dateStr: string, checkType: 'check_in' | 'check_out') => void;
  openSlotDetails: (slot: TimetableSlot) => void;
  setSelectedConflictSlotId: (slotId: string | null) => void;
  setPeriodRosterTarget: (target: { slot: TimetableSlot; date: string } | null) => void;
  setShowImportExportModal: (show: boolean) => void;
  openGoogleCalendarModal: () => void;
  renderRoomAndTermControls: (showRoomFilter?: boolean) => React.ReactNode;
}

export const TimetableCalendarTab: React.FC<TimetableCalendarTabProps> = ({
  schoolId,
  lang,
  isAdmin,
  isPersonalViewer,
  currentRole,
  currentUser,
  todayBangkokDate,
  bangkokClock,
  activeSlots,
  assignments,
  courses,
  students,
  teachers,
  schoolPeriods,
  attendance,
  periodAttendance,
  leaveRequests,
  conflictingSlotIds,
  calendarLayoutMode,
  setCalendarLayoutMode,
  calendarMonthCursor,
  setCalendarMonthCursor,
  selectedCalendarDate,
  setSelectedCalendarDate,
  calendarWeekStart,
  setCalendarWeekStart,
  calendarWeekDays,
  calendarWeekRangeLabel,
  holidaySyncStatus,
  isSyncingHolidays,
  handleManualHolidaySync,
  todayHoliday,
  upcomingHolidaysList,
  showAddHolidayForm,
  setShowAddHolidayForm,
  newHolidayDate,
  setNewHolidayDate,
  newHolidayNameTh,
  setNewHolidayNameTh,
  setHolidayRefreshTick,
  calendarNotesTick,
  setCalendarNotesTick,
  showNoteForm,
  setShowNoteForm,
  editingNoteId,
  setEditingNoteId,
  noteTitleDraft,
  setNoteTitleDraft,
  noteContentDraft,
  setNoteContentDraft,
  noteScopeDraft,
  setNoteScopeDraft,
  noteColorDraft,
  setNoteColorDraft,
  canUsePeriodCheckin,
  canOpenPeriodRoster,
  getSlotTimeRange,
  getSlotCheckStatusForDate,
  triggerSlotCheckin,
  openSlotDetails,
  setSelectedConflictSlotId,
  setPeriodRosterTarget,
  setShowImportExportModal,
  openGoogleCalendarModal,
  renderRoomAndTermControls,
}) => {
  const monthHolidays = getHolidaysInMonth(calendarMonthCursor.year, calendarMonthCursor.month, schoolId);
  const firstDayOfMonth = new Date(Date.UTC(calendarMonthCursor.year, calendarMonthCursor.month, 1));
  const daysInMonth = new Date(Date.UTC(calendarMonthCursor.year, calendarMonthCursor.month + 1, 0)).getUTCDate();
  const leadingBlanks = (firstDayOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const monthCells: Array<{ dateStr: string; dayNum: number } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${calendarMonthCursor.year}-${String(calendarMonthCursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { dateStr, dayNum: d };
    }),
  ];
  const monthTitleTh = firstDayOfMonth.toLocaleDateString('th-TH', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });

  const selectedDateObj = new Date(`${selectedCalendarDate}T00:00:00Z`);
  const selectedDayKeyMap: Array<DayOfWeek | null> = [null, 'mon', 'tue', 'wed', 'thu', 'fri', null];
  const selectedDayKey = selectedDayKeyMap[selectedDateObj.getUTCDay()] || null;
  const selectedDateHolidays: ThaiHoliday[] = getHolidaysForDate(selectedCalendarDate, schoolId);
  const selectedDaySlots = selectedDayKey
    ? activeSlots
        .filter((slot) => slot.dayOfWeek === selectedDayKey)
        .sort(
          (a, b) =>
            (getSlotTimeRange(a)?.start ?? 0) - (getSlotTimeRange(b)?.start ?? 0) ||
            a.periodNumber - b.periodNumber
        )
    : [];
  const selectedDayAssignments = assignments.filter(
    (a) => a.status !== 'closed' && (a.dueDate || '').slice(0, 10) === selectedCalendarDate
  );
  void calendarNotesTick;
  const monthNotesMap = getVisibleCalendarNotesMapForMonth(
    schoolId,
    calendarMonthCursor.year,
    calendarMonthCursor.month,
    currentUser?.id,
    currentRole
  );
  const selectedDateNotes = getVisibleCalendarNotesForDate(
    schoolId,
    selectedCalendarDate,
    currentUser?.id,
    currentRole
  );
  const resetNoteForm = () => {
    setShowNoteForm(false);
    setEditingNoteId(null);
    setNoteTitleDraft('');
    setNoteContentDraft('');
    setNoteScopeDraft('personal');
    setNoteColorDraft('amber');
  };
  const handleStartNewNote = (targetDate?: string) => {
    if (targetDate) setSelectedCalendarDate(targetDate);
    setEditingNoteId(null);
    setNoteTitleDraft('');
    setNoteContentDraft('');
    setNoteScopeDraft('personal');
    setNoteColorDraft('amber');
    setShowNoteForm(true);
  };
  const handleStartEditNote = (note: CalendarNote) => {
    setEditingNoteId(note.id);
    setNoteTitleDraft(note.title);
    setNoteContentDraft(note.content);
    setNoteScopeDraft(note.scope);
    setNoteColorDraft(note.color);
    setShowNoteForm(true);
  };
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = noteTitleDraft.trim();
    const trimmedContent = noteContentDraft.trim();
    if (!trimmedTitle && !trimmedContent) return;
    saveCalendarNote({
      id: editingNoteId || undefined,
      schoolId,
      date: selectedCalendarDate,
      title: trimmedTitle || trimmedContent.slice(0, 40),
      content: trimmedContent,
      scope: isPersonalViewer ? 'personal' : noteScopeDraft,
      color: noteColorDraft,
      authorId: currentUser?.id || `role:${currentRole}`,
      authorName: currentUser?.fullNameTh || currentUser?.fullNameEn || currentRole,
      authorRole: currentRole,
    });
    resetNoteForm();
    setCalendarNotesTick((v) => v + 1);
  };

  return (
    <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
      <header className="shrink-0 space-y-2 border-b border-[var(--color-border)] p-2.5 sm:px-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--color-text-title)]">
              {calendarLayoutMode === 'month' ? `ปฏิทินการศึกษา · ${monthTitleTh}` : 'ปฏิทินตารางสอนรายสัปดาห์'}
            </h2>
            <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
              {calendarLayoutMode === 'month'
                ? `วันหยุดเดือนนี้ ${monthHolidays.length} วัน · ${activeSlots.length} คาบ/สัปดาห์`
                : `${calendarWeekRangeLabel} · ${activeSlots.length} คาบ/สัปดาห์`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Layout toggle: Month / Week */}
            <div className="seg-tab-group">
              <button
                type="button"
                data-active={calendarLayoutMode === 'month'}
                onClick={() => setCalendarLayoutMode('month')}
                className="seg-tab-btn text-xs cursor-pointer"
              >
                รายเดือน + วันหยุด
              </button>
              <button
                type="button"
                data-active={calendarLayoutMode === 'week'}
                onClick={() => setCalendarLayoutMode('week')}
                className="seg-tab-btn text-xs cursor-pointer"
              >
                รายสัปดาห์
              </button>
            </div>

            {calendarLayoutMode === 'month' ? (
              <div className="fn-group">
                <button
                  type="button"
                  aria-label="เดือนก่อนหน้า"
                  onClick={() =>
                    setCalendarMonthCursor((prev) =>
                      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = getBangkokDateInputValue();
                    setCalendarMonthCursor({
                      year: Number(today.slice(0, 4)),
                      month: Number(today.slice(5, 7)) - 1,
                    });
                    setSelectedCalendarDate(today);
                  }}
                  className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  aria-label="เดือนถัดไป"
                  onClick={() =>
                    setCalendarMonthCursor((prev) =>
                      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="fn-group">
                <span className="fn-group-label text-[var(--color-text-muted)]">สัปดาห์</span>
                <button
                  type="button"
                  aria-label="สัปดาห์ก่อนหน้า"
                  onClick={() => setCalendarWeekStart((previous) => addCalendarDays(previous, -7))}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <input
                  id="timetable-calendar-week"
                  type="date"
                  value={calendarWeekStart}
                  onChange={(event) => {
                    if (event.target.value) setCalendarWeekStart(getCalendarWeekStart(event.target.value));
                  }}
                  className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-text-title)]"
                />
                <button
                  type="button"
                  onClick={() => setCalendarWeekStart(getCalendarWeekStart(getBangkokDateInputValue()))}
                  className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  aria-label="สัปดาห์ถัดไป"
                  onClick={() => setCalendarWeekStart((previous) => addCalendarDays(previous, 7))}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="fn-group">
              {isAdmin && (
                <button
                  type="button"
                  disabled={isSyncingHolidays}
                  onClick={() => void handleManualHolidaySync(calendarMonthCursor.year)}
                  className="btn-tool-neutral px-2.5 py-1.5 disabled:opacity-60"
                  title="ดึงวันหยุดราชการไทยล่าสุดจาก Public Holiday API"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-rose-500 ${isSyncingHolidays ? 'animate-spin' : ''}`} />
                  <span>{isSyncingHolidays ? 'กำลังซิงค์...' : 'ซิงค์วันหยุดราชการ'}</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddHolidayForm((v) => !v)}
                  className="btn-tool-neutral px-2.5 py-1.5"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-rose-500" />
                  <span>เพิ่มวันหยุดโรงเรียน</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowImportExportModal(true)}
                  className="btn-tool-neutral px-2.5 py-1.5"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export / Import</span>
                </button>
              )}
              <button
                type="button"
                onClick={openGoogleCalendarModal}
                className="btn-action-primary px-2.5 py-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>เชื่อมต่อ Calendar (.ics)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {renderRoomAndTermControls()}
          <div className="flex flex-wrap items-center gap-2">
            {!isPersonalViewer && (
              <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                วันหยุดราชการ พ.ศ. {calendarMonthCursor.year + 543} ({getHolidaysForYear(calendarMonthCursor.year, schoolId).length} วัน)
                {holidaySyncStatus && holidaySyncStatus.year === calendarMonthCursor.year
                  ? holidaySyncStatus.usedFallback
                    ? ' · ปฏิทินมาตรฐานไทย'
                    : ' · ซิงค์ Public Holiday API แล้ว'
                  : ''}
              </span>
            )}
            {todayHoliday ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-200">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                วันนี้หยุด: {todayHoliday.nameTh}
              </span>
            ) : upcomingHolidaysList.length > 0 ? (
              <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                วันหยุดถัดไป: <strong className="text-rose-600 dark:text-rose-400">{upcomingHolidaysList[0].nameTh}</strong> ({upcomingHolidaysList[0].date})
              </span>
            ) : null}
          </div>
        </div>

        {/* Admin / Teacher Custom School Holiday Form */}
        {isAdmin && showAddHolidayForm && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-wrap items-end gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-text-muted)] mb-1">วันที่หยุดพิเศษ</label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-[var(--color-text-muted)] mb-1">ชื่อวันหยุด / กิจกรรมงดเรียน</label>
              <input
                type="text"
                value={newHolidayNameTh}
                onChange={(e) => setNewHolidayNameTh(e.target.value)}
                placeholder="เช่น วันกีฬาสีโรงเรียน / วันหยุดพิเศษประจำปี"
                className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newHolidayDate || !newHolidayNameTh.trim()) return;
                addSchoolCustomHoliday(schoolId, {
                  date: newHolidayDate,
                  nameTh: newHolidayNameTh.trim(),
                });
                setNewHolidayNameTh('');
                setShowAddHolidayForm(false);
                setSelectedCalendarDate(newHolidayDate);
                setHolidayRefreshTick((v) => v + 1);
              }}
              className="h-9 px-3.5 rounded-lg bg-[var(--color-primary)] text-white font-bold cursor-pointer"
            >
              บันทึกวันหยุด
            </button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {calendarLayoutMode === 'month' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: 7-Column Monthly Grid */}
            <div className="lg:col-span-7 space-y-2">
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-[var(--color-text-muted)] pb-1">
                {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((dLabel, idx) => (
                  <div key={dLabel} className={idx >= 5 ? 'text-rose-500' : ''}>
                    {dLabel}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthCells.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`blank-${idx}`} className="min-h-[76px] rounded-xl bg-[var(--color-card-subtle)]/40" />;
                  }
                  const cellHolidays = monthHolidays.filter((h) => h.date === cell.dateStr);
                  const primaryHoliday = cellHolidays[0] || null;
                  const isToday = cell.dateStr === todayBangkokDate;
                  const isSelected = cell.dateStr === selectedCalendarDate;
                  const isWeekend = isWeekendDate(cell.dateStr);
                  const cellUtcDay = new Date(`${cell.dateStr}T00:00:00Z`).getUTCDay();
                  const cellDayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][cellUtcDay] || 'sun') as DayOfWeek | 'sun' | 'sat';
                  const cellClassCount =
                    !isWeekend && !primaryHoliday
                      ? activeSlots.filter((s) => s.dayOfWeek === cellDayKey).length
                      : 0;
                  const cellAsgCount = assignments.filter(
                    (a) => a.status !== 'closed' && (a.dueDate || '').slice(0, 10) === cell.dateStr
                  ).length;
                  const cellNotes = monthNotesMap.get(cell.dateStr) || [];

                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => setSelectedCalendarDate(cell.dateStr)}
                      className={`min-h-[76px] rounded-xl border p-1.5 text-left flex flex-col justify-between transition cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/25 bg-[var(--color-primary-light)]'
                          : primaryHoliday
                            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 hover:border-rose-400'
                            : isWeekend
                              ? 'border-[var(--color-border)] bg-[var(--color-card-subtle)]/70 opacity-80'
                              : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            isToday
                              ? 'w-6 h-6 rounded-lg bg-[var(--color-primary)] text-white inline-flex items-center justify-center'
                              : primaryHoliday || isWeekend
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-[var(--color-text-title)]'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        <div className="flex items-center gap-1">
                          {cellNotes.length > 0 && (
                            <span
                              title={cellNotes.map((n) => n.title).join(', ')}
                              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 tabular-nums"
                            >
                              <StickyNote className="w-2.5 h-2.5 shrink-0" />
                              <span>{cellNotes.length}</span>
                            </span>
                          )}
                          {cellAsgCount > 0 && (
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-300 tabular-nums">
                              งาน {cellAsgCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-0.5 w-full">
                        {primaryHoliday ? (
                          <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 line-clamp-2 leading-tight">
                            {primaryHoliday.nameTh}
                          </p>
                        ) : cellNotes[0] ? (
                          <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200 truncate leading-tight">
                            {cellNotes[0].title}
                          </p>
                        ) : cellClassCount > 0 ? (
                          <p className="text-[10px] font-medium text-[var(--color-text-muted)] tabular-nums">
                            {cellClassCount} คาบ
                          </p>
                        ) : isWeekend ? (
                          <p className="text-[9px] text-[var(--color-text-muted)]">เสาร์-อาทิตย์</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Month Holidays List */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2 mt-3">
                <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-rose-500" />
                  <span>วันหยุดราชการและวันสำคัญประจำเดือนนี้ ({monthHolidays.length})</span>
                </h3>
                {monthHolidays.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">ไม่มีวันหยุดราชการในเดือนนี้</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {monthHolidays.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => setSelectedCalendarDate(h.date)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-xs cursor-pointer hover:border-rose-300"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-rose-700 dark:text-rose-300 truncate">{h.nameTh}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                            {h.date} · {getThaiHolidayCategoryLabel(h, lang)}
                          </p>
                        </div>
                        {!isPersonalViewer && h.type === 'school' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSchoolCustomHoliday(schoolId, h.id);
                              setHolidayRefreshTick((v) => v + 1);
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="ลบวันหยุดโรงเรียน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Selected Day Agenda + Direct Check-in/Check-out */}
            <div className="lg:col-span-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    {formatCalendarDate(selectedCalendarDate)}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    {selectedCalendarDate}
                    {selectedDateHolidays.length > 0
                      ? ` · วันหยุด (${selectedDateHolidays[0].nameTh})`
                      : ` · ${selectedDaySlots.length} คาบ`}
                  </p>
                </div>
                {selectedCalendarDate === todayBangkokDate && (
                  <span className="text-[11px] font-bold text-[var(--color-primary-text)]">วันนี้</span>
                )}
              </div>

              {selectedDateHolidays.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-3 text-xs space-y-1"
                >
                  <p className="font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    {h.nameTh}
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    {h.nameEn} · {h.isSchoolDayOff ? 'งดการเรียนการสอนตามปฏิทินวันหยุด' : 'กิจกรรมสำคัญของโรงเรียน'}
                  </p>
                </div>
              ))}

              {selectedDayAssignments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-[var(--color-text-muted)]">กำหนดส่งงานวันนี้</p>
                  {selectedDayAssignments.map((a) => (
                    <div key={a.id} className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-[var(--color-card)] p-2.5 text-xs">
                      <p className="font-bold text-[var(--color-text-title)]">
                        {a.courseCode ? `[${a.courseCode}] ` : ''}
                        {a.titleTh || a.titleEn}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        ครบกำหนด: {a.dueDate}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Calendar Notes Section for Selected Date */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <StickyNote className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? `โน้ตบันทึกประจำวัน (${selectedDateNotes.length})` : `Daily Notes (${selectedDateNotes.length})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => (showNoteForm ? resetNoteForm() : handleStartNewNote())}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer shrink-0 transition"
                  >
                    {showNoteForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{showNoteForm ? 'ปิด' : 'เพิ่มโน้ต'}</span>
                  </button>
                </div>

                {showNoteForm && (
                  <form onSubmit={handleSaveNote} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5 space-y-2 text-xs">
                    <input
                      type="text"
                      value={noteTitleDraft}
                      onChange={(e) => setNoteTitleDraft(e.target.value)}
                      placeholder="หัวข้อโน้ต / เตือนความจำ (เช่น นัดประชุมผู้ปกครอง, เตรียมข้อสอบ)"
                      className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <textarea
                      rows={2}
                      value={noteContentDraft}
                      onChange={(e) => setNoteContentDraft(e.target.value)}
                      placeholder="รายละเอียดเพิ่มเติม..."
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {CALENDAR_NOTE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNoteColorDraft(c.id)}
                            title={c.labelTh}
                            className={`w-5 h-5 rounded-full ${c.dotClass} flex items-center justify-center cursor-pointer transition ${
                              noteColorDraft === c.id ? 'ring-2 ring-offset-1 ring-[var(--color-text-title)] scale-110' : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            {noteColorDraft === c.id && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>

                      {!isPersonalViewer && (
                        <select
                          aria-label="ขอบเขตโน้ต"
                          value={noteScopeDraft}
                          onChange={(e) => setNoteScopeDraft(e.target.value as CalendarNoteScope)}
                          className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-[11px] font-semibold text-[var(--color-text-title)]"
                        >
                          <option value="personal">โน้ตส่วนตัว</option>
                          <option value="school">โน้ตโรงเรียน (ทุกคนเห็น)</option>
                        </select>
                      )}

                      <button
                        type="submit"
                        disabled={!noteTitleDraft.trim() && !noteContentDraft.trim()}
                        className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 text-[11px] font-bold cursor-pointer transition"
                      >
                        {editingNoteId ? 'อัปเดตโน้ต' : 'บันทึกโน้ต'}
                      </button>
                    </div>
                  </form>
                )}

                {selectedDateNotes.length === 0 && !showNoteForm ? (
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    ยังไม่มีโน้ตสำหรับวันนี้ — กด &ldquo;+ เพิ่มโน้ต&rdquo; เพื่อบันทึกเตือนความจำหรือหมายเหตุประจำวัน
                  </p>
                ) : selectedDateNotes.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {selectedDateNotes.map((note) => {
                      const colorMeta = getCalendarNoteColorMeta(note.color);
                      const canModify =
                        note.authorId === (currentUser?.id || `role:${currentRole}`) || isAdmin;
                      return (
                        <div
                          key={note.id}
                          className={`rounded-xl border p-2.5 text-xs space-y-1 ${colorMeta.cardClass}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${colorMeta.dotClass} shrink-0`} />
                                <p className="font-bold text-[var(--color-text-title)] truncate">
                                  {note.title}
                                </p>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${colorMeta.badgeClass}`}>
                                  {note.scope === 'school' ? 'โรงเรียน' : 'ส่วนตัว'}
                                </span>
                              </div>
                              {note.content && (
                                <p className="text-[11px] text-[var(--color-text-body)] mt-0.5 whitespace-pre-line">
                                  {note.content}
                                </p>
                              )}
                              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                                บันทึกโดย {note.authorName}
                              </p>
                            </div>
                            {canModify && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditNote(note)}
                                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                                  title="แก้ไขโน้ต"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteCalendarNote(schoolId, note.id);
                                    if (editingNoteId === note.id) resetNoteForm();
                                    setCalendarNotesTick((v) => v + 1);
                                  }}
                                  className="p-1 rounded hover:bg-rose-500/15 text-rose-600 cursor-pointer"
                                  title="ลบโน้ต"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 overflow-y-auto">
                {!selectedDayKey ? (
                  <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                    วันหยุดสุดสัปดาห์ (ไม่มีตารางเรียนปกติ)
                  </p>
                ) : selectedDaySlots.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                    ไม่มีคาบเรียนในตัวกรองที่เลือก
                  </p>
                ) : (
                  selectedDaySlots.map((slot) => {
                    const slotColor = getTimetableSlotCardStyle(slot.colorTag);
                    const status = getSlotCheckStatusForDate(slot, selectedCalendarDate);
                    const slotActivity = getTimetableSlotActivityStatus({
                      slot,
                      schoolPeriods,
                      now: bangkokClock,
                      schoolId,
                      targetDateStr: selectedCalendarDate,
                    });
                    const nextCheckType: 'check_in' | 'check_out' =
                      status.hasCheckIn && !status.hasCheckOut ? 'check_out' : 'check_in';
                    const canShowDateCheckin =
                      canUsePeriodCheckin &&
                      (slotActivity.isActive ||
                        (selectedCalendarDate === todayBangkokDate &&
                          slotActivity.isTodayWeekday &&
                          !slotActivity.isHolidayOff));
                    return (
                      <div
                        key={slot.id}
                        style={slotColor.style}
                        className={`rounded-xl border p-3 space-y-2 ${slotColor.className} ${
                          slotActivity.isActive
                            ? 'border-rose-500 ring-2 ring-rose-500/45 shadow-md bg-rose-50/75 dark:bg-rose-950/35'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openSlotDetails(slot)}
                            className="text-left min-w-0 flex-1 cursor-pointer"
                          >
                            <p className="text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)] flex flex-wrap items-center gap-1.5">
                              <span>คาบ {slot.periodNumber} · {slotActivity.startTime}–{slotActivity.endTime} · {slot.classRoom}</span>
                              {slotActivity.isActive && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                  ถึงคาบเรียน{slotActivity.remainingMinutes !== null ? ` · เหลือ ${slotActivity.remainingMinutes} น.` : ''}
                                </span>
                              )}
                            </p>
                            <p className="text-xs font-bold text-[var(--color-text-title)] mt-0.5">
                              {slot.courseCode} · {slot.courseTitleTh}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-body)] mt-0.5">
                              {formatSlotTeachersDisplay(slot)} {slot.room ? `· ห้อง ${slot.room}` : ''}
                            </p>
                            <SlotStaffStatusBadges
                              slot={slot}
                              dateStr={selectedCalendarDate}
                              isHolidayOff={selectedDateHolidays.some((h) => h.isSchoolDayOff)}
                              isPersonalViewer={isPersonalViewer}
                              todayBangkokDate={todayBangkokDate}
                              courses={courses}
                              students={students}
                              teachers={teachers}
                              attendance={attendance}
                              periodAttendance={periodAttendance}
                              leaveRequests={leaveRequests}
                            />
                          </button>
                          {(status.hasCheckIn || status.hasCheckOut) && (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                              {status.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                            </span>
                          )}
                        </div>

                        {canOpenPeriodRoster && (
                          <div className="pt-1.5 border-t border-current/15 print:hidden">
                            <button
                              type="button"
                              onClick={() => setPeriodRosterTarget({ slot, date: selectedCalendarDate })}
                              className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer transition"
                            >
                              <UserCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>รายชื่อ / เช็กชื่อนักเรียน</span>
                            </button>
                          </div>
                        )}

                        {canShowDateCheckin && (
                          <div className="flex items-center gap-2 pt-1.5 border-t border-current/15">
                            <button
                              type="button"
                              onClick={() => triggerSlotCheckin(slot, selectedCalendarDate, nextCheckType)}
                              className={`flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white shadow-sm cursor-pointer transition ${
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
                            {!status.hasCheckIn && (
                              <button
                                type="button"
                                onClick={() => triggerSlotCheckin(slot, selectedCalendarDate, 'check_out')}
                                className={`min-h-[40px] inline-flex items-center justify-center gap-1 rounded-lg border px-3 text-xs font-bold cursor-pointer transition ${
                                  slotActivity.isActive
                                    ? 'border-rose-400 dark:border-rose-700 bg-white/90 dark:bg-slate-900/80 text-rose-700 dark:text-rose-200 hover:bg-rose-50'
                                    : 'border-[var(--color-border)] bg-white/85 dark:bg-slate-900/75 text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)]'
                                }`}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>เช็คเอาท์</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : activeSlots.length === 0 ? (
          <p className="p-8 text-center text-xs text-[var(--color-text-muted)]">
            ไม่มีคาบสอนในตัวกรองหรือภาคเรียนที่เลือก
          </p>
        ) : (
          <div aria-label="ปฏิทินตารางสอนรายสัปดาห์" className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 items-start gap-2">
            {calendarWeekDays.map((day) => {
              const dayHoliday = getHolidayForDate(day.date, schoolId);
              const dayNotes = getVisibleCalendarNotesForDate(
                schoolId,
                day.date,
                currentUser?.id,
                currentRole
              );
              const daySlots = activeSlots
                .filter((slot) => slot.dayOfWeek === day.key)
                .sort((a, b) => (
                  (getSlotTimeRange(a)?.start ?? 0) - (getSlotTimeRange(b)?.start ?? 0)
                    || a.periodNumber - b.periodNumber
                ));
              return (
                <section key={day.key} aria-label={formatCalendarDate(day.date)} className={`min-h-0 rounded-lg border p-1.5 ${dayHoliday ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}>
                  <header className={`sticky top-0 z-10 mb-1.5 border-b pb-1.5 ${day.date === todayBangkokDate ? 'border-[var(--color-primary)]/40' : 'border-[var(--color-border)]'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <h3 className={`text-[11px] font-bold ${day.date === todayBangkokDate ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-title)]'}`}>{formatCalendarDate(day.date)}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarLayoutMode('month');
                          handleStartNewNote(day.date);
                        }}
                        aria-label={`เพิ่มโน้ต ${formatCalendarDate(day.date)}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] cursor-pointer shrink-0"
                        title="เพิ่มโน้ตวันนี้"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {dayHoliday ? (
                      <p className="mt-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                        วันหยุด: {dayHoliday.nameTh}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)] tabular-nums">
                        {daySlots.length} คาบ{dayNotes.length > 0 ? ` · ${dayNotes.length} โน้ต` : ''}
                      </p>
                    )}
                    {dayNotes.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {dayNotes.slice(0, 2).map((n) => {
                          const cm = getCalendarNoteColorMeta(n.color);
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                setCalendarLayoutMode('month');
                                setSelectedCalendarDate(day.date);
                              }}
                              className={`w-full text-left rounded border px-1.5 py-0.5 text-[9px] font-semibold truncate cursor-pointer ${cm.cardClass}`}
                            >
                              • {n.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </header>
                  <div className="space-y-1.5">
                    {daySlots.length === 0 ? (
                      <p className="py-6 text-center text-[10px] text-[var(--color-text-muted)]">ไม่มีคาบ</p>
                    ) : daySlots.map((slot) => {
                      const timeRange = getSlotTimeRange(slot);
                      const hasCoTeacher = getSlotTeachers(slot).length > 1;
                      const slotColor = getTimetableSlotCardStyle(slot.colorTag);
                      const hasConflict = conflictingSlotIds.has(slot.id);
                      const slotActivity = getTimetableSlotActivityStatus({
                        slot,
                        schoolPeriods,
                        now: bangkokClock,
                        schoolId,
                        targetDateStr: day.date,
                      });
                      const slotStatus = getSlotCheckStatusForDate(slot, day.date);
                      const nextCheckType: 'check_in' | 'check_out' =
                        slotStatus.hasCheckIn && !slotStatus.hasCheckOut ? 'check_out' : 'check_in';
                      const canShowWeekSlotCheckin =
                        canUsePeriodCheckin &&
                        (slotActivity.isActive ||
                          (day.date === todayBangkokDate &&
                            slotActivity.isTodayWeekday &&
                            !slotActivity.isHolidayOff));
                      return (
                        <div
                          key={slot.id}
                          onClick={() => openSlotDetails(slot)}
                          style={!hasConflict ? slotColor.style : undefined}
                          className={`w-full rounded-md border p-1.5 text-left transition cursor-pointer space-y-1 ${
                            hasConflict
                              ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50'
                              : slotColor.className
                          } ${
                            slotActivity.isActive
                              ? 'border-rose-500 ring-2 ring-rose-500/45 shadow-md bg-rose-50/75 dark:bg-rose-950/35'
                              : ''
                          }`}
                        >
                          <span className="flex items-center justify-between gap-1 text-[9px] font-semibold">
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <span
                                className="inline-block h-2 w-2 rounded-full border border-black/15 shrink-0"
                                style={{ backgroundColor: slotColor.swatchHex }}
                              />
                              <span>{timeRange ? `${formatTimeMinutes(timeRange.start)}–${formatTimeMinutes(timeRange.end)}` : `คาบ ${slot.periodNumber}`}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {slotActivity.isActive && (
                                <span className="rounded bg-rose-600 px-1 py-0.5 text-[8px] font-bold text-white tabular-nums">
                                  ถึงคาบ
                                </span>
                              )}
                              {hasCoTeacher && (
                                <span className="rounded bg-emerald-100 px-1 py-0.5 text-[8px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                  สอนคู่
                                </span>
                              )}
                              {conflictingSlotIds.has(slot.id) && !isPersonalViewer && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedConflictSlotId(slot.id);
                                  }}
                                  aria-label={`ดูข้อขัดแย้งของคาบ ${slot.courseTitleTh}`}
                                  title="ดูรายละเอียดข้อขัดแย้ง"
                                  className="rounded p-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
                                >
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                </button>
                              )}
                            </span>
                          </span>
                          <span className="block text-[10px] font-bold text-[var(--color-text-title)]">
                            {slot.courseCode} · {slot.courseTitleTh}
                          </span>
                          <span className="block text-[9px] text-[var(--color-text-body)]">
                            {slot.classRoom} · {formatSlotTeachersDisplay(slot)}
                          </span>
                          <SlotStaffStatusBadges
                            slot={slot}
                            dateStr={day.date}
                            isHolidayOff={Boolean(dayHoliday?.isSchoolDayOff)}
                            isPersonalViewer={isPersonalViewer}
                            todayBangkokDate={todayBangkokDate}
                            courses={courses}
                            students={students}
                            teachers={teachers}
                            attendance={attendance}
                            periodAttendance={periodAttendance}
                            leaveRequests={leaveRequests}
                          />
                          {canOpenPeriodRoster && (
                            <div className="pt-1 border-t border-current/15">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPeriodRosterTarget({ slot, date: day.date });
                                }}
                                className="w-full min-h-[28px] inline-flex items-center justify-center gap-1 rounded-md bg-emerald-700 hover:bg-emerald-800 px-2 py-1 text-[10px] font-bold text-white shadow-xs cursor-pointer"
                              >
                                <UserCheck className="w-3 h-3 shrink-0" />
                                <span>ดูรายชื่อ / เช็กชื่อคาบนี้</span>
                              </button>
                            </div>
                          )}
                          {canShowWeekSlotCheckin && (
                            <div className="pt-1 border-t border-current/15">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerSlotCheckin(slot, day.date, nextCheckType);
                                }}
                                className={`w-full min-h-[30px] inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-xs cursor-pointer ${
                                  slotActivity.isActive
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : nextCheckType === 'check_out'
                                      ? 'bg-slate-800 hover:bg-slate-900'
                                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                                }`}
                              >
                                {nextCheckType === 'check_out' ? (
                                  <LogOut className="w-3 h-3 shrink-0" />
                                ) : (
                                  <LogIn className="w-3 h-3 shrink-0" />
                                )}
                                <span>
                                  {slotStatus.hasCheckIn && slotStatus.hasCheckOut
                                    ? 'เข้า+ออกแล้ว'
                                    : nextCheckType === 'check_out'
                                      ? 'เช็คเอาท์คาบ'
                                      : 'เช็คอินเข้าคาบ'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
