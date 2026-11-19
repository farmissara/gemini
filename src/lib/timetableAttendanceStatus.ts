import {
  AttendanceRecord,
  Course,
  LeaveRequest,
  PeriodAttendanceRecord,
  Student,
  Teacher,
  TimetableSlot,
} from '../types';
import { getSlotTeachers, normalizeTeacherName } from './timetableTeachers';

export function normalizeRoomToken(value?: string | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^ห้อง\s*/i, '')
    .replace(/^room\s*/i, '')
    .replace(/\s+/g, '');
}

export function resolveMatchedCourseForSlot(
  slot: TimetableSlot,
  courses: Course[]
): Course | undefined {
  return (
    courses.find((c) => slot.courseId && c.id === slot.courseId) ||
    courses.find(
      (c) =>
        Boolean(c.code && slot.courseCode) &&
        c.code.trim().toLowerCase() === slot.courseCode.trim().toLowerCase()
    )
  );
}

export function resolveSlotStudents(
  slot: TimetableSlot,
  courses: Course[],
  students: Student[]
): Student[] {
  const matchedCourse = resolveMatchedCourseForSlot(slot, courses);

  // 1. Enrolled students in linked course
  if (matchedCourse?.enrolledStudentIds && matchedCourse.enrolledStudentIds.length > 0) {
    const idSet = new Set(matchedCourse.enrolledStudentIds);
    const enrolled = students.filter((s) => idSet.has(s.id));
    if (enrolled.length > 0) return enrolled;
  }

  // 2. Match by classroom / room token
  const slotRoomTokens = [slot.classRoom, slot.room, matchedCourse?.room]
    .map((r) => normalizeRoomToken(r))
    .filter(Boolean);
  if (slotRoomTokens.length > 0) {
    const byRoom = students.filter((s) => {
      const stuRoom = normalizeRoomToken(s.room);
      const stuGradeRoom = normalizeRoomToken(`${s.gradeLevel}${s.room}`);
      const enrolledRooms = (s.enrolledRooms || []).map((r) => normalizeRoomToken(r));
      return slotRoomTokens.some(
        (tok) =>
          (stuRoom && (tok === stuRoom || tok.includes(stuRoom) || stuRoom.includes(tok))) ||
          (stuGradeRoom && (tok.includes(stuGradeRoom) || stuGradeRoom.includes(tok))) ||
          enrolledRooms.some((er) => er && (tok.includes(er) || er.includes(tok)))
      );
    });
    if (byRoom.length > 0) return byRoom;
  }

  // 3. Fallback to all students in school so staff can always take roll
  return students;
}

export interface StudentGateStatus {
  status: 'present' | 'late' | 'absent' | 'leave' | 'not_checked_in';
  time?: string;
  record?: AttendanceRecord;
}

export function resolveStudentGateStatusForDate(
  student: Student,
  dateStr: string,
  attendance: AttendanceRecord[]
): StudentGateStatus {
  const stuId = student.id;
  const stuCode = (student.studentIdNumber || '').trim().toLowerCase();
  const stuName = `${student.firstNameTh} ${student.lastNameTh}`.trim().toLowerCase();

  const matches = attendance.filter((rec) => {
    if (rec.date !== dateStr) return false;
    if (rec.userType === 'teacher') return false;
    if ((rec.recordType || 'check_in') !== 'check_in') return false;
    if (rec.studentId === stuId) return true;
    if (stuCode && rec.studentId.trim().toLowerCase() === stuCode) return true;
    const recName = (rec.userName || '').trim().toLowerCase();
    return Boolean(stuName && recName && recName === stuName);
  });

  if (matches.length === 0) {
    return { status: 'not_checked_in' };
  }

  // Prefer actual present/late check-in over absent/leave fallback records
  const preferred =
    matches.find((r) => r.status === 'present') ||
    matches.find((r) => r.status === 'late') ||
    matches[0];

  const mappedStatus: StudentGateStatus['status'] =
    preferred.status === 'present'
      ? 'present'
      : preferred.status === 'late'
        ? 'late'
        : preferred.status === 'absent'
          ? 'absent'
          : 'leave';

  return {
    status: mappedStatus,
    time: preferred.time ? preferred.time.slice(0, 5) : undefined,
    record: preferred,
  };
}

export function resolveStudentLeaveForSlotDate(
  student: Student,
  slot: TimetableSlot,
  dateStr: string,
  leaveRequests: LeaveRequest[]
): LeaveRequest | undefined {
  const stuId = student.id;
  const stuCode = (student.studentIdNumber || '').trim().toLowerCase();
  const stuName = `${student.firstNameTh} ${student.lastNameTh}`.trim().toLowerCase();

  return leaveRequests.find((req) => {
    if (req.userRole !== 'student') return false;
    if (req.status === 'rejected') return false;
    if (req.startDate > dateStr || req.endDate < dateStr) return false;
    if (
      req.leaveScope === 'period_hourly' &&
      req.periodNumber &&
      req.periodNumber !== slot.periodNumber
    ) {
      return false;
    }
    if (req.userId === stuId) return true;
    if (stuCode && req.userId.trim().toLowerCase() === stuCode) return true;
    const reqName = (req.userName || '').trim().toLowerCase();
    return Boolean(stuName && reqName && reqName === stuName);
  });
}

export type TeacherSlotSchoolStatusCode =
  | 'on_leave_approved'
  | 'on_leave_pending'
  | 'checked_in'
  | 'late'
  | 'absent'
  | 'not_checked_in';

export interface TeacherSlotSchoolStatus {
  teacherName: string;
  teacher?: Teacher;
  status: TeacherSlotSchoolStatusCode;
  checkInTime?: string;
  leave?: LeaveRequest;
  substituteTeacherName?: string;
}

export function resolveTeacherSchoolStatusesForSlotDate(
  slot: TimetableSlot,
  dateStr: string,
  teachers: Teacher[],
  attendance: AttendanceRecord[],
  leaveRequests: LeaveRequest[]
): TeacherSlotSchoolStatus[] {
  const slotTeacherNames = getSlotTeachers(slot);
  if (slotTeacherNames.length === 0) return [];

  return slotTeacherNames.map((rawName) => {
    const normName = normalizeTeacherName(rawName);
    const matchedTeacher = teachers.find(
      (t) => normalizeTeacherName(t.fullNameTh) === normName
    );
    const teacherIds = new Set(
      [matchedTeacher?.id, matchedTeacher?.teacherIdNumber]
        .filter((v): v is string => Boolean(v && v.trim()))
        .map((v) => v.trim().toLowerCase())
    );

    const leave = leaveRequests.find((req) => {
      if (req.userRole !== 'teacher') return false;
      if (req.status === 'rejected') return false;
      if (req.startDate > dateStr || req.endDate < dateStr) return false;
      if (
        req.leaveScope === 'period_hourly' &&
        req.periodNumber &&
        req.periodNumber !== slot.periodNumber
      ) {
        return false;
      }
      if (req.userId && teacherIds.has(req.userId.trim().toLowerCase())) return true;
      return normalizeTeacherName(req.userName) === normName;
    });

    if (leave) {
      return {
        teacherName: rawName,
        teacher: matchedTeacher,
        status: leave.status === 'approved' ? 'on_leave_approved' : 'on_leave_pending',
        leave,
        substituteTeacherName: leave.substituteTeacherName || undefined,
      };
    }

    const gateRecords = attendance.filter((rec) => {
      if (rec.date !== dateStr) return false;
      if ((rec.recordType || 'check_in') !== 'check_in') return false;
      const isTeacherRecord =
        rec.userType === 'teacher' ||
        Boolean(rec.teacherId) ||
        (rec.studentId && teacherIds.has(rec.studentId.trim().toLowerCase()));
      if (!isTeacherRecord) return false;
      if (rec.teacherId && teacherIds.has(rec.teacherId.trim().toLowerCase())) return true;
      if (rec.studentId && teacherIds.has(rec.studentId.trim().toLowerCase())) return true;
      return normalizeTeacherName(rec.userName || '') === normName;
    });

    const preferredGate =
      gateRecords.find((r) => r.status === 'present') ||
      gateRecords.find((r) => r.status === 'late') ||
      gateRecords[0];

    if (preferredGate) {
      const gateStatus: TeacherSlotSchoolStatusCode =
        preferredGate.status === 'late'
          ? 'late'
          : preferredGate.status === 'absent'
            ? 'absent'
            : preferredGate.status === 'sick' || preferredGate.status === 'leave'
              ? 'on_leave_approved'
              : 'checked_in';
      return {
        teacherName: rawName,
        teacher: matchedTeacher,
        status: gateStatus,
        checkInTime: preferredGate.time ? preferredGate.time.slice(0, 5) : undefined,
      };
    }

    return {
      teacherName: rawName,
      teacher: matchedTeacher,
      status: 'not_checked_in',
    };
  });
}

export interface SlotAttendanceAndLeaveSummary {
  expectedTotal: number;
  periodPresent: number;
  periodLate: number;
  periodExcused: number;
  periodAbsent: number;
  periodCheckedTotal: number;
  studentLeaveCount: number;
  gatePresentCount: number;
  gateNotCheckedCount: number;
  hasAnyGateRecordsForDate: boolean;
  teacherStatuses: TeacherSlotSchoolStatus[];
}

export function getSlotAttendanceAndLeaveSummary(params: {
  slot: TimetableSlot;
  dateStr: string;
  courses: Course[];
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
}): SlotAttendanceAndLeaveSummary {
  const {
    slot,
    dateStr,
    courses,
    students,
    teachers,
    attendance,
    periodAttendance,
    leaveRequests,
  } = params;

  const matchedCourse = resolveMatchedCourseForSlot(slot, courses);
  const resolvedCourseId = slot.courseId || matchedCourse?.id || slot.courseCode;
  const roster = resolveSlotStudents(slot, courses, students);

  const periodMap = new Map<string, PeriodAttendanceRecord>();
  periodAttendance.forEach((rec) => {
    const courseMatches =
      rec.courseId === resolvedCourseId ||
      (Boolean(slot.courseCode) &&
        rec.courseCode.trim().toLowerCase() === slot.courseCode.trim().toLowerCase());
    if (
      courseMatches &&
      rec.periodNumber === slot.periodNumber &&
      rec.date === dateStr &&
      (rec.recordType || 'check_in') === 'check_in'
    ) {
      periodMap.set(rec.studentId, rec);
    }
  });

  let periodPresent = 0;
  let periodLate = 0;
  let periodExcused = 0;
  let periodAbsent = 0;
  let studentLeaveCount = 0;
  let gatePresentCount = 0;
  let gateNotCheckedCount = 0;

  const hasAnyGateRecordsForDate = attendance.some(
    (rec) => rec.date === dateStr && (rec.recordType || 'check_in') === 'check_in'
  );

  roster.forEach((stu) => {
    const prec = periodMap.get(stu.id);
    if (prec) {
      if (prec.status === 'present') periodPresent += 1;
      else if (prec.status === 'late') periodLate += 1;
      else if (prec.status === 'excused') periodExcused += 1;
      else if (prec.status === 'absent') periodAbsent += 1;
    }

    if (resolveStudentLeaveForSlotDate(stu, slot, dateStr, leaveRequests)) {
      studentLeaveCount += 1;
    }

    const gate = resolveStudentGateStatusForDate(stu, dateStr, attendance);
    if (gate.status === 'present' || gate.status === 'late') {
      gatePresentCount += 1;
    } else {
      gateNotCheckedCount += 1;
    }
  });

  const teacherStatuses = resolveTeacherSchoolStatusesForSlotDate(
    slot,
    dateStr,
    teachers,
    attendance,
    leaveRequests
  );

  return {
    expectedTotal: roster.length,
    periodPresent,
    periodLate,
    periodExcused,
    periodAbsent,
    periodCheckedTotal: periodPresent + periodLate + periodExcused + periodAbsent,
    studentLeaveCount,
    gatePresentCount,
    gateNotCheckedCount,
    hasAnyGateRecordsForDate,
    teacherStatuses,
  };
}
