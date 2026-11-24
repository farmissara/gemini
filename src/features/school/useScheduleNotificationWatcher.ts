import { useEffect } from 'react';
import type {
  AttendanceRecord,
  AuthUser,
  Course,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../../types';
import { resolveOwnStudent, resolveOwnTeacher } from '../../lib/attendanceScope';
import { sendEduVerseNotification } from '../../lib/pushNotifications';
import { getHolidayForDate, isWeekendDate } from '../../lib/thaiHolidays';
import { getBangkokClockSnapshot, getTimetableSlotActivityStatus } from '../../lib/timetableCalendar';
import { slotHasTeacher } from '../../lib/timetableTeachers';

export interface UseScheduleNotificationWatcherParams {
  currentUser: AuthUser | null;
  schoolId: string;
  schoolPeriods: SchoolPeriodTime[];
  attendance: AttendanceRecord[];
  schoolTimetableSlots: TimetableSlot[];
  schoolTeachers: Teacher[];
  schoolStudents: Student[];
  schoolCourses: Course[];
}

export function useScheduleNotificationWatcher({
  currentUser,
  schoolId,
  schoolPeriods,
  attendance,
  schoolTimetableSlots,
  schoolTeachers,
  schoolStudents,
  schoolCourses,
}: UseScheduleNotificationWatcherParams): void {
  useEffect(() => {
    if (!currentUser || !schoolId) return;
    if (currentUser.role !== 'teacher' && currentUser.role !== 'student') return;

    const checkSchedule = () => {
      const now = getBangkokClockSnapshot();
      if (isWeekendDate(now.dateStr)) return;
      if (getHolidayForDate(now.dateStr, schoolId)?.isSchoolDayOff) return;

      const ownTeacher = currentUser.role === 'teacher'
        ? resolveOwnTeacher(currentUser, schoolTeachers)
        : undefined;
      const ownStudent = currentUser.role === 'student'
        ? resolveOwnStudent(currentUser, schoolStudents)
        : undefined;

      // Morning check-in reminder (07:30 - 08:30 Asia/Bangkok) if user has not checked in today
      if (now.minutes >= 7 * 60 + 30 && now.minutes <= 8 * 60 + 30) {
        const selfId = ownTeacher?.id || ownStudent?.id || currentUser.id;
        const alreadyCheckedIn = attendance.some(
          (rec) =>
            rec.date === now.dateStr &&
            (rec.studentId === selfId ||
              rec.teacherId === selfId ||
              rec.studentId === currentUser.id ||
              rec.teacherId === currentUser.id) &&
            (rec.recordType === 'check_in' || !rec.recordType),
        );
        if (!alreadyCheckedIn) {
          void sendEduVerseNotification({
            title: '⏰ แจ้งเตือนลงเวลาเข้าเรียน/ปฏิบัติงาน',
            body: 'ยังไม่มีบันทึกการเช็คชื่อเข้าเรียนหรือปฏิบัติงานสำหรับวันนี้',
            category: 'attendance',
            tag: `checkin-reminder-${now.dateStr}-${currentUser.id}`,
            dedupeByTag: true,
            schoolId,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          });
        }
      }

      const courseMap = new Map(schoolCourses.map((course) => [course.id, course]));
      const teacherNames = [
        ownTeacher?.fullNameTh,
        ownTeacher?.fullNameEn,
        currentUser.fullNameTh,
        currentUser.fullNameEn,
      ].filter((value): value is string => Boolean(value && value.trim()));

      const studentGradeRoom = ownStudent
        ? `${ownStudent.gradeLevel} ห้อง ${ownStudent.room}`.trim().toLowerCase()
        : '';

      const relevantSlots = schoolTimetableSlots.filter((slot) => {
        if (currentUser.role === 'teacher') {
          if (teacherNames.some((name) => slotHasTeacher(slot, name))) return true;
          const course = slot.courseId ? courseMap.get(slot.courseId) : undefined;
          return Boolean(
            ownTeacher?.email &&
            course?.teacherEmail &&
            course.teacherEmail.trim().toLowerCase() === ownTeacher.email.trim().toLowerCase(),
          );
        }
        if (!ownStudent) return false;
        const slotRoom = (slot.classRoom || '').trim().toLowerCase();
        if (
          slotRoom &&
          (slotRoom === (ownStudent.room || '').trim().toLowerCase() ||
            slotRoom === studentGradeRoom ||
            (slotRoom.includes(ownStudent.gradeLevel.toLowerCase()) &&
              slotRoom.includes(ownStudent.room.toLowerCase())))
        ) {
          return true;
        }
        const course = slot.courseId ? courseMap.get(slot.courseId) : undefined;
        return Boolean(course?.enrolledStudentIds?.includes(ownStudent.id));
      });

      for (const slot of relevantSlots) {
        const status = getTimetableSlotActivityStatus({
          slot,
          schoolPeriods,
          now,
          schoolId,
        });
        if (!status.isTodayWeekday || status.isHolidayOff) continue;

        const isUpcomingSoon =
          status.minutesUntilStart !== null &&
          status.minutesUntilStart >= 0 &&
          status.minutesUntilStart <= 10;

        if (!isUpcomingSoon) continue;

        const course = slot.courseId ? courseMap.get(slot.courseId) : undefined;
        const subjectTitle = slot.courseTitleTh || course?.titleTh || slot.courseCode || 'รายวิชา';
        const roomLabel = slot.room || slot.classRoom || '';

        void sendEduVerseNotification({
          title: `🔔 คาบเรียนถัดไปในอีก ${status.minutesUntilStart} นาที: ${subjectTitle}`,
          body: `คาบที่ ${slot.periodNumber} (${status.startTime}–${status.endTime})${roomLabel ? ` • ห้อง ${roomLabel}` : ''}`,
          category: 'system',
          tag: `schedule-reminder-${now.dateStr}-${slot.id}-${currentUser.id}`,
          dedupeByTag: true,
          schoolId,
          targetUserIds: [currentUser.id],
          targetRoles: [currentUser.role],
        });
      }
    };

    checkSchedule();
    const timer = window.setInterval(checkSchedule, 60_000);
    return () => window.clearInterval(timer);
  }, [
    currentUser,
    schoolId,
    schoolPeriods,
    attendance,
    schoolTimetableSlots,
    schoolTeachers,
    schoolStudents,
    schoolCourses,
  ]);
}
