import type {
  AttendanceRecord,
  Course,
  DayOfWeek,
  PeriodAttendanceRecord,
  Student,
  TimetableSlot,
} from '../types';
import { getCourseRosterStudentIds } from './attendanceScope';

export interface GateAttendanceReportRow {
  student: Student;
  checkIn?: AttendanceRecord;
  checkOut?: AttendanceRecord;
}

export interface DailyPeriodReportSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitleTh: string;
  courseTitleEn: string;
  periodNumber: number;
  classRoom: string;
  startTime: string;
  endTime: string;
  students: Student[];
  records: PeriodAttendanceRecord[];
}

interface BuildDailyPeriodReportSessionsOptions {
  date: string;
  schoolId: string;
  timetableSlots: TimetableSlot[];
  courses: Course[];
  students: Student[];
  records: PeriodAttendanceRecord[];
  schoolDayOff?: boolean;
  isSlotInScope?: (slot: TimetableSlot) => boolean;
}

const DAY_KEYS: Array<DayOfWeek | null> = [null, 'mon', 'tue', 'wed', 'thu', 'fri', null];

export function getTimetableDayForDate(date: string): DayOfWeek | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return DAY_KEYS[parsed.getUTCDay()];
}

export function buildGateAttendanceReportRows(
  students: Student[],
  records: AttendanceRecord[],
  date: string
): GateAttendanceReportRow[] {
  const allowedStudentIds = new Set(students.map((student) => student.id));
  const checkIns = new Map<string, AttendanceRecord>();
  const checkOuts = new Map<string, AttendanceRecord>();

  for (const record of records) {
    if (
      record.date !== date ||
      record.userType === 'teacher' ||
      !allowedStudentIds.has(record.studentId)
    ) {
      continue;
    }

    const target = record.recordType === 'check_out' ? checkOuts : checkIns;
    const existing = target.get(record.studentId);
    if (!existing || record.time >= existing.time) {
      target.set(record.studentId, record);
    }
  }

  return students.map((student) => {
    const checkIn = checkIns.get(student.id);
    const explicitCheckOut = checkOuts.get(student.id);
    const legacyCheckOut = checkIn?.checkOutTime
      ? { ...checkIn, time: checkIn.checkOutTime, recordType: 'check_out' as const }
      : undefined;
    return {
      student,
      checkIn,
      checkOut: explicitCheckOut || legacyCheckOut,
    };
  });
}

export function buildDailyPeriodReportSessions({
  date,
  schoolId,
  timetableSlots,
  courses,
  students,
  records: attendanceRecords,
  schoolDayOff = false,
  isSlotInScope,
}: BuildDailyPeriodReportSessionsOptions): DailyPeriodReportSession[] {
  const dayOfWeek = getTimetableDayForDate(date);
  if (!dayOfWeek) return [];

  return timetableSlots
    .filter((slot) => (
      slot.dayOfWeek === dayOfWeek &&
      (!slot.schoolId || slot.schoolId === schoolId) &&
      (!isSlotInScope || isSlotInScope(slot))
    ))
    .flatMap((slot) => {
      const course = courses.find((candidate) =>
        (slot.courseId && candidate.id === slot.courseId) ||
        candidate.code.trim().toLowerCase() === slot.courseCode.trim().toLowerCase()
      );
      if (!course) return [];

      const rosterIds = new Set(getCourseRosterStudentIds(course, students));
      const sessionStudents = students.filter((student) => rosterIds.has(student.id));
      if (sessionStudents.length === 0) return [];

      const sessionRecords = attendanceRecords.filter((record) =>
        record.date === date &&
        record.courseId === course.id &&
        record.periodNumber === slot.periodNumber &&
        rosterIds.has(record.studentId)
      );
      if (schoolDayOff && sessionRecords.length === 0) return [];

      return [{
        id: `${slot.id}:${course.id}:${slot.classRoom}`,
        courseId: course.id,
        courseCode: slot.courseCode || course.code,
        courseTitleTh: slot.courseTitleTh || course.titleTh,
        courseTitleEn: slot.courseTitleEn || course.titleEn,
        periodNumber: slot.periodNumber,
        classRoom: slot.classRoom,
        startTime: slot.startTime,
        endTime: slot.endTime,
        students: sessionStudents,
        records: sessionRecords,
      }];
    });
}
