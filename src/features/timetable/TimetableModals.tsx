import React from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  Plus,
  Printer,
  Search,
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
} from '../../types';
import { addCalendarDays, BangkokClockSnapshot, getTimetableSlotActivityStatus } from '../../lib/timetableCalendar';
import { formatSemesterLabel } from '../../lib/schoolSettings';
import { shouldShowCourseCredits } from '../../lib/moeGrading';
import { formatSlotTeachersDisplay, getSlotTeachers, normalizeTeacherName } from '../../lib/timetableTeachers';
import { getTimetableSlotCardStyle } from '../../lib/timetableColors';
import { CourseTeacherOption } from '../../lib/courseTeacherFilter';
import { GoogleCalendarSyncModal } from '../../components/GoogleCalendarSyncModal';
import { TimetableImportExportModal } from '../../components/modals/TimetableImportExportModal';
import { ConfirmActionModal } from '../../components/modals/ConfirmActionModal';
import { TimetablePeriodAttendanceModal } from '../../components/modals/TimetablePeriodAttendanceModal';
import { BaseModal } from '../../components/common/BaseModal';
import {
  ALL_CLASSROOMS,
  DAYS,
  formatTimeMinutes,
  MAX_LESSON_PERIODS,
  PendingSlotConfirmState,
  TimetableConflict,
  TimetableScheduleFilters,
  UNASSIGNED_GRADE_LEVEL,
} from './types';
import { TimetableColorPicker } from './TimetableColorPicker';

interface TimetableModalsProps {
  schoolId: string;
  schoolName: string;
  lang: AppLanguage;
  isAdmin: boolean;
  isPersonalViewer: boolean;
  canManageTimetable: boolean;
  canEditTimetableSlots: boolean;
  isViewingCurrentTerm: boolean;
  canOpenPeriodRoster: boolean;
  canUsePeriodCheckin: boolean;
  showPrimaryCourseCredits: boolean;
  currentUser: AuthUser | null;
  todayBangkokDate: string;
  bangkokClock: BangkokClockSnapshot;
  courses: Course[];
  assignments: Assignment[];
  teachers: Teacher[];
  students: Student[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  schoolPeriods: SchoolPeriodTime[];
  lessonPeriods: SchoolPeriodTime[];
  slots: TimetableSlot[];
  allTimetableSlots: TimetableSlot[];
  activeSlots: TimetableSlot[];
  uniqueClassRooms: string[];
  selectedClassRoom: string;
  teacherNames: string[];
  gradeLevels: string[];
  gradeRooms: Map<string, Set<string>>;
  scheduledTeacherNames: string[];
  viewAcademicYear: string;
  viewSemester: string;
  calendarWeekStart: string;
  activeScheduleFilters: TimetableScheduleFilters | null;
  setActiveScheduleFilters: (filters: TimetableScheduleFilters | null) => void;
  selectedConflictSlotId: string | null;
  setSelectedConflictSlotId: (slotId: string | null) => void;
  selectedSlotConflicts: TimetableConflict[];
  openConflictSlot: (slot: TimetableSlot) => void;
  showPeriodSettings: boolean;
  setShowPeriodSettings: (show: boolean) => void;
  periodDraft: SchoolPeriodTime[];
  setPeriodDraft: React.Dispatch<React.SetStateAction<SchoolPeriodTime[]>>;
  periodSettingsError: string | null;
  isSavingPeriods: boolean;
  handleSavePeriodSettings: (e: React.FormEvent) => Promise<void>;
  handleAddBreakPeriod: () => void;
  handleAddPeriod: () => void;
  handleRemovePeriod: (periodNumber: number) => void;
  selectedSlotForDetail: TimetableSlot | null;
  closeSlotDetails: () => void;
  isEditingSelectedSlot: boolean;
  setIsEditingSelectedSlot: (editing: boolean) => void;
  editSlotDraft: TimetableSlot | null;
  setEditSlotDraft: React.Dispatch<React.SetStateAction<TimetableSlot | null>>;
  editSlotPeriodOptions: number[];
  editSlotClassRoomOptions: string[];
  editSlotTeacherOptions: string[];
  editSlotConflicts: Array<{
    slot: TimetableSlot;
    details: { reasons: string[]; overlapStart: number | null; overlapEnd: number | null };
  }>;
  handleSaveEditedSlot: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  slotActionError: string | null;
  setSlotActionError: (err: string | null) => void;
  isSavingSlot: boolean;
  onDeleteSlot: (id: string) => Promise<void>;
  getPeriodTime: (periodNumber: number) => SchoolPeriodTime | undefined;
  getSlotCheckStatusForDate: (slot: TimetableSlot, dateStr: string) => {
    resolvedCourseId: string;
    hasCheckIn: boolean;
    hasCheckOut: boolean;
  };
  triggerSlotCheckin: (slot: TimetableSlot, dateStr: string, checkType: 'check_in' | 'check_out') => void;
  setPeriodRosterTarget: (target: { slot: TimetableSlot; date: string } | null) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  handleCreateSlot: (e: React.FormEvent) => Promise<void>;
  prospectiveConflict: TimetableSlot | null;
  prospectiveConflictDetails: { reasons: string[] } | null;
  courseSearchInput: string;
  setCourseSearchInput: (val: string) => void;
  courseCatalogTeacherOptions: CourseTeacherOption[];
  catalogTeacherFilter: string;
  setCatalogTeacherFilter: (val: string) => void;
  selectedCourseId: string;
  handleSelectCourse: (courseId: string) => void;
  filteredCourseCatalog: Course[];
  selectedCatalogCourse?: Course;
  newDay: DayOfWeek;
  setNewDay: (day: DayOfWeek) => void;
  newPeriod: number;
  setNewPeriod: (period: number) => void;
  newCourseCode: string;
  setNewCourseCode: (code: string) => void;
  newTitleTh: string;
  setNewTitleTh: (title: string) => void;
  newTeacher: string;
  setNewTeacher: (teacher: string) => void;
  newCoTeacher: string;
  setNewCoTeacher: (coTeacher: string) => void;
  newRoom: string;
  setNewRoom: (room: string) => void;
  newClassRoom: string;
  setNewClassRoom: (classRoom: string) => void;
  newColor: TimetableSlot['colorTag'];
  setNewColor: (color: TimetableSlot['colorTag']) => void;
  showGoogleCalendarModal: boolean;
  setShowGoogleCalendarModal: (show: boolean) => void;
  showImportExportModal: boolean;
  setShowImportExportModal: (show: boolean) => void;
  onImportSlots?: (slots: TimetableSlot[]) => Promise<void> | void;
  onAddSlot: (slot: TimetableSlot) => Promise<void>;
  showScheduleSettingsModal: boolean;
  setShowScheduleSettingsModal: (show: boolean) => void;
  scheduleFilterDraft: TimetableScheduleFilters;
  setScheduleFilterDraft: React.Dispatch<React.SetStateAction<TimetableScheduleFilters>>;
  filterSlotsByScheduleSettings: (filters: TimetableScheduleFilters) => TimetableSlot[];
  showPeriodEditor: boolean;
  setShowPeriodEditor: (show: boolean) => void;
  onUpdateAcademicPeriod?: (
    academicYear: string,
    currentSemester: string,
    semesterOptions?: string[]
  ) => Promise<void>;
  draftAcademicYear: string;
  setDraftAcademicYear: (year: string) => void;
  draftSemester: string;
  setDraftSemester: (semester: string) => void;
  draftSemesterOptions: string[];
  setDraftSemesterOptions: React.Dispatch<React.SetStateAction<string[]>>;
  newSemesterOptionInput: string;
  setNewSemesterOptionInput: (val: string) => void;
  isSavingAcademicPeriod: boolean;
  setIsSavingAcademicPeriod: (saving: boolean) => void;
  setAcademicPeriodNotice: (notice: string | null) => void;
  pendingSlotConfirm: PendingSlotConfirmState | null;
  setPendingSlotConfirm: (confirm: PendingSlotConfirmState | null) => void;
  isConfirmingSlotAction: boolean;
  setIsConfirmingSlotAction: (confirming: boolean) => void;
  periodRosterTarget: { slot: TimetableSlot; date: string } | null;
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
}

export const TimetableModals: React.FC<TimetableModalsProps> = ({
  schoolId,
  schoolName,
  lang,
  isAdmin,
  isPersonalViewer,
  canManageTimetable,
  canEditTimetableSlots,
  isViewingCurrentTerm,
  canOpenPeriodRoster,
  canUsePeriodCheckin,
  showPrimaryCourseCredits,
  currentUser,
  todayBangkokDate,
  bangkokClock,
  courses,
  assignments,
  teachers,
  students,
  attendance,
  periodAttendance,
  leaveRequests,
  schoolPeriods,
  lessonPeriods,
  slots,
  allTimetableSlots,
  activeSlots,
  uniqueClassRooms,
  selectedClassRoom,
  teacherNames,
  gradeLevels,
  gradeRooms,
  scheduledTeacherNames,
  viewAcademicYear,
  viewSemester,
  calendarWeekStart,
  activeScheduleFilters,
  setActiveScheduleFilters,
  selectedConflictSlotId,
  setSelectedConflictSlotId,
  selectedSlotConflicts,
  openConflictSlot,
  showPeriodSettings,
  setShowPeriodSettings,
  periodDraft,
  setPeriodDraft,
  periodSettingsError,
  isSavingPeriods,
  handleSavePeriodSettings,
  handleAddBreakPeriod,
  handleAddPeriod,
  handleRemovePeriod,
  selectedSlotForDetail,
  closeSlotDetails,
  isEditingSelectedSlot,
  setIsEditingSelectedSlot,
  editSlotDraft,
  setEditSlotDraft,
  editSlotPeriodOptions,
  editSlotClassRoomOptions,
  editSlotTeacherOptions,
  editSlotConflicts,
  handleSaveEditedSlot,
  slotActionError,
  setSlotActionError,
  isSavingSlot,
  onDeleteSlot,
  getPeriodTime,
  getSlotCheckStatusForDate,
  triggerSlotCheckin,
  setPeriodRosterTarget,
  showAddModal,
  setShowAddModal,
  handleCreateSlot,
  prospectiveConflict,
  prospectiveConflictDetails,
  courseSearchInput,
  setCourseSearchInput,
  courseCatalogTeacherOptions,
  catalogTeacherFilter,
  setCatalogTeacherFilter,
  selectedCourseId,
  handleSelectCourse,
  filteredCourseCatalog,
  selectedCatalogCourse,
  newDay,
  setNewDay,
  newPeriod,
  setNewPeriod,
  newCourseCode,
  setNewCourseCode,
  newTitleTh,
  setNewTitleTh,
  newTeacher,
  setNewTeacher,
  newCoTeacher,
  setNewCoTeacher,
  newRoom,
  setNewRoom,
  newClassRoom,
  setNewClassRoom,
  newColor,
  setNewColor,
  showGoogleCalendarModal,
  setShowGoogleCalendarModal,
  showImportExportModal,
  setShowImportExportModal,
  onImportSlots,
  onAddSlot,
  showScheduleSettingsModal,
  setShowScheduleSettingsModal,
  scheduleFilterDraft,
  setScheduleFilterDraft,
  filterSlotsByScheduleSettings,
  showPeriodEditor,
  setShowPeriodEditor,
  onUpdateAcademicPeriod,
  draftAcademicYear,
  setDraftAcademicYear,
  draftSemester,
  setDraftSemester,
  draftSemesterOptions,
  setDraftSemesterOptions,
  newSemesterOptionInput,
  setNewSemesterOptionInput,
  isSavingAcademicPeriod,
  setIsSavingAcademicPeriod,
  setAcademicPeriodNotice,
  pendingSlotConfirm,
  setPendingSlotConfirm,
  isConfirmingSlotAction,
  setIsConfirmingSlotAction,
  periodRosterTarget,
  onRecordPeriodAttendance,
}) => {
  return (
    <>
      {!isPersonalViewer && selectedConflictSlotId && selectedSlotConflicts.length > 0 && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="รายละเอียดข้อขัดแย้งตารางสอน"
          className="fixed bottom-20 left-3 z-[100] w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-amber-300 bg-[var(--color-card)] text-[var(--color-text-body)] shadow-2xl dark:border-amber-700 sm:left-5 md:bottom-5"
        >
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/60">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                ข้อขัดแย้งของคาบนี้ · {selectedSlotConflicts.length} คู่
              </p>
              <p className="text-[10px] text-amber-800 dark:text-amber-200">
                กดรายการเพื่อเปิดรายละเอียดคาบที่เกี่ยวข้อง
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedConflictSlotId(null)}
              aria-label="ปิดรายละเอียดข้อขัดแย้ง"
              className="rounded-md p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto p-2.5">
            {selectedSlotConflicts.map(({ key, slotA, slotB, reasons, overlapStart, overlapEnd }) => {
              const dayLabel = DAYS.find((day) => day.key === slotA.dayOfWeek)?.th || slotA.dayOfWeek;
              const periodLabel = slotA.periodNumber === slotB.periodNumber
                ? `คาบ ${slotA.periodNumber}`
                : `คาบ ${slotA.periodNumber} และ ${slotB.periodNumber}`;
              const overlapLabel = overlapStart !== null && overlapEnd !== null
                ? `${formatTimeMinutes(overlapStart)}–${formatTimeMinutes(overlapEnd)}`
                : 'เวลาเดียวกัน';
              return (
                <section key={key} className="rounded-lg border border-amber-200 p-2 dark:border-amber-800">
                  <p className="mb-1 text-[10px] font-semibold">
                    {dayLabel} · {periodLabel} · {overlapLabel}
                  </p>
                  <p className="mb-2 text-[10px] text-amber-800 dark:text-amber-200">
                    ชนกัน: {reasons.join(' · ')}
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {[slotA, slotB].map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setSelectedConflictSlotId(null);
                          openConflictSlot(slot);
                        }}
                        className="flex min-w-0 flex-col items-start rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1.5 text-left text-[10px] hover:border-amber-400"
                      >
                        <span className="w-full truncate font-bold">
                          {slot.courseCode} · {slot.courseTitleTh}
                        </span>
                        <span>ห้อง {slot.classRoom || 'ไม่ระบุ'} · ครู {formatSlotTeachersDisplay(slot)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <BaseModal
        isOpen={Boolean(isAdmin && showPeriodSettings)}
        onClose={() => { if (!isSavingPeriods) setShowPeriodSettings(false); }}
        closeDisabled={isSavingPeriods}
        title="ตั้งเวลาเรียนมาตรฐานของโรงเรียน"
        subtitle="เฉพาะผู้ดูแลระบบโรงเรียนเท่านั้นที่กำหนดได้ มีผลกับตารางเรียนและการเช็คชื่อรายคาบ"
        icon={<Clock className="w-5 h-5 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-xl"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-4"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowPeriodSettings(false)}
              disabled={isSavingPeriods}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--color-card-subtle)] disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="timetable-period-settings-form"
              disabled={isSavingPeriods}
              className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSavingPeriods ? 'กำลังบันทึก...' : 'บันทึกเวลาเรียน'}
            </button>
          </>
        }
      >
        <form id="timetable-period-settings-form" onSubmit={handleSavePeriodSettings} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--color-text-muted)]">
              เพิ่ม/ลบและเปลี่ยนชื่อได้ทั้งคาบเรียน (สูงสุด {MAX_LESSON_PERIODS} คาบ) และช่วงพัก
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddBreakPeriod}
                disabled={isSavingPeriods}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-200 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มช่วงพัก
              </button>
              <button
                type="button"
                onClick={handleAddPeriod}
                disabled={isSavingPeriods || periodDraft.filter((p) => !p.isBreak).length >= MAX_LESSON_PERIODS}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มคาบเรียน
              </button>
            </div>
          </div>
          {periodDraft.slice().sort(
            (a, b) => a.startTime.localeCompare(b.startTime)
          ).map((period) => (
            <div key={period.periodNumber} className={`grid grid-cols-[minmax(110px,1.2fr)_1fr_1fr_auto] items-center gap-2 rounded-xl border p-2.5 ${period.isBreak ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'}`}>
              <label className="text-[10px] text-[var(--color-text-muted)]">
                {period.isBreak ? 'ชื่อช่วงพัก' : `ชื่อคาบ (${period.periodNumber})`}
                <input
                  type="text"
                  value={period.labelTh ?? (period.isBreak ? 'พักกลางวัน' : `คาบ ${period.periodNumber}`)}
                  onChange={(event) => setPeriodDraft((prev) => prev.map((item) => item.periodNumber === period.periodNumber ? { ...item, labelTh: event.target.value } : item))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-xs font-bold text-[var(--color-text-title)]"
                />
              </label>
              <label className="text-[10px] text-[var(--color-text-muted)]">
                เริ่ม
                <input
                  type="time"
                  required
                  value={period.startTime}
                  onChange={(event) => setPeriodDraft((prev) => prev.map((item) => item.periodNumber === period.periodNumber ? { ...item, startTime: event.target.value } : item))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-xs text-[var(--color-text-title)]"
                />
              </label>
              <label className="text-[10px] text-[var(--color-text-muted)]">
                เลิก
                <input
                  type="time"
                  required
                  value={period.endTime}
                  onChange={(event) => setPeriodDraft((prev) => prev.map((item) => item.periodNumber === period.periodNumber ? { ...item, endTime: event.target.value } : item))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-xs text-[var(--color-text-title)]"
                />
              </label>
              <button
                type="button"
                onClick={() => handleRemovePeriod(period.periodNumber)}
                disabled={isSavingPeriods}
                aria-label={`ลบ ${period.labelTh || `คาบที่ ${period.periodNumber}`}`}
                className="rounded-lg p-2 mt-4 text-rose-600 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {periodSettingsError && (
            <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
              {periodSettingsError}
            </p>
          )}
        </form>
      </BaseModal>

      {/* Detail Popover Modal for Clicked Slot */}
      <BaseModal
        isOpen={Boolean(selectedSlotForDetail)}
        onClose={closeSlotDetails}
        title={selectedSlotForDetail ? `${selectedSlotForDetail.courseCode} · ${selectedSlotForDetail.courseTitleTh}` : ''}
        subtitle={
          selectedSlotForDetail
            ? `คาบที่ ${selectedSlotForDetail.periodNumber} (${getPeriodTime(selectedSlotForDetail.periodNumber)?.startTime || selectedSlotForDetail.startTime} - ${getPeriodTime(selectedSlotForDetail.periodNumber)?.endTime || selectedSlotForDetail.endTime})`
            : undefined
        }
        icon={<Clock className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-md"
        showMobileHandle
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-2 text-xs"
        footerClassName="justify-between"
        footer={
          selectedSlotForDetail ? (
            isEditingSelectedSlot ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSelectedSlot(false);
                    setEditSlotDraft(null);
                    setSlotActionError(null);
                  }}
                  disabled={isSavingSlot}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  form="edit-timetable-slot-form"
                  disabled={isSavingSlot}
                  className="ml-auto rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {isSavingSlot ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
                </button>
              </>
            ) : (
              <>
                {canOpenPeriodRoster && (
                  <div className="w-full pb-2 mb-1 border-b border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedSlotForDetail;
                        closeSlotDetails();
                        setPeriodRosterTarget({ slot: target, date: todayBangkokDate });
                      }}
                      className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-2 text-xs font-bold text-white cursor-pointer transition"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>ดูรายชื่อนักเรียน &amp; เช็กชื่อคาบนี้ทันที</span>
                    </button>
                  </div>
                )}
                {canUsePeriodCheckin && (() => {
                  const detailActivity = getTimetableSlotActivityStatus({
                    slot: selectedSlotForDetail,
                    schoolPeriods,
                    now: bangkokClock,
                    schoolId,
                  });
                  if (!detailActivity.isActive && (!detailActivity.isTodayWeekday || detailActivity.isHolidayOff)) {
                    return null;
                  }
                  return (
                    <div className="w-full flex flex-wrap items-center gap-2 pb-2 mb-1 border-b border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedSlotForDetail;
                          closeSlotDetails();
                          triggerSlotCheckin(target, todayBangkokDate, 'check_in');
                        }}
                        className={`flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white cursor-pointer ${
                          detailActivity.isActive
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                        }`}
                      >
                        <LogIn className="w-4 h-4" />
                        <span>
                          {getSlotCheckStatusForDate(selectedSlotForDetail, todayBangkokDate).hasCheckIn
                            ? 'เช็คอินเข้าคาบ (บันทึกแล้ว)'
                            : detailActivity.isActive
                              ? 'เช็คอินเข้าคาบตอนนี้'
                              : 'เช็คอินเข้าคาบ'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedSlotForDetail;
                          closeSlotDetails();
                          triggerSlotCheckin(target, todayBangkokDate, 'check_out');
                        }}
                        className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>
                          {getSlotCheckStatusForDate(selectedSlotForDetail, todayBangkokDate).hasCheckOut
                            ? 'เช็คเอาท์คาบ (บันทึกแล้ว)'
                            : 'เช็คเอาท์ออกคาบ'}
                        </span>
                      </button>
                    </div>
                  );
                })()}
                {canEditTimetableSlots && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditSlotDraft({ ...selectedSlotForDetail });
                      setIsEditingSelectedSlot(true);
                      setSlotActionError(null);
                    }}
                    className="rounded-lg border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-text)] hover:bg-[var(--color-card-subtle)]"
                  >
                    แก้ไขคาบนี้
                  </button>
                )}
                {isViewingCurrentTerm && canManageTimetable && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlotActionError(null);
                      void onDeleteSlot(selectedSlotForDetail.id)
                        .then(closeSlotDetails)
                        .catch((error: unknown) => {
                          setSlotActionError(error instanceof Error ? error.message : String(error));
                        });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-xs font-semibold hover:bg-rose-200 cursor-pointer"
                  >
                    ลบคาบนี้ออกจากตาราง
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeSlotDetails}
                  className="ml-auto rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white"
                >
                  ปิด
                </button>
              </>
            )
          ) : undefined
        }
      >
        {selectedSlotForDetail && (
          <>
            {selectedSlotForDetail.courseTitleEn && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {selectedSlotForDetail.courseTitleEn}
              </p>
            )}

              {isEditingSelectedSlot && editSlotDraft ? (
                <form id="edit-timetable-slot-form" onSubmit={handleSaveEditedSlot} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      วัน
                      <select
                        value={editSlotDraft.dayOfWeek}
                        onChange={(event) => {
                          const day = DAYS.find((option) => option.key === event.target.value)?.key;
                          if (day) {
                            setEditSlotDraft((previous) => previous
                              ? { ...previous, dayOfWeek: day }
                              : previous);
                          }
                        }}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs text-[var(--color-text-title)]"
                      >
                        {DAYS.map((day) => <option key={day.key} value={day.key}>{day.th}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      คาบ
                      <select
                        value={editSlotDraft.periodNumber}
                        onChange={(event) => {
                          const periodNumber = Number(event.target.value);
                          const period = getPeriodTime(periodNumber);
                          setEditSlotDraft((previous) => previous
                            ? {
                              ...previous,
                              periodNumber,
                              startTime: period?.startTime || previous.startTime,
                              endTime: period?.endTime || previous.endTime,
                            }
                            : previous);
                        }}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs text-[var(--color-text-title)]"
                      >
                        {editSlotPeriodOptions.map((periodNumber) => {
                          const period = getPeriodTime(periodNumber);
                          return (
                            <option key={periodNumber} value={periodNumber}>
                              คาบ {periodNumber}{period ? ` (${period.startTime}–${period.endTime})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      ห้องเรียน
                      <select
                        value={editSlotDraft.classRoom}
                        onChange={(event) => setEditSlotDraft((previous) => previous
                          ? { ...previous, classRoom: event.target.value }
                          : previous)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs text-[var(--color-text-title)]"
                      >
                        {editSlotClassRoomOptions.map((classRoom) => (
                          <option key={classRoom} value={classRoom}>{classRoom}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      ครูผู้สอนหลัก
                      <select
                        value={editSlotDraft.teacherName}
                        onChange={(event) => setEditSlotDraft((previous) => previous
                          ? { ...previous, teacherName: event.target.value }
                          : previous)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs text-[var(--color-text-title)]"
                      >
                        <option value="">ไม่ระบุครู</option>
                        {editSlotTeacherOptions.map((teacherName) => (
                          <option key={teacherName} value={teacherName}>{teacherName}</option>
                        ))}
                      </select>
                    </label>
                    <label className="col-span-2 space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      ครูสอนคู่ (ถ้ามี)
                      <select
                        value={editSlotDraft.coTeacherName || ''}
                        onChange={(event) => setEditSlotDraft((previous) => previous
                          ? { ...previous, coTeacherName: event.target.value || undefined }
                          : previous)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs text-[var(--color-text-title)]"
                      >
                        <option value="">ไม่มีครูสอนคู่</option>
                        {editSlotTeacherOptions
                          .filter((name) => normalizeTeacherName(name) !== normalizeTeacherName(editSlotDraft.teacherName))
                          .map((teacherName) => (
                            <option key={teacherName} value={teacherName}>{teacherName}</option>
                          ))}
                      </select>
                    </label>
                    <label className="col-span-2 space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      สถานที่ / ห้องปฏิบัติการ
                      <input
                        value={editSlotDraft.room}
                        onChange={(event) => setEditSlotDraft((previous) => previous
                          ? { ...previous, room: event.target.value }
                          : previous)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs text-[var(--color-text-title)]"
                      />
                    </label>
                    <div className="col-span-2 pt-1">
                      <TimetableColorPicker
                        value={editSlotDraft.colorTag || 'sky'}
                        onChange={(nextColor) =>
                          setEditSlotDraft((previous) =>
                            previous ? { ...previous, colorTag: nextColor } : previous
                          )
                        }
                      />
                    </div>
                  </div>
                  {editSlotConflicts.length > 0 && (
                    <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                      ยังพบคาบชนกับ {editSlotConflicts.map(({ slot, details }) => (
                        `${slot.courseCode} (${details.reasons.join(', ')})`
                      )).join(' · ')}
                    </div>
                  )}
                  {slotActionError && (
                    <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[10px] text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                      {slotActionError}
                    </p>
                  )}
                </form>
              ) : (
                <div className="space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">ห้องเรียน (Classroom):</span>
                    <span className="font-bold text-[var(--color-text-title)]">{selectedSlotForDetail.classRoom}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--color-text-muted)]">ครูผู้สอนหลัก (Instructor):</span>
                    <span className="font-bold text-[var(--color-text-title)] text-right">{selectedSlotForDetail.teacherName || 'ไม่ระบุ'}</span>
                  </div>
                  {selectedSlotForDetail.coTeacherName && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--color-text-muted)]">ครูสอนคู่ (Co-Teacher):</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 text-right">
                        {selectedSlotForDetail.coTeacherName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">สถานที่/ห้องแล็บ (Room):</span>
                    <span className="font-bold text-[var(--color-text-title)]">{selectedSlotForDetail.room}</span>
                  </div>
                  {shouldShowCourseCredits(selectedSlotForDetail.courseCode, showPrimaryCourseCredits) && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">หน่วยกิต (Credits):</span>
                      <span className="font-bold text-[var(--color-primary-text)]">
                        {(selectedSlotForDetail.credits ?? 1.5) === 0 ? 'ไม่มีหน่วยกิต' : `${selectedSlotForDetail.credits ?? 1.5} หน่วยกิต`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">เกณฑ์เวลาเรียน 80% (สิทธิ์สอบ):</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {Math.round((selectedSlotForDetail.totalSemesterHours || ((selectedSlotForDetail.credits ?? 1.5) > 0 ? (selectedSlotForDetail.credits ?? 1.5) * 40 : 20)) * 0.8)} / {selectedSlotForDetail.totalSemesterHours || ((selectedSlotForDetail.credits ?? 1.5) > 0 ? (selectedSlotForDetail.credits ?? 1.5) * 40 : 20)} ชั่วโมง
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--color-text-muted)]">สีในตารางสอน:</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-black/15"
                        style={{ backgroundColor: getTimetableSlotCardStyle(selectedSlotForDetail.colorTag).swatchHex }}
                      />
                      <span>{getTimetableSlotCardStyle(selectedSlotForDetail.colorTag).labelTh}</span>
                    </span>
                  </div>
                </div>
              )}
              {slotActionError && !isEditingSelectedSlot && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[10px] text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                  {slotActionError}
                </p>
              )}
          </>
        )}
      </BaseModal>

      {/* Add Slot Modal with Course Catalog Selector */}
      <BaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="เพิ่มคาบเรียนลงตาราง (Add Class Slot)"
        icon={<Plus className="w-5 h-5 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-lg"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="add-timetable-slot-form"
              disabled={isSavingSlot}
              className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-sm"
            >
              {isSavingSlot ? 'กำลังบันทึก...' : 'บันทึกคาบเรียนลงตาราง'}
            </button>
          </>
        }
      >
        <form id="add-timetable-slot-form" onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              {slotActionError && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-rose-800">
                  {slotActionError}
                </p>
              )}
              {/* Conflict Preview Warning inside Modal */}
              {prospectiveConflict && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">คำเตือน คาบนี้มีข้อขัดแย้ง:</span>
                    <p className="text-[11px] mt-0.5">
                      {prospectiveConflictDetails?.reasons.join(' · ')} กับ {prospectiveConflict.courseCode}
                      {' · '}คาบ {newPeriod} ซ้อนกับคาบ {prospectiveConflict.periodNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* Course Selector from Course Catalog */}
              <div className="space-y-2">
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                  ค้นหาและเลือกรายวิชาที่เปิดสอน
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="relative block min-w-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                      type="search"
                      value={courseSearchInput}
                      onChange={(event) => setCourseSearchInput(event.target.value)}
                      placeholder="ค้นหารหัสวิชา ชื่อวิชา หรือชื่อครู"
                      aria-label="ค้นหารายวิชา"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-2 pl-9 pr-3 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </label>
                  {courseCatalogTeacherOptions.length > 0 && (
                    <select
                      aria-label="กรองวิชาตามรายชื่อครู"
                      value={catalogTeacherFilter}
                      onChange={(event) => setCatalogTeacherFilter(event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs font-medium text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="all">ครูผู้สอนทุกคน ({courseCatalogTeacherOptions.length})</option>
                      {courseCatalogTeacherOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label} ({opt.count} วิชา)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectCourse('custom')}
                    aria-pressed={selectedCourseId === 'custom'}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition ${
                      selectedCourseId === 'custom'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                        : 'border-transparent text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                    }`}
                  >
                    กรอกข้อมูลรายวิชาเอง
                  </button>
                  {filteredCourseCatalog.length > 0 ? filteredCourseCatalog.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleSelectCourse(course.id)}
                      aria-pressed={selectedCourseId === course.id}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                        selectedCourseId === course.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                          : 'border-transparent text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                      }`}
                    >
                      <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                        <span className="font-mono text-[11px] font-bold">{course.code}</span>
                        {shouldShowCourseCredits(course.code, showPrimaryCourseCredits) && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {course.credits === 0 ? 'ไม่มีหน่วยกิต' : `${course.credits} หน่วยกิต`}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold">
                        {course.titleTh || course.titleEn || 'ไม่ระบุชื่อวิชา'}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-[var(--color-text-muted)]">
                        ครูผู้สอน: {course.teacherName || 'ยังไม่ระบุ'}
                      </span>
                    </button>
                  )) : (
                    <p className="px-2.5 py-4 text-center text-[11px] text-[var(--color-text-muted)]">
                      ไม่พบรายวิชาที่ตรงกับคำค้นหา
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  พบ {filteredCourseCatalog.length} จาก {courses.length} รายวิชา
                  {selectedCatalogCourse && (
                    <> · เลือกแล้ว: <strong className="font-mono">{selectedCatalogCourse.code}</strong></>
                  )}
                </p>
              </div>

              {/* Day & Period Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">วันในสัปดาห์</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  >
                    {DAYS.map((d) => (
                      <option key={d.key} value={d.key}>{d.th}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">คาบเรียนที่</label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(Number(e.target.value))}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  >
                    {lessonPeriods.map((period) => (
                      <option key={period.periodNumber} value={period.periodNumber}>
                        คาบที่ {period.periodNumber} ({period.startTime} - {period.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Code & Title */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">รหัสวิชา</label>
                  <input
                    type="text"
                    required
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="เช่น ว30201"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-primary-text)] font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">ชื่อวิชา (ภาษาไทย)</label>
                  <input
                    type="text"
                    required
                    value={newTitleTh}
                    onChange={(e) => setNewTitleTh(e.target.value)}
                    placeholder="เช่น เคมี: สารอินทรีย์"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              {/* Teacher, Co-Teacher, and Room */}
              <datalist id="timetable-teacher-options">
                {teacherNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">ครูผู้สอนหลัก</label>
                  <input
                    type="text"
                    required
                    list="timetable-teacher-options"
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    placeholder="ชื่อครูผู้สอนหลัก"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">ครูสอนคู่ (ถ้ามี)</label>
                  <input
                    type="text"
                    list="timetable-teacher-options"
                    value={newCoTeacher}
                    onChange={(e) => setNewCoTeacher(e.target.value)}
                    placeholder="เลือกหรือพิมพ์ชื่อครูสอนคู่"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">ห้องเรียน / แล็บ</label>
                <input
                  type="text"
                  required
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="เช่น ห้อง 401 หรือ Lab 2"
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              {/* Classroom destination & Color tag */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">ห้องเรียนผู้เรียน</label>
                  <select
                    required
                    value={newClassRoom}
                    onChange={(e) => setNewClassRoom(e.target.value)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)] font-bold"
                  >
                    <option value="">เลือกห้องเรียนปลายทาง</option>
                    {(activeScheduleFilters?.gradeLevel
                      ? uniqueClassRooms.filter((room) => gradeRooms.get(activeScheduleFilters.gradeLevel)?.has(normalizeTeacherName(room)))
                      : uniqueClassRooms
                    ).map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>
                <TimetableColorPicker value={newColor || 'sky'} onChange={(nextColor) => setNewColor(nextColor)} />
              </div>

            </form>
      </BaseModal>

      {showGoogleCalendarModal && (
        <GoogleCalendarSyncModal
          slots={activeSlots}
          assignments={assignments}
          courses={courses}
          schoolId={schoolId}
          schoolName={schoolName}
          academicYear={viewAcademicYear}
          semester={viewSemester}
          filterLabel={
            activeScheduleFilters
              ? [activeScheduleFilters.gradeLevel, activeScheduleFilters.classRoom, activeScheduleFilters.teacherName]
                  .filter(Boolean)
                  .join(' · ') || 'ตารางที่กรอง'
              : selectedClassRoom === ALL_CLASSROOMS
                ? `ทุกห้อง (${uniqueClassRooms.length} ห้อง)`
                : selectedClassRoom || 'ตารางเรียน'
          }
          defaultStartDate={calendarWeekStart}
          defaultEndDate={addCalendarDays(calendarWeekStart, 15 * 7 + 4)}
          calendarWeekStart={calendarWeekStart}
          onClose={() => setShowGoogleCalendarModal(false)}
        />
      )}

      {showImportExportModal && (
        <TimetableImportExportModal
          schoolId={schoolId}
          academicYear={viewAcademicYear}
          semester={viewSemester}
          filteredSlots={activeSlots}
          allSlots={allTimetableSlots}
          existingSlotsForTerm={slots}
          schoolPeriods={schoolPeriods}
          filterLabel={
            activeScheduleFilters
              ? [activeScheduleFilters.gradeLevel, activeScheduleFilters.classRoom, activeScheduleFilters.teacherName]
                  .filter(Boolean)
                  .join(' · ') || 'ตารางที่กรอง'
              : selectedClassRoom === ALL_CLASSROOMS
                ? `ทุกห้อง (${uniqueClassRooms.length} ห้อง)`
                : selectedClassRoom || 'ทุกห้อง'
          }
          onImportSlots={async (importedSlots) => {
            if (onImportSlots) {
              await onImportSlots(importedSlots);
            } else {
              for (const slot of importedSlots) {
                await onAddSlot(slot);
              }
            }
          }}
          onClose={() => setShowImportExportModal(false)}
        />
      )}

      <BaseModal
        isOpen={showScheduleSettingsModal}
        onClose={() => setShowScheduleSettingsModal(false)}
        title="ตั้งค่าการแสดงและพิมพ์ตารางสอน"
        subtitle="เลือกกรองได้หลายเงื่อนไขพร้อมกัน แล้วแสดงบนหน้าจอหรือพิมพ์เฉพาะตารางที่เลือก"
        icon={<Printer className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-lg"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 space-y-4"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowScheduleSettingsModal(false)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={filterSlotsByScheduleSettings(scheduleFilterDraft).length === 0}
              onClick={() => {
                setActiveScheduleFilters({ ...scheduleFilterDraft });
                setShowScheduleSettingsModal(false);
              }}
              className="rounded-lg border border-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              แสดงตาราง
            </button>
            <button
              type="button"
              disabled={filterSlotsByScheduleSettings(scheduleFilterDraft).length === 0}
              onClick={() => {
                setActiveScheduleFilters({ ...scheduleFilterDraft });
                setShowScheduleSettingsModal(false);
                window.setTimeout(() => window.print(), 0);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              พิมพ์ A4
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold">
            <span>ระดับชั้น</span>
            <select
              value={scheduleFilterDraft.gradeLevel}
              onChange={(event) => setScheduleFilterDraft((previous) => ({
                ...previous,
                gradeLevel: event.target.value,
                classRoom: '',
              }))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-[var(--color-text-title)]"
            >
              <option value="">ทุกระดับชั้น</option>
              {gradeLevels.map((gradeLevel) => (
                <option key={gradeLevel} value={gradeLevel}>
                  {gradeLevel === UNASSIGNED_GRADE_LEVEL ? 'ไม่ระบุระดับชั้น' : gradeLevel}
                </option>
              ))}
            </select>
            <span className="block text-[10px] font-normal text-[var(--color-text-muted)]">
              ห้องที่ไม่มีนักเรียนผูกระดับชั้นจะแสดงเป็น “ไม่ระบุระดับชั้น”
            </span>
          </label>

          <label className="space-y-1 text-xs font-semibold">
            <span>ห้องเรียน</span>
            <select
              value={scheduleFilterDraft.classRoom}
              onChange={(event) => setScheduleFilterDraft((previous) => ({
                ...previous,
                classRoom: event.target.value,
              }))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-[var(--color-text-title)]"
            >
              <option value="">
                {scheduleFilterDraft.gradeLevel ? 'ทุกห้องในระดับชั้น' : 'ทุกห้อง'}
              </option>
              {(scheduleFilterDraft.gradeLevel
                ? uniqueClassRooms.filter((room) => gradeRooms.get(scheduleFilterDraft.gradeLevel)?.has(normalizeTeacherName(room)))
                : uniqueClassRooms
              ).map((room) => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold sm:col-span-2">
            <span>ครูผู้สอน</span>
            <select
              value={scheduleFilterDraft.teacherName}
              onChange={(event) => setScheduleFilterDraft((previous) => ({
                ...previous,
                teacherName: event.target.value,
              }))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-[var(--color-text-title)]"
            >
              <option value="">ครูทุกคน</option>
              {scheduledTeacherNames.map((teacherName) => (
                <option key={normalizeTeacherName(teacherName)} value={teacherName}>{teacherName}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="rounded-lg bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-body)]">
          ตรงตามเงื่อนไข <strong className="text-[var(--color-primary-text)]">{filterSlotsByScheduleSettings(scheduleFilterDraft).length}</strong>
          {' '}จาก {slots.length} คาบ/สัปดาห์
        </p>
      </BaseModal>

      {/* Academic Year & Semester Quick Edit Modal */}
      <BaseModal
        isOpen={Boolean(showPeriodEditor && onUpdateAcademicPeriod)}
        onClose={() => setShowPeriodEditor(false)}
        title="แก้ไขภาคเรียนและปีการศึกษา"
        icon={<Calendar className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-md"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowPeriodEditor(false)}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="timetable-academic-period-form"
              disabled={isSavingAcademicPeriod}
              className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {isSavingAcademicPeriod ? 'กำลังบันทึก...' : 'บันทึกภาคเรียน'}
            </button>
          </>
        }
      >
        {onUpdateAcademicPeriod && (
          <form
            id="timetable-academic-period-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draftAcademicYear.trim() || !draftSemester.trim()) return;
                setIsSavingAcademicPeriod(true);
                try {
                  const normalizedOptions = Array.from(
                    new Set([...draftSemesterOptions.map((o) => o.trim()).filter(Boolean), draftSemester.trim()])
                  );
                  await onUpdateAcademicPeriod(draftAcademicYear.trim(), draftSemester.trim(), normalizedOptions);
                  setShowPeriodEditor(false);
                  setAcademicPeriodNotice(`อัปเดตเป็น ${formatSemesterLabel(draftSemester.trim())} ปีการศึกษา ${draftAcademicYear.trim()} เรียบร้อยแล้ว`);
                } finally {
                  setIsSavingAcademicPeriod(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[var(--color-text-title)] mb-1">ปีการศึกษา (Academic Year)</label>
                <input
                  type="text"
                  required
                  value={draftAcademicYear}
                  onChange={(e) => setDraftAcademicYear(e.target.value)}
                  placeholder="เช่น 2569 (2026)"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--color-text-title)] mb-1">ภาคเรียนที่ใช้งานปัจจุบัน &amp; รายการภาคเรียนของโรงเรียน</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {draftSemesterOptions.map((opt) => (
                    <div
                      key={opt}
                      className={`inline-flex items-center gap-1 rounded-lg border text-xs font-semibold ${
                        draftSemester === opt
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setDraftSemester(opt)}
                        className="px-2.5 py-1 cursor-pointer"
                      >
                        {formatSemesterLabel(opt)}
                      </button>
                      {draftSemesterOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = draftSemesterOptions.filter((item) => item !== opt);
                            setDraftSemesterOptions(remaining);
                            if (draftSemester === opt && remaining[0]) {
                              setDraftSemester(remaining[0]);
                            }
                          }}
                          className="pr-2 py-1 opacity-80 hover:opacity-100 cursor-pointer inline-flex items-center"
                          title="ลบตัวเลือกภาคเรียนนี้"
                          aria-label="ลบตัวเลือกภาคเรียนนี้"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 mb-2">
                  <input
                    type="text"
                    value={newSemesterOptionInput}
                    onChange={(e) => setNewSemesterOptionInput(e.target.value)}
                    placeholder="เพิ่มชื่อภาคเรียนใหม่ เช่น 3 หรือ ภาคฤดูร้อน"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newSemesterOptionInput.trim();
                      if (!val) return;
                      if (!draftSemesterOptions.includes(val)) {
                        setDraftSemesterOptions((prev) => [...prev, val]);
                      }
                      setDraftSemester(val);
                      setNewSemesterOptionInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer"
                  >
                    + เพิ่มเทอม
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={draftSemester}
                  onChange={(e) => setDraftSemester(e.target.value)}
                  placeholder="หรือพิมพ์แก้ชื่อภาคเรียนที่ใช้งานอยู่"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                การเปลี่ยนแปลงนี้จะอัปเดตหัวตารางเรียน ปพ.5/ปพ.6 รายวิชา และตัวเลือกภาคเรียนของโรงเรียน {schoolName} ทันที
              </p>
            </form>
        )}
      </BaseModal>

      <ConfirmActionModal
        isOpen={Boolean(pendingSlotConfirm)}
        title={pendingSlotConfirm?.title || ''}
        description={pendingSlotConfirm?.description || ''}
        confirmLabel={pendingSlotConfirm?.confirmLabel || 'ยืนยัน'}
        tone={pendingSlotConfirm?.tone || 'primary'}
        isBusy={isConfirmingSlotAction}
        onCancel={() => {
          if (!isConfirmingSlotAction) setPendingSlotConfirm(null);
        }}
        onConfirm={async () => {
          if (!pendingSlotConfirm) return;
          setIsConfirmingSlotAction(true);
          try {
            await pendingSlotConfirm.onConfirm();
            setPendingSlotConfirm(null);
          } finally {
            setIsConfirmingSlotAction(false);
          }
        }}
      />
      <TimetablePeriodAttendanceModal
        isOpen={Boolean(periodRosterTarget)}
        onClose={() => setPeriodRosterTarget(null)}
        slot={periodRosterTarget?.slot || null}
        initialDate={periodRosterTarget?.date || todayBangkokDate}
        schoolId={schoolId}
        courses={courses}
        students={students}
        teachers={teachers}
        schoolPeriods={schoolPeriods}
        attendance={attendance}
        periodAttendance={periodAttendance}
        leaveRequests={leaveRequests}
        currentUser={currentUser}
        lang={lang}
        onRecordPeriodAttendance={onRecordPeriodAttendance}
      />
    </>
  );
};
