import {
  AttendanceRecord,
  Course,
  PeriodAttendanceRecord,
  Student,
  TimetableSlot,
} from '../types';
import {
  evaluateObecAttributeSummary,
  evaluateObecReadingSummary,
} from '../data/moeCurriculumStandards';
import { getSupabaseClient } from './supabase';

const isMissingTableError = (error: { code?: string; message?: string } | null | undefined): boolean => {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('could not find the table');
};

export const MOE_QUALITATIVE_UPDATED_EVENT = 'baanpakkru:moe-qualitative-updated';

export interface StudentQualitativeAssessment {
  studentId: string;
  attributes: number[]; // 8 items (0..3)
  readingWriting: number[]; // 5 items (0..3)
  competencies: number[]; // 5 items (0..3)
  activities: Array<'ผ (ผ่าน)' | 'มผ (ไม่ผ่าน)'>; // 4 items
  homeroomComment?: string;
  updatedAt: string;
}

export interface Pp5CourseSettings {
  affiliationOffice: string;
  docSetNo: string;
  scoreRatioMid: number; // e.g. 70, 60, 80
  scoreRatioFinal: number; // e.g. 30, 40, 20
  headOfDeptName: string;
  measurementHeadName: string;
  directorName: string;
}

const QUAL_STORAGE_PREFIX = 'eduverse_moe_qualitative_v1_';
const PP5_CONFIG_PREFIX = 'eduverse_pp5_course_cfg_v1_';

function qualStorageKey(schoolId: string, academicYear: string, semester: string): string {
  return `${QUAL_STORAGE_PREFIX}${schoolId || 'default'}_${academicYear || '2569'}_${semester || '1'}`;
}

function pp5ConfigKey(courseId: string): string {
  return `${PP5_CONFIG_PREFIX}${courseId}`;
}

export function createDefaultStudentQualitative(studentId: string): StudentQualitativeAssessment {
  return {
    studentId,
    attributes: [3, 3, 3, 3, 3, 3, 3, 3],
    readingWriting: [3, 3, 3, 3, 3],
    competencies: [3, 3, 3, 3, 3],
    activities: ['ผ (ผ่าน)', 'ผ (ผ่าน)', 'ผ (ผ่าน)', 'ผ (ผ่าน)'],
    updatedAt: new Date().toISOString(),
  };
}

export function loadQualitativeAssessments(
  schoolId: string,
  academicYear: string,
  semester: string
): Record<string, StudentQualitativeAssessment> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(qualStorageKey(schoolId, academicYear, semester));
    return raw ? (JSON.parse(raw) as Record<string, StudentQualitativeAssessment>) : {};
  } catch {
    return {};
  }
}

export function saveQualitativeAssessments(
  schoolId: string,
  academicYear: string,
  semester: string,
  records: Record<string, StudentQualitativeAssessment>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(qualStorageKey(schoolId, academicYear, semester), JSON.stringify(records));
  } catch {
    // Ignore storage quota issues
  }

  if (!schoolId || schoolId === 'default-school') return;
  const client = getSupabaseClient();
  if (!client) return;
  const rows = Object.values(records).map((rec) => ({
    school_id: schoolId,
    record_kind: 'student_qualitative',
    record_id: `${academicYear || '2569'}_${semester || '1'}_${rec.studentId}`,
    academic_year: academicYear || '2569',
    semester: semester || '1',
    student_id: rec.studentId,
    payload: rec,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  void client
    .from('school_moe_qualitative')
    .upsert(rows, { onConflict: 'school_id,record_kind,record_id' })
    .then(({ error }) => {
      if (error && !isMissingTableError(error)) {
        console.warn('[MoeQualitative] Failed to sync qualitative records to Supabase:', error.message);
      }
    });
}

export async function hydrateMoeQualitativeFromSupabase(
  schoolId: string,
  academicYear: string,
  semester: string
): Promise<void> {
  if (!schoolId || schoolId === 'default-school') return;
  const client = getSupabaseClient();
  if (!client) return;

  const { data, error } = await client
    .from('school_moe_qualitative')
    .select('record_kind, record_id, academic_year, semester, payload')
    .eq('school_id', schoolId);

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[MoeQualitative] Failed to load qualitative records from Supabase:', error.message);
    }
    return;
  }
  if (!data || data.length === 0 || typeof window === 'undefined') return;

  const qualByPeriod = new Map<string, Record<string, StudentQualitativeAssessment>>();
  for (const row of data) {
    if (row.record_kind === 'pp5_course_config' && row.payload) {
      const courseId = String(row.record_id || '').replace(/^pp5_/, '');
      if (courseId) {
        try {
          window.localStorage.setItem(pp5ConfigKey(courseId), JSON.stringify(row.payload));
        } catch {
          // ignore quota error
        }
      }
    } else if (row.record_kind === 'student_qualitative' && row.payload) {
      const rec = row.payload as StudentQualitativeAssessment;
      const key = qualStorageKey(
        schoolId,
        String(row.academic_year || academicYear || '2569'),
        String(row.semester || semester || '1')
      );
      const bucket = qualByPeriod.get(key) || {};
      bucket[rec.studentId] = rec;
      qualByPeriod.set(key, bucket);
    }
  }

  for (const [storageKey, bucket] of qualByPeriod.entries()) {
    try {
      const currentRaw = window.localStorage.getItem(storageKey);
      const current = currentRaw ? (JSON.parse(currentRaw) as Record<string, StudentQualitativeAssessment>) : {};
      window.localStorage.setItem(storageKey, JSON.stringify({ ...current, ...bucket }));
    } catch {
      // ignore quota error
    }
  }

  window.dispatchEvent(new CustomEvent(MOE_QUALITATIVE_UPDATED_EVENT, { detail: { schoolId } }));
}

export function getStudentQualitativeRecord(
  records: Record<string, StudentQualitativeAssessment>,
  studentId: string
): StudentQualitativeAssessment {
  return records[studentId] || createDefaultStudentQualitative(studentId);
}

export function summarizeStudentQualitative(record: StudentQualitativeAssessment) {
  const attrSummary = evaluateObecAttributeSummary(record.attributes);
  const readingSummary = evaluateObecReadingSummary(record.readingWriting);
  const compMin = Math.min(...record.competencies.map((n) => (Number.isFinite(n) ? n : 3)));
  const compAvg =
    record.competencies.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 3), 0) /
    Math.max(1, record.competencies.length);
  const compLevel: 3 | 2 | 1 | 0 =
    compMin === 0 ? 0 : compMin === 1 ? 1 : compAvg >= 2.5 ? 3 : 2;
  const compLabel =
    compLevel === 3
      ? 'ดีเยี่ยม (๓)'
      : compLevel === 2
      ? 'ดี (๒)'
      : compLevel === 1
      ? 'ผ่าน (๑)'
      : 'ไม่ผ่าน (๐)';
  const activityPassed = record.activities.every((a) => a.startsWith('ผ'));
  return {
    attrLevel: attrSummary.level,
    attrLabel: attrSummary.label,
    readingLevel: readingSummary.level,
    readingLabel: readingSummary.label,
    readingPercent: readingSummary.percent,
    compLevel,
    compLabel,
    activityResult: activityPassed ? 'ผ (ผ่าน)' : 'มผ (ไม่ผ่าน)',
  };
}

export function loadPp5CourseSettings(courseId: string, academicYear: string): Pp5CourseSettings {
  const defaults: Pp5CourseSettings = {
    affiliationOffice: 'สำนักงานเขตพื้นที่การศึกษา (สพฐ.)',
    docSetNo: `๑ / ${academicYear || '๒๕๖๙'}`,
    scoreRatioMid: 70,
    scoreRatioFinal: 30,
    headOfDeptName: '',
    measurementHeadName: '',
    directorName: '',
  };
  if (typeof window === 'undefined' || !courseId) return defaults;
  try {
    const raw = window.localStorage.getItem(pp5ConfigKey(courseId));
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<Pp5CourseSettings>) };
  } catch {
    return defaults;
  }
}

export function savePp5CourseSettings(courseId: string, settings: Pp5CourseSettings, schoolId?: string): void {
  if (typeof window === 'undefined' || !courseId) return;
  try {
    window.localStorage.setItem(pp5ConfigKey(courseId), JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues
  }
  if (!schoolId || schoolId === 'default-school') return;
  const client = getSupabaseClient();
  if (!client) return;
  void client
    .from('school_moe_qualitative')
    .upsert(
      {
        school_id: schoolId,
        record_kind: 'pp5_course_config',
        record_id: `pp5_${courseId}`,
        payload: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'school_id,record_kind,record_id' }
    )
    .then(({ error }) => {
      if (error && !isMissingTableError(error)) {
        console.warn('[MoeQualitative] Failed to sync Pp5 course config:', error.message);
      }
    });
}

export interface DetailedStudentCourseAttendance {
  studentId: string;
  totalScheduledHours: number;
  minRequiredHours: number;
  presentCount: number;
  lateCount: number;
  sickCount: number;
  leaveCount: number;
  absentCount: number;
  recordedSessions: number;
  attendedHours: number;
  absentHours: number;
  attendancePercent: number;
  isAtRiskMs: boolean;
  source: 'period_log' | 'daily_attendance' | 'baseline_timetable';
}

export function calculateDetailedCourseAttendance({
  student,
  course,
  timetableSlots = [],
  attendance = [],
  periodAttendance = [],
}: {
  student: Student;
  course?: Course;
  timetableSlots?: TimetableSlot[];
  attendance?: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
}): DetailedStudentCourseAttendance {
  const courseSlots = course
    ? timetableSlots.filter(
        (slot) =>
          (slot.courseId === course.id || slot.courseCode === course.code) &&
          (!slot.classRoom || slot.classRoom === student.room)
      )
    : [];

  const periodsPerWeek = Math.max(1, courseSlots.length || Math.round((course?.credits || 1) * 2));
  const totalScheduledHours = course?.totalHours || courseSlots[0]?.totalSemesterHours || periodsPerWeek * 20;
  const minRequiredHours = course?.minAttendanceHours || Math.ceil(totalScheduledHours * 0.8);

  const periodLogs = course
    ? periodAttendance.filter(
        (rec) =>
          rec.studentId === student.id &&
          (rec.courseId === course.id || rec.courseCode === course.code)
      )
    : [];

  if (periodLogs.length > 0) {
    const presentCount = periodLogs.filter((r) => r.status === 'present').length;
    const lateCount = periodLogs.filter((r) => r.status === 'late').length;
    const excusedCount = periodLogs.filter((r) => r.status === 'excused').length;
    const absentCount = periodLogs.filter((r) => r.status === 'absent').length;
    const effectivePresent = presentCount + lateCount + excusedCount;
    const rate = effectivePresent / periodLogs.length;
    const attendedHours = Math.round(totalScheduledHours * rate);
    const absentHours = Math.max(0, totalScheduledHours - attendedHours);
    const attendancePercent = Math.round(rate * 100);
    return {
      studentId: student.id,
      totalScheduledHours,
      minRequiredHours,
      presentCount,
      lateCount,
      sickCount: 0,
      leaveCount: excusedCount,
      absentCount,
      recordedSessions: periodLogs.length,
      attendedHours,
      absentHours,
      attendancePercent,
      isAtRiskMs: attendancePercent < 80,
      source: 'period_log',
    };
  }

  const dailyLogs = attendance.filter((rec) => rec.studentId === student.id);
  if (dailyLogs.length > 0) {
    const presentCount = dailyLogs.filter((r) => r.status === 'present').length;
    const lateCount = dailyLogs.filter((r) => r.status === 'late').length;
    const sickCount = dailyLogs.filter((r) => r.status === 'sick').length;
    const leaveCount = dailyLogs.filter((r) => r.status === 'leave').length;
    const absentCount = dailyLogs.filter((r) => r.status === 'absent').length;
    const effectivePresent = presentCount + lateCount + sickCount + leaveCount;
    const rate = effectivePresent / dailyLogs.length;
    const attendedHours = Math.round(totalScheduledHours * rate);
    const absentHours = Math.max(0, totalScheduledHours - attendedHours);
    const attendancePercent = Math.round(rate * 100);
    return {
      studentId: student.id,
      totalScheduledHours,
      minRequiredHours,
      presentCount,
      lateCount,
      sickCount,
      leaveCount,
      absentCount,
      recordedSessions: dailyLogs.length,
      attendedHours,
      absentHours,
      attendancePercent,
      isAtRiskMs: attendancePercent < 80,
      source: 'daily_attendance',
    };
  }

  const attendedHours = Math.round(totalScheduledHours * 0.95);
  return {
    studentId: student.id,
    totalScheduledHours,
    minRequiredHours,
    presentCount: 0,
    lateCount: 0,
    sickCount: 0,
    leaveCount: 0,
    absentCount: 0,
    recordedSessions: 0,
    attendedHours,
    absentHours: totalScheduledHours - attendedHours,
    attendancePercent: 95,
    isAtRiskMs: false,
    source: 'baseline_timetable',
  };
}
