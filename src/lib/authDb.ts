import { AuthUser, School, UserRole } from '../types';
import { getSupabaseClient } from './supabase';
import {
  DEFAULT_SEMESTER_OPTIONS,
  DEFAULT_STAFF_POSITION_OPTIONS,
  DEFAULT_TEACHING_LOAD_MAX_PERIODS,
  DEFAULT_TEACHING_LOAD_MIN_PERIODS,
  getSchoolSettingsUpdate,
} from './schoolSettings';
import { DEFAULT_SCHOOL_CUSTOM_PRESETS } from './schoolCustomPresets';

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

export interface SuperAdminAccount {
  id: string;
  email: string;
  full_name_th: string;
  full_name_en: string;
  role: UserRole;
  school_id: string | null;
  status: 'pending' | 'active' | 'suspended';
  avatar_url: string;
  created_at: string;
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

export interface TemporaryStudentCredential {
  studentIdNumber: string;
  temporaryPassword: string;
  expiresAt: string | null;
}

export interface BulkStudentCredentialResult {
  created: TemporaryStudentCredential[];
  skipped: Array<{ studentIdNumber: string; reason: string }>;
  failed: Array<{ studentIdNumber: string; reason: string }>;
}

export interface StaffParentAccountLink {
  id: string;
  school_id: string;
  role: 'teacher' | 'parent';
  full_name_th: string;
  full_name_en: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'active' | 'suspended';
  linked_student_ids?: string[];
  created_at?: string;
}

export interface SchoolLoginPortalInfo {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  studentLoginIdentifierType: 'student_id_only' | 'email_only' | 'both';
  customLoginSlug?: string;
  studentDefaultPasswordType: 'student_id' | 'birthdate' | 'custom' | 'pin';
  studentDefaultPasswordNote?: string;
  studentIdMinLength?: number;
  studentIdMaxLength?: number;
  studentIdDigitsOnly?: boolean;
  studentIdExample?: string;
  studentShortIdPasswordPrefix?: string;
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
  semester_options?: string[] | null;
  teaching_load_min_periods?: number | null;
  teaching_load_max_periods?: number | null;
  grading_system?: School['gradingSystem'];
  staff_position_options?: string[] | null;
  room_options?: string[] | null;
  show_primary_course_credits?: boolean | null;
  student_login_identifier_type?: School['studentLoginIdentifierType'] | null;
  custom_login_slug?: string | null;
  student_default_password_type?: School['studentDefaultPasswordType'] | null;
  student_default_password_note?: string | null;
  student_id_min_length?: number | null;
  student_id_max_length?: number | null;
  student_id_digits_only?: boolean | null;
  student_id_example?: string | null;
  student_short_id_password_prefix?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters?: number | null;
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
  must_change_password?: boolean;
  temporary_password_issued_at?: string | null;
  temporary_password_expires_at?: string | null;
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
    semesterOptions: row.semester_options || DEFAULT_SEMESTER_OPTIONS,
    teachingLoadMinPeriods: row.teaching_load_min_periods ?? DEFAULT_TEACHING_LOAD_MIN_PERIODS,
    teachingLoadMaxPeriods: row.teaching_load_max_periods ?? DEFAULT_TEACHING_LOAD_MAX_PERIODS,
    gradingSystem: row.grading_system || 'thai',
    staffPositionOptions: row.staff_position_options || DEFAULT_STAFF_POSITION_OPTIONS,
    roomOptions: row.room_options?.length ? row.room_options : undefined,
    showPrimaryCourseCredits: row.show_primary_course_credits ?? false,
    studentLoginIdentifierType: row.student_login_identifier_type || 'both',
    customLoginSlug: row.custom_login_slug || undefined,
    studentDefaultPasswordType: row.student_default_password_type || 'student_id',
    studentDefaultPasswordNote: row.student_default_password_note || undefined,
    studentIdMinLength:
      row.student_id_min_length !== null && row.student_id_min_length !== undefined
        ? Number(row.student_id_min_length)
        : undefined,
    studentIdMaxLength:
      row.student_id_max_length !== null && row.student_id_max_length !== undefined
        ? Number(row.student_id_max_length)
        : undefined,
    studentIdDigitsOnly: row.student_id_digits_only ?? undefined,
    studentIdExample: row.student_id_example || undefined,
    studentShortIdPasswordPrefix: row.student_short_id_password_prefix || undefined,
    latitude:
      row.latitude !== null && row.latitude !== undefined && Number.isFinite(Number(row.latitude))
        ? Number(row.latitude)
        : undefined,
    longitude:
      row.longitude !== null && row.longitude !== undefined && Number.isFinite(Number(row.longitude))
        ? Number(row.longitude)
        : undefined,
    geofenceRadiusMeters:
      row.geofence_radius_meters !== null &&
      row.geofence_radius_meters !== undefined &&
      Number.isFinite(Number(row.geofence_radius_meters))
        ? Number(row.geofence_radius_meters)
        : undefined,
    createdAt: row.created_at,
    status: row.status,
  };
}

function isUserRole(role: string): role is UserRole {
  return ['super_admin', 'admin', 'teacher', 'student', 'parent'].includes(role);
}

async function loadAuthContext(userId: string, email: string, emailConfirmed: boolean): Promise<AuthContext> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ (Database is not configured).');
  }

  const { data: profile, error: profileError } = await client
    .from('user_profiles')
    .select('id, school_id, student_id, role, status, full_name_th, full_name_en, avatar_url, phone, must_change_password, temporary_password_issued_at, temporary_password_expires_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not load your school profile: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error(
      email.trim().toLowerCase() === MASTER_SYSTEM_EMAIL.trim().toLowerCase()
        ? 'The Master Super Admin account is missing its system profile. Run the latest database migration or contact the database administrator.'
        : 'Your account profile is missing or it could not be read. Contact your school administrator.'
    );
  }
  if (!isUserRole(profile.role)) {
    throw new Error('Your account has an invalid application role. Contact your school administrator.');
  }
  if (profile.role === 'teacher' && !emailConfirmed) {
    throw new Error('ครูต้องยืนยันอีเมลก่อนเข้าสู่ระบบ กรุณาตรวจสอบอีเมลคำเชิญจากโรงเรียน');
  }
  if (profile.status !== 'active') {
    throw new Error(profile.status === 'pending'
      ? profile.role === 'admin'
        ? 'Your school registration is waiting for approval from a Super Admin.'
        : 'Your account is waiting for approval from your school administrator.'
      : 'Your account is suspended. Contact your school administrator.');
  }

  const profileRow = profile as UserProfileRow;
  if (profileRow.role === 'student' && profileRow.must_change_password) {
    const expiresAt = profileRow.temporary_password_expires_at
      ? new Date(profileRow.temporary_password_expires_at)
      : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new Error('รหัสผ่านชั่วคราวหมดอายุแล้ว กรุณาติดต่อผู้ดูแลโรงเรียนเพื่อออกรหัสใหม่');
    }

    return {
      user: {
        id: profileRow.id,
        email: email.endsWith('@accounts.eduverse.invalid') ? '' : email,
        fullNameTh: profileRow.full_name_th,
        fullNameEn: profileRow.full_name_en,
        role: profileRow.role,
        schoolId: profileRow.school_id || '',
        avatarUrl: profileRow.avatar_url,
        phone: profileRow.phone || undefined,
        studentRecordId: profileRow.student_id || undefined,
        mustChangePassword: true,
      },
      school: null,
      schools: [],
    };
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
  let teacherRecordId: string | undefined;
  let isSchoolAdmin = false;
  if (
    resolvedSchool &&
    (profileRow.role === 'teacher' || profileRow.role === 'admin') &&
    email.trim()
  ) {
    const { data: teacherRows, error: teacherError } = await client
      .from('teachers')
      .select('id, email, full_name_th, is_school_admin')
      .eq('school_id', resolvedSchool.id);
    if (teacherError) {
      throw new Error(`Could not load your linked teacher profile: ${teacherError.message}`);
    }
    const teacherEmail = email.trim().toLowerCase();
    const teacherByEmail = teacherRows?.find(
      (row) => (row.email || '').trim().toLowerCase() === teacherEmail
    );
    teacherRecordId = teacherByEmail?.id || undefined;
    isSchoolAdmin = Boolean(teacherByEmail?.is_school_admin);
  }

  const user: AuthUser = {
    id: profileRow.id,
    email,
    fullNameTh: profileRow.full_name_th,
    fullNameEn: profileRow.full_name_en,
    role: profileRow.role,
    schoolId: resolvedSchool?.id || '',
    avatarUrl: profileRow.avatar_url,
    phone: profileRow.phone || undefined,
    studentRecordId: profileRow.student_id || undefined,
    teacherRecordId,
    isSchoolAdmin,
    mustChangePassword: false,
  };

  return {
    user,
    school: resolvedSchool,
    schools: visibleSchools,
  };
}

export async function listActiveSchools(): Promise<School[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('schools')
    .select('*')
    .eq('status', 'active')
    .order('name_th');
  if (error) {
    console.warn(`Could not load active schools from Supabase: ${error.message}; no schools listed.`);
    return [];
  }
  return (data as SchoolRow[]).map(mapSchool);
}

export async function updateSchoolStatusInSupabase(
  schoolId: string,
  status: School['status']
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { data, error } = await client
    .from('schools')
    .update({ status })
    .eq('id', schoolId)
    .select('id')
    .single();
  if (error) throw new Error(`Could not update school status: ${error.message}`);
  if (!data) throw new Error('The school status was not updated.');
}

export async function deleteSchoolPermanentlyInSupabase(schoolId: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  if (!schoolId.trim()) throw new Error('A school must be selected before it can be deleted.');

  const { error } = await client.rpc('delete_school_permanently', {
    target_school_id: schoolId,
  });
  if (error) throw new Error(`ไม่สามารถลบโรงเรียนได้: ${error.message}`);

  const cleanupFailures: string[] = [];
  for (const bucket of ['school-logos', 'school-attachments']) {
    try {
      const paths = await listStorageFiles(client, bucket, schoolId);
      for (let offset = 0; offset < paths.length; offset += 100) {
        const { error: storageError } = await client.storage.from(bucket).remove(paths.slice(offset, offset + 100));
        if (storageError) throw storageError;
      }
    } catch (cleanupError) {
      cleanupFailures.push(
        `${bucket}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
      );
    }
  }
  if (cleanupFailures.length > 0) {
    console.error(`School ${schoolId} was deleted, but Storage cleanup failed:`, cleanupFailures);
    return `ลบโรงเรียนจากฐานข้อมูลแล้ว แต่ลบไฟล์ Storage ไม่ครบ: ${cleanupFailures.join('; ')}`;
  }
  return null;
}

async function listStorageFiles(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  bucket: string,
  folder: string
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(folder, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    const entries = data || [];
    for (const entry of entries) {
      const path = `${folder}/${entry.name}`;
      if (entry.id) {
        files.push(path);
      } else {
        files.push(...(await listStorageFiles(client, bucket, path)));
      }
    }
    if (entries.length < pageSize) break;
    offset += pageSize;
  }
  return files;
}

export async function fetchSchoolLoginPortalInfo(params: {
  schoolId?: string | null;
  schoolCode?: string | null;
  slug?: string | null;
}): Promise<SchoolLoginPortalInfo | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const schoolId = params.schoolId?.trim() || null;
  const schoolCode = params.schoolCode?.trim() || null;
  const slug = params.slug?.trim() || null;
  if (!schoolId && !schoolCode && !slug) return null;

  const { data: rpcRows, error: rpcError } = await client.rpc('get_school_login_portal_info', {
    lookup_school_id: schoolId,
    lookup_school_code: schoolCode,
    lookup_slug: slug,
  });
  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const row = rpcRows[0] as Record<string, unknown>;
    return {
      id: String(row.id || ''),
      code: String(row.code || ''),
      nameTh: String(row.name_th || ''),
      nameEn: String(row.name_en || ''),
      slug: String(row.slug || ''),
      logoUrl: typeof row.logo_url === 'string' && row.logo_url ? row.logo_url : undefined,
      primaryColor: String(row.primary_color || '#1e40af'),
      studentLoginIdentifierType:
        row.student_login_identifier_type === 'student_id_only' ||
        row.student_login_identifier_type === 'email_only'
          ? row.student_login_identifier_type
          : 'both',
      customLoginSlug: typeof row.custom_login_slug === 'string' && row.custom_login_slug ? row.custom_login_slug : undefined,
      studentDefaultPasswordType:
        row.student_default_password_type === 'birthdate' ||
        row.student_default_password_type === 'custom' ||
        row.student_default_password_type === 'pin'
          ? row.student_default_password_type
          : 'student_id',
      studentDefaultPasswordNote:
        typeof row.student_default_password_note === 'string' && row.student_default_password_note
          ? row.student_default_password_note
          : undefined,
      studentIdMinLength:
        typeof row.student_id_min_length === 'number'
          ? row.student_id_min_length
          : 4,
      studentIdMaxLength:
        typeof row.student_id_max_length === 'number'
          ? row.student_id_max_length
          : 12,
      studentIdDigitsOnly: Boolean(row.student_id_digits_only),
      studentIdExample:
        typeof row.student_id_example === 'string' && row.student_id_example.trim()
          ? row.student_id_example.trim()
          : undefined,
      studentShortIdPasswordPrefix:
        typeof row.student_short_id_password_prefix === 'string' && row.student_short_id_password_prefix.trim()
          ? row.student_short_id_password_prefix.trim()
          : undefined,
    };
  }

  // Fallback query if get_school_login_portal_info migration has not been run yet
  const { data: activeRows } = await client
    .from('schools')
    .select('id, code, name_th, name_en, slug, logo_url, primary_color')
    .eq('status', 'active');
  const match = (activeRows || []).find((row) => {
    if (schoolId && row.id === schoolId) return true;
    if (schoolCode && String(row.code || '').toLowerCase() === schoolCode.toLowerCase()) return true;
    if (slug && String(row.slug || '').toLowerCase() === slug.toLowerCase()) return true;
    return false;
  });
  if (!match) return null;

  return {
    id: match.id,
    code: match.code,
    nameTh: match.name_th,
    nameEn: match.name_en,
    slug: match.slug,
    logoUrl: match.logo_url || undefined,
    primaryColor: match.primary_color || '#1e40af',
    studentLoginIdentifierType: 'both',
    studentDefaultPasswordType: 'student_id',
  };
}

export async function updateSchoolSettingsInSupabase(
  schoolId: string,
  updates: Partial<School>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const payload = getSchoolSettingsUpdate(updates);
  if (Object.keys(payload).length === 0) return;

  const { data, error } = await client
    .from('schools')
    .update(payload)
    .eq('id', schoolId)
    .select('id')
    .single();
  if (
    error &&
    (error.code === 'PGRST204' ||
      error.code === '42703' ||
      /student_login_identifier_type|custom_login_slug|student_default_password|student_id_min_length|student_id_max_length|student_id_digits_only|student_id_example|student_short_id_password_prefix|schema cache|could not find the '.*' column/i.test(error.message))
  ) {
    if (
      updates.customLoginSlug !== undefined &&
      /custom_login_slug|schema cache|could not find the '.*' column/i.test(error.message) &&
      !/student_id_min_length|student_id_max_length|student_id_digits_only|student_id_example|student_short_id_password_prefix/i.test(error.message)
    ) {
      throw new Error('การตั้งรหัสโรงเรียนแบบสั้นต้องใช้ migration 20261119_short_school_login_codes.sql ก่อน');
    }
    const corePayload = { ...payload } as Record<string, unknown>;
    if (/student_id_min_length|student_id_max_length|student_id_digits_only|student_id_example|student_short_id_password_prefix/i.test(error.message)) {
      delete corePayload.student_id_min_length;
      delete corePayload.student_id_max_length;
      delete corePayload.student_id_digits_only;
      delete corePayload.student_id_example;
      delete corePayload.student_short_id_password_prefix;
    } else {
      delete corePayload.student_login_identifier_type;
      delete corePayload.custom_login_slug;
      delete corePayload.student_default_password_type;
      delete corePayload.student_default_password_note;
      delete corePayload.student_id_min_length;
      delete corePayload.student_id_max_length;
      delete corePayload.student_id_digits_only;
      delete corePayload.student_id_example;
      delete corePayload.student_short_id_password_prefix;
    }
    if (Object.keys(corePayload).length === 0) return;
    const retry = await client
      .from('schools')
      .update(corePayload)
      .eq('id', schoolId)
      .select('id')
      .single();
    if (retry.error) throw new Error(`Could not update school settings: ${retry.error.message}`);
    if (!retry.data) throw new Error('School settings were not updated.');
    return;
  }
  if (error) throw new Error(`Could not update school settings: ${error.message}`);
  if (!data) throw new Error('School settings were not updated.');
}

export async function authenticateWithSupabase(
  identifier: string,
  password: string,
  schoolId?: string
): Promise<AuthContext> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ (Database is not configured).');
  }

  let resolvedEmail = identifier.trim().toLowerCase();
  if (!resolvedEmail.includes('@')) {
    if (!schoolId) {
      throw new Error('กรุณาเข้าผ่านลิงก์เฉพาะของโรงเรียนเพื่อเข้าสู่ระบบด้วยรหัสนักเรียน หรือกรอกอีเมลบัญชี');
    }
    const { data: emailFromId, error: resolveError } = await client.rpc('resolve_student_login_email', {
      target_school_id: schoolId,
      identifier: identifier.trim(),
    });
    if (resolveError) {
      throw new Error(`ไม่สามารถตรวจสอบรหัสนักเรียนได้: ${resolveError.message}`);
    }
    if (typeof emailFromId !== 'string' || !emailFromId.trim()) {
      throw new Error('Invalid login credentials');
    }
    resolvedEmail = emailFromId.trim().toLowerCase();
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Supabase did not return an authenticated user.');

  try {
    return await loadAuthContext(data.user.id, data.user.email || '', Boolean(data.user.email_confirmed_at));
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

export interface TeacherParentInviteResult {
  invitationId: string;
  deliveryMethod: 'email_edge_function' | 'email_server' | 'invite_link_rpc';
  inviteUrl: string;
  email: string;
  inviteRole: 'teacher' | 'parent';
  fullNameTh?: string;
  emailDeliveryError?: string;
}

export interface StaffParentInvitationPublicInfo {
  invitationId: string;
  schoolId: string;
  schoolNameTh: string;
  schoolNameEn: string;
  schoolCode: string;
  inviteRole: 'teacher' | 'parent';
  invitedEmail: string;
  fullNameTh: string;
  fullNameEn: string;
  expiresAt: string;
  isAccepted: boolean;
  isExpired: boolean;
}

export class InviteBackendSetupError extends Error {
  code = 'INVITE_BACKEND_MISSING' as const;
  technicalDetail: string;

  constructor(message: string, technicalDetail = '') {
    super(message);
    this.name = 'InviteBackendSetupError';
    this.technicalDetail = technicalDetail;
  }
}

function buildStaffInviteUrl(invitationId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?inviteId=${encodeURIComponent(invitationId)}`;
}

export async function inviteTeacherOrParentAccount(params: {
  schoolId: string;
  inviteRole: 'teacher' | 'parent';
  email: string;
  fullNameTh?: string;
  fullNameEn?: string;
  teacherId?: string;
  studentId?: string;
}): Promise<TeacherParentInviteResult> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล Supabase (กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY)');
  }

  const normalizedEmail = params.email.trim().toLowerCase();
  const roleLabelTh = params.inviteRole === 'teacher' ? 'ครู' : 'ผู้ปกครอง';

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session?.access_token) {
    throw new Error(
      `ยังไม่ได้เข้าสู่ระบบที่เชื่อมต่อ Supabase จึงไม่สามารถส่งคำเชิญบัญชี${roleLabelTh}ได้ กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลโรงเรียน`
    );
  }

  // Tier 1: Try Supabase Edge Function (sends automatic invitation email via Supabase Auth)
  const { data, error } = await client.functions.invoke('invite-staff-parent', {
    body: {
      schoolId: params.schoolId,
      inviteRole: params.inviteRole,
      email: normalizedEmail,
      fullNameTh: params.fullNameTh?.trim() || '',
      fullNameEn: params.fullNameEn?.trim() || '',
      teacherId: params.teacherId || null,
      studentId: params.studentId || null,
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (!error && typeof data?.invitationId === 'string') {
    return {
      invitationId: data.invitationId,
      deliveryMethod: 'email_edge_function',
      inviteUrl: buildStaffInviteUrl(data.invitationId),
      email: normalizedEmail,
      inviteRole: params.inviteRole,
      fullNameTh: params.fullNameTh?.trim(),
    };
  }

  // Tier 2: Automatic RPC fallback when Edge Function is not deployed / unreachable / SMTP failed
  const edgeMsg = error?.message || (typeof data?.error === 'string' ? data.error : 'Edge Function unavailable');
  const { data: rpcId, error: rpcError } = await client.rpc('create_staff_parent_invitation', {
    target_school_id: params.schoolId,
    target_invite_role: params.inviteRole,
    target_email: normalizedEmail,
    target_full_name_th: params.fullNameTh?.trim() || '',
    target_full_name_en: params.fullNameEn?.trim() || '',
    target_teacher_id: params.teacherId || null,
    target_student_id: params.studentId || null,
  });

  if (!rpcError && typeof rpcId === 'string' && rpcId.length > 0) {
    const emailResponse = await fetch('/api/staff-invitations/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invitationId: rpcId,
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      }),
    });
    const emailResult = await emailResponse.json().catch(() => ({})) as { sent?: boolean; message?: string; error?: string };
    if (emailResponse.ok && emailResult.sent) {
      return {
        invitationId: rpcId,
        deliveryMethod: 'email_server',
        inviteUrl: buildStaffInviteUrl(rpcId),
        email: normalizedEmail,
        inviteRole: params.inviteRole,
        fullNameTh: params.fullNameTh?.trim(),
      };
    }
    return {
      invitationId: rpcId,
      deliveryMethod: 'invite_link_rpc',
      inviteUrl: buildStaffInviteUrl(rpcId),
      email: normalizedEmail,
      inviteRole: params.inviteRole,
      fullNameTh: params.fullNameTh?.trim(),
      emailDeliveryError: emailResult.message || emailResult.error || 'เซิร์ฟเวอร์ยังส่งอีเมลอัตโนมัติไม่ได้',
    };
  }

  // Tier 3: Neither Edge Function nor SQL RPC exists in the connected Supabase project
  const rpcMsg = rpcError?.message || '';
  const isMissingRpc =
    rpcError?.code === 'PGRST202' ||
    rpcError?.code === '42883' ||
    rpcError?.code === '42P01' ||
    /could not find the function|schema cache|does not exist/i.test(rpcMsg);

  if (isMissingRpc) {
    throw new InviteBackendSetupError(
      `ยังไม่สามารถส่งคำเชิญอัตโนมัติได้ เนื่องจากโปรเจกต์ Supabase นี้ยังไม่ได้ Deploy Edge Function "invite-staff-parent" และยังไม่ได้ติดตั้งฟังก์ชัน SQL สำหรับสร้างลิงก์คำเชิญ`,
      `Edge: ${edgeMsg}${rpcMsg ? ` | RPC: ${rpcMsg}` : ''}`
    );
  }

  throw new Error(`ไม่สามารถส่งคำเชิญบัญชี${roleLabelTh}ได้: ${rpcMsg || edgeMsg}`);
}

export async function fetchStaffParentInvitationPublic(
  invitationId: string
): Promise<StaffParentInvitationPublicInfo | null> {
  const client = getSupabaseClient();
  if (!client || !invitationId.trim()) return null;

  const { data, error } = await client.rpc('get_staff_parent_invitation_public', {
    target_invitation_id: invitationId.trim(),
  });
  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  const row = data[0] as {
    invitation_id: string;
    school_id: string;
    school_name_th: string;
    school_name_en: string;
    school_code: string;
    invite_role: 'teacher' | 'parent';
    invited_email: string;
    full_name_th: string;
    full_name_en: string;
    expires_at: string;
    is_accepted: boolean;
    is_expired: boolean;
  };
  return {
    invitationId: row.invitation_id,
    schoolId: row.school_id,
    schoolNameTh: row.school_name_th,
    schoolNameEn: row.school_name_en,
    schoolCode: row.school_code,
    inviteRole: row.invite_role,
    invitedEmail: row.invited_email,
    fullNameTh: row.full_name_th,
    fullNameEn: row.full_name_en,
    expiresAt: row.expires_at,
    isAccepted: Boolean(row.is_accepted),
    isExpired: Boolean(row.is_expired),
  };
}

export async function acceptStaffParentInvitation(params: {
  invitationId: string;
  email: string;
  password: string;
  inviteRole: 'teacher' | 'parent';
}): Promise<{ sessionCreated: boolean; authContext?: AuthContext }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client.auth.signUp({
    email: params.email.trim().toLowerCase(),
    password: params.password,
    options: {
      emailRedirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
      data: {
        signup_type: params.inviteRole === 'teacher' ? 'teacher_invite' : 'parent_invite',
        invitation_id: params.invitationId,
      },
    },
  });

  if (error) {
    if (/confirmation email|rate limit/i.test(error.message)) {
      return { sessionCreated: false };
    }
    throw new Error(error.message);
  }

  if (data.session) {
    const context = await restoreSupabaseSession();
    if (context) {
      return { sessionCreated: true, authContext: context };
    }
  }
  return { sessionCreated: false };
}

export async function approveStaffParentAccountInSupabase(
  schoolId: string,
  userId: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client.rpc('approve_staff_parent_account', {
    target_school_id: schoolId,
    target_user_id: userId,
  });
  if (error) {
    throw new Error(`ไม่สามารถอนุมัติบัญชีได้: ${error.message}`);
  }
}

export async function listSchoolStaffParentAccounts(schoolId: string): Promise<StaffParentAccountLink[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: rpcData, error: rpcError } = await client.rpc('list_school_staff_parent_accounts', {
    target_school_id: schoolId,
  });
  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData as StaffParentAccountLink[];
  }

  const { data, error } = await client
    .from('user_profiles')
    .select('id, school_id, role, full_name_th, full_name_en, phone, status, created_at')
    .eq('school_id', schoolId)
    .in('role', ['teacher', 'parent'])
    .order('full_name_th');
  if (error) {
    console.warn('Could not load staff/parent account list:', error.message);
    return [];
  }
  return (data || []) as StaffParentAccountLink[];
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

export const MASTER_SYSTEM_EMAIL = 'baanpakkru@gmail.com';

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
    if (error.message.toLowerCase().includes('error sending recovery email')) {
      throw new Error(
        `Supabase ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ โปรดตรวจสอบ Authentication > SMTP Settings, ข้อมูลผู้ส่งอีเมล และ URL Configuration ใน Supabase (รายละเอียด: ${error.message})`
      );
    }
    throw new Error(`ไม่สามารถส่งคำขอเปลี่ยนรหัสผ่านได้: ${error.message}`);
  }
}

export function isPasswordRecoveryRedirect(): boolean {
  if (typeof window === 'undefined') return false;

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
}

export async function updatePassword(password: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(`ไม่สามารถเปลี่ยนรหัสผ่านได้: ${error.message}`);
}

export async function completeFirstStudentPasswordChange(password: string): Promise<AuthContext> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error: passwordError } = await client.auth.updateUser({ password });
  if (passwordError) throw new Error(`ไม่สามารถเปลี่ยนรหัสผ่านได้: ${passwordError.message}`);

  const { error: completionError } = await client.rpc('complete_student_password_change');
  if (completionError) {
    throw new Error(`เปลี่ยนรหัสผ่านแล้ว แต่ยังยืนยันการตั้งรหัสผ่านใหม่ไม่สำเร็จ: ${completionError.message}`);
  }

  const context = await restoreSupabaseSession();
  if (!context) throw new Error('เปลี่ยนรหัสผ่านแล้ว แต่ไม่พบ session กรุณาเข้าสู่ระบบอีกครั้ง');
  return context;
}

async function extractEdgeFunctionError(error: unknown): Promise<{
  status?: number;
  message: string;
  isUnreachable: boolean;
}> {
  const errObj = error as { name?: string; message?: string; context?: unknown } | null;
  const rawMessage = errObj?.message || (error instanceof Error ? error.message : String(error || 'Unknown error'));
  const name = errObj?.name || '';
  let status: number | undefined;
  let bodyMessage = '';

  const context = errObj?.context;
  if (context && typeof context === 'object' && 'status' in context) {
    const responseLike = context as Response;
    if (typeof responseLike.status === 'number') {
      status = responseLike.status;
    }
    try {
      const cloned = typeof responseLike.clone === 'function' ? responseLike.clone() : responseLike;
      if (typeof cloned.json === 'function') {
        const parsed = (await cloned.json()) as { error?: unknown; message?: unknown } | null;
        if (typeof parsed?.message === 'string' && parsed.message.trim()) {
          bodyMessage = parsed.message.trim();
        } else if (typeof parsed?.error === 'string' && parsed.error.trim()) {
          bodyMessage = parsed.error.trim();
        }
      }
    } catch {
      // Ignore non-JSON error payloads from the gateway
    }
  }

  const isUnreachable =
    name === 'FunctionsFetchError' ||
    name === 'FunctionsRelayError' ||
    /failed to send a request to the edge function|failed to fetch|networkerror/i.test(rawMessage) ||
    status === 404 ||
    status === 502 ||
    status === 503 ||
    status === 504;

  return {
    status,
    message: bodyMessage || rawMessage,
    isUnreachable,
  };
}

export interface StudentCredentialPasswordConfig {
  defaultPasswordType?: 'student_id' | 'birthdate' | 'custom' | 'pin';
  shortIdPasswordPrefix?: string;
}

type StudentCredentialManagerPayload =
  | {
      operation: 'create' | 'reset';
      schoolId: string;
      studentId: string;
      passwordConfig?: StudentCredentialPasswordConfig;
    }
  | {
      operation: 'create_all_missing';
      schoolId: string;
      studentIds?: string[];
      passwordConfig?: StudentCredentialPasswordConfig;
    }
  | {
      operation: 'delete_account';
      schoolId: string;
      userId: string;
    };

async function callExpressStudentCredentials(
  accessToken: string,
  payload: StudentCredentialManagerPayload
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; unreachable: boolean; message: string }> {
  try {
    const response = await fetch('/api/student-credentials', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const serverPayload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (response.ok) {
      return { ok: true, data: serverPayload };
    }

    const serverErrorCode = typeof serverPayload.error === 'string' ? serverPayload.error : '';
    const serverMessage =
      typeof serverPayload.message === 'string'
        ? serverPayload.message
        : typeof serverPayload.error === 'string'
          ? serverPayload.error
          : `HTTP ${response.status}`;

    const unreachable =
      response.status === 404 ||
      response.status === 502 ||
      response.status === 504 ||
      (response.status === 503 && serverErrorCode === 'STUDENT_CREDENTIALS_SERVER_NOT_CONFIGURED');

    return { ok: false, unreachable, message: serverMessage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      unreachable: /failed to fetch|networkerror/i.test(msg),
      message: msg,
    };
  }
}

async function invokeStudentCredentialManager(
  payload: StudentCredentialManagerPayload
): Promise<Record<string, unknown>> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลโรงเรียนที่เชื่อมต่อ Supabase ก่อนจัดการบัญชีหรือรหัสผ่านนักเรียน');
  }

  // Tier 1: Supabase Edge Function
  const { data, error } = await client.functions.invoke('manage-student-credentials', {
    body: payload,
  });

  if (!error && data && typeof data === 'object') {
    return data as Record<string, unknown>;
  }

  const edgeDetails = await extractEdgeFunctionError(error);
  if (
    error &&
    !edgeDetails.isUnreachable &&
    edgeDetails.status !== undefined &&
    edgeDetails.status >= 400 &&
    edgeDetails.status < 500
  ) {
    throw new Error(edgeDetails.message);
  }

  // Tier 2: Express backend fallback when Edge Function is not deployed or unreachable
  const serverResult = await callExpressStudentCredentials(accessToken, payload);
  if (serverResult.ok) {
    return serverResult.data;
  }

  if (serverResult.unreachable) {
    throw new Error(
      `ไม่สามารถติดต่อ Edge Function "manage-student-credentials" (${edgeDetails.message}) และเซิร์ฟเวอร์สำรอง (/api/student-credentials: ${serverResult.message})`
    );
  }

  throw new Error(serverResult.message);
}

async function manageStudentTemporaryCredential(
  operation: 'create' | 'reset',
  schoolId: string,
  studentId: string,
  passwordConfig?: StudentCredentialPasswordConfig
): Promise<TemporaryStudentCredential> {
  try {
    const data = await invokeStudentCredentialManager({
      operation,
      schoolId,
      studentId,
      ...(passwordConfig ? { passwordConfig } : {}),
    });
    if (
      typeof data?.studentIdNumber !== 'string' ||
      typeof data?.temporaryPassword !== 'string' ||
      (data?.expiresAt !== null && data?.expiresAt !== undefined && typeof data?.expiresAt !== 'string')
    ) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'ระบบออกรหัสผ่านเริ่มต้นตอบกลับไม่ถูกต้อง');
    }
    return {
      studentIdNumber: data.studentIdNumber,
      temporaryPassword: data.temporaryPassword,
      expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`ไม่สามารถจัดการรหัสผ่านนักเรียนได้: ${message}`);
  }
}

export function createStudentLoginAccount(
  schoolId: string,
  studentId: string,
  passwordConfig?: StudentCredentialPasswordConfig
): Promise<TemporaryStudentCredential> {
  return manageStudentTemporaryCredential('create', schoolId, studentId, passwordConfig);
}

export async function createMissingStudentLoginAccounts(
  schoolId: string,
  options?: {
    studentIds?: string[];
    studentIdNumbersById?: Record<string, string>;
    passwordConfig?: StudentCredentialPasswordConfig;
  }
): Promise<BulkStudentCredentialResult> {
  const cleanedStudentIds = options?.studentIds?.length
    ? Array.from(new Set(options.studentIds.map((id) => id.trim()).filter(Boolean)))
    : undefined;
  const passwordConfig = options?.passwordConfig;

  let data: Record<string, unknown> | null = null;

  // When creating for a filtered subset (e.g. specific room/individuals), prefer /api/student-credentials
  // first so server-side studentIds filtering and orphan-auth recovery are guaranteed. If unavailable,
  // run bounded per-student 'create' calls so unselected students are never touched even against older Edge Functions.
  if (cleanedStudentIds && cleanedStudentIds.length > 0) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase is not configured.');
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลโรงเรียนที่เชื่อมต่อ Supabase ก่อนจัดการบัญชีหรือรหัสผ่านนักเรียน');
    }

    const expressAttempt = await callExpressStudentCredentials(accessToken, {
      operation: 'create_all_missing',
      schoolId,
      studentIds: cleanedStudentIds,
      ...(passwordConfig ? { passwordConfig } : {}),
    });

    if (expressAttempt.ok) {
      data = expressAttempt.data;
    } else if (!expressAttempt.unreachable) {
      throw new Error(`ไม่สามารถสร้างบัญชีนักเรียนเป็นชุดได้: ${expressAttempt.message}`);
    } else {
      const created: TemporaryStudentCredential[] = [];
      const skipped: Array<{ studentIdNumber: string; reason: string }> = [];
      const failed: Array<{ studentIdNumber: string; reason: string }> = [];
      const CONCURRENCY = 4;
      for (let i = 0; i < cleanedStudentIds.length; i += CONCURRENCY) {
        const chunk = cleanedStudentIds.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          chunk.map(async (sid) => {
            const label = options?.studentIdNumbersById?.[sid] || sid;
            try {
              const cred = await createStudentLoginAccount(schoolId, sid, passwordConfig);
              return { status: 'created' as const, cred };
            } catch (err) {
              const reason = err instanceof Error ? err.message.replace(/^ไม่สามารถจัดการรหัสผ่านนักเรียนได้:\s*/, '') : String(err);
              if (/already has an account|มีบัญชีเข้าสู่ระบบอยู่แล้ว|ACCOUNT_EXISTS/i.test(reason)) {
                return { status: 'skipped' as const, label, reason: 'บัญชีมีอยู่แล้ว' };
              }
              if (/invitation is already pending|มีคำเชิญทางอีเมล/i.test(reason)) {
                return { status: 'skipped' as const, label, reason: 'มีคำเชิญทางอีเมลที่ยังไม่หมดอายุ' };
              }
              return { status: 'failed' as const, label, reason };
            }
          })
        );
        for (const r of results) {
          if (r.status === 'created') created.push(r.cred);
          else if (r.status === 'skipped') skipped.push({ studentIdNumber: r.label, reason: r.reason });
          else failed.push({ studentIdNumber: r.label, reason: r.reason });
        }
      }
      return { created, skipped, failed };
    }
  }

  if (!data) {
    try {
      data = await invokeStudentCredentialManager({
        operation: 'create_all_missing',
        schoolId,
        ...(passwordConfig ? { passwordConfig } : {}),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`ไม่สามารถสร้างบัญชีนักเรียนเป็นชุดได้: ${message}`);
    }
  }

  if (!Array.isArray(data?.created) || !Array.isArray(data?.skipped) || !Array.isArray(data?.failed)) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'ระบบสร้างบัญชีนักเรียนตอบกลับไม่ถูกต้อง');
  }

  const created: TemporaryStudentCredential[] = [];
  for (const item of data.created) {
    if (
      typeof item?.studentIdNumber !== 'string' ||
      typeof item?.temporaryPassword !== 'string' ||
      (item?.expiresAt !== null && item?.expiresAt !== undefined && typeof item?.expiresAt !== 'string')
    ) {
      throw new Error('ระบบสร้างบัญชีนักเรียนส่งข้อมูลรหัสผ่านเริ่มต้นไม่ครบถ้วน');
    }
    created.push({
      studentIdNumber: item.studentIdNumber,
      temporaryPassword: item.temporaryPassword,
      expiresAt: typeof item.expiresAt === 'string' ? item.expiresAt : null,
    });
  }

  const parseStatusRows = (items: unknown): Array<{ studentIdNumber: string; reason: string }> => {
    if (!Array.isArray(items)) throw new Error('ระบบสร้างบัญชีนักเรียนส่งสรุปผลไม่ถูกต้อง');
    return items.map((item) => {
      if (typeof item?.studentIdNumber !== 'string' || typeof item?.reason !== 'string') {
        throw new Error('ระบบสร้างบัญชีนักเรียนส่งรายละเอียดผลลัพธ์ไม่ครบถ้วน');
      }
      return { studentIdNumber: item.studentIdNumber, reason: item.reason };
    });
  };

  return {
    created,
    skipped: parseStatusRows(data.skipped),
    failed: parseStatusRows(data.failed),
  };
}

export function resetStudentLoginPassword(
  schoolId: string,
  studentId: string,
  passwordConfig?: StudentCredentialPasswordConfig
): Promise<TemporaryStudentCredential> {
  return manageStudentTemporaryCredential('reset', schoolId, studentId, passwordConfig);
}

export async function restoreSupabaseSession(): Promise<AuthContext | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(`Could not restore your sign-in session: ${error.message}`);
  if (!data.session?.user) return null;

  try {
    return await loadAuthContext(
      data.session.user.id,
      data.session.user.email || '',
      Boolean(data.session.user.email_confirmed_at)
    );
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

export async function deleteStudentAccountRegistrationInSupabase(
  schoolId: string,
  userId: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error: rpcError } = await client.rpc('delete_student_account_registration', {
    target_school_id: schoolId,
    target_user_id: userId,
  });
  if (!rpcError) return;

  const isMissingRpc =
    rpcError.code === 'PGRST202' ||
    /could not find the function|function public\.delete_student_account_registration|schema cache/i.test(
      rpcError.message
    );
  if (!isMissingRpc) {
    throw new Error(`ไม่สามารถลบ/ยกเลิกคำขอสมัครนักเรียนได้: ${rpcError.message}`);
  }

  // Fallback to service-role endpoint (/api/student-credentials or Edge Function)
  // because authenticated clients intentionally do not have direct DELETE privilege on user_profiles.
  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (accessToken) {
    const expressAttempt = await callExpressStudentCredentials(accessToken, {
      operation: 'delete_account',
      schoolId,
      userId,
    });
    if (expressAttempt.ok) return;
    if (!expressAttempt.unreachable) {
      throw new Error(`ไม่สามารถลบ/ยกเลิกคำขอสมัครนักเรียนได้: ${expressAttempt.message}`);
    }
  }

  try {
    await invokeStudentCredentialManager({ operation: 'delete_account', schoolId, userId });
    return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ไม่สามารถลบ/ยกเลิกคำขอสมัครนักเรียนได้: ${message} (หรือรัน migration 20261128000001_delete_student_account_rpc.sql ใน Supabase)`
    );
  }
}

export async function cancelPendingSchoolRegistrationInSupabase(
  userId: string,
  schoolId: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error: rpcError } = await client.rpc('cancel_pending_school_registration', {
    target_user_id: userId,
    target_school_id: schoolId,
  });
  if (rpcError) throw new Error(`ไม่สามารถยกเลิกคำขอสมัครโรงเรียนได้: ${rpcError.message}`);
}

export async function listSuperAdminAccounts(
  limit = 100,
  offset = 0
): Promise<SuperAdminAccount[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { data, error } = await client.rpc('list_super_admin_accounts', {
    page_limit: limit,
    page_offset: offset,
  });
  if (error) throw new Error(`Could not load user accounts: ${error.message}`);
  return (data || []) as SuperAdminAccount[];
}

