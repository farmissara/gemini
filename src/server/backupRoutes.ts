import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

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
  'arcade_player_profiles', 'arcade_reward_redemptions', 'attendance', 'audit_logs',
  'courses', 'grades', 'homework_submissions', 'invoices', 'learning_indicator_sets',
  'learning_indicators', 'leave_requests', 'parent_notifications', 'parent_student_links',
  'period_attendance', 'school_assignments', 'school_campus_gates', 'school_exam_entitlements',
  'school_lesson_completions', 'school_lms_lessons', 'school_package_orders',
  'school_period_times', 'school_questions', 'school_student_records',
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
  'moe_standard_catalog', 'package_catalog', 'school_period_times', 'learning_indicator_sets',
  'learning_indicators', 'school_questions', 'school_lms_lessons',
  'school_campus_gates', 'school_exam_entitlements', 'school_package_orders',
  'school_student_records', 'student_account_invitations', 'staff_parent_invitations',
  'parent_student_links', 'parent_notification_preferences', 'announcements', 'timetable_slots',
  'school_assignments', 'attendance', 'period_attendance', 'grades', 'homework_submissions',
  'leave_requests', 'invoices', 'student_career_quests', 'student_learning_indicator_scores',
  'arcade_player_profiles', 'arcade_custom_rewards', 'arcade_reward_redemptions',
  'admin_coordination_messages', 'parent_notifications', 'audit_logs', 'super_admin_settings',
];
const OMITTED_TABLES: Record<string, string> = {
  parent_push_subscriptions: 'มี endpoint และกุญแจ push ที่เป็นข้อมูลรับรองเฉพาะอุปกรณ์ จึงไม่ส่งออก/นำเข้าข้ามระบบ',
};
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const PAGE_SIZE = 500;

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
    if (error) throw new Error(`${table}: ${error.message}`);
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
    if (error) throw new Error(`user_profiles: ${error.message}`);
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

async function buildBackup(access: Access, scope: { type: 'system' | 'school'; schoolId: string | null }, url: string) {
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  const profileIds = scope.type === 'school' && scope.schoolId
    ? await getSchoolProfileIds(access.admin, scope.schoolId)
    : [];
  for (const table of RESTORE_ORDER) {
    if (table === 'super_admin_settings' && scope.type !== 'system') continue;
    if (REFERENCE_TABLES.includes(table as (typeof REFERENCE_TABLES)[number]) && scope.type !== 'system') continue;
    let rows: unknown[];
    if (table === 'schools') {
      rows = await selectAll(access.admin, table, (query) => scope.schoolId ? query.eq('id', scope.schoolId) : query);
    } else if (table === 'user_profiles') {
      rows = await selectAll(access.admin, table, (query) => scope.schoolId ? query.eq('school_id', scope.schoolId) : query);
    } else if (table === 'parent_notification_preferences') {
      rows = profileIds.length
        ? await selectAll(access.admin, table, (query) => query.in('profile_id', profileIds))
        : scope.type === 'system' ? await selectAll(access.admin, table, (query) => query) : [];
    } else if ((DIRECT_SCHOOL_TABLES as readonly string[]).includes(table)) {
      rows = await selectAll(access.admin, table, (query) => scope.schoolId ? query.eq('school_id', scope.schoolId) : query);
    } else if ((REFERENCE_TABLES as readonly string[]).includes(table)) {
      rows = await selectAll(access.admin, table, (query) => query);
    } else if ((SYSTEM_ONLY_TABLES as readonly string[]).includes(table)) {
      rows = await selectAll(access.admin, table, (query) => query);
    } else continue;
    tables[table] = rows;
    counts[table] = rows.length;
  }
  const ids = new Set((tables.user_profiles || []).map((row: any) => String(row.id)));
  const authUsers = await listAuthUsers(access.admin);
  const accounts = authUsers.filter((user) => scope.type === 'system' || ids.has(user.id)).map((user) => {
    const profile = (tables.user_profiles || []).find((row: any) => row.id === user.id) as any;
    return safeAccount(user, profile?.role);
  });
  const projectRef = new URL(url).hostname.split('.')[0];
  return {
    format: 'baanpakkru-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceProject: projectRef,
    scope,
    tables,
    accounts,
    counts: { ...counts, login_accounts: accounts.length },
    exclusions: OMITTED_TABLES,
    security: { passwordsIncluded: false, restoreMode: 'merge-only' },
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
  return { type: scope.type as 'school' | 'system', schoolId: allowedSchoolId };
}

export function createBackupRouter(getEnv: EnvReader) {
  const router = Router();
  router.get('/', async (req: Request, res: Response) => {
    const access = await resolveAccess(req, res, getEnv);
    if (!access) return;
    const scope = determineScope(access, new URLSearchParams(req.query as Record<string, string>), res);
    if (!scope) return;
    const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
    try {
      const backup = await buildBackup(access, scope, url);
      const filenameScope = scope.type === 'system' ? 'system' : String(scope.schoolId).replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="baanpakkru-backup-${filenameScope}-${new Date().toISOString().slice(0, 10)}.json"`);
      res.setHeader('Cache-Control', 'no-store');
      res.send(JSON.stringify(backup));
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
    try {
      for (const table of RESTORE_ORDER) {
        const sourceRows = backup.tables[table] as any[] | undefined;
        if (!sourceRows?.length) continue;
        let rows = sourceRows;
        if (table === 'user_profiles') {
          const authUsers = await listAuthUsers(access.admin);
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
      const sourceAccounts = Array.isArray(backup.accounts) ? backup.accounts : [];
      const existingAuth = await listAuthUsers(access.admin);
      const existingEmails = new Set(existingAuth.map((user) => (user.email || '').toLowerCase()).filter(Boolean));
      const missingAccounts = sourceAccounts.filter((account: any) => account.email && !existingEmails.has(String(account.email).toLowerCase())).map((account: any) => ({
        email: account.email, role: account.role || null,
      }));
      res.json({ ok: true, imported, skipped, missingAccounts, passwordsIncluded: false,
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
