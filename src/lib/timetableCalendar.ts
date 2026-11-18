import { Assignment, Course, DayOfWeek, SchoolPeriodTime, TimetableSlot } from '../types';
import { parseSlotTeachersFromRaw } from './timetableTeachers';
import { getHolidayForDate, getHolidaysInRange, isWeekendDate } from './thaiHolidays';

const BANGKOK_OFFSET_MINUTES = 7 * 60;
const ICAL_DAYS: Record<DayOfWeek, string> = {
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
};
const textEncoder = new TextEncoder();

function parseDateInput(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('กรุณาเลือกวันที่ให้ถูกต้อง');
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  if (
    date.getUTCFullYear() !== Number(yearText) ||
    date.getUTCMonth() !== Number(monthText) - 1 ||
    date.getUTCDate() !== Number(dayText)
  ) {
    throw new Error('วันที่ที่เลือกไม่ถูกต้อง');
  }
  return date;
}

function formatDateInput(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function formatIcsAllDayValue(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  return hours <= 23 ? hours * 60 + Number(match[2]) : null;
}

function formatIcsUtc(date: Date, minutes: number, seconds = 0): string {
  const timestamp = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, minutes, seconds)
      - BANGKOK_OFFSET_MINUTES * 60_000
  );
  return timestamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldIcsLine(line: string): string {
  const folded: string[] = [];
  let current = '';
  let byteLength = 0;
  for (const character of line) {
    const characterLength = textEncoder.encode(character).length;
    if (byteLength + characterLength > 75) {
      folded.push(current);
      current = ` ${character}`;
      byteLength = characterLength + 1;
    } else {
      current += character;
      byteLength += characterLength;
    }
  }
  folded.push(current);
  return folded.join('\r\n');
}

export function getBangkokDateInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export interface BangkokClockSnapshot {
  dateStr: string;
  dayKey: DayOfWeek | 'sun' | 'sat';
  minutes: number;
  timeLabel: string;
}

export function getBangkokClockSnapshot(date = new Date()): BangkokClockSnapshot {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dateStr = `${values.year}-${values.month}-${values.day}`;
  const rawHour = Number(values.hour);
  const hour = Number.isFinite(rawHour) ? rawHour % 24 : 0;
  const rawMinute = Number(values.minute);
  const minute = Number.isFinite(rawMinute) ? rawMinute % 60 : 0;
  const dow = parseDateInput(dateStr).getUTCDay();
  const dayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dow] || 'mon') as DayOfWeek | 'sun' | 'sat';
  return {
    dateStr,
    dayKey,
    minutes: hour * 60 + minute,
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export type TimetableMissionPhase = 'active' | 'upcoming' | 'ended' | 'holiday';

export interface TimetableSlotActivityStatus {
  isActive: boolean;
  isTodayWeekday: boolean;
  isHolidayOff: boolean;
  missionPhase: TimetableMissionPhase;
  startTime: string;
  endTime: string;
  startMinutes: number | null;
  endMinutes: number | null;
  remainingMinutes: number | null;
  minutesUntilStart: number | null;
}

export function getTimetableSlotActivityStatus(params: {
  slot: Pick<TimetableSlot, 'dayOfWeek' | 'periodNumber' | 'startTime' | 'endTime'>;
  schoolPeriods?: SchoolPeriodTime[];
  now: BangkokClockSnapshot;
  schoolId?: string;
  targetDateStr?: string;
}): TimetableSlotActivityStatus {
  const { slot, schoolPeriods = [], now, schoolId, targetDateStr } = params;
  const periodDef = schoolPeriods.find((p) => !p.isBreak && p.periodNumber === slot.periodNumber);
  const startTime = (slot.startTime || periodDef?.startTime || '').trim();
  const endTime = (slot.endTime || periodDef?.endTime || '').trim();
  const startMinutes = startTime ? parseTime(startTime) : null;
  const endMinutes = endTime ? parseTime(endTime) : null;
  const checkDateStr = targetDateStr || now.dateStr;
  const isTodayWeekday =
    checkDateStr === now.dateStr &&
    !isWeekendDate(checkDateStr) &&
    slot.dayOfWeek === now.dayKey;
  const isHolidayOff = Boolean(getHolidayForDate(checkDateStr, schoolId)?.isSchoolDayOff);
  const isInTimeWindow =
    startMinutes !== null &&
    endMinutes !== null &&
    now.minutes >= startMinutes &&
    now.minutes <= endMinutes;
  const isActive = isTodayWeekday && !isHolidayOff && isInTimeWindow;
  const remainingMinutes =
    isActive && endMinutes !== null ? Math.max(0, endMinutes - now.minutes) : null;
  const minutesUntilStart =
    isTodayWeekday && !isHolidayOff && startMinutes !== null && now.minutes < startMinutes
      ? startMinutes - now.minutes
      : null;

  let missionPhase: TimetableMissionPhase = 'upcoming';
  if (isHolidayOff || isWeekendDate(checkDateStr)) {
    missionPhase = 'holiday';
  } else if (isActive) {
    missionPhase = 'active';
  } else if (isTodayWeekday && endMinutes !== null && now.minutes > endMinutes) {
    missionPhase = 'ended';
  }

  return {
    isActive,
    isTodayWeekday,
    isHolidayOff,
    missionPhase,
    startTime,
    endTime,
    startMinutes,
    endMinutes,
    remainingMinutes,
    minutesUntilStart,
  };
}

export function getCalendarWeekStart(value: string): string {
  const date = parseDateInput(value);
  const dayFromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayFromMonday);
  return formatDateInput(date);
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseDateInput(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInput(date);
}

export function formatCalendarDate(value: string): string {
  return parseDateInput(value).toLocaleDateString('th-TH', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export interface BuildTimetableIcsOptions {
  assignments?: Assignment[];
  courses?: Course[];
  includeTimetable?: boolean;
  includeAssignments?: boolean;
  includeHolidays?: boolean;
}

function parseAssignmentDueWindow(dueDateRaw: string): {
  date: Date;
  startMinutes: number;
  endMinutes: number;
} | null {
  const trimmed = (dueDateRaw || '').trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return {
      date: parseDateInput(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`),
      startMinutes: 16 * 60,
      endMinutes: 17 * 60,
    };
  }
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/.exec(trimmed);
  if (dateTime) {
    const [, y, m, d, hhStr, mmStr] = dateTime;
    const startMinutes = Number(hhStr) * 60 + Number(mmStr);
    const endMinutes = Math.min(23 * 60 + 59, startMinutes + 60);
    return {
      date: parseDateInput(`${y}-${m}-${d}`),
      startMinutes,
      endMinutes,
    };
  }
  return null;
}

export function buildTimetableIcs(
  slots: TimetableSlot[],
  startDateValue: string,
  endDateValue: string,
  calendarName: string,
  schoolId: string,
  options: BuildTimetableIcsOptions = {}
): string {
  const {
    assignments = [],
    courses = [],
    includeTimetable = true,
    includeAssignments = assignments.length > 0,
    includeHolidays = true,
  } = options;

  const startDate = parseDateInput(startDateValue);
  const endDate = parseDateInput(endDateValue);
  if (startDate > endDate) throw new Error('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น');

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const endUntil = formatIcsUtc(endDate, 23 * 60 + 59, 59);
  const events: string[][] = [];
  const invalidSlots: TimetableSlot[] = [];

  if (includeTimetable) {
    slots.forEach((slot) => {
      const firstOccurrence = new Date(startDate);
      const targetDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(slot.dayOfWeek);
      if (targetDay < 0 || !ICAL_DAYS[slot.dayOfWeek]) {
        invalidSlots.push(slot);
        return;
      }
      const daysUntilOccurrence = (targetDay - firstOccurrence.getUTCDay() + 7) % 7;
      firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + daysUntilOccurrence);
      if (firstOccurrence > endDate) return;

      const startMinutes = parseTime(slot.startTime);
      const endMinutes = parseTime(slot.endTime);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        invalidSlots.push(slot);
        return;
      }

      const termKey = `${slot.academicYear || ''}-${slot.semester || ''}`;
      const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(slot.teacherName, slot.coTeacherName);
      const description = [
        `ห้องเรียน: ${slot.classRoom || 'ไม่ระบุ'}`,
        `ครูผู้สอนหลัก: ${teacherName || 'ไม่ระบุ'}`,
        ...(coTeacherName ? [`ครูสอนคู่: ${coTeacherName}`] : []),
        `สถานที่: ${slot.room || 'ไม่ระบุ'}`,
        `ภาคเรียน: ${termKey}`,
      ].join('\n');
      const uid = `${encodeURIComponent(schoolId)}-${encodeURIComponent(slot.id)}-${encodeURIComponent(termKey)}@baanpakkru`;
      events.push([
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${formatIcsUtc(firstOccurrence, startMinutes)}`,
        `DTEND:${formatIcsUtc(firstOccurrence, endMinutes)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${ICAL_DAYS[slot.dayOfWeek]};UNTIL=${endUntil}`,
        `SUMMARY:${escapeIcsText(`${slot.courseCode} - ${slot.courseTitleTh || slot.courseTitleEn}`)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        `LOCATION:${escapeIcsText(slot.room || slot.classRoom || '')}`,
        'END:VEVENT',
      ]);
    });
  }

  if (invalidSlots.length > 0) {
    throw new Error(`มีคาบที่กำหนดวันหรือเวลาไม่ถูกต้อง ${invalidSlots.length} รายการ กรุณาตรวจสอบก่อนส่งออก`);
  }

  if (includeAssignments && assignments.length > 0) {
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    assignments.forEach((assignment) => {
      if (assignment.status === 'closed') return;
      const dueWindow = parseAssignmentDueWindow(assignment.dueDate);
      if (!dueWindow) return;

      const course = courseMap.get(assignment.courseId);
      const courseCode = assignment.courseCode || course?.code || '';
      const courseName = course?.titleTh || course?.titleEn || '';
      const description = [
        courseCode || courseName ? `รายวิชา: ${[courseCode, courseName].filter(Boolean).join(' - ')}` : '',
        `ชื่องาน: ${assignment.titleTh || assignment.titleEn}`,
        `คะแนนเต็ม: ${assignment.maxScore ?? assignment.points ?? 10} คะแนน`,
        `กำหนดส่ง: ${assignment.dueDate}`,
        assignment.description ? `รายละเอียด: ${assignment.description}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const uid = `${encodeURIComponent(schoolId)}-asg-${encodeURIComponent(assignment.id)}@baanpakkru`;
      events.push([
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${formatIcsUtc(dueWindow.date, dueWindow.startMinutes)}`,
        `DTEND:${formatIcsUtc(dueWindow.date, dueWindow.endMinutes)}`,
        `SUMMARY:${escapeIcsText(`กำหนดส่งงาน${courseCode ? ` [${courseCode}]` : ''}: ${assignment.titleTh || assignment.titleEn}`)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT24H',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcsText(`แจ้งเตือนครบกำหนดส่งงาน: ${assignment.titleTh || assignment.titleEn}`)}`,
        'END:VALARM',
        'END:VEVENT',
      ]);
    });
  }

  if (includeHolidays) {
    const holidays = getHolidaysInRange(startDateValue, endDateValue, schoolId);
    holidays.forEach((holiday) => {
      const nextDate = addCalendarDays(holiday.date, 1);
      const categoryLabel = holiday.type === 'school' ? 'วันหยุดพิเศษโรงเรียน' : 'วันหยุดราชการ';
      const uid = `${encodeURIComponent(schoolId)}-hol-${encodeURIComponent(holiday.id)}@baanpakkru`;
      events.push([
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${formatIcsAllDayValue(holiday.date)}`,
        `DTEND;VALUE=DATE:${formatIcsAllDayValue(nextDate)}`,
        `SUMMARY:${escapeIcsText(`${categoryLabel}: ${holiday.nameTh}`)}`,
        `DESCRIPTION:${escapeIcsText(`${holiday.nameTh} (${holiday.nameEn})\nประเภท: ${categoryLabel}`)}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      ]);
    });
  }

  if (events.length === 0) {
    throw new Error('ไม่พบตารางเรียน กำหนดส่งงาน หรือวันหยุดที่พร้อมส่งออก');
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//BaanPakKru//Timetable//TH',
    'X-WR-TIMEZONE:Asia/Bangkok',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    ...events.flat(),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
