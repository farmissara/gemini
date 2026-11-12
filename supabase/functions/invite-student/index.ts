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
  if (!token) return respond(401, { error: 'Sign in before inviting a student.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase environment configuration for invite-student.');
    return respond(500, { error: 'Student invitations are not configured.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'Your session is invalid or expired.' });

  let payload: { schoolId?: unknown; studentId?: unknown; email?: unknown };
  try {
    payload = await request.json();
  } catch {
    return respond(400, { error: 'Request body must be valid JSON.' });
  }

  const schoolId = typeof payload.schoolId === 'string' ? payload.schoolId.trim() : '';
  const studentId = typeof payload.studentId === 'string' ? payload.studentId.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!schoolId || !studentId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: 'A valid school, student, and email are required.' });
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
    return respond(403, { error: 'Only an active school administrator can invite a student.' });
  }
  if (actor.role === 'admin' && actor.school_id !== schoolId) {
    return respond(403, { error: 'You can only invite students from your own school.' });
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

  const { data: student, error: studentError } = await serviceClient
    .from('students')
    .select('id')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .maybeSingle();
  if (studentError) {
    console.error('Could not verify target student:', studentError.message);
    return respond(500, { error: 'Could not verify the student record.' });
  }
  if (!student) return respond(404, { error: 'The student record does not belong to this school.' });

  const { data: linkedProfile, error: linkedError } = await serviceClient
    .from('user_profiles')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle();
  if (linkedError) {
    console.error('Could not check existing student account:', linkedError.message);
    return respond(500, { error: 'Could not check for an existing student account.' });
  }
  if (linkedProfile) return respond(409, { error: 'This student already has an account.' });

  const { data: invitation, error: invitationError } = await serviceClient
    .from('student_account_invitations')
    .insert({
      school_id: schoolId,
      student_id: studentId,
      invited_email: email,
      created_by: authData.user.id,
    })
    .select('id')
    .single();
  if (invitationError) {
    console.error('Could not create student invitation:', invitationError.message);
    return respond(500, { error: 'Could not create the student invitation.' });
  }

  const appSiteUrl = Deno.env.get('APP_SITE_URL');
  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    ...(appSiteUrl ? { redirectTo: appSiteUrl } : {}),
    data: {
      signup_type: 'student_invite',
      invitation_id: invitation.id,
    },
  });
  if (inviteError) {
    const { error: cleanupError } = await serviceClient
      .from('student_account_invitations')
      .delete()
      .eq('id', invitation.id);
    if (cleanupError) {
      console.error('Could not remove failed student invitation:', cleanupError.message);
    }
    console.error('Could not send student invitation:', inviteError.message);
    return respond(400, { error: 'Could not send the invitation email. Verify the address and email provider settings.' });
  }

  return respond(200, { invitationId: invitation.id });
});
