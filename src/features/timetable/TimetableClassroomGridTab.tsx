import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronDown,
  Clock,
  FileSpreadsheet,
  LogIn,
  LogOut,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AppLanguage,
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
} from '../../types';
import { sendEduVerseNotification } from '../../lib/pushNotifications';
import { formatSemesterLabel } from '../../lib/schoolSettings';
import { getTimetableSlotCardStyle } from '../../lib/timetableColors';
import { formatSlotTeachersDisplay, getSlotTeachers } from '../../lib/timetableTeachers';
import { getSlotAttendanceAndLeaveSummary } from '../../lib/timetableAttendanceStatus';
import { BangkokClockSnapshot, getTimetableSlotActivityStatus } from '../../lib/timetableCalendar';
import { getThaiHolidayCategoryLabel, ThaiHoliday } from '../../lib/thaiHolidays';
import { enterLandscapeGameMode, exitLandscapeGameMode } from '../../lib/screenOrientation';
import { printTimetableLandscape, setTimetableLandscapePageRule } from '../../lib/timetablePrint';
import { findHomeroomTeachersForRoom } from '../../lib/timetableRoomMatch';
import {
  ALL_CLASSROOMS,
  DAYS,
  formatShortThaiDate,
  PendingSlotConfirmState,
  TimetableScheduleFilters,
  TimetableViewMode,
} from './types';
import { SlotStaffStatusBadges } from './SlotStaffStatusBadges';

interface TimetableClassroomGridTabProps {
  schoolId: string;
  schoolName?: string;
  lang: AppLanguage;
  isAdmin: boolean;
  isPersonalViewer: boolean;
  canManageTimetable: boolean;
  isViewingCurrentTerm: boolean;
  isAllClassroomsView: boolean;
  canUsePeriodCheckin: boolean;
  canOpenPeriodRoster: boolean;
  hasOpenPeriodCheckinHandler: boolean;
  currentUser: AuthUser | null;
  schoolPeriods: SchoolPeriodTime[];
  orderedSchoolPeriods: SchoolPeriodTime[];
  slots: TimetableSlot[];
  activeSlots: TimetableSlot[];
  courses: Course[];
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  uniqueClassRooms: string[];
  selectedClassRoom: string;
  myCoursesOnly: boolean;
  activeScheduleFilters: TimetableScheduleFilters | null;
  viewAcademicYear: string;
  viewSemester: string;
  todayDayKey: DayOfWeek | 'sat' | 'sun' | null;
  todayBangkokDate: string;
  bangkokClock: BangkokClockSnapshot;
  currentWeekDaysWithDates: Array<(typeof DAYS)[number] & { date: string; holiday: ThaiHoliday | null }>;
  conflictingSlotIds: Set<string>;
  currentBangkokYear: number;
  yearHolidaysCount: number;
  isSyncingHolidays: boolean;
  handleManualHolidaySync: (targetYear?: number) => Promise<void>;
  renderRoomAndTermControls: (showRoomFilter?: boolean) => React.ReactNode;
  openAddSlotModal: () => void;
  openScheduleSettings: () => void;
  openPeriodSettingsModal: () => void;
  setShowImportExportModal: (show: boolean) => void;
  openGoogleCalendarModal: () => void;
  setCalendarLayoutMode: (mode: 'week' | 'month') => void;
  setViewMode: (mode: TimetableViewMode) => void;
  openSlotDetails: (slot: TimetableSlot) => void;
  setSelectedConflictSlotId: (slotId: string | null) => void;
  setPeriodRosterTarget: (target: { slot: TimetableSlot; date: string } | null) => void;
  setRollcallDate: (date: string) => void;
  setRollcallSlotId: (slotId: string) => void;
  setPendingSlotConfirm: (confirm: PendingSlotConfirmState | null) => void;
  onDeleteSlot: (id: string) => Promise<void>;
  getSlotCheckStatusForDate: (slot: TimetableSlot, dateStr: string) => {
    resolvedCourseId: string;
    hasCheckIn: boolean;
    hasCheckOut: boolean;
  };
  triggerSlotCheckin: (slot: TimetableSlot, dateStr: string, checkType: 'check_in' | 'check_out') => void;
  unfilteredRoomSlotCount?: number;
  roomsWithSlotsInTerm?: Array<{ room: string; count: number }>;
  otherTermSlotSummaries?: Array<{ key: string; academicYear: string; semester: string; count: number }>;
  onSelectClassRoom?: (room: string) => void;
  onSelectAcademicPeriod?: (periodKey: string) => void;
  onClearTeacherScope?: () => void;
  onClearScheduleFilters?: () => void;
}

export const TimetableClassroomGridTab: React.FC<TimetableClassroomGridTabProps> = ({
  schoolId,
  schoolName,
  lang,
  isAdmin,
  isPersonalViewer,
  canManageTimetable,
  isViewingCurrentTerm,
  isAllClassroomsView,
  canUsePeriodCheckin,
  canOpenPeriodRoster,
  hasOpenPeriodCheckinHandler,
  currentUser,
  schoolPeriods,
  orderedSchoolPeriods,
  slots,
  activeSlots,
  courses,
  students,
  teachers,
  attendance,
  periodAttendance,
  leaveRequests,
  uniqueClassRooms,
  selectedClassRoom,
  myCoursesOnly,
  activeScheduleFilters,
  viewAcademicYear,
  viewSemester,
  todayDayKey,
  todayBangkokDate,
  bangkokClock,
  currentWeekDaysWithDates,
  conflictingSlotIds,
  currentBangkokYear,
  yearHolidaysCount,
  isSyncingHolidays,
  handleManualHolidaySync,
  renderRoomAndTermControls,
  openAddSlotModal,
  openScheduleSettings,
  openPeriodSettingsModal,
  setShowImportExportModal,
  openGoogleCalendarModal,
  setCalendarLayoutMode,
  setViewMode,
  openSlotDetails,
  setSelectedConflictSlotId,
  setPeriodRosterTarget,
  setRollcallDate,
  setRollcallSlotId,
  setPendingSlotConfirm,
  onDeleteSlot,
  getSlotCheckStatusForDate,
  triggerSlotCheckin,
  unfilteredRoomSlotCount = 0,
  roomsWithSlotsInTerm = [],
  otherTermSlotSummaries = [],
  onSelectClassRoom,
  onSelectAcademicPeriod,
  onClearTeacherScope,
  onClearScheduleFilters,
}) => {
  const [isLandscapeExpanded, setIsLandscapeExpanded] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimetableLandscapePageRule(true);
    return () => {
      setTimetableLandscapePageRule(false);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // Keep overlay optional or sync cleanly if browser exited fullscreen externally
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleLandscapeExpanded = () => {
    if (isLandscapeExpanded) {
      setIsLandscapeExpanded(false);
      void exitLandscapeGameMode();
    } else {
      setIsLandscapeExpanded(true);
      void enterLandscapeGameMode(gridContainerRef.current);
    }
  };

  const scheduleTargetTitle = activeScheduleFilters
    ? `${activeScheduleFilters.gradeLevel || 'ทุกระดับชั้น'} · ${activeScheduleFilters.classRoom || 'ทุกห้อง'} · ${activeScheduleFilters.teacherName || 'ครูทุกคน'}`
    : selectedClassRoom === ALL_CLASSROOMS
      ? `ตารางรวมทุกห้อง (${uniqueClassRooms.length})`
      : selectedClassRoom;

  const homeroomTeachersForSelectedRoom =
    selectedClassRoom && selectedClassRoom !== ALL_CLASSROOMS && !activeScheduleFilters
      ? findHomeroomTeachersForRoom(teachers, selectedClassRoom)
      : [];

  const computedTableMinWidth = Math.max(920, 120 + orderedSchoolPeriods.length * 112);

  return (
    <div
      ref={gridContainerRef}
      data-guide-id="timetable-grid-area"
      className={`timetable-print-area print-area flex-1 min-h-0 bg-[var(--color-card)] shadow-sm overflow-hidden flex flex-col ${
        isLandscapeExpanded
          ? 'fixed inset-0 z-[105] rounded-none border-0 p-2 sm:p-4 print:static print:p-0'
          : 'rounded-2xl border border-[var(--color-border)]'
      }`}
    >
      {/* Dedicated Landscape A4 Print Header */}
      <div className="hidden print:flex items-center justify-between gap-4 pb-2 mb-2 border-b-2 border-slate-700">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {schoolName ? `${schoolName} · ` : ''}ตารางเรียนและตารางสอน ({scheduleTargetTitle})
          </h2>
          <p className="text-[11px] text-slate-700">
            {formatSemesterLabel(viewSemester)} ปีการศึกษา {viewAcademicYear}
            {homeroomTeachersForSelectedRoom.length > 0
              ? ` · ครูประจำชั้น: ${homeroomTeachersForSelectedRoom.map((t) => t.fullNameTh).join(', ')}`
              : ''}
            {myCoursesOnly ? ' · เฉพาะรายวิชาที่รับผิดชอบสอน' : ''}
          </p>
        </div>
        <div className="text-right text-[10px] text-slate-600 tabular-nums">
          <div>พิมพ์เมื่อ {formatShortThaiDate(todayBangkokDate)}</div>
          <div>A4 แนวนอน · รวม {activeSlots.length} คาบ/สัปดาห์</div>
        </div>
      </div>

      <div data-guide-id="timetable-filters-bar" className="shrink-0 px-3 py-2 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 bg-[var(--color-card)] print:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {renderRoomAndTermControls()}
            <span className="print:hidden text-xs text-[var(--color-text-muted)] tabular-nums">
              แสดง <strong className="tone-text">{activeSlots.length}</strong> คาบ/สัปดาห์
              {myCoursesOnly && (
                <span className="ml-1 text-[11px] font-semibold tone-text">· เฉพาะวิชาที่สอน</span>
              )}
            </span>
            {selectedClassRoom && selectedClassRoom !== ALL_CLASSROOMS && !activeScheduleFilters && (
              homeroomTeachersForSelectedRoom.length > 0 ? (
                <span className="print:hidden inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                  <UserCheck className="h-3 w-3 shrink-0" />
                  <span>ครูประจำชั้น: {homeroomTeachersForSelectedRoom.map((t) => t.fullNameTh).join(', ')}</span>
                </span>
              ) : isAdmin ? (
                <span className="print:hidden text-[11px] text-[var(--color-text-muted)]">
                  · ยังไม่ระบุครูประจำชั้น
                </span>
              ) : null
            )}
          </div>
        </div>
        <div className="print:hidden flex flex-wrap items-center justify-end gap-1.5">
          {canUsePeriodCheckin && hasOpenPeriodCheckinHandler && (() => {
            const todayCandidates = activeSlots
              .filter((s) => s.dayOfWeek === todayDayKey)
              .slice()
              .sort((a, b) => a.periodNumber - b.periodNumber);
            const activeSlotToday = todayCandidates.find((s) =>
              getTimetableSlotActivityStatus({
                slot: s,
                schoolPeriods,
                now: bangkokClock,
                schoolId,
              }).isActive
            );
            const targetSlot = activeSlotToday || todayCandidates[0] || activeSlots[0] || slots[0];
            if (!targetSlot) return null;
            const targetStatus = getSlotCheckStatusForDate(targetSlot, todayBangkokDate);
            const nextType: 'check_in' | 'check_out' =
              targetStatus.hasCheckIn && !targetStatus.hasCheckOut ? 'check_out' : 'check_in';
            return (
              <button
                type="button"
                onClick={() => triggerSlotCheckin(targetSlot, todayBangkokDate, nextType)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer transition ${
                  activeSlotToday
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                }`}
              >
                {nextType === 'check_out' ? (
                  <LogOut className="h-3.5 w-3.5" />
                ) : (
                  <LogIn className="h-3.5 w-3.5" />
                )}
                <span>
                  {activeSlotToday
                    ? `เช็คอินคาบ ${activeSlotToday.periodNumber} (ถึงเวลา)`
                    : 'เช็คอิน/เอาท์รายคาบ'}
                </span>
              </button>
            );
          })()}
          {isViewingCurrentTerm && canManageTimetable && (
            <button
              type="button"
              onClick={openAddSlotModal}
              className="btn-action-primary px-3 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มคาบ</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleLandscapeExpanded}
            aria-pressed={isLandscapeExpanded}
            title={lang === 'th' ? 'แสดงตารางสอนแบบแนวนอนเต็มจอ' : 'Toggle full-width landscape view'}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isLandscapeExpanded
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)]'
            }`}
          >
            {isLandscapeExpanded ? (
              <Minimize2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-text)]" />
            )}
            <span>
              {isLandscapeExpanded
                ? lang === 'th' ? 'ออกจากแนวนอน' : 'Exit Wide'
                : lang === 'th' ? 'มุมมองแนวนอน' : 'Landscape'}
            </span>
          </button>

          <button
            type="button"
            onClick={printTimetableLandscape}
            title={lang === 'th' ? 'พิมพ์ตารางสอนขนาด A4 แนวนอน' : 'Print A4 Landscape'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-text-title)] transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-text)]" />
            <span>{lang === 'th' ? 'พิมพ์แนวนอน (A4)' : 'Print Landscape'}</span>
          </button>

          {/* Consolidated Secondary Schedule Tools Dropdown */}
          <details className="group relative">
            <summary className="btn-tool-tone list-none px-2.5 py-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 tone-text" />
              <span>เครื่องมือ &amp; ส่งออก</span>
              <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)] transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-xl space-y-1 text-xs">
              <div className="px-2 pt-1 text-[10px] font-bold text-[var(--color-text-muted)]">
                การแสดงผล &amp; ตั้งค่า
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  openScheduleSettings();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 tone-text" />
                <span>กรองหลายเงื่อนไข / ตั้งค่าการแสดง</span>
              </button>
              {isViewingCurrentTerm && isAdmin && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    openPeriodSettingsModal();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 tone-text" />
                  <span>ตั้งเวลาคาบเรียนมาตรฐาน</span>
                </button>
              )}

              {!isPersonalViewer && (
                <>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <div className="px-2 text-[10px] font-bold text-[var(--color-text-muted)]">
                    ส่งออก &amp; พิมพ์
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      setShowImportExportModal(true);
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Export / Import Excel &amp; CSV</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  openGoogleCalendarModal();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 tone-text" />
                <span>Google Calendar &amp; ภาพหน้าจอมือถือ</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  printTimetableLandscape();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <span>พิมพ์ตารางเรียน A4 (แนวนอน)</span>
              </button>

              {!isPersonalViewer && (
                <>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <div className="px-2 text-[10px] font-bold text-[var(--color-text-muted)]">
                    วันหยุดราชการไทย ({currentBangkokYear + 543})
                  </div>
                  <button
                    type="button"
                    disabled={isSyncingHolidays}
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      void handleManualHolidaySync(currentBangkokYear);
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-rose-500 ${isSyncingHolidays ? 'animate-spin' : ''}`} />
                    <span>{isSyncingHolidays ? 'กำลังซิงค์วันหยุด...' : 'ซิงค์วันหยุดราชการ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      setCalendarLayoutMode('month');
                      setViewMode('calendar');
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <CalendarDays className="h-3.5 w-3.5 tone-text" />
                    <span>ปฏิทินวันหยุด ({yearHolidaysCount} วัน)</span>
                  </button>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <div className="px-2 text-[10px] font-bold text-[var(--color-text-muted)]">
                    ทดสอบแจ้งเตือน
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      sendEduVerseNotification({
                        title: '[ทดสอบตารางสอน] เริ่มคาบเรียนที่ 1 (08:30 - 09:20)',
                        body: `วิชาเรียน ${courses[0]?.code || 'ว21101'} (${courses[0]?.titleTh || 'วิทยาศาสตร์'}) ห้อง ${courses[0]?.room || '401'}`,
                        category: 'attendance',
                        priority: 'urgent',
                        schoolId,
                        targetUserIds: currentUser?.id ? [currentUser.id] : undefined,
                      });
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-emerald-700 hover:bg-[var(--color-card-subtle)] dark:text-emerald-300 cursor-pointer"
                  >
                    ทดสอบเริ่มคาบ &amp; เช็คอิน
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      sendEduVerseNotification({
                        title: '[ทดสอบตารางสอน] สิ้นสุดคาบเรียนที่ 1 (09:20 น.)',
                        body: `หมดเวลาคาบเรียน ${courses[0]?.code || 'ว21101'} แล้ว กรุณาเช็คชื่อออก (Check-out)`,
                        category: 'attendance',
                        priority: 'normal',
                        schoolId,
                        targetUserIds: currentUser?.id ? [currentUser.id] : undefined,
                      });
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-indigo-700 hover:bg-[var(--color-card-subtle)] dark:text-indigo-300 cursor-pointer"
                  >
                    ทดสอบหมดคาบ &amp; เช็คเอาท์
                  </button>
                </>
              )}
            </div>
          </details>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto print:overflow-visible">
        {activeSlots.length === 0 && (
          <div className="mx-3 mt-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-950 dark:text-amber-100 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="min-w-0 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {myCoursesOnly && unfilteredRoomSlotCount > 0
                    ? `ตัวกรอง "เฉพาะวิชาที่ฉันสอน" กำลังซ่อนตารางอยู่ (พบ ${unfilteredRoomSlotCount} คาบในมุมมองนี้)`
                    : slots.length > 0
                      ? `ไม่พบคาบเรียนสำหรับ "${scheduleTargetTitle}" ใน${formatSemesterLabel(viewSemester)} ปีการศึกษา ${viewAcademicYear} (แต่มีข้อมูลในห้องอื่น ${slots.length} คาบ)`
                      : otherTermSlotSummaries.length > 0
                        ? `ยังไม่มีตารางสอนใน${formatSemesterLabel(viewSemester)} ปีการศึกษา ${viewAcademicYear} แต่พบข้อมูลตารางสอนในภาคเรียนอื่น`
                        : `ยังไม่มีข้อมูลตารางสอนใน${formatSemesterLabel(viewSemester)} ปีการศึกษา ${viewAcademicYear}`}
                </span>
              </div>
              {(roomsWithSlotsInTerm.length > 0 || otherTermSlotSummaries.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {roomsWithSlotsInTerm.length > 0 && onSelectClassRoom && (
                    <>
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        ห้องที่มีตารางในเทอมนี้:
                      </span>
                      {(!isPersonalViewer || uniqueClassRooms.length > 1) && selectedClassRoom !== ALL_CLASSROOMS && (
                        <button
                          type="button"
                          onClick={() => onSelectClassRoom(ALL_CLASSROOMS)}
                          className="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                        >
                          ทุกห้อง ({slots.length} คาบ)
                        </button>
                      )}
                      {roomsWithSlotsInTerm.slice(0, 8).map((item) => (
                        <button
                          key={item.room}
                          type="button"
                          onClick={() => onSelectClassRoom(item.room)}
                          className="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                        >
                          {item.room} ({item.count} คาบ)
                        </button>
                      ))}
                    </>
                  )}
                  {slots.length === 0 && otherTermSlotSummaries.length > 0 && onSelectAcademicPeriod && (
                    <>
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        เปิดดูเทอมที่มีข้อมูล:
                      </span>
                      {otherTermSlotSummaries.map((period) => (
                        <button
                          key={period.key}
                          type="button"
                          onClick={() => onSelectAcademicPeriod(period.key)}
                          className="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                        >
                          {formatSemesterLabel(period.semester)} · {period.academicYear} ({period.count} คาบ)
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {myCoursesOnly && onClearTeacherScope && (
                <button
                  type="button"
                  onClick={onClearTeacherScope}
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                >
                  {isAdmin ? 'แสดงทั้งโรงเรียน' : 'แสดงทุกวิชาที่เข้าถึงได้'}
                </button>
              )}
              {activeScheduleFilters && onClearScheduleFilters && (
                <button
                  type="button"
                  onClick={onClearScheduleFilters}
                  className="rounded-lg border border-amber-400 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100 cursor-pointer"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        )}
        <div className="overflow-x-auto print:overflow-visible">
          <table
            style={{ minWidth: `${computedTableMinWidth}px` }}
            className="table-comfortable w-full table-fixed text-left border-collapse print:!min-w-0"
          >
            <thead className="sticky top-0 z-10 bg-[var(--color-card-subtle)] shadow-[0_1px_0_var(--color-border)]">
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-body)] uppercase">
                <th className="p-1.5 w-24 text-center font-bold text-[var(--color-text-title)]">วัน / คาบ</th>
                {orderedSchoolPeriods.map((period) => (
                  <th key={period.periodNumber} className={`p-1.5 text-center font-medium ${period.isBreak ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 w-20' : ''}`}>
                    <div className={`font-bold leading-tight ${period.isBreak ? 'text-amber-950 dark:text-amber-200 text-[10px]' : 'text-[var(--color-text-title)]'}`}>
                      {period.labelTh || (period.isBreak ? 'พักกลางวัน' : `คาบ ${period.periodNumber}`)}
                    </div>
                    <div className={`text-[10px] font-mono mt-0.5 whitespace-nowrap ${period.isBreak ? 'text-amber-900 dark:text-amber-300 text-[9px]' : 'text-[var(--color-text-muted)]'}`}>
                      {`${period.startTime} - ${period.endTime}`}
                    </div>
                  </th>
                ))}
                {!isPersonalViewer && (
                  <th className="p-1.5 w-32 text-center font-bold text-[var(--color-text-title)] print:hidden">
                    สถานะการเข้าเรียน
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-xs">
              {currentWeekDaysWithDates.map((day) => {
                const isTodayRow = day.key === todayDayKey;
                const rowHoliday = day.holiday;
                return (
                  <tr
                    key={day.key}
                    className={`transition ${
                      rowHoliday
                        ? 'bg-rose-50/45 dark:bg-rose-950/20'
                        : isTodayRow
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : 'hover:bg-[var(--color-card-subtle)]'
                    }`}
                  >
                    {/* Day Column */}
                    <td className="p-1.5 text-center border-r border-[var(--color-border)] align-middle">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${day.color}`}>
                        {day.th}
                      </span>
                      <div className="mt-1 text-[10px] font-semibold text-[var(--color-text-muted)] tabular-nums">
                        {formatShortThaiDate(day.date)}
                        {isTodayRow && (
                          <span className="ml-1 text-rose-700 dark:text-rose-300 font-bold">· วันนี้</span>
                        )}
                      </div>
                      {rowHoliday && (
                        <div
                          className="mt-1 rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/70 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-200 leading-tight"
                          title={`${rowHoliday.nameTh} (${getThaiHolidayCategoryLabel(rowHoliday, lang)})`}
                        >
                          หยุด: {rowHoliday.nameTh}
                        </div>
                      )}
                    </td>

                    {/* Periods */}
                    {orderedSchoolPeriods.map((period) => {
                      if (period.isBreak) {
                        return (
                          <td key={period.periodNumber} className="p-2 text-center bg-amber-50 dark:bg-amber-950/60 border-r border-[var(--color-border)]">
                            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 writing-vertical rotate-180">
                              {period.labelTh || 'พักกลางวัน'}
                            </span>
                          </td>
                        );
                      }

                      const periodSlots = activeSlots.filter(
                        (s) => s.dayOfWeek === day.key && s.periodNumber === period.periodNumber
                      );

                      if (periodSlots.length === 0) {
                        return (
                          <td key={period.periodNumber} className="p-1.5 text-center border-r border-[var(--color-border)]">
                            <div className="h-22 rounded-xl border border-dashed border-[var(--color-border)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)] transition">
                              ว่าง
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={period.periodNumber} className="p-1 border-r border-[var(--color-border)] align-top">
                          <div className={isAllClassroomsView ? 'space-y-1' : 'space-y-1.5'}>
                            {periodSlots.map((slot) => {
                              const hasConflict = conflictingSlotIds.has(slot.id);
                              const slotColor = getTimetableSlotCardStyle(slot.colorTag);
                              const slotActivity = getTimetableSlotActivityStatus({
                                slot,
                                schoolPeriods,
                                now: bangkokClock,
                                schoolId,
                                targetDateStr: day.date,
                              });
                              const slotCheckStatus = getSlotCheckStatusForDate(slot, day.date);
                              const nextCheckType: 'check_in' | 'check_out' =
                                slotCheckStatus.hasCheckIn && !slotCheckStatus.hasCheckOut ? 'check_out' : 'check_in';
                              const canShowGridCheckin =
                                canUsePeriodCheckin &&
                                (slotActivity.isActive ||
                                  (isTodayRow && slotActivity.isTodayWeekday && !slotActivity.isHolidayOff));
                              return (
                                <div
                                  key={slot.id}
                                  onClick={() => openSlotDetails(slot)}
                                  style={slotColor.style}
                                  className={`${isAllClassroomsView ? 'min-h-14 p-1' : 'min-h-18 p-1.5'} rounded-md border transition group relative flex flex-col justify-between cursor-pointer ${slotColor.className} ${
                                    slotActivity.isActive
                                      ? 'border-rose-500 ring-2 ring-rose-500/45 shadow-md shadow-rose-500/20'
                                      : hasConflict && !isPersonalViewer
                                        ? 'ring-2 ring-amber-500 shadow-md shadow-amber-500/20'
                                        : ''
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="shrink-0 font-mono text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                          {slot.courseCode}
                                        </span>
                                        <span title="ชั้น/ห้องเรียน" className="truncate rounded bg-white/70 px-1 py-0.5 text-[9px] font-bold text-slate-800 dark:bg-slate-900/70 dark:text-white">
                                          {slot.classRoom}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {hasConflict && !isPersonalViewer && (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setSelectedConflictSlotId(slot.id);
                                            }}
                                            aria-label={`ดูข้อขัดแย้งของคาบ ${slot.courseTitleTh}`}
                                            title="ดูรายละเอียดข้อขัดแย้ง"
                                            className="relative z-10 shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900 cursor-pointer"
                                          >
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {isViewingCurrentTerm && canManageTimetable && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPendingSlotConfirm({
                                                title: 'ยืนยันการลบคาบเรียน',
                                                description: `ต้องการลบคาบเรียน ${slot.courseCode} (${slot.courseTitleTh}) ออกจากตารางสอนหรือไม่?`,
                                                confirmLabel: 'ลบคาบเรียน',
                                                tone: 'danger',
                                                onConfirm: async () => {
                                                  await onDeleteSlot(slot.id);
                                                },
                                              });
                                            }}
                                            aria-label={`ลบคาบ ${slot.courseTitleTh}`}
                                            className="p-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition shadow-sm cursor-pointer shrink-0"
                                            title="ลบคาบนี้"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {slotActivity.isActive && (
                                      <div className="mt-1 inline-flex items-center gap-1 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
                                        <span>ถึงคาบเรียน{slotActivity.remainingMinutes !== null ? ` · เหลือ ${slotActivity.remainingMinutes} น.` : ''}</span>
                                      </div>
                                    )}
                                    <h4 className={`${isAllClassroomsView ? 'text-[10px]' : 'text-[11px]'} font-bold mt-1 line-clamp-1 leading-tight`}>
                                      {slot.courseTitleTh}
                                    </h4>
                                  </div>

                                  <div className={`pt-1 border-t border-current/20 space-y-0.5 ${isAllClassroomsView ? 'text-[9px]' : 'text-[10px]'} opacity-95`}>
                                    <div className="flex items-center gap-1 min-w-0" title={formatSlotTeachersDisplay(slot)}>
                                      {getSlotTeachers(slot).length > 1 ? (
                                        <Users className="w-2.5 h-2.5 shrink-0" />
                                      ) : (
                                        <User className="w-2.5 h-2.5 shrink-0" />
                                      )}
                                      <span className="truncate">{formatSlotTeachersDisplay(slot)}</span>
                                      {getSlotTeachers(slot).length > 1 && (
                                        <span className="shrink-0 rounded bg-white/75 px-1 text-[8px] font-bold text-emerald-800 dark:bg-slate-900/70 dark:text-emerald-300">
                                          สอนคู่
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 truncate" title={`ห้องสถานที่: ${slot.room || 'ไม่ระบุ'}`}>
                                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{slot.room || 'ไม่ระบุห้องสถานที่'}</span>
                                    </div>
                                    <SlotStaffStatusBadges
                                      slot={slot}
                                      dateStr={day.date}
                                      isHolidayOff={Boolean(rowHoliday?.isSchoolDayOff)}
                                      isPersonalViewer={isPersonalViewer}
                                      todayBangkokDate={todayBangkokDate}
                                      courses={courses}
                                      students={students}
                                      teachers={teachers}
                                      attendance={attendance}
                                      periodAttendance={periodAttendance}
                                      leaveRequests={leaveRequests}
                                    />
                                  </div>

                                  {canOpenPeriodRoster && (
                                    <div className="pt-1.5 mt-1 border-t border-current/15 print:hidden">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPeriodRosterTarget({ slot, date: day.date });
                                        }}
                                        className="w-full min-h-[28px] inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-2 py-1 text-[10px] font-bold text-white shadow-xs cursor-pointer transition"
                                        title="ดูรายชื่อนักเรียนและเช็กชื่อรายคาบนี้ได้ทันที"
                                      >
                                        <UserCheck className="w-3 h-3 shrink-0" />
                                        <span>รายชื่อ / เช็กชื่อ</span>
                                      </button>
                                    </div>
                                  )}

                                  {canShowGridCheckin && (
                                    <div className="pt-1.5 mt-1 border-t border-current/15 print:hidden">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerSlotCheckin(slot, day.date, nextCheckType);
                                        }}
                                        className={`w-full min-h-[32px] inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white shadow-sm cursor-pointer transition ${
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
                                          {slotCheckStatus.hasCheckIn && slotCheckStatus.hasCheckOut
                                            ? 'เช็คอิน/เอาท์แล้ว'
                                            : nextCheckType === 'check_out'
                                              ? 'เช็คเอาท์คาบ'
                                              : 'เช็คอินเข้าคาบ'}
                                        </span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Delete button moved into top-right header action group beside conflict button */}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                    {!isPersonalViewer && (() => {
                      const dayAllSlots = activeSlots.filter((s) => s.dayOfWeek === day.key);
                      const daySummaries = dayAllSlots.map((slot) =>
                        getSlotAttendanceAndLeaveSummary({
                          slot,
                          dateStr: day.date,
                          courses,
                          students,
                          teachers,
                          attendance,
                          periodAttendance,
                          leaveRequests,
                        })
                      );
                      const checkedSlotsCount = daySummaries.filter((sum) => sum.periodCheckedTotal > 0).length;
                      const totalPresentMarks = daySummaries.reduce((acc, s) => acc + s.periodPresent + s.periodLate, 0);
                      const totalLeaveMarks = daySummaries.reduce((acc, s) => acc + s.periodExcused, 0);
                      const totalAbsentMarks = daySummaries.reduce((acc, s) => acc + s.periodAbsent, 0);
                      const teacherLeaveSlots = daySummaries.filter((s) =>
                        s.teacherStatuses.some((t) => t.status === 'on_leave_approved' || t.status === 'on_leave_pending')
                      ).length;
                      const teacherCheckedSlots = daySummaries.filter((s) =>
                        s.teacherStatuses.some((t) => t.status === 'checked_in' || t.status === 'late')
                      ).length;
                      const maxStudentLeavesOnDay = daySummaries.reduce(
                        (max, s) => Math.max(max, s.studentLeaveCount),
                        0
                      );

                      return (
                        <td className="p-2 border-l border-[var(--color-border)] align-middle text-[10px] print:hidden">
                          {rowHoliday ? (
                            <span className="inline-block rounded-md bg-rose-100 dark:bg-rose-950/70 px-2 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-200">
                              งดสอน (วันหยุด)
                            </span>
                          ) : dayAllSlots.length === 0 ? (
                            <span className="text-[var(--color-text-muted)]">ไม่มีคาบสอน</span>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1 tabular-nums">
                                {checkedSlotsCount > 0 ? (
                                  <>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold">
                                      เช็กแล้ว {checkedSlotsCount}/{dayAllSlots.length} คาบ
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-semibold">
                                      มา {totalPresentMarks}
                                    </span>
                                    {totalLeaveMarks > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold">
                                        ลา {totalLeaveMarks}
                                      </span>
                                    )}
                                    {totalAbsentMarks > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold">
                                        ขาด {totalAbsentMarks}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                    รอเช็ก {dayAllSlots.length} คาบ
                                  </span>
                                )}
                                {teacherLeaveSlots > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold">
                                    ครูลา {teacherLeaveSlots} คาบ
                                  </span>
                                )}
                                {teacherCheckedSlots > 0 && day.date <= todayBangkokDate && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 font-semibold">
                                    ครูเข้า รร. {teacherCheckedSlots}/{dayAllSlots.length}
                                  </span>
                                )}
                                {maxStudentLeavesOnDay > 0 && checkedSlotsCount === 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold">
                                    นร.ลา {maxStudentLeavesOnDay}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setRollcallDate(day.date);
                                  setRollcallSlotId(dayAllSlots[0]?.id || '');
                                  setViewMode('period_rollcall');
                                }}
                                className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/70 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 cursor-pointer transition"
                              >
                                <UserCheck className="w-3 h-3 shrink-0" />
                                <span>เช็กชื่อรายคน</span>
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
