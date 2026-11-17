import React, { useEffect, useRef, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  User, 
  UserCheck,
  MapPin, 
  Trash2, 
  Download, 
  Share2, 
  Sparkles,
  Layers,
  Search,
  ShieldCheck,
  Users,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Send,
  RefreshCw,
} from 'lucide-react';
import { Assignment, AuthUser, TimetableSlot, DayOfWeek, AppLanguage, UserRole, Course, Teacher, Student, SchoolPeriodTime, LeaveRequest } from '../types';
import { sendEduVerseNotification } from '../lib/pushNotifications';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import {
  addCalendarDays,
  formatCalendarDate,
  getBangkokDateInputValue,
  getCalendarWeekStart,
} from '../lib/timetableCalendar';
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
import { GoogleCalendarSyncModal } from '../components/GoogleCalendarSyncModal';
import { TimetableImportExportModal } from '../components/modals/TimetableImportExportModal';
import {
  buildCourseTeacherOptions,
  courseMatchesTeacherFilter,
  resolveMatchedTeacherForUser,
  resolveTeacherFilterKeyForUser,
  slotMatchesLoggedInTeacher,
} from '../lib/courseTeacherFilter';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';

interface TimetableScheduleViewProps {
  slots: TimetableSlot[];
  courses: Course[];
  assignments?: Assignment[];
  teachers: Teacher[];
  students: Student[];
  onAddSlot: (slot: TimetableSlot) => Promise<void>;
  onUpdateSlot?: (slot: TimetableSlot) => Promise<void>;
  onDeleteSlot: (id: string) => Promise<void>;
  onImportSlots?: (slots: TimetableSlot[]) => Promise<void> | void;
  schoolPeriods: SchoolPeriodTime[];
  onSaveSchoolPeriods: (periods: SchoolPeriodTime[]) => Promise<void>;
  lang: AppLanguage;
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  schoolId?: string;
  schoolName: string;
  academicYear: string;
  currentSemester: string;
  semesterOptions?: string[];
  teachingLoadMinPeriods?: number;
  teachingLoadMaxPeriods?: number;
  roomOptions?: string[];
  showPrimaryCourseCredits?: boolean;
  onUpdateRoomOptions?: (roomOptions: string[]) => Promise<void>;
  onUpdateTeachingLoadThresholds?: (minPeriods: number, maxPeriods: number) => Promise<void>;
  onUpdateAcademicPeriod?: (
    academicYear: string,
    currentSemester: string,
    semesterOptions?: string[]
  ) => Promise<void>;
  leaveRequests?: LeaveRequest[];
}

const DAYS: { key: DayOfWeek; th: string; en: string; color: string }[] = [
  { key: 'mon', th: 'วันจันทร์', en: 'Monday', color: 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200' },
  { key: 'tue', th: 'วันอังคาร', en: 'Tuesday', color: 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200' },
  { key: 'wed', th: 'วันพุธ', en: 'Wednesday', color: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200' },
  { key: 'thu', th: 'วันพฤหัสบดี', en: 'Thursday', color: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700 text-orange-950 dark:text-orange-200' },
  { key: 'fri', th: 'วันศุกร์', en: 'Friday', color: 'bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-200' }
];

const MAX_LESSON_PERIODS = 12;
const ALL_CLASSROOMS = '__all_classrooms__';
const UNASSIGNED_GRADE_LEVEL = 'ไม่ระบุระดับชั้น';
type TimetableScheduleFilters = {
  gradeLevel: string;
  classRoom: string;
  teacherName: string;
};
type TimetableConflict = {
  key: string;
  slotA: TimetableSlot;
  slotB: TimetableSlot;
  reasons: string[];
  overlapStart: number | null;
  overlapEnd: number | null;
};
type TimetableConflictCandidate = Pick<
  TimetableSlot,
  'dayOfWeek' | 'periodNumber' | 'startTime' | 'endTime' | 'teacherName' | 'coTeacherName' | 'room' | 'classRoom'
>;

const getAcademicPeriodKey = (academicYear: string, semester: string) => JSON.stringify([academicYear, semester]);

const COLOR_CLASSES: Record<string, string> = {
  sky: 'bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-100 hover:bg-sky-200 dark:hover:bg-sky-900',
  emerald: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-200 dark:hover:bg-emerald-900',
  amber: 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900',
  rose: 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 hover:bg-rose-200 dark:hover:bg-rose-900',
  purple: 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-900',
  indigo: 'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-900',
  cyan: 'bg-cyan-100 dark:bg-cyan-950 border-cyan-300 dark:border-cyan-700 text-cyan-950 dark:text-cyan-100 hover:bg-cyan-200 dark:hover:bg-cyan-900'
};

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
}) => {
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const roomOptions = savedRoomOptions?.length ? savedRoomOptions : presets.roomOptions;
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const workloadMinPeriods = Math.min(60, Math.max(0,
    Number.isInteger(teachingLoadMinPeriods)
      ? teachingLoadMinPeriods ?? DEFAULT_TEACHING_LOAD_MIN_PERIODS
      : DEFAULT_TEACHING_LOAD_MIN_PERIODS
  ));
  const workloadMaxPeriods = Math.min(60, Math.max(workloadMinPeriods,
    Number.isInteger(teachingLoadMaxPeriods)
      ? teachingLoadMaxPeriods ?? DEFAULT_TEACHING_LOAD_MAX_PERIODS
      : DEFAULT_TEACHING_LOAD_MAX_PERIODS
  ));
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
  const canEditTimetableSlots = isViewingCurrentTerm
    && ['admin', 'super_admin', 'teacher'].includes(currentRole)
    && Boolean(onUpdateSlot);
  const slots = allTimetableSlots.filter((slot) => (
    (slot.academicYear || academicYear) === viewAcademicYear &&
    (slot.semester || currentSemester) === viewSemester
  ));

  // Main view mode: classroom schedule, attendance-hours criteria, staff workload summary, or substitute finder.
  const [viewMode, setViewMode] = useState<'classroom' | 'calendar' | 'hours_criteria' | 'workload' | 'substitute'>('classroom');
  const [workloadSearchTerm, setWorkloadSearchTerm] = useState('');
  const [workloadStatusFilter, setWorkloadStatusFilter] = useState<'all' | 'scheduled' | 'unassigned' | 'low' | 'within' | 'high'>('all');
  const [workloadMinDraft, setWorkloadMinDraft] = useState(String(workloadMinPeriods));
  const [workloadMaxDraft, setWorkloadMaxDraft] = useState(String(workloadMaxPeriods));
  const [workloadSettingsError, setWorkloadSettingsError] = useState<string | null>(null);
  const [isSavingWorkloadSettings, setIsSavingWorkloadSettings] = useState(false);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => (
    getCalendarWeekStart(getBangkokDateInputValue())
  ));
  const [subDate, setSubDate] = useState<string>(() => getBangkokDateInputValue());
  const [subSelectedTeacher, setSubSelectedTeacher] = useState<string>('');
  const [sentSubRequests, setSentSubRequests] = useState<Record<string, boolean>>({});
  const [assigningSubSlotKey, setAssigningSubSlotKey] = useState<string | null>(null);
  const [subNotice, setSubNotice] = useState<string | null>(null);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);

  // Classroom selection
  const uniqueClassRooms = Array.from(
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
  const handleViewModeChange = (mode: typeof viewMode) => {
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
  const [pendingSlotConfirm, setPendingSlotConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'primary' | 'danger';
    onConfirm: () => Promise<void>;
  } | null>(null);
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
  const formatTimeMinutes = (minutes: number) => (
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  );
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
      if (loggedInCourseTeacherKey) {
        setCatalogTeacherFilter(loggedInCourseTeacherKey);
        setHoursTeacherFilter(loggedInCourseTeacherKey);
      }
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
  const teacherWorkloadRows = [...workloadPeople.entries()]
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

  const findFreeSubstitutesForSlot = (targetSlot: TimetableSlot) => {
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

      // Recommend color tag by category
      if (c.category === 'stem') setNewColor('emerald');
      else if (c.category === 'core') setNewColor('sky');
      else if (c.category === 'language') setNewColor('amber');
      else if (c.category === 'arts') setNewColor('rose');
      else if (c.category === 'social') setNewColor('amber');
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
    // Use 0 for primary break if missing, else 90..99 for extra breaks
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
  const classroomCourseMap: Record<string, { code: string; titleTh: string; titleEn: string; teacher: string; scheduledPeriods: number; course?: Course }> = {};
  
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
  })) as Course[];
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

  const renderRoomAndTermControls = (showRoomFilter = true) => (
    <div className="fn-group-tone print:hidden">
      <span className="fn-group-label">
        {lang === 'th' ? 'ขอบเขตตาราง' : 'Scope'}
      </span>
      {hasTeacherTimetableMatch && (
        <button
          type="button"
          aria-pressed={myCoursesOnly}
          data-active={myCoursesOnly}
          onClick={() => {
            const next = !myCoursesOnly;
            setMyCoursesOnly(next);
            if (next) {
              setActiveScheduleFilters(null);
              setSelectedClassRoom(ALL_CLASSROOMS);
              if (loggedInCourseTeacherKey) {
                setHoursTeacherFilter(loggedInCourseTeacherKey);
              }
            } else {
              setHoursTeacherFilter('all');
            }
          }}
          className="btn-tool-neutral min-h-8 px-2.5 py-1 text-xs"
          title={myCoursesOnly ? 'กำลังแสดงเฉพาะวิชาที่ฉันสอน คลิกเพื่อดูทั้งโรงเรียน' : 'กรองเฉพาะวิชาที่ฉันสอน'}
        >
          <UserCheck className="h-3.5 w-3.5 tone-text" />
          <span>เฉพาะวิชาที่ฉันสอน</span>
        </button>
      )}
      {showRoomFilter && (activeScheduleFilters ? (
        <div className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs">
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
            className="min-h-8 max-w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value={ALL_CLASSROOMS} disabled={viewMode === 'hours_criteria' && !myCoursesOnly}>
              ทุกห้อง ({uniqueClassRooms.length})
            </option>
            {uniqueClassRooms.map((room) => (
              <option key={room} value={room}>
                {room} ({students.filter((student) => student.room === room).length} นักเรียน)
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
                  className="min-h-9 w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs text-[var(--color-text-title)]"
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
                  className="min-h-9 rounded-lg bg-[var(--color-primary)] px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRoomInput(false)}
                  className="min-h-9 px-1.5 py-1 text-[11px] text-[var(--color-text-muted)]"
                  aria-label="ยกเลิกเพิ่มห้อง"
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddRoomInput(true)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)]"
              >
                <Plus className="h-3 w-3" />
                เพิ่มห้อง
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
        className="min-h-9 max-w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
      >
        {academicPeriodOptions.map((period) => (
          <option key={period.key} value={period.key}>
            {formatSemesterLabel(period.semester)} · {period.academicYear}
            {period.key === activeAcademicPeriodKey ? ' · ปัจจุบัน' : ''}
          </option>
        ))}
      </select>
      {!isViewingCurrentTerm && (
        <span className="inline-flex min-h-9 items-center rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[10px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
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
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-xs font-semibold text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
          title="แก้ไขปีการศึกษาและภาคเรียนปัจจุบันของโรงเรียน"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
          <span>ตั้งค่าเทอมปัจจุบัน</span>
        </button>
      )}
      {showRoomFilter && roomOptionsError && <span role="alert" className="text-xs text-rose-700">{roomOptionsError}</span>}
    </div>
  );

  return (
    <div className={`${getModuleTone('timetable')} h-full flex flex-col min-h-0 overflow-hidden space-y-1.5`}>
      {/* Ultra-Compact Single-Row Page Heading and Schedule Controls */}
      <div className="shrink-0 px-3 py-1.5 app-page-header print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="tone-chip w-6 h-6 rounded-lg">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
            </span>
            <div className="min-w-0 flex items-baseline gap-2">
              <h1 className="text-sm font-bold text-[var(--color-text-title)] leading-tight truncate">
                ตารางเรียนและตารางสอน
              </h1>
              <span className="hidden xl:inline module-category-kicker">
                {lang === 'th' ? timetableGroup.labelTh : timetableGroup.labelEn}
              </span>
            </div>
            <ModuleTourTrigger moduleId="timetable" lang={lang} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            <nav data-guide-id="timetable-view-tabs" aria-label="หน้าตารางเรียนและตารางสอน" className="seg-tab-group max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                aria-pressed={viewMode === 'classroom'}
                data-active={viewMode === 'classroom'}
                onClick={() => handleViewModeChange('classroom')}
                className="seg-tab-btn inline-flex shrink-0 items-center gap-1"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>ตารางห้อง</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'calendar'}
                data-active={viewMode === 'calendar'}
                onClick={() => handleViewModeChange('calendar')}
                className="seg-tab-btn inline-flex shrink-0 items-center gap-1"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>ปฏิทิน</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'hours_criteria'}
                data-active={viewMode === 'hours_criteria'}
                onClick={() => handleViewModeChange('hours_criteria')}
                className="seg-tab-btn inline-flex shrink-0 items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>เวลาเรียน 80%</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'workload'}
                data-active={viewMode === 'workload'}
                onClick={() => handleViewModeChange('workload')}
                className="seg-tab-btn inline-flex shrink-0 items-center gap-1"
              >
                <Users className="h-3.5 w-3.5" />
                <span>ภาระงานครู</span>
                {(lowWorkloadCount > 0 || highWorkloadCount > 0) && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-slate-950">
                    {lowWorkloadCount + highWorkloadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'substitute'}
                data-active={viewMode === 'substitute'}
                onClick={() => handleViewModeChange('substitute')}
                className="seg-tab-btn inline-flex shrink-0 items-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>หาครูสอนแทน</span>
                {teacherLeavesToday.length > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white">
                    {teacherLeavesToday.length}
                  </span>
                )}
              </button>
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

      {/* Slim Conflict Warning Strip (if any) */}
      {conflicts.length > 0 && (
        <details className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100">
          <summary className="flex min-h-7 cursor-pointer list-none items-center gap-2 px-2.5 py-1 text-[11px] font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <span className="truncate">พบข้อขัดแย้งตารางเรียน {conflicts.length} คู่ในภาคเรียนที่เลือก · คาบที่เกี่ยวข้องมีกรอบสีส้ม</span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0" />
          </summary>
          <div className="max-h-80 space-y-2 overflow-y-auto border-t border-amber-200 px-3 py-2 dark:border-amber-800">
            <p className="text-[10px]">
              ตรวจสอบรายการที่ชนกัน แล้วเปิดรายละเอียดของคาบเพื่อแก้ไขครูผู้สอน ห้องเรียน ห้องสถานที่ หรือเวลา
            </p>
            {conflicts.map(({ key, slotA, slotB, reasons, overlapStart, overlapEnd }) => {
              const dayLabel = DAYS.find((day) => day.key === slotA.dayOfWeek)?.th || slotA.dayOfWeek;
              const periodLabel = slotA.periodNumber === slotB.periodNumber
                ? `คาบ ${slotA.periodNumber}`
                : `คาบ ${slotA.periodNumber} และ ${slotB.periodNumber}`;
              const overlapLabel = overlapStart !== null && overlapEnd !== null
                ? `${formatTimeMinutes(overlapStart)}–${formatTimeMinutes(overlapEnd)}`
                : 'เวลาเดียวกัน';
              return (
                <div key={key} className="rounded-lg border border-amber-200 bg-white/70 p-2 dark:border-amber-800 dark:bg-black/20">
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold">
                    <span>{dayLabel} · {periodLabel} · เวลาซ้อน {overlapLabel}</span>
                    <span className="font-normal text-amber-800 dark:text-amber-200">
                      ชนกัน: {reasons.join(' · ')}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[slotA, slotB].map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => openConflictSlot(slot)}
                        className="flex min-w-0 flex-col items-start gap-0.5 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1.5 text-left text-[10px] hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/50"
                      >
                        <span className="w-full truncate font-bold">
                          {slot.courseCode} · {slot.courseTitleTh}
                        </span>
                        <span>ห้องเรียน {slot.classRoom || 'ไม่ระบุ'} · ครู {formatSlotTeachersDisplay(slot)}</span>
                        <span>
                          สถานที่ {slot.room || 'ไม่ระบุ'} · {canEditTimetableSlots ? 'แก้ไขคาบนี้' : 'เปิดรายละเอียดคาบนี้'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* MAIN VIEW CONTENT: Grid Table, Substitute Finder, Workload, or Hours Criteria */}
      {viewMode === 'substitute' ? (
        <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
          <header className="shrink-0 border-b border-[var(--color-border)] p-2.5 sm:px-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-title)]">
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>จัดหาครูสอนแทนอัตโนมัติ</span>
                  <span className="hidden xl:inline text-[11px] font-normal text-[var(--color-text-muted)]">
                    · เรียงจากกลุ่มสาระเดียวกันและภาระสอนน้อยที่สุดก่อน
                  </span>
                </h2>
              </div>
              {renderRoomAndTermControls(false)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="space-y-1 text-[11px] font-semibold text-[var(--color-text-body)]">
                <span>วันที่ต้องการหาครูสอนแทน</span>
                <input
                  type="date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-[var(--color-text-body)] sm:col-span-2">
                <span>เลือกครูที่ลา / ติดภารกิจราชการ ({subDayMeta.th})</span>
                <select
                  value={resolvedAbsentTeacher}
                  onChange={(e) => setSubSelectedTeacher(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  {subTeacherSelectableList.length === 0 ? (
                    <option value="">ยังไม่มีรายชื่อครูในภาคเรียนนี้</option>
                  ) : (
                    subTeacherSelectableList.map((name) => {
                      const isOnLeave = absentTeacherNameKeysOnSubDate.has(normalizeTeacherName(name));
                      return (
                        <option key={name} value={name}>
                          {name}{isOnLeave ? ' · (แจ้งลาในวันที่เลือก)' : ''}
                        </option>
                      );
                    })
                  )}
                </select>
              </label>
            </div>

            {teacherLeavesOnSubDate.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-bold">ครูที่มีใบลาวันที่ {subDate}:</span>
                {teacherLeavesOnSubDate.map((leave) => (
                  <button
                    key={leave.id}
                    type="button"
                    onClick={() => setSubSelectedTeacher(leave.userName)}
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                      normalizeTeacherName(leave.userName) === normalizeTeacherName(resolvedAbsentTeacher)
                        ? 'border-amber-500 bg-amber-200/80 text-amber-950 dark:bg-amber-900 dark:text-amber-100'
                        : 'border-amber-300 bg-white/80 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-black/20 dark:text-amber-200'
                    }`}
                  >
                    {leave.userName} ({leave.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'})
                  </button>
                ))}
              </div>
            )}

            {isSubWeekendDate && (
              <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/30 px-3 py-1.5 text-[11px] text-sky-900 dark:text-sky-200">
                วันที่เลือกตรงกับวันเสาร์/อาทิตย์ ระบบจึงจำลองตารางสอนของ<strong>วันจันทร์</strong>ให้ตรวจเช็กคิวสอนแทนล่วงหน้า
              </div>
            )}

            {subNotice && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {subNotice}
                </span>
                <button type="button" onClick={() => setSubNotice(null)} className="text-xs font-bold px-1.5 cursor-pointer">✕</button>
              </div>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {!resolvedAbsentTeacher ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                กรุณาเลือกครูที่ต้องการหาผู้สอนแทน หรือเพิ่มข้อมูลบุคลากรและตารางสอนก่อน
              </div>
            ) : absentTeacherSlotsOnDay.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center space-y-1">
                <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 opacity-80" />
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  {resolvedAbsentTeacher} ไม่มีคาบสอนใน{subDayMeta.th}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  ไม่ต้องจัดหาครูสอนแทนสำหรับวันนี้ (ช่วยลดภาระการประสานงานได้ทันที)
                </p>
              </div>
            ) : (
              absentTeacherSlotsOnDay.map((slot) => {
                const freeCandidates = findFreeSubstitutesForSlot(slot);
                const isLeaveSpecificOtherPeriod =
                  resolvedAbsentTeacherLeave?.leaveScope === 'period_hourly' &&
                  typeof resolvedAbsentTeacherLeave.periodNumber === 'number' &&
                  resolvedAbsentTeacherLeave.periodNumber !== slot.periodNumber;
                return (
                  <div
                    key={slot.id}
                    className={`rounded-2xl border p-3.5 space-y-3 ${
                      isLeaveSpecificOtherPeriod
                        ? 'border-[var(--color-border)] bg-[var(--color-card-subtle)] opacity-75'
                        : 'border-amber-200 dark:border-amber-800 bg-[var(--color-card)] shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 dark:bg-amber-950 px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-200">
                          <Clock className="h-3.5 w-3.5" />
                          คาบ {slot.periodNumber} ({slot.startTime}–{slot.endTime})
                        </span>
                        <span className="text-xs font-bold text-[var(--color-text-title)]">
                          {slot.courseCode} · {slot.courseTitleTh}
                        </span>
                        <span className="rounded-md bg-[var(--color-card-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-body)]">
                          ห้อง {slot.classRoom} {slot.room ? `(${slot.room})` : ''}
                        </span>
                        {isLeaveSpecificOtherPeriod && (
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                            ใบลาขอเฉพาะคาบ {resolvedAbsentTeacherLeave?.periodNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        พบครูว่าง {freeCandidates.length} ท่าน
                      </span>
                    </div>

                    {freeCandidates.length === 0 ? (
                      <p className="text-xs text-rose-700 dark:text-rose-300">
                        ไม่มีครูว่างในคาบเวลานี้ (ครูทุกท่านมีคาบสอนซ้อนหรือติดวันลา)
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {freeCandidates.slice(0, 6).map((candidate) => {
                          const requestKey = `${slot.id}::${normalizeTeacherName(candidate.name)}`;
                          const isSent = Boolean(sentSubRequests[requestKey]);
                          const isAssigning = assigningSubSlotKey === requestKey;
                          return (
                            <div
                              key={candidate.name}
                              className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 ${
                                candidate.alreadyCoTeacher
                                  ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/30'
                                  : candidate.sameDepartment
                                    ? 'border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20'
                                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="truncate text-xs font-bold text-[var(--color-text-title)]">
                                    {candidate.name}
                                  </span>
                                  <span className="shrink-0 rounded-md bg-white/80 dark:bg-black/20 border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--color-text-body)]">
                                    {candidate.periodCount} คาบ/สัปดาห์
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                                  {candidate.alreadyCoTeacher && (
                                    <span className="rounded bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 font-bold text-emerald-800 dark:text-emerald-200">
                                      สอนคู่/แทนอยู่แล้ว
                                    </span>
                                  )}
                                  {candidate.sameDepartment && (
                                    <span className="rounded bg-sky-100 dark:bg-sky-900 px-1.5 py-0.5 font-bold text-sky-800 dark:text-sky-200">
                                      กลุ่มสาระเดียวกัน
                                    </span>
                                  )}
                                  {candidate.teacher?.department && (
                                    <span className="truncate">{candidate.teacher.department}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-border)]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleRequestSubstituteTeacher(slot, candidate.name);
                                  }}
                                  className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                                    isSent
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[var(--color-primary)] text-white hover:opacity-95'
                                  }`}
                                >
                                  <Send className="h-3 w-3" />
                                  <span>{isSent ? 'ส่งแจ้งเตือนแล้ว ✓' : 'แจ้งขอสอนแทน'}</span>
                                </button>
                                {canEditTimetableSlots && onUpdateSlot && !candidate.alreadyCoTeacher && (
                                  <button
                                    type="button"
                                    disabled={isAssigning}
                                    onClick={() => {
                                      void handleAssignSubstituteToSlot(slot, candidate.name);
                                    }}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                                    title="เพิ่มเป็นครูสอนคู่/สอนแทนในตารางสอนจริง"
                                  >
                                    <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>{isAssigning ? 'กำลังบันทึก...' : 'ลงตารางแทน'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : viewMode === 'workload' ? (
        <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
          <header className="shrink-0 border-b border-[var(--color-border)] px-3 py-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-title)]">
                  <Users className="h-4 w-4 text-[var(--color-primary-text)] shrink-0" />
                  <span>ภาระงานสอนรายบุคคล</span>
                </h2>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  เกณฑ์คัดกรองเบื้องต้น {workloadMinPeriods}–{workloadMaxPeriods} คาบ/สัปดาห์ · คำนวณจากตารางสอนจริง
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {renderRoomAndTermControls(false)}
                {isAdmin && onUpdateTeachingLoadThresholds && (
                  <details className="relative">
                    <summary
                      className="btn-tool-neutral list-none px-2.5 py-1.5 text-[11px]"
                      onClick={() => {
                        setWorkloadMinDraft(String(workloadMinPeriods));
                        setWorkloadMaxDraft(String(workloadMaxPeriods));
                        setWorkloadSettingsError(null);
                      }}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
                      <span>ตั้งค่าเกณฑ์</span>
                      <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
                    </summary>
                    <form
                      onSubmit={handleSaveTeachingLoadThresholds}
                      className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xl space-y-2.5 text-left"
                    >
                      <div className="text-[11px] font-bold text-[var(--color-text-title)]">
                        เกณฑ์ภาระงานสอนครู (ไม่ใช่เกณฑ์ตำแหน่ง)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                          ขั้นต่ำ (คาบ/สัปดาห์)
                          <input
                            type="number"
                            min={0}
                            max={60}
                            step={1}
                            value={workloadMinDraft}
                            onChange={(event) => setWorkloadMinDraft(event.target.value)}
                            aria-label="จำนวนคาบขั้นต่ำต่อสัปดาห์"
                            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1 text-xs text-[var(--color-text-title)]"
                          />
                        </label>
                        <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                          สูงสุด (คาบ/สัปดาห์)
                          <input
                            type="number"
                            min={0}
                            max={60}
                            step={1}
                            value={workloadMaxDraft}
                            onChange={(event) => setWorkloadMaxDraft(event.target.value)}
                            aria-label="จำนวนคาบสูงสุดต่อสัปดาห์"
                            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1 text-xs text-[var(--color-text-title)]"
                          />
                        </label>
                      </div>
                      {workloadSettingsError && (
                        <p role="alert" className="text-[10px] text-rose-700 dark:text-rose-300">
                          {workloadSettingsError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={isSavingWorkloadSettings}
                        className="w-full rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60 cursor-pointer"
                      >
                        {isSavingWorkloadSettings ? 'กำลังบันทึก…' : 'บันทึกเกณฑ์'}
                      </button>
                    </form>
                  </details>
                )}
              </div>
            </div>

            {/* Compact Single-Row 5-Filter Stat Strip */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              <button
                type="button"
                aria-pressed={workloadStatusFilter === 'all'}
                onClick={() => setWorkloadStatusFilter('all')}
                className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-left transition hover:border-[var(--color-primary)] cursor-pointer ${workloadStatusFilter === 'all' ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
              >
                <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">ครูทั้งหมด</span>
                <span className="text-xs font-extrabold tabular-nums text-[var(--color-text-title)] shrink-0">{teacherWorkloadRows.length} คน</span>
              </button>
              <button
                type="button"
                aria-pressed={workloadStatusFilter === 'unassigned'}
                onClick={() => setWorkloadStatusFilter('unassigned')}
                className={`flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-left transition hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900/40 cursor-pointer ${workloadStatusFilter === 'unassigned' ? 'ring-2 ring-slate-400' : ''}`}
              >
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">ยังไม่มีคาบ</span>
                <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-slate-100 shrink-0">{unassignedWorkloadCount} คน</span>
              </button>
              <button
                type="button"
                aria-pressed={workloadStatusFilter === 'low'}
                onClick={() => setWorkloadStatusFilter('low')}
                className={`flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-left transition hover:border-amber-500 dark:border-amber-800 dark:bg-amber-950/40 cursor-pointer ${workloadStatusFilter === 'low' ? 'ring-2 ring-amber-400' : ''}`}
              >
                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200 truncate">ต่ำกว่า {workloadMinPeriods} คาบ</span>
                <span className="text-xs font-extrabold tabular-nums text-amber-900 dark:text-amber-100 shrink-0">{lowWorkloadCount} คน</span>
              </button>
              <button
                type="button"
                aria-pressed={workloadStatusFilter === 'within'}
                onClick={() => setWorkloadStatusFilter('within')}
                className={`flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-left transition hover:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/40 cursor-pointer ${workloadStatusFilter === 'within' ? 'ring-2 ring-emerald-400' : ''}`}
              >
                <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200 truncate">{workloadMinPeriods}–{workloadMaxPeriods} คาบ</span>
                <span className="text-xs font-extrabold tabular-nums text-emerald-900 dark:text-emerald-100 shrink-0">{withinWorkloadCount} คน</span>
              </button>
              <button
                type="button"
                aria-pressed={workloadStatusFilter === 'high'}
                onClick={() => setWorkloadStatusFilter('high')}
                className={`flex items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-left transition hover:border-rose-500 dark:border-rose-800 dark:bg-rose-950/40 cursor-pointer ${workloadStatusFilter === 'high' ? 'ring-2 ring-rose-400' : ''}`}
              >
                <span className="text-[11px] font-medium text-rose-800 dark:text-rose-200 truncate">มากกว่า {workloadMaxPeriods} คาบ</span>
                <span className="text-xs font-extrabold tabular-nums text-rose-900 dark:text-rose-100 shrink-0">{highWorkloadCount} คน</span>
              </button>
            </div>
          </header>

          <div className="shrink-0 grid gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.5fr)_auto]">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                value={workloadSearchTerm}
                onChange={(event) => setWorkloadSearchTerm(event.target.value)}
                placeholder="ค้นหาชื่อครู วิชา รหัสวิชา หรือห้อง"
                aria-label="ค้นหาภาระงานครู"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
              />
            </label>
            <select
              value={workloadStatusFilter}
              onChange={(event) => {
                const value = event.target.value;
                if (['all', 'scheduled', 'unassigned', 'low', 'within', 'high'].includes(value)) {
                  setWorkloadStatusFilter(value as typeof workloadStatusFilter);
                }
              }}
              aria-label="กรองตามสถานะภาระงาน"
              className="w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)]"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="scheduled">มีคาบสอนแล้ว</option>
              <option value="unassigned">ยังไม่มีคาบ</option>
              <option value="low">ต่ำกว่า {workloadMinPeriods} คาบ</option>
              <option value="within">{workloadMinPeriods}–{workloadMaxPeriods} คาบ</option>
              <option value="high">มากกว่า {workloadMaxPeriods} คาบ</option>
            </select>
            <span className="self-center text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)] sm:text-right">
              พบ {filteredTeacherWorkloadRows.length} / {teacherWorkloadRows.length} คน
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-1.5 sm:p-2">
            {filteredTeacherWorkloadRows.length === 0 ? (
              <p className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                {teacherWorkloadRows.length === 0
                  ? 'ยังไม่มีรายชื่อครูหรือข้อมูลผู้สอนในตารางสอน'
                  : 'ไม่พบรายชื่อที่ตรงกับคำค้นหาหรือตัวกรอง'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredTeacherWorkloadRows.map((teacher) => (
                  <details
                    key={normalizeTeacherName(teacher.name)}
                    className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]"
                  >
                    <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 hover:bg-[var(--color-card-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:grid-cols-[minmax(0,1fr)_minmax(8rem,1fr)_auto_auto] [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          teacher.status === 'high'
                            ? 'bg-rose-500'
                            : teacher.status === 'low'
                              ? 'bg-amber-500'
                              : teacher.status === 'unassigned'
                                ? 'bg-slate-400'
                                : 'bg-emerald-500'
                        }`} />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[var(--color-text-title)]">{teacher.name}</div>
                          {teacher.teacher?.positionTitle && (
                            <div className="truncate text-[10px] text-[var(--color-text-muted)]">{teacher.teacher.positionTitle}</div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-24 max-w-48">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-sm font-bold tabular-nums text-[var(--color-text-title)]">
                            {teacher.periodCount} <span className="font-sans text-[10px] font-medium">คาบ</span>
                          </span>
                          <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
                            {teacher.hours.toFixed(1)} ชม.
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={`ภาระงานสอนของ${teacher.name}`}
                          aria-valuemin={0}
                          aria-valuemax={workloadMaxPeriods}
                          aria-valuenow={Math.min(teacher.periodCount, workloadMaxPeriods)}
                          aria-valuetext={`${teacher.periodCount} คาบต่อสัปดาห์; เกณฑ์เบื้องต้น ${workloadMinPeriods}–${workloadMaxPeriods} คาบ`}
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-card-subtle)]"
                        >
                          <div
                            className={`h-full rounded-full ${
                              teacher.status === 'high'
                                ? 'bg-rose-500'
                                : teacher.status === 'low'
                                  ? 'bg-amber-500'
                                  : teacher.status === 'unassigned'
                                    ? 'bg-slate-400'
                                    : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min((teacher.periodCount / Math.max(workloadMaxPeriods, 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {teacher.status === 'unassigned' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          ยังไม่มีคาบ
                        </span>
                      ) : teacher.status === 'low' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                          <AlertCircle className="h-3 w-3" /> ต่ำกว่า {workloadMinPeriods}
                        </span>
                      ) : teacher.status === 'high' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200">
                          <AlertTriangle className="h-3 w-3" /> เกิน {workloadMaxPeriods}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> {workloadMinPeriods}–{workloadMaxPeriods}
                        </span>
                      )}

                      <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-semibold text-[var(--color-primary-text)]">
                        {teacher.subjects.length > 0 ? `${teacher.subjects.length} วิชา` : 'ดูข้อมูล'}
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                      </span>
                    </summary>

                    <div className="border-t border-[var(--color-border)] p-3">
                      {teacher.subjects.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {teacher.subjects.map((subject) => (
                            <div key={`${subject.code}-${subject.title}`} className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5">
                              <div className="flex flex-wrap items-baseline justify-between gap-1">
                                <span className="min-w-0 break-words text-xs font-semibold text-[var(--color-text-body)]">
                                  <span className="font-mono font-bold text-[var(--color-primary-text)]">{subject.code}</span>
                                  {subject.title ? ` · ${subject.title}` : ''}
                                  {subject.coTaughtPeriods > 0 && (
                                    <span className="ml-1.5 inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                      สอนคู่ ({subject.coTaughtPeriods} คาบ)
                                    </span>
                                  )}
                                </span>
                                <span className="whitespace-nowrap text-[10px] font-semibold text-[var(--color-text-muted)]">
                                  {subject.periodCount} คาบ/สัปดาห์
                                </span>
                              </div>
                              {subject.rooms.length > 0 && (
                                <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                                  ห้อง {subject.rooms.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)]">ยังไม่มีรายวิชาในตารางสอน</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : viewMode === 'hours_criteria' ? (
        /* TAB: Academic Hours Criteria & 80% Attendance Table */
        <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col p-2.5 sm:p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>เกณฑ์ชั่วโมงเรียน 80% ปพ.5</span>
                  <span className="hidden xl:inline text-[11px] font-normal text-[var(--color-text-muted)]">
                    · คำนวณจากภาคเรียน 20 สัปดาห์
                  </span>
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-semibold">
                  ขาดเรียนได้ไม่เกิน 20%
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {renderRoomAndTermControls()}
                {hoursTeacherOptions.length > 0 && (
                  <div className="fn-group">
                    <span className="fn-group-label text-[var(--color-text-muted)]">ผู้สอน</span>
                    <select
                      aria-label="กรองวิชาตามรายชื่อครู"
                      value={effectiveHoursTeacherFilter}
                      onChange={(e) => setHoursTeacherFilter(e.target.value)}
                      className="min-h-8 max-w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)] print:hidden"
                    >
                      <option value="all">ครูผู้สอนทุกคน ({hoursTeacherOptions.length})</option>
                      {hoursTeacherOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label} ({opt.count} วิชา)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="table-comfortable w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)] font-bold text-[11px]">
                  <th className="p-3">รหัสวิชา</th>
                  <th className="p-3">ชื่อวิชา (ไทย / EN)</th>
                  <th className="p-3">ครูผู้สอน</th>
                  {showCreditsColumn && <th className="p-3 text-center">หน่วยกิต</th>}
                  <th className="p-3 text-center">คาบจัดสอนจริง</th>
                  <th className="p-3 text-center">ชั่วโมงรวม/เทอม (20 สัปดาห์)</th>
                  <th className="p-3 text-center">เกณฑ์เวลาเรียน 80%</th>
                  <th className="p-3 text-center">ขาดได้สูงสุด (20%)</th>
                  <th className="p-3 text-center">สถานะความครบถ้วน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {classroomCoursesList.length === 0 ? (
                  <tr>
                    <td colSpan={showCreditsColumn ? 9 : 8} className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                      ยังไม่มีการจัดตารางสอนสำหรับห้องนี้ กดปุ่ม &quot;+ เพิ่มคาบเรียน&quot; เพื่อเริ่มต้นจัดตาราง
                    </td>
                  </tr>
                ) : (
                  classroomCoursesList.map((item) => {
                    const credits = item.course?.credits ?? 1.5;
                    const requiredWeeklyPeriods = item.course?.weeklyHours ?? (credits > 0 ? Math.round(credits * 2) : 1);
                    const totalHours = item.scheduledPeriods * 20; // 20 weeks
                    const minAttendanceHours = Math.round(totalHours * 0.8);
                    const maxAllowedAbsentHours = totalHours - minAttendanceHours;
                    const isComplete = item.scheduledPeriods === requiredWeeklyPeriods;
                    const isUnder = item.scheduledPeriods < requiredWeeklyPeriods;

                    return (
                      <tr key={item.code} className="hover:bg-[var(--color-card-subtle)] transition">
                        <td className="p-3 font-mono font-bold text-[var(--color-primary-text)]">
                          {item.code}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-[var(--color-text-title)]">{item.titleTh}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)]">{item.titleEn}</div>
                        </td>
                        <td className="p-3 text-[var(--color-text-body)]">
                          {item.teacher}
                        </td>
                        {showCreditsColumn && (
                          <td className="p-3 text-center font-bold text-[var(--color-text-title)]">
                            {shouldShowCourseCredits(item.code, showPrimaryCourseCredits) && (credits === 0 ? 'ไม่มีหน่วยกิต' : credits)}
                          </td>
                        )}
                        <td className="p-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded ${
                            isComplete
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                              : isUnder
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
                          }`}>
                            {item.scheduledPeriods} คาบ/สัปดาห์
                          </span>
                        </td>
                        <td className="p-3 text-center font-semibold text-[var(--color-text-title)]">
                          {totalHours} ชั่วโมง
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">
                          {minAttendanceHours} ชั่วโมง (80%)
                        </td>
                        <td className="p-3 text-center font-bold text-rose-700 dark:text-rose-300">
                          {maxAllowedAbsentHours} ชั่วโมง
                        </td>
                        <td className="p-3 text-center">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>ครบตามเกณฑ์</span>
                            </span>
                          ) : isUnder ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>ขาดอีก {requiredWeeklyPeriods - item.scheduledPeriods} คาบ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                              <Info className="w-3.5 h-3.5" />
                              <span>จัดเสริม +{item.scheduledPeriods - requiredWeeklyPeriods} คาบ</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
          <header className="shrink-0 space-y-2 border-b border-[var(--color-border)] p-2.5 sm:px-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-bold text-[var(--color-text-title)]">ปฏิทินตารางสอนรายสัปดาห์</h2>
                <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  {calendarWeekRangeLabel} · {activeSlots.length} คาบ/สัปดาห์
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  <label className="sr-only" htmlFor="timetable-calendar-week">เลือกสัปดาห์</label>
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
                <div className="fn-group">
                  <button
                    type="button"
                    onClick={() => setShowImportExportModal(true)}
                    className="btn-tool-neutral px-2.5 py-1.5"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Export / Import</span>
                  </button>
                  <button
                    type="button"
                    onClick={openGoogleCalendarModal}
                    className="btn-action-primary px-2.5 py-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Google Calendar</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {renderRoomAndTermControls()}
              <p className="text-[10px] text-[var(--color-text-muted)]">
                ใช้ปุ่มลูกศรเปลี่ยนสัปดาห์ · เลือกห้องเพื่อกรองตาราง
              </p>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {activeSlots.length === 0 ? (
              <p className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                ไม่มีคาบสอนในตัวกรองหรือภาคเรียนที่เลือก
              </p>
            ) : (
              <div aria-label="ปฏิทินตารางสอนรายสัปดาห์" className="grid min-w-[900px] grid-cols-5 gap-2">
                {calendarWeekDays.map((day) => {
                  const daySlots = activeSlots
                    .filter((slot) => slot.dayOfWeek === day.key)
                    .sort((a, b) => (
                      (getSlotTimeRange(a)?.start ?? 0) - (getSlotTimeRange(b)?.start ?? 0)
                        || a.periodNumber - b.periodNumber
                    ));
                  return (
                    <section key={day.key} aria-label={formatCalendarDate(day.date)} className="min-h-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2">
                      <header className="sticky top-0 z-10 mb-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2">
                        <h3 className="text-[11px] font-bold text-[var(--color-text-title)]">{formatCalendarDate(day.date)}</h3>
                        <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">{daySlots.length} คาบ</p>
                      </header>
                      <div className="space-y-2">
                        {daySlots.length === 0 ? (
                          <p className="py-6 text-center text-[10px] text-[var(--color-text-muted)]">ไม่มีคาบ</p>
                        ) : daySlots.map((slot) => {
                          const timeRange = getSlotTimeRange(slot);
                          const hasCoTeacher = getSlotTeachers(slot).length > 1;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => openSlotDetails(slot)}
                              className={`w-full rounded-lg border p-2 text-left transition hover:brightness-95 ${
                                conflictingSlotIds.has(slot.id)
                                  ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50'
                                  : 'border-[var(--color-border)] bg-[var(--color-card)]'
                              }`}
                            >
                              <span className="flex items-center justify-between gap-1 text-[9px] font-semibold text-[var(--color-primary-text)]">
                                <span>{timeRange ? `${formatTimeMinutes(timeRange.start)}–${formatTimeMinutes(timeRange.end)}` : `คาบ ${slot.periodNumber}`}</span>
                                <span className="flex items-center gap-1">
                                  {hasCoTeacher && (
                                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-[8px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                      สอนคู่
                                    </span>
                                  )}
                                  {conflictingSlotIds.has(slot.id) && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />}
                                </span>
                              </span>
                              <span className="mt-1 block text-[10px] font-bold text-[var(--color-text-title)]">
                                {slot.courseCode} · {slot.courseTitleTh}
                              </span>
                              <span className="mt-1 block text-[9px] text-[var(--color-text-body)]">
                                {slot.classRoom} · {formatSlotTeachersDisplay(slot)}
                              </span>
                              {slot.room && (
                                <span className="mt-0.5 block text-[9px] text-[var(--color-text-muted)]">
                                  {slot.room}
                                </span>
                              )}
                            </button>
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
      ) : (
        /* TAB: Timetable 5-Day Weekly Grid View */
        <div className="timetable-print-area print-area flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 px-3 py-2 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 bg-[var(--color-card)]">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {renderRoomAndTermControls()}
                <span className="print:hidden text-xs text-[var(--color-text-muted)] tabular-nums">
                  แสดง <strong className="tone-text">{activeSlots.length}</strong> คาบ/สัปดาห์
                  {myCoursesOnly && (
                    <span className="ml-1 text-[11px] font-semibold tone-text">· เฉพาะวิชาที่สอน</span>
                  )}
                </span>
              </div>
              <p className="hidden print:block print:text-xs print:font-bold">
                {activeScheduleFilters
                  ? `ตารางสอน — ${activeScheduleFilters.gradeLevel || 'ทุกระดับชั้น'} · ${activeScheduleFilters.classRoom || 'ทุกห้อง'} · ${activeScheduleFilters.teacherName || 'ครูทุกคน'}`
                  : selectedClassRoom === ALL_CLASSROOMS
                    ? `ตารางรวมทุกห้อง (${uniqueClassRooms.length})`
                    : selectedClassRoom
                } — {formatSemesterLabel(viewSemester)} ปีการศึกษา {viewAcademicYear}
              </p>
            </div>
            <div className="print:hidden flex flex-wrap items-center justify-end gap-1.5">
              {isViewingCurrentTerm && (currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'super_admin') && (
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  className="btn-action-primary px-3 py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>เพิ่มคาบ</span>
                </button>
              )}

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
                  {isViewingCurrentTerm && (currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'super_admin') && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        setPeriodDraft(schoolPeriods.map((period) => ({ ...period })));
                        setPeriodSettingsError(null);
                        setShowPeriodSettings(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 tone-text" />
                      <span>ตั้งเวลาคาบเรียนมาตรฐาน</span>
                    </button>
                  )}

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
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      openGoogleCalendarModal();
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5 tone-text" />
                    <span>เชื่อมต่อ Google Calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      window.print();
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                    <span>พิมพ์ตารางสอน A4</span>
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
                        title: '⏰ [ทดสอบตารางสอน] เริ่มคาบเรียนที่ 1 (08:30 - 09:20)',
                        body: `วิชาเรียน ${courses[0]?.code || 'ว21101'} (${courses[0]?.titleTh || 'วิทยาศาสตร์'}) ห้อง ${courses[0]?.room || '401'} • อย่าลืมสแกน Barcode/QR เช็คชื่อเข้าเรียน (Check-in)`,
                        category: 'attendance',
                        priority: 'urgent',
                      });
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-emerald-700 hover:bg-[var(--color-card-subtle)] dark:text-emerald-300 cursor-pointer"
                  >
                    ⏰ ทดสอบเริ่มคาบ &amp; เช็คอิน
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      sendEduVerseNotification({
                        title: '🔔 [ทดสอบตารางสอน] สิ้นสุดคาบเรียนที่ 1 (09:20 น.)',
                        body: `หมดเวลาคาบเรียน ${courses[0]?.code || 'ว21101'} แล้ว กรุณาสแกน Barcode/QR เช็คชื่อออก (Check-out)`,
                        category: 'attendance',
                        priority: 'normal',
                      });
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-indigo-700 hover:bg-[var(--color-card-subtle)] dark:text-indigo-300 cursor-pointer"
                  >
                    🔔 ทดสอบหมดคาบ &amp; เช็คเอาท์
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      sendEduVerseNotification({
                        title: '⚠️ [ทดสอบตารางสอน] แจ้งเตือนลืมเช็คชื่อ / มาสาย',
                        body: `คาบเรียน ${courses[0]?.code || 'ว21101'} เริ่มไปแล้ว 10 นาที ระบบยังไม่พบการเช็คชื่อเข้าเรียน กรุณาสแกนด่วน`,
                        category: 'attendance',
                        priority: 'urgent',
                      });
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-amber-700 hover:bg-[var(--color-card-subtle)] dark:text-amber-300 cursor-pointer"
                  >
                    ⚠️ ทดสอบลืมเช็คชื่อ / มาสาย
                  </button>
                </div>
              </details>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
            <table className={`w-full text-left border-collapse ${
              isAllClassroomsView ? 'min-w-[1120px]' : 'min-w-[880px]'
            }`}>
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-body)] uppercase">
                  <th className="p-3 w-28 text-center font-bold text-[var(--color-text-title)]">วัน / คาบ</th>
                  {orderedSchoolPeriods.map((period) => (
                      <th key={period.periodNumber} className={`p-2.5 text-center font-medium ${period.isBreak ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 w-16' : ''}`}>
                        <div className={`font-bold ${period.isBreak ? 'text-amber-950 dark:text-amber-200' : 'text-[var(--color-text-title)]'}`}>
                          {period.labelTh || (period.isBreak ? 'พักกลางวัน' : `คาบ ${period.periodNumber}`)}
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 ${period.isBreak ? 'text-amber-900 dark:text-amber-300' : 'text-[var(--color-text-muted)]'}`}>
                          {`${period.startTime} - ${period.endTime}`}
                        </div>
                      </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-xs">
                {DAYS.map((day) => (
                  <tr key={day.key} className="hover:bg-[var(--color-card-subtle)] transition">
                    {/* Day Column */}
                    <td className="p-3 text-center border-r border-[var(--color-border)]">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${day.color}`}>
                        {day.th}
                      </span>
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
                        <td key={period.periodNumber} className="p-1.5 border-r border-[var(--color-border)] align-top">
                          <div className={isAllClassroomsView ? 'space-y-1' : 'space-y-1.5'}>
                            {periodSlots.map((slot) => {
                              const hasConflict = conflictingSlotIds.has(slot.id);
                              const colorStyle = COLOR_CLASSES[slot.colorTag] || COLOR_CLASSES.sky;
                              return (
                                <div
                                  key={slot.id}
                                  onClick={() => openSlotDetails(slot)}
                                  className={`${isAllClassroomsView ? 'min-h-16 p-1.5' : 'min-h-22 p-2'} rounded-xl border transition group relative flex flex-col justify-between cursor-pointer ${colorStyle} ${hasConflict ? 'ring-2 ring-amber-500 shadow-md shadow-amber-500/20' : ''}`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="shrink-0 font-mono text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                        {slot.courseCode}
                                      </span>
                                      <span title="ชั้น/ห้องเรียน" className="max-w-[55%] truncate rounded bg-white/70 px-1 py-0.5 text-[9px] font-bold text-slate-800 dark:bg-slate-900/70 dark:text-white">
                                        {slot.classRoom}
                                      </span>
                                      {hasConflict && (
                                        <span title="ตรวจพบคาบชนกัน!" className="shrink-0 text-amber-700 dark:text-amber-300">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                        </span>
                                      )}
                                    </div>
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
                                  </div>

                                  {isViewingCurrentTerm && (currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'teacher') && (
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
                                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white opacity-0 group-hover:opacity-100 transition shadow-sm cursor-pointer"
                                      title="ลบคาบนี้"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPeriodSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[92vh] overflow-hidden rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[var(--color-border)] shrink-0">
              <h3 className="font-bold text-base text-[var(--color-text-title)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--color-primary-text)]" />
                ตั้งเวลาเรียนมาตรฐานของโรงเรียน
              </h3>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                ครูและผู้ดูแลที่มีสิทธิ์แก้ไขได้ การเปลี่ยนแปลงจะมีผลกับตารางเรียนของทุกคนในโรงเรียนนี้
              </p>
            </div>
            <form onSubmit={handleSavePeriodSettings} className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
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
              <div className="flex justify-end gap-2 pt-2">
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
                  disabled={isSavingPeriods}
                  className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSavingPeriods ? 'กำลังบันทึก...' : 'บันทึกเวลาเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Popover Modal for Clicked Slot */}
      {selectedSlotForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="timetable-slot-detail-title"
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                  {selectedSlotForDetail.courseCode}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  คาบที่ {selectedSlotForDetail.periodNumber} ({getPeriodTime(selectedSlotForDetail.periodNumber)?.startTime || selectedSlotForDetail.startTime} - {getPeriodTime(selectedSlotForDetail.periodNumber)?.endTime || selectedSlotForDetail.endTime})
                </span>
              </div>
              <button
                type="button"
                onClick={closeSlotDetails}
                aria-label="ปิดรายละเอียดคาบเรียน"
                className="text-lg font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 py-3 text-xs">
              <h3 id="timetable-slot-detail-title" className="text-base font-bold text-[var(--color-text-title)]">
                {selectedSlotForDetail.courseTitleTh}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {selectedSlotForDetail.courseTitleEn}
              </p>

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
                </div>
              )}
              {slotActionError && !isEditingSelectedSlot && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[10px] text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                  {slotActionError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
              {isEditingSelectedSlot ? (
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
                  {isViewingCurrentTerm && (currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'teacher') && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Slot Modal with Course Catalog Selector */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--color-primary-text)]" />
                <span>เพิ่มคาบเรียนลงตาราง (Add Class Slot)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-lg font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
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
                    {lessonPeriods.map((period) => {
                      return (
                        <option key={period.periodNumber} value={period.periodNumber}>
                          คาบที่ {period.periodNumber} ({period.startTime} - {period.endTime})
                        </option>
                      );
                    })}
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
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">โทนสีหมวดวิชา</label>
                  <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value as any)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  >
                    <option value="sky">ฟ้า (วิทยาศาสตร์ / พื้นฐาน)</option>
                    <option value="emerald">เขียว (STEM / เทคโนโลยี)</option>
                    <option value="amber">เหลืองส้ม (ภาษาไทย / ต่างประเทศ)</option>
                    <option value="purple">ม่วง (คณิตศาสตร์ / เพิ่มเติม)</option>
                    <option value="rose">ชมพูแดง (ศิลปะ / สุขศึกษา)</option>
                    <option value="cyan">ฟ้าสว่าง (กิจกรรมพัฒนาผู้เรียน)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingSlot}
                  className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-semibold cursor-pointer shadow-sm"
                >
                  {isSavingSlot ? 'กำลังบันทึก...' : 'บันทึกคาบเรียนลงตาราง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {showScheduleSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="timetable-schedule-settings-title"
            className="w-full max-w-lg space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 text-[var(--color-text-body)] shadow-2xl"
          >
            <div>
              <h2 id="timetable-schedule-settings-title" className="text-sm font-bold text-[var(--color-text-title)]">
                ตั้งค่าการแสดงและพิมพ์ตารางสอน
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                เลือกกรองได้หลายเงื่อนไขพร้อมกัน แล้วแสดงบนหน้าจอหรือพิมพ์เฉพาะตารางที่เลือก
              </p>
            </div>

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

            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
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
            </div>
          </section>
        </div>
      )}

      {/* Academic Year & Semester Quick Edit Modal */}
      {showPeriodEditor && onUpdateAcademicPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>แก้ไขภาคเรียนและปีการศึกษา</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPeriodEditor(false)}
                className="text-base font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
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
                          className="pr-2 py-1 text-[10px] opacity-80 hover:opacity-100 cursor-pointer"
                          title="ลบตัวเลือกภาคเรียนนี้"
                        >
                          ✕
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
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowPeriodEditor(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingAcademicPeriod}
                  className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSavingAcademicPeriod ? 'กำลังบันทึก...' : 'บันทึกภาคเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};
