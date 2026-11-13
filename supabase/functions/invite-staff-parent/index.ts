import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return respond(401, { error: 'Sign in before inviting a teacher or parent.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase environment configuration for invite-staff-parent.');
    return respond(500, { error: 'Staff/parent invitations are not configured.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'Your session is invalid or expired.' });

  let payload: {
    schoolId?: unknown;
    inviteRole?: unknown;
    email?: unknown;
    fullNameTh?: unknown;
    fullNameEn?: unknown;
    teacherId?: unknown;
    studentId?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return respond(400, { error: 'Request body must be valid JSON.' });
  }

  const schoolId = typeof payload.schoolId === 'string' ? payload.schoolId.trim() : '';
  const inviteRole = payload.inviteRole === 'teacher' || payload.inviteRole === 'parent' ? payload.inviteRole : null;
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const fullNameTh = typeof payload.fullNameTh === 'string' ? payload.fullNameTh.trim() : '';
  const fullNameEn = typeof payload.fullNameEn === 'string' ? payload.fullNameEn.trim() : '';
  const teacherId = typeof payload.teacherId === 'string' ? payload.teacherId.trim() : null;
  const studentId = typeof payload.studentId === 'string' ? payload.studentId.trim() : null;

  if (!schoolId || !inviteRole || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: 'A valid school, role (teacher/parent), and email are required.' });
  }
  if (inviteRole === 'parent' && !studentId) {
    return respond(400, { error: 'A linked student record is required when inviting a parent.' });
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
    console.error('Could not load inviter profile:', actorError.message);
    return respond(500, { error: 'Could not verify your school role.' });
  }
  if (!actor || actor.status !== 'active' || !['admin', 'super_admin'].includes(actor.role)) {
    return respond(403, { error: 'Only an active school administrator can send invitations.' });
  }
  if (actor.role === 'admin' && actor.school_id !== schoolId) {
    return respond(403, { error: 'You can only invite users to your own school.' });
  }

  const { data: school, error: schoolError } = await serviceClient
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('status', 'active')
    .maybeSingle();
  if (schoolError) {
    console.error('Could not verify target school:', schoolError.message);
    return respond(500, { error: 'Could not verify the school.' });
  }
  if (!school) return respond(404, { error: 'The school is not active.' });

  if (inviteRole === 'parent' && studentId) {
    const { data: student, error: studentError } = await serviceClient
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (studentError || !student) {
      return respond(404, { error: 'The linked student record was not found in this school.' });
    }
  }

  if (inviteRole === 'teacher' && teacherId) {
    const { data: teacher, error: teacherError } = await serviceClient
      .from('teachers')
      .select('id')
      .eq('id', teacherId)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (teacherError || !teacher) {
      return respond(404, { error: 'The teacher record was not found in this school.' });
    }
  }

  const { data: invitation, error: invitationError } = await serviceClient
    .from('staff_parent_invitations')
    .insert({
      school_id: schoolId,
      invite_role: inviteRole,
      teacher_id: teacherId,
      student_id: studentId,
      invited_email: email,
      full_name_th: fullNameTh || email,
      full_name_en: fullNameEn || fullNameTh || email,
      created_by: authData.user.id,
    })
    .select('id')
    .single();
  if (invitationError) {
    console.error('Could not create invitation:', invitationError.message);
    return respond(500, { error: 'Could not create the invitation record.' });
  }

  const appSiteUrl = Deno.env.get('APP_SITE_URL');
  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    ...(appSiteUrl ? { redirectTo: appSiteUrl } : {}),
    data: {
      signup_type: inviteRole === 'teacher' ? 'teacher_invite' : 'parent_invite',
      invitation_id: invitation.id,
    },
  });
  if (inviteError) {
    await serviceClient.from('staff_parent_invitations').delete().eq('id', invitation.id);
    console.error('Could not send staff/parent invitation:', inviteError.message);
    return respond(400, {
      error: 'Could not send the invitation email. Verify the email address and Supabase SMTP/Auth settings.',
    });
  }

  return respond(200, { invitationId: invitation.id });
});
