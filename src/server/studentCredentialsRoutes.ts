import { createHash } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type EnvReader = (name: string) => string;

const BULK_CREATE_CONCURRENCY = 5;

export type StudentCredentialOperation = 'create' | 'reset' | 'create_all_missing';

interface StudentRecord {
  id: string;
  student_id_number: string;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  avatar_url: string | null;
}

export interface StudentCredential {
  studentIdNumber: string;
  temporaryPassword: string;
  expiresAt: string | null;
}

export function getStudentInitialPassword(studentIdNumber: string): string {
  return (studentIdNumber || '').trim();
}

export function formatStudentPasswordPolicyError(initialPassword: string, rawMessage: string): string {
  if (/at least \d+ characters|weak_password|password.*short|minimum length/i.test(rawMessage)) {
    return `รหัสนักเรียน "${initialPassword}" มีความยาว ${initialPassword.length} ตัวอักษร ซึ่งสั้นกว่าเกณฑ์ขั้นต่ำของระบบยืนยันตัวตน (6 ตัวอักษร) กรุณาปรับรหัสนักเรียนให้ยาวอย่างน้อย 6 ตัวอักษร หรือปรับ Password minimum length ใน Supabase Auth`;
  }
  return rawMessage;
}

export function getSyntheticStudentEmail(schoolId: string, studentId: string): string {
  const hash = createHash('sha256').update(`${schoolId}:${studentId}`, 'utf8').digest('hex');
  return `student-${hash}@accounts.eduverse.invalid`;
}

export function validateStudentCredentialPayload(body: unknown):
  | { ok: true; operation: StudentCredentialOperation; schoolId: string; studentId: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be valid JSON.' };
  }
  const record = body as Record<string, unknown>;
  const operation =
    record.operation === 'create' || record.operation === 'reset' || record.operation === 'create_all_missing'
      ? record.operation
      : null;
  const schoolId = typeof record.schoolId === 'string' ? record.schoolId.trim() : '';
  const studentId = typeof record.studentId === 'string' ? record.studentId.trim() : '';

  if (!operation || !schoolId || schoolId.length > 128) {
    return { ok: false, error: 'An operation and valid schoolId are required.' };
  }
  if (operation !== 'create_all_missing' && (!studentId || studentId.length > 128)) {
    return { ok: false, error: 'A valid studentId is required for single-student operations.' };
  }
  return { ok: true, operation, schoolId, studentId };
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

async function createStudentAccount(
  serviceClient: SupabaseClient,
  schoolId: string,
  student: StudentRecord
): Promise<{ credential?: StudentCredential; reason?: string }> {
  const temporaryPassword = getStudentInitialPassword(student.student_id_number);
  if (!temporaryPassword) {
    return { reason: 'ไม่พบรหัสนักเรียนในทะเบียน จึงไม่สามารถกำหนดรหัสผ่านเริ่มต้นได้' };
  }
  const issuedAt = new Date().toISOString();
  const expiresAt: string | null = null;
  const email = getSyntheticStudentEmail(schoolId, student.id);

  const { data: createdAuthUser, error: createUserError } = await serviceClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  });
  if (createUserError || !createdAuthUser.user) {
    const detail = formatStudentPasswordPolicyError(
      temporaryPassword,
      createUserError?.message || 'Missing user response.'
    );
    console.error(`[Student Credentials] Could not create auth user ${student.id}:`, detail);
    return { reason: detail };
  }

  const accountId = createdAuthUser.user.id;
  const { error: profileError } = await serviceClient.from('user_profiles').insert({
    id: accountId,
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
      studentIdNumber: temporaryPassword,
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
    const { operation, schoolId, studentId } = parsed;

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

      const { data: school, error: schoolError } = await clients.serviceClient
        .from('schools')
        .select('id, student_login_identifier_type')
        .eq('id', schoolId)
        .eq('status', 'active')
        .maybeSingle();
      if (schoolError) {
        console.error('[Student Credentials] Could not verify school:', schoolError.message);
        return res.status(500).json({ error: 'SCHOOL_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบข้อมูลโรงเรียนได้' });
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

      if (operation === 'create_all_missing') {
        const studentColumns =
          'id, student_id_number, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url';
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

        for (const student of students) {
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
                const result = await createStudentAccount(clients.serviceClient, schoolId, student);
                if (result.credential) return { credential: result.credential };
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
            else if (item.failure) failed.push(item.failure);
          }
        }

        return res.json({ created, skipped, failed });
      }

      const { data: student, error: studentError } = await clients.serviceClient
        .from('students')
        .select('id, school_id, student_id_number, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url')
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

        const result = await createStudentAccount(clients.serviceClient, schoolId, student as StudentRecord);
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

      const temporaryPassword = getStudentInitialPassword(student.student_id_number);
      if (!temporaryPassword) {
        return res.status(400).json({
          error: 'STUDENT_ID_NUMBER_REQUIRED',
          message: 'นักเรียนคนนี้ยังไม่มีรหัสนักเรียนในทะเบียน จึงไม่สามารถรีเซ็ตรหัสผ่านเป็นรหัสนักเรียนได้',
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
        const detail = formatStudentPasswordPolicyError(temporaryPassword, passwordUpdateError.message);
        console.error('[Student Credentials] Could not reset student password:', detail);
        return res.status(500).json({
          error: 'PASSWORD_RESET_FAILED',
          message: `ไม่สามารถรีเซ็ตรหัสผ่านในระบบ Auth ได้ (${detail})`,
        });
      }

      return res.json({
        studentIdNumber: temporaryPassword,
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
