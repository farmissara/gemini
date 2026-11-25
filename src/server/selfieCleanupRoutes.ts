import express, { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_SELFIE_RETENTION_MINUTES,
  getBangkokClockParts,
  normalizeSelfieRetentionMinutes,
  selectDueAttendanceSelfies,
  type AttendanceSelfieCandidate,
} from '../lib/selfieCleanupLogic.ts';

type EnvReader = (name: string) => string;

const SELFIE_BUCKET = 'attendance-selfies';
const DB_PAGE_SIZE = 1000;
const MUTATION_BATCH_SIZE = 100;
const SCHEDULE_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_SWEEP_DELAY_MS = 15 * 1000;

export interface SelfieCleanupRunResult {
  schoolId: string;
  checkedAt: string;
  retentionMinutes: number;
  matchedByCheckoutCount: number;
  matchedPreviousDaysCount: number;
  deletedPhotosCount: number;
  clearedRecordsCount: number;
  deletedRecordIds: string[];
  storagePathsRemoved: string[];
  dryRun: boolean;
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

function getSupabaseClients(env: EnvReader, token?: string): {
  userClient: SupabaseClient | null;
  admin: SupabaseClient;
} | null {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey =
    env('SUPABASE_ANON_KEY') ||
    env('SUPABASE_PUBLISHABLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY') ||
    env('VITE_SUPABASE_PUBLISHABLE_KEY');

  if (!url || !serviceKey) return null;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userClient =
    token && anonKey
      ? createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
      : null;

  return { userClient, admin };
}

function isMissingColumnError(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /record_type|photo_url|could not find the '.*' column|schema cache/i.test(error.message || '')
  );
}

async function fetchSchoolPhotoAttendanceRows(
  admin: SupabaseClient,
  schoolId: string,
): Promise<{ rows: AttendanceSelfieCandidate[]; hasRecordTypeColumn: boolean }> {
  const collected: AttendanceSelfieCandidate[] = [];
  let hasRecordTypeColumn = true;
  let offset = 0;

  while (true) {
    const selectCols = hasRecordTypeColumn
      ? 'id, school_id, student_id, date, time, record_type, photo_url'
      : 'id, school_id, student_id, date, time, photo_url';

    const { data, error } = await admin
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
      if (isMissingColumnError(error)) {
        return { rows: [], hasRecordTypeColumn: false };
      }
      throw new Error(`Could not query attendance selfies: ${error.message}`);
    }

    const batch = (data || []) as unknown as RawAttendanceRow[];
    for (const item of batch) {
      if (!item.id || !item.student_id || !item.date) continue;
      collected.push({
        id: item.id,
        schoolId: item.school_id,
        studentId: item.student_id,
        date: item.date,
        time: item.time,
        recordType: hasRecordTypeColumn ? (item.record_type ?? null) : null,
        photoUrl: item.photo_url ?? null,
      });
    }

    if (batch.length < DB_PAGE_SIZE) break;
    offset += DB_PAGE_SIZE;
  }

  return { rows: collected, hasRecordTypeColumn };
}

async function fetchTodayCheckoutRows(
  admin: SupabaseClient,
  schoolId: string,
  todayBangkok: string,
): Promise<AttendanceSelfieCandidate[]> {
  const collected: AttendanceSelfieCandidate[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from('attendance')
      .select('id, school_id, student_id, date, time, record_type')
      .eq('school_id', schoolId)
      .eq('date', todayBangkok)
      .eq('record_type', 'check_out')
      .range(offset, offset + DB_PAGE_SIZE - 1);

    if (error) {
      if (isMissingColumnError(error)) {
        return [];
      }
      throw new Error(`Could not query today's check-out records: ${error.message}`);
    }

    const batch = (data || []) as unknown as RawAttendanceRow[];
    for (const item of batch) {
      if (!item.id || !item.student_id || !item.date) continue;
      collected.push({
        id: item.id,
        schoolId: item.school_id,
        studentId: item.student_id,
        date: item.date,
        time: item.time,
        recordType: item.record_type ?? 'check_out',
        photoUrl: null,
      });
    }

    if (batch.length < DB_PAGE_SIZE) break;
    offset += DB_PAGE_SIZE;
  }

  return collected;
}

export async function runSelfieCleanupForSchool(
  admin: SupabaseClient,
  schoolId: string,
  options?: {
    retentionMinutes?: number;
    includePreviousDays?: boolean;
    dryRun?: boolean;
    now?: Date;
  },
): Promise<SelfieCleanupRunResult> {
  const cleanSchoolId = schoolId.trim();
  const { dateStr: todayBangkok, minutes: nowMinutes } = getBangkokClockParts(options?.now);
  const retentionMinutes =
    options?.retentionMinutes !== undefined
      ? normalizeSelfieRetentionMinutes(options.retentionMinutes)
      : DEFAULT_SELFIE_RETENTION_MINUTES;
  const includePreviousDays = options?.includePreviousDays !== false;
  const dryRun = options?.dryRun === true;

  const { rows: photoRows, hasRecordTypeColumn } = await fetchSchoolPhotoAttendanceRows(admin, cleanSchoolId);

  if (photoRows.length === 0) {
    return {
      schoolId: cleanSchoolId,
      checkedAt: new Date().toISOString(),
      retentionMinutes,
      matchedByCheckoutCount: 0,
      matchedPreviousDaysCount: 0,
      deletedPhotosCount: 0,
      clearedRecordsCount: 0,
      deletedRecordIds: [],
      storagePathsRemoved: [],
      dryRun,
    };
  }

  const hasTodayPhotos = photoRows.some((row) => row.date === todayBangkok);
  const todayCheckoutRows =
    hasTodayPhotos && hasRecordTypeColumn
      ? await fetchTodayCheckoutRows(admin, cleanSchoolId, todayBangkok)
      : [];

  const mergedById = new Map<string, AttendanceSelfieCandidate>();
  for (const row of todayCheckoutRows) {
    mergedById.set(row.id, row);
  }
  for (const row of photoRows) {
    mergedById.set(row.id, row);
  }

  const selection = selectDueAttendanceSelfies([...mergedById.values()], {
    todayBangkok,
    nowMinutes,
    retentionMinutes,
    includePreviousDays,
    schoolId: cleanSchoolId,
  });

  if (dryRun || selection.dueRows.length === 0) {
    return {
      schoolId: cleanSchoolId,
      checkedAt: new Date().toISOString(),
      retentionMinutes,
      matchedByCheckoutCount: selection.matchedByCheckoutCount,
      matchedPreviousDaysCount: selection.matchedPreviousDaysCount,
      deletedPhotosCount: dryRun ? selection.storagePathsToDelete.length : 0,
      clearedRecordsCount: dryRun ? selection.recordIdsToClear.length : 0,
      deletedRecordIds: dryRun ? selection.recordIdsToClear : [],
      storagePathsRemoved: dryRun ? selection.storagePathsToDelete : [],
      dryRun,
    };
  }

  const removedStoragePaths = new Set<string>();
  const failedStoragePaths = new Set<string>();

  for (let i = 0; i < selection.storagePathsToDelete.length; i += MUTATION_BATCH_SIZE) {
    const pathBatch = selection.storagePathsToDelete.slice(i, i + MUTATION_BATCH_SIZE);
    const { error: removeError } = await admin.storage.from(SELFIE_BUCKET).remove(pathBatch);
    if (removeError) {
      console.error(
        `[Selfie Cleanup] Failed to remove storage batch for school ${cleanSchoolId}:`,
        removeError.message,
      );
      for (const p of pathBatch) {
        failedStoragePaths.add(p);
      }
      continue;
    }
    for (const p of pathBatch) {
      removedStoragePaths.add(p);
    }
  }

  const recordIdsToClear = selection.dueRows
    .filter((row) => !row.storagePath || !failedStoragePaths.has(row.storagePath))
    .map((row) => row.id);

  const clearedRecordIds: string[] = [];
  for (let i = 0; i < recordIdsToClear.length; i += MUTATION_BATCH_SIZE) {
    const idBatch = recordIdsToClear.slice(i, i + MUTATION_BATCH_SIZE);
    const { error: updateError } = await admin
      .from('attendance')
      .update({ photo_url: null })
      .eq('school_id', cleanSchoolId)
      .in('id', idBatch);

    if (updateError) {
      throw new Error(`Could not clear attendance photo_url: ${updateError.message}`);
    }
    clearedRecordIds.push(...idBatch);
  }

  return {
    schoolId: cleanSchoolId,
    checkedAt: new Date().toISOString(),
    retentionMinutes,
    matchedByCheckoutCount: selection.matchedByCheckoutCount,
    matchedPreviousDaysCount: selection.matchedPreviousDaysCount,
    deletedPhotosCount: removedStoragePaths.size,
    clearedRecordsCount: clearedRecordIds.length,
    deletedRecordIds: clearedRecordIds,
    storagePathsRemoved: [...removedStoragePaths],
    dryRun: false,
  };
}

export async function runScheduledSelfieCleanupSweep(getEnv: EnvReader): Promise<void> {
  const clients = getSupabaseClients(getEnv);
  if (!clients) return;

  const { admin } = clients;
  const { data: schools, error } = await admin
    .from('schools')
    .select('id, feature_flags');

  if (error || !schools) {
    if (error) {
      console.error('[Selfie Cleanup] Could not load schools for scheduled sweep:', error.message);
    }
    return;
  }

  for (const school of schools as Array<{ id?: string | null; feature_flags?: Record<string, unknown> | null }>) {
    const schoolId = typeof school.id === 'string' ? school.id.trim() : '';
    if (!schoolId) continue;

    const flags = school.feature_flags && typeof school.feature_flags === 'object' ? school.feature_flags : {};
    if (flags.autoDeleteSelfiesAfterCheckout === false) {
      continue;
    }

    const retentionMinutes = normalizeSelfieRetentionMinutes(flags.selfieRetentionAfterCheckoutMinutes);
    try {
      const result = await runSelfieCleanupForSchool(admin, schoolId, { retentionMinutes });
      if (result.deletedPhotosCount > 0 || result.clearedRecordsCount > 0) {
        console.log(
          `[Selfie Cleanup] School ${schoolId}: removed ${result.deletedPhotosCount} storage files, cleared ${result.clearedRecordsCount} attendance photo refs (retention=${retentionMinutes}m).`,
        );
      }
    } catch (err) {
      console.error(
        `[Selfie Cleanup] Sweep failed for school ${schoolId}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

export function startSelfieCleanupScheduler(getEnv: EnvReader): () => void {
  let isRunning = false;

  const triggerSweep = () => {
    if (isRunning) return;
    isRunning = true;
    void runScheduledSelfieCleanupSweep(getEnv)
      .catch((err) => {
        console.error('[Selfie Cleanup] Scheduled sweep error:', err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        isRunning = false;
      });
  };

  const initialTimer = setTimeout(triggerSweep, INITIAL_SWEEP_DELAY_MS);
  const intervalTimer = setInterval(triggerSweep, SCHEDULE_INTERVAL_MS);
  initialTimer.unref?.();
  intervalTimer.unref?.();

  return () => {
    clearTimeout(initialTimer);
    clearInterval(intervalTimer);
  };
}

export function createSelfieCleanupRouter(getEnv: EnvReader) {
  const router = Router();
  router.use(express.json({ limit: '32kb' }));

  router.post('/', async (req: Request, res: Response) => {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนจัดการรูปเซลฟี่' });
    }

    const clients = getSupabaseClients(getEnv, match[1]);
    if (!clients || !clients.userClient) {
      return res.status(503).json({
        error: 'SERVICE_ROLE_UNAVAILABLE',
        message: 'Server Supabase service role is not configured.',
      });
    }

    const { userClient, admin } = clients;

    try {
      const { data: authData, error: authError } = await userClient.auth.getUser(match[1]);
      if (authError || !authData.user) {
        return res.status(401).json({ error: 'INVALID_SESSION', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
      }

      const { data: profile, error: profileError } = await admin
        .from('user_profiles')
        .select('id, school_id, role, status')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.status !== 'active') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'บัญชีนี้ไม่มีสิทธิ์ใช้งาน' });
      }

      let effectiveRole = String(profile.role || '');
      const profileSchoolId = typeof profile.school_id === 'string' ? profile.school_id.trim() : '';

      if (effectiveRole === 'teacher' && profileSchoolId && authData.user.email) {
        const { data: teacherRow } = await admin
          .from('teachers')
          .select('is_school_admin')
          .eq('school_id', profileSchoolId)
          .ilike('email', authData.user.email)
          .maybeSingle();
        if (teacherRow?.is_school_admin) {
          effectiveRole = 'admin';
        }
      }

      if (!['admin', 'super_admin'].includes(effectiveRole)) {
        return res.status(403).json({
          error: 'ADMIN_REQUIRED',
          message: 'เฉพาะผู้ดูแลระบบโรงเรียนและ Super Admin เท่านั้นที่สั่งลบรูปเซลฟี่ได้',
        });
      }

      const body = (req.body || {}) as {
        schoolId?: unknown;
        retentionMinutes?: unknown;
        includePreviousDays?: unknown;
        dryRun?: unknown;
      };

      const requestedSchoolId = typeof body.schoolId === 'string' ? body.schoolId.trim() : '';
      if (requestedSchoolId && effectiveRole !== 'super_admin' && requestedSchoolId !== profileSchoolId) {
        return res.status(403).json({
          error: 'CROSS_SCHOOL_FORBIDDEN',
          message: 'ไม่สามารถจัดการรูปภาพของโรงเรียนอื่นได้',
        });
      }

      const targetSchoolId =
        effectiveRole === 'super_admin' && requestedSchoolId ? requestedSchoolId : profileSchoolId;

      if (!targetSchoolId) {
        return res.status(400).json({ error: 'SCHOOL_REQUIRED', message: 'ไม่พบรหัสโรงเรียน' });
      }

      let schoolRetentionMinutes = DEFAULT_SELFIE_RETENTION_MINUTES;
      if (body.retentionMinutes === undefined || body.retentionMinutes === null) {
        const { data: schoolRow } = await admin
          .from('schools')
          .select('feature_flags')
          .eq('id', targetSchoolId)
          .maybeSingle();
        const flags =
          schoolRow?.feature_flags && typeof schoolRow.feature_flags === 'object'
            ? (schoolRow.feature_flags as Record<string, unknown>)
            : null;
        if (flags?.selfieRetentionAfterCheckoutMinutes !== undefined) {
          schoolRetentionMinutes = normalizeSelfieRetentionMinutes(flags.selfieRetentionAfterCheckoutMinutes);
        }
      } else {
        schoolRetentionMinutes = normalizeSelfieRetentionMinutes(body.retentionMinutes);
      }

      const result = await runSelfieCleanupForSchool(admin, targetSchoolId, {
        retentionMinutes: schoolRetentionMinutes,
        includePreviousDays: body.includePreviousDays !== false,
        dryRun: body.dryRun === true,
      });

      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(500).json({
        error: 'SELFIE_CLEANUP_FAILED',
        message: err instanceof Error ? err.message : 'ไม่สามารถลบรูปเซลฟี่ที่ครบกำหนดได้',
      });
    }
  });

  return router;
}
