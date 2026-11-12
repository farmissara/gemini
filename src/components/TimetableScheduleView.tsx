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
  schoolName: string;
}

const DAYS: { key: DayOfWeek; th: string; en: string; color: string }[] = [
  { key: 'mon', th: 'วันจันทร์', en: 'Monday', color: 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200' },
  { key: 'tue', th: 'วันอังคาร', en: 'Tuesday', color: 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200' },
  { key: 'wed', th: 'วันพุธ', en: 'Wednesday', color: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200' },
  { key: 'thu', th: 'วันพฤหัสบดี', en: 'Thursday', color: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700 text-orange-950 dark:text-orange-200' },
  { key: 'fri', th: 'วันศุกร์', en: 'Friday', color: 'bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-200' }
];

const PERIOD_LAYOUT = [
  { num: 1 },
  { num: 2 },
  { num: 3 },
  { num: 4 },
  { num: 'lunch', isBreak: true },
  { num: 5 },
  { num: 6 },
  { num: 7 }
];
const PERIOD_ORDER = [1, 2, 3, 4, 0, 5, 6, 7];

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
  schoolName
}) => {
  // Main view mode: 'classroom' | 'teacher' | 'hours_criteria'
  const [viewMode, setViewMode] = useState<'classroom' | 'teacher' | 'hours_criteria'>('classroom');

  // Classroom selection
  const uniqueClassRooms = Array.from(
    new Set([
      ...slots.map((s) => s.classRoom).filter(Boolean),
      ...students.map((st) => st.room).filter(Boolean),
    ])
  );
  const [selectedClassRoom, setSelectedClassRoom] = useState<string>(uniqueClassRooms[0] || '');

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

  // Add slot form state
  const [newDay, setNewDay] = useState<DayOfWeek>('mon');
  const [newPeriod, setNewPeriod] = useState<number>(1);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('custom');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newTitleTh, setNewTitleTh] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTeacher, setNewTeacher] = useState(teacherNames[0] || '');
  const [newRoom, setNewRoom] = useState('');
  const [newCredits, setNewCredits] = useState<number>(1.5);
  const [newColor, setNewColor] = useState<TimetableSlot['colorTag']>('sky');
  const getPeriodTime = (periodNumber: number) => schoolPeriods.find((period) => period.periodNumber === periodNumber);

  // Filter slots based on active view mode
  const activeSlots = viewMode === 'teacher'
    ? slots.filter((s) => s.teacherName === selectedTeacherName)
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
  const teacherWeeklyHours = teacherWeeklyPeriods * 0.833; // 50 mins = ~0.833 hr

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
      (a, b) => PERIOD_ORDER.indexOf(a.periodNumber) - PERIOD_ORDER.indexOf(b.periodNumber)
    );
    if (
      orderedPeriods.length !== PERIOD_ORDER.length ||
      orderedPeriods.some((period, index) => period.periodNumber !== PERIOD_ORDER[index] || Boolean(period.isBreak) !== (period.periodNumber === 0))
    ) {
      setPeriodSettingsError('ต้องกำหนดเวลาให้ครบทุกคาบและช่วงพักกลางวัน');
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
        setPeriodSettingsError(`กรุณาตรวจสอบเวลาเริ่มและเลิกของ${period.isBreak ? 'ช่วงพักกลางวัน' : `คาบที่ ${period.periodNumber}`}`);
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

  // Compute academic hours breakdown per course in this classroom
  const classroomSlots = slots.filter((s) => s.classRoom === selectedClassRoom);
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
  const classroomStudents = students.filter((st) => st.room === selectedClassRoom);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Top Header & View Mode Switcher */}
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)]">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-title)] flex items-center gap-2 flex-wrap">
                <span>ตารางเรียน ตารางสอน และเกณฑ์ชั่วโมงเรียน</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-semibold">
                  สัมพันธ์กับวิชาการ / ครู / เกณฑ์ 80%
                </span>
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">
                ตรวจสอบการจัดคาบเรียนให้ครบตามหน่วยกิต ตรวจสอบภาระงานสอนครู ตรวจจับคาบชน และคำนวณเกณฑ์เวลาเรียน 80% มีสิทธิ์สอบ (ปพ.5)
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('classroom')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'classroom'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ตารางเรียนรายห้อง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'teacher'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ตารางสอนรายครู (ภาระงาน ว.PA)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hours_criteria')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'hours_criteria'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>หลักเกณฑ์ชั่วโมงเรียน &amp; สิทธิ์สอบ 80%</span>
            </button>
          </div>

          {/* Print Timetable Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">พิมพ์ตาราง (A4)</span>
          </button>

          {/* Add Slot Button (Admin / Teacher / Super Admin) */}
          {(currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'super_admin') && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPeriodDraft(schoolPeriods.map((period) => ({ ...period })));
                  setPeriodSettingsError(null);
                  setShowPeriodSettings(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-body)] transition cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>ตั้งเวลาเรียน</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (courses.length > 0) {
                    handleSelectCourse(courses[0].id);
                  }
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มคาบเรียน</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timetable Period Automated Notification Status & Test Bar */}
      <div className="shrink-0 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
              <span>ระบบแจ้งเตือนตารางสอนอัตโนมัติ (Automated Period Notifications)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-700">
                ทำงานอัตโนมัติทุก 30 วินาที
              </span>
            </p>
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
              แจ้งเตือนนักเรียนและครูทุกคาบ: เตือนก่อนเริ่มคาบ 5 นาที, เตือนเช็กชื่อเข้า (Check-in), เตือนหมดคาบ (Check-out), และเตือนเมื่อเลยเวลา 10 นาที (มาสาย/ลืมเช็กชื่อ)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)]">ทดสอบเตือน:</span>
          <button
            type="button"
            onClick={() => {
              sendEduVerseNotification({
                title: '⏰ [ทดสอบตารางสอน] เริ่มคาบเรียนที่ 1 (08:30 - 09:20)',
                body: `วิชาเรียน ${courses[0]?.code || 'ว21101'} (${courses[0]?.titleTh || 'วิทยาศาสตร์'}) ห้อง ${courses[0]?.room || '401'} • อย่าลืมสแกน Barcode/QR เช็กชื่อเข้าเรียน (Check-in)`,
                category: 'attendance',
                priority: 'urgent',
              });
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
          >
            ⏰ เริ่มคาบ &amp; เช็กอิน
          </button>
          <button
            type="button"
            onClick={() => {
              sendEduVerseNotification({
                title: '🔔 [ทดสอบตารางสอน] สิ้นสุดคาบเรียนที่ 1 (09:20 น.)',
                body: `หมดเวลาคาบเรียน ${courses[0]?.code || 'ว21101'} แล้ว กรุณาสแกน Barcode/QR เช็กชื่อออก (Check-out)`,
                category: 'attendance',
                priority: 'normal',
              });
            }}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
          >
            🔔 หมดคาบ &amp; เช็กเอาท์
          </button>
          <button
            type="button"
            onClick={() => {
              sendEduVerseNotification({
                title: '⚠️ [ทดสอบตารางสอน] แจ้งเตือนลืมเช็กชื่อ / มาสาย',
                body: `คาบเรียน ${courses[0]?.code || 'ว21101'} เริ่มไปแล้ว 10 นาที ระบบยังไม่พบการเช็กชื่อเข้าเรียน กรุณาสแกนด่วน`,
                category: 'attendance',
                priority: 'urgent',
              });
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
          >
            ⚠️ ลืมเช็กชื่อ / มาสาย
          </button>
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
              {uniqueClassRooms.map((room) => (
                <option key={room} value={room}>
                  {room} ({students.filter((s) => s.room === room).length} นักเรียน)
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--color-text-muted)]">
              • จัดตารางแล้ว <strong>{classroomSlots.length}</strong> คาบ/สัปดาห์
            </span>
          </div>
        ) : (
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
        )}

        {/* Workload / Status Summary Badge */}
        {viewMode === 'teacher' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              ภาระงานสอนจริง:
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              teacherWeeklyPeriods >= 12 && teacherWeeklyPeriods <= 22
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                : teacherWeeklyPeriods < 12
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
            }`}>
              {teacherWeeklyPeriods} คาบ/สัปดาห์ ({teacherWeeklyHours.toFixed(1)} ชม.) {teacherWeeklyPeriods >= 12 ? '✓ ผ่านเกณฑ์ ก.ค.ศ.' : '⚠ ต่ำกว่าเกณฑ์ขั้นต่ำ 12 คาบ'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>นักเรียนในห้อง: <strong className="text-[var(--color-text-title)]">{classroomStudents.length}</strong> คน</span>
            <span>• วิชาที่เปิดสอน: <strong className="text-[var(--color-primary-text)]">{classroomCoursesList.length}</strong> วิชา</span>
          </div>
        )}
      </div>

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
      {viewMode === 'hours_criteria' ? (
        /* TAB: Academic Hours Criteria & 80% Attendance Table */
        <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>เกณฑ์การคำนวณชั่วโมงเรียน และสิทธิ์เข้าสอบปลายภาค (เกณฑ์ 80% ปพ.5)</span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                ห้องเรียน: <strong>{selectedClassRoom}</strong> • ภาคเรียนที่ 1 ปีการศึกษา 2569 (คำนวณจากภาคเรียน 20 สัปดาห์ตามหลักสูตร สพฐ.)
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
                {viewMode === 'teacher' ? `ตารางสอน: ${selectedTeacherName}` : `${selectedClassRoom}`} — ภาคเรียนที่ 1 ปีการศึกษา 2569
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              รวมตาราง: <strong className="text-[var(--color-primary-text)]">{activeSlots.length}</strong> คาบ/สัปดาห์
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-body)] uppercase">
                  <th className="p-3 w-28 text-center font-bold text-[var(--color-text-title)]">วัน / คาบ</th>
                  {PERIOD_LAYOUT.map((period, idx) => {
                    const time = getPeriodTime(period.isBreak ? 0 : Number(period.num));
                    return (
                      <th key={idx} className={`p-2.5 text-center font-medium ${period.isBreak ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 w-16' : ''}`}>
                        <div className={`font-bold ${period.isBreak ? 'text-amber-950 dark:text-amber-200' : 'text-[var(--color-text-title)]'}`}>
                          {period.isBreak ? 'พัก' : `คาบ ${period.num}`}
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 ${period.isBreak ? 'text-amber-900 dark:text-amber-300' : 'text-[var(--color-text-muted)]'}`}>
                          {time ? `${time.startTime} - ${time.endTime}` : 'ยังไม่ตั้งเวลา'}
                        </div>
                      </th>
                    );
                  })}
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
                    {PERIOD_LAYOUT.map((period, pIdx) => {
                      if (period.isBreak) {
                        return (
                          <td key={pIdx} className="p-2 text-center bg-amber-50 dark:bg-amber-950/60 border-r border-[var(--color-border)]">
                            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 writing-vertical rotate-180">
                              พักกลางวัน
                            </span>
                          </td>
                        );
                      }

                      // Find matching slot
                      const slot = activeSlots.find(
                        (s) => s.dayOfWeek === day.key && s.periodNumber === Number(period.num)
                      );

                      const hasConflict = slot && conflicts.some((c) => c.slotId === slot.id);

                      if (!slot) {
                        return (
                          <td key={pIdx} className="p-1.5 text-center border-r border-[var(--color-border)]">
                            <div className="h-22 rounded-xl border border-dashed border-[var(--color-border)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)] transition">
                              ว่าง
                            </div>
                          </td>
                        );
                      }

                      const colorStyle = COLOR_CLASSES[slot.colorTag] || COLOR_CLASSES.sky;

                      return (
                        <td key={pIdx} className="p-1.5 border-r border-[var(--color-border)] align-top">
                          <div 
                            onClick={() => setSelectedSlotForDetail(slot)}
                            className={`p-2 rounded-xl border transition group relative flex flex-col justify-between h-22 cursor-pointer ${colorStyle} ${hasConflict ? 'ring-2 ring-amber-500 shadow-md shadow-amber-500/20' : ''}`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                  {slot.courseCode}
                                </span>
                                {hasConflict && (
                                  <span title="ตรวจพบคาบชนกัน!" className="text-amber-700 dark:text-amber-300">
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
                                <span className="truncate">{viewMode === 'teacher' ? slot.classRoom : slot.teacherName}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{slot.room}</span>
                              </div>
                            </div>

                            {/* Delete Button on hover */}
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
              {periodDraft.slice().sort(
                (a, b) => PERIOD_ORDER.indexOf(a.periodNumber) - PERIOD_ORDER.indexOf(b.periodNumber)
              ).map((period) => (
                <div key={period.periodNumber} className={`grid grid-cols-[minmax(90px,1fr)_1fr_1fr] items-center gap-2 rounded-xl border p-2.5 ${period.isBreak ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'}`}>
                  <span className="text-xs font-bold">{period.isBreak ? 'พักกลางวัน' : `คาบที่ ${period.periodNumber}`}</span>
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
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl">
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
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                  เลือกจากรายวิชาที่เปิดสอนในหลักสูตร (Auto-fill Course Catalog)
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleSelectCourse(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)] font-medium"
                >
                  <option value="custom">-- กรอกข้อมูลเองแบบอิสระ (Custom Course) --</option>
                  {courses.map((crs) => (
                    <option key={crs.id} value={crs.id}>
                      {crs.code} - {crs.titleTh} ({crs.credits} หน่วยกิต • {crs.teacherName})
                    </option>
                  ))}
                </select>
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
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                      const time = getPeriodTime(num);
                      return (
                        <option key={num} value={num}>
                          คาบที่ {num} ({time ? `${time.startTime} - ${time.endTime}` : 'ยังไม่ตั้งเวลา'})
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
    </div>
  );
};
