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

export interface TimetableScheduleViewProps {
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
  attendance?: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  canSelfCheckin?: boolean;
  onOpenPeriodCheckin?: (params: {
    courseId?: string;
    courseCode?: string;
    periodNumber: number;
    date: string;
    checkType: 'check_in' | 'check_out';
  }) => void;
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
}

export type TimetableViewMode =
  | 'classroom'
  | 'period_rollcall'
  | 'calendar'
  | 'hours_criteria'
  | 'workload'
  | 'substitute';

export type WorkloadStatusFilter = 'all' | 'scheduled' | 'unassigned' | 'low' | 'within' | 'high';

export type TimetableScheduleFilters = {
  gradeLevel: string;
  classRoom: string;
  teacherName: string;
};

export type TimetableConflict = {
  key: string;
  slotA: TimetableSlot;
  slotB: TimetableSlot;
  reasons: string[];
  overlapStart: number | null;
  overlapEnd: number | null;
};

export type TimetableConflictCandidate = Pick<
  TimetableSlot,
  'dayOfWeek' | 'periodNumber' | 'startTime' | 'endTime' | 'teacherName' | 'coTeacherName' | 'room' | 'classRoom'
>;

export type TeacherWorkloadSubjectSummary = {
  code: string;
  title: string;
  periodCount: number;
  coTaughtPeriods: number;
  rooms: string[];
};

export type TeacherWorkloadRow = {
  name: string;
  teacher?: Teacher;
  periodCount: number;
  hours: number;
  subjects: TeacherWorkloadSubjectSummary[];
  status: 'unassigned' | 'low' | 'high' | 'within';
};

export type SubstituteCandidate = TeacherWorkloadRow & {
  sameDepartment: boolean;
  alreadyCoTeacher: boolean;
};

export type ClassroomCourseSummary = {
  code: string;
  titleTh: string;
  titleEn: string;
  teacher: string;
  scheduledPeriods: number;
  course?: Course;
};

export type PendingSlotConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
};

export const DAYS: { key: DayOfWeek; th: string; en: string; color: string }[] = [
  { key: 'mon', th: 'วันจันทร์', en: 'Monday', color: 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200' },
  { key: 'tue', th: 'วันอังคาร', en: 'Tuesday', color: 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200' },
  { key: 'wed', th: 'วันพุธ', en: 'Wednesday', color: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200' },
  { key: 'thu', th: 'วันพฤหัสบดี', en: 'Thursday', color: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700 text-orange-950 dark:text-orange-200' },
  { key: 'fri', th: 'วันศุกร์', en: 'Friday', color: 'bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-200' },
];

export const MAX_LESSON_PERIODS = 12;
export const ALL_CLASSROOMS = '__all_classrooms__';
export const UNASSIGNED_GRADE_LEVEL = 'ไม่ระบุระดับชั้น';

export const getAcademicPeriodKey = (academicYear: string, semester: string) =>
  JSON.stringify([academicYear, semester]);

export const formatTimeMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const formatShortThaiDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('th-TH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  });
