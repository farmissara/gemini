import { AuthUser, School, UserRole } from '../types';
import { getSupabaseClient } from './supabase';

export interface AuthContext {
  user: AuthUser;
  school: School | null;
  schools: School[];
}

export interface PendingSchoolRegistration {
  user_id: string;
  school_id: string;
  email: string;
  full_name_th: string;
  full_name_en: string;
  school_name_th: string;
  school_name_en: string;
  province: string;
  registration_created_at: string;
  email_confirmed: boolean;
}

export interface StudentAccountLink {
  id: string;
  school_id: string;
  student_id: string | null;
  full_name_th: string;
  full_name_en: string;
  status: 'pending' | 'active' | 'suspended';
  email?: string;
  phone?: string;
  created_at?: string;
}

interface SchoolRow {
  id: string;
  code: string;
  name_th: string;
  name_en: string;
  slug: string;
  type: School['type'];
  province: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  primary_color: string;
  students_count: number;
  teachers_count: number;
  academic_year: string;
  current_semester: string;
  line_oa_id: string;
  created_at: string;
  status: School['status'];
};

interface UserProfileRow {
  id: string;
  email?: string;
  school_id: string | null;
  student_id: string | null;
  role: UserRole;
  status: 'pending' | 'active' | 'suspended';
  full_name_th: string;
  full_name_en: string;
  avatar_url: string;
  phone: string | null;
}

function mapSchool(row: SchoolRow): School {
  return {
    id: row.id,
    code: row.code,
    nameTh: row.name_th,
    nameEn: row.name_en,
    slug: row.slug,
    type: row.type,
    province: row.province,
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    logoUrl: row.logo_url || undefined,
    primaryColor: row.primary_color,
    studentsCount: row.students_count,
    teachersCount: row.teachers_count,
    academicYear: row.academic_year,
    currentSemester: row.current_semester,
    lineOaId: row.line_oa_id,
    createdAt: row.created_at,
    status: row.status,
  };
}

function isUserRole(role: string): role is UserRole {
  return ['super_admin', 'admin', 'teacher', 'student', 'parent'].includes(role);
}

async function loadAuthContext(userId: string, email: string): Promise<AuthContext> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data: profile, error: profileError } = await client
    .from('user_profiles')
    .select('id, school_id, student_id, role, status, full_name_th, full_name_en, avatar_url, phone')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw new Error(`Could not load your school profile: ${profileError.message}`);
  }
  if (!isUserRole(profile.role)) {
    throw new Error('Your account has an invalid application role. Contact your school administrator.');
  }
  if (profile.status !== 'active') {
    throw new Error(profile.status === 'pending'
      ? profile.role === 'admin'
        ? 'Your school registration is waiting for approval from a Super Admin.'
        : 'Your account is waiting for approval from your school administrator.'
      : 'Your account is suspended. Contact your school administrator.');
  }

  const schoolQuery = client.from('schools').select('*').order('name_th');
  const { data: schoolRows, error: schoolsError } = profile.role === 'super_admin'
    ? await schoolQuery
    : await schoolQuery.eq('status', 'active');

  if (schoolsError) {
    throw new Error(`Could not load school information: ${schoolsError.message}`);
  }

  const schools = (schoolRows as SchoolRow[]).map(mapSchool);
  const school = schools.find((item) => item.id === profile.school_id)
    || (profile.role === 'super_admin'
      ? schools.find((item) => item.status === 'active') || schools[0] || null
      : undefined);
  if (!school && profile.role !== 'super_admin') {
    throw new Error('Your account is not assigned to an active school. Contact your school administrator.');
  }
  const resolvedSchool = school || null;
  const visibleSchools = profile.role === 'super_admin'
    ? schools
    : school
      ? [school]
      : [];

  const profileRow = profile as UserProfileRow;
  const user: AuthUser = {
    id: profileRow.id,
    email,
    fullNameTh: profileRow.full_name_th,
    fullNameEn: profileRow.full_name_en,
    role: profileRow.role,
    schoolId: resolvedSchool?.id || '',
    avatarUrl: profileRow.avatar_url,
    lineConnected: false,
    phone: profileRow.phone || undefined,
    studentRecordId: profileRow.student_id || undefined,
  };

  return {
    user,
    school: resolvedSchool,
    schools: visibleSchools,
  };
}

export async function listActiveSchools(): Promise<School[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data, error } = await client
    .from('schools')
    .select('*')
    .eq('status', 'active')
    .order('name_th');
  if (error) throw new Error(`Could not load active schools from Supabase: ${error.message}`);
  return (data as SchoolRow[]).map(mapSchool);
}

export async function updateSchoolStatusInSupabase(
  schoolId: string,
  status: School['status']
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client
    .from('schools')
    .update({ status })
    .eq('id', schoolId)
    .select('id')
    .single();
  if (error) throw new Error(`Could not update school status: ${error.message}`);
  if (!data) throw new Error('The school status was not updated.');
}

export async function authenticateWithSupabase(
  email: string,
  password: string
): Promise<AuthContext> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Supabase did not return an authenticated user.');

  try {
    return await loadAuthContext(data.user.id, data.user.email || '');
  } catch (error) {
    await client.auth.signOut();
    throw error;
  }
}

export async function registerStudentWithSupabase(params: {
  email: string;
  password: string;
  fullNameTh: string;
  fullNameEn: string;
  schoolId: string;
  phone?: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data, error } = await client.auth.signUp({
    email: params.email.trim().toLowerCase(),
    password: params.password,
    options: {
      emailRedirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
      data: {
        school_id: params.schoolId,
        signup_type: 'student',
        full_name_th: params.fullNameTh,
        full_name_en: params.fullNameEn || params.fullNameTh,
        phone: params.phone || null,
      },
    },
  });
  if (error) {
    // If error is related to email confirmation/SMTP sending, the user was already created in database
    // Super Admin approves and activates the account directly from the system console
    if (/confirmation email|rate limit/i.test(error.message)) {
      // Gracefully treat as submitted to Super Admin queue
    } else {
      throw new Error(error.message);
    }
  }

  if (data.session) {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw new Error(`Account created, but could not end the temporary session: ${signOutError.message}`);
  }
}

export async function inviteStudentAccount(params: {
  schoolId: string;
  studentId: string;
  email: string;
}): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.functions.invoke('invite-student', {
    body: {
      schoolId: params.schoolId,
      studentId: params.studentId,
      email: params.email.trim().toLowerCase(),
    },
  });
  if (error) throw new Error(`Could not invite student: ${error.message}`);
  if (typeof data?.invitationId !== 'string') {
    throw new Error(typeof data?.error === 'string' ? data.error : 'The invitation service returned an invalid response.');
  }
  return data.invitationId;
}

export async function registerSchoolWithSupabase(params: {
  email: string;
  password: string;
  fullNameTh: string;
  fullNameEn: string;
  phone?: string;
  schoolNameTh: string;
  schoolNameEn: string;
  schoolType: School['type'];
  province: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data, error } = await client.auth.signUp({
    email: params.email.trim().toLowerCase(),
    password: params.password,
    options: {
      emailRedirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
      data: {
        signup_type: 'school_admin',
        full_name_th: params.fullNameTh.trim(),
        full_name_en: params.fullNameEn.trim() || params.fullNameTh.trim(),
        phone: params.phone?.trim() || null,
        school_name_th: params.schoolNameTh.trim(),
        school_name_en: params.schoolNameEn.trim() || params.schoolNameTh.trim(),
        school_type: params.schoolType,
        school_province: params.province.trim(),
      },
    },
  });
  if (error) {
    // If error is related to email confirmation/SMTP sending, the school and admin user were already created in database
    // Super Admin approves and activates the school directly from the system console
    if (/confirmation email|rate limit/i.test(error.message)) {
      // Gracefully treat as submitted to Super Admin queue
    } else {
      throw new Error(error.message);
    }
  }

  if (data.session) {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw new Error(`Account created, but could not end the temporary session: ${signOutError.message}`);
  }
}

export const MASTER_SYSTEM_EMAIL = 'farmissara@gmail.com';

export async function resendSignupConfirmation(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { error } = await client.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: typeof window === 'undefined' ? undefined : `${window.location.origin}/`,
  });
  if (error) {
    throw new Error(`ไม่สามารถส่งคำขอเปลี่ยนรหัสผ่านได้: ${error.message}`);
  }
}

export async function restoreSupabaseSession(): Promise<AuthContext | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(`Could not restore your sign-in session: ${error.message}`);
  if (!data.session?.user) return null;

  try {
    return await loadAuthContext(data.session.user.id, data.session.user.email || '');
  } catch (error) {
    await client.auth.signOut();
    throw error;
  }
}

export async function signOutFromSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
}

export async function updateUserProfileInSupabase(user: AuthUser): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('user_profiles')
    .update({
      full_name_th: user.fullNameTh,
      full_name_en: user.fullNameEn,
      avatar_url: user.avatarUrl,
      phone: user.phone || null,
    })
    .eq('id', user.id);
  if (error) throw new Error(`Could not update your profile: ${error.message}`);
}

export async function listStudentAccountLinks(schoolId: string): Promise<StudentAccountLink[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data: rpcData, error: rpcError } = await client.rpc('list_school_student_accounts', {
    target_school_id: schoolId,
  });
  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData as StudentAccountLink[];
  }

  const { data, error } = await client
    .from('user_profiles')
    .select('id, school_id, student_id, full_name_th, full_name_en, phone, status, created_at')
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .order('full_name_th');
  if (error) throw new Error(`Could not load student account links: ${error.message}`);
  return (data || []) as StudentAccountLink[];
}

export async function linkStudentAccountToStudent(
  schoolId: string,
  userId: string,
  studentId: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.rpc('link_student_account', {
    target_school_id: schoolId,
    target_user_id: userId,
    target_student_id: studentId,
  });
  if (error) throw new Error(`Could not link student account: ${error.message}`);
  if (data === false) throw new Error('No matching student account was updated.');
}

export async function approveStudentAccountInSupabase(
  schoolId: string,
  userId: string,
  studentId?: string | null
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error: rpcError } = await client.rpc('approve_student_account', {
    target_school_id: schoolId,
    target_user_id: userId,
    target_student_id: studentId || null,
  });
  if (!rpcError) return;

  // Fallback if migration RPC hasn't been installed yet
  const patch: Record<string, unknown> = { status: 'active' };
  if (studentId) patch.student_id = studentId;
  const { error } = await client
    .from('user_profiles')
    .update(patch)
    .eq('id', userId)
    .eq('school_id', schoolId);
  if (error) throw new Error(`ไม่สามารถอนุมัติบัญชีนักเรียนได้: ${error.message}`);
}

export async function updateStudentAccountStatusInSupabase(
  schoolId: string,
  userId: string,
  status: 'pending' | 'active' | 'suspended'
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error: rpcError } = await client.rpc('update_student_account_status', {
    target_school_id: schoolId,
    target_user_id: userId,
    next_status: status,
  });
  if (!rpcError) return;

  const { error } = await client
    .from('user_profiles')
    .update({ status })
    .eq('id', userId)
    .eq('school_id', schoolId);
  if (error) throw new Error(`ไม่สามารถอัปเดตสถานะบัญชีนักเรียนได้: ${error.message}`);
}

export async function listPendingSchoolRegistrations(): Promise<PendingSchoolRegistration[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.rpc('list_pending_school_registrations');
  if (error) throw new Error(`Could not load pending school registrations: ${error.message}`);
  return (data || []) as PendingSchoolRegistration[];
}

export async function approvePendingSchoolRegistration(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client.rpc('approve_pending_school_registration', {
    target_user_id: userId,
  });
  if (error) throw new Error(`Could not approve school registration: ${error.message}`);
}
