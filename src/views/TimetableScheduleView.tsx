import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
} from 'lucide-react';
import { DayOfWeek, SchoolPeriodTime, Teacher, TimetableSlot } from '../types';
import { sendEduVerseNotification } from '../lib/pushNotifications';
import { getCourseType, inferCourseLearningArea } from '../lib/courseClassification';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import {
  addCalendarDays,
  formatCalendarDate,
  getBangkokClockSnapshot,
  getBangkokDateInputValue,
  getCalendarWeekStart,
  getTimetableSlotActivityStatus,
} from '../lib/timetableCalendar';
import {
  getHolidayForDate,
  getHolidaysForYear,
  getHolidaysInRange,
  getPublicHolidaySyncStatus,
  getUpcomingHolidays,
  HolidaySyncStatus,
  isWeekendDate,
  syncPublicHolidaysFromApi,
} from '../lib/thaiHolidays';
import {
  DEFAULT_TEACHING_LOAD_MAX_PERIODS,
  DEFAULT_TEACHING_LOAD_MIN_PERIODS,
  formatSemesterLabel,
} from '../lib/schoolSettings';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { getTimetableDuplicateReasons } from '../lib/duplicateRecords';
import { getModuleGroupMeta, getModuleTone } from '../lib/moduleTheme';
import { shouldShowCourseCredits } from '../lib/moeGrading';
import {
  formatSlotTeachersDisplay,
  getSlotTeachers,
  normalizeTeacherName,
  parseSlotTeachersFromRaw,
  slotHasTeacher,
} from '../lib/timetableTeachers';
import { emitAppToast } from '../components/common/ToastProvider';
import {
  buildCourseTeacherOptions,
  courseMatchesTeacherFilter,
  resolveMatchedTeacherForUser,
  resolveTeacherFilterKeyForUser,
  slotMatchesLoggedInTeacher,
  userMatchesCourse,
} from '../lib/courseTeacherFilter';
import {
  CALENDAR_NOTES_UPDATED_EVENT,
  CalendarNoteColor,
  CalendarNoteScope,
} from '../lib/calendarNotes';
import {
  ALL_CLASSROOMS,
  ClassroomCourseSummary,
  DAYS,
  formatShortThaiDate,
  getAcademicPeriodKey,
  MAX_LESSON_PERIODS,
  PendingSlotConfirmState,
  SubstituteCandidate,
  TeacherWorkloadRow,
  TimetableCalendarTab,
  TimetableClassroomGridTab,
  TimetableConflict,
  TimetableConflictCandidate,
  TimetableHoursCriteriaTab,
  TimetableModals,
  TimetablePeriodRollcallTab,
  TimetableScheduleFilters,
  TimetableScheduleViewProps,
  TimetableSubstituteTab,
  TimetableViewMode,
  TimetableWorkloadTab,
  UNASSIGNED_GRADE_LEVEL,
  WorkloadStatusFilter,
} from '../features/timetable';

export type { TimetableScheduleViewProps };

export const TimetableScheduleView: React.FC<TimetableScheduleViewProps> = ({
  slots: allTimetableSlots,
  courses,
  assignments = [],
  teachers,
  students,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onImportSlots,
  schoolPeriods,
  onSaveSchoolPeriods,
  lang,
  currentRole,
  currentUser = null,
  schoolId = 'default-school',
  schoolName,
  academicYear,
  currentSemester,
  semesterOptions = ['1', '2', 'Summer'],
  teachingLoadMinPeriods,
  teachingLoadMaxPeriods,
  roomOptions: savedRoomOptions,
  showPrimaryCourseCredits = false,
  onUpdateRoomOptions,
  onUpdateTeachingLoadThresholds,
  onUpdateAcademicPeriod,
  leaveRequests = [],
  attendance = [],
  periodAttendance = [],
  canSelfCheckin = true,
  onOpenPeriodCheckin,
  onRecordPeriodAttendance,
}) => {
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const roomOptions = savedRoomOptions?.length ? savedRoomOptions : presets.roomOptions;
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const canManageTimetable = isAdmin;
  const isPersonalViewer = currentRole === 'student' || currentRole === 'parent';
  const canUsePeriodCheckin =
    Boolean(onOpenPeriodCheckin) &&
    (currentRole === 'student' || currentRole === 'teacher') &&
    canSelfCheckin;
  const workloadMinPeriods = Math.min(
    60,
    Math.max(
      0,
      Number.isInteger(teachingLoadMinPeriods)
        ? teachingLoadMinPeriods ?? DEFAULT_TEACHING_LOAD_MIN_PERIODS
        : DEFAULT_TEACHING_LOAD_MIN_PERIODS
    )
  );
  const workloadMaxPeriods = Math.min(
    60,
    Math.max(
      workloadMinPeriods,
      Number.isInteger(teachingLoadMaxPeriods)
        ? teachingLoadMaxPeriods ?? DEFAULT_TEACHING_LOAD_MAX_PERIODS
        : DEFAULT_TEACHING_LOAD_MAX_PERIODS
    )
  );
  const activeAcademicPeriodKey = getAcademicPeriodKey(academicYear, currentSemester);
  const [selectedAcademicPeriodKey, setSelectedAcademicPeriodKey] = useState(activeAcademicPeriodKey);
  useEffect(() => {
    setSelectedAcademicPeriodKey(activeAcademicPeriodKey);
  }, [schoolId, activeAcademicPeriodKey]);

  const academicPeriodOptionsByKey = new Map([
    [activeAcademicPeriodKey, { academicYear, semester: currentSemester }],
  ]);
  allTimetableSlots.forEach((slot) => {
    const slotAcademicYear = slot.academicYear || academicYear;
    const slotSemester = slot.semester || currentSemester;
    academicPeriodOptionsByKey.set(
      getAcademicPeriodKey(slotAcademicYear, slotSemester),
      { academicYear: slotAcademicYear, semester: slotSemester }
    );
  });
  const academicPeriodOptions = [...academicPeriodOptionsByKey.entries()]
    .sort(([keyA, periodA], [keyB, periodB]) => {
      if (keyA === activeAcademicPeriodKey) return -1;
      if (keyB === activeAcademicPeriodKey) return 1;
      const yearA = Number(periodA.academicYear.match(/\d{4}/)?.[0] || 0);
      const yearB = Number(periodB.academicYear.match(/\d{4}/)?.[0] || 0);
      return yearB - yearA || periodB.semester.localeCompare(periodA.semester, 'th', { numeric: true });
    })
    .map(([key, period]) => ({ key, ...period }));
  const selectedAcademicPeriod = academicPeriodOptions.find((period) => period.key === selectedAcademicPeriodKey)
    || { key: activeAcademicPeriodKey, academicYear, semester: currentSemester };
  const viewAcademicYear = selectedAcademicPeriod.academicYear;
  const viewSemester = selectedAcademicPeriod.semester;
  const isViewingCurrentTerm = selectedAcademicPeriod.key === activeAcademicPeriodKey;
  const canEditTimetableSlots = isViewingCurrentTerm && canManageTimetable && Boolean(onUpdateSlot);
  const slots = allTimetableSlots.filter((slot) => (
    (slot.academicYear || academicYear) === viewAcademicYear &&
    (slot.semester || currentSemester) === viewSemester
  ));

  // Main view mode: classroom schedule, period roll-call, calendar, attendance-hours criteria, staff workload summary, or substitute finder.
  const [viewMode, setViewMode] = useState<TimetableViewMode>('classroom');
  const [rollcallDate, setRollcallDate] = useState<string>(() => getBangkokDateInputValue());
  const [rollcallSlotId, setRollcallSlotId] = useState<string>('');
  const [workloadSearchTerm, setWorkloadSearchTerm] = useState('');
  const [workloadStatusFilter, setWorkloadStatusFilter] = useState<WorkloadStatusFilter>('all');
  const [workloadMinDraft, setWorkloadMinDraft] = useState(String(workloadMinPeriods));
  const [workloadMaxDraft, setWorkloadMaxDraft] = useState(String(workloadMaxPeriods));
  const [workloadSettingsError, setWorkloadSettingsError] = useState<string | null>(null);
  const [isSavingWorkloadSettings, setIsSavingWorkloadSettings] = useState(false);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => (
    getCalendarWeekStart(getBangkokDateInputValue())
  ));
  const [calendarLayoutMode, setCalendarLayoutMode] = useState<'week' | 'month'>('month');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => getBangkokDateInputValue());
  const [calendarMonthCursor, setCalendarMonthCursor] = useState<{ year: number; month: number }>(() => {
    const today = getBangkokDateInputValue();
    return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 };
  });
  const [bangkokClock, setBangkokClock] = useState(() => getBangkokClockSnapshot());
  const currentBangkokYear = Number(bangkokClock.dateStr.slice(0, 4));
  const [holidayRefreshTick, setHolidayRefreshTick] = useState(0);
  const [holidaySyncStatus, setHolidaySyncStatus] = useState<HolidaySyncStatus | null>(() =>
    getPublicHolidaySyncStatus(currentBangkokYear)
  );
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);
  const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState(() => getBangkokDateInputValue());
  const [newHolidayNameTh, setNewHolidayNameTh] = useState('');
  const [calendarNotesTick, setCalendarNotesTick] = useState(0);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitleDraft, setNoteTitleDraft] = useState('');
  const [noteContentDraft, setNoteContentDraft] = useState('');
  const [noteScopeDraft, setNoteScopeDraft] = useState<CalendarNoteScope>('personal');
  const [noteColorDraft, setNoteColorDraft] = useState<CalendarNoteColor>('amber');
  const [subDate, setSubDate] = useState<string>(() => getBangkokDateInputValue());
  const [subSelectedTeacher, setSubSelectedTeacher] = useState<string>('');
  const [sentSubRequests, setSentSubRequests] = useState<Record<string, boolean>>({});
  const [assigningSubSlotKey, setAssigningSubSlotKey] = useState<string | null>(null);
  const [subNotice, setSubNotice] = useState<string | null>(null);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);

  useEffect(() => {
    const onNotesUpdated = () => setCalendarNotesTick((v) => v + 1);
    window.addEventListener(CALENDAR_NOTES_UPDATED_EVENT, onNotesUpdated);
    return () => window.removeEventListener(CALENDAR_NOTES_UPDATED_EVENT, onNotesUpdated);
  }, []);

  // Live 30-second Bangkok clock tick so active-period Check-in/Check-out buttons appear/disappear on schedule
  useEffect(() => {
    const timer = window.setInterval(() => {
      setBangkokClock(getBangkokClockSnapshot());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Automatically sync Thai government holidays for current year (and upcoming year near year-end) & calendar cursor year
  useEffect(() => {
    let cancelled = false;
    const yearsToSync = Array.from(
      new Set([
        calendarMonthCursor.year,
        currentBangkokYear,
        ...(Number(bangkokClock.dateStr.slice(5, 7)) >= 10 ? [currentBangkokYear + 1] : []),
      ])
    );
    void Promise.all(yearsToSync.map((yr) => syncPublicHolidaysFromApi(yr))).then((results) => {
      if (cancelled) return;
      const primary =
        results.find((r) => r.year === calendarMonthCursor.year) ||
        results.find((r) => r.year === currentBangkokYear) ||
        results[0];
      if (primary) setHolidaySyncStatus(primary);
      setHolidayRefreshTick((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [calendarMonthCursor.year, currentBangkokYear, bangkokClock.dateStr]);

  useEffect(() => {
    const onHolidaysUpdated = () => {
      setHolidaySyncStatus(getPublicHolidaySyncStatus(calendarMonthCursor.year) || getPublicHolidaySyncStatus(currentBangkokYear));
      setHolidayRefreshTick((v) => v + 1);
    };
    window.addEventListener('eduverse:holidays-updated', onHolidaysUpdated);
    return () => window.removeEventListener('eduverse:holidays-updated', onHolidaysUpdated);
  }, [calendarMonthCursor.year, currentBangkokYear]);

  const handleManualHolidaySync = async (targetYear = currentBangkokYear) => {
    setIsSyncingHolidays(true);
    try {
      const result = await syncPublicHolidaysFromApi(targetYear, { force: true });
      if (targetYear !== currentBangkokYear + 1 && Number(bangkokClock.dateStr.slice(5, 7)) >= 10) {
        await syncPublicHolidaysFromApi(currentBangkokYear + 1, { force: true });
      }
      setHolidaySyncStatus(result);
      setHolidayRefreshTick((v) => v + 1);
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  // Ensure restricted viewers stay out of teacher/staff-only tabs
  useEffect(() => {
    if (isPersonalViewer && (viewMode === 'workload' || viewMode === 'substitute' || viewMode === 'period_rollcall')) {
      setViewMode('classroom');
    }
  }, [isPersonalViewer, viewMode]);

  // Classroom selection (strictly scoped for student/parent)
  const uniqueClassRooms = isPersonalViewer
    ? Array.from(new Set(slots.map((s) => s.classRoom).filter(Boolean)))
    : Array.from(
        new Set([
          ...slots.map((s) => s.classRoom).filter(Boolean),
          ...students.map((st) => st.room).filter(Boolean),
          ...roomOptions,
        ])
      );
  const gradeRooms = new Map<string, Set<string>>();
  students.forEach((student) => {
    const gradeLevel = student.gradeLevel.trim();
    const classRoom = normalizeTeacherName(student.room);
    if (!gradeLevel || !classRoom) return;
    const rooms = gradeRooms.get(gradeLevel) || new Set<string>();
    rooms.add(classRoom);
    gradeRooms.set(gradeLevel, rooms);
  });
  const mappedClassRooms = new Set([...gradeRooms.values()].flatMap((rooms) => [...rooms]));
  const unassignedClassRooms = new Set(
    slots
      .map((slot) => normalizeTeacherName(slot.classRoom))
      .filter((classRoom) => classRoom && !mappedClassRooms.has(classRoom))
  );
  if (unassignedClassRooms.size > 0) {
    gradeRooms.set(UNASSIGNED_GRADE_LEVEL, unassignedClassRooms);
  }
  const gradeLevels = Array.from(gradeRooms.keys()).sort((a, b) => a.localeCompare(b, 'th'));
  const scheduledTeacherNames = Array.from(new Map(
    slots
      .flatMap((slot) => getSlotTeachers(slot))
      .map((name) => [normalizeTeacherName(name), name] as const)
  ).values()).sort((a, b) => a.localeCompare(b, 'th'));
  const [selectedClassRoom, setSelectedClassRoom] = useState<string>(uniqueClassRooms[0] || '');
  const [myCoursesOnly, setMyCoursesOnly] = useState(false);
  const autoScopedTimetableRef = useRef<string | null>(null);
  const handleViewModeChange = (mode: TimetableViewMode) => {
    if (mode === 'hours_criteria' && selectedClassRoom === ALL_CLASSROOMS && !myCoursesOnly) {
      setSelectedClassRoom(uniqueClassRooms[0] || '');
    }
    setViewMode(mode);
  };
  const [newCustomRoomName, setNewCustomRoomName] = useState('');
  const [showAddRoomInput, setShowAddRoomInput] = useState(false);
  const [roomOptionsError, setRoomOptionsError] = useState<string | null>(null);
  const [isSavingRoomOption, setIsSavingRoomOption] = useState(false);

  // Teacher names are used as suggestions when assigning a teacher or co-teacher to a slot.
  const teacherNames = Array.from(new Map([
      ...teachers.map((t) => t.fullNameTh),
      ...slots.flatMap((s) => getSlotTeachers(s)),
      ...courses.map((c) => c.teacherName).filter(Boolean),
    ]
    .map((name) => [normalizeTeacherName(name), name.normalize('NFC').trim().replace(/\s+/g, ' ')] as const)
    .filter(([key, name]) => key && name))
    .values())
    .sort((a, b) => a.localeCompare(b, 'th'));

  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleSettingsModal, setShowScheduleSettingsModal] = useState(false);
  const [pendingSlotConfirm, setPendingSlotConfirm] = useState<PendingSlotConfirmState | null>(null);
  const [isConfirmingSlotAction, setIsConfirmingSlotAction] = useState(false);
  const [scheduleFilterDraft, setScheduleFilterDraft] = useState<TimetableScheduleFilters>({
    gradeLevel: '',
    classRoom: '',
    teacherName: '',
  });
  const [activeScheduleFilters, setActiveScheduleFilters] = useState<TimetableScheduleFilters | null>(null);
  const handleAcademicPeriodChange = (periodKey: string) => {
    const period = academicPeriodOptions.find((option) => option.key === periodKey);
    if (!period) return;

    setSelectedAcademicPeriodKey(period.key);
    setActiveScheduleFilters(null);
    setShowAddRoomInput(false);
    if (myCoursesOnly) {
      setSelectedClassRoom(ALL_CLASSROOMS);
      return;
    }
    const periodSlots = allTimetableSlots.filter((slot) => (
      (slot.academicYear || academicYear) === period.academicYear &&
      (slot.semester || currentSemester) === period.semester
    ));
    const nextRooms = Array.from(new Set([
      ...periodSlots.map((slot) => slot.classRoom).filter(Boolean),
      ...students.map((student) => student.room).filter(Boolean),
      ...roomOptions,
    ]));
    setSelectedClassRoom(nextRooms[0] || ALL_CLASSROOMS);
  };
  const [showPeriodSettings, setShowPeriodSettings] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<SchoolPeriodTime[]>(schoolPeriods);
  const [periodSettingsError, setPeriodSettingsError] = useState<string | null>(null);
  const [isSavingPeriods, setIsSavingPeriods] = useState(false);
  const [slotActionError, setSlotActionError] = useState<string | null>(null);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<TimetableSlot | null>(null);
  const [selectedConflictSlotId, setSelectedConflictSlotId] = useState<string | null>(null);
  const [periodRosterTarget, setPeriodRosterTarget] = useState<{
    slot: TimetableSlot;
    date: string;
  } | null>(null);
  const canOpenPeriodRoster = !isPersonalViewer;
  const [isEditingSelectedSlot, setIsEditingSelectedSlot] = useState(false);
  const [editSlotDraft, setEditSlotDraft] = useState<TimetableSlot | null>(null);
  const openSlotDetails = (slot: TimetableSlot) => {
    setSelectedSlotForDetail(slot);
    setIsEditingSelectedSlot(false);
    setEditSlotDraft(null);
    setSlotActionError(null);
  };
  const closeSlotDetails = () => {
    setSelectedSlotForDetail(null);
    setIsEditingSelectedSlot(false);
    setEditSlotDraft(null);
    setSlotActionError(null);
  };
  const openConflictSlot = (slot: TimetableSlot) => {
    setViewMode('classroom');
    setActiveScheduleFilters(null);
    setSelectedClassRoom(slot.classRoom || ALL_CLASSROOMS);
    openSlotDetails(slot);
    if (canEditTimetableSlots) {
      setEditSlotDraft({ ...slot });
      setIsEditingSelectedSlot(true);
    }
  };
  const [showPeriodEditor, setShowPeriodEditor] = useState(false);
  const [draftAcademicYear, setDraftAcademicYear] = useState(academicYear);
  const [draftSemester, setDraftSemester] = useState(currentSemester);
  const [draftSemesterOptions, setDraftSemesterOptions] = useState<string[]>(semesterOptions);
  const [newSemesterOptionInput, setNewSemesterOptionInput] = useState('');
  const [isSavingAcademicPeriod, setIsSavingAcademicPeriod] = useState(false);
  const [academicPeriodNotice, setAcademicPeriodNotice] = useState<string | null>(null);

  // Add slot form state
  const [newDay, setNewDay] = useState<DayOfWeek>('mon');
  const [newPeriod, setNewPeriod] = useState<number>(1);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('custom');
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const [catalogTeacherFilter, setCatalogTeacherFilter] = useState<string>('all');
  const [hoursTeacherFilter, setHoursTeacherFilter] = useState<string>('all');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newTitleTh, setNewTitleTh] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTeacher, setNewTeacher] = useState(teacherNames[0] || '');
  const [newCoTeacher, setNewCoTeacher] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newCredits, setNewCredits] = useState<number>(1.5);
  const [newColor, setNewColor] = useState<TimetableSlot['colorTag']>('sky');

  const getPeriodTime = (periodNumber: number) => schoolPeriods.find((period) => period.periodNumber === periodNumber);
  const parseTimeMinutes = (time: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };
  const getSlotTimeRange = (slot: Pick<TimetableConflictCandidate, 'periodNumber' | 'startTime' | 'endTime'>) => {
    const period = getPeriodTime(slot.periodNumber);
    const start = parseTimeMinutes(slot.startTime) ?? parseTimeMinutes(period?.startTime || '');
    const end = parseTimeMinutes(slot.endTime) ?? parseTimeMinutes(period?.endTime || '');
    return start === null || end === null || end <= start ? null : { start, end };
  };
  const getTimetableConflictDetails = (
    slotA: TimetableConflictCandidate,
    slotB: TimetableConflictCandidate
  ): Omit<TimetableConflict, 'key' | 'slotA' | 'slotB'> | null => {
    if (slotA.dayOfWeek !== slotB.dayOfWeek) return null;
    const rangeA = getSlotTimeRange(slotA);
    const rangeB = getSlotTimeRange(slotB);
    const overlaps = rangeA && rangeB
      ? rangeA.start < rangeB.end && rangeB.start < rangeA.end
      : slotA.periodNumber === slotB.periodNumber;
    if (!overlaps) return null;

    const reasons: string[] = [];
    const teachersA = getSlotTeachers(slotA);
    const teacherKeysB = new Set(getSlotTeachers(slotB).map(normalizeTeacherName));
    const overlappingTeachers = teachersA.filter((name) => teacherKeysB.has(normalizeTeacherName(name)));
    if (overlappingTeachers.length > 0) {
      reasons.push(`ครูผู้สอน ${overlappingTeachers.join(', ')}`);
    }
    const roomKey = normalizeTeacherName(slotA.room);
    if (roomKey && roomKey === normalizeTeacherName(slotB.room)) {
      reasons.push(`ห้องสถานที่ ${slotA.room}`);
    }
    const classRoomKey = normalizeTeacherName(slotA.classRoom);
    if (classRoomKey && classRoomKey === normalizeTeacherName(slotB.classRoom)) {
      reasons.push(`ห้องเรียน ${slotA.classRoom}`);
    }
    if (reasons.length === 0) return null;
    return {
      reasons,
      overlapStart: rangeA && rangeB ? Math.max(rangeA.start, rangeB.start) : null,
      overlapEnd: rangeA && rangeB ? Math.min(rangeA.end, rangeB.end) : null,
    };
  };

  const handleSaveEditedSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editSlotDraft || !selectedSlotForDetail) return;
    if (!onUpdateSlot) {
      setSlotActionError('ไม่พบช่องทางบันทึกการแก้ไขคาบเรียน กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }

    const parsedTeachers = parseSlotTeachersFromRaw(editSlotDraft.teacherName, editSlotDraft.coTeacherName);
    if (
      editSlotDraft.coTeacherName?.trim() &&
      normalizeTeacherName(editSlotDraft.coTeacherName) === normalizeTeacherName(editSlotDraft.teacherName)
    ) {
      setSlotActionError('ครูสอนคู่ต้องไม่ใช่บุคคลเดียวกับครูผู้สอนหลัก');
      return;
    }

    const updatedSlot: TimetableSlot = {
      ...editSlotDraft,
      classRoom: editSlotDraft.classRoom.trim(),
      teacherName: parsedTeachers.teacherName,
      coTeacherName: parsedTeachers.coTeacherName,
      room: editSlotDraft.room.trim(),
    };
    if (!updatedSlot.classRoom) {
      setSlotActionError('กรุณาระบุห้องเรียนก่อนบันทึก');
      return;
    }

    const otherSlots = slots.filter((slot) => slot.id !== updatedSlot.id);
    const duplicateReasons = getTimetableDuplicateReasons({
      academicYear: updatedSlot.academicYear || viewAcademicYear,
      semester: updatedSlot.semester || viewSemester,
      classRoom: updatedSlot.classRoom,
      dayOfWeek: updatedSlot.dayOfWeek,
      periodNumber: updatedSlot.periodNumber,
      teacherName: updatedSlot.teacherName,
      coTeacherName: updatedSlot.coTeacherName,
      room: updatedSlot.room,
    }, otherSlots);
    const overlappingReasons = otherSlots.flatMap((slot) => {
      const conflict = getTimetableConflictDetails(updatedSlot, slot);
      return conflict
        ? [`${slot.courseCode} (${conflict.reasons.join(', ')})`]
        : [];
    });
    const executeUpdateSlot = async () => {
      setIsSavingSlot(true);
      setSlotActionError(null);
      try {
        await onUpdateSlot(updatedSlot);
        setSelectedSlotForDetail(updatedSlot);
        setEditSlotDraft(null);
        setIsEditingSelectedSlot(false);
      } catch (error) {
        setSlotActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsSavingSlot(false);
      }
    };

    const warnings = [...new Set([...duplicateReasons, ...overlappingReasons])];
    if (warnings.length > 0) {
      setPendingSlotConfirm({
        title: 'พบตารางสอนซ้อนทับกัน',
        description: `${warnings.join(' และ ')} — คาบที่แก้ไขยังชนกับรายการข้างต้น ต้องการบันทึกต่อหรือไม่?`,
        confirmLabel: 'ยืนยันบันทึกทับ',
        tone: 'primary',
        onConfirm: executeUpdateSlot,
      });
      return;
    }

    await executeUpdateSlot();
  };

  const orderedSchoolPeriods = [...schoolPeriods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const lessonPeriods = orderedSchoolPeriods.filter((period) => !period.isBreak);
  const courseCatalogTeacherOptions = buildCourseTeacherOptions(courses, teachers);
  const matchedTeacher = resolveMatchedTeacherForUser(currentUser, teachers);
  const loggedInCourseTeacherKey = resolveTeacherFilterKeyForUser(
    currentUser,
    teachers,
    courseCatalogTeacherOptions
  );
  const hasTeacherTimetableMatch = Boolean(
    loggedInCourseTeacherKey ||
      (currentUser &&
        allTimetableSlots.some((slot) =>
          slotMatchesLoggedInTeacher(slot, currentUser, matchedTeacher, courses)
        ))
  );
  const hasLoadedTimetableContext =
    courses.length > 0 || allTimetableSlots.length > 0 || teachers.length > 0;

  useEffect(() => {
    const sessionScopeKey = `${schoolId}::${currentUser?.id || ''}::${currentRole}`;
    if (currentRole === 'teacher' && !hasLoadedTimetableContext) return;
    if (autoScopedTimetableRef.current === sessionScopeKey) return;
    autoScopedTimetableRef.current = sessionScopeKey;

    if (currentRole === 'teacher' && hasTeacherTimetableMatch) {
      setMyCoursesOnly(true);
      setSelectedClassRoom(ALL_CLASSROOMS);
      setActiveScheduleFilters(null);
      setCatalogTeacherFilter('all');
      setHoursTeacherFilter('all');
    } else {
      setMyCoursesOnly(false);
      setCatalogTeacherFilter('all');
      setHoursTeacherFilter('all');
    }
  }, [
    schoolId,
    currentUser?.id,
    currentRole,
    hasLoadedTimetableContext,
    hasTeacherTimetableMatch,
    loggedInCourseTeacherKey,
  ]);

  const filteredCourseCatalog = courses.filter((course) => {
    if (
      currentRole === 'teacher' &&
      myCoursesOnly &&
      !userMatchesCourse(currentUser, matchedTeacher, course)
    ) {
      return false;
    }
    if (!courseMatchesTeacherFilter(course, catalogTeacherFilter, courseCatalogTeacherOptions)) {
      return false;
    }
    const search = normalizeTeacherName(courseSearchInput);
    return !search || [
      course.code,
      course.titleTh,
      course.titleEn,
      course.teacherName,
      course.department,
    ].some((value) => value && normalizeTeacherName(value).includes(search));
  });
  const selectedCatalogCourse = courses.find((course) => course.id === selectedCourseId);

  const filterSlotsByScheduleSettings = (filters: TimetableScheduleFilters) => slots.filter((slot) => {
    if (filters.gradeLevel) {
      const roomsInGrade = gradeRooms.get(filters.gradeLevel);
      if (!roomsInGrade?.has(normalizeTeacherName(slot.classRoom))) return false;
    }
    if (filters.classRoom && slot.classRoom !== filters.classRoom) return false;
    if (filters.teacherName && !slotHasTeacher(slot, filters.teacherName)) {
      return false;
    }
    return true;
  });
  const baseActiveSlots = activeScheduleFilters
    ? filterSlotsByScheduleSettings(activeScheduleFilters)
    : selectedClassRoom === ALL_CLASSROOMS
      ? slots
      : slots.filter((s) => s.classRoom === selectedClassRoom);
  const activeSlots = myCoursesOnly
    ? baseActiveSlots.filter((slot) =>
        slotMatchesLoggedInTeacher(slot, currentUser, matchedTeacher, courses)
      )
    : baseActiveSlots;
  const calendarWeekDays = DAYS.map((day, index) => ({
    ...day,
    date: addCalendarDays(calendarWeekStart, index),
  }));
  const calendarWeekRangeLabel = `${formatCalendarDate(calendarWeekStart)} – ${formatCalendarDate(addCalendarDays(calendarWeekStart, 4))}`;

  const todayBangkokDate = bangkokClock.dateStr;
  const todayDayKey = bangkokClock.dayKey;
  const currentWeekStartDate = getCalendarWeekStart(todayBangkokDate);
  const currentWeekDaysWithDates = DAYS.map((day, index) => {
    const date = addCalendarDays(currentWeekStartDate, index);
    return {
      ...day,
      date,
      holiday: holidayRefreshTick >= 0 ? getHolidayForDate(date, schoolId) : null,
    };
  });
  const currentWeekHolidays =
    holidayRefreshTick >= 0
      ? getHolidaysInRange(currentWeekStartDate, addCalendarDays(currentWeekStartDate, 6), schoolId)
      : [];
  const todayHoliday = holidayRefreshTick >= 0 ? getHolidayForDate(todayBangkokDate, schoolId) : null;
  const upcomingHolidaysList = holidayRefreshTick >= 0 ? getUpcomingHolidays(todayBangkokDate, 45, schoolId) : [];
  const yearHolidaysCount =
    holidayRefreshTick >= 0 ? getHolidaysForYear(currentBangkokYear, schoolId).length : 0;

  const getSlotCheckStatusForDate = (slot: TimetableSlot, dateStr: string) => {
    const resolvedCourseId =
      slot.courseId || courses.find((c) => c.code === slot.courseCode)?.id || slot.courseCode;
    const matching = periodAttendance.filter(
      (rec) =>
        rec.date === dateStr &&
        rec.periodNumber === slot.periodNumber &&
        (rec.courseId === resolvedCourseId || rec.courseCode === slot.courseCode)
    );
    return {
      resolvedCourseId,
      hasCheckIn: matching.some((r) => (r.recordType || 'check_in') === 'check_in'),
      hasCheckOut: matching.some((r) => r.recordType === 'check_out'),
    };
  };

  const triggerSlotCheckin = (
    slot: TimetableSlot,
    dateStr: string,
    checkType: 'check_in' | 'check_out'
  ) => {
    if (!canUsePeriodCheckin || !onOpenPeriodCheckin) return;
    const resolvedCourseId =
      slot.courseId || courses.find((c) => c.code === slot.courseCode)?.id;
    onOpenPeriodCheckin({
      courseId: resolvedCourseId,
      courseCode: slot.courseCode,
      periodNumber: slot.periodNumber,
      date: dateStr,
      checkType,
    });
  };

  const lastPeriodMissionToastKeyRef = useRef<string>('');
  useEffect(() => {
    if (
      viewMode !== 'classroom' ||
      !canUsePeriodCheckin ||
      todayHoliday ||
      isWeekendDate(todayBangkokDate) ||
      (currentRole !== 'student' && currentRole !== 'teacher')
    ) {
      return;
    }

    const myTodayPeriodSlots = slots
      .filter((s) => s.dayOfWeek === todayDayKey)
      .filter((s) =>
        currentRole === 'teacher'
          ? slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, courses)
          : true
      )
      .slice()
      .sort((a, b) => a.periodNumber - b.periodNumber);

    if (myTodayPeriodSlots.length === 0) return;

    const enriched = myTodayPeriodSlots.map((slot) => {
      const activity = getTimetableSlotActivityStatus({
        slot,
        schoolPeriods,
        now: bangkokClock,
        schoolId,
        targetDateStr: todayBangkokDate,
      });
      const checkStatus = getSlotCheckStatusForDate(slot, todayBangkokDate);
      const completed = checkStatus.hasCheckIn && checkStatus.hasCheckOut;
      const partialCheckedIn = checkStatus.hasCheckIn && !checkStatus.hasCheckOut;
      const nextCheckType: 'check_in' | 'check_out' = partialCheckedIn ? 'check_out' : 'check_in';
      return { slot, activity, checkStatus, completed, partialCheckedIn, nextCheckType };
    });

    const completedCount = enriched.filter((m) => m.checkStatus.hasCheckIn).length;
    const fullDoneCount = enriched.filter((m) => m.completed).length;
    const totalCount = enriched.length;

    const featured =
      enriched.find((m) => m.activity.isActive && !m.completed) ||
      enriched.find((m) => m.partialCheckedIn) ||
      enriched.find((m) => m.activity.missionPhase === 'upcoming' && !m.checkStatus.hasCheckIn);

    if (!featured) return;

    const alertKey = `${schoolId}:${currentUser?.id || currentRole}:${todayBangkokDate}:${featured.slot.id}:${featured.nextCheckType}:${featured.activity.isActive ? 'active' : featured.activity.missionPhase}`;
    if (lastPeriodMissionToastKeyRef.current === alertKey) return;
    lastPeriodMissionToastKeyRef.current = alertKey;

    const timeRange = `${featured.activity.startTime || '--:--'}–${featured.activity.endTime || '--:--'}`;
    const phaseNote = featured.activity.isActive
      ? `ถึงเวลาคาบเรียน${featured.activity.remainingMinutes !== null ? ` (เหลือ ${featured.activity.remainingMinutes} น.)` : ''}`
      : featured.partialCheckedIn
        ? 'เช็คอินแล้ว · รอเช็คเอาท์'
        : featured.activity.minutesUntilStart !== null
          ? `อีก ${featured.activity.minutesUntilStart} น. ถึงเวลาเรียน`
          : 'รอถึงเวลาเรียน';

    emitAppToast({
      id: 'timetable-period-mission-alert',
      tone: featured.activity.isActive || featured.partialCheckedIn ? 'warning' : 'info',
      title:
        lang === 'th'
          ? `เตือนเช็คชื่อเข้า-ออกตามเวลา (${completedCount}/${totalCount} เข้า · ${fullDoneCount}/${totalCount} ครบ)`
          : `Period Check-in Reminder (${completedCount}/${totalCount})`,
      message: `คาบ ${featured.slot.periodNumber} (${timeRange}) · ${featured.slot.courseCode} ${featured.slot.courseTitleTh || featured.slot.courseTitleEn} — ${phaseNote}`,
      actionLabel:
        featured.nextCheckType === 'check_out'
          ? 'เช็คเอาท์คาบนี้'
          : featured.activity.isActive
            ? 'เช็คอินตอนนี้'
            : 'เช็คอินคาบนี้',
      durationMs: 7000,
      onAction: () => triggerSlotCheckin(featured.slot, todayBangkokDate, featured.nextCheckType),
    });
  }, [
    viewMode,
    canUsePeriodCheckin,
    todayHoliday,
    todayBangkokDate,
    todayDayKey,
    currentRole,
    currentUser,
    matchedTeacher,
    courses,
    slots,
    schoolPeriods,
    bangkokClock,
    schoolId,
    periodAttendance,
    lang,
  ]);

  const lastHolidayToastKeyRef = useRef<string>('');
  useEffect(() => {
    if (viewMode !== 'classroom' || isPersonalViewer) return;

    const focusHoliday =
      todayHoliday ||
      currentWeekHolidays[0] ||
      upcomingHolidaysList[0];

    const holidaySummaryKey = `${schoolId}:${todayBangkokDate}:${todayHoliday?.id || ''}:${currentWeekHolidays.map((h) => h.id).join(',')}:${upcomingHolidaysList.slice(0, 2).map((h) => h.id).join(',')}`;
    if (lastHolidayToastKeyRef.current === holidaySummaryKey) return;
    lastHolidayToastKeyRef.current = holidaySummaryKey;

    if (!focusHoliday && yearHolidaysCount === 0) return;

    const title = todayHoliday
      ? `วันหยุดราชการไทย (${currentBangkokYear + 543}) — วันนี้หยุด`
      : currentWeekHolidays.length > 0
        ? `วันหยุดราชการไทยสัปดาห์นี้ (${currentBangkokYear + 543})`
        : `วันหยุดราชการไทย (${currentBangkokYear + 543})`;

    const message = todayHoliday
      ? `${todayHoliday.nameTh} (งดการเรียนการสอน)`
      : currentWeekHolidays.length > 0
        ? currentWeekHolidays
            .map((h) => `${formatShortThaiDate(h.date)} · ${h.nameTh}`)
            .join(' | ')
        : upcomingHolidaysList.length > 0
          ? `ถัดไป: ${upcomingHolidaysList
              .slice(0, 2)
              .map((h) => `${formatShortThaiDate(h.date)} · ${h.nameTh}`)
              .join(' | ')}`
          : `ปฏิทินวันหยุดไทย (${yearHolidaysCount} วันในระบบ)`;

    emitAppToast({
      id: 'timetable-thai-holiday-popup',
      tone: todayHoliday ? 'warning' : 'info',
      title,
      message,
      durationMs: 6500,
      actionLabel: 'เปิดปฏิทินวันหยุด',
      onAction: () => {
        if (focusHoliday) {
          setSelectedCalendarDate(focusHoliday.date);
          setCalendarMonthCursor({
            year: Number(focusHoliday.date.slice(0, 4)),
            month: Number(focusHoliday.date.slice(5, 7)) - 1,
          });
        }
        setCalendarLayoutMode('month');
        setViewMode('calendar');
      },
    });
  }, [
    viewMode,
    isPersonalViewer,
    schoolId,
    todayBangkokDate,
    currentBangkokYear,
    todayHoliday,
    currentWeekHolidays,
    upcomingHolidaysList,
    yearHolidaysCount,
  ]);

  const isAllClassroomsView = viewMode === 'classroom' && (
    activeScheduleFilters
      ? !activeScheduleFilters.classRoom
      : selectedClassRoom === ALL_CLASSROOMS
  );
  const openScheduleSettings = () => {
    setScheduleFilterDraft(activeScheduleFilters ? { ...activeScheduleFilters } : {
      gradeLevel: '',
      classRoom: '',
      teacherName: '',
    });
    setShowScheduleSettingsModal(true);
  };
  const openGoogleCalendarModal = () => {
    setShowGoogleCalendarModal(true);
  };
  const handleSaveTeachingLoadThresholds = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formDetails = event.currentTarget.closest('details');
    const minPeriods = Number(workloadMinDraft);
    const maxPeriods = Number(workloadMaxDraft);
    if (!Number.isInteger(minPeriods) || !Number.isInteger(maxPeriods)
      || minPeriods < 0 || maxPeriods < minPeriods || maxPeriods > 60) {
      setWorkloadSettingsError('กรุณากำหนดจำนวนคาบเป็นจำนวนเต็ม 0–60 และให้ค่าสูงสุดไม่น้อยกว่าค่าต่ำสุด');
      return;
    }
    if (!onUpdateTeachingLoadThresholds) {
      setWorkloadSettingsError('ไม่พบช่องทางบันทึกการตั้งค่า กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ');
      return;
    }

    setIsSavingWorkloadSettings(true);
    setWorkloadSettingsError(null);
    try {
      await onUpdateTeachingLoadThresholds(minPeriods, maxPeriods);
      formDetails?.removeAttribute('open');
    } catch (error) {
      setWorkloadSettingsError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingWorkloadSettings(false);
    }
  };

  const conflicts: TimetableConflict[] = [];
  slots.forEach((slotA, index) => {
    slots.slice(index + 1).forEach((slotB) => {
      const conflictDetails = getTimetableConflictDetails(slotA, slotB);
      if (!conflictDetails) return;

      conflicts.push({
        key: [slotA.id, slotB.id].sort().join(':'),
        slotA,
        slotB,
        ...conflictDetails,
      });
    });
  });
  const conflictingSlotIds = new Set(conflicts.flatMap((conflict) => [conflict.slotA.id, conflict.slotB.id]));
  const selectedSlotConflicts = selectedConflictSlotId
    ? conflicts.filter((conflict) =>
        conflict.slotA.id === selectedConflictSlotId || conflict.slotB.id === selectedConflictSlotId
      )
    : [];
  const editSlotConflicts = editSlotDraft
    ? slots.flatMap((slot) => {
      if (slot.id === editSlotDraft.id) return [];
      const details = getTimetableConflictDetails(editSlotDraft, slot);
      return details ? [{ slot, details }] : [];
    })
    : [];
  const editSlotPeriodOptions = editSlotDraft
    ? Array.from(new Set([...lessonPeriods.map((period) => period.periodNumber), editSlotDraft.periodNumber])).sort((a, b) => a - b)
    : [];
  const editSlotClassRoomOptions = editSlotDraft
    ? Array.from(new Set([...uniqueClassRooms, editSlotDraft.classRoom])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'))
    : [];
  const editSlotTeacherOptions = editSlotDraft
    ? Array.from(new Set([...teacherNames, ...getSlotTeachers(editSlotDraft)])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'))
    : [];

  const getSlotDurationHours = (slot: TimetableSlot) => {
    const range = getSlotTimeRange(slot);
    return range ? (range.end - range.start) / 60 : 0;
  };

  const isTeachingStaff = (teacher: Teacher) => (
    /ครู|อาจารย์|ผู้สอน/i.test(`${teacher.positionTitle || ''} ${teacher.academicStanding || ''}`)
    || Boolean(teacher.teacherLicenseNo.trim())
    || teacher.teachingSubjects.length > 0
    || teacher.homeroomClasses.length > 0
    || teacher.teachingGrades.length > 0
  );
  const workloadPeople = new Map<string, { name: string; teacher?: Teacher }>();
  teachers.filter(isTeachingStaff).forEach((teacher) => {
    const name = teacher.fullNameTh.normalize('NFC').trim().replace(/\s+/g, ' ');
    const key = normalizeTeacherName(name);
    if (key) workloadPeople.set(key, { name, teacher });
  });
  slots.forEach((slot) => {
    getSlotTeachers(slot).forEach((name) => {
      const key = normalizeTeacherName(name);
      if (key && !workloadPeople.has(key)) {
        workloadPeople.set(key, { name });
      }
    });
  });
  const workloadByTeacher = new Map<string, TimetableSlot[]>();
  slots.forEach((slot) => {
    getSlotTeachers(slot).forEach((teacherName) => {
      const key = normalizeTeacherName(teacherName);
      if (!key) return;
      const teacherSlots = workloadByTeacher.get(key) || [];
      teacherSlots.push(slot);
      workloadByTeacher.set(key, teacherSlots);
    });
  });
  const teacherWorkloadRows: TeacherWorkloadRow[] = [...workloadPeople.entries()]
    .map(([key, person]) => {
      const teacherSlots = workloadByTeacher.get(key) || [];
      const periodCount = teacherSlots.length;
      const courseMap = new Map<string, { code: string; title: string; periodCount: number; coTaughtPeriods: number; rooms: Set<string> }>();
      teacherSlots.forEach((slot) => {
        const code = slot.courseCode.trim();
        const title = slot.courseTitleTh.trim() || slot.courseTitleEn.trim();
        const courseKey = `${code.normalize('NFC').toLocaleLowerCase()}|${title.normalize('NFC').toLocaleLowerCase()}`;
        const course = courseMap.get(courseKey) || { code, title, periodCount: 0, coTaughtPeriods: 0, rooms: new Set<string>() };
        course.periodCount += 1;
        if (getSlotTeachers(slot).length > 1) {
          course.coTaughtPeriods += 1;
        }
        if (slot.classRoom.trim()) course.rooms.add(slot.classRoom.trim());
        courseMap.set(courseKey, course);
      });
      return {
        ...person,
        periodCount,
        hours: teacherSlots.reduce((total, slot) => total + getSlotDurationHours(slot), 0),
        subjects: [...courseMap.values()]
          .map((course) => ({ ...course, rooms: [...course.rooms].sort((a, b) => a.localeCompare(b, 'th')) }))
          .sort((a, b) => a.code.localeCompare(b.code, 'th')),
        status: periodCount === 0
          ? 'unassigned' as const
          : periodCount < workloadMinPeriods
            ? 'low' as const
            : periodCount > workloadMaxPeriods
              ? 'high' as const
              : 'within' as const,
      };
    })
    .sort((a, b) => {
      const priority = { high: 0, low: 1, unassigned: 2, within: 3 };
      return priority[a.status] - priority[b.status]
        || b.periodCount - a.periodCount
        || a.name.localeCompare(b.name, 'th');
    });
  const lowWorkloadCount = teacherWorkloadRows.filter((teacher) => teacher.status === 'low').length;
  const highWorkloadCount = teacherWorkloadRows.filter((teacher) => teacher.status === 'high').length;
  const unassignedWorkloadCount = teacherWorkloadRows.filter((teacher) => teacher.status === 'unassigned').length;
  const withinWorkloadCount = teacherWorkloadRows.filter((teacher) => teacher.status === 'within').length;
  const workloadSearch = normalizeTeacherName(workloadSearchTerm);
  const filteredTeacherWorkloadRows = teacherWorkloadRows.filter((teacher) => {
    const matchesSearch = !workloadSearch || [
      teacher.name,
      teacher.teacher?.positionTitle || '',
      ...teacher.subjects.flatMap((subject) => [subject.code, subject.title, ...subject.rooms]),
    ].some((value) => normalizeTeacherName(value).includes(workloadSearch));
    const matchesStatus = workloadStatusFilter === 'all'
      || (workloadStatusFilter === 'scheduled' && teacher.periodCount > 0)
      || teacher.status === workloadStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Substitute teacher finder calculations
  const todaySubDate = getBangkokDateInputValue();
  const teacherLeavesToday = leaveRequests.filter(
    (leave) =>
      leave.userRole === 'teacher' &&
      leave.status !== 'rejected' &&
      leave.startDate <= todaySubDate &&
      todaySubDate <= leave.endDate
  );
  const teacherLeavesOnSubDate = leaveRequests.filter(
    (leave) =>
      leave.userRole === 'teacher' &&
      leave.status !== 'rejected' &&
      leave.startDate <= subDate &&
      subDate <= leave.endDate
  );
  const absentTeacherNameKeysOnSubDate = new Set(
    teacherLeavesOnSubDate.map((leave) => normalizeTeacherName(leave.userName))
  );
  const parsedSubDate = new Date(`${subDate}T12:00:00`);
  const subJsDay = Number.isNaN(parsedSubDate.getTime()) ? 1 : parsedSubDate.getDay();
  const subWeekdayMap: Record<number, DayOfWeek> = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
  };
  const isSubWeekendDate = subJsDay === 0 || subJsDay === 6;
  const subDayOfWeek: DayOfWeek = subWeekdayMap[subJsDay] || 'mon';
  const subDayMeta = DAYS.find((day) => day.key === subDayOfWeek) || DAYS[0];

  const subTeacherSelectableList = Array.from(
    new Map(
      [
        ...teacherLeavesOnSubDate.map((leave) => leave.userName),
        ...teacherWorkloadRows.filter((row) => row.periodCount > 0).map((row) => row.name),
        ...teacherWorkloadRows.map((row) => row.name),
      ]
        .filter(Boolean)
        .map((name) => [normalizeTeacherName(name), name] as const)
    ).values()
  );
  const resolvedAbsentTeacher =
    subSelectedTeacher && subTeacherSelectableList.includes(subSelectedTeacher)
      ? subSelectedTeacher
      : teacherLeavesOnSubDate[0]?.userName ||
        teacherWorkloadRows.find((row) => row.periodCount > 0)?.name ||
        subTeacherSelectableList[0] ||
        '';
  const resolvedAbsentTeacherLeave = teacherLeavesOnSubDate.find(
    (leave) => normalizeTeacherName(leave.userName) === normalizeTeacherName(resolvedAbsentTeacher)
  );
  const absentTeacherSlotsOnDay = slots
    .filter(
      (slot) =>
        slot.dayOfWeek === subDayOfWeek &&
        Boolean(resolvedAbsentTeacher) &&
        slotHasTeacher(slot, resolvedAbsentTeacher)
    )
    .sort((a, b) => a.periodNumber - b.periodNumber);

  const findFreeSubstitutesForSlot = (targetSlot: TimetableSlot): SubstituteCandidate[] => {
    const slotCourse = courses.find(
      (course) => course.code.toLowerCase() === targetSlot.courseCode.toLowerCase()
    );
    const targetDepartment = (slotCourse?.department || '').trim().toLowerCase();
    const absentKey = normalizeTeacherName(resolvedAbsentTeacher);

    return teacherWorkloadRows
      .filter((candidate) => {
        const candidateKey = normalizeTeacherName(candidate.name);
        if (!candidateKey || candidateKey === absentKey) return false;
        if (absentTeacherNameKeysOnSubDate.has(candidateKey)) return false;

        const hasTimeOverlap = slots.some((existing) => {
          if (existing.dayOfWeek !== subDayOfWeek) return false;
          if (!slotHasTeacher(existing, candidate.name)) return false;
          return Boolean(
            getTimetableConflictDetails(
              {
                dayOfWeek: subDayOfWeek,
                periodNumber: targetSlot.periodNumber,
                startTime: targetSlot.startTime,
                endTime: targetSlot.endTime,
                teacherName: candidate.name,
                coTeacherName: '',
                room: '__sub_check__',
                classRoom: '__sub_check__',
              },
              existing
            )
          );
        });
        return !hasTimeOverlap;
      })
      .map((candidate) => {
        const candidateDept = (candidate.teacher?.department || '').trim().toLowerCase();
        const sameDepartment = Boolean(targetDepartment && candidateDept && candidateDept === targetDepartment);
        const alreadyCoTeacher =
          Boolean(targetSlot.coTeacherName) &&
          normalizeTeacherName(targetSlot.coTeacherName || '') === normalizeTeacherName(candidate.name);
        return {
          ...candidate,
          sameDepartment,
          alreadyCoTeacher,
        };
      })
      .sort((a, b) => {
        if (a.alreadyCoTeacher !== b.alreadyCoTeacher) return a.alreadyCoTeacher ? -1 : 1;
        if (a.sameDepartment !== b.sameDepartment) return a.sameDepartment ? -1 : 1;
        if (a.periodCount !== b.periodCount) return a.periodCount - b.periodCount;
        return a.name.localeCompare(b.name, 'th');
      });
  };

  const handleRequestSubstituteTeacher = async (
    targetSlot: TimetableSlot,
    candidateName: string
  ) => {
    const requestKey = `${targetSlot.id}::${normalizeTeacherName(candidateName)}`;
    await sendEduVerseNotification({
      title: `ขอสอนแทน · ${targetSlot.courseCode} คาบ ${targetSlot.periodNumber}`,
      body: `เรียน ${candidateName} · ขอความอนุเคราะห์สอนแทน ${resolvedAbsentTeacher} วันที่ ${subDate} เวลา ${targetSlot.startTime}-${targetSlot.endTime} ห้อง ${targetSlot.classRoom}`,
      category: 'system',
      priority: 'urgent',
      metadata: {
        slotId: targetSlot.id,
        date: subDate,
        absentTeacher: resolvedAbsentTeacher,
        substituteTeacher: candidateName,
      },
    });
    setSentSubRequests((prev) => ({ ...prev, [requestKey]: true }));
    setSubNotice(`ส่งแจ้งเตือนขอสอนแทนไปยัง ${candidateName} (คาบ ${targetSlot.periodNumber} · ${targetSlot.courseCode}) เรียบร้อยแล้ว`);
  };

  const handleAssignSubstituteToSlot = async (
    targetSlot: TimetableSlot,
    candidateName: string
  ) => {
    if (!onUpdateSlot) return;
    const requestKey = `${targetSlot.id}::${normalizeTeacherName(candidateName)}`;
    setAssigningSubSlotKey(requestKey);
    try {
      await onUpdateSlot({
        ...targetSlot,
        coTeacherName: candidateName,
      });
      setSubNotice(`กำหนด ${candidateName} เป็นครูสอนคู่/สอนแทนในคาบ ${targetSlot.periodNumber} (${targetSlot.courseCode}) เรียบร้อยแล้ว`);
    } finally {
      setAssigningSubSlotKey(null);
    }
  };

  // Check course auto-fill when course selector changes in Add Modal
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setNewCoTeacher('');
    if (courseId === 'custom') {
      return;
    }
    const c = courses.find((crs) => crs.id === courseId);
    if (c) {
      const parsedCourseTeachers = parseSlotTeachersFromRaw(c.teacherName || '');
      setNewCourseCode(c.code);
      setNewTitleTh(c.titleTh);
      setNewTitleEn(c.titleEn);
      setNewTeacher(parsedCourseTeachers.teacherName || teacherNames[0] || '');
      setNewCoTeacher(parsedCourseTeachers.coTeacherName || '');
      setNewRoom(c.room || '');
      setNewCredits(c.credits ?? 1.5);

      const learningArea = inferCourseLearningArea(c);
      if (learningArea === 'science_tech') setNewColor('emerald');
      else if (learningArea === 'math' || getCourseType(c) === 'core') setNewColor('sky');
      else if (learningArea === 'foreign_lang' || learningArea === 'thai') setNewColor('amber');
      else if (learningArea === 'arts') setNewColor('rose');
      else if (learningArea === 'social') setNewColor('indigo');
      else setNewColor('purple');
    }
  };

  // Check if prospective new slot has a conflict
  const checkProspectiveConflict = () => {
    const periodTime = getPeriodTime(newPeriod);
    const candidate: TimetableConflictCandidate = {
      dayOfWeek: newDay,
      periodNumber: newPeriod,
      startTime: periodTime?.startTime || '',
      endTime: periodTime?.endTime || '',
      teacherName: newTeacher,
      coTeacherName: newCoTeacher,
      room: newRoom,
      classRoom: newClassRoom,
    };
    return slots.find((slot) => getTimetableConflictDetails(candidate, slot)) || null;
  };
  const prospectiveConflict = showAddModal ? checkProspectiveConflict() : null;
  const prospectiveConflictDetails = prospectiveConflict
    ? getTimetableConflictDetails({
      dayOfWeek: newDay,
      periodNumber: newPeriod,
      startTime: getPeriodTime(newPeriod)?.startTime || '',
      endTime: getPeriodTime(newPeriod)?.endTime || '',
      teacherName: newTeacher,
      coTeacherName: newCoTeacher,
      room: newRoom,
      classRoom: newClassRoom,
    }, prospectiveConflict)
    : null;

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassRoom) {
      setSlotActionError('กรุณาเลือกห้องเรียนปลายทางก่อนเพิ่มคาบเรียน');
      return;
    }
    if (!newCourseCode || !newTitleTh) return;
    if (newCoTeacher.trim() && normalizeTeacherName(newCoTeacher) === normalizeTeacherName(newTeacher)) {
      setSlotActionError('ครูสอนคู่ต้องไม่ใช่บุคคลเดียวกับครูผู้สอนหลัก');
      return;
    }

    const periodTime = getPeriodTime(newPeriod);

    const targetCourse = selectedCourseId !== 'custom' ? courses.find((c) => c.id === selectedCourseId) : null;
    const credits = targetCourse ? (targetCourse.credits ?? newCredits ?? 1.5) : (newCredits ?? 1.5);
    const totalSemesterHours = targetCourse?.totalHours ?? (credits > 0 ? Math.round(credits * 40) : 20);
    const parsedTeachers = parseSlotTeachersFromRaw(newTeacher, newCoTeacher);

    const newSlot: TimetableSlot = {
      id: `time-${Date.now()}`,
      academicYear,
      semester: currentSemester,
      dayOfWeek: newDay,
      periodNumber: newPeriod,
      startTime: periodTime?.startTime || '08:30',
      endTime: periodTime?.endTime || '09:20',
      courseCode: newCourseCode.trim(),
      courseTitleTh: newTitleTh.trim(),
      courseTitleEn: newTitleEn.trim() || newTitleTh.trim(),
      teacherName: parsedTeachers.teacherName,
      ...(parsedTeachers.coTeacherName ? { coTeacherName: parsedTeachers.coTeacherName } : {}),
      room: newRoom.trim(),
      classRoom: newClassRoom,
      colorTag: newColor,
      courseId: targetCourse?.id,
      credits,
      totalSemesterHours,
    };

    const duplicateReasons = getTimetableDuplicateReasons(
      {
        academicYear,
        semester: currentSemester,
        classRoom: newClassRoom,
        dayOfWeek: newDay,
        periodNumber: newPeriod,
        teacherName: newSlot.teacherName,
        coTeacherName: newSlot.coTeacherName,
        room: newRoom.trim(),
      },
      slots
    );
    const overlapWarnings = slots.flatMap((slot) => {
      if (slot.periodNumber === newSlot.periodNumber) return [];
      const conflict = getTimetableConflictDetails(newSlot, slot);
      return conflict
        ? [`มีคาบ ${slot.periodNumber} ชนกัน (${conflict.reasons.join(', ')})`]
        : [];
    });
    const executeAddSlot = async () => {
      setIsSavingSlot(true);
      setSlotActionError(null);
      try {
        await onAddSlot(newSlot);
        setShowAddModal(false);
      } catch (error) {
        setSlotActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsSavingSlot(false);
      }
    };

    const prospectiveReasons = [...new Set([...duplicateReasons, ...overlapWarnings])];
    if (prospectiveReasons.length > 0) {
      setPendingSlotConfirm({
        title: 'พบตารางสอนซ้อนทับกัน',
        description: `${prospectiveReasons.join(' และ ')} — ต้องการบันทึกคาบเรียนนี้ทับหรือบันทึกต่อหรือไม่?`,
        confirmLabel: 'ยืนยันเพิ่มคาบเรียน',
        tone: 'primary',
        onConfirm: executeAddSlot,
      });
      return;
    }

    await executeAddSlot();
  };

  const handleSavePeriodSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderedPeriods = [...periodDraft].sort(
      (a, b) => a.startTime.localeCompare(b.startTime)
    );
    const periodNumbers = orderedPeriods.map((period) => period.periodNumber);
    if (
      new Set(periodNumbers).size !== periodNumbers.length ||
      orderedPeriods.filter((period) => !period.isBreak).length === 0 ||
      orderedPeriods.some((period) => period.periodNumber < 0 || period.periodNumber > 99)
    ) {
      setPeriodSettingsError('ต้องมีคาบสอนอย่างน้อย 1 คาบ และหมายเลขคาบต้องไม่ซ้ำกัน');
      return;
    }

    const removedPeriods = schoolPeriods.filter(
      (period) => !periodDraft.some((draft) => draft.periodNumber === period.periodNumber)
    );
    const usedRemovedPeriods = slots.filter((slot) => removedPeriods.some(
      (period) => period.periodNumber === slot.periodNumber
    ));
    if (usedRemovedPeriods.length > 0) {
      const periodNumbersInUse = [...new Set(usedRemovedPeriods.map((slot) => slot.periodNumber))].join(', ');
      setPeriodSettingsError(`ลบคาบที่ ${periodNumbersInUse} ไม่ได้ เพราะยังมีตารางสอนใช้อยู่ ${usedRemovedPeriods.length} รายการ กรุณาย้ายหรือลบตารางสอนก่อน`);
      return;
    }
    const timeToMinutes = (time: string) => {
      const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
      return match ? Number(match[1]) * 60 + Number(match[2]) : null;
    };
    for (let index = 0; index < orderedPeriods.length; index++) {
      const period = orderedPeriods[index];
      const start = timeToMinutes(period.startTime);
      const end = timeToMinutes(period.endTime);
      if (start === null || end === null || end <= start) {
        setPeriodSettingsError(`กรุณาตรวจสอบเวลาเริ่มและเลิกของ${period.labelTh || (period.isBreak ? 'ช่วงพัก' : `คาบที่ ${period.periodNumber}`)}`);
        return;
      }
      if (index > 0) {
        const previousEnd = timeToMinutes(orderedPeriods[index - 1].endTime);
        if (previousEnd !== null && start < previousEnd) {
          setPeriodSettingsError('เวลาแต่ละคาบต้องไม่ทับซ้อนกัน และเรียงตามลำดับเวลา');
          return;
        }
      }
    }

    setIsSavingPeriods(true);
    setPeriodSettingsError(null);
    try {
      await onSaveSchoolPeriods(orderedPeriods);
      setShowPeriodSettings(false);
    } catch (error) {
      setPeriodSettingsError(error instanceof Error ? error.message : 'บันทึกเวลาเรียนไม่สำเร็จ');
    } finally {
      setIsSavingPeriods(false);
    }
  };

  const handleAddPeriod = () => {
    const draftLessons = periodDraft.filter((p) => !p.isBreak);
    if (draftLessons.length >= MAX_LESSON_PERIODS) {
      setPeriodSettingsError(`เพิ่มคาบสอนได้สูงสุด ${MAX_LESSON_PERIODS} คาบ`);
      return;
    }
    const nextPeriodNumber = Array.from({ length: MAX_LESSON_PERIODS }, (_, index) => index + 1)
      .find((number) => !periodDraft.some((period) => period.periodNumber === number));
    if (!nextPeriodNumber) {
      setPeriodSettingsError(`เพิ่มได้สูงสุด ${MAX_LESSON_PERIODS} คาบ`);
      return;
    }

    const sortedAll = [...periodDraft].sort((a, b) => a.endTime.localeCompare(b.endTime));
    const latestEnd = sortedAll[sortedAll.length - 1]?.endTime || '08:30';
    let startTime = latestEnd;
    const overlappingBreak = periodDraft.find((p) => p.isBreak && startTime >= p.startTime && startTime < p.endTime);
    if (overlappingBreak) startTime = overlappingBreak.endTime;

    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + 50;
    if (endMinutes >= 24 * 60) {
      setPeriodSettingsError('ไม่สามารถเพิ่มคาบหลังเที่ยงคืนได้');
      return;
    }
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    setPeriodDraft((previous) => [
      ...previous,
      { periodNumber: nextPeriodNumber, startTime, endTime, labelTh: `คาบ ${nextPeriodNumber}` },
    ]);
    setPeriodSettingsError(null);
  };

  const handleAddBreakPeriod = () => {
    const breakNumber = !periodDraft.some((p) => p.periodNumber === 0)
      ? 0
      : Array.from({ length: 9 }, (_, i) => 91 + i).find((n) => !periodDraft.some((p) => p.periodNumber === n));
    if (breakNumber === undefined) {
      setPeriodSettingsError('เพิ่มช่วงพักได้สูงสุด 10 ช่วง');
      return;
    }
    const sortedAll = [...periodDraft].sort((a, b) => a.endTime.localeCompare(b.endTime));
    const startTime = sortedAll[sortedAll.length - 1]?.endTime || '10:10';
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + 15;
    if (endMinutes >= 24 * 60) {
      setPeriodSettingsError('ไม่สามารถเพิ่มช่วงพักหลังเที่ยงคืนได้');
      return;
    }
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    setPeriodDraft((prev) => [
      ...prev,
      {
        periodNumber: breakNumber,
        startTime,
        endTime,
        isBreak: true,
        labelTh: breakNumber === 0 ? 'พักกลางวัน' : 'พักเบรก',
      },
    ]);
    setPeriodSettingsError(null);
  };

  const handleRemovePeriod = (periodNumber: number) => {
    const target = periodDraft.find((p) => p.periodNumber === periodNumber);
    if (!target?.isBreak) {
      const scheduledSlots = slots.filter((slot) => slot.periodNumber === periodNumber);
      if (scheduledSlots.length > 0) {
        setPeriodSettingsError(`ลบคาบที่ ${periodNumber} ไม่ได้ เพราะยังมีตารางสอนใช้อยู่ ${scheduledSlots.length} รายการ กรุณาย้ายหรือลบตารางสอนก่อน`);
        return;
      }
    } else if (periodDraft.filter((p) => p.isBreak).length <= 1 && periodNumber === 0) {
      setPeriodSettingsError('ควรมีช่วงพักอย่างน้อย 1 ช่วง (หรือเพิ่มช่วงพักอื่นก่อนลบ)');
      return;
    }
    setPeriodDraft((previous) => previous.filter((period) => period.periodNumber !== periodNumber));
    setPeriodSettingsError(null);
  };

  // Compute academic hours breakdown per course in this classroom
  const baseClassroomSlots = selectedClassRoom === ALL_CLASSROOMS
    ? slots
    : slots.filter((s) => s.classRoom === selectedClassRoom);
  const classroomSlots = myCoursesOnly
    ? baseClassroomSlots.filter((slot) =>
        slotMatchesLoggedInTeacher(slot, currentUser, matchedTeacher, courses)
      )
    : baseClassroomSlots;
  const classroomCourseMap: Record<string, ClassroomCourseSummary> = {};

  classroomSlots.forEach((s) => {
    if (!classroomCourseMap[s.courseCode]) {
      const matchCourse = courses.find((c) => c.code.toLowerCase() === s.courseCode.toLowerCase());
      classroomCourseMap[s.courseCode] = {
        code: s.courseCode,
        titleTh: s.courseTitleTh,
        titleEn: s.courseTitleEn,
        teacher: formatSlotTeachersDisplay(s),
        scheduledPeriods: 0,
        course: matchCourse,
      };
    }
    classroomCourseMap[s.courseCode].scheduledPeriods += 1;
  });

  const rawClassroomCoursesList = Object.values(classroomCourseMap);
  const hoursCourseStubs = rawClassroomCoursesList.map((item) => ({
    teacherName: item.course?.teacherName || item.teacher,
    teacherEmail: item.course?.teacherEmail || '',
  })) as import('../types').Course[];
  const hoursTeacherOptions = buildCourseTeacherOptions(hoursCourseStubs, teachers);
  const effectiveHoursTeacherFilter =
    myCoursesOnly && hoursTeacherFilter !== 'all' && !hoursTeacherOptions.some((o) => o.key === hoursTeacherFilter)
      ? 'all'
      : hoursTeacherFilter;
  const classroomCoursesList = rawClassroomCoursesList.filter((item) =>
    courseMatchesTeacherFilter(
      {
        teacherName: item.course?.teacherName || item.teacher,
        teacherEmail: item.course?.teacherEmail || '',
      },
      effectiveHoursTeacherFilter,
      hoursTeacherOptions
    )
  );
  const showCreditsColumn = classroomCoursesList.some((item) =>
    shouldShowCourseCredits(item.code, showPrimaryCourseCredits)
  );

  const timetableGroup = getModuleGroupMeta('timetable');

  const setTimetableTeacherScope = (myCoursesOnlyNext: boolean) => {
    setMyCoursesOnly(myCoursesOnlyNext);
    if (myCoursesOnlyNext) {
      setActiveScheduleFilters(null);
      setSelectedClassRoom(ALL_CLASSROOMS);
      setHoursTeacherFilter(
        currentRole === 'teacher' ? 'all' : (loggedInCourseTeacherKey || 'all')
      );
    } else {
      setHoursTeacherFilter('all');
    }
  };

  const renderRoomAndTermControls = (showRoomFilter = true) => (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {hasTeacherTimetableMatch && (
        currentRole === 'admin' || currentRole === 'super_admin' ? (
          <div
            role="group"
            aria-label="ขอบเขตวิชาตามผู้สอน"
            className="seg-tab-group h-9"
          >
            <button
              type="button"
              data-active={!myCoursesOnly}
              aria-pressed={!myCoursesOnly}
              onClick={() => setTimetableTeacherScope(false)}
              className="seg-tab-btn inline-flex items-center gap-1.5 text-xs"
            >
              <Users className="h-3.5 w-3.5" />
              <span>ทั้งโรงเรียน</span>
            </button>
            <button
              type="button"
              data-active={myCoursesOnly}
              aria-pressed={myCoursesOnly}
              onClick={() => setTimetableTeacherScope(true)}
              className="seg-tab-btn inline-flex items-center gap-1.5 text-xs"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>วิชาที่ฉันสอน</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-pressed={myCoursesOnly}
            data-active={myCoursesOnly}
            onClick={() => setTimetableTeacherScope(!myCoursesOnly)}
            className="btn-tool-neutral h-9 px-2.5 text-xs"
            title={
              myCoursesOnly
                ? 'กำลังแสดงเฉพาะวิชาที่ฉันสอน คลิกเพื่อดูตารางที่คุณมีสิทธิ์เข้าถึง'
                : 'กำลังแสดงตารางที่คุณมีสิทธิ์เข้าถึง คลิกเพื่อกรองเฉพาะวิชาที่ฉันสอน'
            }
          >
            {myCoursesOnly
              ? <UserCheck className="h-3.5 w-3.5 tone-text" />
              : <Users className="h-3.5 w-3.5 tone-text" />}
            <span>{myCoursesOnly ? 'เฉพาะวิชาที่ฉันสอน' : 'ทุกวิชาที่เข้าถึงได้'}</span>
          </button>
        )
      )}

      {showRoomFilter && (activeScheduleFilters ? (
        <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs">
          <span className="max-w-64 truncate font-semibold text-[var(--color-text-body)]">
            {activeScheduleFilters.gradeLevel || 'ทุกระดับชั้น'} · {activeScheduleFilters.classRoom || 'ทุกห้อง'} · {activeScheduleFilters.teacherName || 'ครูทุกคน'}
          </span>
          <button
            type="button"
            onClick={() => setActiveScheduleFilters(null)}
            className="font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
          >
            ล้าง
          </button>
        </div>
      ) : (
        <>
          <label className="sr-only" htmlFor="timetable-room-select">เลือกห้องเรียน</label>
          <select
            id="timetable-room-select"
            value={selectedClassRoom}
            onChange={(e) => {
              setSelectedClassRoom(e.target.value);
              setActiveScheduleFilters(null);
            }}
            className="h-9 max-w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
          >
            {(!isPersonalViewer || uniqueClassRooms.length > 1) && (
              <option value={ALL_CLASSROOMS} disabled={viewMode === 'hours_criteria' && !myCoursesOnly}>
                {isPersonalViewer ? 'ทุกห้องเรียนของฉัน' : `ทุกห้อง (${uniqueClassRooms.length})`}
              </option>
            )}
            {uniqueClassRooms.map((room) => (
              <option key={room} value={room}>
                {isPersonalViewer ? room : `${room} (${students.filter((student) => student.room === room).length} คน)`}
              </option>
            ))}
          </select>
          {isAdmin && isViewingCurrentTerm && (
            showAddRoomInput ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newCustomRoomName}
                  onChange={(e) => setNewCustomRoomName(e.target.value)}
                  placeholder="เช่น ม.4/3"
                  aria-label="ชื่อห้องเรียนใหม่"
                  className="h-9 w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-text-title)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const room = newCustomRoomName.trim();
                    if (!room) return;
                    if (roomOptions.some((existing) => existing.toLocaleLowerCase() === room.toLocaleLowerCase())) {
                      setRoomOptionsError('มีชื่อห้องนี้อยู่แล้ว');
                      return;
                    }
                    void (async () => {
                      setIsSavingRoomOption(true);
                      setRoomOptionsError(null);
                      try {
                        const nextOptions = [...roomOptions, room];
                        await onUpdateRoomOptions?.(nextOptions);
                        updatePresets({ roomOptions: nextOptions });
                        setSelectedClassRoom(room);
                        setActiveScheduleFilters(null);
                        setNewCustomRoomName('');
                        setShowAddRoomInput(false);
                      } catch (error) {
                        setRoomOptionsError(error instanceof Error ? error.message : 'บันทึกรายการห้องเรียนไม่สำเร็จ');
                      } finally {
                        setIsSavingRoomOption(false);
                      }
                    })();
                  }}
                  disabled={isSavingRoomOption}
                  className="h-9 rounded-lg bg-[var(--color-primary)] px-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRoomInput(false)}
                  className="h-9 px-1.5 text-xs text-[var(--color-text-muted)]"
                  aria-label="ยกเลิกเพิ่มห้อง"
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddRoomInput(true)}
                className="btn-tool-neutral h-9 px-2.5 text-xs"
                title="เพิ่มห้องเรียนใหม่"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>เพิ่มห้อง</span>
              </button>
            )
          )}
        </>
      ))}
      <label className="sr-only" htmlFor="timetable-academic-period">เลือกภาคเรียนที่ต้องการดู</label>
      <select
        id="timetable-academic-period"
        value={selectedAcademicPeriodKey}
        onChange={(event) => handleAcademicPeriodChange(event.target.value)}
        className="h-9 max-w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
      >
        {academicPeriodOptions.map((period) => (
          <option key={period.key} value={period.key}>
            {formatSemesterLabel(period.semester)} · {period.academicYear}
            {period.key === activeAcademicPeriodKey ? ' · ปัจจุบัน' : ''}
          </option>
        ))}
      </select>
      {!isViewingCurrentTerm && (
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap px-1">
          ดูย้อนหลัง · อ่านอย่างเดียว
        </span>
      )}
      {onUpdateAcademicPeriod && isAdmin && (
        <button
          type="button"
          onClick={() => {
            setDraftAcademicYear(academicYear);
            setDraftSemester(currentSemester);
            setDraftSemesterOptions(semesterOptions.length > 0 ? semesterOptions : ['1', '2', 'Summer']);
            setShowPeriodEditor(true);
          }}
          className="btn-tool-neutral h-9 px-2.5 text-xs"
          title="แก้ไขปีการศึกษาและภาคเรียนปัจจุบันของโรงเรียน"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
          <span>ตั้งค่าเทอม</span>
        </button>
      )}
      {showRoomFilter && roomOptionsError && <span role="alert" className="text-xs text-rose-700">{roomOptionsError}</span>}
    </div>
  );

  const openAddSlotModal = () => {
    setCourseSearchInput('');
    const initialTeacherFilter =
      myCoursesOnly && loggedInCourseTeacherKey ? loggedInCourseTeacherKey : 'all';
    setCatalogTeacherFilter(initialTeacherFilter);
    setNewClassRoom(activeScheduleFilters
      ? activeScheduleFilters.classRoom
      : selectedClassRoom === ALL_CLASSROOMS
        ? ''
        : selectedClassRoom);
    const matchingCourses =
      initialTeacherFilter === 'all'
        ? courses
        : courses.filter((c) =>
            courseMatchesTeacherFilter(
              c,
              initialTeacherFilter,
              courseCatalogTeacherOptions
            )
          );
    if (matchingCourses.length > 0) {
      handleSelectCourse(matchingCourses[0].id);
    } else if (courses.length > 0) {
      handleSelectCourse(courses[0].id);
    } else {
      handleSelectCourse('custom');
    }
    if (activeScheduleFilters?.teacherName) {
      setNewTeacher(activeScheduleFilters.teacherName);
      setNewCoTeacher('');
    }
    setNewPeriod(lessonPeriods[0]?.periodNumber || 1);
    setSlotActionError(null);
    setShowAddModal(true);
  };

  const openPeriodSettingsModal = () => {
    setPeriodDraft(schoolPeriods.map((period) => ({ ...period })));
    setPeriodSettingsError(null);
    setShowPeriodSettings(true);
  };

  return (
    <div className={`${getModuleTone('timetable')} h-full flex flex-col min-h-0 overflow-hidden space-y-4`}>
      {/* Single-Row Page Heading and Schedule Mode Switcher */}
      <div className="shrink-0 px-4 py-3 sm:px-5 app-page-header print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="tone-chip w-8 h-8 rounded-lg shrink-0">
              <Calendar className="w-4 h-4 shrink-0" />
            </span>
            <h1 className="text-base font-bold text-[var(--color-text-title)] leading-tight truncate">
              ตารางเรียนและตารางสอน
            </h1>
            <ModuleTourTrigger moduleId="timetable" lang={lang} floating />
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <nav data-guide-id="timetable-view-tabs" aria-label="หน้าตารางเรียนและตารางสอน" className="seg-tab-group max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                aria-pressed={viewMode === 'classroom'}
                data-active={viewMode === 'classroom'}
                onClick={() => handleViewModeChange('classroom')}
                className="seg-tab-btn"
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>ตารางห้อง</span>
              </button>
              {!isPersonalViewer && (
                <button
                  type="button"
                  aria-pressed={viewMode === 'period_rollcall'}
                  data-active={viewMode === 'period_rollcall'}
                  onClick={() => handleViewModeChange('period_rollcall')}
                  className="seg-tab-btn"
                >
                  <UserCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>เช็กชื่อรายคาบ</span>
                </button>
              )}
              <button
                type="button"
                aria-pressed={viewMode === 'calendar'}
                data-active={viewMode === 'calendar'}
                onClick={() => handleViewModeChange('calendar')}
                className="seg-tab-btn"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>ปฏิทิน</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'hours_criteria'}
                data-active={viewMode === 'hours_criteria'}
                onClick={() => handleViewModeChange('hours_criteria')}
                className="seg-tab-btn"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>เวลาเรียน 80%</span>
              </button>
              {!isPersonalViewer && (
                <>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'workload'}
                    data-active={viewMode === 'workload'}
                    onClick={() => handleViewModeChange('workload')}
                    className="seg-tab-btn"
                  >
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>ภาระงานครู</span>
                    {(lowWorkloadCount > 0 || highWorkloadCount > 0) && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300 tabular-nums">
                        ({lowWorkloadCount + highWorkloadCount})
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'substitute'}
                    data-active={viewMode === 'substitute'}
                    onClick={() => handleViewModeChange('substitute')}
                    className="seg-tab-btn"
                  >
                    <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                    <span>หาครูสอนแทน</span>
                    {teacherLeavesToday.length > 0 && (
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        ({teacherLeavesToday.length})
                      </span>
                    )}
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>

      {academicPeriodNotice && (
        <div className="shrink-0 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {academicPeriodNotice}
          </span>
          <button type="button" onClick={() => setAcademicPeriodNotice(null)} className="text-xs font-bold px-1.5 cursor-pointer">✕</button>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      {!isPersonalViewer && viewMode === 'period_rollcall' ? (
        <TimetablePeriodRollcallTab
          rollcallDate={rollcallDate}
          setRollcallDate={setRollcallDate}
          rollcallSlotId={rollcallSlotId}
          setRollcallSlotId={setRollcallSlotId}
          todayBangkokDate={todayBangkokDate}
          bangkokClock={bangkokClock}
          schoolId={schoolId}
          activeSlots={activeSlots}
          schoolPeriods={schoolPeriods}
          courses={courses}
          students={students}
          teachers={teachers}
          attendance={attendance}
          periodAttendance={periodAttendance}
          leaveRequests={leaveRequests}
          currentUser={currentUser}
          lang={lang}
          onRecordPeriodAttendance={onRecordPeriodAttendance}
          renderRoomAndTermControls={renderRoomAndTermControls}
        />
      ) : viewMode === 'substitute' ? (
        <TimetableSubstituteTab
          subDate={subDate}
          setSubDate={setSubDate}
          setSubSelectedTeacher={setSubSelectedTeacher}
          subDayMeta={subDayMeta}
          resolvedAbsentTeacher={resolvedAbsentTeacher}
          subTeacherSelectableList={subTeacherSelectableList}
          absentTeacherNameKeysOnSubDate={absentTeacherNameKeysOnSubDate}
          teacherLeavesOnSubDate={teacherLeavesOnSubDate}
          isSubWeekendDate={isSubWeekendDate}
          subNotice={subNotice}
          setSubNotice={setSubNotice}
          absentTeacherSlotsOnDay={absentTeacherSlotsOnDay}
          resolvedAbsentTeacherLeave={resolvedAbsentTeacherLeave}
          findFreeSubstitutesForSlot={findFreeSubstitutesForSlot}
          sentSubRequests={sentSubRequests}
          assigningSubSlotKey={assigningSubSlotKey}
          canEditTimetableSlots={canEditTimetableSlots}
          hasUpdateSlotHandler={Boolean(onUpdateSlot)}
          handleRequestSubstituteTeacher={handleRequestSubstituteTeacher}
          handleAssignSubstituteToSlot={handleAssignSubstituteToSlot}
          renderRoomAndTermControls={renderRoomAndTermControls}
        />
      ) : viewMode === 'workload' ? (
        <TimetableWorkloadTab
          isAdmin={isAdmin}
          hasUpdateTeachingLoadThresholds={Boolean(onUpdateTeachingLoadThresholds)}
          workloadMinPeriods={workloadMinPeriods}
          workloadMaxPeriods={workloadMaxPeriods}
          workloadMinDraft={workloadMinDraft}
          setWorkloadMinDraft={setWorkloadMinDraft}
          workloadMaxDraft={workloadMaxDraft}
          setWorkloadMaxDraft={setWorkloadMaxDraft}
          workloadSettingsError={workloadSettingsError}
          setWorkloadSettingsError={setWorkloadSettingsError}
          isSavingWorkloadSettings={isSavingWorkloadSettings}
          handleSaveTeachingLoadThresholds={handleSaveTeachingLoadThresholds}
          workloadStatusFilter={workloadStatusFilter}
          setWorkloadStatusFilter={setWorkloadStatusFilter}
          workloadSearchTerm={workloadSearchTerm}
          setWorkloadSearchTerm={setWorkloadSearchTerm}
          teacherWorkloadRows={teacherWorkloadRows}
          filteredTeacherWorkloadRows={filteredTeacherWorkloadRows}
          unassignedWorkloadCount={unassignedWorkloadCount}
          lowWorkloadCount={lowWorkloadCount}
          withinWorkloadCount={withinWorkloadCount}
          highWorkloadCount={highWorkloadCount}
          renderRoomAndTermControls={renderRoomAndTermControls}
        />
      ) : viewMode === 'hours_criteria' ? (
        <TimetableHoursCriteriaTab
          isPersonalViewer={isPersonalViewer}
          hoursTeacherOptions={hoursTeacherOptions}
          effectiveHoursTeacherFilter={effectiveHoursTeacherFilter}
          setHoursTeacherFilter={setHoursTeacherFilter}
          classroomCoursesList={classroomCoursesList}
          showCreditsColumn={showCreditsColumn}
          showPrimaryCourseCredits={showPrimaryCourseCredits}
          renderRoomAndTermControls={renderRoomAndTermControls}
        />
      ) : viewMode === 'calendar' ? (
        <TimetableCalendarTab
          schoolId={schoolId}
          lang={lang}
          isAdmin={isAdmin}
          isPersonalViewer={isPersonalViewer}
          currentRole={currentRole}
          currentUser={currentUser}
          todayBangkokDate={todayBangkokDate}
          bangkokClock={bangkokClock}
          activeSlots={activeSlots}
          assignments={assignments}
          courses={courses}
          students={students}
          teachers={teachers}
          schoolPeriods={schoolPeriods}
          attendance={attendance}
          periodAttendance={periodAttendance}
          leaveRequests={leaveRequests}
          conflictingSlotIds={conflictingSlotIds}
          calendarLayoutMode={calendarLayoutMode}
          setCalendarLayoutMode={setCalendarLayoutMode}
          calendarMonthCursor={calendarMonthCursor}
          setCalendarMonthCursor={setCalendarMonthCursor}
          selectedCalendarDate={selectedCalendarDate}
          setSelectedCalendarDate={setSelectedCalendarDate}
          calendarWeekStart={calendarWeekStart}
          setCalendarWeekStart={setCalendarWeekStart}
          calendarWeekDays={calendarWeekDays}
          calendarWeekRangeLabel={calendarWeekRangeLabel}
          holidaySyncStatus={holidaySyncStatus}
          isSyncingHolidays={isSyncingHolidays}
          handleManualHolidaySync={handleManualHolidaySync}
          todayHoliday={todayHoliday}
          upcomingHolidaysList={upcomingHolidaysList}
          showAddHolidayForm={showAddHolidayForm}
          setShowAddHolidayForm={setShowAddHolidayForm}
          newHolidayDate={newHolidayDate}
          setNewHolidayDate={setNewHolidayDate}
          newHolidayNameTh={newHolidayNameTh}
          setNewHolidayNameTh={setNewHolidayNameTh}
          setHolidayRefreshTick={setHolidayRefreshTick}
          calendarNotesTick={calendarNotesTick}
          setCalendarNotesTick={setCalendarNotesTick}
          showNoteForm={showNoteForm}
          setShowNoteForm={setShowNoteForm}
          editingNoteId={editingNoteId}
          setEditingNoteId={setEditingNoteId}
          noteTitleDraft={noteTitleDraft}
          setNoteTitleDraft={setNoteTitleDraft}
          noteContentDraft={noteContentDraft}
          setNoteContentDraft={setNoteContentDraft}
          noteScopeDraft={noteScopeDraft}
          setNoteScopeDraft={setNoteScopeDraft}
          noteColorDraft={noteColorDraft}
          setNoteColorDraft={setNoteColorDraft}
          canUsePeriodCheckin={canUsePeriodCheckin}
          canOpenPeriodRoster={canOpenPeriodRoster}
          getSlotTimeRange={getSlotTimeRange}
          getSlotCheckStatusForDate={getSlotCheckStatusForDate}
          triggerSlotCheckin={triggerSlotCheckin}
          openSlotDetails={openSlotDetails}
          setSelectedConflictSlotId={setSelectedConflictSlotId}
          setPeriodRosterTarget={setPeriodRosterTarget}
          setShowImportExportModal={setShowImportExportModal}
          openGoogleCalendarModal={openGoogleCalendarModal}
          renderRoomAndTermControls={renderRoomAndTermControls}
        />
      ) : (
        <TimetableClassroomGridTab
          schoolId={schoolId}
          lang={lang}
          isAdmin={isAdmin}
          isPersonalViewer={isPersonalViewer}
          canManageTimetable={canManageTimetable}
          isViewingCurrentTerm={isViewingCurrentTerm}
          isAllClassroomsView={isAllClassroomsView}
          canUsePeriodCheckin={canUsePeriodCheckin}
          canOpenPeriodRoster={canOpenPeriodRoster}
          hasOpenPeriodCheckinHandler={Boolean(onOpenPeriodCheckin)}
          currentUser={currentUser}
          schoolPeriods={schoolPeriods}
          orderedSchoolPeriods={orderedSchoolPeriods}
          slots={slots}
          activeSlots={activeSlots}
          courses={courses}
          students={students}
          teachers={teachers}
          attendance={attendance}
          periodAttendance={periodAttendance}
          leaveRequests={leaveRequests}
          uniqueClassRooms={uniqueClassRooms}
          selectedClassRoom={selectedClassRoom}
          myCoursesOnly={myCoursesOnly}
          activeScheduleFilters={activeScheduleFilters}
          viewAcademicYear={viewAcademicYear}
          viewSemester={viewSemester}
          todayDayKey={todayDayKey}
          todayBangkokDate={todayBangkokDate}
          bangkokClock={bangkokClock}
          currentWeekDaysWithDates={currentWeekDaysWithDates}
          conflictingSlotIds={conflictingSlotIds}
          currentBangkokYear={currentBangkokYear}
          yearHolidaysCount={yearHolidaysCount}
          isSyncingHolidays={isSyncingHolidays}
          handleManualHolidaySync={handleManualHolidaySync}
          renderRoomAndTermControls={renderRoomAndTermControls}
          openAddSlotModal={openAddSlotModal}
          openScheduleSettings={openScheduleSettings}
          openPeriodSettingsModal={openPeriodSettingsModal}
          setShowImportExportModal={setShowImportExportModal}
          openGoogleCalendarModal={openGoogleCalendarModal}
          setCalendarLayoutMode={setCalendarLayoutMode}
          setViewMode={setViewMode}
          openSlotDetails={openSlotDetails}
          setSelectedConflictSlotId={setSelectedConflictSlotId}
          setPeriodRosterTarget={setPeriodRosterTarget}
          setRollcallDate={setRollcallDate}
          setRollcallSlotId={setRollcallSlotId}
          setPendingSlotConfirm={setPendingSlotConfirm}
          onDeleteSlot={onDeleteSlot}
          getSlotCheckStatusForDate={getSlotCheckStatusForDate}
          triggerSlotCheckin={triggerSlotCheckin}
        />
      )}

      <TimetableModals
        schoolId={schoolId}
        schoolName={schoolName}
        lang={lang}
        isAdmin={isAdmin}
        isPersonalViewer={isPersonalViewer}
        canManageTimetable={canManageTimetable}
        canEditTimetableSlots={canEditTimetableSlots}
        isViewingCurrentTerm={isViewingCurrentTerm}
        canOpenPeriodRoster={canOpenPeriodRoster}
        canUsePeriodCheckin={canUsePeriodCheckin}
        showPrimaryCourseCredits={showPrimaryCourseCredits}
        currentUser={currentUser}
        todayBangkokDate={todayBangkokDate}
        bangkokClock={bangkokClock}
        courses={courses}
        assignments={assignments}
        teachers={teachers}
        students={students}
        attendance={attendance}
        periodAttendance={periodAttendance}
        leaveRequests={leaveRequests}
        schoolPeriods={schoolPeriods}
        lessonPeriods={lessonPeriods}
        slots={slots}
        allTimetableSlots={allTimetableSlots}
        activeSlots={activeSlots}
        uniqueClassRooms={uniqueClassRooms}
        selectedClassRoom={selectedClassRoom}
        teacherNames={teacherNames}
        gradeLevels={gradeLevels}
        gradeRooms={gradeRooms}
        scheduledTeacherNames={scheduledTeacherNames}
        viewAcademicYear={viewAcademicYear}
        viewSemester={viewSemester}
        calendarWeekStart={calendarWeekStart}
        activeScheduleFilters={activeScheduleFilters}
        setActiveScheduleFilters={setActiveScheduleFilters}
        selectedConflictSlotId={selectedConflictSlotId}
        setSelectedConflictSlotId={setSelectedConflictSlotId}
        selectedSlotConflicts={selectedSlotConflicts}
        openConflictSlot={openConflictSlot}
        showPeriodSettings={showPeriodSettings}
        setShowPeriodSettings={setShowPeriodSettings}
        periodDraft={periodDraft}
        setPeriodDraft={setPeriodDraft}
        periodSettingsError={periodSettingsError}
        isSavingPeriods={isSavingPeriods}
        handleSavePeriodSettings={handleSavePeriodSettings}
        handleAddBreakPeriod={handleAddBreakPeriod}
        handleAddPeriod={handleAddPeriod}
        handleRemovePeriod={handleRemovePeriod}
        selectedSlotForDetail={selectedSlotForDetail}
        closeSlotDetails={closeSlotDetails}
        isEditingSelectedSlot={isEditingSelectedSlot}
        setIsEditingSelectedSlot={setIsEditingSelectedSlot}
        editSlotDraft={editSlotDraft}
        setEditSlotDraft={setEditSlotDraft}
        editSlotPeriodOptions={editSlotPeriodOptions}
        editSlotClassRoomOptions={editSlotClassRoomOptions}
        editSlotTeacherOptions={editSlotTeacherOptions}
        editSlotConflicts={editSlotConflicts}
        handleSaveEditedSlot={handleSaveEditedSlot}
        slotActionError={slotActionError}
        setSlotActionError={setSlotActionError}
        isSavingSlot={isSavingSlot}
        onDeleteSlot={onDeleteSlot}
        getPeriodTime={getPeriodTime}
        getSlotCheckStatusForDate={getSlotCheckStatusForDate}
        triggerSlotCheckin={triggerSlotCheckin}
        setPeriodRosterTarget={setPeriodRosterTarget}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        handleCreateSlot={handleCreateSlot}
        prospectiveConflict={prospectiveConflict}
        prospectiveConflictDetails={prospectiveConflictDetails}
        courseSearchInput={courseSearchInput}
        setCourseSearchInput={setCourseSearchInput}
        courseCatalogTeacherOptions={courseCatalogTeacherOptions}
        catalogTeacherFilter={catalogTeacherFilter}
        setCatalogTeacherFilter={setCatalogTeacherFilter}
        selectedCourseId={selectedCourseId}
        handleSelectCourse={handleSelectCourse}
        filteredCourseCatalog={filteredCourseCatalog}
        selectedCatalogCourse={selectedCatalogCourse}
        newDay={newDay}
        setNewDay={setNewDay}
        newPeriod={newPeriod}
        setNewPeriod={setNewPeriod}
        newCourseCode={newCourseCode}
        setNewCourseCode={setNewCourseCode}
        newTitleTh={newTitleTh}
        setNewTitleTh={setNewTitleTh}
        newTeacher={newTeacher}
        setNewTeacher={setNewTeacher}
        newCoTeacher={newCoTeacher}
        setNewCoTeacher={setNewCoTeacher}
        newRoom={newRoom}
        setNewRoom={setNewRoom}
        newClassRoom={newClassRoom}
        setNewClassRoom={setNewClassRoom}
        newColor={newColor}
        setNewColor={setNewColor}
        showGoogleCalendarModal={showGoogleCalendarModal}
        setShowGoogleCalendarModal={setShowGoogleCalendarModal}
        showImportExportModal={showImportExportModal}
        setShowImportExportModal={setShowImportExportModal}
        onImportSlots={onImportSlots}
        onAddSlot={onAddSlot}
        showScheduleSettingsModal={showScheduleSettingsModal}
        setShowScheduleSettingsModal={setShowScheduleSettingsModal}
        scheduleFilterDraft={scheduleFilterDraft}
        setScheduleFilterDraft={setScheduleFilterDraft}
        filterSlotsByScheduleSettings={filterSlotsByScheduleSettings}
        showPeriodEditor={showPeriodEditor}
        setShowPeriodEditor={setShowPeriodEditor}
        onUpdateAcademicPeriod={onUpdateAcademicPeriod}
        draftAcademicYear={draftAcademicYear}
        setDraftAcademicYear={setDraftAcademicYear}
        draftSemester={draftSemester}
        setDraftSemester={setDraftSemester}
        draftSemesterOptions={draftSemesterOptions}
        setDraftSemesterOptions={setDraftSemesterOptions}
        newSemesterOptionInput={newSemesterOptionInput}
        setNewSemesterOptionInput={setNewSemesterOptionInput}
        isSavingAcademicPeriod={isSavingAcademicPeriod}
        setIsSavingAcademicPeriod={setIsSavingAcademicPeriod}
        setAcademicPeriodNotice={setAcademicPeriodNotice}
        pendingSlotConfirm={pendingSlotConfirm}
        setPendingSlotConfirm={setPendingSlotConfirm}
        isConfirmingSlotAction={isConfirmingSlotAction}
        setIsConfirmingSlotAction={setIsConfirmingSlotAction}
        periodRosterTarget={periodRosterTarget}
        onRecordPeriodAttendance={onRecordPeriodAttendance}
      />
    </div>
  );
};
