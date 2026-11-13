import { DayOfWeek, TimetableSlot } from '../types';

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

export function buildTimetableIcs(
  slots: TimetableSlot[],
  startDateValue: string,
  endDateValue: string,
  calendarName: string,
  schoolId: string
): string {
  const startDate = parseDateInput(startDateValue);
  const endDate = parseDateInput(endDateValue);
  if (startDate > endDate) throw new Error('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น');

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const endUntil = formatIcsUtc(endDate, 23 * 60 + 59, 59);
  const events: string[][] = [];
  const invalidSlots: TimetableSlot[] = [];

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
    const description = [
      `ห้องเรียน: ${slot.classRoom || 'ไม่ระบุ'}`,
      `ครูผู้สอน: ${slot.teacherName || 'ไม่ระบุ'}`,
      `สถานที่: ${slot.room || 'ไม่ระบุ'}`,
      `ภาคเรียน: ${termKey}`,
    ].join('\n');
    const uid = `${encodeURIComponent(schoolId)}-${encodeURIComponent(slot.id)}-${encodeURIComponent(termKey)}@eduverse`;
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

  if (invalidSlots.length > 0) {
    throw new Error(`มีคาบที่กำหนดวันหรือเวลาไม่ถูกต้อง ${invalidSlots.length} รายการ กรุณาตรวจสอบก่อนส่งออก`);
  }
  if (events.length === 0) throw new Error('ไม่พบคาบเรียนในช่วงวันที่เลือก');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//EduVerse//Timetable//TH',
    'X-WR-TIMEZONE:Asia/Bangkok',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    ...events.flat(),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
