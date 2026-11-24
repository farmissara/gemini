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
import { DEFAULT_SCHOOL_PERIODS } from '../../lib/schoolPeriods';
import { getLocalDateString } from '../../lib/date';
import { getHolidayForDate, isWeekendDate } from '../../lib/thaiHolidays';
import { sendEduVerseNotification } from '../../lib/pushNotifications';
import { resolveMatchedTeacherForUser, slotMatchesLoggedInTeacher } from '../../lib/courseTeacherFilter';
import { filterTimetableSlotsForPersonalRole } from '../../lib/studentDataScope';
import { STORAGE_KEYS } from '../../services/storage/localStorageService';

interface UseScheduleNotificationWatcherParams {
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
}: UseScheduleNotificationWatcherParams) {
  useEffect(() => {
    if (!currentUser || currentUser.role === 'parent') return;
    const FIRED_STORAGE_PREFIX = STORAGE_KEYS.firedScheduleAlertsPrefix;

    const readFiredForDay = (dayStr: string): Set<string> => {
      try {
        const raw = window.localStorage.getItem(`${FIRED_STORAGE_PREFIX}${dayStr}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? new Set(parsed) : new Set();
      } catch {
        return new Set();
      }
    };

    const markFiredForDay = (dayStr: string, set: Set<string>, key: string) => {
      set.add(key);
      try {
        window.localStorage.setItem(`${FIRED_STORAGE_PREFIX}${dayStr}`, JSON.stringify(Array.from(set)));
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(FIRED_STORAGE_PREFIX) && k !== `${FIRED_STORAGE_PREFIX}${dayStr}`) {
            window.localStorage.removeItem(k);
          }
        }
      } catch {
        // ignore quota errors
      }
    };

    const checkScheduleAndAttendance = () => {
      const now = new Date();
      const todayStr = getLocalDateString();
      const firedAlerts = readFiredForDay(todayStr);
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const totalMinutes = currentHours * 60 + currentMins;
      const dayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[now.getDay()];

      if (isWeekendDate(todayStr)) return;
      const todayHoliday = getHolidayForDate(todayStr, schoolId);
      if (todayHoliday) {
        const holidayKey = `${todayStr}-holiday-${todayHoliday.id}-${currentUser.id}`;
        const unifiedHolidayTag = `hol-notif-${todayHoliday.date}-${todayHoliday.id}`;
        if (!firedAlerts.has(holidayKey)) {
          markFiredForDay(todayStr, firedAlerts, holidayKey);
          sendEduVerseNotification({
            title: `🗓️ วันหยุด: ${todayHoliday.nameTh}`,
            body: 'ไม่มีการเรียนการสอนในวันนี้ (ระบบหยุดการแจ้งเตือนเข้าคาบเรียนอัตโนมัติ)',
            category: 'announcement',
            priority: 'normal',
            tag: unifiedHolidayTag,
            dedupeByTag: true,
            schoolId: schoolId || currentUser.schoolId,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
            sourceKind: 'holiday',
          }).catch(() => {});
        }
        return;
      }

      // 1. Morning School Arrival (07:30 - 08:00: reminder to check-in)
      const morningKey = `${todayStr}-morning-arrival-${currentUser.id}`;
      if (totalMinutes >= 450 && totalMinutes <= 480 && !firedAlerts.has(morningKey)) {
        markFiredForDay(todayStr, firedAlerts, morningKey);
        sendEduVerseNotification({
          title: '☀️ สวัสดีตอนเช้า: อย่าลืมสแกนเข้าโรงเรียน',
          body: 'ยินดีต้อนรับสู่โรงเรียน กรุณาถ่ายรูปหรือสแกนบัตรเช็คอินผ่านพิกัด GPS ประตูโรงเรียนก่อนเวลา 08:00 น.',
          category: 'attendance',
          priority: 'normal',
          tag: morningKey,
          dedupeByTag: true,
          schoolId,
          targetUserIds: [currentUser.id],
          targetRoles: [currentUser.role],
        }).catch(() => {});
      }

      // 2. Morning Late Alert (> 08:05: if not checked in yet)
      const lateKey = `${todayStr}-morning-late-alert-${currentUser.id}`;
      if (totalMinutes >= 485 && totalMinutes <= 540 && !firedAlerts.has(lateKey)) {
        markFiredForDay(todayStr, firedAlerts, lateKey);
        const userHasCheckedIn = attendance.some(
          (a) =>
            a.date === todayStr &&
            (a.recordType === 'check_in' || !a.recordType) &&
            ((currentUser?.studentRecordId && a.studentId === currentUser.studentRecordId) ||
              (currentUser?.teacherRecordId &&
                (a.teacherId === currentUser.teacherRecordId || a.studentId === currentUser.teacherRecordId)) ||
              (currentUser?.fullNameTh && a.userName?.includes(currentUser.fullNameTh)))
        );
        if (!userHasCheckedIn) {
          sendEduVerseNotification({
            title: '⚠️ แจ้งเตือนเวลาเข้าโรงเรียน (เลยเวลา 08:00 น.)',
            body: 'ขณะนี้เลยเวลา 08:00 น. แล้ว ระบบยังไม่พบบันทึกการเช็คอินเข้าโรงเรียนของคุณ กรุณาติดต่อครูเวรประจำวันหรือสแกนเช็คชื่อด่วน',
            category: 'attendance',
            priority: 'urgent',
            tag: lateKey,
            dedupeByTag: true,
            schoolId,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }
      }

      // 3. Afternoon Departure Check-out (15:30 - 16:30)
      const departureKey = `${todayStr}-afternoon-departure-${currentUser.id}`;
      if (totalMinutes >= 930 && totalMinutes <= 990 && !firedAlerts.has(departureKey)) {
        markFiredForDay(todayStr, firedAlerts, departureKey);
        sendEduVerseNotification({
          title: '🏫 สิ้นสุดเวลาเรียนประจำวัน: อย่าลืมเช็คเอาท์',
          body: 'หมดเวลาเรียนตามตารางแล้ว กรุณาสแกนหรือถ่ายรูปเช็คเอาท์ (Check-out) ก่อนเดินทางกลับบ้านอย่างปลอดภัย',
          category: 'attendance',
          priority: 'normal',
          tag: departureKey,
          dedupeByTag: true,
          schoolId,
          targetUserIds: [currentUser.id],
          targetRoles: [currentUser.role],
        }).catch(() => {});
      }

      // 4. Period Timetable Notifications
      const personalTodaySlots = currentUser.role === 'teacher'
        ? schoolTimetableSlots.filter((slot) =>
            slot.dayOfWeek === dayKey &&
            slotMatchesLoggedInTeacher(
              slot,
              currentUser,
              resolveMatchedTeacherForUser(currentUser, schoolTeachers),
              schoolCourses
            )
          )
        : filterTimetableSlotsForPersonalRole(
            schoolTimetableSlots,
            currentUser,
            schoolStudents,
            schoolCourses
          ).filter((slot) => slot.dayOfWeek === dayKey);

      const periodsToCheck = (schoolPeriods.length > 0 ? schoolPeriods : DEFAULT_SCHOOL_PERIODS).filter(
        (p) => !p.isBreak && p.periodNumber > 0
      );

      periodsToCheck.forEach((p) => {
        const matchedSlot = personalTodaySlots.find((s) => s.periodNumber === p.periodNumber);
        if (!matchedSlot) return;

        const [sH, sM] = p.startTime.split(':').map(Number);
        const [eH, eM] = p.endTime.split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;
        const subjectLabel = matchedSlot.courseTitleTh || matchedSlot.courseCode || `คาบที่ ${p.periodNumber}`;

        // 4.1. Period Start & Check-in Reminder
        const pStartKey = `${todayStr}-p${p.periodNumber}-start-${currentUser.id}`;
        if (totalMinutes >= startMin - 5 && totalMinutes <= startMin + 3 && !firedAlerts.has(pStartKey)) {
          markFiredForDay(todayStr, firedAlerts, pStartKey);
          sendEduVerseNotification({
            title: `⏰ คาบที่ ${p.periodNumber}: ${subjectLabel} (${p.startTime} - ${p.endTime})`,
            body: `ใกล้เริ่มวิชา ${subjectLabel} ห้อง ${matchedSlot.room || '-'} แล้ว กรุณาเช็คชื่อเข้าคาบเรียน (Check-in)`,
            category: 'attendance',
            priority: 'urgent',
            tag: pStartKey,
            dedupeByTag: true,
            schoolId,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }

        // 4.2. Mid-period Late / Missed Check-in Reminder
        const pLateKey = `${todayStr}-p${p.periodNumber}-missed-${currentUser.id}`;
        if (totalMinutes >= startMin + 10 && totalMinutes <= startMin + 15 && !firedAlerts.has(pLateKey)) {
          markFiredForDay(todayStr, firedAlerts, pLateKey);
          sendEduVerseNotification({
            title: `⚠️ แจ้งเตือนเช็คชื่อคาบที่ ${p.periodNumber}: ${subjectLabel}`,
            body: `วิชา ${subjectLabel} (${p.startTime} - ${p.endTime}) เริ่มไปแล้ว 10 นาที กรุณาตรวจสอบการเช็คชื่อเข้าคาบเรียน`,
            category: 'attendance',
            priority: 'urgent',
            tag: pLateKey,
            dedupeByTag: true,
            schoolId,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }

        // 4.3. Period End & Check-out Reminder
        const pEndKey = `${todayStr}-p${p.periodNumber}-end-${currentUser.id}`;
        if (totalMinutes >= endMin - 2 && totalMinutes <= endMin + 3 && !firedAlerts.has(pEndKey)) {
          markFiredForDay(todayStr, firedAlerts, pEndKey);
          sendEduVerseNotification({
            title: `🔔 สิ้นสุดคาบที่ ${p.periodNumber}: ${subjectLabel} (${p.endTime} น.)`,
            body: `หมดเวลาวิชา ${subjectLabel} แล้ว สามารถกดเช็คชื่อออกคาบเรียน (Check-out) ได้จากตารางเรียน`,
            category: 'attendance',
            priority: 'normal',
            tag: pEndKey,
            dedupeByTag: true,
            schoolId,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }
      });
    };

    checkScheduleAndAttendance();
    const interval = setInterval(checkScheduleAndAttendance, 30000);
    return () => clearInterval(interval);
  }, [schoolPeriods, attendance, currentUser, schoolId, schoolTimetableSlots, schoolTeachers, schoolStudents, schoolCourses]);
}
