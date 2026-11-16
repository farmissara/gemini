import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Assignment, Course, DayOfWeek, TimetableSlot } from '../types';
import { parseSlotTeachersFromRaw } from './timetableTeachers';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
] as const;

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const BANGKOK_OFFSET_MINUTES = 7 * 60;
const ICAL_DAYS: Record<DayOfWeek, string> = {
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
};

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const googleCalendarAuth = getAuth(firebaseApp);

// Strictly in-memory OAuth access token storage (never persisted to web storage)
let cachedAccessToken: string | null = null;
let tokenExpiresAtMs = 0;

onAuthStateChanged(googleCalendarAuth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    tokenExpiresAtMs = 0;
  }
});

export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  backgroundColor?: string;
}

export interface GoogleCalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface SyncTimetableResult {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface DeleteSyncedEventsResult {
  deletedCount: number;
  errors: string[];
}

export function getGoogleCalendarUser(): User | null {
  return googleCalendarAuth.currentUser;
}

export function getGoogleCalendarToken(): string | null {
  if (!cachedAccessToken) return null;
  if (Date.now() > tokenExpiresAtMs - 60_000) {
    cachedAccessToken = null;
    tokenExpiresAtMs = 0;
    return null;
  }
  return cachedAccessToken;
}

export function subscribeGoogleCalendarAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(googleCalendarAuth, (user) => {
    if (!user) {
      cachedAccessToken = null;
      tokenExpiresAtMs = 0;
    }
    callback(user);
  });
}

export async function googleCalendarSignIn(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  GOOGLE_CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'consent select_account' });

  const result = await signInWithPopup(googleCalendarAuth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || '';

  if (!accessToken) {
    throw new Error('ไม่ได้รับสิทธิ์ Access Token สำหรับ Google Calendar กรุณาลองเข้าสู่ระบบอีกครั้ง');
  }

  cachedAccessToken = accessToken;
  tokenExpiresAtMs = Date.now() + 50 * 60 * 1000;
  return { user: result.user, accessToken };
}

export async function googleCalendarSignOut(): Promise<void> {
  cachedAccessToken = null;
  tokenExpiresAtMs = 0;
  await signOut(googleCalendarAuth);
}

async function calendarFetch<T>(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (response.status === 401) {
    cachedAccessToken = null;
    tokenExpiresAtMs = 0;
    throw new Error('โทเค็น Google Calendar หมดอายุแล้ว กรุณากดเชื่อมต่อบัญชี Google ใหม่อีกครั้ง');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errMessage =
      (parsed as { error?: { message?: string } } | null)?.error?.message ||
      `Google Calendar API error (${response.status})`;
    throw new Error(errMessage);
  }

  return parsed as T;
}

export async function fetchGoogleCalendars(token: string): Promise<GoogleCalendarListItem[]> {
  const data = await calendarFetch<{ items?: GoogleCalendarListItem[] }>(
    '/users/me/calendarList?minAccessRole=writer',
    token
  );
  const items = data.items || [];
  return items.slice().sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)));
}

export async function fetchGoogleCalendarEvents(
  token: string,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<GoogleCalendarEventItem[]> {
  const params = new URLSearchParams({
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await calendarFetch<{ items?: GoogleCalendarEventItem[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    token
  );
  return (data.items || []).filter((item) => item.status !== 'cancelled');
}

export async function listSyncedTimetableEvents(
  token: string,
  calendarId: string,
  schoolId: string,
  termKey?: string
): Promise<GoogleCalendarEventItem[]> {
  const params = new URLSearchParams({
    maxResults: '250',
    singleEvents: 'false',
  });
  params.append('privateExtendedProperty', `eduverseSchoolId=${schoolId}`);
  if (termKey) {
    params.append('privateExtendedProperty', `eduverseTerm=${termKey}`);
  }
  const data = await calendarFetch<{ items?: GoogleCalendarEventItem[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    token
  );
  return (data.items || []).filter((item) => item.status !== 'cancelled');
}

function parseDateInputUtc(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    throw new Error('วันที่ที่เลือกไม่ถูกต้อง');
  }
  return date;
}

function formatUtcDateStr(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function formatRruleUntilUtc(endDate: Date): string {
  const ts = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59) -
      BANGKOK_OFFSET_MINUTES * 60_000
  );
  return ts.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function parseHm(value: string): string | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec((value || '').trim());
  if (!match) return null;
  const hh = Number(match[1]);
  if (hh > 23) return null;
  return `${String(hh).padStart(2, '0')}:${match[2]}`;
}

export async function syncTimetableSlotsToGoogleCalendar(params: {
  token: string;
  calendarId: string;
  slots: TimetableSlot[];
  schoolId: string;
  startDateValue: string;
  endDateValue: string;
}): Promise<SyncTimetableResult> {
  const { token, calendarId, slots, schoolId, startDateValue, endDateValue } = params;
  const startDate = parseDateInputUtc(startDateValue);
  const endDate = parseDateInputUtc(endDateValue);
  if (startDate > endDate) {
    throw new Error('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น');
  }

  const untilCompact = formatRruleUntilUtc(endDate);
  const existingEvents = await listSyncedTimetableEvents(token, calendarId, schoolId);
  const existingByKey = new Map<string, string>();
  existingEvents.forEach((ev) => {
    const slotId = ev.extendedProperties?.private?.eduverseSlotId;
    const termKey = ev.extendedProperties?.private?.eduverseTerm || '';
    if (slotId) {
      existingByKey.set(`${slotId}__${termKey}`, ev.id);
    }
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const slot of slots) {
    const byDay = ICAL_DAYS[slot.dayOfWeek];
    const targetDayIdx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(slot.dayOfWeek);
    const startHm = parseHm(slot.startTime);
    const endHm = parseHm(slot.endTime);

    if (!byDay || targetDayIdx < 0 || !startHm || !endHm || endHm <= startHm) {
      skippedCount += 1;
      continue;
    }

    const firstOccurrence = new Date(startDate);
    const daysUntil = (targetDayIdx - firstOccurrence.getUTCDay() + 7) % 7;
    firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + daysUntil);
    if (firstOccurrence > endDate) {
      skippedCount += 1;
      continue;
    }

    const firstDateStr = formatUtcDateStr(firstOccurrence);
    const termKey = `${slot.academicYear || ''}-${slot.semester || ''}`;
    const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(slot.teacherName, slot.coTeacherName);

    const descriptionLines = [
      `ห้องเรียน: ${slot.classRoom || 'ไม่ระบุ'}`,
      `คาบที่: ${slot.periodNumber} (${startHm} - ${endHm})`,
      `ครูผู้สอนหลัก: ${teacherName || 'ไม่ระบุ'}`,
      ...(coTeacherName ? [`ครูสอนคู่: ${coTeacherName}`] : []),
      `สถานที่: ${slot.room || 'ไม่ระบุ'}`,
      `ภาคเรียน: ${termKey}`,
      'ซิงค์อัตโนมัติจาก EduVerse',
    ];

    const body = {
      summary: `${slot.courseCode} - ${slot.courseTitleTh || slot.courseTitleEn} (${slot.classRoom})`,
      location: slot.room || slot.classRoom || '',
      description: descriptionLines.join('\n'),
      start: {
        dateTime: `${firstDateStr}T${startHm}:00+07:00`,
        timeZone: 'Asia/Bangkok',
      },
      end: {
        dateTime: `${firstDateStr}T${endHm}:00+07:00`,
        timeZone: 'Asia/Bangkok',
      },
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilCompact}`],
      extendedProperties: {
        private: {
          eduverseSchoolId: schoolId,
          eduverseSlotId: slot.id,
          eduverseTerm: termKey,
        },
      },
    };

    const existingEventId = existingByKey.get(`${slot.id}__${termKey}`);
    try {
      if (existingEventId) {
        await calendarFetch(
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`,
          token,
          { method: 'PATCH', body: JSON.stringify(body) }
        );
        updatedCount += 1;
      } else {
        await calendarFetch(
          `/calendars/${encodeURIComponent(calendarId)}/events`,
          token,
          { method: 'POST', body: JSON.stringify(body) }
        );
        createdCount += 1;
      }
    } catch (err) {
      errors.push(`${slot.courseCode} (${slot.classRoom}): ${err instanceof Error ? err.message : 'ไม่สำเร็จ'}`);
    }
  }

  return { createdCount, updatedCount, skippedCount, errors };
}

export async function listSyncedAssignmentEvents(
  token: string,
  calendarId: string,
  schoolId: string
): Promise<GoogleCalendarEventItem[]> {
  const params = new URLSearchParams({
    maxResults: '250',
    singleEvents: 'false',
  });
  params.append('privateExtendedProperty', `eduverseSchoolId=${schoolId}`);
  params.append('privateExtendedProperty', 'eduverseItemType=assignment');
  const data = await calendarFetch<{ items?: GoogleCalendarEventItem[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    token
  );
  return (data.items || []).filter((item) => item.status !== 'cancelled');
}

function normalizeAssignmentDueDate(dueDateRaw: string): { startIso: string; endIso: string } | null {
  const trimmed = (dueDateRaw || '').trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return {
      startIso: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T16:00:00+07:00`,
      endIso: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T17:00:00+07:00`,
    };
  }
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/.exec(trimmed);
  if (dateTime) {
    const [, y, m, d, hhStr, mmStr] = dateTime;
    const startHh = Number(hhStr);
    const startMm = Number(mmStr);
    const endTotalMin = Math.min(23 * 60 + 59, startHh * 60 + startMm + 60);
    const endHh = String(Math.floor(endTotalMin / 60)).padStart(2, '0');
    const endMm = String(endTotalMin % 60).padStart(2, '0');
    return {
      startIso: `${y}-${m}-${d}T${hhStr}:${mmStr}:00+07:00`,
      endIso: `${y}-${m}-${d}T${endHh}:${endMm}:00+07:00`,
    };
  }
  return null;
}

export async function syncAssignmentsToGoogleCalendar(params: {
  token: string;
  calendarId: string;
  assignments: Assignment[];
  courses?: Course[];
  schoolId: string;
}): Promise<SyncTimetableResult> {
  const { token, calendarId, assignments, courses = [], schoolId } = params;
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const existingEvents = await listSyncedAssignmentEvents(token, calendarId, schoolId);
  const existingByAssignmentId = new Map<string, string>();
  existingEvents.forEach((ev) => {
    const asgId = ev.extendedProperties?.private?.eduverseAssignmentId;
    if (asgId) {
      existingByAssignmentId.set(asgId, ev.id);
    }
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const assignment of assignments) {
    const parsedDue = normalizeAssignmentDueDate(assignment.dueDate);
    if (!parsedDue || assignment.status === 'closed') {
      skippedCount += 1;
      continue;
    }

    const course = courseMap.get(assignment.courseId);
    const courseCode = assignment.courseCode || course?.code || '';
    const courseName = course?.titleTh || course?.titleEn || '';

    const startEnd = {
      start: { dateTime: parsedDue.startIso, timeZone: 'Asia/Bangkok' },
      end: { dateTime: parsedDue.endIso, timeZone: 'Asia/Bangkok' },
    };

    const descriptionLines = [
      courseCode || courseName ? `รายวิชา: ${[courseCode, courseName].filter(Boolean).join(' - ')}` : '',
      `ชื่องาน: ${assignment.titleTh || assignment.titleEn}`,
      `คะแนนเต็ม: ${assignment.maxScore ?? assignment.points ?? 10} คะแนน`,
      `กำหนดส่ง: ${assignment.dueDate}`,
      assignment.description ? `รายละเอียด: ${assignment.description}` : '',
      'ซิงค์อัตโนมัติจาก EduVerse',
    ].filter(Boolean);

    const body = {
      summary: `📝 กำหนดส่งงาน${courseCode ? ` [${courseCode}]` : ''}: ${assignment.titleTh || assignment.titleEn}`,
      description: descriptionLines.join('\n'),
      ...startEnd,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 120 },
        ],
      },
      extendedProperties: {
        private: {
          eduverseSchoolId: schoolId,
          eduverseItemType: 'assignment',
          eduverseAssignmentId: assignment.id,
        },
      },
    };

    const existingEventId = existingByAssignmentId.get(assignment.id);
    try {
      if (existingEventId) {
        await calendarFetch(
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`,
          token,
          { method: 'PATCH', body: JSON.stringify(body) }
        );
        updatedCount += 1;
      } else {
        await calendarFetch(
          `/calendars/${encodeURIComponent(calendarId)}/events`,
          token,
          { method: 'POST', body: JSON.stringify(body) }
        );
        createdCount += 1;
      }
    } catch (err) {
      errors.push(`${assignment.titleTh || assignment.id}: ${err instanceof Error ? err.message : 'ไม่สำเร็จ'}`);
    }
  }

  return { createdCount, updatedCount, skippedCount, errors };
}

export async function autoSyncSchoolCalendar(params: {
  token: string;
  calendarId: string;
  schoolId: string;
  slots?: TimetableSlot[];
  assignments?: Assignment[];
  courses?: Course[];
  startDateValue: string;
  endDateValue: string;
}): Promise<{
  timetableResult: SyncTimetableResult | null;
  assignmentResult: SyncTimetableResult | null;
}> {
  const { token, calendarId, schoolId, slots, assignments, courses, startDateValue, endDateValue } = params;
  const timetableResult =
    slots && slots.length > 0
      ? await syncTimetableSlotsToGoogleCalendar({
          token,
          calendarId,
          slots,
          schoolId,
          startDateValue,
          endDateValue,
        })
      : null;

  const assignmentResult =
    assignments && assignments.length > 0
      ? await syncAssignmentsToGoogleCalendar({
          token,
          calendarId,
          assignments,
          courses,
          schoolId,
        })
      : null;

  return { timetableResult, assignmentResult };
}

export async function deleteSyncedTimetableEvents(
  token: string,
  calendarId: string,
  eventIds: string[]
): Promise<DeleteSyncedEventsResult> {
  let deletedCount = 0;
  const errors: string[] = [];

  for (const eventId of eventIds) {
    try {
      await calendarFetch(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        token,
        { method: 'DELETE' }
      );
      deletedCount += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `ลบกิจกรรม ${eventId} ไม่สำเร็จ`);
    }
  }

  return { deletedCount, errors };
}
