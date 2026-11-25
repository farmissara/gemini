import type { School } from '../types';
import { getSupabaseClient } from './supabase';
import {
  uploadBackupToGoogleDrive,
  type GoogleDriveBackupFile,
} from './googleDriveBackup';

export type AutoBackupScopeMode = 'per_school' | 'all_schools_separately' | 'system_all';

export interface AutoBackupScheduleConfig {
  enabled: boolean;
  scopeMode: AutoBackupScopeMode;
  scheduleTime: string; // HH:MM in Asia/Bangkok (default 00:00)
  lastRunDate: string | null; // YYYY-MM-DD (Asia/Bangkok)
  lastRunAt: string | null;
  lastRunStatus: 'idle' | 'success' | 'needs_google_auth' | 'error';
  lastRunMessage: string | null;
  lastRunFilesCount: number;
}

export const AUTO_BACKUP_UPDATED_EVENT = 'baanpakkru:autobackup-updated';
const STORAGE_KEY = 'baanpakkru_auto_backup_schedule_v1';

const DEFAULT_CONFIG: AutoBackupScheduleConfig = {
  enabled: false,
  scopeMode: 'per_school',
  scheduleTime: '00:00',
  lastRunDate: null,
  lastRunAt: null,
  lastRunStatus: 'idle',
  lastRunMessage: null,
  lastRunFilesCount: 0,
};

export function getBangkokClockInfo(now = new Date()): {
  dateStr: string;
  timeStr: string;
  minutesOfDay: number;
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = Number(map.hour === '24' ? '0' : map.hour || '0');
  const minute = Number(map.minute || '0');
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return {
    dateStr,
    timeStr,
    minutesOfDay: hour * 60 + minute,
  };
}

export function parseScheduleMinutes(scheduleTime: string): number {
  const match = scheduleTime.match(/^(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return h * 60 + m;
}

export function readAutoBackupScheduleConfig(isSuperAdmin?: boolean): AutoBackupScheduleConfig {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      return {
        ...DEFAULT_CONFIG,
        scopeMode: isSuperAdmin ? 'all_schools_separately' : 'per_school',
      };
    }
    const parsed = JSON.parse(raw) as Partial<AutoBackupScheduleConfig>;
    const validModes: AutoBackupScopeMode[] = ['per_school', 'all_schools_separately', 'system_all'];
    const scopeMode =
      parsed.scopeMode && validModes.includes(parsed.scopeMode)
        ? parsed.scopeMode
        : isSuperAdmin
          ? 'all_schools_separately'
          : 'per_school';
    return {
      enabled: Boolean(parsed.enabled),
      scopeMode: !isSuperAdmin ? 'per_school' : scopeMode,
      scheduleTime: /^\d{2}:\d{2}$/.test(String(parsed.scheduleTime || ''))
        ? String(parsed.scheduleTime)
        : '00:00',
      lastRunDate: typeof parsed.lastRunDate === 'string' ? parsed.lastRunDate : null,
      lastRunAt: typeof parsed.lastRunAt === 'string' ? parsed.lastRunAt : null,
      lastRunStatus:
        parsed.lastRunStatus === 'success' ||
        parsed.lastRunStatus === 'needs_google_auth' ||
        parsed.lastRunStatus === 'error'
          ? parsed.lastRunStatus
          : 'idle',
      lastRunMessage: typeof parsed.lastRunMessage === 'string' ? parsed.lastRunMessage : null,
      lastRunFilesCount: Number(parsed.lastRunFilesCount || 0),
    };
  } catch {
    return {
      ...DEFAULT_CONFIG,
      scopeMode: isSuperAdmin ? 'all_schools_separately' : 'per_school',
    };
  }
}

export function saveAutoBackupScheduleConfig(config: AutoBackupScheduleConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(AUTO_BACKUP_UPDATED_EVENT, { detail: config }));
}

export function updateAutoBackupScheduleConfig(
  patch: Partial<AutoBackupScheduleConfig>,
  isSuperAdmin?: boolean
): AutoBackupScheduleConfig {
  const current = readAutoBackupScheduleConfig(isSuperAdmin);
  const next: AutoBackupScheduleConfig = { ...current, ...patch };
  saveAutoBackupScheduleConfig(next);
  return next;
}

async function fetchBackupPayloadFromServer(
  supabaseToken: string,
  scope: 'all' | 'school',
  schoolId?: string
): Promise<string> {
  const query =
    scope === 'all'
      ? '?scope=all'
      : `?scope=school&schoolId=${encodeURIComponent(schoolId || '')}`;
  const response = await fetch(`/api/backup${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${supabaseToken}`,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };
    throw new Error(payload.message || payload.error || `ดึงข้อมูลสำรองไม่สำเร็จ (${response.status})`);
  }
  return response.text();
}

export interface BackupTargetItem {
  scopeType: 'school' | 'system';
  schoolId?: string;
  schoolName: string;
  filename: string;
}

export function buildBackupTargets(options: {
  mode: AutoBackupScopeMode;
  isSuperAdmin: boolean;
  activeSchoolId: string;
  schools: School[];
  dateStamp?: string;
}): BackupTargetItem[] {
  const stamp = options.dateStamp || getBangkokClockInfo().dateStr;
  const timeSuffix = new Date().toISOString().slice(11, 16).replace(':', '');

  if (!options.isSuperAdmin || options.mode === 'per_school') {
    const school = options.schools.find((s) => s.id === options.activeSchoolId);
    const label = school?.nameTh || school?.nameEn || options.activeSchoolId;
    const codePart = (school?.code || options.activeSchoolId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return [
      {
        scopeType: 'school',
        schoolId: options.activeSchoolId,
        schoolName: label,
        filename: `baanpakkru-school-${codePart}-${stamp}_${timeSuffix}.json`,
      },
    ];
  }

  if (options.mode === 'system_all') {
    return [
      {
        scopeType: 'system',
        schoolName: 'System (All Schools)',
        filename: `baanpakkru-system-backup-${stamp}_${timeSuffix}.json`,
      },
    ];
  }

  // all_schools_separately (Super Admin): separate isolated file per active school + system backup
  const activeSchools = options.schools.filter((s) => s.status === 'active');
  const list = activeSchools.length > 0 ? activeSchools : options.schools;
  const targets: BackupTargetItem[] = list.map((school) => {
    const codePart = (school.code || school.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const label = school.nameTh || school.nameEn || school.code || school.id;
    return {
      scopeType: 'school',
      schoolId: school.id,
      schoolName: label,
      filename: `baanpakkru-school-${codePart}-${stamp}_${timeSuffix}.json`,
    };
  });

  targets.push({
    scopeType: 'system',
    schoolName: 'System (All Schools & Settings)',
    filename: `baanpakkru-system-backup-${stamp}_${timeSuffix}.json`,
  });

  return targets;
}

export async function executeGoogleDriveBackupRun(options: {
  googleAccessToken: string;
  isSuperAdmin: boolean;
  activeSchoolId: string;
  schools: School[];
  mode: AutoBackupScopeMode;
  scheduleKind: 'manual' | 'auto_midnight';
  onProgress?: (completed: number, total: number, currentLabel: string) => void;
}): Promise<{
  uploadedFiles: GoogleDriveBackupFile[];
  failures: Array<{ label: string; error: string }>;
}> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('ไม่พบการเชื่อมต่อ Supabase กรุณาตรวจสอบการตั้งค่าฐานข้อมูล');
  }
  const { data } = await client.auth.getSession();
  const supabaseToken = data.session?.access_token;
  if (!supabaseToken) {
    throw new Error('เซสชันระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  const targets = buildBackupTargets({
    mode: options.mode,
    isSuperAdmin: options.isSuperAdmin,
    activeSchoolId: options.activeSchoolId,
    schools: options.schools,
  });

  if (targets.length === 0) {
    throw new Error('ไม่พบโรงเรียนที่ต้องการสำรองข้อมูล');
  }

  const uploadedFiles: GoogleDriveBackupFile[] = [];
  const failures: Array<{ label: string; error: string }> = [];

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    options.onProgress?.(i, targets.length, target.schoolName);
    try {
      const jsonContent = await fetchBackupPayloadFromServer(
        supabaseToken,
        target.scopeType === 'system' ? 'all' : 'school',
        target.schoolId
      );
      const uploaded = await uploadBackupToGoogleDrive(options.googleAccessToken, {
        filename: target.filename,
        jsonContent,
        scopeType: target.scopeType,
        schoolId: target.schoolId,
        schoolName: target.schoolName,
        scheduleKind: options.scheduleKind,
      });
      uploadedFiles.push(uploaded);
    } catch (err) {
      // Re-throw auth errors immediately so UI prompts reconnect
      if (err instanceof Error && err.name === 'GoogleDriveAuthExpiredError') {
        throw err;
      }
      failures.push({
        label: target.schoolName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    options.onProgress?.(i + 1, targets.length, target.schoolName);
  }

  return { uploadedFiles, failures };
}
