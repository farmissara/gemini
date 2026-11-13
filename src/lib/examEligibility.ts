import { AttendanceRecord, Course, PeriodAttendanceRecord, Student, TimetableSlot } from '../types';

export interface StudentCourseEligibility {
  totalScheduledHours: number;
  attendedHours: number;
  attendancePercent: number;
  isAtRiskMs: boolean; // < 80% threshold under MOE rules
  maxAbsentHoursRemaining: number;
  recordedCount: number;
  sourceLabel: 'period_log' | 'daily_attendance' | 'baseline_timetable';
}

export const calculateStudentCourseEligibility = ({
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
}): StudentCourseEligibility => {
  const courseSlots = course
    ? timetableSlots.filter(
        (slot) =>
          (slot.courseId === course.id || slot.courseCode === course.code) &&
          (!slot.classRoom || slot.classRoom === student.room)
      )
    : [];

  const periodsPerWeek = Math.max(1, courseSlots.length || Math.round((course?.credits || 1) * 2));
  const totalScheduledHours = course?.totalHours || courseSlots[0]?.totalSemesterHours || periodsPerWeek * 20;

  // 1) Prefer recorded per-period attendance for this student & course if present
  const studentPeriodRecords = course
    ? periodAttendance.filter(
        (rec) =>
          rec.studentId === student.id &&
          (rec.courseId === course.id || rec.courseCode === course.code)
      )
    : [];

  if (studentPeriodRecords.length > 0) {
    const presentLike = studentPeriodRecords.filter(
      (r) => r.status === 'present' || r.status === 'late' || r.status === 'excused'
    ).length;
    const rawRate = presentLike / studentPeriodRecords.length;
    const attendedHours = Math.round(totalScheduledHours * rawRate);
    const attendancePercent = Math.round(rawRate * 100);
    const minRequired = Math.ceil(totalScheduledHours * 0.8);
    return {
      totalScheduledHours,
      attendedHours,
      attendancePercent,
      isAtRiskMs: attendancePercent < 80,
      maxAbsentHoursRemaining: Math.max(0, attendedHours + Math.max(0, totalScheduledHours - attendedHours) - minRequired),
      recordedCount: studentPeriodRecords.length,
      sourceLabel: 'period_log',
    };
  }

  // 2) Fallback to daily attendance records for the student
  const studentDailyRecords = attendance.filter((rec) => rec.studentId === student.id);
  if (studentDailyRecords.length > 0) {
    const presentLike = studentDailyRecords.filter(
      (r) => r.status === 'present' || r.status === 'late' || r.status === 'leave' || r.status === 'sick'
    ).length;
    const rawRate = presentLike / studentDailyRecords.length;
    const attendedHours = Math.round(totalScheduledHours * rawRate);
    const attendancePercent = Math.round(rawRate * 100);
    const minRequired = Math.ceil(totalScheduledHours * 0.8);
    return {
      totalScheduledHours,
      attendedHours,
      attendancePercent,
      isAtRiskMs: attendancePercent < 80,
      maxAbsentHoursRemaining: Math.max(0, Math.round(totalScheduledHours * 0.2 - (totalScheduledHours - attendedHours))),
      recordedCount: studentDailyRecords.length,
      sourceLabel: 'daily_attendance',
    };
  }

  // 3) Fallback to baseline 95% with timetable scheduled hours when no logs exist yet
  const attendancePercent = 95;
  const attendedHours = Math.round((totalScheduledHours * attendancePercent) / 100);
  const minRequired = Math.ceil(totalScheduledHours * 0.8);
  return {
    totalScheduledHours,
    attendedHours,
    attendancePercent,
    isAtRiskMs: attendancePercent < 80,
    maxAbsentHoursRemaining: Math.max(0, attendedHours - minRequired),
    recordedCount: 0,
    sourceLabel: 'baseline_timetable',
  };
};
