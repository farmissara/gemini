import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  School, 
  Student, 
  Teacher,
  Course, 
  GradeRecord, 
  AttendanceRecord, 
  TuitionInvoice, 
  Announcement,
  CampusGateGeofence,
  SchoolPeriodTime,
  UserRole,
} from '../types';
import schemaSql from '../../supabase/schema.sql?raw';
import patchMigrationSql from '../../supabase/migrations/20261111_patch_all_latest_migrations.sql?raw';
import { DEFAULT_SCHOOL_PERIODS } from './schoolPeriods';

const STORAGE_KEY_URL = 'eduverse_supabase_url';
const STORAGE_KEY_ANON = 'eduverse_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; key: string; isCustom: boolean } {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) : null;

  if (customUrl && customKey) {
    return { url: customUrl.trim(), key: customKey.trim(), isCustom: true };
  }

  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = 
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 
    '';

  return {
    url: envUrl.trim(),
    key: envKey.trim(),
    isCustom: false,
  };
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveCustomSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, key.trim());
    cachedClient = null;
  }
}

export function clearCustomSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    cachedClient = null;
  }
}

export const SUPABASE_SCHEMA_SQL = schemaSql;
export const SUPABASE_PATCH_MIGRATION_SQL = patchMigrationSql;

function isMissingTableError(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01' || /schema cache|could not find the table/i.test(error.message);
}

export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
  latencyMs?: number;
  tablesFound?: string[];
  tablesNeedCreation?: boolean;
}> {
  const client = getSupabaseClient();
  const { url } = getSupabaseCredentials();

  if (!client || !url) {
    return {
      ok: false,
      message: 'Supabase URL or Anon Key is missing. Please provide your Supabase project credentials.',
    };
  }

  const startTime = performance.now();
  try {
    // Attempt to query schools table
    const { data, error } = await client.from('schools').select('id, code, name_th').limit(1);

    const latency = Math.round(performance.now() - startTime);

    if (error) {
      // If table does not exist or schema cache not loaded (PGRST205 or 42P01)
      const isMissingTable = 
        error.code === 'PGRST205' || 
        error.code === '42P01' || 
        error.message.includes('schema cache') || 
        error.message.includes('Could not find the table') || 
        error.message.includes('relation "public.schools" does not exist');

      if (isMissingTable) {
        return {
          ok: false,
          tablesNeedCreation: true,
          message: `เชื่อมต่อ Supabase สำเร็จแล้ว (${latency}ms) แต่ยังไม่ได้สร้างตาราง public.schools (Code: ${error.code || 'PGRST205'}) กรุณากดปุ่มคัดลอก SQL ด้านล่างไปรันใน Supabase SQL Editor`,
          latencyMs: latency,
          tablesFound: [],
        };
      }
      return {
        ok: false,
        message: `Supabase Error: ${error.message} (Code: ${error.code || 'unknown'})`,
        latencyMs: latency,
      };
    }

    return {
      ok: true,
      tablesNeedCreation: false,
      message: `เชื่อมต่อ Supabase PostgreSQL สำเร็จ! ค่า Latency: ${latency}ms (พบข้อมูลตาราง schools แล้ว)`,
      latencyMs: latency,
      tablesFound: ['schools'],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Network/Connection error: ${message}`,
    };
  }
}

export interface SchoolData {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  schoolPeriods: SchoolPeriodTime[];
  campusGates: CampusGateGeofence[];
}

export async function loadSchoolData(schoolId: string): Promise<SchoolData> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const tableNames = ['students', 'courses', 'grades', 'attendance', 'invoices', 'announcements'] as const;
  const results = await Promise.all(
    tableNames.map((table) => client.from(table).select('*').eq('school_id', schoolId))
  );
  const failedQuery = results.find((result) => result.error);
  if (failedQuery?.error) {
    throw new Error(`Could not load school data: ${failedQuery.error.message}`);
  }

  const teacherResult = await client.from('teachers').select('*').eq('school_id', schoolId);
  if (teacherResult.error) {
    if (!isMissingTableError(teacherResult.error)) {
      throw new Error(`Could not load teachers: ${teacherResult.error.message}`);
    }
    console.warn('Teachers table is not installed yet; loading the rest of the school data.');
  }
  const schoolPeriodsResult = await client
    .from('school_period_times')
    .select('period_number, start_time, end_time, is_break')
    .eq('school_id', schoolId)
    .order('period_number');
  const campusGatesResult = await client
    .from('school_campus_gates')
    .select('id, school_id, name_th, name_en, latitude, longitude, radius_meters, is_primary, type, is_active')
    .eq('school_id', schoolId);
  if (campusGatesResult.error && !isMissingTableError(campusGatesResult.error)) {
    throw new Error(`Could not load check-in points: ${campusGatesResult.error.message}`);
  }
  if (schoolPeriodsResult.error && !isMissingTableError(schoolPeriodsResult.error)) {
    throw new Error(`Could not load school period times: ${schoolPeriodsResult.error.message}`);
  }
  const savedPeriods = new Map(
    (schoolPeriodsResult.data || []).map((row) => [
      row.period_number,
      {
        periodNumber: row.period_number,
        startTime: String(row.start_time).slice(0, 5),
        endTime: String(row.end_time).slice(0, 5),
        isBreak: Boolean(row.is_break),
      },
    ])
  );
  const schoolPeriods: SchoolPeriodTime[] = DEFAULT_SCHOOL_PERIODS.map(
    (period) => savedPeriods.get(period.periodNumber) || period
  );
  const campusGates: CampusGateGeofence[] = (campusGatesResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    nameTh: row.name_th,
    nameEn: row.name_en,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    radiusMeters: Number(row.radius_meters),
    isPrimary: Boolean(row.is_primary),
    type: row.type,
    isActive: Boolean(row.is_active),
  }));
  const teachers: Teacher[] = (teacherResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    teacherIdNumber: row.teacher_id_number || '',
    fullNameTh: row.full_name_th || '',
    fullNameEn: row.full_name_en || '',
    gender: row.gender || 'other',
    email: row.email || '',
    phone: row.phone || '',
    avatarUrl: row.avatar_url || '',
    academicDegree: row.academic_degree || '',
    major: row.major || '',
    minor: row.minor || undefined,
    academicStanding: row.academic_standing || '',
    department: row.department || '',
    teacherLicenseNo: row.teacher_license_no || '',
    teachingSubjects: Array.isArray(row.teaching_subjects) ? row.teaching_subjects : [],
    homeroomClasses: Array.isArray(row.homeroom_classes) ? row.homeroom_classes : [],
    teachingGrades: Array.isArray(row.teaching_grades) ? row.teaching_grades : [],
    isSchoolAdmin: Boolean(row.is_school_admin),
    lineUserId: row.line_user_id || undefined,
    lineLinked: Boolean(row.line_linked),
    otherSkills: Array.isArray(row.other_skills) ? row.other_skills : [],
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    teachingExperienceYears: row.teaching_experience_years == null ? undefined : Number(row.teaching_experience_years),
    paScore: row.pa_score == null ? undefined : Number(row.pa_score),
    selfDevelopmentPlan: row.self_development_plan || undefined,
    paPortfolio: Array.isArray(row.pa_portfolio) ? row.pa_portfolio : [],
  }));

  const [studentResult, courseResult, gradeResult, attendanceResult, invoiceResult, announcementResult] = results;
  const students: Student[] = (studentResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    studentIdNumber: row.student_id_number,
    nationalId: row.national_id || undefined,
    firstNameEn: row.first_name_en,
    lastNameEn: row.last_name_en,
    firstNameTh: row.first_name_th,
    lastNameTh: row.last_name_th,
    gender: row.gender,
    dateOfBirth: row.date_of_birth || '',
    gradeLevel: row.grade_level || '',
    room: row.room || '',
    status: row.status,
    avatarUrl: row.avatar_url || '',
    gpa: Number(row.gpa || 0),
    guardianName: row.guardian_name || '',
    guardianRelation: row.guardian_relation || '',
    guardianPhone: row.guardian_phone || '',
    guardianEmail: row.guardian_email || '',
    lineUserId: row.line_user_id || undefined,
    lineLinked: Boolean(row.line_linked),
    lineNotifyEnabled: Boolean(row.line_notify_enabled),
    enrolledDate: row.enrolled_date || '',
  }));
  const courses: Course[] = (courseResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    code: row.code,
    titleEn: row.title_en,
    titleTh: row.title_th,
    category: row.category,
    credits: Number(row.credits || 0),
    teacherName: row.teacher_name || '',
    teacherEmail: row.teacher_email || '',
    department: row.department || '',
    schedule: row.schedule || '',
    room: row.room || '',
    academicYear: row.academic_year || '',
    semester: row.semester,
    enrolledStudentIds: row.enrolled_student_ids || [],
    description: row.description || '',
    coverImage: row.cover_image || undefined,
  }));
  const grades: GradeRecord[] = (gradeResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    courseId: row.course_id,
    academicYear: row.academic_year || '',
    semester: row.semester || '',
    midtermScore: Number(row.midterm_score || 0),
    finalScore: Number(row.final_score || 0),
    assignmentScore: Number(row.assignment_score || 0),
    quizScore: Number(row.quiz_score || 0),
    totalScore: Number(row.total_score || 0),
    letterGrade: row.letter_grade,
    gradePoint: Number(row.grade_point || 0),
  }));
  const attendance: AttendanceRecord[] = await Promise.all((attendanceResult.data || []).map(async (row) => {
    const photoStoragePath: string | undefined = row.photo_url || undefined;
    let photoUrl = photoStoragePath;
    if (photoStoragePath) {
      const { data, error } = await client.storage
        .from('attendance-selfies')
        .createSignedUrl(photoStoragePath, 3600);
      if (error) throw new Error(`Could not load attendance photo: ${error.message}`);
      photoUrl = data.signedUrl;
    }

    return {
      id: row.id,
      schoolId: row.school_id,
      studentId: row.student_id,
      userName: row.user_name || undefined,
      recordType: row.record_type || 'check_in',
      date: row.date,
      time: row.time,
      status: row.status,
      checkinMethod: row.checkin_method,
      photoUrl,
      photoStoragePath,
      remarks: row.remarks || undefined,
      lineNotificationSent: Boolean(row.line_notification_sent),
    };
  }));
  const invoices: TuitionInvoice[] = (invoiceResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    invoiceNumber: row.invoice_number,
    studentId: row.student_id,
    semester: row.semester || '',
    academicYear: row.academic_year || '',
    issueDate: row.issue_date || '',
    dueDate: row.due_date || '',
    totalAmount: Number(row.total_amount || 0),
    status: row.status,
    items: row.items || [],
    paymentMethod: row.payment_method || undefined,
    paidAt: row.paid_at || undefined,
    receiptNumber: row.receipt_number || undefined,
  }));
  const announcements: Announcement[] = (announcementResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    title: row.title,
    content: row.content,
    category: row.category,
    targetAudience: row.target_audience,
    publishedAt: row.published_at || '',
    author: row.author || '',
    authorRole: row.author_role || '',
    pinned: Boolean(row.pinned),
    lineBroadcastSent: Boolean(row.line_broadcast_sent),
    resendEmailSent: Boolean(row.resend_email_sent),
  }));

  return { students, teachers, courses, grades, attendance, invoices, announcements, schoolPeriods, campusGates };
}

export async function saveSchoolPeriodTimes(
  schoolId: string,
  periods: SchoolPeriodTime[]
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const rows = periods.map((period) => ({
    school_id: schoolId,
    period_number: period.periodNumber,
    start_time: period.startTime,
    end_time: period.endTime,
    is_break: Boolean(period.isBreak),
  }));
  const { error } = await client.from('school_period_times').upsert(rows);
  if (error) throw new Error(`Could not save school period times: ${error.message}`);
}

export async function saveSchoolCampusGates(
  schoolId: string,
  gates: CampusGateGeofence[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const rows = gates.map((gate) => ({
    id: gate.id,
    school_id: schoolId,
    name_th: gate.nameTh,
    name_en: gate.nameEn,
    latitude: gate.lat,
    longitude: gate.lng,
    radius_meters: gate.radiusMeters,
    is_primary: gate.isPrimary,
    type: gate.type,
    is_active: gate.isActive ?? true,
  }));
  const { error } = await client.from('school_campus_gates').upsert(rows);
  if (error) {
    if (isMissingTableError(error)) return false;
    throw new Error(`Could not save check-in points: ${error.message}`);
  }

  const { data: existingGates, error: existingError } = await client
    .from('school_campus_gates')
    .select('id')
    .eq('school_id', schoolId);
  if (existingError) throw new Error(`Could not verify saved check-in points: ${existingError.message}`);
  const retainedIds = new Set(gates.map((gate) => gate.id));
  for (const existingGate of existingGates || []) {
    if (retainedIds.has(existingGate.id)) continue;
    const { error: deleteError } = await client
      .from('school_campus_gates')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', existingGate.id);
    if (deleteError) throw new Error(`Could not remove deleted check-in point: ${deleteError.message}`);
  }
  return true;
}

export async function saveStudentSelfAttendance(record: AttendanceRecord, userId: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  if (!record.schoolId || !record.studentId || !record.id || !record.userName) {
    throw new Error('Attendance record is missing the linked student identity.');
  }
  if (!record.photoUrl?.startsWith('data:image/jpeg;base64,')) {
    throw new Error('A real camera photo is required to save this check-in.');
  }

  const photoBlob = await (await fetch(record.photoUrl)).blob();
  const photoStoragePath = `${record.schoolId}/${userId}/${record.id}.jpg`;
  const { error: uploadError } = await client.storage
    .from('attendance-selfies')
    .upload(photoStoragePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new Error(`Could not save attendance photo: ${uploadError.message}`);

  let insertError: any = null;
  const insertPayload = {
    id: record.id,
    school_id: record.schoolId,
    student_id: record.studentId,
    date: record.date,
    time: record.time,
    status: record.status,
    checkin_method: record.checkinMethod,
    remarks: record.remarks || null,
    line_notification_sent: false,
    record_type: record.recordType || 'check_in',
    user_name: record.userName,
    photo_url: photoStoragePath,
  };

  const firstAttempt = await client.from('attendance').insert(insertPayload);
  insertError = firstAttempt.error;

  // If Supabase schema cache does not have photo_url / record_type / user_name, fallback to base columns
  if (insertError && (/photo_url|record_type|user_name|schema cache|could not find the '.*' column/i.test(insertError.message))) {
    console.warn('[Attendance] Retrying insert with base attendance columns due to missing columns in Supabase schema cache:', insertError.message);
    const fallbackAttempt = await client.from('attendance').insert({
      id: record.id,
      school_id: record.schoolId,
      student_id: record.studentId,
      date: record.date,
      time: record.time,
      status: record.status,
      checkin_method: record.checkinMethod,
      remarks: record.remarks ? `${record.remarks} [Photo: ${photoStoragePath}]` : `Photo: ${photoStoragePath}`,
      line_notification_sent: false,
    });
    insertError = fallbackAttempt.error;
  }

  if (insertError) {
    const { error: cleanupError } = await client.storage
      .from('attendance-selfies')
      .remove([photoStoragePath]);
    if (cleanupError) {
      throw new Error(`Could not save attendance: ${insertError.message}; uploaded photo cleanup failed: ${cleanupError.message}`);
    }
    throw new Error(`Could not save attendance: ${insertError.message}`);
  }

  return photoStoragePath;
}

// Convert camelCase models to snake_case Postgres columns and back
export async function syncDataToSupabase(payload: {
  school: School;
  role: UserRole;
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
}): Promise<{ success: boolean; message: string; warnings?: string[] }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not connected' };
  }

  const warnings: string[] = [];
  let syncedTeachersCount = 0;
  try {
    // School identity is provisioned by an administrator and is never upserted by the client.
    if (['super_admin', 'admin'].includes(payload.role) && payload.students.length > 0) {
      const studentRows = payload.students.map((s) => ({
        id: s.id,
        school_id: payload.school.id,
        student_id_number: s.studentIdNumber,
        national_id: s.nationalId || null,
        first_name_en: s.firstNameEn,
        last_name_en: s.lastNameEn,
        first_name_th: s.firstNameTh,
        last_name_th: s.lastNameTh,
        gender: s.gender,
        date_of_birth: s.dateOfBirth,
        grade_level: s.gradeLevel,
        room: s.room,
        status: s.status,
        avatar_url: s.avatarUrl,
        gpa: s.gpa,
        guardian_name: s.guardianName,
        guardian_relation: s.guardianRelation,
        guardian_phone: s.guardianPhone,
        guardian_email: s.guardianEmail,
        line_user_id: s.lineUserId || null,
        line_linked: s.lineLinked,
        line_notify_enabled: s.lineNotifyEnabled,
        enrolled_date: s.enrolledDate,
      }));
      const { error: stuErr } = await client.from('students').upsert(studentRows);
      if (stuErr) throw new Error(`Students sync error: ${stuErr.message}`);
    }

    // 2.5 Upsert Teachers (HRMS & DPA)
    if (['super_admin', 'admin'].includes(payload.role) && payload.teachers && payload.teachers.length > 0) {
      const teacherRows = payload.teachers.map((t) => ({
        id: t.id,
        school_id: payload.school.id,
        teacher_id_number: t.teacherIdNumber,
        full_name_th: t.fullNameTh,
        full_name_en: t.fullNameEn,
        gender: t.gender,
        email: t.email,
        phone: t.phone,
        avatar_url: t.avatarUrl,
        academic_degree: t.academicDegree,
        major: t.major,
        minor: t.minor || null,
        academic_standing: t.academicStanding,
        department: t.department,
        teacher_license_no: t.teacherLicenseNo,
        teaching_subjects: t.teachingSubjects || [],
        homeroom_classes: t.homeroomClasses || [],
        teaching_grades: t.teachingGrades || [],
        is_school_admin: Boolean(t.isSchoolAdmin),
        line_user_id: t.lineUserId || null,
        line_linked: Boolean(t.lineLinked),
        other_skills: t.otherSkills || [],
        certifications: t.certifications || [],
        teaching_experience_years: t.teachingExperienceYears ?? null,
        pa_score: t.paScore ?? null,
        self_development_plan: t.selfDevelopmentPlan || null,
        pa_portfolio: t.paPortfolio || [],
      }));
      const { error: tErr } = await client.from('teachers').upsert(teacherRows);
      if (tErr) {
        if (isMissingTableError(tErr)) {
          warnings.push('ตาราง teachers ยังไม่มีใน Supabase จึงยังไม่ได้บันทึกข้อมูลครู กรุณารัน SQL Migration เพิ่มตาราง teachers');
        } else {
          throw new Error(`Teachers sync error: ${tErr.message}`);
        }
      } else {
        syncedTeachersCount = payload.teachers.length;
      }
    }

    // 3. Upsert Courses
    if (payload.courses.length > 0) {
      const courseRows = payload.courses.map((c) => ({
        id: c.id,
        school_id: payload.school.id,
        code: c.code,
        title_en: c.titleEn,
        title_th: c.titleTh,
        category: c.category,
        credits: c.credits,
        teacher_name: c.teacherName,
        teacher_email: c.teacherEmail,
        department: c.department,
        schedule: c.schedule,
        room: c.room,
        academic_year: c.academicYear,
        semester: c.semester,
        enrolled_student_ids: c.enrolledStudentIds,
        description: c.description,
        cover_image: c.coverImage || null,
      }));
      const { error: courseErr } = await client.from('courses').upsert(courseRows);
      if (courseErr) throw new Error(`Courses sync error: ${courseErr.message}`);
    }

    // 4. Upsert Grades
    if (payload.grades.length > 0) {
      const gradeRows = payload.grades.map((g) => ({
        id: g.id,
        school_id: payload.school.id,
        student_id: g.studentId,
        course_id: g.courseId,
        academic_year: g.academicYear,
        semester: g.semester,
        midterm_score: g.midtermScore,
        final_score: g.finalScore,
        assignment_score: g.assignmentScore,
        quiz_score: g.quizScore,
        total_score: g.totalScore,
        letter_grade: g.letterGrade,
        grade_point: g.gradePoint,
      }));
      const { error: gradeErr } = await client.from('grades').upsert(gradeRows);
      if (gradeErr) throw new Error(`Grades sync error: ${gradeErr.message}`);
    }

    // 5. Upsert Attendance with fallback if table schema lacks newer columns (photo_url, record_type, user_name)
    if (payload.attendance.length > 0) {
      const attRows = payload.attendance.map((a) => ({
        id: a.id,
        school_id: payload.school.id,
        student_id: a.studentId,
        date: a.date,
        time: a.time,
        status: a.status,
        checkin_method: a.checkinMethod,
        remarks: a.remarks || null,
        line_notification_sent: a.lineNotificationSent,
        record_type: a.recordType || 'check_in',
        user_name: a.userName || null,
        photo_url: a.photoStoragePath || null,
      }));
      let { error: attErr } = await client.from('attendance').upsert(attRows);
      if (
        attErr &&
        (attErr.code === 'PGRST204' ||
          attErr.code === '42703' ||
          /photo_url|record_type|user_name|schema cache|could not find the '.*' column/i.test(attErr.message))
      ) {
        console.warn('[Attendance] Retrying attendance upsert with base columns:', attErr.message);
        const baseRows = payload.attendance.map((a) => ({
          id: a.id,
          school_id: payload.school.id,
          student_id: a.studentId,
          date: a.date,
          time: a.time,
          status: a.status,
          checkin_method: a.checkinMethod,
          remarks: a.remarks || null,
          line_notification_sent: a.lineNotificationSent,
        }));
        const retryResult = await client.from('attendance').upsert(baseRows);
        if (retryResult.error) {
          throw new Error(`Attendance sync error: ${retryResult.error.message}`);
        } else {
          warnings.push('ตาราง attendance ขาดคอลัมน์ photo_url ใน Supabase จึงบันทึกข้อมูลแบบมาตรฐานเรียบร้อยแล้ว (แนะนำให้รัน SQL Migration เพิ่มคอลัมน์ photo_url)');
          attErr = null;
        }
      } else if (attErr) {
        throw new Error(`Attendance sync error: ${attErr.message}`);
      }
    }

    // 6. Upsert Invoices
    if (['super_admin', 'admin'].includes(payload.role) && payload.invoices.length > 0) {
      const invRows = payload.invoices.map((i) => ({
        id: i.id,
        school_id: payload.school.id,
        invoice_number: i.invoiceNumber,
        student_id: i.studentId,
        semester: i.semester,
        academic_year: i.academicYear,
        issue_date: i.issueDate,
        due_date: i.dueDate,
        total_amount: i.totalAmount,
        status: i.status,
        items: i.items,
        payment_method: i.paymentMethod || null,
        paid_at: i.paidAt || null,
        receipt_number: i.receiptNumber || null,
      }));
      const { error: invErr } = await client.from('invoices').upsert(invRows);
      if (invErr) throw new Error(`Invoices sync error: ${invErr.message}`);
    }

    // 7. Upsert Announcements
    if (payload.announcements.length > 0) {
      const annRows = payload.announcements.map((an) => ({
        id: an.id,
        school_id: payload.school.id,
        title: an.title,
        content: an.content,
        category: an.category,
        target_audience: an.targetAudience,
        published_at: an.publishedAt,
        author: an.author,
        author_role: an.authorRole,
        pinned: an.pinned,
        line_broadcast_sent: an.lineBroadcastSent,
        resend_email_sent: an.resendEmailSent,
      }));
      const { error: annErr } = await client.from('announcements').upsert(annRows);
      if (annErr) throw new Error(`Announcements sync error: ${annErr.message}`);
    }

    // 8. Automatically keep schools.students_count and teachers_count up to date in Supabase
    try {
      await client.from('schools').update({
        students_count: payload.students.length,
        teachers_count: payload.teachers?.length || 0,
      }).eq('id', payload.school.id);
    } catch {
      // Non-fatal if schema differs
    }

    const syncedMessage = `Successfully synchronized ${payload.students.length} students, ${syncedTeachersCount} teachers, ${payload.courses.length} courses, ${payload.grades.length} grades, ${payload.attendance.length} attendance records to Supabase!`;
    return {
      success: true,
      message: syncedMessage,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

/**
 * Save school GPS coordinates & geofence radius directly into Supabase schools table
 */
export async function saveSchoolGpsCoordinates(
  schoolId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('schools')
      .update({
        latitude,
        longitude,
        geofence_radius_meters: radiusMeters,
      })
      .eq('id', schoolId);

    if (error) {
      console.warn('Could not update school coordinates in Supabase schools table:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to save school coordinates to Supabase:', err);
    return false;
  }
}

/**
 * Fetch actual real-time student and teacher counts for all schools from Supabase
 */
export async function fetchSchoolCounts(schoolIds: string[]): Promise<Record<string, { studentsCount: number; teachersCount: number }>> {
  const result: Record<string, { studentsCount: number; teachersCount: number }> = {};
  for (const id of schoolIds) {
    result[id] = { studentsCount: 0, teachersCount: 0 };
  }

  const client = getSupabaseClient();
  if (!client) return result;

  try {
    const [{ data: studentRows }, { data: teacherRows }] = await Promise.all([
      client.from('students').select('school_id'),
      client.from('teachers').select('school_id'),
    ]);

    (studentRows || []).forEach((row: { school_id: string }) => {
      if (row.school_id) {
        if (!result[row.school_id]) result[row.school_id] = { studentsCount: 0, teachersCount: 0 };
        result[row.school_id].studentsCount += 1;
      }
    });

    (teacherRows || []).forEach((row: { school_id: string }) => {
      if (row.school_id) {
        if (!result[row.school_id]) result[row.school_id] = { studentsCount: 0, teachersCount: 0 };
        result[row.school_id].teachersCount += 1;
      }
    });
  } catch (err) {
    console.warn('Error fetching school counts from Supabase:', err);
  }

  return result;
}
