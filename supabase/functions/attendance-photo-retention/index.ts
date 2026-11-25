import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'attendance-selfies';
const DEFAULT_RETENTION_MINUTES = 60;
const MIN_RETENTION_MINUTES = 1;
const MAX_RETENTION_MINUTES = 1440;
const DB_PAGE_SIZE = 1000;
const MUTATION_BATCH_SIZE = 100;

interface SchoolRow {
  id?: string | null;
  feature_flags?: Record<string, unknown> | null;
}

interface RawAttendanceRow {
  id: string;
  school_id: string | null;
  student_id: string | null;
  date: string | null;
  time: string | null;
  record_type?: string | null;
  photo_url?: string | null;
}

function normalizeRetentionMinutes(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(MAX_RETENTION_MINUTES, Math.max(MIN_RETENTION_MINUTES, Math.round(value)));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.min(MAX_RETENTION_MINUTES, Math.max(MIN_RETENTION_MINUTES, Math.round(parsed)));
    }
  }
  return DEFAULT_RETENTION_MINUTES;
}

function getBangkokClockParts(now: Date = new Date()): { dateStr: string; minutes: number } {
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
    if (part.type !== 'literal') byType.set(part.type, part.value);
  }
  const year = byType.get('year') || '1970';
  const month = byType.get('month') || '01';
  const day = byType.get('day') || '01';
  const rawHour = Number(byType.get('hour') || '0');
  const rawMinute = Number(byType.get('minute') || '0');
  const hour = Number.isFinite(rawHour) ? ((rawHour % 24) + 24) % 24 : 0;
  const minute = Number.isFinite(rawMinute) ? Math.min(59, Math.max(0, rawMinute)) : 0;
  return { dateStr: `${year}-${month}-${day}`, minutes: hour * 60 + minute };
}

function parseTimeMinutes(time?: string | null): number | null {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function isSchoolScopedStoragePath(photoValue: string, schoolId: string): boolean {
  const cleanSchoolId = schoolId.trim();
  const trimmed = photoValue.trim();
  if (!cleanSchoolId || !trimmed || cleanSchoolId.includes('/') || cleanSchoolId.includes('..')) {
    return false;
  }
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
  if (segments.length < 2 || segments.some((seg) => !seg || seg === '.' || seg === '..')) {
    return false;
  }
  return trimmed.startsWith(`${cleanSchoolId}/`);
}

function isMissingColumnError(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /record_type|photo_url|could not find the '.*' column|schema cache/i.test(error.message || '')
  );
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('ATTENDANCE_PHOTO_CLEANUP_SECRET');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return json({ error: 'Supabase admin configuration is missing' }, 500);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { dateStr: todayBangkok, minutes: nowMinutes } = getBangkokClockParts();
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, feature_flags');

    if (schoolsError) {
      throw new Error(`Could not load schools: ${schoolsError.message}`);
    }

    let totalDeletedPhotos = 0;
    let totalClearedRecords = 0;
    let processedSchools = 0;

    for (const school of (schools || []) as SchoolRow[]) {
      const schoolId = typeof school.id === 'string' ? school.id.trim() : '';
      if (!schoolId) continue;

      const flags = school.feature_flags && typeof school.feature_flags === 'object' ? school.feature_flags : {};
      if (flags.autoDeleteSelfiesAfterCheckout === false) continue;

      const retentionMinutes = normalizeRetentionMinutes(flags.selfieRetentionAfterCheckoutMinutes);
      processedSchools += 1;

      const photoRows: RawAttendanceRow[] = [];
      let hasRecordTypeColumn = true;
      let offset = 0;

      while (true) {
        const selectCols = hasRecordTypeColumn
          ? 'id, school_id, student_id, date, time, record_type, photo_url'
          : 'id, school_id, student_id, date, time, photo_url';

        const { data, error } = await supabase
          .from('attendance')
          .select(selectCols)
          .eq('school_id', schoolId)
          .not('photo_url', 'is', null)
          .order('date', { ascending: true })
          .range(offset, offset + DB_PAGE_SIZE - 1);

        if (error) {
          if (hasRecordTypeColumn && isMissingColumnError(error)) {
            hasRecordTypeColumn = false;
            continue;
          }
          if (isMissingColumnError(error)) break;
          throw new Error(`Could not query attendance photos for ${schoolId}: ${error.message}`);
        }

        const batch = (data || []) as unknown as RawAttendanceRow[];
        photoRows.push(...batch);
        if (batch.length < DB_PAGE_SIZE) break;
        offset += DB_PAGE_SIZE;
      }

      if (photoRows.length === 0) continue;

      const latestCheckoutByStudentDate = new Map<string, number>();
      const hasTodayPhotos = photoRows.some((r) => (r.date || '').trim() === todayBangkok);

      if (hasTodayPhotos && hasRecordTypeColumn) {
        let coOffset = 0;
        while (true) {
          const { data: coData, error: coError } = await supabase
            .from('attendance')
            .select('id, student_id, date, time, record_type')
            .eq('school_id', schoolId)
            .eq('date', todayBangkok)
            .eq('record_type', 'check_out')
            .range(coOffset, coOffset + DB_PAGE_SIZE - 1);

          if (coError) {
            if (isMissingColumnError(coError)) break;
            throw new Error(`Could not query checkout records for ${schoolId}: ${coError.message}`);
          }

          const coBatch = (coData || []) as unknown as RawAttendanceRow[];
          for (const row of coBatch) {
            if (!row.student_id || !row.date) continue;
            const mins = parseTimeMinutes(row.time);
            if (mins === null) continue;
            const key = `${row.student_id}::${row.date.trim()}`;
            const existing = latestCheckoutByStudentDate.get(key);
            if (existing === undefined || mins > existing) {
              latestCheckoutByStudentDate.set(key, mins);
            }
          }
          if (coBatch.length < DB_PAGE_SIZE) break;
          coOffset += DB_PAGE_SIZE;
        }
      }

      for (const row of photoRows) {
        if (row.record_type === 'check_out' && row.student_id && row.date) {
          const mins = parseTimeMinutes(row.time);
          if (mins !== null) {
            const key = `${row.student_id}::${row.date.trim()}`;
            const existing = latestCheckoutByStudentDate.get(key);
            if (existing === undefined || mins > existing) {
              latestCheckoutByStudentDate.set(key, mins);
            }
          }
        }
      }

      const dueRows: Array<{ id: string; storagePath: string | null }> = [];
      const storagePaths = new Set<string>();

      for (const row of photoRows) {
        if (!row.id || !row.student_id || !row.date || !row.photo_url) continue;
        const dateStr = row.date.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

        let isDue = false;
        if (dateStr < todayBangkok) {
          isDue = true;
        } else if (dateStr === todayBangkok) {
          const checkoutMins = latestCheckoutByStudentDate.get(`${row.student_id}::${dateStr}`);
          if (checkoutMins !== undefined && nowMinutes >= checkoutMins + retentionMinutes) {
            isDue = true;
          }
        }

        if (!isDue) continue;

        const scopedPath = isSchoolScopedStoragePath(row.photo_url, schoolId)
          ? row.photo_url.trim()
          : null;
        if (scopedPath) storagePaths.add(scopedPath);
        dueRows.push({ id: row.id, storagePath: scopedPath });
      }

      if (dueRows.length === 0) continue;

      const failedPaths = new Set<string>();
      const pathsList = [...storagePaths];
      for (let i = 0; i < pathsList.length; i += MUTATION_BATCH_SIZE) {
        const batch = pathsList.slice(i, i + MUTATION_BATCH_SIZE);
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(batch);
        if (removeError) {
          for (const p of batch) failedPaths.add(p);
        } else {
          totalDeletedPhotos += batch.length;
        }
      }

      const idsToClear = dueRows
        .filter((r) => !r.storagePath || !failedPaths.has(r.storagePath))
        .map((r) => r.id);

      for (let i = 0; i < idsToClear.length; i += MUTATION_BATCH_SIZE) {
        const idBatch = idsToClear.slice(i, i + MUTATION_BATCH_SIZE);
        const { error: updateError } = await supabase
          .from('attendance')
          .update({ photo_url: null })
          .eq('school_id', schoolId)
          .in('id', idBatch);

        if (updateError && !isMissingColumnError(updateError)) {
          throw new Error(`Could not clear attendance photo_url for ${schoolId}: ${updateError.message}`);
        }
        totalClearedRecords += idBatch.length;
      }
    }

    return json({
      ok: true,
      processedSchools,
      deletedPhotos: totalDeletedPhotos,
      clearedRecords: totalClearedRecords,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Cleanup failed' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
