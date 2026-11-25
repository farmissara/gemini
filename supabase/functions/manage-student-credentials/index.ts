import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BULK_CREATE_CONCURRENCY = 5;

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

interface StudentCredential {
  studentIdNumber: string;
  temporaryPassword: string;
  expiresAt: string | null;
}

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatThaiBirthdatePassword(dateOfBirth?: string | null): string {
  const match = (dateOfBirth || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const yearNum = Number(match[1]);
  if (!Number.isFinite(yearNum) || yearNum < 1900) return '';
  const beYear = yearNum < 2400 ? yearNum + 543 : yearNum;
  return `${match[3]}${match[2]}${beYear}`;
}

function getStudentInitialPassword(
  studentIdNumber: string,
  options?: { defaultPasswordType?: string | null; shortIdPasswordPrefix?: string | null; dateOfBirth?: string | null }
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

function formatStudentPasswordPolicyError(initialPassword: string, rawMessage: string, studentIdNumber?: string): string {
  if (/at least \d+ characters|weak_password|password.*short|minimum length/i.test(rawMessage)) {
    const displayId = (studentIdNumber || initialPassword).trim();
    return `รหัสนักเรียน "${displayId}" (${displayId.length} ตัวอักษร) ใช้เป็นชื่อผู้ใช้ได้ตามปกติ แต่ระบบยืนยันตัวตน (Supabase Auth) กำหนดความยาวรหัสผ่านขั้นต่ำไว้ที่ 6 ตัวอักษร รหัสผ่านเริ่มต้น "${initialPassword}" จึงไม่ผ่านเกณฑ์ — กรุณาตั้ง "คำนำหน้ารหัสผ่านเริ่มต้น" ในแท็บตั้งค่าล็อกอินนักเรียน (เช่น 00 จะได้รหัส 00${displayId}) หรือใช้วันเดือนปีเกิดเป็นรหัสเริ่มต้น หรือปรับ Minimum password length ใน Supabase Auth`;
  }
  return rawMessage;
}

async function getSyntheticStudentEmail(schoolId: string, studentId: string): Promise<string> {
  const input = new TextEncoder().encode(`${schoolId}:${studentId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `student-${hash}@accounts.eduverse.invalid`;
}

function createAuthEmailLookup(serviceClient: ReturnType<typeof createClient>): () => Promise<Map<string, string>> {
  let cachedPromise: Promise<Map<string, string>> | null = null;
  return () => {
    if (cachedPromise) return cachedPromise;
    cachedPromise = (async () => {
      const map = new Map<string, string>();
      for (let page = 1; page <= 50; page += 1) {
        const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) {
          console.error('Could not list auth users for recovery:', error.message);
          break;
        }
        const users = data?.users || [];
        for (const user of users) {
          if (user.email) map.set(user.email.toLowerCase(), user.id);
        }
        if (users.length < 1000) break;
      }
      return map;
    })();
    return cachedPromise;
  };
}

async function createStudentAccount(
  serviceClient: ReturnType<typeof createClient>,
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
    return { reason: 'ไม่มีรหัสนักเรียนในทะเบียน' };
  }
  const issuedAt = new Date().toISOString();
  const expiresAt: string | null = null;
  const email = await getSyntheticStudentEmail(schoolId, student.id);
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

        if (existingProfileErr) return { reason: existingProfileErr.message };

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
              return { reason: formatStudentPasswordPolicyError(temporaryPassword, pwdErr.message, cleanStudentId) };
            }
            const { error: relinkErr } = await serviceClient
              .from('user_profiles')
              .update(profileRowPayload)
              .eq('id', existingAuthUserId);
            if (relinkErr) return { reason: relinkErr.message };
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

        const { error: repairPwdErr } = await serviceClient.auth.admin.updateUserById(existingAuthUserId, {
          password: temporaryPassword,
          email_confirm: true,
        });
        if (repairPwdErr) {
          return { reason: formatStudentPasswordPolicyError(temporaryPassword, repairPwdErr.message, cleanStudentId) };
        }
        const { error: repairProfileErr } = await serviceClient.from('user_profiles').insert({
          id: existingAuthUserId,
          ...profileRowPayload,
        });
        if (repairProfileErr) return { reason: repairProfileErr.message };
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
    console.error(`Could not create student auth user ${student.id}:`, detail);
    return { reason: detail };
  }

  const accountId = createdAuthUser.user.id;
  const { error: profileError } = await serviceClient.from('user_profiles').insert({
    id: accountId,
    ...profileRowPayload,
  });
  if (profileError) {
    const { error: cleanupError } = await serviceClient.auth.admin.deleteUser(accountId);
    if (cleanupError) console.error(`Could not remove orphan student auth user ${student.id}:`, cleanupError.message);
    console.error(`Could not create student profile ${student.id}:`, profileError.message);
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return respond(401, { error: 'Sign in before managing student credentials.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ||
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
    serviceRoleKey;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase environment configuration for manage-student-credentials.');
    return respond(500, { error: 'Student credential management is not configured.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'Your session is invalid or expired.' });

  let payload: {
    operation?: unknown;
    schoolId?: unknown;
    studentId?: unknown;
    studentIds?: unknown;
    passwordConfig?: { defaultPasswordType?: unknown; shortIdPasswordPrefix?: unknown };
  };
  try {
    payload = await request.json();
  } catch {
    return respond(400, { error: 'Request body must be valid JSON.' });
  }

  const operation =
    payload.operation === 'create' || payload.operation === 'reset' || payload.operation === 'create_all_missing'
      ? payload.operation
      : null;
  const schoolId = typeof payload.schoolId === 'string' ? payload.schoolId.trim() : '';
  const studentId = typeof payload.studentId === 'string' ? payload.studentId.trim() : '';
  const studentIds = Array.isArray(payload.studentIds)
    ? Array.from(
        new Set(
          payload.studentIds
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0 && item.length <= 128)
        )
      )
    : [];
  const requestedPasswordType =
    payload.passwordConfig &&
    (payload.passwordConfig.defaultPasswordType === 'student_id' ||
      payload.passwordConfig.defaultPasswordType === 'birthdate' ||
      payload.passwordConfig.defaultPasswordType === 'custom' ||
      payload.passwordConfig.defaultPasswordType === 'pin')
      ? payload.passwordConfig.defaultPasswordType
      : undefined;
  const requestedShortPrefix =
    payload.passwordConfig && typeof payload.passwordConfig.shortIdPasswordPrefix === 'string'
      ? payload.passwordConfig.shortIdPasswordPrefix.replace(/\s+/g, '').slice(0, 12)
      : undefined;

  if (!operation || !schoolId || (operation !== 'create_all_missing' && !studentId)) {
    return respond(400, { error: 'An operation and school are required; single-student operations also require a student.' });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: actor, error: actorError } = await serviceClient
    .from('user_profiles')
    .select('role, school_id, status')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (actorError) {
    console.error('Could not load student credential manager profile:', actorError.message);
    return respond(500, { error: 'Could not verify your school role.' });
  }
  let isSchoolAdminTeacher = false;
  if (actor?.status === 'active' && actor.role === 'teacher' && actor.school_id === schoolId && authData.user.email) {
    const { data: teacher } = await serviceClient
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
    return respond(403, { error: 'Only an active school administrator can manage student credentials.' });
  }

  let school: {
    id: string;
    student_login_identifier_type?: string | null;
    student_default_password_type?: string | null;
    student_short_id_password_prefix?: string | null;
  } | null = null;

  const schoolPrimary = await serviceClient
    .from('schools')
    .select('id, student_login_identifier_type, student_default_password_type, student_short_id_password_prefix')
    .eq('id', schoolId)
    .eq('status', 'active')
    .maybeSingle();

  if (schoolPrimary.error && /student_short_id_password_prefix|student_default_password_type|schema cache|42703/i.test(schoolPrimary.error.message)) {
    const schoolFallback = await serviceClient
      .from('schools')
      .select('id, student_login_identifier_type')
      .eq('id', schoolId)
      .eq('status', 'active')
      .maybeSingle();
    if (schoolFallback.error) {
      console.error('Could not verify student credential school:', schoolFallback.error.message);
      return respond(500, { error: 'Could not verify the school.' });
    }
    school = schoolFallback.data;
  } else if (schoolPrimary.error) {
    console.error('Could not verify student credential school:', schoolPrimary.error.message);
    return respond(500, { error: 'Could not verify the school.' });
  } else {
    school = schoolPrimary.data;
  }

  if (!school) return respond(404, { error: 'The school is not active.' });
  if (school.student_login_identifier_type === 'email_only') {
    return respond(409, { error: 'This school is configured for email-only student sign-in. Change the login setting before creating student-ID accounts.' });
  }

  const schoolPasswordConfig = {
    defaultPasswordType: requestedPasswordType || school.student_default_password_type || 'student_id',
    shortIdPasswordPrefix:
      requestedShortPrefix !== undefined ? requestedShortPrefix : school.student_short_id_password_prefix || '',
  };

  const getAuthEmailIndex = createAuthEmailLookup(serviceClient);

  if (operation === 'create_all_missing') {
    const studentColumns = 'id, student_id_number, date_of_birth, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url';
    const students: StudentRecord[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await serviceClient
        .from('students')
        .select(studentColumns)
        .eq('school_id', schoolId)
        .in('status', ['active', 'transferred_in'])
        .order('id')
        .range(offset, offset + 499);
      if (error) {
        console.error('Could not load active students for bulk account creation:', error.message);
        return respond(500, { error: 'Could not load the active student roster.' });
      }
      const page = (data || []) as StudentRecord[];
      students.push(...page);
      if (page.length < 500) break;
    }

    const existingStudentIds = new Set<string>();
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await serviceClient
        .from('user_profiles')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('role', 'student')
        .not('student_id', 'is', null)
        .range(offset, offset + 499);
      if (error) {
        console.error('Could not load existing student accounts for bulk creation:', error.message);
        return respond(500, { error: 'Could not check existing student accounts.' });
      }
      const page = data || [];
      for (const profile of page) {
        if (typeof profile.student_id === 'string') existingStudentIds.add(profile.student_id);
      }
      if (page.length < 500) break;
    }

    const pendingInvitationStudentIds = new Set<string>();
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await serviceClient
        .from('student_account_invitations')
        .select('student_id')
        .eq('school_id', schoolId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .not('student_id', 'is', null)
        .range(offset, offset + 499);
      if (error) {
        console.error('Could not load pending student invitations for bulk creation:', error.message);
        return respond(500, { error: 'Could not check pending student invitations.' });
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
      const normalizedNumber = student.student_id_number.trim().toLowerCase();
      if (normalizedNumber) {
        studentNumberCounts.set(normalizedNumber, (studentNumberCounts.get(normalizedNumber) || 0) + 1);
      }
    }

    const requestedStudentIdSet = studentIds.length > 0 ? new Set(studentIds) : null;
    const targetStudents = requestedStudentIdSet
      ? students.filter((student) => requestedStudentIdSet.has(student.id))
      : students;

    for (const student of targetStudents) {
      const normalizedNumber = student.student_id_number.trim().toLowerCase();
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
      const results = await Promise.all(batch.map(async (student) => {
        try {
          const result = await createStudentAccount(serviceClient, schoolId, student, schoolPasswordConfig, getAuthEmailIndex);
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
        } catch (error) {
          console.error(`Unexpected error creating student account ${student.id}:`, error);
          return { failure: { studentIdNumber: student.student_id_number, reason: 'เกิดข้อผิดพลาดระหว่างสร้างบัญชี กรุณาลองใหม่' } };
        }
      }));
      for (const result of results) {
        if (result.credential) created.push(result.credential);
        else if (result.skipped) skipped.push(result.skipped);
        else if (result.failure) failed.push(result.failure);
      }
    }

    return respond(200, {
      created,
      skipped,
      failed,
      appliedStudentIdsFilter: Boolean(requestedStudentIdSet),
    });
  }

  const { data: student, error: studentError } = await serviceClient
    .from('students')
    .select('id, school_id, student_id_number, date_of_birth, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .maybeSingle();
  if (studentError) {
    console.error('Could not verify target student:', studentError.message);
    return respond(500, { error: 'Could not verify the student record.' });
  }
  if (!student) return respond(404, { error: 'The student record does not belong to this school.' });

  if (operation === 'create') {
    const { data: existingProfile, error: existingProfileError } = await serviceClient
      .from('user_profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .eq('student_id', studentId)
      .maybeSingle();
    if (existingProfileError) {
      console.error('Could not check existing student profile:', existingProfileError.message);
      return respond(500, { error: 'Could not check for an existing student account.' });
    }
    if (existingProfile) return respond(409, { error: 'This student already has an account.' });

    const { data: pendingInvitations, error: invitationError } = await serviceClient
      .from('student_account_invitations')
      .select('id')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);
    if (invitationError) {
      console.error('Could not check pending student invitations:', invitationError.message);
      return respond(500, { error: 'Could not check for a pending student invitation.' });
    }
    if (pendingInvitations?.length) {
      return respond(409, { error: 'A student invitation is already pending. Cancel or wait for it to expire before creating a student-ID account.' });
    }

    if (!getStudentInitialPassword(student.student_id_number)) {
      return respond(400, { error: 'นักเรียนคนนี้ยังไม่มีรหัสนักเรียนในทะเบียน จึงไม่สามารถสร้างบัญชีได้' });
    }
    const result = await createStudentAccount(serviceClient, schoolId, student as StudentRecord, schoolPasswordConfig, getAuthEmailIndex);
    if (result.alreadyExists) return respond(409, { error: 'This student already has an account.' });
    if (!result.credential) return respond(500, { error: result.reason || 'Could not finish creating the student account.' });
    return respond(200, result.credential);
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('user_profiles')
    .select('id, status, must_change_password, temporary_password_issued_at, temporary_password_expires_at')
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .eq('student_id', studentId)
    .maybeSingle();
  if (profileError) {
    console.error('Could not locate student account for reset:', profileError.message);
    return respond(500, { error: 'Could not find the student account.' });
  }
  if (!profile) return respond(404, { error: 'The student does not have a linked login account.' });
  if (profile.status !== 'active') return respond(409, { error: 'Approve the student account before resetting its password.' });

  const cleanStudentId = (student.student_id_number || '').trim();
  const temporaryPassword = getStudentInitialPassword(cleanStudentId, {
    ...schoolPasswordConfig,
    dateOfBirth: (student as StudentRecord).date_of_birth,
  });
  if (!temporaryPassword) {
    return respond(400, { error: 'นักเรียนคนนี้ยังไม่มีรหัสนักเรียนในทะเบียน จึงไม่สามารถรีเซ็ตรหัสผ่านได้' });
  }
  const issuedAt = new Date().toISOString();
  const expiresAt: string | null = null;
  const { error: profileUpdateError } = await serviceClient
    .from('user_profiles')
    .update({
      must_change_password: true,
      temporary_password_issued_at: issuedAt,
      temporary_password_expires_at: expiresAt,
    })
    .eq('id', profile.id)
    .eq('school_id', schoolId);
  if (profileUpdateError) {
    console.error('Could not lock student profile for password reset:', profileUpdateError.message);
    return respond(500, { error: 'Could not prepare the student account for password reset.' });
  }

  const { error: passwordUpdateError } = await serviceClient.auth.admin.updateUserById(profile.id, {
    password: temporaryPassword,
  });
  if (passwordUpdateError) {
    const { error: rollbackError } = await serviceClient
      .from('user_profiles')
      .update({
        must_change_password: profile.must_change_password,
        temporary_password_issued_at: profile.temporary_password_issued_at,
        temporary_password_expires_at: profile.temporary_password_expires_at,
      })
      .eq('id', profile.id)
      .eq('school_id', schoolId);
    if (rollbackError) console.error('Could not restore student profile after failed password reset:', rollbackError.message);
    const detail = formatStudentPasswordPolicyError(temporaryPassword, passwordUpdateError.message, cleanStudentId);
    console.error('Could not reset student password:', detail);
    return respond(500, { error: detail });
  }

  return respond(200, {
    studentIdNumber: cleanStudentId,
    temporaryPassword,
    expiresAt,
  });
});
