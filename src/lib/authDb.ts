import { AuthUser, School, UserRole } from '../types';
import { getSupabaseClient } from './supabase';

export interface AuthContext {
  user: AuthUser;
  school: School;
  schools: School[];
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
    .select('id, school_id, role, status, full_name_th, full_name_en, avatar_url, phone')
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
      ? 'Your account is waiting for approval from your school administrator.'
      : 'Your account is suspended. Contact your school administrator.');
  }

  const { data: schoolRows, error: schoolsError } = await client
    .from('schools')
    .select('*')
    .eq('status', 'active')
    .order('name_th');

  if (schoolsError) {
    throw new Error(`Could not load school information: ${schoolsError.message}`);
  }

  const schools = (schoolRows as SchoolRow[]).map(mapSchool);
  const school = schools.find((item) => item.id === profile.school_id) || (
    profile.role === 'super_admin' ? schools[0] : undefined
  );
  if (!school) {
    throw new Error('Your account is not assigned to an active school. Contact your school administrator.');
  }

  const profileRow = profile as UserProfileRow;
  const user: AuthUser = {
    id: profileRow.id,
    email,
    fullNameTh: profileRow.full_name_th,
    fullNameEn: profileRow.full_name_en,
    role: profileRow.role,
    schoolId: school.id,
    avatarUrl: profileRow.avatar_url,
    lineConnected: false,
    phone: profileRow.phone || undefined,
  };

  return {
    user,
    school,
    schools: profile.role === 'super_admin' ? schools : [school],
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
  if (error) throw new Error(`Could not load active schools: ${error.message}`);
  return (data as SchoolRow[]).map(mapSchool);
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
  if (error) throw new Error(error.message);

  if (data.session) {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw new Error(`Account created, but could not end the temporary session: ${signOutError.message}`);
  }
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
  if (error) throw new Error(error.message);

  if (data.session) {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw new Error(`Account created, but could not end the temporary session: ${signOutError.message}`);
  }
}

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
  if (error) throw new Error(`Could not resend confirmation email: ${error.message}`);
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
