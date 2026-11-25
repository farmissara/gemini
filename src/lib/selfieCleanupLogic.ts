export const DEFAULT_SELFIE_RETENTION_MINUTES = 60;
export const MIN_SELFIE_RETENTION_MINUTES = 1;
export const MAX_SELFIE_RETENTION_MINUTES = 1440;

export interface AttendanceSelfieCandidate {
  id: string;
  schoolId?: string | null;
  studentId: string;
  date: string;
  time?: string | null;
  recordType?: string | null;
  photoUrl?: string | null;
  photoStoragePath?: string | null;
}

export interface SelectDueAttendanceSelfiesOptions {
  todayBangkok: string;
  nowMinutes: number;
  retentionMinutes?: number;
  includePreviousDays?: boolean;
  schoolId?: string;
}

export interface DueAttendanceSelfieRow {
  id: string;
  studentId: string;
  date: string;
  reason: 'after_checkout' | 'previous_day';
  storagePath: string | null;
  rawPhotoValue: string;
}

export interface SelectDueAttendanceSelfiesResult {
  dueRows: DueAttendanceSelfieRow[];
  recordIdsToClear: string[];
  storagePathsToDelete: string[];
  matchedByCheckoutCount: number;
  matchedPreviousDaysCount: number;
}

export function normalizeSelfieRetentionMinutes(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(
      MAX_SELFIE_RETENTION_MINUTES,
      Math.max(MIN_SELFIE_RETENTION_MINUTES, Math.round(value)),
    );
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.min(
        MAX_SELFIE_RETENTION_MINUTES,
        Math.max(MIN_SELFIE_RETENTION_MINUTES, Math.round(parsed)),
      );
    }
  }
  return DEFAULT_SELFIE_RETENTION_MINUTES;
}

export function getBangkokClockParts(now: Date = new Date()): {
  dateStr: string;
  minutes: number;
} {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const byType = new Map<string, string>();
  for (const part of parts) {
    if (part.type !== 'literal') {
      byType.set(part.type, part.value);
    }
  }

  const year = byType.get('year') || '1970';
  const month = byType.get('month') || '01';
  const day = byType.get('day') || '01';
  const rawHour = Number(byType.get('hour') || '0');
  const rawMinute = Number(byType.get('minute') || '0');

  const hour = Number.isFinite(rawHour) ? ((rawHour % 24) + 24) % 24 : 0;
  const minute = Number.isFinite(rawMinute) ? Math.min(59, Math.max(0, rawMinute)) : 0;

  return {
    dateStr: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}

export function parseAttendanceTimeMinutes(time?: string | null): number | null {
  if (!time || typeof time !== 'string') return null;
  const trimmed = time.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

export function isStorageObjectPath(photoValue?: string | null): boolean {
  if (!photoValue || typeof photoValue !== 'string') return false;
  const trimmed = photoValue.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('javascript:') ||
    trimmed.startsWith('/') ||
    trimmed.includes('\\')
  ) {
    return false;
  }

  const segments = trimmed.split('/');
  if (segments.some((seg) => !seg || seg === '.' || seg === '..')) {
    return false;
  }

  return segments.length >= 2;
}

export function isSchoolScopedStoragePath(photoValue: string, schoolId: string): boolean {
  const cleanSchoolId = schoolId.trim();
  if (!cleanSchoolId || cleanSchoolId.includes('/') || cleanSchoolId.includes('..')) {
    return false;
  }
  return isStorageObjectPath(photoValue) && photoValue.trim().startsWith(`${cleanSchoolId}/`);
}

function isIsoDateString(value?: string | null): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()));
}

export function selectDueAttendanceSelfies(
  rows: AttendanceSelfieCandidate[],
  options: SelectDueAttendanceSelfiesOptions,
): SelectDueAttendanceSelfiesResult {
  const retentionMinutes =
    typeof options.retentionMinutes === 'number' && Number.isFinite(options.retentionMinutes) && options.retentionMinutes >= 0
      ? Math.min(MAX_SELFIE_RETENTION_MINUTES, Math.round(options.retentionMinutes))
      : DEFAULT_SELFIE_RETENTION_MINUTES;
  const includePreviousDays = options.includePreviousDays !== false;
  const todayBangkok = options.todayBangkok;
  const nowMinutes = options.nowMinutes;
  const scopedSchoolId = options.schoolId?.trim() || '';

  const latestCheckoutByStudentDate = new Map<string, number>();

  for (const row of rows) {
    if (!row || !row.studentId || !isIsoDateString(row.date)) continue;
    if (scopedSchoolId && row.schoolId && row.schoolId !== scopedSchoolId) continue;
    if (row.recordType !== 'check_out') continue;

    const parsedMinutes = parseAttendanceTimeMinutes(row.time);
    if (parsedMinutes === null) continue;

    const key = `${row.studentId}::${row.date.trim()}`;
    const existing = latestCheckoutByStudentDate.get(key);
    if (existing === undefined || parsedMinutes > existing) {
      latestCheckoutByStudentDate.set(key, parsedMinutes);
    }
  }

  const dueRows: DueAttendanceSelfieRow[] = [];
  const seenRecordIds = new Set<string>();
  const storagePathsSet = new Set<string>();
  let matchedByCheckoutCount = 0;
  let matchedPreviousDaysCount = 0;

  for (const row of rows) {
    if (!row || !row.id || !row.studentId || !isIsoDateString(row.date)) continue;
    if (scopedSchoolId && row.schoolId && row.schoolId !== scopedSchoolId) continue;
    if (seenRecordIds.has(row.id)) continue;

    const photoStoragePath = typeof row.photoStoragePath === 'string' ? row.photoStoragePath.trim() : '';
    const photoUrl = typeof row.photoUrl === 'string' ? row.photoUrl.trim() : '';
    const rawPhotoValue = photoStoragePath || photoUrl;
    if (!rawPhotoValue) continue;

    const dateStr = row.date.trim();
    let reason: 'after_checkout' | 'previous_day' | null = null;

    if (includePreviousDays && dateStr < todayBangkok) {
      reason = 'previous_day';
    } else if (dateStr === todayBangkok) {
      const checkoutMinutes = latestCheckoutByStudentDate.get(`${row.studentId}::${dateStr}`);
      if (checkoutMinutes !== undefined && nowMinutes >= checkoutMinutes + retentionMinutes) {
        reason = 'after_checkout';
      }
    }

    if (!reason) continue;

    seenRecordIds.add(row.id);

    const candidateStoragePath =
      photoStoragePath && isStorageObjectPath(photoStoragePath)
        ? photoStoragePath
        : isStorageObjectPath(photoUrl)
          ? photoUrl
          : null;

    const scopedStoragePath =
      candidateStoragePath &&
      (!scopedSchoolId || isSchoolScopedStoragePath(candidateStoragePath, scopedSchoolId))
        ? candidateStoragePath
        : null;

    if (scopedStoragePath) {
      storagePathsSet.add(scopedStoragePath);
    }

    if (reason === 'after_checkout') {
      matchedByCheckoutCount += 1;
    } else {
      matchedPreviousDaysCount += 1;
    }

    dueRows.push({
      id: row.id,
      studentId: row.studentId,
      date: dateStr,
      reason,
      storagePath: scopedStoragePath,
      rawPhotoValue,
    });
  }

  return {
    dueRows,
    recordIdsToClear: dueRows.map((row) => row.id),
    storagePathsToDelete: [...storagePathsSet],
    matchedByCheckoutCount,
    matchedPreviousDaysCount,
  };
}
