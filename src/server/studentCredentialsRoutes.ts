import { createHash } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type EnvReader = (name: string) => string;

const BULK_CREATE_CONCURRENCY = 5;

export type StudentCredentialOperation = 'create' | 'reset' | 'create_all_missing' | 'delete_account';

interface StudentRecord {
  id: string;
  student_id_number: string;
  date_of_birth?: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  avatar_url: string | null;
}

export interface SchoolInitialPasswordOptions {
  defaultPasswordType?: string | null;
  shortIdPasswordPrefix?: string | null;
  dateOfBirth?: string | null;
}

export interface StudentCredential {
  studentIdNumber: string;
  temporaryPassword: string;
  expiresAt: string | null;
}

function formatThaiBirthdatePassword(dateOfBirth?: string | null): string {
  const match = (dateOfBirth || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const yearNum = Number(match[1]);
  if (!Number.isFinite(yearNum) || yearNum < 1900) return '';
  const beYear = yearNum < 2400 ? yearNum + 543 : yearNum;
  return `${match[3]}${match[2]}${beYear}`;
}

export function getStudentInitialPassword(
  studentIdNumber: string,
  options?: SchoolInitialPasswordOptions
): string {
  const rawId = (studentIdNumber || '').trim();
  if (!rawId) return '';
  if (options?.defaultPasswordType === 'birthdate') {
    const dobPassword = formatThaiBirthdatePassword(options.dateOfBirth);
    if (dobPassword.length >= 6) return dobPassword;
  }
  const prefix = (options?.shortIdPasswordPrefix || '').trim();
  if (rawId.length < 6 && prefix) {
    return `${prefix}${rawId}`;
  }
  return rawId;
}

export function formatStudentPasswordPolicyError(
  initialPassword: string,
  rawMessage: string,
  studentIdNumber?: string
): string {
  if (/at least \d+ characters|weak_password|password.*short|minimum length/i.test(rawMessage)) {
    const displayId = (studentIdNumber || initialPassword).trim();
    return `รหัสนักเรียน "${displayId}" (${displayId.length} ตัวอักษร) ใช้เป็นชื่อผู้ใช้ได้ตามปกติ แต่ระบบยืนยันตัวตน (Supabase Auth) กำหนดความยาวรหัสผ่านขั้นต่ำไว้ที่ 6 ตัวอักษร รหัสผ่านเริ่มต้น "${initialPassword}" จึงไม่ผ่านเกณฑ์ — กรุณาตั้ง "คำนำหน้ารหัสผ่านเริ่มต้น" ในแท็บตั้งค่าล็อกอินนักเรียน (เช่น 00 จะได้รหัส 00${displayId}) หรือใช้วันเดือนปีเกิดเป็นรหัสเริ่มต้น หรือปรับ Minimum password length ใน Supabase Auth`;
  }
  return rawMessage;
}

export function getSyntheticStudentEmail(schoolId: string, studentId: string): string {
  const hash = createHash('sha256').update(`${schoolId}:${studentId}`, 'utf8').digest('hex');
  return `student-${hash}@accounts.eduverse.invalid`;
}

export interface StudentCredentialPasswordConfigInput {
  defaultPasswordType?: 'student_id' | 'birthdate' | 'custom' | 'pin';
  shortIdPasswordPrefix?: string;
}

export function validateStudentCredentialPayload(body: unknown):
  | {
      ok: true;
      operation: StudentCredentialOperation;
      schoolId: string;
      studentId: string;
      userId?: string;
      studentIds?: string[];
      passwordConfig?: StudentCredentialPasswordConfigInput;
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be valid JSON.' };
  }
  const record = body as Record<string, unknown>;
  const operation =
    record.operation === 'create' ||
    record.operation === 'reset' ||
    record.operation === 'create_all_missing' ||
    record.operation === 'delete_account'
      ? record.operation
      : null;
  const schoolId = typeof record.schoolId === 'string' ? record.schoolId.trim() : '';
  const studentId = typeof record.studentId === 'string' ? record.studentId.trim() : '';
  const userId = typeof record.userId === 'string' ? record.userId.trim() : '';

  if (!operation || !schoolId || schoolId.length > 128) {
    return { ok: false, error: 'An operation and valid schoolId are required.' };
  }
  if (operation === 'delete_account' && (!userId || userId.length > 128)) {
    return { ok: false, error: 'A valid userId is required for delete_account operations.' };
  }
  if ((operation === 'create' || operation === 'reset') && (!studentId || studentId.length > 128)) {
    return { ok: false, error: 'A valid studentId is required for single-student operations.' };
  }

  let parsedStudentIds: string[] | undefined;
  if (Array.isArray(record.studentIds)) {
    const cleaned = Array.from(
      new Set(
        record.studentIds
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && item.length <= 128)
      )
    );
    if (cleaned.length > 0) {
      parsedStudentIds = cleaned;
    }
  }

  let parsedPasswordConfig: StudentCredentialPasswordConfigInput | undefined;
  if (record.passwordConfig && typeof record.passwordConfig === 'object') {
    const rawCfg = record.passwordConfig as Record<string, unknown>;
    const cfg: StudentCredentialPasswordConfigInput = {};
    if (
      rawCfg.defaultPasswordType === 'student_id' ||
      rawCfg.defaultPasswordType === 'birthdate' ||
      rawCfg.defaultPasswordType === 'custom' ||
      rawCfg.defaultPasswordType === 'pin'
    ) {
      cfg.defaultPasswordType = rawCfg.defaultPasswordType;
    }
    if (typeof rawCfg.shortIdPasswordPrefix === 'string') {
      cfg.shortIdPasswordPrefix = rawCfg.shortIdPasswordPrefix.replace(/\s+/g, '').slice(0, 12);
    }
    if (Object.keys(cfg).length > 0) {
      parsedPasswordConfig = cfg;
    }
  }

  return {
    ok: true,
    operation,
    schoolId,
    studentId,
    ...(userId ? { userId } : {}),
    ...(parsedStudentIds ? { studentIds: parsedStudentIds } : {}),
    ...(parsedPasswordConfig ? { passwordConfig: parsedPasswordConfig } : {}),
  };
}

function getSupabaseServerClients(env: EnvReader, token: string): {
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
} | null {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey =
    env('SUPABASE_ANON_KEY') ||
    env('SUPABASE_PUBLISHABLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY') ||
    env('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    serviceKey;
  if (!url || !anonKey || !serviceKey) return null;

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { userClient, serviceClient };
}

function createAuthEmailLookup(serviceClient: SupabaseClient): () => Promise<Map<string, string>> {
  let cachedPromise: Promise<Map<string, string>> | null = null;
  return () => {
    if (cachedPromise) return cachedPromise;
    cachedPromise = (async () => {
      const map = new Map<string, string>();
      for (let page = 1; page <= 50; page += 1) {
        const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) {
          console.error('[Student Credentials] Could not list auth users for recovery:', error.message);
          break;
        }
        const users = data?.users || [];
        for (const user of users) {
          if (user.email) {
            map.set(user.email.toLowerCase(), user.id);
          }
        }
        if (users.length < 1000) break;
      }
      return map;
    })();
    return cachedPromise;
  };
}

async function createStudentAccount(
  serviceClient: SupabaseClient,
  schoolId: string,
  student: StudentRecord,
  passwordConfig?: { defaultPasswordType?: string | null; shortIdPasswordPrefix?: string | null },
  getAuthEmailIndex?: () => Promise<Map<string, string>>
): Promise<{ credential?: StudentCredential; alreadyExists?: boolean; reason?: string }> {
  const cleanStudentId = (student.student_id_number || '').trim();
  const temporaryPassword = getStudentInitialPassword(cleanStudentId, {
    defaultPasswordType: passwordConfig?.defaultPasswordType,
    shortIdPasswordPrefix: passwordConfig?.shortIdPasswordPrefix,
    dateOfBirth: student.date_of_birth,
  });
  if (!temporaryPassword) {
    return { reason: 'ไม่พบรหัสนักเรียนในทะเบียน จึงไม่สามารถกำหนดรหัสผ่านเริ่มต้นได้' };
  }
  const issuedAt = new Date().toISOString();
  const expiresAt: string | null = null;
  const email = getSyntheticStudentEmail(schoolId, student.id);

  const profileRowPayload = {
    school_id: schoolId,
    role: 'student',
    student_id: student.id,
    full_name_th: [student.first_name_th, student.last_name_th].filter(Boolean).join(' '),
    full_name_en: [student.first_name_en, student.last_name_en].filter(Boolean).join(' '),
    avatar_url: student.avatar_url || '',
    status: 'active',
    must_change_password: true,
    temporary_password_issued_at: issuedAt,
    temporary_password_expires_at: expiresAt,
  };

  const { data: createdAuthUser, error: createUserError } = await serviceClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (createUserError || !createdAuthUser.user) {
    const rawMsg = createUserError?.message || 'Missing user response.';
    const isAlreadyRegistered = /already been registered|already exists|email_exists/i.test(rawMsg);

    if (isAlreadyRegistered && getAuthEmailIndex) {
      const emailIndex = await getAuthEmailIndex();
      const existingAuthUserId = emailIndex.get(email.toLowerCase());
      if (existingAuthUserId) {
        const { data: existingProfile, error: existingProfileErr } = await serviceClient
          .from('user_profiles')
          .select('id, school_id, role, student_id')
          .eq('id', existingAuthUserId)
          .maybeSingle();

        if (existingProfileErr) {
          return { reason: existingProfileErr.message };
        }

        if (existingProfile) {
          if (existingProfile.school_id === schoolId && existingProfile.student_id === student.id) {
            return { alreadyExists: true, reason: 'บัญชีมีอยู่แล้ว' };
          }
          if (existingProfile.school_id === schoolId && existingProfile.role === 'student' && !existingProfile.student_id) {
            const { error: pwdErr } = await serviceClient.auth.admin.updateUserById(existingAuthUserId, {
              password: temporaryPassword,
              email_confirm: true,
            });
            if (pwdErr) {
              return {
                reason: formatStudentPasswordPolicyError(temporaryPassword, pwdErr.message, cleanStudentId),
              };
            }
            const { error: relinkErr } = await serviceClient
              .from('user_profiles')
              .update(profileRowPayload)
              .eq('id', existingAuthUserId);
            if (relinkErr) {
              return { reason: relinkErr.message };
            }
            return {
              credential: {
                studentIdNumber: cleanStudentId,
                temporaryPassword,
                expiresAt,
              },
            };
          }
          return { reason: 'พบบัญชี Auth ที่ใช้อีเมลอ้างอิงเดียวกัน แต่ผูกกับบัญชีอื่นในระบบแล้ว' };
        }

        // Orphan auth user (auth.users exists without user_profiles row): repair & provision profile
        const { error: repairPwdError } = await serviceClient.auth.admin.updateUserById(existingAuthUserId, {
          password: temporaryPassword,
          email_confirm: true,
        });
        if (repairPwdError) {
          return {
            reason: formatStudentPasswordPolicyError(temporaryPassword, repairPwdError.message, cleanStudentId),
          };
        }
        const { error: repairProfileError } = await serviceClient.from('user_profiles').insert({
          id: existingAuthUserId,
          ...profileRowPayload,
        });
        if (repairProfileError) {
          return { reason: repairProfileError.message };
        }
        return {
          credential: {
            studentIdNumber: cleanStudentId,
            temporaryPassword,
            expiresAt,
          },
        };
      }
    }

    const detail = formatStudentPasswordPolicyError(
      temporaryPassword,
      rawMsg,
      cleanStudentId
    );
    console.error(`[Student Credentials] Could not create auth user ${student.id}:`, detail);
    return { reason: detail };
  }

  const accountId = createdAuthUser.user.id;
  const { error: profileError } = await serviceClient.from('user_profiles').insert({
    id: accountId,
    ...profileRowPayload,
  });

  if (profileError) {
    const { error: cleanupError } = await serviceClient.auth.admin.deleteUser(accountId);
    if (cleanupError) {
      console.error(`[Student Credentials] Could not remove orphan auth user ${student.id}:`, cleanupError.message);
    }
    console.error(`[Student Credentials] Could not create student profile ${student.id}:`, profileError.message);
    return { reason: profileError.message };
  }

  return {
    credential: {
      studentIdNumber: cleanStudentId,
      temporaryPassword,
      expiresAt,
    },
  };
}

export function createStudentCredentialsRouter(getEnv: EnvReader) {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'กรุณาเข้าสู่ระบบก่อนจัดการรหัสผ่านนักเรียน',
      });
    }

    const clients = getSupabaseServerClients(getEnv, token);
    if (!clients) {
      return res.status(503).json({
        error: 'STUDENT_CREDENTIALS_SERVER_NOT_CONFIGURED',
        message: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY สำหรับจัดการบัญชีและรหัสผ่านนักเรียน',
      });
    }

    const parsed = validateStudentCredentialPayload(req.body);
    if (parsed.ok === false) {
      return res.status(400).json({ error: 'INVALID_REQUEST', message: parsed.error });
    }
    const { operation, schoolId, studentId, userId, studentIds, passwordConfig } = parsed;

    try {
      const { data: authData, error: authError } = await clients.userClient.auth.getUser(token);
      if (authError || !authData.user) {
        return res.status(401).json({
          error: 'INVALID_SESSION',
          message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
        });
      }

      const { data: actor, error: actorError } = await clients.serviceClient
        .from('user_profiles')
        .select('role, school_id, status')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (actorError) {
        console.error('[Student Credentials] Could not load actor profile:', actorError.message);
        return res.status(500).json({ error: 'ACTOR_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบสิทธิ์ผู้ดูแลได้' });
      }

      let isSchoolAdminTeacher = false;
      if (actor?.status === 'active' && actor.role === 'teacher' && actor.school_id === schoolId && authData.user.email) {
        const { data: teacher } = await clients.serviceClient
          .from('teachers')
          .select('is_school_admin')
          .eq('school_id', schoolId)
          .ilike('email', authData.user.email)
          .maybeSingle();
        isSchoolAdminTeacher = Boolean(teacher?.is_school_admin);
      }

      const isAuthorized =
        actor?.status === 'active' &&
        (actor.role === 'super_admin' ||
          (actor.role === 'admin' && actor.school_id === schoolId) ||
          isSchoolAdminTeacher);

      if (!isAuthorized) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'เฉพาะผู้ดูแลโรงเรียนหรือ Super Admin เท่านั้นที่จัดการบัญชีและรหัสผ่านนักเรียนได้',
        });
      }

      let school: {
        id: string;
        student_login_identifier_type?: string | null;
        student_default_password_type?: string | null;
        student_short_id_password_prefix?: string | null;
      } | null = null;

      const schoolPrimary = await clients.serviceClient
        .from('schools')
        .select('id, student_login_identifier_type, student_default_password_type, student_short_id_password_prefix')
        .eq('id', schoolId)
        .eq('status', 'active')
        .maybeSingle();

      if (schoolPrimary.error && /student_short_id_password_prefix|student_default_password_type|schema cache|42703/i.test(schoolPrimary.error.message)) {
        const schoolFallback = await clients.serviceClient
          .from('schools')
          .select('id, student_login_identifier_type')
          .eq('id', schoolId)
          .eq('status', 'active')
          .maybeSingle();
        if (schoolFallback.error) {
          console.error('[Student Credentials] Could not verify school:', schoolFallback.error.message);
          return res.status(500).json({ error: 'SCHOOL_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบข้อมูลโรงเรียนได้' });
        }
        school = schoolFallback.data;
      } else if (schoolPrimary.error) {
        console.error('[Student Credentials] Could not verify school:', schoolPrimary.error.message);
        return res.status(500).json({ error: 'SCHOOL_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบข้อมูลโรงเรียนได้' });
      } else {
        school = schoolPrimary.data;
      }

      if (!school) {
        return res.status(404).json({ error: 'SCHOOL_NOT_ACTIVE', message: 'ไม่พบโรงเรียนที่เปิดใช้งานอยู่' });
      }
      if (school.student_login_identifier_type === 'email_only') {
        return res.status(409).json({
          error: 'EMAIL_ONLY_MODE',
          message: 'โรงเรียนนี้ตั้งค่าการเข้าสู่ระบบของนักเรียนเป็นแบบอีเมลเท่านั้น กรุณาเปลี่ยนการตั้งค่าก่อนออกรหัสผ่านชั่วคราวด้วยรหัสนักเรียน',
        });
      }

      const schoolPasswordConfig = {
        defaultPasswordType: passwordConfig?.defaultPasswordType || school.student_default_password_type || 'student_id',
        shortIdPasswordPrefix:
          passwordConfig?.shortIdPasswordPrefix !== undefined
            ? passwordConfig.shortIdPasswordPrefix
            : school.student_short_id_password_prefix || '',
      };

      const getAuthEmailIndex = createAuthEmailLookup(clients.serviceClient);

      if (operation === 'delete_account') {
        const { data: targetProfile, error: lookupError } = await clients.serviceClient
          .from('user_profiles')
          .select('id, school_id, role')
          .eq('id', userId!)
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .maybeSingle();
        if (lookupError) {
          console.error('[Student Credentials] Could not look up student profile for deletion:', lookupError.message);
          return res.status(500).json({ error: 'PROFILE_LOOKUP_FAILED', message: 'ไม่สามารถตรวจสอบบัญชีนักเรียนได้' });
        }
        if (!targetProfile) {
          return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'ไม่พบบัญชีนักเรียนนี้ในโรงเรียน' });
        }

        const { error: deleteProfileError } = await clients.serviceClient
          .from('user_profiles')
          .delete()
          .eq('id', userId!)
          .eq('school_id', schoolId)
          .eq('role', 'student');
        if (deleteProfileError) {
          console.error('[Student Credentials] Could not delete student profile:', deleteProfileError.message);
          return res.status(500).json({
            error: 'DELETE_PROFILE_FAILED',
            message: `ไม่สามารถลบโปรไฟล์นักเรียนได้ (${deleteProfileError.message})`,
          });
        }

        const { error: deleteAuthError } = await clients.serviceClient.auth.admin.deleteUser(userId!);
        if (deleteAuthError && !/not found|user_not_found/i.test(deleteAuthError.message)) {
          console.error('[Student Credentials] Could not delete backing auth user:', deleteAuthError.message);
          return res.status(500).json({
            error: 'DELETE_AUTH_USER_FAILED',
            message: `ลบโปรไฟล์แล้ว แต่ไม่สามารถลบบัญชี Auth ได้ (${deleteAuthError.message})`,
          });
        }

        return res.json({ deleted: true, userId });
      }

      if (operation === 'create_all_missing') {
        const studentColumns =
          'id, student_id_number, date_of_birth, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url';
        const students: StudentRecord[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await clients.serviceClient
            .from('students')
            .select(studentColumns)
            .eq('school_id', schoolId)
            .in('status', ['active', 'transferred_in'])
            .order('id')
            .range(offset, offset + 499);
          if (error) {
            console.error('[Student Credentials] Could not load active students:', error.message);
            return res.status(500).json({ error: 'ROSTER_LOAD_FAILED', message: 'ไม่สามารถโหลดรายชื่อนักเรียนที่กำลังศึกษาได้' });
          }
          const page = (data || []) as StudentRecord[];
          students.push(...page);
          if (page.length < 500) break;
        }

        const existingStudentIds = new Set<string>();
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await clients.serviceClient
            .from('user_profiles')
            .select('student_id')
            .eq('school_id', schoolId)
            .eq('role', 'student')
            .not('student_id', 'is', null)
            .range(offset, offset + 499);
          if (error) {
            console.error('[Student Credentials] Could not check existing accounts:', error.message);
            return res.status(500).json({ error: 'ACCOUNT_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบบัญชีนักเรียนที่มีอยู่ได้' });
          }
          const page = data || [];
          for (const profile of page) {
            if (typeof profile.student_id === 'string') existingStudentIds.add(profile.student_id);
          }
          if (page.length < 500) break;
        }

        const pendingInvitationStudentIds = new Set<string>();
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await clients.serviceClient
            .from('student_account_invitations')
            .select('student_id')
            .eq('school_id', schoolId)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .not('student_id', 'is', null)
            .range(offset, offset + 499);
          if (error) {
            console.error('[Student Credentials] Could not check pending invitations:', error.message);
            return res.status(500).json({ error: 'INVITATION_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบคำเชิญนักเรียนที่ค้างอยู่ได้' });
          }
          const page = data || [];
          for (const invitation of page) {
            if (typeof invitation.student_id === 'string') pendingInvitationStudentIds.add(invitation.student_id);
          }
          if (page.length < 500) break;
        }

        const skipped: Array<{ studentIdNumber: string; reason: string }> = [];
        const eligibleStudents: StudentRecord[] = [];
        const studentNumberCounts = new Map<string, number>();
        for (const student of students) {
          const normalizedNumber = (student.student_id_number || '').trim().toLowerCase();
          if (normalizedNumber) {
            studentNumberCounts.set(normalizedNumber, (studentNumberCounts.get(normalizedNumber) || 0) + 1);
          }
        }

        const requestedStudentIdSet = studentIds?.length ? new Set(studentIds) : null;
        const targetStudents = requestedStudentIdSet
          ? students.filter((student) => requestedStudentIdSet.has(student.id))
          : students;

        for (const student of targetStudents) {
          const normalizedNumber = (student.student_id_number || '').trim().toLowerCase();
          if (!normalizedNumber) {
            skipped.push({ studentIdNumber: '(ไม่ระบุ)', reason: 'ไม่มีรหัสนักเรียนในทะเบียน' });
          } else if ((studentNumberCounts.get(normalizedNumber) || 0) > 1) {
            skipped.push({ studentIdNumber: student.student_id_number, reason: 'รหัสนักเรียนซ้ำในทะเบียน' });
          } else if (existingStudentIds.has(student.id)) {
            skipped.push({ studentIdNumber: student.student_id_number, reason: 'บัญชีมีอยู่แล้ว' });
          } else if (pendingInvitationStudentIds.has(student.id)) {
            skipped.push({ studentIdNumber: student.student_id_number, reason: 'มีคำเชิญทางอีเมลที่ยังไม่หมดอายุ' });
          } else {
            eligibleStudents.push(student);
          }
        }

        const created: StudentCredential[] = [];
        const failed: Array<{ studentIdNumber: string; reason: string }> = [];
        for (let offset = 0; offset < eligibleStudents.length; offset += BULK_CREATE_CONCURRENCY) {
          const batch = eligibleStudents.slice(offset, offset + BULK_CREATE_CONCURRENCY);
          const results = await Promise.all(
            batch.map(async (student) => {
              try {
                const result = await createStudentAccount(
                  clients.serviceClient,
                  schoolId,
                  student,
                  schoolPasswordConfig,
                  getAuthEmailIndex
                );
                if (result.credential) return { credential: result.credential };
                if (result.alreadyExists) {
                  return {
                    skipped: {
                      studentIdNumber: student.student_id_number,
                      reason: result.reason || 'บัญชีมีอยู่แล้ว',
                    },
                  };
                }
                return {
                  failure: {
                    studentIdNumber: student.student_id_number,
                    reason: result.reason || 'สร้างบัญชีไม่สำเร็จ กรุณาตรวจสอบและลองใหม่',
                  },
                };
              } catch (err) {
                console.error(`[Student Credentials] Unexpected bulk error for ${student.id}:`, err);
                return {
                  failure: {
                    studentIdNumber: student.student_id_number,
                    reason: 'เกิดข้อผิดพลาดระหว่างสร้างบัญชี กรุณาลองใหม่',
                  },
                };
              }
            })
          );
          for (const item of results) {
            if (item.credential) created.push(item.credential);
            else if (item.skipped) skipped.push(item.skipped);
            else if (item.failure) failed.push(item.failure);
          }
        }

        return res.json({ created, skipped, failed, appliedStudentIdsFilter: Boolean(requestedStudentIdSet) });
      }

      const { data: student, error: studentError } = await clients.serviceClient
        .from('students')
        .select('id, school_id, student_id_number, date_of_birth, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .maybeSingle();
      if (studentError) {
        console.error('[Student Credentials] Could not verify target student:', studentError.message);
        return res.status(500).json({ error: 'STUDENT_LOOKUP_FAILED', message: 'ไม่สามารถตรวจสอบข้อมูลนักเรียนได้' });
      }
      if (!student) {
        return res.status(404).json({ error: 'STUDENT_NOT_FOUND', message: 'ไม่พบระเบียนนักเรียนในโรงเรียนนี้' });
      }

      if (operation === 'create') {
        if (!getStudentInitialPassword(student.student_id_number)) {
          return res.status(400).json({
            error: 'STUDENT_ID_NUMBER_REQUIRED',
            message: 'นักเรียนคนนี้ยังไม่มีรหัสนักเรียนในทะเบียน จึงไม่สามารถตั้งรหัสผ่านเริ่มต้นได้',
          });
        }
        const { data: existingProfile, error: existingProfileError } = await clients.serviceClient
          .from('user_profiles')
          .select('id')
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .eq('student_id', studentId)
          .maybeSingle();
        if (existingProfileError) {
          console.error('[Student Credentials] Could not check existing student profile:', existingProfileError.message);
          return res.status(500).json({ error: 'PROFILE_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบบัญชีนักเรียนเดิมได้' });
        }
        if (existingProfile) {
          return res.status(409).json({ error: 'ACCOUNT_EXISTS', message: 'นักเรียนคนนี้มีบัญชีเข้าสู่ระบบอยู่แล้ว' });
        }

        const { data: pendingInvitations, error: invitationError } = await clients.serviceClient
          .from('student_account_invitations')
          .select('id')
          .eq('school_id', schoolId)
          .eq('student_id', studentId)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .limit(1);
        if (invitationError) {
          console.error('[Student Credentials] Could not check pending invitations:', invitationError.message);
          return res.status(500).json({ error: 'INVITATION_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบคำเชิญนักเรียนที่ค้างอยู่ได้' });
        }
        if (pendingInvitations?.length) {
          return res.status(409).json({
            error: 'INVITATION_PENDING',
            message: 'นักเรียนคนนี้มีคำเชิญทางอีเมลที่ยังไม่หมดอายุอยู่ กรุณารอหมดอายุก่อนออกรหัสผ่านเริ่มต้น',
          });
        }

        const result = await createStudentAccount(
          clients.serviceClient,
          schoolId,
          student as StudentRecord,
          schoolPasswordConfig,
          getAuthEmailIndex
        );
        if (result.alreadyExists) {
          return res.status(409).json({ error: 'ACCOUNT_EXISTS', message: 'นักเรียนคนนี้มีบัญชีเข้าสู่ระบบอยู่แล้ว' });
        }
        if (!result.credential) {
          return res.status(500).json({
            error: 'CREATE_ACCOUNT_FAILED',
            message: result.reason
              ? `สร้างบัญชีนักเรียนไม่สำเร็จ (${result.reason})`
              : 'ไม่สามารถสร้างบัญชีนักเรียนได้ กรุณาตรวจสอบ migration 20261120_student_temporary_credentials.sql',
          });
        }
        return res.json(result.credential);
      }

      // operation === 'reset'
      const { data: profile, error: profileError } = await clients.serviceClient
        .from('user_profiles')
        .select('id, status, must_change_password, temporary_password_issued_at, temporary_password_expires_at')
        .eq('school_id', schoolId)
        .eq('role', 'student')
        .eq('student_id', studentId)
        .maybeSingle();
      if (profileError) {
        console.error('[Student Credentials] Could not locate student profile for reset:', profileError.message);
        return res.status(500).json({
          error: 'PROFILE_LOOKUP_FAILED',
          message: `ไม่สามารถค้นหาบัญชีนักเรียนได้ (${profileError.message})`,
        });
      }
      if (!profile) {
        return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'นักเรียนคนนี้ยังไม่มีบัญชีล็อกอินที่ผูกไว้' });
      }
      if (profile.status !== 'active') {
        return res.status(409).json({
          error: 'ACCOUNT_NOT_ACTIVE',
          message: 'กรุณาอนุมัติเปิดใช้งานบัญชีนักเรียนก่อนรีเซ็ตรหัสผ่านเป็นรหัสนักเรียน',
        });
      }

      const cleanStudentId = (student.student_id_number || '').trim();
      const temporaryPassword = getStudentInitialPassword(cleanStudentId, {
        ...schoolPasswordConfig,
        dateOfBirth: (student as StudentRecord).date_of_birth,
      });
      if (!temporaryPassword) {
        return res.status(400).json({
          error: 'STUDENT_ID_NUMBER_REQUIRED',
          message: 'นักเรียนคนนี้ยังไม่มีรหัสนักเรียนในทะเบียน จึงไม่สามารถรีเซ็ตรหัสผ่านเริ่มต้นได้',
        });
      }
      const issuedAt = new Date().toISOString();
      const expiresAt: string | null = null;

      const { error: profileUpdateError } = await clients.serviceClient
        .from('user_profiles')
        .update({
          must_change_password: true,
          temporary_password_issued_at: issuedAt,
          temporary_password_expires_at: expiresAt,
        })
        .eq('id', profile.id)
        .eq('school_id', schoolId);

      if (profileUpdateError) {
        console.error('[Student Credentials] Could not update profile for password reset:', profileUpdateError.message);
        return res.status(500).json({
          error: 'PROFILE_UPDATE_FAILED',
          message: `ไม่สามารถเตรียมบัญชีสำหรับการรีเซ็ตรหัสผ่านได้ (${profileUpdateError.message})`,
        });
      }

      const { error: passwordUpdateError } = await clients.serviceClient.auth.admin.updateUserById(profile.id, {
        password: temporaryPassword,
      });

      if (passwordUpdateError) {
        const { error: rollbackError } = await clients.serviceClient
          .from('user_profiles')
          .update({
            must_change_password: profile.must_change_password,
            temporary_password_issued_at: profile.temporary_password_issued_at,
            temporary_password_expires_at: profile.temporary_password_expires_at,
          })
          .eq('id', profile.id)
          .eq('school_id', schoolId);
        if (rollbackError) {
          console.error('[Student Credentials] Could not rollback student profile after reset failure:', rollbackError.message);
        }
        const detail = formatStudentPasswordPolicyError(
          temporaryPassword,
          passwordUpdateError.message,
          cleanStudentId
        );
        console.error('[Student Credentials] Could not reset student password:', detail);
        return res.status(500).json({
          error: 'PASSWORD_RESET_FAILED',
          message: `ไม่สามารถรีเซ็ตรหัสผ่านในระบบ Auth ได้ (${detail})`,
        });
      }

      return res.json({
        studentIdNumber: cleanStudentId,
        temporaryPassword,
        expiresAt,
      });
    } catch (err) {
      console.error('[Student Credentials] Unexpected error:', err instanceof Error ? err.message : String(err));
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'เกิดข้อผิดพลาดระหว่างจัดการบัญชี/รหัสผ่านนักเรียน',
      });
    }
  });

  return router;
}
