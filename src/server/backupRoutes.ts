import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getBangkokClockParts } from '../lib/selfieCleanupLogic.ts';

type EnvReader = (name: string) => string;
type Access = {
  user: User;
  client: SupabaseClient;
  admin: SupabaseClient;
  role: string;
  schoolId: string | null;
};

const DIRECT_SCHOOL_TABLES = [
  'admin_coordination_messages', 'announcements', 'arcade_custom_rewards',
  'arcade_player_profiles', 'arcade_reward_events', 'arcade_reward_purchases',
  'arcade_reward_redemptions', 'attendance', 'audit_logs',
  'courses', 'grades', 'homework_submissions', 'invoices', 'learning_indicator_sets',
  'learning_indicators', 'leave_requests', 'parent_notifications', 'parent_student_links',
  'period_attendance', 'school_assignments', 'school_campus_gates', 'school_campus_records', 'school_exam_entitlements',
  'school_lesson_completions', 'school_lms_lessons', 'school_moe_qualitative', 'school_package_orders',
  'school_period_times', 'school_questions', 'school_student_records', 'school_ai_requests',
  'staff_parent_invitations', 'student_account_invitations', 'student_career_quests',
  'student_learning_indicator_scores', 'students', 'teachers', 'timetable_slots',
] as const;
const REFERENCE_TABLES = ['central_exam_packs', 'moe_standard_catalog', 'package_catalog'] as const;
const SYSTEM_ONLY_TABLES = ['super_admin_settings'] as const;
const ALLOWED_TABLES = new Set<string>([
  'schools', 'user_profiles', 'parent_notification_preferences',
  ...DIRECT_SCHOOL_TABLES, ...REFERENCE_TABLES, ...SYSTEM_ONLY_TABLES,
]);
const RESTORE_ORDER = [
  'schools', 'students', 'user_profiles', 'teachers', 'courses', 'central_exam_packs',
  'school_ai_requests',
  'moe_standard_catalog', 'package_catalog', 'school_period_times', 'learning_indicator_sets',
  'learning_indicators', 'school_questions', 'school_lms_lessons',
  'school_campus_gates', 'school_campus_records', 'school_exam_entitlements', 'school_package_orders',
  'school_moe_qualitative', 'school_student_records', 'student_account_invitations', 'staff_parent_invitations',
  'parent_student_links', 'parent_notification_preferences', 'announcements', 'timetable_slots',
  'school_assignments', 'attendance', 'period_attendance', 'grades', 'homework_submissions',
  'leave_requests', 'invoices', 'student_career_quests', 'student_learning_indicator_scores',
  'arcade_player_profiles', 'arcade_reward_events', 'arcade_reward_purchases',
  'arcade_custom_rewards', 'arcade_reward_redemptions',
  'admin_coordination_messages', 'parent_notifications', 'audit_logs', 'super_admin_settings',
];
const OMITTED_TABLES: Record<string, string> = {
  parent_push_subscriptions: 'มี endpoint และกุญแจ push ที่เป็นข้อมูลรับรองเฉพาะอุปกรณ์ จึงไม่ส่งออก/นำเข้าข้ามระบบ',
  school_ai_secrets: 'Gemini API keys เป็นข้อมูลลับและไม่รวมในไฟล์สำรอง โรงเรียนต้องตั้งค่าคีย์ใหม่หลังย้ายหรือกู้คืนระบบ',
};
const STORAGE_BUCKETS = ['school-logos', 'school-attachments', 'attendance-selfies'] as const;
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const PAGE_SIZE = 500;
const DEFAULT_RETENTION_DAYS = 14;
const SNAPSHOT_CHECK_INTERVAL_MS = 60 * 1000;
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const BACKUP_TABLE_MIGRATIONS: Record<string, string> = {
  school_campus_records: '20261129000001_campus_moe_persistence.sql',
  school_moe_qualitative: '20261129000001_campus_moe_persistence.sql',
};

let lastServerSnapshotDate: string | null = null;
let lastServerSnapshotAt: string | null = null;
let lastServerSnapshotError: string | null = null;
let lastServerSnapshotFiles = 0;
let cachedDriveToken: { value: string; expiresAt: number } | null = null;
let driveTokenRequest: Promise<string> | null = null;
let cachedDriveFolderId: string | null = null;

export function formatBackupSchemaError(table: string, error: { code?: string; message: string }): string {
  const missingTable = error.code === 'PGRST205' ||
    error.message.includes(`Could not find the table 'public.${table}' in the schema cache`);
  if (!missingTable) return `${table}: ${error.message}`;
  const migration = BACKUP_TABLE_MIGRATIONS[table];
  if (migration) {
    return `ฐานข้อมูลยังไม่มีตาราง ${table} กรุณาเปิดไฟล์ supabase/migrations/${migration} แล้วคัดลอก SQL ทั้งหมดไปวางใน Supabase Dashboard > SQL Editor ของโปรเจกต์ที่แอปเชื่อมต่อ จากนั้นกด Run (ไฟล์มีคำสั่ง reload schema อยู่แล้ว)`;
  }
  return `ฐานข้อมูลยังไม่มีตาราง ${table} กรุณาเปิดไฟล์ migration ที่สร้างตารางนี้ แล้วคัดลอก SQL ทั้งหมดไปวางใน Supabase Dashboard > SQL Editor ของโปรเจกต์ที่แอปเชื่อมต่อ จากนั้นกด Run`;
}

function getClients(env: EnvReader, token: string) {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY') || env('VITE_SUPABASE_PUBLISHABLE_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return null;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { url, client, admin };
}

async function resolveAccess(req: Request, res: Response, env: EnvReader): Promise<Access | null> {
  const match = (req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนสำรองข้อมูล' });
    return null;
  }
  const clients = getClients(env, match[1]);
  if (!clients) {
    res.status(503).json({ error: 'BACKUP_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า service role key ฝั่งเซิร์ฟเวอร์สำหรับศูนย์สำรองข้อมูล' });
    return null;
  }
  const { data: authData, error: authError } = await clients.client.auth.getUser(match[1]);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'INVALID_SESSION', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    return null;
  }
  const { data: profile, error: profileError } = await clients.client
    .from('user_profiles')
    .select('id, school_id, role, status, full_name_th, full_name_en')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError) {
    res.status(403).json({ error: 'PROFILE_UNAVAILABLE', message: 'ตรวจสอบสิทธิ์ผู้ใช้สำหรับสำรองข้อมูลไม่สำเร็จ' });
    return null;
  }
  if (!profile || profile.status !== 'active') {
    res.status(403).json({ error: 'BACKUP_FORBIDDEN', message: 'บัญชีนี้ไม่มีสิทธิ์สำรองข้อมูล หรือยังไม่เปิดใช้งาน' });
    return null;
  }
  let role = String(profile.role || '');
  let schoolId = typeof profile.school_id === 'string' ? profile.school_id : null;
  if (role === 'teacher' && schoolId && authData.user.email) {
    const { data: teacher } = await clients.admin
      .from('teachers')
      .select('is_school_admin, school_id')
      .eq('school_id', schoolId)
      .ilike('email', authData.user.email)
      .maybeSingle();
    if (teacher?.is_school_admin) role = 'admin';
  }
  if (!['admin', 'super_admin'].includes(role)) {
    res.status(403).json({ error: 'BACKUP_FORBIDDEN', message: 'ศูนย์สำรองข้อมูลใช้ได้เฉพาะผู้ดูแลโรงเรียนและ Super Admin' });
    return null;
  }
  if (role === 'admin' && !schoolId) {
    res.status(403).json({ error: 'SCHOOL_REQUIRED', message: 'บัญชีผู้ดูแลนี้ยังไม่ได้ผูกกับโรงเรียน' });
    return null;
  }
  return { user: authData.user, client: clients.client, admin: clients.admin, role, schoolId };
}

function determineScope(access: Access, requested: URLSearchParams, res: Response) {
  const requestedType = requested.get('scope') || 'school';
  const requestedSchoolId = requested.get('schoolId');
  if (access.role !== 'super_admin') {
    if (requestedType !== 'school' || (requestedSchoolId && requestedSchoolId !== access.schoolId)) {
      res.status(403).json({ error: 'SCOPE_FORBIDDEN', message: 'Admin โรงเรียนสำรอง/กู้คืนได้เฉพาะข้อมูลโรงเรียนของตนเอง' });
      return null;
    }
    return { type: 'school' as const, schoolId: access.schoolId as string };
  }
  if (requestedType === 'all') return { type: 'system' as const, schoolId: null };
  if (requestedType === 'school' && requestedSchoolId) return { type: 'school' as const, schoolId: requestedSchoolId };
  res.status(400).json({ error: 'SCOPE_REQUIRED', message: 'กรุณาเลือกสำรองทั้งระบบหรือเลือกโรงเรียน' });
  return null;
}

async function selectAll(client: SupabaseClient, table: string, configure: (query: any) => any) {
  const all: any[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query: any = client.from(table).select('*').range(offset, offset + PAGE_SIZE - 1);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(formatBackupSchemaError(table, error));
    const rows = (data || []) as any[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
}

async function getSchoolProfileIds(client: SupabaseClient, schoolId: string) {
  const ids: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client.from('user_profiles').select('id')
      .eq('school_id', schoolId).range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(formatBackupSchemaError('user_profiles', error));
    const rows = data || [];
    ids.push(...rows.map((row) => String(row.id)));
    if (rows.length < PAGE_SIZE) return ids;
  }
}

async function listAuthUsers(admin: SupabaseClient) {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`ไม่สามารถอ่านรายชื่อบัญชีล็อกอิน: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function listStorageFiles(
  admin: SupabaseClient,
  scope: { type: 'system' | 'school'; schoolId: string | null },
) {
  const files: Array<{ bucket: string; path: string; contentType: string; size: number; sha256: string; contentBase64: string }> = [];
  let totalBytes = 0;
  for (const bucket of STORAGE_BUCKETS) {
    const walk = async (prefix: string, depth: number): Promise<void> => {
      if (depth > 8 || files.length >= 10000) throw new Error('รายการไฟล์ Storage เกินขอบเขตที่สำรองได้');
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw new Error(`Storage ${bucket}/${prefix}: ${error.message}`);
        const entries = data || [];
        for (const entry of entries) {
          const path = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.id) {
            if (scope.schoolId && path.split('/')[0] !== scope.schoolId) continue;
            const { data: blob, error: downloadError } = await admin.storage.from(bucket).download(path);
            if (downloadError || !blob) throw new Error(`ดาวน์โหลดไฟล์ ${bucket}/${path} เพื่อสำรองไม่สำเร็จ`);
            const bytes = Buffer.from(await blob.arrayBuffer());
            totalBytes += bytes.byteLength;
            if (totalBytes > MAX_BACKUP_BYTES * 0.62) throw new Error('ไฟล์ Storage รวมมีขนาดเกินขีดจำกัดของไฟล์ Backup 50 MB');
            files.push({ bucket, path, contentType: blob.type || 'application/octet-stream', size: bytes.byteLength,
              sha256: createHash('sha256').update(bytes).digest('hex'), contentBase64: bytes.toString('base64') });
          } else {
            if (scope.schoolId && depth === 0 && entry.name !== scope.schoolId) continue;
            await walk(path, depth + 1);
          }
        }
        if (entries.length < 100) break;
      }
    };
    await walk('', 0);
  }
  return files;
}

function safeAccount(user: User, role?: string) {
  return {
    id: user.id,
    email: user.email || null,
    phone: user.phone || null,
    loginName: typeof user.user_metadata?.login_name === 'string' ? user.user_metadata.login_name :
      typeof user.user_metadata?.username === 'string' ? user.user_metadata.username :
      typeof user.user_metadata?.user_name === 'string' ? user.user_metadata.user_name : null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at || null,
    role: role || null,
    passwordIncluded: false,
  };
}

async function buildBackupWithAdmin(admin: SupabaseClient, scope: { type: 'system' | 'school'; schoolId: string | null }, url: string) {
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  const profileIds = scope.type === 'school' && scope.schoolId
    ? await getSchoolProfileIds(admin, scope.schoolId)
    : [];
  for (const table of RESTORE_ORDER) {
    if (table === 'super_admin_settings' && scope.type !== 'system') continue;
    if (REFERENCE_TABLES.includes(table as (typeof REFERENCE_TABLES)[number]) && scope.type !== 'system') continue;
    let rows: unknown[];
    if (table === 'schools') {
      rows = await selectAll(admin, table, (query) => scope.schoolId ? query.eq('id', scope.schoolId) : query);
    } else if (table === 'user_profiles') {
      rows = await selectAll(admin, table, (query) => scope.schoolId ? query.eq('school_id', scope.schoolId) : query);
    } else if (table === 'parent_notification_preferences') {
      rows = profileIds.length
        ? await selectAll(admin, table, (query) => query.in('profile_id', profileIds))
        : scope.type === 'system' ? await selectAll(admin, table, (query) => query) : [];
    } else if ((DIRECT_SCHOOL_TABLES as readonly string[]).includes(table)) {
      rows = await selectAll(admin, table, (query) => scope.schoolId ? query.eq('school_id', scope.schoolId) : query);
    } else if ((REFERENCE_TABLES as readonly string[]).includes(table)) {
      rows = await selectAll(admin, table, (query) => query);
    } else if ((SYSTEM_ONLY_TABLES as readonly string[]).includes(table)) {
      rows = await selectAll(admin, table, (query) => query);
    } else continue;
    tables[table] = rows;
    counts[table] = rows.length;
  }
  const ids = new Set((tables.user_profiles || []).map((row: any) => String(row.id)));
  const authUsers = await listAuthUsers(admin);
  const accounts = authUsers.filter((user) => scope.type === 'system' || ids.has(user.id)).map((user) => {
    const profile = (tables.user_profiles || []).find((row: any) => row.id === user.id) as any;
    return safeAccount(user, profile?.role);
  });
  const projectRef = new URL(url).hostname.split('.')[0];
  const storageFiles = await listStorageFiles(admin, scope);
  const tableChecksums = Object.fromEntries(Object.entries(tables).map(([table, rows]) => [
    table, createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  ]));
  const backupDigest = createHash('sha256').update(JSON.stringify({ scope, tables, storageFiles })).digest('hex');
  return {
    format: 'baanpakkru-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceProject: projectRef,
    scope,
    tables,
    storageFiles,
    accounts,
    counts: { ...counts, storage_files: storageFiles.length, login_accounts: accounts.length },
    exclusions: OMITTED_TABLES,
    security: { passwordsIncluded: false, restoreMode: 'merge-only' },
    manifest: { algorithm: 'sha256', tableChecksums, backupDigest },
  };
}

function parseBackup(req: Request, res: Response) {
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: 'BACKUP_FILE_REQUIRED', message: 'กรุณาเลือกไฟล์สำรองข้อมูล JSON' });
    return null;
  }
  if (req.body.byteLength > MAX_BACKUP_BYTES) {
    res.status(413).json({ error: 'BACKUP_TOO_LARGE', message: 'ไฟล์สำรองมีขนาดเกิน 50 MB' });
    return null;
  }
  try {
    const backup = JSON.parse(req.body.toString('utf8'));
    if (backup?.format !== 'baanpakkru-backup' || backup?.version !== 1 || !backup?.scope || !backup?.tables || typeof backup.tables !== 'object') {
      throw new Error('รูปแบบหรือเวอร์ชันไฟล์ไม่รองรับ');
    }
    for (const [table, rows] of Object.entries(backup.tables)) {
      if (!ALLOWED_TABLES.has(table) || !Array.isArray(rows)) throw new Error(`ตารางในไฟล์ไม่ถูกต้อง: ${table}`);
      if ((rows as unknown[]).some((row) => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(`ข้อมูลในตาราง ${table} ไม่ถูกต้อง`);
    }
    if (backup.storageFiles !== undefined && !Array.isArray(backup.storageFiles)) throw new Error('รายการไฟล์ Storage ในไฟล์สำรองไม่ถูกต้อง');
    for (const file of backup.storageFiles || []) {
      if (!file || !STORAGE_BUCKETS.includes(file.bucket) || typeof file.path !== 'string' ||
          typeof file.contentBase64 !== 'string' || typeof file.sha256 !== 'string' ||
          !/^[a-f0-9]{64}$/i.test(file.sha256) || file.path.startsWith('/') ||
          file.path.split('/').some((part: string) => !part || part === '.' || part === '..')) {
        throw new Error('ข้อมูลไฟล์ Storage ในไฟล์สำรองไม่ถูกต้อง');
      }
      const bytes = Buffer.from(file.contentBase64, 'base64');
      if (bytes.byteLength !== Number(file.size) ||
          createHash('sha256').update(bytes).digest('hex') !== file.sha256.toLowerCase()) {
        throw new Error(`ไฟล์ Storage ${file.bucket}/${file.path} ไม่ผ่านการตรวจสอบ checksum`);
      }
    }
    if (backup.manifest) {
      if (backup.manifest.algorithm !== 'sha256' || typeof backup.manifest.backupDigest !== 'string' ||
          !/^[a-f0-9]{64}$/i.test(backup.manifest.backupDigest)) throw new Error('Manifest ของไฟล์สำรองไม่ถูกต้อง');
      const digest = createHash('sha256').update(JSON.stringify({
        scope: backup.scope, tables: backup.tables, storageFiles: backup.storageFiles || [],
      })).digest('hex');
      if (digest !== backup.manifest.backupDigest.toLowerCase()) throw new Error('ไฟล์สำรองไม่ผ่านการตรวจสอบ checksum');
      for (const [table, rows] of Object.entries(backup.tables)) {
        const expected = backup.manifest.tableChecksums?.[table];
        const actual = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
        if (expected !== actual) throw new Error(`ตาราง ${table} ไม่ผ่านการตรวจสอบ checksum`);
      }
    }
    return backup;
  } catch (error) {
    res.status(400).json({ error: 'INVALID_BACKUP', message: error instanceof Error ? error.message : 'อ่านไฟล์สำรองไม่สำเร็จ' });
    return null;
  }
}

async function validateRestore(backup: any, access: Access, res: Response) {
  const scope = backup.scope;
  if (scope.type === 'system' && access.role !== 'super_admin') {
    res.status(403).json({ error: 'SCOPE_FORBIDDEN', message: 'เฉพาะ Super Admin เท่านั้นที่กู้คืนข้อมูลทั้งระบบได้' });
    return null;
  }
  if (scope.type === 'school' && (!scope.schoolId || (access.role !== 'super_admin' && scope.schoolId !== access.schoolId))) {
    res.status(403).json({ error: 'SCOPE_FORBIDDEN', message: 'Admin โรงเรียนกู้คืนได้เฉพาะข้อมูลโรงเรียนของตนเอง' });
    return null;
  }
  if (!['school', 'system'].includes(scope.type)) {
    res.status(400).json({ error: 'INVALID_SCOPE', message: 'ขอบเขตในไฟล์สำรองไม่ถูกต้อง' });
    return null;
  }
  const allowedSchoolId = scope.type === 'school' ? scope.schoolId : null;
  if (allowedSchoolId && (backup.storageFiles || []).some((file: any) => !String(file.path || '').startsWith(`${allowedSchoolId}/`))) {
    res.status(403).json({ error: 'STORAGE_SCOPE_MISMATCH', message: 'ไฟล์ Storage มีข้อมูลข้ามโรงเรียน' });
    return null;
  }
  for (const [table, rows] of Object.entries(backup.tables) as Array<[string, any[]]>) {
    if (allowedSchoolId && (REFERENCE_TABLES as readonly string[]).includes(table)) {
      res.status(403).json({ error: 'GLOBAL_TABLE_FORBIDDEN', message: 'ไฟล์สำรองโรงเรียนไม่สามารถแก้ไขข้อมูลอ้างอิงส่วนกลางได้' });
      return null;
    }
    if (allowedSchoolId && (DIRECT_SCHOOL_TABLES as readonly string[]).includes(table) && rows.some((row) => String(row.school_id || '') !== allowedSchoolId)) {
      res.status(403).json({ error: 'SCHOOL_MISMATCH', message: `ตาราง ${table} ต้องระบุ school_id ของโรงเรียนที่เลือกทุกรายการ` });
      return null;
    }
    if (table === 'super_admin_settings' && access.role !== 'super_admin') {
      res.status(403).json({ error: 'SYSTEM_SETTING_FORBIDDEN', message: 'เฉพาะ Super Admin เท่านั้นที่กู้คืนค่าระบบได้' });
      return null;
    }
    if (table === 'schools' && allowedSchoolId && rows.some((row) => String(row.id) !== allowedSchoolId)) {
      res.status(403).json({ error: 'SCHOOL_MISMATCH', message: 'ไฟล์มีข้อมูลโรงเรียนอื่นปะปนอยู่' });
      return null;
    }
    if (allowedSchoolId && rows.some((row) => row.school_id && String(row.school_id) !== allowedSchoolId)) {
      res.status(403).json({ error: 'SCHOOL_MISMATCH', message: `ตาราง ${table} มีข้อมูลข้ามโรงเรียน` });
      return null;
    }
    if (allowedSchoolId && table === 'user_profiles' && rows.some((row) => row.role === 'super_admin')) {
      res.status(403).json({ error: 'ROLE_ESCALATION', message: 'ไฟล์โรงเรียนไม่สามารถกำหนดบัญชี Super Admin ได้' });
      return null;
    }
    if (allowedSchoolId && table === 'user_profiles') {
      const { data: currentProfiles, error } = await access.client.from('user_profiles').select('id, role, school_id').eq('school_id', allowedSchoolId);
      if (error) {
        res.status(403).json({ error: 'PROFILE_VALIDATION_FAILED', message: 'ตรวจสอบบัญชีในโรงเรียนเพื่อกู้คืนไม่สำเร็จ' });
        return null;
      }
      const currentById = new Map((currentProfiles || []).map((profile) => [String(profile.id), profile]));
      if (rows.some((row) => {
        const current = currentById.get(String(row.id));
        return String(row.school_id || '') !== allowedSchoolId || !current || row.role !== current.role;
      })) {
        res.status(403).json({ error: 'PROFILE_CHANGE_FORBIDDEN', message: 'กู้คืนได้เฉพาะโปรไฟล์ที่มีอยู่และห้ามเปลี่ยนบทบาทผู้ใช้ผ่านไฟล์สำรอง' });
        return null;
      }
    }
    if (allowedSchoolId && table === 'parent_notification_preferences') {
      const { data: schoolProfiles, error } = await access.client.from('user_profiles').select('id').eq('school_id', allowedSchoolId);
      if (error) {
        res.status(403).json({ error: 'PROFILE_VALIDATION_FAILED', message: 'ตรวจสอบบัญชีโรงเรียนเพื่อกู้คืนไม่สำเร็จ' });
        return null;
      }
      const profileIds = new Set((schoolProfiles || []).map((profile) => String(profile.id)));
      if (rows.some((row) => !profileIds.has(String(row.profile_id)))) {
        res.status(403).json({ error: 'SCHOOL_MISMATCH', message: 'ข้อมูลการแจ้งเตือนมีบัญชีนอกโรงเรียนปะปนอยู่' });
        return null;
      }
    }
  }
  const tablesToCheck = (Object.entries(backup.tables) as Array<[string, any[]]>)
    .filter(([, rows]) => rows.length > 0);
  for (let index = 0; index < tablesToCheck.length; index += 8) {
    const checks = await Promise.all(tablesToCheck.slice(index, index + 8).map(async ([table]) => {
      const { error } = await access.admin.from(table).select('*').limit(0);
      return error ? { table, error } : null;
    }));
    const failedCheck = checks.find((check) => check !== null);
    if (failedCheck) {
      res.status(409).json({
        error: 'RESTORE_SCHEMA_MISMATCH',
        message: formatBackupSchemaError(failedCheck.table, failedCheck.error),
      });
      return null;
    }
  }
  const bucketsToCheck = Array.from(new Set<string>(
    (backup.storageFiles || []).map((file: { bucket: string }) => file.bucket)
  ));
  for (const bucket of bucketsToCheck) {
    const { error } = await access.admin.storage.getBucket(bucket);
    if (error) {
      res.status(409).json({
        error: 'RESTORE_STORAGE_MISMATCH',
        message: `Storage bucket ${bucket} ไม่พร้อมใช้งาน กรุณาติดตั้ง migration ที่สร้าง bucket นี้ก่อนกู้คืน (${error.message})`,
      });
      return null;
    }
  }
  return { type: scope.type as 'school' | 'system', schoolId: allowedSchoolId };
}

function getRetentionDays(env: EnvReader): number {
  const parsed = Number(env('BACKUP_RETENTION_DAYS'));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) return DEFAULT_RETENTION_DAYS;
  return Math.floor(parsed);
}

function getServiceAdmin(env: EnvReader): { url: string; admin: SupabaseClient } | null {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { url, admin };
}

type DriveBackupMetadata = {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  appProperties?: Record<string, string>;
};

function isGoogleDriveBackupConfigured(env: EnvReader): boolean {
  return Boolean(env('GOOGLE_DRIVE_CLIENT_ID') && env('GOOGLE_DRIVE_CLIENT_SECRET') && env('GOOGLE_DRIVE_REFRESH_TOKEN'));
}

async function getGoogleDriveAccessToken(env: EnvReader): Promise<string> {
  if (!isGoogleDriveBackupConfigured(env)) {
    throw new Error('Google Drive backup is not configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.');
  }
  if (cachedDriveToken && cachedDriveToken.expiresAt > Date.now() + 60_000) {
    return cachedDriveToken.value;
  }
  if (driveTokenRequest) return driveTokenRequest;

  driveTokenRequest = (async () => {
    const body = new URLSearchParams({
      client_id: env('GOOGLE_DRIVE_CLIENT_ID'),
      client_secret: env('GOOGLE_DRIVE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_DRIVE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const payload = await response.json().catch(() => null) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
    } | null;
    if (!response.ok || !payload?.access_token) {
      throw new Error(payload?.error_description || payload?.error || `Google OAuth token request failed (${response.status})`);
    }
    cachedDriveToken = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(60, Number(payload.expires_in) || 3600) * 1000,
    };
    return payload.access_token;
  })();

  try {
    return await driveTokenRequest;
  } finally {
    driveTokenRequest = null;
  }
}

async function googleDriveRequest(
  env: EnvReader,
  url: string,
  init: RequestInit = {},
): Promise<globalThis.Response> {
  const token = await getGoogleDriveAccessToken(env);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || `Google Drive API request failed (${response.status})`);
  }
  return response;
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getDriveBackupFolderId(env: EnvReader): Promise<string> {
  if (cachedDriveFolderId) return cachedDriveFolderId;
  const query = new URLSearchParams({
    q: `mimeType = '${DRIVE_FOLDER_MIME}' and trashed = false and appProperties has { key='baanpakkruFolderRole' and value='backup_root' }`,
    fields: 'files(id)',
    pageSize: '1',
    spaces: 'drive',
  });
  const response = await googleDriveRequest(env, `${DRIVE_FILES_API}?${query}`);
  const data = await response.json() as { files?: Array<{ id?: string }> };
  const existing = data.files?.[0]?.id;
  if (existing) {
    cachedDriveFolderId = existing;
    return existing;
  }

  const create = await googleDriveRequest(env, `${DRIVE_FILES_API}?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'BaanPakKru-Backups',
      mimeType: DRIVE_FOLDER_MIME,
      appProperties: { baanpakkruFolderRole: 'backup_root' },
    }),
  });
  const created = await create.json() as { id?: string };
  if (!created.id) throw new Error('Google Drive backup folder creation returned no file ID');
  cachedDriveFolderId = created.id;
  return created.id;
}

async function listDriveBackupFiles(env: EnvReader): Promise<DriveBackupMetadata[]> {
  const folderId = await getDriveBackupFolderId(env);
  const files: DriveBackupMetadata[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false and appProperties has { key='baanpakkruBackup' and value='true' }`,
      fields: 'nextPageToken,files(id,name,size,createdTime,appProperties)',
      orderBy: 'createdTime desc',
      pageSize: '100',
      spaces: 'drive',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await googleDriveRequest(env, `${DRIVE_FILES_API}?${params}`);
    const data = await response.json() as { files?: DriveBackupMetadata[]; nextPageToken?: string };
    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return files;
}

async function uploadDriveBackup(
  env: EnvReader,
  options: {
    name: string;
    content: string;
    appProperties: Record<string, string>;
  },
): Promise<DriveBackupMetadata> {
  const folderId = await getDriveBackupFolderId(env);
  const identityProperties = ['scopeType', 'snapshotDate', 'schoolId']
    .filter((key) => options.appProperties[key])
    .map((key) => `appProperties has { key='${key}' and value='${escapeDriveQueryValue(options.appProperties[key])}' }`);
  const lookup = new URLSearchParams({
    q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false and appProperties has { key='baanpakkruBackup' and value='true' } and ${identityProperties.join(' and ')}`,
    fields: 'files(id)',
    pageSize: '1',
    spaces: 'drive',
  });
  const lookupResponse = await googleDriveRequest(env, `${DRIVE_FILES_API}?${lookup}`);
  const lookupData = await lookupResponse.json() as { files?: Array<{ id?: string }> };
  const existingId = lookupData.files?.[0]?.id;
  const metadata = {
    name: options.name,
    mimeType: 'application/json',
    ...(existingId ? {} : { parents: [folderId] }),
    appProperties: { baanpakkruBackup: 'true', ...options.appProperties },
  };
  const boundary = `baanpakkru_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    options.content,
    `--${boundary}--`,
  ].join('\r\n');
  const params = new URLSearchParams({
    uploadType: 'multipart',
    fields: 'id,name,size,createdTime,appProperties',
  });
  const url = existingId
    ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(existingId)}?${params}`
    : `${DRIVE_UPLOAD_API}?${params}`;
  const response = await googleDriveRequest(env, url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return await response.json() as DriveBackupMetadata;
}

async function pruneOldDriveBackups(env: EnvReader, retentionDays: number): Promise<void> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await listDriveBackupFiles(env);
  for (const file of files) {
    const createdAt = Date.parse(file.createdTime || '');
    if (Number.isFinite(createdAt) && createdAt < cutoff) {
      await googleDriveRequest(env, `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}`, { method: 'DELETE' });
    }
  }
}

export async function runServerMidnightSnapshots(
  env: EnvReader,
  options?: { onlySchoolId?: string | null; includeSystem?: boolean }
): Promise<{
  dateStr: string;
  bucket: string;
  saved: Array<{ path: string; scope: string; schoolId?: string; size: number }>;
  errors: Array<{ target: string; error: string }>;
}> {
  const service = getServiceAdmin(env);
  if (!service) {
    throw new Error('Server Supabase service role key is not configured.');
  }
  if (!isGoogleDriveBackupConfigured(env)) {
    throw new Error('Google Drive backup is not configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.');
  }

  const { dateStr } = getBangkokClockParts();
  const saved: Array<{ path: string; scope: string; schoolId?: string; size: number }> = [];
  const errors: Array<{ target: string; error: string }> = [];

  let schoolQuery = service.admin.from('schools').select('id, code, name_th, name_en, status').order('name_th');
  if (options?.onlySchoolId) {
    schoolQuery = schoolQuery.eq('id', options.onlySchoolId);
  } else {
    schoolQuery = schoolQuery.eq('status', 'active');
  }
  const { data: schools, error: schoolError } = await schoolQuery;
  if (schoolError) throw new Error(`โหลดรายชื่อโรงเรียนไม่สำเร็จ: ${schoolError.message}`);

  for (const school of schools || []) {
    const cleanId = String(school.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!cleanId) continue;
    try {
      const backup = await buildBackupWithAdmin(service.admin, { type: 'school', schoolId: String(school.id) }, service.url);
      const serialized = JSON.stringify(backup);
      const bytes = Buffer.from(serialized, 'utf8');
      if (bytes.byteLength > MAX_BACKUP_BYTES) {
        throw new Error('ขนาดข้อมูลโรงเรียนเกิน 50 MB');
      }
      const uploaded = await uploadDriveBackup(env, {
        name: `baanpakkru-${dateStr}-school-${cleanId}.json`,
        content: serialized,
        appProperties: {
          scopeType: 'school',
          schoolId: String(school.id).slice(0, 110),
          schoolName: String(school.name_th || school.name_en || school.code || school.id).slice(0, 110),
          snapshotDate: dateStr,
        },
      });
      saved.push({
        path: uploaded.id,
        scope: 'school',
        schoolId: String(school.id),
        size: Number(uploaded.size || bytes.byteLength),
      });
    } catch (err) {
      errors.push({ target: String(school.name_th || school.name_en || school.id), error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (!options?.onlySchoolId && options?.includeSystem !== false) {
    try {
      const systemBackup = await buildBackupWithAdmin(service.admin, { type: 'system', schoolId: null }, service.url);
      const serialized = JSON.stringify(systemBackup);
      const bytes = Buffer.from(serialized, 'utf8');
      if (bytes.byteLength > MAX_BACKUP_BYTES) throw new Error('ขนาดข้อมูลทั้งระบบเกิน 50 MB');
      const uploaded = await uploadDriveBackup(env, {
        name: `baanpakkru-${dateStr}-system-all.json`,
        content: serialized,
        appProperties: { scopeType: 'system', schoolName: 'System (All Schools)', snapshotDate: dateStr },
      });
      saved.push({ path: uploaded.id, scope: 'system', size: Number(uploaded.size || bytes.byteLength) });
    } catch (err) {
      errors.push({ target: 'system-all', error: err instanceof Error ? err.message : String(err) });
    }
  }

  await pruneOldDriveBackups(env, getRetentionDays(env));
  lastServerSnapshotDate = dateStr;
  lastServerSnapshotAt = new Date().toISOString();
  lastServerSnapshotFiles = saved.length;
  lastServerSnapshotError = errors.length > 0 ? errors.map((e) => `${e.target}: ${e.error}`).join('; ') : null;

  return { dateStr, bucket: 'Google Drive', saved, errors };
}

export function startAutoBackupScheduler(getEnv: EnvReader): () => void {
  let isRunning = false;
  let midnightTimer: ReturnType<typeof setTimeout> | null = null;

  const runMidnightSnapshot = () => {
    if (isRunning) return;
    if (!getServiceAdmin(getEnv) || !isGoogleDriveBackupConfigured(getEnv)) return;
    const { dateStr, minutes } = getBangkokClockParts();
    if (lastServerSnapshotDate === dateStr) return;

    isRunning = true;
    void runServerMidnightSnapshots(getEnv)
      .then((result) => {
        console.log(`[Auto Backup] Midnight snapshot (${result.dateStr}) saved ${result.saved.length} file(s) to bucket "${result.bucket}".`);
      })
      .catch((err) => {
        lastServerSnapshotError = err instanceof Error ? err.message : String(err);
        console.error('[Auto Backup] Midnight snapshot failed:', lastServerSnapshotError);
      })
      .finally(() => {
        isRunning = false;
      });
  };

  const scheduleNextMidnight = () => {
    if (midnightTimer) clearTimeout(midnightTimer);
    const now = new Date();
    const bangkok = getBangkokClockParts(now);
    const [year, month, day] = bangkok.dateStr.split('-').map(Number);
    if (!year || !month || !day) return;

    // Asia/Bangkok is UTC+7. Schedule the next local 00:00 directly.
    const nextMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0) - (7 * 60 * 60 * 1000);
    const delayMs = Math.max(1000, nextMidnightUtcMs - now.getTime());

    midnightTimer = setTimeout(() => {
      runMidnightSnapshot();
      scheduleNextMidnight();
    }, delayMs);
    midnightTimer.unref?.();
  };

  scheduleNextMidnight();

  // Watchdog: recover if the runtime slept or the exact timer was delayed.
  const timer = setInterval(() => {
    const { dateStr, minutes } = getBangkokClockParts();
    if (minutes <= 10 && lastServerSnapshotDate !== dateStr) {
      runMidnightSnapshot();
      scheduleNextMidnight();
    }
  }, SNAPSHOT_CHECK_INTERVAL_MS);
  timer.unref?.();

  return () => {
    if (midnightTimer) clearTimeout(midnightTimer);
    clearInterval(timer);
  };
}

function timingSafeBearerMatch(headerValue: string, expectedSecret: string): boolean {
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match || !expectedSecret) return false;
  const actual = Buffer.from(match[1], 'utf8');
  const expected = Buffer.from(expectedSecret, 'utf8');
  if (actual.byteLength !== expected.byteLength) return false;
  return timingSafeEqual(actual, expected);
}

export function createBackupRouter(getEnv: EnvReader) {
  const router = Router();
  router.get('/status', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      supabaseServiceRoleConfigured: true,
      backupBucket: 'Google Drive',
      googleDriveConfigured: isGoogleDriveBackupConfigured(getEnv),
      retentionDays: getRetentionDays(getEnv),
      cronSecretConfigured: Boolean(getEnv('BACKUP_CRON_SECRET')),
      midnightTimeBangkok: '00:00',
      lastServerSnapshotDate,
      lastServerSnapshotAt,
      lastServerSnapshotFiles,
      lastServerSnapshotError,
    });
  });

  router.get('/snapshots', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    try {
      const files = await listDriveBackupFiles(getEnv);
      const items = files.flatMap((file) => {
        const scopeType = file.appProperties?.scopeType;
        const schoolId = file.appProperties?.schoolId;
        if (scopeType !== 'school' && scopeType !== 'system') return [];
        if (access.role !== 'super_admin' &&
            (scopeType !== 'school' || schoolId !== access.schoolId)) return [];
        const createdAt = file.createdTime || '';
        return [{
          path: file.id,
          date: file.appProperties?.snapshotDate || createdAt.slice(0, 10),
          name: file.name,
          scope: scopeType,
          schoolId,
          size: Number(file.size || 0),
          createdAt,
        }];
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json({ bucket: 'Google Drive', snapshots: items });
    } catch (error) {
      res.status(502).json({ error: 'SNAPSHOT_LIST_FAILED', message: error instanceof Error ? error.message : 'โหลดรายการ Snapshot ไม่สำเร็จ' });
    }
  });

  router.get('/snapshots/download', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    const fileId = typeof req.query.path === 'string' ? req.query.path.trim() : '';
    if (!/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) {
      res.status(400).json({ error: 'INVALID_SNAPSHOT_ID', message: 'รหัสไฟล์ Snapshot ไม่ถูกต้อง' });
      return;
    }
    try {
      const params = new URLSearchParams({ fields: 'id,name,appProperties' });
      const metadataResponse = await googleDriveRequest(
        getEnv,
        `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?${params}`,
      );
      const metadata = await metadataResponse.json() as DriveBackupMetadata;
      const properties = metadata.appProperties || {};
      if (properties.baanpakkruBackup !== 'true' ||
          !['school', 'system'].includes(properties.scopeType || '')) {
        res.status(404).json({ error: 'SNAPSHOT_NOT_FOUND', message: 'ไม่พบไฟล์ Snapshot' });
        return;
      }
      if (access.role !== 'super_admin' &&
          (properties.scopeType !== 'school' || properties.schoolId !== access.schoolId)) {
        res.status(403).json({ error: 'SCOPE_FORBIDDEN', message: 'Admin โรงเรียนเข้าถึง Snapshot ได้เฉพาะโรงเรียนของตนเอง' });
        return;
      }
      const mediaResponse = await googleDriveRequest(
        getEnv,
        `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`,
      );
      const text = await mediaResponse.text();
      const filename = metadata.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      res.send(text);
    } catch (error) {
      res.status(502).json({ error: 'SNAPSHOT_DOWNLOAD_FAILED', message: error instanceof Error ? error.message : 'ดาวน์โหลด Snapshot ไม่สำเร็จ' });
    }
  });

  router.post('/snapshots/run-now', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    try {
      const result = await runServerMidnightSnapshots(getEnv, {
        onlySchoolId: access.role === 'super_admin' ? null : access.schoolId,
        includeSystem: access.role === 'super_admin',
      });
      if (result.saved.length === 0 && result.errors.length > 0) {
        res.status(502).json({
          error: 'SNAPSHOT_RUN_FAILED',
          message: result.errors.map((item) => `${item.target}: ${item.error}`).join('; '),
          ...result,
        });
        return;
      }
      res.status(result.errors.length > 0 ? 207 : 200).json({ ok: true, ...result });
    } catch (error) {
      res.status(502).json({ error: 'SNAPSHOT_RUN_FAILED', message: error instanceof Error ? error.message : 'สร้าง Snapshot ไม่สำเร็จ' });
    }
  });

  router.post('/cron', async (req: Request, res: Response) => {
    const secret = getEnv('BACKUP_CRON_SECRET');
    if (!secret) {
      res.status(503).json({ error: 'CRON_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า BACKUP_CRON_SECRET' });
      return;
    }
    if (!timingSafeBearerMatch(req.get('authorization') || '', secret)) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Cron secret ไม่ถูกต้อง' });
      return;
    }
    try {
      const result = await runServerMidnightSnapshots(getEnv);
      if (result.saved.length === 0 && result.errors.length > 0) {
        res.status(502).json({
          error: 'CRON_BACKUP_FAILED',
          message: result.errors.map((item) => `${item.target}: ${item.error}`).join('; '),
          ...result,
        });
        return;
      }
      res.status(result.errors.length > 0 ? 207 : 200).json({ ok: true, ...result });
    } catch (error) {
      res.status(502).json({ error: 'CRON_BACKUP_FAILED', message: error instanceof Error ? error.message : 'สำรองข้อมูลอัตโนมัติไม่สำเร็จ' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    const scope = determineScope(access, new URLSearchParams(req.query as Record<string, string>), res);
    if (!scope) return;
    const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
    try {
      const backup = await buildBackupWithAdmin(access.admin, scope, url);
      const serialized = JSON.stringify(backup);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_BACKUP_BYTES) {
        res.status(413).json({ error: 'BACKUP_TOO_LARGE', message: 'ไฟล์สำรองรวมข้อมูล Storage เกิน 50 MB กรุณาสำรองโรงเรียนแยกเป็นรายโรงเรียน' });
        return;
      }
      const filenameScope = scope.type === 'system' ? 'system' : String(scope.schoolId).replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="baanpakkru-backup-${filenameScope}-${new Date().toISOString().slice(0, 10)}.json"`);
      res.setHeader('Cache-Control', 'no-store');
      res.send(serialized);
    } catch (error) {
      res.status(502).json({ error: 'BACKUP_FAILED', message: error instanceof Error ? error.message : 'สำรองข้อมูลไม่สำเร็จ' });
    }
  });
  router.post('/validate', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    const backup = parseBackup(req, res);
    if (!backup) return;
    const scope = await validateRestore(backup, access, res);
    if (!scope) return;
    const counts = Object.fromEntries(Object.entries(backup.tables).map(([table, rows]) => [table, (rows as unknown[]).length]));
    res.json({ valid: true, scope, exportedAt: backup.exportedAt, sourceProject: backup.sourceProject, counts,
      loginAccounts: Array.isArray(backup.accounts) ? backup.accounts.length : 0,
      passwordsIncluded: false, mergeOnly: true });
  });
  router.post('/restore', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    const backup = parseBackup(req, res);
    if (!backup) return;
    const scope = await validateRestore(backup, access, res);
    if (!scope) return;
    const imported: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    let cachedAuthUsers: User[] | null = null;
    const getCachedAuthUsers = async () => {
      if (!cachedAuthUsers) cachedAuthUsers = await listAuthUsers(access.admin);
      return cachedAuthUsers;
    };
    try {
      for (const table of RESTORE_ORDER) {
        const sourceRows = backup.tables[table] as any[] | undefined;
        if (!sourceRows?.length) continue;
        let rows = sourceRows;
        if (table === 'user_profiles') {
          const authUsers = await getCachedAuthUsers();
          const existingIds = new Set(authUsers.map((user) => user.id));
          rows = sourceRows.filter((row) => existingIds.has(String(row.id)));
          if (rows.length !== sourceRows.length) skipped[table] = sourceRows.length - rows.length;
        }
        let tableImported = 0;
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await access.admin.from(table).upsert(chunk);
          if (error) throw new Error(`${table} (${tableImported}/${rows.length}): ${error.message}`);
          tableImported += chunk.length;
        }
        imported[table] = tableImported;
      }
      const restoredFiles: string[] = [];
      for (const file of backup.storageFiles || []) {
        const bytes = Buffer.from(String(file.contentBase64), 'base64');
        const digest = createHash('sha256').update(bytes).digest('hex');
        if (digest !== String(file.sha256).toLowerCase() || bytes.byteLength !== Number(file.size)) {
          throw new Error(`ไฟล์ Storage ${file.bucket}/${file.path} ไม่ผ่านการตรวจสอบ checksum`);
        }
        const { error } = await access.admin.storage.from(file.bucket).upload(file.path, bytes, {
          contentType: file.contentType || 'application/octet-stream', upsert: true,
        });
        if (error) throw new Error(`Storage ${file.bucket}/${file.path}: ${error.message}`);
        restoredFiles.push(`${file.bucket}/${file.path}`);
      }
      const sourceAccounts = Array.isArray(backup.accounts) ? backup.accounts : [];
      const existingAuth = await getCachedAuthUsers();
      const existingEmails = new Set(existingAuth.map((user) => (user.email || '').toLowerCase()).filter(Boolean));
      const missingAccounts = sourceAccounts.filter((account: any) => account.email && !existingEmails.has(String(account.email).toLowerCase())).map((account: any) => ({
        email: account.email, role: account.role || null,
      }));
      res.json({ ok: true, imported, skipped, restoredStorageFiles: restoredFiles.length, missingAccounts, passwordsIncluded: false,
        message: 'นำเข้าด้วยการเพิ่ม/ปรับปรุงข้อมูล ไม่ลบแถวเดิม หากมีบัญชีล็อกอินหายไปต้องเชิญหรือสร้างบัญชีใหม่และตั้งรหัสผ่านใหม่' });
    } catch (error) {
      res.status(207).json({ ok: false, partial: true, imported, skipped,
        error: error instanceof Error ? error.message : 'นำเข้าข้อมูลได้บางส่วน กรุณาตรวจรายงานและนำเข้าไฟล์เดิมซ้ำได้' });
    }
  });
  return router;
}

export function backupRawParser() {
  return express.raw({ type: 'application/octet-stream', limit: MAX_BACKUP_BYTES });
}
