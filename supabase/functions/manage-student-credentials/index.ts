import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
const TEMP_PASSWORD_LIFETIME_MS = 24 * 60 * 60 * 1000;

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateTemporaryPassword(): string {
  const passwordLength = 16;
  const maxByte = 256 - (256 % PASSWORD_ALPHABET.length);
  let password = '';
  while (password.length < passwordLength) {
    const bytes = crypto.getRandomValues(new Uint8Array(passwordLength));
    for (const byte of bytes) {
      if (byte < maxByte) password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      if (password.length === passwordLength) break;
    }
  }
  return password;
}

async function getSyntheticStudentEmail(schoolId: string, studentId: string): Promise<string> {
  const input = new TextEncoder().encode(`${schoolId}:${studentId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `student-${hash}@accounts.eduverse.invalid`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return respond(401, { error: 'Sign in before managing student credentials.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase environment configuration for manage-student-credentials.');
    return respond(500, { error: 'Student credential management is not configured.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'Your session is invalid or expired.' });

  let payload: { operation?: unknown; schoolId?: unknown; studentId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return respond(400, { error: 'Request body must be valid JSON.' });
  }

  const operation = payload.operation === 'create' || payload.operation === 'reset' ? payload.operation : null;
  const schoolId = typeof payload.schoolId === 'string' ? payload.schoolId.trim() : '';
  const studentId = typeof payload.studentId === 'string' ? payload.studentId.trim() : '';
  if (!operation || !schoolId || !studentId) {
    return respond(400, { error: 'An operation, school, and student are required.' });
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
  if (!actor || actor.status !== 'active' || !['admin', 'super_admin'].includes(actor.role)) {
    return respond(403, { error: 'Only an active school administrator can manage student credentials.' });
  }
  if (actor.role === 'admin' && actor.school_id !== schoolId) {
    return respond(403, { error: 'You can only manage students from your own school.' });
  }

  const { data: school, error: schoolError } = await serviceClient
    .from('schools')
    .select('id, student_login_identifier_type')
    .eq('id', schoolId)
    .eq('status', 'active')
    .maybeSingle();
  if (schoolError) {
    console.error('Could not verify student credential school:', schoolError.message);
    return respond(500, { error: 'Could not verify the school.' });
  }
  if (!school) return respond(404, { error: 'The school is not active.' });
  if (school.student_login_identifier_type === 'email_only') {
    return respond(409, { error: 'This school is configured for email-only student sign-in. Change the login setting before creating student-ID accounts.' });
  }

  const { data: student, error: studentError } = await serviceClient
    .from('students')
    .select('id, school_id, student_id_number, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .maybeSingle();
  if (studentError) {
    console.error('Could not verify target student:', studentError.message);
    return respond(500, { error: 'Could not verify the student record.' });
  }
  if (!student) return respond(404, { error: 'The student record does not belong to this school.' });

  let accountId: string;
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

    const temporaryPassword = generateTemporaryPassword();
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_LIFETIME_MS).toISOString();
    const email = await getSyntheticStudentEmail(schoolId, studentId);
    const { data: createdAuthUser, error: createUserError } = await serviceClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });
    if (createUserError || !createdAuthUser.user) {
      console.error('Could not create student auth user:', createUserError?.message || 'Missing user response.');
      return respond(400, { error: 'Could not create the student login account. Check whether an account already exists or contact the system administrator.' });
    }
    accountId = createdAuthUser.user.id;

    const { error: profileError } = await serviceClient.from('user_profiles').insert({
      id: accountId,
      school_id: schoolId,
      role: 'student',
      student_id: studentId,
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
      if (cleanupError) console.error('Could not remove orphan student auth user:', cleanupError.message);
      console.error('Could not create student profile:', profileError.message);
      return respond(500, { error: 'Could not finish creating the student account.' });
    }

    return respond(200, {
      studentIdNumber: student.student_id_number,
      temporaryPassword,
      expiresAt,
    });
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

  const temporaryPassword = generateTemporaryPassword();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TEMP_PASSWORD_LIFETIME_MS).toISOString();
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
    console.error('Could not reset student password:', passwordUpdateError.message);
    return respond(500, { error: 'Could not reset the student password.' });
  }

  return respond(200, {
    studentIdNumber: student.student_id_number,
    temporaryPassword,
    expiresAt,
  });
});
