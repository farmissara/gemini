import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  User, 
  MapPin, 
  Trash2, 
  Download, 
  Share2, 
  Sparkles,
  Layers,
  Search,
  Filter,
  ShieldCheck,
  GraduationCap,
  Users,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
  BellRing
} from 'lucide-react';
import { TimetableSlot, DayOfWeek, AppLanguage, UserRole, Course, Teacher, Student, SchoolPeriodTime } from '../types';
import { sendEduVerseNotification } from '../lib/pushNotifications';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { getTimetableDuplicateReasons } from '../lib/duplicateRecords';

interface TimetableScheduleViewProps {
  slots: TimetableSlot[];
  courses: Course[];
  teachers: Teacher[];
  students: Student[];
  onAddSlot: (slot: TimetableSlot) => Promise<void>;
  onDeleteSlot: (id: string) => Promise<void>;
  schoolPeriods: SchoolPeriodTime[];
  onSaveSchoolPeriods: (periods: SchoolPeriodTime[]) => Promise<void>;
  lang: AppLanguage;
  currentRole: UserRole;
  schoolId?: string;
  schoolName: string;
  academicYear: string;
  currentSemester: string;
  semesterOptions?: string[];
  roomOptions?: string[];
  onUpdateRoomOptions?: (roomOptions: string[]) => Promise<void>;
  onUpdateAcademicPeriod?: (
    academicYear: string,
    currentSemester: string,
    semesterOptions?: string[]
  ) => Promise<void>;
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
  slots,
  courses,
  teachers,
  students,
  onAddSlot,
  onDeleteSlot,
  schoolPeriods,
  onSaveSchoolPeriods,
  lang,
  currentRole,
  schoolId = 'default-school',
  schoolName,
  academicYear,
  currentSemester,
  semesterOptions = ['1', '2', 'Summer'],
  roomOptions: savedRoomOptions,
  onUpdateRoomOptions,
  onUpdateAcademicPeriod,
}) => {
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const roomOptions = savedRoomOptions?.length ? savedRoomOptions : presets.roomOptions;
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';

  // Main view mode: classroom, teacher, attendance-hours criteria, or staff workload summary.
  const [viewMode, setViewMode] = useState<'classroom' | 'teacher' | 'hours_criteria' | 'workload'>('classroom');

  // Classroom selection
  const uniqueClassRooms = Array.from(
    new Set([
      ...slots.map((s) => s.classRoom).filter(Boolean),
      ...students.map((st) => st.room).filter(Boolean),
      ...roomOptions,
    ])
  );
  const [selectedClassRoom, setSelectedClassRoom] = useState<string>(uniqueClassRooms[0] || '');
  const [newCustomRoomName, setNewCustomRoomName] = useState('');
  const [showAddRoomInput, setShowAddRoomInput] = useState(false);
  const [roomOptionsError, setRoomOptionsError] = useState<string | null>(null);
  const [isSavingRoomOption, setIsSavingRoomOption] = useState(false);

  // Teacher selection for Teacher Workload Timetable
  const teacherNames = Array.from(
    new Set([
      ...teachers.map((t) => t.fullNameTh),
      ...slots.map((s) => s.teacherName).filter(Boolean),
      ...courses.map((c) => c.teacherName).filter(Boolean),
    ])
  );
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(teacherNames[0] || '');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPeriodSettings, setShowPeriodSettings] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<SchoolPeriodTime[]>(schoolPeriods);
  const [periodSettingsError, setPeriodSettingsError] = useState<string | null>(null);
  const [isSavingPeriods, setIsSavingPeriods] = useState(false);
  const [slotActionError, setSlotActionError] = useState<string | null>(null);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<TimetableSlot | null>(null);
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
  const [courseTeacherFilter, setCourseTeacherFilter] = useState('all');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newTitleTh, setNewTitleTh] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTeacher, setNewTeacher] = useState(teacherNames[0] || '');
  const [newRoom, setNewRoom] = useState('');
  const [newCredits, setNewCredits] = useState<number>(1.5);
  const [newColor, setNewColor] = useState<TimetableSlot['colorTag']>('sky');
  const getPeriodTime = (periodNumber: number) => schoolPeriods.find((period) => period.periodNumber === periodNumber);
  const orderedSchoolPeriods = [...schoolPeriods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const lessonPeriods = orderedSchoolPeriods.filter((period) => !period.isBreak);
  const catalogTeacherOptions = Array.from(new Set(courses.map((course) => course.teacherName.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'th'));
  const filteredCourseCatalog = courses.filter((course) => {
    const search = courseSearchInput.trim().toLocaleLowerCase();
    const matchesSearch = !search || [
      course.code,
      course.titleTh,
      course.titleEn,
      course.teacherName,
      course.department,
    ].some((value) => value?.toLocaleLowerCase().includes(search));
    const matchesTeacher = courseTeacherFilter === 'all' || course.teacherName.trim() === courseTeacherFilter;
    return matchesSearch && matchesTeacher;
  });
  const selectedCatalogCourse = courses.find((course) => course.id === selectedCourseId);

  // Filter slots based on active view mode
  const activeSlots = viewMode === 'teacher'
    ? slots.filter((s) => s.teacherName === selectedTeacherName)
    : selectedClassRoom === ALL_CLASSROOMS
      ? slots
      : slots.filter((s) => s.classRoom === selectedClassRoom);

  // Overall conflict detection across the school
  const conflicts: { slotId: string; reason: string }[] = [];
  slots.forEach((s1, i) => {
    slots.slice(i + 1).forEach((s2) => {
      if (s1.dayOfWeek === s2.dayOfWeek && s1.periodNumber === s2.periodNumber) {
        // Teacher double-booking conflict
        if (s1.teacherName && s2.teacherName && s1.teacherName === s2.teacherName && s1.classRoom !== s2.classRoom) {
          conflicts.push({
            slotId: s1.id,
            reason: `ครูผู้สอน (${s1.teacherName}) ชนกับ ${s2.classRoom} ในคาบนี้`
          });
          conflicts.push({
            slotId: s2.id,
            reason: `ครูผู้สอน (${s2.teacherName}) ชนกับ ${s1.classRoom} ในคาบนี้`
          });
        }
        // Room double-booking conflict
        if (s1.room && s2.room && s1.room === s2.room && s1.classRoom !== s2.classRoom) {
          conflicts.push({
            slotId: s1.id,
            reason: `ห้องเรียน (${s1.room}) ถูกจองซ้ำซ้อนโดย ${s2.classRoom}`
          });
          conflicts.push({
            slotId: s2.id,
            reason: `ห้องเรียน (${s2.room}) ถูกจองซ้ำซ้อนโดย ${s1.classRoom}`
          });
        }
      }
    });
  });

  // Calculate teacher weekly workload in teaching view
  const teacherWeeklyPeriods = slots.filter((s) => s.teacherName === selectedTeacherName).length;
  const parseTimeMinutes = (time: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };
  const getSlotDurationHours = (slot: TimetableSlot) => {
    const period = getPeriodTime(slot.periodNumber);
    const start = parseTimeMinutes(slot.startTime) ?? parseTimeMinutes(period?.startTime || '');
    const end = parseTimeMinutes(slot.endTime) ?? parseTimeMinutes(period?.endTime || '');
    return start === null || end === null || end <= start ? 0 : (end - start) / 60;
  };
  const teacherWeeklyHours = slots
    .filter((slot) => slot.teacherName === selectedTeacherName)
    .reduce((hours, slot) => hours + getSlotDurationHours(slot), 0);

  const isTeachingStaff = (teacher: Teacher) => (
    /ครู|อาจารย์|ผู้สอน/i.test(`${teacher.positionTitle || ''} ${teacher.academicStanding || ''}`)
    || Boolean(teacher.teacherLicenseNo.trim())
    || teacher.teachingSubjects.length > 0
    || teacher.homeroomClasses.length > 0
    || teacher.teachingGrades.length > 0
  );
  const workloadPeople = new Map<string, { name: string; teacher?: Teacher }>();
  teachers.filter(isTeachingStaff).forEach((teacher) => {
    const name = teacher.fullNameTh.trim();
    if (name) workloadPeople.set(name.toLocaleLowerCase(), { name, teacher });
  });
  slots.forEach((slot) => {
    const name = slot.teacherName.trim();
    if (name && !workloadPeople.has(name.toLocaleLowerCase())) {
      workloadPeople.set(name.toLocaleLowerCase(), { name });
    }
  });
  const workloadByTeacher = new Map<string, TimetableSlot[]>();
  slots.forEach((slot) => {
    const key = slot.teacherName.trim().toLocaleLowerCase();
    if (!key) return;
    const teacherSlots = workloadByTeacher.get(key) || [];
    teacherSlots.push(slot);
    workloadByTeacher.set(key, teacherSlots);
  });
  const teacherWorkloadRows = [...workloadPeople.entries()]
    .map(([key, person]) => {
      const teacherSlots = workloadByTeacher.get(key) || [];
      const periodCount = teacherSlots.length;
      return {
        ...person,
        periodCount,
        hours: teacherSlots.reduce((total, slot) => total + getSlotDurationHours(slot), 0),
        subjects: Array.from(new Map(
          teacherSlots.map((slot) => [slot.courseCode, `${slot.courseCode} ${slot.courseTitleTh}`.trim()])
        ).values()),
        status: periodCount < 12 ? 'low' as const : periodCount > 22 ? 'high' as const : 'within' as const,
      };
    })
    .sort((a, b) => {
      const priority = { high: 0, low: 1, within: 2 };
      return priority[a.status] - priority[b.status]
        || b.periodCount - a.periodCount
        || a.name.localeCompare(b.name, 'th');
    });
  const lowWorkloadCount = teacherWorkloadRows.filter((teacher) => teacher.status === 'low').length;
  const highWorkloadCount = teacherWorkloadRows.filter((teacher) => teacher.status === 'high').length;

  // Check course auto-fill when course selector changes in Add Modal
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    if (courseId === 'custom') {
      return;
    }
    const c = courses.find((crs) => crs.id === courseId);
    if (c) {
      setNewCourseCode(c.code);
      setNewTitleTh(c.titleTh);
      setNewTitleEn(c.titleEn);
      setNewTeacher(c.teacherName || teacherNames[0] || '');
      setNewRoom(c.room || 'ห้อง 401');
      setNewCredits(c.credits || 1.5);

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
    return slots.find((s) => 
      s.dayOfWeek === newDay && 
      s.periodNumber === newPeriod && 
      (
        (s.teacherName === newTeacher.trim() && s.classRoom !== selectedClassRoom) ||
        (s.room === newRoom.trim() && s.classRoom !== selectedClassRoom) ||
        (s.classRoom === selectedClassRoom)
      )
    );
  };
  const prospectiveConflict = showAddModal ? checkProspectiveConflict() : null;

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassRoom === ALL_CLASSROOMS) {
      setSlotActionError('กรุณาเลือกห้องเรียนเฉพาะก่อนเพิ่มคาบเรียน');
      return;
    }
    if (!newCourseCode || !newTitleTh) return;

    const periodTime = getPeriodTime(newPeriod);

    const targetCourse = selectedCourseId !== 'custom' ? courses.find((c) => c.id === selectedCourseId) : null;
    const credits = targetCourse?.credits || newCredits || 1.5;
    const totalSemesterHours = targetCourse?.totalHours || Math.round(credits * 40);

    const newSlot: TimetableSlot = {
      id: `time-${Date.now()}`,
      dayOfWeek: newDay,
      periodNumber: newPeriod,
      startTime: periodTime?.startTime || '08:30',
      endTime: periodTime?.endTime || '09:20',
      courseCode: newCourseCode.trim(),
      courseTitleTh: newTitleTh.trim(),
      courseTitleEn: newTitleEn.trim() || newTitleTh.trim(),
      teacherName: newTeacher.trim(),
      room: newRoom.trim(),
      classRoom: selectedClassRoom,
      colorTag: newColor,
      courseId: targetCourse?.id,
      credits,
      totalSemesterHours,
    };

    const prospectiveReasons = getTimetableDuplicateReasons(
      {
        classRoom: selectedClassRoom,
        dayOfWeek: newDay,
        periodNumber: newPeriod,
        teacherName: newTeacher.trim(),
        room: newRoom.trim(),
      },
      slots
    );
    if (prospectiveReasons.length > 0 && !confirm(`${prospectiveReasons.join(' และ ')}\nต้องการบันทึกคาบเรียนนี้ทับหรือบันทึกต่อหรือไม่?`)) {
      return;
    }

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
  const classroomSlots = selectedClassRoom === ALL_CLASSROOMS
    ? slots
    : slots.filter((s) => s.classRoom === selectedClassRoom);
  const classroomCourseMap: Record<string, { code: string; titleTh: string; titleEn: string; teacher: string; scheduledPeriods: number; course?: Course }> = {};
  
  classroomSlots.forEach((s) => {
    if (!classroomCourseMap[s.courseCode]) {
      const matchCourse = courses.find((c) => c.code.toLowerCase() === s.courseCode.toLowerCase());
      classroomCourseMap[s.courseCode] = {
        code: s.courseCode,
        titleTh: s.courseTitleTh,
        titleEn: s.courseTitleEn,
        teacher: s.teacherName,
        scheduledPeriods: 0,
        course: matchCourse,
      };
    }
    classroomCourseMap[s.courseCode].scheduledPeriods += 1;
  });

  const classroomCoursesList = Object.values(classroomCourseMap);
  const classroomStudents = selectedClassRoom === ALL_CLASSROOMS
    ? students
    : students.filter((st) => st.room === selectedClassRoom);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Top Header & View Mode Switcher */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 p-3 app-page-header">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] truncate">
            ตารางเรียน &amp; ตารางสอน
          </h1>
        </div>

        {/* View Mode Switcher Tabs & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('classroom')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                viewMode === 'classroom'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>รายห้อง</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedClassRoom === ALL_CLASSROOMS) {
                  setSelectedClassRoom(uniqueClassRooms[0] || '');
                }
                setViewMode('teacher');
              }}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                viewMode === 'teacher'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>รายครู (ว.PA)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedClassRoom === ALL_CLASSROOMS) {
                  setSelectedClassRoom(uniqueClassRooms[0] || '');
                }
                setViewMode('hours_criteria');
              }}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                viewMode === 'hours_criteria'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>เกณฑ์ชั่วโมง 80%</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('workload')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                viewMode === 'workload'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ภาระงานครู</span>
              {(lowWorkloadCount > 0 || highWorkloadCount > 0) && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-white">
                  {lowWorkloadCount + highWorkloadCount}
                </span>
              )}
            </button>
          </div>

          <details className="relative">
            <summary className="flex list-none cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] transition whitespace-nowrap">
              <BellRing className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">ทดสอบเตือนคาบ</span>
            </summary>
            <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                แจ้งเตือนอัตโนมัติทุก 30 วินาที
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open');
                  sendEduVerseNotification({
                    title: '⏰ [ทดสอบตารางสอน] เริ่มคาบเรียนที่ 1 (08:30 - 09:20)',
                    body: `วิชาเรียน ${courses[0]?.code || 'ว21101'} (${courses[0]?.titleTh || 'วิทยาศาสตร์'}) ห้อง ${courses[0]?.room || '401'} • อย่าลืมสแกน Barcode/QR เช็คชื่อเข้าเรียน (Check-in)`,
                    category: 'attendance',
                    priority: 'urgent',
                  });
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer"
              >
                ⏰ ทดสอบเริ่มคาบ &amp; เช็คอิน
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open');
                  sendEduVerseNotification({
                    title: '🔔 [ทดสอบตารางสอน] สิ้นสุดคาบเรียนที่ 1 (09:20 น.)',
                    body: `หมดเวลาคาบเรียน ${courses[0]?.code || 'ว21101'} แล้ว กรุณาสแกน Barcode/QR เช็คชื่อออก (Check-out)`,
                    category: 'attendance',
                    priority: 'normal',
                  });
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer"
              >
                🔔 ทดสอบหมดคาบ &amp; เช็คเอาท์
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open');
                  sendEduVerseNotification({
                    title: '⚠️ [ทดสอบตารางสอน] แจ้งเตือนลืมเช็คชื่อ / มาสาย',
                    body: `คาบเรียน ${courses[0]?.code || 'ว21101'} เริ่มไปแล้ว 10 นาที ระบบยังไม่พบการเช็คชื่อเข้าเรียน กรุณาสแกนด่วน`,
                    category: 'attendance',
                    priority: 'urgent',
                  });
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] font-semibold text-amber-700 dark:text-amber-300 cursor-pointer"
              >
                ⚠️ ทดสอบลืมเช็คชื่อ / มาสาย
              </button>
            </div>
          </details>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] transition cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">พิมพ์ (A4)</span>
          </button>

          {(currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'super_admin') && (
            <>
              <button
                type="button"
                onClick={() => {
                  setPeriodDraft(schoolPeriods.map((period) => ({ ...period })));
                  setPeriodSettingsError(null);
                  setShowPeriodSettings(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-body)] transition cursor-pointer whitespace-nowrap"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>ตั้งเวลา</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCourseSearchInput('');
                  setCourseTeacherFilter('all');
                  if (courses.length > 0) {
                    handleSelectCourse(courses[0].id);
                  } else {
                    handleSelectCourse('custom');
                  }
                  setNewPeriod(lessonPeriods[0]?.periodNumber || 1);
                  setSlotActionError(null);
                  setShowAddModal(true);
                }}
                disabled={viewMode === 'classroom' && selectedClassRoom === ALL_CLASSROOMS}
                title={viewMode === 'classroom' && selectedClassRoom === ALL_CLASSROOMS
                  ? 'เลือกห้องเรียนเฉพาะก่อนเพิ่มคาบเรียน'
                  : undefined}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-xs transition cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มคาบเรียน</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Secondary Controls Bar: Select Classroom or Select Teacher */}
      <div className="shrink-0 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        {viewMode === 'classroom' || viewMode === 'hours_criteria' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>เลือกห้องเรียน:</span>
            </span>
            <select
              value={selectedClassRoom}
              onChange={(e) => setSelectedClassRoom(e.target.value)}
              className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value={ALL_CLASSROOMS} disabled={viewMode === 'hours_criteria'}>
                ทุกห้องเรียน ({uniqueClassRooms.length} ห้อง)
              </option>
              {uniqueClassRooms.map((room) => (
                <option key={room} value={room}>
                  {room} ({students.filter((s) => s.room === room).length} นักเรียน)
                </option>
              ))}
            </select>
            {isAdmin && (
              showAddRoomInput ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newCustomRoomName}
                    onChange={(e) => setNewCustomRoomName(e.target.value)}
                    placeholder="เช่น ม.4/3"
                    className="w-24 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
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
                    className="px-2 py-1 rounded-lg bg-[var(--color-primary)] text-white text-[11px] font-bold cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRoomInput(false)}
                    className="px-1.5 py-1 text-[11px] text-[var(--color-text-muted)] cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddRoomInput(true)}
                  className="px-2 py-1 rounded-lg border border-dashed border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  + เพิ่มห้อง
                </button>
              )
            )}
            <span className="text-xs text-[var(--color-text-muted)]">
              • จัดตารางแล้ว <strong>{classroomSlots.length}</strong> คาบ/สัปดาห์
            </span>
            {roomOptionsError && <span role="alert" className="text-xs text-rose-700">{roomOptionsError}</span>}
          </div>
        ) : viewMode === 'teacher' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>เลือกครูผู้สอน:</span>
            </span>
            <select
              value={selectedTeacherName}
              onChange={(e) => setSelectedTeacherName(e.target.value)}
              className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              {teacherNames.map((name) => {
                const count = slots.filter((s) => s.teacherName === name).length;
                return (
                  <option key={name} value={name}>
                    {name} ({count} คาบสอน/สัปดาห์)
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              ต่ำกว่า 12 คาบ: {lowWorkloadCount} คน
            </span>
            <span className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 font-semibold text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
              มากกว่า 22 คาบ: {highWorkloadCount} คน
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              เกณฑ์แจ้งเตือนเบื้องต้นต่อสัปดาห์ · ตรวจสอบตามนโยบายโรงเรียน
            </span>
          </div>
        )}

        {/* Workload / Academic Period Control */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {viewMode === 'teacher' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                ภาระงานสอนจริง:
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border tabular-nums ${
                teacherWeeklyPeriods >= 12 && teacherWeeklyPeriods <= 22
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                  : teacherWeeklyPeriods < 12
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
              }`}>
                {teacherWeeklyPeriods} คาบ/สัปดาห์ ({teacherWeeklyHours.toFixed(1)} ชม.) {
                  teacherWeeklyPeriods < 12
                    ? ' ⚠ ต่ำกว่า 12 คาบ'
                    : teacherWeeklyPeriods > 22
                      ? ' ⚠ มากกว่า 22 คาบ'
                      : ' ✓ อยู่ในช่วงเกณฑ์เบื้องต้น'
                }
              </span>
            </div>
          ) : viewMode === 'workload' ? (
            <span>
              บุคลากรที่ติดตามภาระงาน {teacherWorkloadRows.length} คน · รวมคาบสอน {slots.length} คาบ/สัปดาห์
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span>นักเรียน: <strong className="text-[var(--color-text-title)] tabular-nums">{classroomStudents.length}</strong> คน</span>
              <span>• <strong className="text-[var(--color-primary-text)] tabular-nums">{classroomCoursesList.length}</strong> วิชา</span>
            </div>
          )}

          {/* Direct Academic Year & Semester Indicator / Editor */}
          {onUpdateAcademicPeriod && isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setDraftAcademicYear(academicYear);
                setDraftSemester(currentSemester);
                setDraftSemesterOptions(semesterOptions.length > 0 ? semesterOptions : ['1', '2', 'Summer']);
                setShowPeriodEditor(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold transition cursor-pointer whitespace-nowrap"
              title="แก้ไขปีการศึกษา ภาคเรียน และเพิ่ม/ลบตัวเลือกภาคเรียน"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              <span>{formatSemesterLabel(currentSemester)} • ปีการศึกษา {academicYear}</span>
            </button>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] whitespace-nowrap"
              title="ผู้ดูแลระบบโรงเรียนกำหนดปีการศึกษาและภาคเรียนที่เมนู ตั้งค่าระบบ"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>{formatSemesterLabel(currentSemester)} / {academicYear}</span>
            </span>
          )}
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

      {(lowWorkloadCount > 0 || highWorkloadCount > 0) && viewMode !== 'workload' && (
        <button
          type="button"
          onClick={() => setViewMode('workload')}
          className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-left text-xs text-amber-950 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              ตรวจสอบภาระงานสอน: <strong>{lowWorkloadCount}</strong> คนต่ำกว่า 12 คาบ และ <strong>{highWorkloadCount}</strong> คนเกิน 22 คาบ/สัปดาห์
              <span className="ml-1 text-[10px] opacity-80">เกณฑ์คัดกรองเบื้องต้น</span>
            </span>
          </span>
          <span className="font-bold underline underline-offset-2">ดูสรุป</span>
        </button>
      )}

      {/* Conflict Warning Banner (if any) */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-amber-950 dark:text-amber-100">
              ระบบตรวจพบข้อขัดแย้งตารางเรียน (Schedule Conflicts Detected)
            </h4>
            <p className="text-[11px] text-amber-900 dark:text-amber-200">
              พบคาบเรียนที่มีครูผู้สอนหรือห้องเรียนถูกจัดซ้ำซ้อนในเวลาเดียวกัน {conflicts.length / 2} รายการ (คาบที่มีปัญหาจะมีกรอบไฮไลท์สีส้มเตือน)
            </p>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTENT: Grid Table OR Hours Criteria */}
      {viewMode === 'workload' ? (
        <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
          <header className="shrink-0 border-b border-[var(--color-border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-title)]">
                  <Users className="h-4 w-4 text-[var(--color-primary-text)]" />
                  ภาระงานสอนรายบุคคล
                </h2>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  คำนวณคาบและชั่วโมงต่อสัปดาห์จากตารางสอนจริง แสดงจำนวนวิชาไม่ซ้ำต่อคน
                </p>
              </div>
              <p className="max-w-xl rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                เกณฑ์แจ้งเตือน 12–22 คาบ/สัปดาห์เป็นเกณฑ์คัดกรองเบื้องต้นตามระบบ ไม่ใช่การวินิจฉัยภาระงานตามตำแหน่งหรือข้อบังคับ กรุณาตรวจสอบเวลาคาบและเกณฑ์ของโรงเรียนก่อนปรับตาราง
              </p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                <div className="text-[10px] text-[var(--color-text-muted)]">บุคลากรที่ติดตาม</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-[var(--color-text-title)]">{teacherWorkloadRows.length} คน</div>
              </div>
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <div className="text-[10px] text-amber-800 dark:text-amber-200">ต่ำกว่า 12 คาบ</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-amber-900 dark:text-amber-100">{lowWorkloadCount} คน</div>
              </div>
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/40">
                <div className="text-[10px] text-rose-800 dark:text-rose-200">มากกว่า 22 คาบ</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-rose-900 dark:text-rose-100">{highWorkloadCount} คน</div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)]">
                <tr>
                  <th className="p-3">ครูผู้สอน</th>
                  <th className="p-3">รายวิชาที่สอน</th>
                  <th className="p-3 text-center">คาบ/สัปดาห์</th>
                  <th className="p-3 text-center">ชั่วโมง/สัปดาห์</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {teacherWorkloadRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--color-text-muted)]">
                      ยังไม่มีรายชื่อครูหรือข้อมูลผู้สอนในตารางสอน
                    </td>
                  </tr>
                ) : teacherWorkloadRows.map((teacher) => (
                  <tr key={teacher.name.toLocaleLowerCase()} className="align-top hover:bg-[var(--color-card-subtle)]">
                    <td className="p-3">
                      <div className="font-bold text-[var(--color-text-title)]">{teacher.name}</div>
                      {teacher.teacher?.positionTitle && (
                        <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{teacher.teacher.positionTitle}</div>
                      )}
                    </td>
                    <td className="max-w-[32rem] p-3">
                      {teacher.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map((subject) => (
                            <span key={subject} className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-body)]">
                              {subject}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-muted)]">ยังไม่มีคาบสอนในตาราง</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold tabular-nums text-[var(--color-text-title)]">
                      {teacher.periodCount}
                    </td>
                    <td className="p-3 text-center font-mono tabular-nums text-[var(--color-text-body)]">
                      {teacher.hours.toFixed(1)}
                    </td>
                    <td className="p-3 text-center">
                      {teacher.status === 'low' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                          <AlertCircle className="h-3 w-3" /> ต่ำกว่าเกณฑ์
                        </span>
                      ) : teacher.status === 'high' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200">
                          <AlertTriangle className="h-3 w-3" /> ภาระงานสูง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> อยู่ในช่วง
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : viewMode === 'hours_criteria' ? (
        /* TAB: Academic Hours Criteria & 80% Attendance Table */
        <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>เกณฑ์การคำนวณชั่วโมงเรียน และสิทธิ์เข้าสอบปลายภาค (เกณฑ์ 80% ปพ.5)</span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                ห้องเรียน: <strong>{selectedClassRoom}</strong> • {formatSemesterLabel(currentSemester)} ปีการศึกษา {academicYear} (คำนวณจากภาคเรียน 20 สัปดาห์ตามหลักสูตร สพฐ.)
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-semibold">
              นักเรียนขาดเรียนได้ไม่เกิน 20% ของเวลาเรียนทั้งหมด
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)] font-bold text-[11px]">
                  <th className="p-3">รหัสวิชา</th>
                  <th className="p-3">ชื่อวิชา (ไทย / EN)</th>
                  <th className="p-3">ครูผู้สอน</th>
                  <th className="p-3 text-center">หน่วยกิต</th>
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
                    <td colSpan={9} className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                      ยังไม่มีการจัดตารางสอนสำหรับห้องนี้ กดปุ่ม &quot;+ เพิ่มคาบเรียน&quot; เพื่อเริ่มต้นจัดตาราง
                    </td>
                  </tr>
                ) : (
                  classroomCoursesList.map((item) => {
                    const credits = item.course?.credits || 1.5;
                    const requiredWeeklyPeriods = Math.round(credits * 2);
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
                        <td className="p-3 text-center font-bold text-[var(--color-text-title)]">
                          {credits}
                        </td>
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
      ) : (
        /* TAB: Timetable 5-Day Weekly Grid View */
        <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 p-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-card)]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
                {viewMode === 'teacher'
                  ? `ตารางสอน: ${selectedTeacherName}`
                  : selectedClassRoom === ALL_CLASSROOMS
                    ? 'ตารางเรียนทุกห้อง'
                    : `${selectedClassRoom}`} — {formatSemesterLabel(currentSemester)} ปีการศึกษา {academicYear}
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              รวมตาราง: <strong className="text-[var(--color-primary-text)]">{activeSlots.length}</strong> คาบ/สัปดาห์
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
            <table className={`w-full text-left border-collapse ${
              viewMode === 'classroom' && selectedClassRoom === ALL_CLASSROOMS ? 'min-w-[1120px]' : 'min-w-[880px]'
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
                          <div className="space-y-1.5">
                            {periodSlots.map((slot) => {
                              const hasConflict = conflicts.some((conflict) => conflict.slotId === slot.id);
                              const colorStyle = COLOR_CLASSES[slot.colorTag] || COLOR_CLASSES.sky;
                              return (
                                <div
                                  key={slot.id}
                                  onClick={() => setSelectedSlotForDetail(slot)}
                                  className={`min-h-22 p-2 rounded-xl border transition group relative flex flex-col justify-between cursor-pointer ${colorStyle} ${hasConflict ? 'ring-2 ring-amber-500 shadow-md shadow-amber-500/20' : ''}`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="shrink-0 font-mono text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                        {slot.courseCode}
                                      </span>
                                      <span className="max-w-[55%] truncate rounded bg-white/70 px-1 py-0.5 text-[9px] font-bold text-slate-800 dark:bg-slate-900/70 dark:text-white">
                                        {slot.classRoom}
                                      </span>
                                      {hasConflict && (
                                        <span title="ตรวจพบคาบชนกัน!" className="shrink-0 text-amber-700 dark:text-amber-300">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-[11px] font-bold mt-1 line-clamp-1 leading-tight">
                                      {slot.courseTitleTh}
                                    </h4>
                                  </div>

                                  <div className="pt-1 border-t border-current/20 space-y-0.5 text-[10px] opacity-95">
                                    <div className="flex items-center gap-1 truncate">
                                      <User className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{slot.teacherName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 truncate">
                                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{slot.room}</span>
                                    </div>
                                  </div>

                                  {(currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'teacher') && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`ต้องการลบคาบเรียน ${slot.courseCode} (${slot.courseTitleTh}) หรือไม่?`)) {
                                          onDeleteSlot(slot.id);
                                        }
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
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
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
                onClick={() => setSelectedSlotForDetail(null)}
                className="text-lg font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {selectedSlotForDetail.courseTitleTh}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {selectedSlotForDetail.courseTitleEn}
              </p>

              <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">ห้องเรียน (Classroom):</span>
                  <span className="font-bold text-[var(--color-text-title)]">{selectedSlotForDetail.classRoom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">ครูผู้สอน (Instructor):</span>
                  <span className="font-bold text-[var(--color-text-title)]">{selectedSlotForDetail.teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">สถานที่/ห้องแล็บ (Room):</span>
                  <span className="font-bold text-[var(--color-text-title)]">{selectedSlotForDetail.room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">หน่วยกิต (Credits):</span>
                  <span className="font-bold text-[var(--color-primary-text)]">{selectedSlotForDetail.credits || 1.5} หน่วยกิต</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">เกณฑ์เวลาเรียน 80% (สิทธิ์สอบ):</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {Math.round(((selectedSlotForDetail.credits || 1.5) * 40) * 0.8)} / {((selectedSlotForDetail.credits || 1.5) * 40)} ชั่วโมง
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {(currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'teacher') && (
                <button
                  type="button"
                  onClick={() => {
                    setSlotActionError(null);
                    void onDeleteSlot(selectedSlotForDetail.id)
                      .then(() => setSelectedSlotForDetail(null))
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
                onClick={() => setSelectedSlotForDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold cursor-pointer ml-auto"
              >
                ปิด
              </button>
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
                      {prospectiveConflict.teacherName === newTeacher.trim()
                        ? `อาจารย์ ${newTeacher} มีสอนห้อง ${prospectiveConflict.classRoom} ในคาบนี้อยู่แล้ว`
                        : `ห้องเรียน ${newRoom} ถูกใช้โดย ${prospectiveConflict.classRoom}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Course Selector from Course Catalog */}
              <div className="space-y-2">
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                  ค้นหาและเลือกรายวิชาที่เปิดสอน
                </label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.65fr)]">
                  <label className="relative block min-w-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                      type="search"
                      value={courseSearchInput}
                      onChange={(event) => setCourseSearchInput(event.target.value)}
                      placeholder="ค้นหารหัสวิชา ชื่อวิชา หรือชื่อครู"
                      aria-label="ค้นหารายวิชา"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-2.5 pl-9 pr-3 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </label>
                  <select
                    value={courseTeacherFilter}
                    onChange={(event) => setCourseTeacherFilter(event.target.value)}
                    aria-label="กรองรายวิชาตามครูผู้สอน"
                    className="w-full min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="all">ครูผู้สอนทุกคน</option>
                    {catalogTeacherOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
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
                        <span className="text-[10px] text-[var(--color-text-muted)]">{course.credits} หน่วยกิต</span>
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
                      ไม่พบรายวิชาที่ตรงกับคำค้นหาหรือตัวกรองครู
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

              {/* Teacher and Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">ครูผู้สอน</label>
                  <input
                    type="text"
                    required
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    placeholder="ชื่ออาจารย์"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
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
              </div>

              {/* Classroom destination & Color tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">ห้องเรียนผู้เรียน</label>
                  <select
                    value={selectedClassRoom}
                    onChange={(e) => setSelectedClassRoom(e.target.value)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)] font-bold"
                  >
                    {uniqueClassRooms.map((room) => (
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
    </div>
  );
};
