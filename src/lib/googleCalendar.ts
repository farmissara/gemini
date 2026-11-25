import { Assignment, Course, DayOfWeek, TimetableSlot } from '../types';
import { ThaiHoliday, getHolidaysInRange } from './thaiHolidays';
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

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export class GoogleCalendarAuthExpiredError extends Error {
  constructor(message = 'เซสชันการเชื่อมต่อ Google Calendar หมดอายุ กรุณาลงชื่อเข้าใช้ใหม่อีกครั้ง') {
    super(message);
    this.name = 'GoogleCalendarAuthExpiredError';
  }
}

export interface GoogleCalendarEventPayload {
  syncKey: string;
  kind: 'timetable' | 'assignment' | 'holiday';
  summary: string;
  description: string;
  location?: string;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  recurrence?: string[];
  transparency?: 'opaque' | 'transparent';
  reminders: {
    useDefault: boolean;
    overrides: Array<{ method: 'popup' | 'email'; minutes: number }>;
  };
  extendedProperties: {
    private: {
      baanpakkruSource: 'baanpakkru';
      baanpakkruSyncKey: string;
      baanpakkruSchoolId: string;
    };
  };
}

export interface BuildGoogleCalendarEventsOptions {
  slots: TimetableSlot[];
  assignments?: Assignment[];
  courses?: Course[];
  holidays?: ThaiHoliday[];
  schoolId: string;
  academicYear: string;
  semester: string;
  startDateValue: string;
  endDateValue: string;
  includeTimetable?: boolean;
  includeAssignments?: boolean;
  includeHolidays?: boolean;
  reminderMinutes?: number;
  excludeHolidays?: boolean;
}

export interface GoogleCalendarSyncResult {
  created: number;
  updated: number;
  total: number;
}

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

function formatUtcDateOnly(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addDaysDateOnly(dateStr: string, days: number): string {
  const date = parseDateOnlyUtc(dateStr);
  if (!date) return dateStr;
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDateOnly(date);
}

function toCompactUtc(dateStr: string, hm: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hm.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh - 7, mm, 0));
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function toCompactBangkokLocal(dateStr: string, hm: string): string {
  return `${dateStr.replace(/-/g, '')}T${hm.replace(':', '')}00`;
}

function toBangkokIsoDateTime(dateStr: string, hm: string): string {
  return `${dateStr}T${hm}:00+07:00`;
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

  const firstDateStr = formatUtcDateOnly(firstOccurrence);
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

export function buildGoogleCalendarEventPayloads(
  options: BuildGoogleCalendarEventsOptions
): GoogleCalendarEventPayload[] {
  const {
    slots,
    assignments = [],
    courses = [],
    holidays,
    schoolId,
    academicYear,
    semester,
    startDateValue,
    endDateValue,
    includeTimetable = true,
    includeAssignments = true,
    includeHolidays = true,
    reminderMinutes = 15,
    excludeHolidays = true,
  } = options;

  const startDate = parseDateOnlyUtc(startDateValue);
  const endDate = parseDateOnlyUtc(endDateValue);
  if (!startDate || !endDate) {
    throw new Error('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดให้ถูกต้อง');
  }
  if (startDate > endDate) {
    throw new Error('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น');
  }

  const holidaysInRange = holidays ?? getHolidaysInRange(startDateValue, endDateValue, schoolId);
  const cleanReminderMinutes =
    Number.isFinite(reminderMinutes) && reminderMinutes > 0
      ? Math.min(180, Math.round(reminderMinutes))
      : 0;
  const untilCompact = toCompactUtc(endDateValue, '23:59');
  const payloads: GoogleCalendarEventPayload[] = [];

  if (includeTimetable) {
    slots.forEach((slot) => {
      const targetDayIdx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(slot.dayOfWeek);
      const byDay = ICAL_DAYS[slot.dayOfWeek];
      const startHm = parseHm(slot.startTime);
      const endHm = parseHm(slot.endTime);
      if (targetDayIdx < 0 || !byDay || !startHm || !endHm || endHm <= startHm) return;

      const firstOccurrence = new Date(startDate);
      const daysUntil = (targetDayIdx - firstOccurrence.getUTCDay() + 7) % 7;
      firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + daysUntil);
      if (firstOccurrence > endDate) return;

      const firstDateStr = formatUtcDateOnly(firstOccurrence);
      const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(
        slot.teacherName,
        slot.coTeacherName
      );
      const termKey = `${slot.academicYear || academicYear}-${slot.semester || semester}`;
      const syncKey = `slot:${schoolId}:${termKey}:${slot.id}`;

      const exdateValues = excludeHolidays
        ? holidaysInRange
            .filter((holiday) => holiday.isSchoolDayOff !== false)
            .filter((holiday) => {
              const holidayDate = parseDateOnlyUtc(holiday.date);
              return (
                holidayDate !== null &&
                holidayDate >= firstOccurrence &&
                holidayDate <= endDate &&
                holidayDate.getUTCDay() === targetDayIdx
              );
            })
            .map((holiday) => toCompactBangkokLocal(holiday.date, startHm))
        : [];

      const recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilCompact}`];
      if (exdateValues.length > 0) {
        recurrence.push(`EXDATE;TZID=Asia/Bangkok:${exdateValues.join(',')}`);
      }

      payloads.push({
        syncKey,
        kind: 'timetable',
        summary: `${slot.courseCode} - ${slot.courseTitleTh || slot.courseTitleEn}`,
        description: [
          `ห้องเรียน: ${slot.classRoom || 'ไม่ระบุ'}`,
          `วัน${DAY_LABELS_TH[slot.dayOfWeek]} คาบที่ ${slot.periodNumber} (${startHm} - ${endHm})`,
          `ครูผู้สอนหลัก: ${teacherName || 'ไม่ระบุ'}`,
          ...(coTeacherName ? [`ครูสอนคู่: ${coTeacherName}`] : []),
          `สถานที่: ${slot.room || 'ไม่ระบุ'}`,
          `ภาคเรียน: ${termKey}`,
        ].join('\n'),
        location: slot.room || slot.classRoom || '',
        start: {
          dateTime: toBangkokIsoDateTime(firstDateStr, startHm),
          timeZone: 'Asia/Bangkok',
        },
        end: {
          dateTime: toBangkokIsoDateTime(firstDateStr, endHm),
          timeZone: 'Asia/Bangkok',
        },
        recurrence,
        reminders:
          cleanReminderMinutes > 0
            ? {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: cleanReminderMinutes }],
              }
            : { useDefault: false, overrides: [] },
        extendedProperties: {
          private: {
            baanpakkruSource: 'baanpakkru',
            baanpakkruSyncKey: syncKey,
            baanpakkruSchoolId: schoolId,
          },
        },
      });
    });
  }

  if (includeAssignments && assignments.length > 0) {
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    assignments.forEach((assignment) => {
      if (assignment.status === 'closed') return;
      const trimmed = (assignment.dueDate || '').trim();
      const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
      const dateTime = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/.exec(trimmed);

      let dateStr = '';
      let startHm = '16:00';
      let endHm = '17:00';
      if (dateOnly) {
        dateStr = `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
      } else if (dateTime) {
        dateStr = `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`;
        startHm = `${dateTime[4]}:${dateTime[5]}`;
        const startMin = Number(dateTime[4]) * 60 + Number(dateTime[5]);
        const endMin = Math.min(23 * 60 + 59, startMin + 60);
        endHm = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
      } else {
        return;
      }

      const course = courseMap.get(assignment.courseId);
      const courseCode = assignment.courseCode || course?.code || '';
      const courseName = course?.titleTh || course?.titleEn || '';
      const syncKey = `asg:${schoolId}:${assignment.id}`;

      payloads.push({
        syncKey,
        kind: 'assignment',
        summary: `กำหนดส่งงาน${courseCode ? ` [${courseCode}]` : ''}: ${assignment.titleTh || assignment.titleEn}`,
        description: [
          courseCode || courseName ? `รายวิชา: ${[courseCode, courseName].filter(Boolean).join(' - ')}` : '',
          `ชื่องาน: ${assignment.titleTh || assignment.titleEn}`,
          `คะแนนเต็ม: ${assignment.maxScore ?? assignment.points ?? 10} คะแนน`,
          `กำหนดส่ง: ${assignment.dueDate}`,
          assignment.description ? `รายละเอียด: ${assignment.description}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        start: {
          dateTime: toBangkokIsoDateTime(dateStr, startHm),
          timeZone: 'Asia/Bangkok',
        },
        end: {
          dateTime: toBangkokIsoDateTime(dateStr, endHm),
          timeZone: 'Asia/Bangkok',
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 24 * 60 }],
        },
        extendedProperties: {
          private: {
            baanpakkruSource: 'baanpakkru',
            baanpakkruSyncKey: syncKey,
            baanpakkruSchoolId: schoolId,
          },
        },
      });
    });
  }

  if (includeHolidays) {
    holidaysInRange.forEach((holiday) => {
      const syncKey = `hol:${schoolId}:${holiday.id}`;
      const categoryLabel = holiday.type === 'school' ? 'วันหยุดพิเศษโรงเรียน' : 'วันหยุดราชการ';
      payloads.push({
        syncKey,
        kind: 'holiday',
        summary: `${categoryLabel}: ${holiday.nameTh}`,
        description: `${holiday.nameTh} (${holiday.nameEn})\nประเภท: ${categoryLabel}`,
        start: { date: holiday.date },
        end: { date: addDaysDateOnly(holiday.date, 1) },
        transparency: 'transparent',
        reminders: { useDefault: false, overrides: [] },
        extendedProperties: {
          private: {
            baanpakkruSource: 'baanpakkru',
            baanpakkruSyncKey: syncKey,
            baanpakkruSchoolId: schoolId,
          },
        },
      });
    });
  }

  return payloads;
}

async function listExistingSyncedEvents(accessToken: string): Promise<Map<string, string>> {
  const existingByKey = new Map<string, string>();
  let pageToken = '';

  do {
    const params = new URLSearchParams({
      privateExtendedProperty: 'baanpakkruSource=baanpakkru',
      maxResults: '2500',
      singleEvents: 'false',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${CALENDAR_API_BASE}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      throw new GoogleCalendarAuthExpiredError();
    }
    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const message =
        errorBody?.error?.message || `ไม่สามารถอ่านรายการใน Google Calendar ได้ (${res.status})`;
      throw new Error(message);
    }

    const data = (await res.json()) as {
      items?: Array<{
        id?: string;
        extendedProperties?: { private?: Record<string, string> };
      }>;
      nextPageToken?: string;
    };

    (data.items || []).forEach((item) => {
      const key = item.extendedProperties?.private?.baanpakkruSyncKey;
      if (item.id && key) {
        existingByKey.set(key, item.id);
      }
    });

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return existingByKey;
}

export async function syncTimetableToGoogleCalendar(params: {
  accessToken: string;
  payloads: GoogleCalendarEventPayload[];
  onProgress?: (progress: { completed: number; total: number; summary: string }) => void;
}): Promise<GoogleCalendarSyncResult> {
  const { accessToken, payloads, onProgress } = params;
  if (!accessToken) {
    throw new GoogleCalendarAuthExpiredError();
  }
  if (payloads.length === 0) {
    throw new Error('ไม่มีรายการที่เลือกสำหรับซิงค์เข้า Google Calendar');
  }

  const existingByKey = await listExistingSyncedEvents(accessToken);
  let created = 0;
  let updated = 0;

  for (let idx = 0; idx < payloads.length; idx += 1) {
    const payload = payloads[idx];
    const existingId = existingByKey.get(payload.syncKey);
    const { syncKey: _syncKey, kind: _kind, ...eventBody } = payload;
    const url = existingId
      ? `${CALENDAR_API_BASE}/${encodeURIComponent(existingId)}`
      : CALENDAR_API_BASE;
    const method = existingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (res.status === 401) {
      throw new GoogleCalendarAuthExpiredError();
    }
    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const message =
        errorBody?.error?.message || `ซิงค์รายการ "${payload.summary}" ไม่สำเร็จ (${res.status})`;
      throw new Error(message);
    }

    if (existingId) {
      updated += 1;
    } else {
      created += 1;
    }

    onProgress?.({
      completed: idx + 1,
      total: payloads.length,
      summary: payload.summary,
    });
  }

  return {
    created,
    updated,
    total: payloads.length,
  };
}
