import type {
  AppLanguage,
  AttendanceCorrectionRequest,
  AttendanceRecord,
  LeaveRequest,
} from '../types';
import { parseTimeToMinutes } from './attendanceCorrections';
import { getLocalDateString } from './date';
import { getHolidayForDate, isWeekendDate } from './thaiHolidays';

export type PersonalAttendanceDayStatus =
  | 'present'
  | 'late'
  | 'leave'
  | 'absent'
  | 'pending_today';

export interface PersonalDailyAttendanceRow {
  date: string;
  dateLabelTh: string;
  dateLabelEn: string;
  checkInTime?: string;
  checkOutTime?: string;
  durationLabel?: string;
  statusKey: PersonalAttendanceDayStatus;
  statusLabelTh: string;
  statusLabelEn: string;
  checkInRecord?: AttendanceRecord;
  checkOutRecord?: AttendanceRecord;
  leaveRequest?: LeaveRequest;
  correctionRequest?: AttendanceCorrectionRequest;
}

const TH_WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;
const EN_WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatShortAttendanceTime(timeStr?: string): string | undefined {
  if (!timeStr) return undefined;
  const match = /(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (!match) return undefined;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function formatDurationLabel(checkInTime?: string, checkOutTime?: string): string | undefined {
  const startM = parseTimeToMinutes(checkInTime);
  const endM = parseTimeToMinutes(checkOutTime);
  if (startM === null || endM === null) return undefined;
  const diff = endM - startM;
  if (diff < 0) return undefined;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

export function formatThaiShortDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  const weekday = TH_WEEKDAY_SHORT[dateObj.getDay()] || '';
  const beYearShort = String((year + 543) % 100).padStart(2, '0');
  return `${weekday} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${beYearShort}`;
}

export function formatEnShortDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  const weekday = EN_WEEKDAY_SHORT[dateObj.getDay()] || '';
  return `${weekday} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

function addDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function compareTimeDesc(a: AttendanceRecord, b: AttendanceRecord): number {
  const am = parseTimeToMinutes(a.time) ?? -1;
  const bm = parseTimeToMinutes(b.time) ?? -1;
  return bm - am;
}

export function resolveRecordPhotoSource(record?: AttendanceRecord): string | undefined {
  if (!record) return undefined;
  if (record.photoUrl?.trim()) return record.photoUrl.trim();
  if (record.photoStoragePath?.trim()) return record.photoStoragePath.trim();
  if (
    record.userAvatar?.trim() &&
    (record.checkinMethod === 'selfie_geofence' ||
      record.userAvatar.startsWith('data:image/') ||
      record.userAvatar.includes('/'))
  ) {
    return record.userAvatar.trim();
  }
  return undefined;
}

export function buildPersonalDailyAttendanceRows(params: {
  targetIds: Iterable<string>;
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  correctionRequests?: AttendanceCorrectionRequest[];
  schoolId?: string;
  todayDateStr?: string;
  daysLookback?: number;
}): PersonalDailyAttendanceRow[] {
  const idSet = new Set(
    Array.from(params.targetIds)
      .map((id) => id.trim())
      .filter(Boolean)
  );
  if (idSet.size === 0) return [];

  const todayStr = params.todayDateStr || getLocalDateString();
  const lookback = Math.max(7, params.daysLookback ?? 21);
  const correctionRequests = params.correctionRequests || [];

  const matchesTargetRecord = (rec: AttendanceRecord): boolean =>
    idSet.has(rec.studentId) || (rec.teacherId ? idSet.has(rec.teacherId) : false);

  const personalRecords = params.attendance.filter(matchesTargetRecord);
  const personalLeaves = params.leaveRequests.filter(
    (lv) => idSet.has(lv.userId) && lv.status !== 'rejected'
  );
  const personalCorrections = correctionRequests.filter((c) => idSet.has(c.requesterId));

  const dateSet = new Set<string>();
  for (let offset = 0; offset < lookback; offset += 1) {
    const d = addDays(todayStr, -offset);
    if (d > todayStr) continue;
    const isWeekend = isWeekendDate(d);
    const holiday = params.schoolId ? getHolidayForDate(d, params.schoolId) : null;
    if (!isWeekend && !holiday?.isSchoolDayOff) {
      dateSet.add(d);
    }
  }
  for (const rec of personalRecords) {
    if (rec.date && rec.date <= todayStr) dateSet.add(rec.date);
  }
  for (const lv of personalLeaves) {
    if (!lv.startDate) continue;
    const end = lv.endDate && lv.endDate >= lv.startDate ? lv.endDate : lv.startDate;
    let cursor = lv.startDate;
    let guard = 0;
    while (cursor <= end && cursor <= todayStr && guard < 31) {
      dateSet.add(cursor);
      cursor = addDays(cursor, 1);
      guard += 1;
    }
  }

  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((date) => {
    const dayRecords = personalRecords.filter((r) => r.date === date);
    const checkInRecords = dayRecords
      .filter((r) => (r.recordType || 'check_in') !== 'check_out')
      .sort(compareTimeDesc);
    const checkOutRecords = dayRecords
      .filter((r) => r.recordType === 'check_out')
      .sort(compareTimeDesc);

    const checkInRecord = checkInRecords[0];
    const checkOutRecord = checkOutRecords[0];

    const rawCheckIn = checkInRecord?.time;
    const rawCheckOut = checkOutRecord?.time || checkInRecord?.checkOutTime;
    const checkInTime = formatShortAttendanceTime(rawCheckIn);
    const checkOutTime = formatShortAttendanceTime(rawCheckOut);
    const durationLabel = formatDurationLabel(checkInTime, checkOutTime);

    const leaveRequest = personalLeaves.find(
      (lv) => lv.startDate <= date && (lv.endDate || lv.startDate) >= date
    );
    const correctionRequest = personalCorrections
      .filter((c) => c.date === date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    let statusKey: PersonalAttendanceDayStatus;
    let statusLabelTh: string;
    let statusLabelEn: string;

    if (leaveRequest || checkInRecord?.status === 'leave') {
      statusKey = 'leave';
      statusLabelTh =
        leaveRequest?.leaveType === 'sick'
          ? 'ลาป่วย'
          : leaveRequest?.leaveType === 'official'
            ? 'ไปราชการ'
            : 'ลากิจ';
      statusLabelEn = 'Leave';
    } else if (checkInRecord?.status === 'absent') {
      statusKey = 'absent';
      statusLabelTh = 'ขาด';
      statusLabelEn = 'Absent';
    } else if (checkInRecord?.status === 'late') {
      statusKey = 'late';
      statusLabelTh = 'สาย';
      statusLabelEn = 'Late';
    } else if (checkInRecord) {
      statusKey = 'present';
      statusLabelTh = 'ปกติ';
      statusLabelEn = 'On time';
    } else if (date === todayStr) {
      statusKey = 'pending_today';
      statusLabelTh = 'รอลงเวลา';
      statusLabelEn = 'Pending';
    } else {
      statusKey = 'absent';
      statusLabelTh = 'ขาด';
      statusLabelEn = 'Absent';
    }

    return {
      date,
      dateLabelTh: formatThaiShortDateLabel(date),
      dateLabelEn: formatEnShortDateLabel(date),
      checkInTime,
      checkOutTime,
      durationLabel,
      statusKey,
      statusLabelTh,
      statusLabelEn,
      checkInRecord,
      checkOutRecord,
      leaveRequest,
      correctionRequest,
    };
  });
}

export function getStatusLabel(row: PersonalDailyAttendanceRow, lang: AppLanguage): string {
  return lang === 'th' ? row.statusLabelTh : row.statusLabelEn;
}
