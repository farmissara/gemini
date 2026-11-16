import { Assignment, Course, DayOfWeek, TimetableSlot } from '../types';
import { parseSlotTeachersFromRaw } from './timetableTeachers';

const ICAL_DAYS: Record<DayOfWeek, string> = {
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
};

const DAY_LABELS_TH: Record<DayOfWeek, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
};

function parseHm(value: string): string | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec((value || '').trim());
  if (!match) return null;
  const hh = Number(match[1]);
  if (hh > 23) return null;
  return `${String(hh).padStart(2, '0')}:${match[2]}`;
}

function parseDateOnlyUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

function toCompactUtc(dateStr: string, hm: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hm.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh - 7, mm, 0));
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildTimetableSlotCalendarTemplateUrl(params: {
  slot: TimetableSlot;
  startDateValue: string;
  endDateValue: string;
}): string | null {
  const { slot, startDateValue, endDateValue } = params;
  const startDate = parseDateOnlyUtc(startDateValue);
  const endDate = parseDateOnlyUtc(endDateValue);
  const startHm = parseHm(slot.startTime);
  const endHm = parseHm(slot.endTime);
  const byDay = ICAL_DAYS[slot.dayOfWeek];
  const targetDayIdx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(slot.dayOfWeek);

  if (!startDate || !endDate || !startHm || !endHm || endHm <= startHm || !byDay || targetDayIdx < 0) {
    return null;
  }

  const firstOccurrence = new Date(startDate);
  const daysUntil = (targetDayIdx - firstOccurrence.getUTCDay() + 7) % 7;
  firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + daysUntil);
  if (firstOccurrence > endDate) return null;

  const firstDateStr = [
    String(firstOccurrence.getUTCFullYear()).padStart(4, '0'),
    String(firstOccurrence.getUTCMonth() + 1).padStart(2, '0'),
    String(firstOccurrence.getUTCDate()).padStart(2, '0'),
  ].join('-');
  const untilCompact = toCompactUtc(endDateValue, '23:59');
  const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(slot.teacherName, slot.coTeacherName);

  const details = [
    `ห้องเรียน: ${slot.classRoom || 'ไม่ระบุ'}`,
    `วัน${DAY_LABELS_TH[slot.dayOfWeek]} คาบที่ ${slot.periodNumber} (${startHm} - ${endHm})`,
    `ครูผู้สอนหลัก: ${teacherName || 'ไม่ระบุ'}`,
    ...(coTeacherName ? [`ครูสอนคู่: ${coTeacherName}`] : []),
    `สถานที่: ${slot.room || 'ไม่ระบุ'}`,
  ].join('\n');

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${slot.courseCode} - ${slot.courseTitleTh || slot.courseTitleEn} (${slot.classRoom})`,
    dates: `${toCompactUtc(firstDateStr, startHm)}/${toCompactUtc(firstDateStr, endHm)}`,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilCompact}`,
    location: slot.room || slot.classRoom || '',
    details,
    ctz: 'Asia/Bangkok',
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export function buildAssignmentCalendarTemplateUrl(params: {
  assignment: Assignment;
  courses?: Course[];
}): string | null {
  const { assignment, courses = [] } = params;
  const trimmed = (assignment.dueDate || '').trim();
  let dateStr = '';
  let startHm = '16:00';
  let endHm = '17:00';

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/.exec(trimmed);

  if (dateOnly) {
    dateStr = `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  } else if (dateTime) {
    dateStr = `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`;
    startHm = `${dateTime[4]}:${dateTime[5]}`;
    const startMin = Number(dateTime[4]) * 60 + Number(dateTime[5]);
    const endMin = Math.min(23 * 60 + 59, startMin + 60);
    endHm = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  } else {
    return null;
  }

  const course = courses.find((c) => c.id === assignment.courseId);
  const courseCode = assignment.courseCode || course?.code || '';
  const courseName = course?.titleTh || course?.titleEn || '';

  const details = [
    courseCode || courseName ? `รายวิชา: ${[courseCode, courseName].filter(Boolean).join(' - ')}` : '',
    `ชื่องาน: ${assignment.titleTh || assignment.titleEn}`,
    `คะแนนเต็ม: ${assignment.maxScore ?? assignment.points ?? 10} คะแนน`,
    `กำหนดส่ง: ${assignment.dueDate}`,
    assignment.description ? `รายละเอียด: ${assignment.description}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: `กำหนดส่งงาน${courseCode ? ` [${courseCode}]` : ''}: ${assignment.titleTh || assignment.titleEn}`,
    dates: `${toCompactUtc(dateStr, startHm)}/${toCompactUtc(dateStr, endHm)}`,
    details,
    ctz: 'Asia/Bangkok',
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}
