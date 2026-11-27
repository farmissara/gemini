import { getBangkokClockSnapshot } from './timetableCalendar';

export interface TeacherPeriodCheckRecord {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseCode: string;
  periodNumber: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  updatedAt: string;
}

export const TEACHER_PERIOD_CHECKIN_EVENT = 'eduverse:teacher-period-checkin-updated';

function getStorageKey(schoolId: string): string {
  return `eduverse_teacher_period_checkins_v1_${schoolId || 'default'}`;
}

function normalizeToken(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

export function loadTeacherPeriodCheckins(schoolId: string): TeacherPeriodCheckRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(schoolId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TeacherPeriodCheckRecord[]) : [];
  } catch {
    return [];
  }
}

export function findTeacherPeriodCheckin(params: {
  schoolId: string;
  teacherId?: string;
  courseId?: string;
  courseCode?: string;
  periodNumber: number;
  date: string;
}): TeacherPeriodCheckRecord | undefined {
  const records = loadTeacherPeriodCheckins(params.schoolId);
  const normTeacherId = normalizeToken(params.teacherId);
  const normCourseId = normalizeToken(params.courseId);
  const normCourseCode = normalizeToken(params.courseCode);

  return records.find((rec) => {
    if (rec.date !== params.date) return false;
    if (rec.periodNumber !== params.periodNumber) return false;
    if (normTeacherId && normalizeToken(rec.teacherId) !== normTeacherId) return false;
    const recCourseId = normalizeToken(rec.courseId);
    const recCourseCode = normalizeToken(rec.courseCode);
    return (
      (normCourseId && recCourseId === normCourseId) ||
      (normCourseCode && recCourseCode === normCourseCode)
    );
  });
}

export function recordTeacherPeriodCheck(params: {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseCode: string;
  periodNumber: number;
  date: string;
  checkType: 'check_in' | 'check_out';
  time?: string;
}): TeacherPeriodCheckRecord {
  const nowClock = getBangkokClockSnapshot();
  const resolvedTime = params.time || nowClock.timeLabel;
  const records = loadTeacherPeriodCheckins(params.schoolId);

  const normTeacherId = normalizeToken(params.teacherId);
  const normCourseId = normalizeToken(params.courseId);
  const normCourseCode = normalizeToken(params.courseCode);

  const existingIdx = records.findIndex((rec) => {
    if (rec.date !== params.date) return false;
    if (rec.periodNumber !== params.periodNumber) return false;
    if (normTeacherId && normalizeToken(rec.teacherId) !== normTeacherId) return false;
    const recCourseId = normalizeToken(rec.courseId);
    const recCourseCode = normalizeToken(rec.courseCode);
    return (
      (normCourseId && recCourseId === normCourseId) ||
      (normCourseCode && recCourseCode === normCourseCode)
    );
  });

  const existing = existingIdx >= 0 ? records[existingIdx] : undefined;
  const nextRecord: TeacherPeriodCheckRecord = {
    id:
      existing?.id ||
      `tpc-${params.schoolId}-${params.courseId}-p${params.periodNumber}-${params.date}-${params.teacherId}`,
    schoolId: params.schoolId,
    teacherId: params.teacherId,
    teacherName: params.teacherName,
    courseId: params.courseId,
    courseCode: params.courseCode,
    periodNumber: params.periodNumber,
    date: params.date,
    checkInTime:
      params.checkType === 'check_in'
        ? resolvedTime
        : existing?.checkInTime || resolvedTime,
    checkOutTime:
      params.checkType === 'check_out'
        ? resolvedTime
        : existing?.checkOutTime,
    updatedAt: new Date().toISOString(),
  };

  const nextList = [...records];
  if (existingIdx >= 0) {
    nextList[existingIdx] = nextRecord;
  } else {
    nextList.unshift(nextRecord);
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getStorageKey(params.schoolId), JSON.stringify(nextList));
      window.dispatchEvent(
        new CustomEvent(TEACHER_PERIOD_CHECKIN_EVENT, {
          detail: { schoolId: params.schoolId, record: nextRecord },
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  return nextRecord;
}
