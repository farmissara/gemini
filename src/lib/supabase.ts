import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  School, 
  Student, 
  Teacher,
  Course, 
  GradeRecord, 
  AttendanceRecord, 
  AttendanceStatus,
  AttendanceCheckType,
  TuitionInvoice, 
  Announcement,
  CampusGateGeofence,
  SchoolPeriodTime,
  TimetableSlot,
  LeaveRequest,
  LeaveStatus,
  PeriodAttendanceRecord,
  UserRole,
  Assignment,
  HomeworkSubmission,
} from '../types';
import { DEFAULT_SCHOOL_PERIODS } from './schoolPeriods';
import { loadCachedSchoolPeriods, saveCachedSchoolPeriods } from './schoolCustomPresets';
import { parseSlotTeachersFromRaw, serializeSlotTeacherForDb } from './timetableTeachers';
import { sanitizeSchoolCampusGates } from './schoolGps';
import { getCourseType, inferCourseLearningArea } from './courseClassification';
import { loadSchoolSnapshot, saveSchoolSnapshot } from './offlineSchoolCache';
import { getLocalDateString } from './date';

const STORAGE_KEY_URL = 'eduverse_supabase_url';
const STORAGE_KEY_ANON = 'eduverse_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; key: string; isCustom: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = 
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 
    '';

  // Project environment settings take precedence over legacy browser overrides.
  // This prevents stale localStorage credentials from silently pointing the app
  // at a different Supabase project after .env.local or deployment settings change.
  if (envUrl.trim() && envKey.trim()) {
    return { url: envUrl.trim(), key: envKey.trim(), isCustom: false };
  }

  const customUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) : null;
  if (customUrl?.trim() && customKey?.trim()) {
    return { url: customUrl.trim(), key: customKey.trim(), isCustom: true };
  }

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

export {
  loadSupabaseSchemaSql,
  loadSupabasePatchMigrationSql,
  loadStaffInviteRpcSql,
} from './sqlMigrations';

function isMissingTableError(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01' || /schema cache|could not find the table/i.test(error.message);
}

function parseAssignmentStatus(value: unknown): Assignment['status'] {
  if (value === 'active' || value === 'closed') return value;
  throw new Error('Invalid assignment status returned from Supabase.');
}

function parseHomeworkStatus(value: unknown): HomeworkSubmission['status'] {
  if (value === 'submitted' || value === 'late' || value === 'pending' || value === 'graded') return value;
  throw new Error('Invalid homework submission status returned from Supabase.');
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
  assignments: Assignment[];
  homeworkSubmissions: HomeworkSubmission[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  schoolPeriods: SchoolPeriodTime[];
  campusGates: CampusGateGeofence[];
  timetableSlots: TimetableSlot[];
  leaveRequests: LeaveRequest[];
  periodAttendance: PeriodAttendanceRecord[];
  attendanceLoadedRange?: { start: string; end: string };
  loadedFromCache?: boolean;
}

const ATTENDANCE_SELECT = 'id, school_id, student_id, user_name, record_type, date, time, status, checkin_method, photo_url, remarks, line_notification_sent';
const ATTENDANCE_PAGE_SIZE = 1000;
const RECENT_ATTENDANCE_DAYS = 30;

type AttendanceDbRow = {
  id: string;
  school_id: string;
  student_id: string;
  user_name: string | null;
  record_type: string | null;
  date: string;
  time: string;
  status: string;
  checkin_method: string | null;
  photo_url: string | null;
  remarks: string | null;
  line_notification_sent: boolean | null;
};

function mapAttendanceDbRow(row: AttendanceDbRow): AttendanceRecord {
  const photoStoragePath = row.photo_url || undefined;
  return {
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    userName: row.user_name || undefined,
    recordType: (row.record_type || 'check_in') as AttendanceCheckType,
    date: row.date,
    time: row.time,
    status: row.status as AttendanceStatus,
    checkinMethod: row.checkin_method as AttendanceRecord['checkinMethod'],
    // Signed links are requested lazily by AttendancePhoto when visible.
    photoUrl: photoStoragePath,
    photoStoragePath,
    remarks: row.remarks || undefined,
    lineNotificationSent: Boolean(row.line_notification_sent),
  };
}

function getRecentAttendanceRange(): { start: string; end: string } {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (RECENT_ATTENDANCE_DAYS - 1));
  return { start: getLocalDateString(startDate), end: getLocalDateString(endDate) };
}

export async function loadAttendanceRangeFromSupabase(
  schoolId: string,
  startDate?: string | null,
  endDate?: string | null,
  studentId?: string,
): Promise<AttendanceRecord[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase ยังเชื่อมต่อไม่ได้');
  const rows: AttendanceDbRow[] = [];
  for (let offset = 0; ; offset += ATTENDANCE_PAGE_SIZE) {
    let query = client.from('attendance')
      .select(ATTENDANCE_SELECT)
      .eq('school_id', schoolId)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .range(offset, offset + ATTENDANCE_PAGE_SIZE - 1);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw new Error(`Could not load attendance history: ${error.message}`);
    const page = (data || []) as AttendanceDbRow[];
    rows.push(...page);
    if (page.length < ATTENDANCE_PAGE_SIZE) break;
  }
  return rows.map(mapAttendanceDbRow);
}

export async function loadSchoolData(schoolId: string, userId: string): Promise<SchoolData> {
  try {
    const data = await loadSchoolDataFromSupabase(schoolId);
    try {
      await saveSchoolSnapshot(userId, schoolId, data);
    } catch (cacheError) {
      console.warn('Could not update the local school data snapshot:', cacheError);
    }
    return data;
  } catch (remoteError) {
    try {
      const snapshot = await loadSchoolSnapshot(userId, schoolId);
      if (snapshot) {
        console.warn('Supabase is unavailable; opening the last saved local school snapshot.');
        return { ...snapshot.data, loadedFromCache: true };
      }
    } catch (cacheError) {
      console.warn('Could not read the local school data snapshot:', cacheError);
    }
    throw remoteError;
  }
}

async function loadSchoolDataFromSupabase(schoolId: string): Promise<SchoolData> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase ยังเชื่อมต่อไม่ได้ จึงกำลังลองเปิดข้อมูลสำรองในเครื่อง');
  }

  // Keep these projections aligned with the row mappings below. A number of
  // school tables have grown optional/profile fields over time, and selecting
  // every column sends those fields to every user on every school load.
  const attendanceLoadedRange = getRecentAttendanceRange();
  const schoolDataQueries = [
    client.from('students')
      .select('id, school_id, student_id_number, national_id, first_name_en, last_name_en, first_name_th, last_name_th, gender, date_of_birth, grade_level, room, status, avatar_url, gpa, guardian_name, guardian_relation, guardian_phone, guardian_email, line_user_id, line_linked, line_notify_enabled, enrolled_date')
      .eq('school_id', schoolId),
    client.from('courses')
      .select('id, school_id, code, title_en, title_th, category, course_type, learning_area, credits, weekly_hours, total_hours, min_attendance_hours, teacher_name, teacher_email, department, schedule, room, academic_year, semester, enrolled_student_ids, description, cover_image')
      .eq('school_id', schoolId),
    client.from('grades')
      .select('id, school_id, student_id, course_id, academic_year, semester, midterm_score, final_score, assignment_score, quiz_score, total_score, letter_grade, grade_point')
      .eq('school_id', schoolId),
    client.from('attendance')
      .select(ATTENDANCE_SELECT)
      .eq('school_id', schoolId)
      .gte('date', attendanceLoadedRange.start)
      .lte('date', attendanceLoadedRange.end)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .range(0, ATTENDANCE_PAGE_SIZE - 1),
    client.from('invoices')
      .select('id, school_id, invoice_number, student_id, semester, academic_year, issue_date, due_date, total_amount, status, items, payment_method, paid_at, receipt_number, slip_image_url, slip_submitted_at, slip_status, slip_reject_reason, slip_amount, slip_reference_note')
      .eq('school_id', schoolId),
    client.from('announcements')
      .select('id, school_id, title, content, category, target_audience, published_at, author, author_role, pinned, line_broadcast_sent, resend_email_sent')
      .eq('school_id', schoolId),
  ] as const;
  const results = await Promise.all(
    schoolDataQueries
  );
  const failedQuery = results.find((result) => result.error);
  if (failedQuery?.error) {
    if (isMissingTableError(failedQuery.error)) {
      console.warn('Supabase tables are not installed yet; showing an empty school until the database is set up.');
      return {
        students: [],
        teachers: [],
        courses: [],
        assignments: [],
        homeworkSubmissions: [],
        grades: [],
        attendance: [],
        invoices: [],
        announcements: [],
        schoolPeriods: DEFAULT_SCHOOL_PERIODS,
        campusGates: [],
        timetableSlots: [],
        leaveRequests: [],
        periodAttendance: [],
      };
    }
    throw new Error(`Could not load school data: ${failedQuery.error.message}`);
  }

  const initialAttendanceResult = results[3];
  const attendanceRows = [...(initialAttendanceResult.data || [])] as AttendanceDbRow[];
  if (attendanceRows.length === ATTENDANCE_PAGE_SIZE) {
    for (let offset = ATTENDANCE_PAGE_SIZE; ; offset += ATTENDANCE_PAGE_SIZE) {
      const { data, error } = await client.from('attendance')
        .select(ATTENDANCE_SELECT)
        .eq('school_id', schoolId)
        .gte('date', attendanceLoadedRange.start)
        .lte('date', attendanceLoadedRange.end)
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .range(offset, offset + ATTENDANCE_PAGE_SIZE - 1);
      if (error) throw new Error(`Could not load recent attendance: ${error.message}`);
      const page = (data || []) as AttendanceDbRow[];
      attendanceRows.push(...page);
      if (page.length < ATTENDANCE_PAGE_SIZE) break;
    }
  }

  const teacherResult = await client.from('teachers')
    .select('id, school_id, teacher_id_number, full_name_th, full_name_en, gender, email, phone, avatar_url, academic_degree, major, minor, academic_standing, position_title, reports_to_teacher_id, department, teacher_license_no, teaching_subjects, homeroom_classes, teaching_grades, is_school_admin, line_user_id, line_linked, other_skills, certifications, teaching_experience_years, pa_score, self_development_plan, pa_portfolio')
    .eq('school_id', schoolId);
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
  const cachedPeriods = loadCachedSchoolPeriods(schoolId);
  const savedPeriods = new Map<number, SchoolPeriodTime>(
    (schoolPeriodsResult.data || []).map((row) => {
      const cachedMatch = cachedPeriods?.find((c) => c.periodNumber === row.period_number);
      return [
        row.period_number,
        {
          periodNumber: row.period_number,
          startTime: String(row.start_time).slice(0, 5),
          endTime: String(row.end_time).slice(0, 5),
          isBreak: Boolean(row.is_break),
          ...(cachedMatch?.labelTh ? { labelTh: cachedMatch.labelTh } : {}),
          ...(cachedMatch?.labelEn ? { labelEn: cachedMatch.labelEn } : {}),
        },
      ];
    })
  );
  if (cachedPeriods) {
    cachedPeriods.forEach((cp) => {
      if (!savedPeriods.has(cp.periodNumber)) {
        savedPeriods.set(cp.periodNumber, cp);
      }
    });
  }
  const schoolPeriods: SchoolPeriodTime[] = savedPeriods.size > 0
    ? [...savedPeriods.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
    : DEFAULT_SCHOOL_PERIODS;
  const campusGates: CampusGateGeofence[] = sanitizeSchoolCampusGates(
    (campusGatesResult.data || []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      nameTh: row.name_th,
      nameEn: row.name_en,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      radiusMeters: Number(row.radius_meters),
      isPrimary: Boolean(row.is_primary),
      type: row.type,
      isActive: Boolean(row.is_active),
    })),
    schoolId
  );
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
    positionTitle: row.position_title || '',
    reportsToTeacherId: row.reports_to_teacher_id || undefined,
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

  const [studentResult, courseResult, gradeResult, , invoiceResult, announcementResult] = results;
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
    courseType: getCourseType({ courseType: row.course_type, category: row.category }),
    learningArea: inferCourseLearningArea({
      learningArea: row.learning_area,
      category: row.category,
      department: row.department || '',
      code: row.code || '',
      titleTh: row.title_th || '',
      titleEn: row.title_en || '',
    }),
    credits: Number(row.credits || 0),
    weeklyHours: row.weekly_hours == null ? undefined : Number(row.weekly_hours),
    totalHours: row.total_hours == null ? undefined : Number(row.total_hours),
    minAttendanceHours: row.min_attendance_hours == null ? undefined : Number(row.min_attendance_hours),
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
  const attendance: AttendanceRecord[] = attendanceRows.map(mapAttendanceDbRow);
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
    slipImageUrl: row.slip_image_url || undefined,
    slipSubmittedAt: row.slip_submitted_at || undefined,
    slipStatus: row.slip_status || undefined,
    slipRejectReason: row.slip_reject_reason || undefined,
    slipAmount: row.slip_amount == null ? undefined : Number(row.slip_amount),
    slipReferenceNote: row.slip_reference_note || undefined,
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

  const [timetableResult, leaveResult, periodAttResult] = await Promise.all([
    client.from('timetable_slots')
      .select('id, school_id, academic_year, semester, day_of_week, period_number, start_time, end_time, course_id, course_code, course_title_th, course_title_en, teacher_name, room, classroom, color_tag, credits, total_semester_hours')
      .eq('school_id', schoolId),
    client.from('leave_requests')
      .select('id, school_id, user_id, user_name, user_role, grade_level_or_department, leave_scope, period_number, course_id, course_code, course_title, substitute_teacher_id, substitute_teacher_name, cc_emails_or_roles, leave_type, start_date, end_date, reason, attachment_url, status, approved_by, approval_remarks, created_at, updated_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false }),
    client.from('period_attendance')
      .select('id, school_id, course_id, course_code, period_number, time_slot, date, student_id, status, record_type, recorded_by, check_method, notes')
      .eq('school_id', schoolId)
      .order('date', { ascending: false }),
  ]);
  if (timetableResult.error) {
    if (!isMissingTableError(timetableResult.error)) {
      throw new Error(`Could not load timetable slots: ${timetableResult.error.message}`);
    }
    console.warn('Timetable slots table is not installed yet; using empty or local slots.');
  }
  if (leaveResult.error && !isMissingTableError(leaveResult.error)) {
    throw new Error(`Could not load leave requests: ${leaveResult.error.message}`);
  }
  if (periodAttResult.error && !isMissingTableError(periodAttResult.error)) {
    throw new Error(`Could not load period attendance: ${periodAttResult.error.message}`);
  }
  const [assignmentResult, submissionResult] = await Promise.all([
    client.from('school_assignments')
      .select('id, school_id, course_id, course_code, title_th, title_en, description, due_date, points, status')
      .eq('school_id', schoolId)
      .order('due_date'),
    client.from('homework_submissions')
      .select('id, school_id, assignment_id, assignment_title, course_code, course_title_th, student_id, student_name, student_room, due_date, submitted_at, status, file_attachment, text_submission, score, max_score, teacher_feedback, graded_at, graded_by')
      .eq('school_id', schoolId)
      .order('submitted_at', { ascending: false }),
  ]);
  if (assignmentResult.error && !isMissingTableError(assignmentResult.error)) {
    throw new Error(`Could not load assignments: ${assignmentResult.error.message}`);
  }
  if (submissionResult.error && !isMissingTableError(submissionResult.error)) {
    throw new Error(`Could not load homework submissions: ${submissionResult.error.message}`);
  }
  if (assignmentResult.error || submissionResult.error) {
    console.warn('Homework tables are not installed yet; assignments and submissions are unavailable until the migration is applied.');
  }
  const timetableSlots: TimetableSlot[] = (timetableResult.data || []).map((row) => {
    const parsedTeachers = parseSlotTeachersFromRaw(row.teacher_name || '');
    return {
      id: row.id,
      schoolId: row.school_id,
      academicYear: row.academic_year || undefined,
      semester: row.semester || undefined,
      dayOfWeek: row.day_of_week,
      periodNumber: Number(row.period_number),
      startTime: String(row.start_time).slice(0, 5),
      endTime: String(row.end_time).slice(0, 5),
      courseId: row.course_id || undefined,
      courseCode: row.course_code || '',
      courseTitleTh: row.course_title_th || '',
      courseTitleEn: row.course_title_en || '',
      teacherName: parsedTeachers.teacherName,
      ...(parsedTeachers.coTeacherName ? { coTeacherName: parsedTeachers.coTeacherName } : {}),
      room: row.room || '',
      classRoom: row.classroom || '',
      colorTag: row.color_tag || 'sky',
      credits: row.credits == null ? 1.5 : Number(row.credits),
      totalSemesterHours: Number(row.total_semester_hours || 60),
    };
  });
  const leaveRequests: LeaveRequest[] = (leaveResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role === 'teacher' ? 'teacher' : 'student',
    gradeLevelOrDepartment: row.grade_level_or_department || undefined,
    leaveScope: row.leave_scope === 'period_hourly' ? 'period_hourly' : 'full_day',
    periodNumber: row.period_number == null ? undefined : Number(row.period_number),
    courseId: row.course_id || undefined,
    courseCode: row.course_code || undefined,
    courseTitle: row.course_title || undefined,
    substituteTeacherId: row.substitute_teacher_id || undefined,
    substituteTeacherName: row.substitute_teacher_name || undefined,
    ccEmailsOrRoles: row.cc_emails_or_roles || undefined,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    attachmentUrl: row.attachment_url || undefined,
    status: row.status,
    approvedBy: row.approved_by || undefined,
    approvalRemarks: row.approval_remarks || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
  }));
  const periodAttendance: PeriodAttendanceRecord[] = (periodAttResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    courseId: row.course_id,
    courseCode: row.course_code || '',
    periodNumber: Number(row.period_number),
    timeSlot: row.time_slot || '',
    date: row.date,
    studentId: row.student_id,
    status: row.status,
    recordType: row.record_type === 'check_out' ? 'check_out' : 'check_in',
    verifiedByTeacherId: row.recorded_by || 'teacher',
    verifiedByTeacherName: row.recorded_by || 'ครูผู้สอน',
    checkMethod:
      row.check_method === 'student_mobile' || row.check_method === 'qr_code'
        ? row.check_method
        : 'teacher_proxy',
    remarks: row.notes || undefined,
  }));
  const homeworkSubmissions: HomeworkSubmission[] = (submissionResult.data || []).map((row) => {
    const rawAttachment: unknown = row.file_attachment;
    let fileAttachment: HomeworkSubmission['fileAttachment'];
    if (rawAttachment && typeof rawAttachment === 'object' && !Array.isArray(rawAttachment)) {
      const attachment = rawAttachment as Record<string, unknown>;
      if (
        typeof attachment.name === 'string' &&
        typeof attachment.size === 'string' &&
        typeof attachment.type === 'string'
      ) {
        fileAttachment = {
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
        };
      }
    }
    return {
      id: row.id,
      schoolId: row.school_id,
      assignmentId: row.assignment_id,
      assignmentTitle: row.assignment_title,
      courseCode: row.course_code || '',
      courseTitleTh: row.course_title_th || '',
      studentId: row.student_id,
      studentName: row.student_name || '',
      studentRoom: row.student_room || '',
      dueDate: row.due_date,
      submittedAt: row.submitted_at || undefined,
      status: parseHomeworkStatus(row.status),
      ...(fileAttachment ? { fileAttachment } : {}),
      textSubmission: row.text_submission || undefined,
      score: row.score == null ? undefined : Number(row.score),
      maxScore: Number(row.max_score || 0),
      teacherFeedback: row.teacher_feedback || undefined,
      gradedAt: row.graded_at || undefined,
      gradedBy: row.graded_by || undefined,
    };
  });
  const submittedStudentIdsByAssignment = new Map<string, Set<string>>();
  homeworkSubmissions.forEach((submission) => {
    if (submission.status === 'pending') return;
    const studentIds = submittedStudentIdsByAssignment.get(submission.assignmentId) || new Set<string>();
    studentIds.add(submission.studentId);
    submittedStudentIdsByAssignment.set(submission.assignmentId, studentIds);
  });
  const assignments: Assignment[] = (assignmentResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    courseId: row.course_id,
    courseCode: row.course_code || '',
    titleTh: row.title_th,
    titleEn: row.title_en || '',
    description: row.description || '',
    dueDate: row.due_date,
    points: Number(row.points || 0),
    maxScore: Number(row.points || 0),
    status: parseAssignmentStatus(row.status),
    submittedStudentIds: [...(submittedStudentIdsByAssignment.get(row.id) || [])],
  }));

  return {
    students,
    teachers,
    courses,
    assignments,
    homeworkSubmissions,
    grades,
    attendance,
    invoices,
    announcements,
    schoolPeriods,
    campusGates,
    timetableSlots,
    leaveRequests,
    periodAttendance,
    attendanceLoadedRange,
  };
}

export async function saveSchoolAssignmentToDb(
  schoolId: string,
  assignment: Assignment,
  createdBy?: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot save assignment: Supabase is not configured.');

  const { error } = await client.from('school_assignments').upsert({
    id: assignment.id,
    school_id: schoolId,
    course_id: assignment.courseId,
    course_code: assignment.courseCode || '',
    title_th: assignment.titleTh,
    title_en: assignment.titleEn,
    description: assignment.description || '',
    due_date: assignment.dueDate,
    points: assignment.maxScore ?? assignment.points,
    status: assignment.status,
    created_by: createdBy || null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    const detail = isMissingTableError(error)
      ? 'Run the teacher homework workflow migration before creating assignments.'
      : error.message;
    throw new Error(`Could not save assignment: ${detail}`);
  }
}

export async function saveHomeworkSubmissionToDb(
  schoolId: string,
  submission: HomeworkSubmission
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot submit homework: Supabase is not configured.');

  const { error } = await client.from('homework_submissions').insert({
    id: submission.id,
    school_id: schoolId,
    assignment_id: submission.assignmentId,
    student_id: submission.studentId,
    assignment_title: submission.assignmentTitle,
    course_code: submission.courseCode,
    course_title_th: submission.courseTitleTh,
    student_name: submission.studentName,
    student_room: submission.studentRoom,
    due_date: submission.dueDate,
    submitted_at: submission.submittedAt || new Date().toISOString(),
    status: submission.status,
    file_attachment: submission.fileAttachment || null,
    text_submission: submission.textSubmission || null,
    score: submission.score ?? null,
    max_score: submission.maxScore,
    teacher_feedback: submission.teacherFeedback || null,
    graded_at: submission.gradedAt || null,
    graded_by: submission.gradedBy || null,
  });
  if (error) {
    const detail = isMissingTableError(error)
      ? 'Run the teacher homework workflow migration before submitting homework.'
      : error.message;
    throw new Error(`Could not save homework submission: ${detail}`);
  }
}

export async function saveHomeworkGradeToDb(
  schoolId: string,
  submissionId: string,
  score: number,
  feedback: string,
  gradedBy: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot save grade: Supabase is not configured.');

  const { data, error } = await client
    .from('homework_submissions')
    .update({
      score,
      teacher_feedback: feedback,
      status: 'graded',
      graded_at: new Date().toISOString(),
      graded_by: gradedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('school_id', schoolId)
    .eq('id', submissionId)
    .select('id')
    .maybeSingle();
  if (error) {
    const detail = isMissingTableError(error)
      ? 'Run the teacher homework workflow migration before grading submissions.'
      : error.message;
    throw new Error(`Could not save homework grade: ${detail}`);
  }
  if (!data) throw new Error('Could not save homework grade: submission not found or access denied.');
}

export async function saveSchoolPeriodTimes(
  schoolId: string,
  periods: SchoolPeriodTime[]
): Promise<void> {
  // Always persist full custom periods (including extended periods > 7, extra breaks, and custom labels) locally
  saveCachedSchoolPeriods(schoolId, periods);

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
  if (error) {
    // Fallback for remote schemas still enforcing CHECK (period_number BETWEEN 0 AND 7) and ((period_number = 0) = is_break)
    const isConstraintError =
      error.message.includes('check') ||
      error.message.includes('constraint') ||
      error.code === '23514';
    if (!isConstraintError) {
      throw new Error(`Could not save school period times: ${error.message}`);
    }
    const compatRows = rows.filter(
      (r) =>
        r.period_number >= 0 &&
        r.period_number <= 7 &&
        (r.period_number === 0) === r.is_break
    );
    if (compatRows.length > 0) {
      const { error: compatError } = await client.from('school_period_times').upsert(compatRows);
      if (compatError) {
        throw new Error(`Could not save school period times: ${compatError.message}`);
      }
    }
    return;
  }

  const { data: savedPeriods, error: loadError } = await client
    .from('school_period_times')
    .select('period_number')
    .eq('school_id', schoolId);
  if (loadError) throw new Error(`Could not verify school period times: ${loadError.message}`);

  const retainedPeriodNumbers = new Set(periods.map((period) => period.periodNumber));
  const removedPeriodNumbers = (savedPeriods || [])
    .map((period) => period.period_number)
    .filter((periodNumber) => !retainedPeriodNumbers.has(periodNumber));
  if (removedPeriodNumbers.length > 0) {
    const { error: deleteError } = await client
      .from('school_period_times')
      .delete()
      .eq('school_id', schoolId)
      .in('period_number', removedPeriodNumbers);
    if (deleteError) throw new Error(`Could not remove deleted school periods: ${deleteError.message}`);
  }
}

export async function saveSchoolCampusGates(
  schoolId: string,
  gates: CampusGateGeofence[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const cleanedGates = sanitizeSchoolCampusGates(gates, schoolId);
  const rows = cleanedGates.map((gate) => ({
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
  if (rows.length > 0) {
    const { error } = await client.from('school_campus_gates').upsert(rows);
    if (error) {
      if (isMissingTableError(error)) return false;
      throw new Error(`Could not save check-in points: ${error.message}`);
    }
  }

  const { data: existingGates, error: existingError } = await client
    .from('school_campus_gates')
    .select('id')
    .eq('school_id', schoolId);
  if (existingError) {
    if (isMissingTableError(existingError)) return false;
    throw new Error(`Could not verify saved check-in points: ${existingError.message}`);
  }
  const retainedIds = new Set(cleanedGates.map((gate) => gate.id));
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

export async function saveQueuedAttendanceToDb(record: {
  id: string;
  schoolId: string;
  studentId: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  checkinMethod: AttendanceRecord['checkinMethod'];
  remarks?: string;
  recordType?: AttendanceCheckType;
  userName?: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is unavailable.');
  const baseRow = {
    id: record.id,
    school_id: record.schoolId,
    student_id: record.studentId,
    date: record.date,
    time: record.time,
    status: record.status,
    checkin_method: record.checkinMethod,
    remarks: record.remarks || null,
    line_notification_sent: false,
  };
  const { error } = await client.from('attendance').upsert({
    ...baseRow,
    record_type: record.recordType || 'check_in',
    user_name: record.userName || null,
  });
  if (!error) return;
  if (
    error.code === 'PGRST204' || error.code === '42703' ||
    /record_type|user_name|schema cache|could not find the '.*' column/i.test(error.message)
  ) {
    const fallback = await client.from('attendance').upsert(baseRow);
    if (!fallback.error) return;
    throw new Error(`Attendance sync failed: ${fallback.error.message}`);
  }
  throw new Error(`Attendance sync failed: ${error.message}`);
}

function mapTeacherToDb(teacher: Teacher, schoolId: string) {
  return {
    id: teacher.id,
    school_id: schoolId,
    teacher_id_number: teacher.teacherIdNumber,
    full_name_th: teacher.fullNameTh,
    full_name_en: teacher.fullNameEn,
    gender: teacher.gender,
    email: teacher.email,
    phone: teacher.phone,
    avatar_url: teacher.avatarUrl,
    academic_degree: teacher.academicDegree,
    major: teacher.major,
    minor: teacher.minor || null,
    academic_standing: teacher.academicStanding,
    position_title: teacher.positionTitle || null,
    reports_to_teacher_id: teacher.reportsToTeacherId || null,
    department: teacher.department,
    teacher_license_no: teacher.teacherLicenseNo,
    teaching_subjects: teacher.teachingSubjects || [],
    homeroom_classes: teacher.homeroomClasses || [],
    teaching_grades: teacher.teachingGrades || [],
    is_school_admin: Boolean(teacher.isSchoolAdmin),
    line_user_id: teacher.lineUserId || null,
    line_linked: Boolean(teacher.lineLinked),
    other_skills: teacher.otherSkills || [],
    certifications: teacher.certifications || [],
    teaching_experience_years: teacher.teachingExperienceYears ?? null,
    pa_score: teacher.paScore ?? null,
    self_development_plan: teacher.selfDevelopmentPlan || null,
    pa_portfolio: teacher.paPortfolio || [],
  };
}

export async function saveTeachersToDb(schoolId: string, teachers: Teacher[]): Promise<void> {
  if (teachers.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('teachers')
    .upsert(teachers.map((teacher) => mapTeacherToDb(teacher, schoolId)), { onConflict: 'id' });
  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('ตาราง teachers ยังไม่มีใน Supabase กรุณารัน SQL Migration เพิ่มตาราง teachers');
    }
    throw new Error(`ไม่สามารถบันทึกข้อมูลครูลง Supabase ได้: ${error.message}`);
  }
}

// Convert camelCase models to snake_case Postgres columns and back
export async function deleteCoursesFromDb(schoolId: string, courseIds: string[]): Promise<void> {
  if (courseIds.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  // Clean up dependent grades and timetable links first
  const { error: gradeErr } = await client
    .from('grades')
    .delete()
    .eq('school_id', schoolId)
    .in('course_id', courseIds);
  if (gradeErr && !isMissingTableError(gradeErr)) {
    throw new Error(`Could not clean up course grades: ${gradeErr.message}`);
  }

  const { error: slotErr } = await client
    .from('timetable_slots')
    .update({ course_id: null })
    .eq('school_id', schoolId)
    .in('course_id', courseIds);
  if (slotErr && !isMissingTableError(slotErr)) {
    console.warn('Could not clear course_id on timetable_slots:', slotErr.message);
  }

  const { error } = await client
    .from('courses')
    .delete()
    .eq('school_id', schoolId)
    .in('id', courseIds);
  if (error) throw new Error(`Could not delete course records: ${error.message}`);
}

export async function deleteStaleGradesFromDb(schoolId: string, gradeIds: string[]): Promise<void> {
  if (gradeIds.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('grades')
    .delete()
    .eq('school_id', schoolId)
    .in('id', gradeIds);
  if (error) throw new Error(`Could not delete stale grade records: ${error.message}`);
}

export async function updateCourseEnrollmentInDb(
  schoolId: string,
  courseId: string,
  enrolledStudentIds: string[]
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('courses')
    .update({ enrolled_student_ids: enrolledStudentIds })
    .eq('school_id', schoolId)
    .eq('id', courseId);
  if (error) throw new Error(`Could not update course enrollment in Supabase: ${error.message}`);
}

export async function deleteGradesForEnrollmentFromDb(
  schoolId: string,
  courseId: string,
  studentIds: string[]
): Promise<void> {
  if (studentIds.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('grades')
    .delete()
    .eq('school_id', schoolId)
    .eq('course_id', courseId)
    .in('student_id', studentIds);
  if (error && !isMissingTableError(error)) {
    throw new Error(`Could not remove enrollment grade records: ${error.message}`);
  }
}

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
  changedIds?: {
    students?: string[];
    teachers?: string[];
    courses?: string[];
    grades?: string[];
    attendance?: string[];
    invoices?: string[];
    announcements?: string[];
  };
}): Promise<{ success: boolean; message: string; warnings?: string[] }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      message: `บันทึกข้อมูลในเซสชันเบราว์เซอร์สำเร็จ (${payload.students.length} นักเรียน, ${payload.teachers?.length || 0} ครู, ${payload.courses.length} รายวิชา)`,
    };
  }

  const warnings: string[] = [];
  let syncedTeachersCount = 0;
  const changedIdSets = payload.changedIds ? {
    students: new Set(payload.changedIds.students || []),
    teachers: new Set(payload.changedIds.teachers || []),
    courses: new Set(payload.changedIds.courses || []),
    grades: new Set(payload.changedIds.grades || []),
    attendance: new Set(payload.changedIds.attendance || []),
    invoices: new Set(payload.changedIds.invoices || []),
    announcements: new Set(payload.changedIds.announcements || []),
  } : null;
  const shouldSyncRow = (table: keyof NonNullable<typeof changedIdSets>, id: string) =>
    !changedIdSets || changedIdSets[table].has(id);
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
      })).filter((row) => shouldSyncRow('students', row.id));
      if (studentRows.length > 0) {
        const { error: stuErr } = await client.from('students').upsert(studentRows);
        if (stuErr) throw new Error(`Students sync error: ${stuErr.message}`);
      }
    }

    // 2.5 Upsert Teachers (HRMS & DPA)
    if (['super_admin', 'admin'].includes(payload.role) && payload.teachers && payload.teachers.length > 0) {
      const teacherRows = payload.teachers
        .map((teacher) => mapTeacherToDb(teacher, payload.school.id))
        .filter((row) => shouldSyncRow('teachers', row.id));
      const { error: tErr } = teacherRows.length > 0
        ? await client.from('teachers').upsert(teacherRows)
        : { error: null };
      if (tErr) {
        if (isMissingTableError(tErr)) {
          warnings.push('ตาราง teachers ยังไม่มีใน Supabase จึงยังไม่ได้บันทึกข้อมูลครู กรุณารัน SQL Migration เพิ่มตาราง teachers');
        } else {
          throw new Error(`Teachers sync error: ${tErr.message}`);
        }
      } else {
        syncedTeachersCount = teacherRows.length;
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
        course_type: getCourseType(c) || null,
        learning_area: inferCourseLearningArea(c) || null,
        credits: c.credits,
        weekly_hours: c.weeklyHours ?? null,
        total_hours: c.totalHours ?? null,
        min_attendance_hours: c.minAttendanceHours ?? null,
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
      })).filter((row) => shouldSyncRow('courses', row.id));
      if (courseRows.length > 0) {
        const { error: courseErr } = await client.from('courses').upsert(courseRows);
        if (courseErr) throw new Error(`Courses sync error: ${courseErr.message}`);
      }
    }

    // 4. Upsert Grades
    if (payload.grades.length > 0) {
      const studentIds = new Set(payload.students.map((student) => student.id));
      const studentIdsByNumber = new Map<string, string>();
      const ambiguousStudentNumbers = new Set<string>();
      payload.students.forEach((student) => {
        const studentNumber = student.studentIdNumber.trim().toLowerCase();
        if (!studentNumber || ambiguousStudentNumbers.has(studentNumber)) return;
        const existingId = studentIdsByNumber.get(studentNumber);
        if (existingId && existingId !== student.id) {
          studentIdsByNumber.delete(studentNumber);
          ambiguousStudentNumbers.add(studentNumber);
        } else {
          studentIdsByNumber.set(studentNumber, student.id);
        }
      });

      const resolvedStudentIds: (string | undefined)[] = [];
      const unresolvedStudentIds = new Set<string>();
      payload.grades.forEach((grade) => {
        const gradeStudentId = grade.studentId.trim();
        const studentId = studentIds.has(gradeStudentId)
          ? gradeStudentId
          : studentIdsByNumber.get(gradeStudentId.toLowerCase());
        resolvedStudentIds.push(studentId);
        if (!studentId) unresolvedStudentIds.add(gradeStudentId || '(ว่าง)');
      });
      if (unresolvedStudentIds.size > 0) {
        const examples = Array.from(unresolvedStudentIds).slice(0, 5).join(', ');
        throw new Error(
          `Grades sync error: ${unresolvedStudentIds.size} student reference(s) do not match a unique student in this school's roster: ${examples}. Verify the grade student IDs and remove stale grades for deleted students.`
        );
      }

      const gradeRows = payload.grades.map((g, index) => {
        const studentId = resolvedStudentIds[index];
        if (!studentId) throw new Error(`Missing student ID for grade ${g.id}`);
        return {
          id: g.id,
          school_id: payload.school.id,
          student_id: studentId,
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
        };
      }).filter((row) => shouldSyncRow('grades', row.id));
      if (gradeRows.length > 0) {
        const { error: gradeErr } = await client.from('grades').upsert(gradeRows);
        if (gradeErr) throw new Error(`Grades sync error: ${gradeErr.message}`);
      }
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
      })).filter((row) => shouldSyncRow('attendance', row.id));
      if (attRows.length === 0) {
        // Nothing in this collection changed.
      } else {
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
          })).filter((row) => shouldSyncRow('attendance', row.id));
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
    }

    // 6. Upsert Invoices (with fallback if slip columns migration is not yet applied)
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
        slip_image_url: i.slipImageUrl || null,
        slip_submitted_at: i.slipSubmittedAt || null,
        slip_status: i.slipStatus || 'none',
        slip_reject_reason: i.slipRejectReason || null,
        slip_amount: i.slipAmount ?? null,
        slip_reference_note: i.slipReferenceNote || null,
      })).filter((row) => shouldSyncRow('invoices', row.id));
      if (invRows.length === 0) {
        // Nothing in this collection changed.
      } else {
        const { error: invErr } = await client.from('invoices').upsert(invRows);
        if (
          invErr &&
          (invErr.code === 'PGRST204' ||
            invErr.code === '42703' ||
            /slip_image_url|slip_status|schema cache|could not find the '.*' column/i.test(invErr.message))
        ) {
          const baseInvRows = payload.invoices.map((i) => ({
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
          })).filter((row) => shouldSyncRow('invoices', row.id));
          const retryInv = await client.from('invoices').upsert(baseInvRows);
          if (retryInv.error) throw new Error(`Invoices sync error: ${retryInv.error.message}`);
        } else if (invErr) {
          throw new Error(`Invoices sync error: ${invErr.message}`);
        }
      }
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
      })).filter((row) => shouldSyncRow('announcements', row.id));
      if (annRows.length > 0) {
        const { error: annErr } = await client.from('announcements').upsert(annRows);
        if (annErr) throw new Error(`Announcements sync error: ${annErr.message}`);
      }
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
  if (schoolIds.length === 0) return result;

  const { data, error } = await client.rpc('get_super_admin_school_counts', {
    target_school_ids: schoolIds,
  });
  if (error) throw new Error(`Could not load school counts: ${error.message}`);
  for (const row of (data || []) as Array<{
    school_id: string;
    students_count: number;
    teachers_count: number;
  }>) {
    result[row.school_id] = {
      studentsCount: Number(row.students_count),
      teachersCount: Number(row.teachers_count),
    };
  }
  return result;
}

/**
 * Permanently deletes a student from Supabase and updates local storage
 */
export async function deleteStudentFromDb(schoolId: string, studentId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  // Clean up dependent student records in database before removing student row
  const dependentTables = ['grades', 'attendance', 'period_attendance', 'invoices'] as const;
  for (const table of dependentTables) {
    const { error: depErr } = await client
      .from(table)
      .delete()
      .eq('school_id', schoolId)
      .eq('student_id', studentId);
    if (depErr && !isMissingTableError(depErr)) {
      throw new Error(`Could not clean ${table} for deleted student: ${depErr.message}`);
    }
  }

  // Unlink any user_profiles bound to this student record
  const { error: unlinkErr } = await client
    .from('user_profiles')
    .update({ student_id: null })
    .eq('school_id', schoolId)
    .eq('student_id', studentId);
  if (unlinkErr && !isMissingTableError(unlinkErr)) {
    console.warn('Could not unlink user_profiles for deleted student:', unlinkErr.message);
  }

  // Strip studentId from courses.enrolled_student_ids in Supabase
  const { data: schoolCourseRows } = await client
    .from('courses')
    .select('id, enrolled_student_ids')
    .eq('school_id', schoolId);
  if (Array.isArray(schoolCourseRows)) {
    for (const row of schoolCourseRows) {
      const currentIds: string[] = Array.isArray(row.enrolled_student_ids) ? row.enrolled_student_ids : [];
      if (currentIds.includes(studentId)) {
        await client
          .from('courses')
          .update({ enrolled_student_ids: currentIds.filter((id) => id !== studentId) })
          .eq('school_id', schoolId)
          .eq('id', row.id);
      }
    }
  }

  const { error } = await client
    .from('students')
    .delete()
    .eq('school_id', schoolId)
    .eq('id', studentId);
  if (error) throw new Error(`Could not delete student from Supabase: ${error.message}`);
}

/**
 * Permanently deletes a teacher from Supabase and updates local storage
 */
export async function deleteTeacherFromDb(schoolId: string, teacherId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { error: reportingError } = await client
    .from('teachers')
    .update({ reports_to_teacher_id: null })
    .eq('school_id', schoolId)
    .eq('reports_to_teacher_id', teacherId);
  if (reportingError) {
    throw new Error(`Could not clear staff reporting links before deleting teacher: ${reportingError.message}`);
  }
  const { error } = await client
    .from('teachers')
    .delete()
    .eq('school_id', schoolId)
    .eq('id', teacherId);
  if (error) throw new Error(`Could not delete teacher from Supabase: ${error.message}`);
}

export async function uploadSchoolLogo(schoolId: string, file: File): Promise<string> {
  const mimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
  if (!mimeTypes.has(file.type)) {
    throw new Error('เลือกไฟล์โลโก้ชนิด PNG, JPEG หรือ WebP เท่านั้น');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('ไฟล์โลโก้ต้องมีขนาดไม่เกิน 2 MB');
  }

  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const path = `${schoolId}/logo`;
  const { error: uploadError } = await client.storage
    .from('school-logos')
    .upload(path, file, {
      cacheControl: '0',
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw new Error(`ไม่สามารถอัปโหลดโลโก้โรงเรียนได้: ${uploadError.message}`);

  const publicUrl = client.storage.from('school-logos').getPublicUrl(path).data.publicUrl;
  const versionedUrl = `${publicUrl}?v=${Date.now()}`;
  const { data, error } = await client
    .from('schools')
    .update({ logo_url: versionedUrl })
    .eq('id', schoolId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`อัปโหลดโลโก้แล้วแต่บันทึกข้อมูลโรงเรียนไม่สำเร็จ: ${error.message}`);
  if (!data) throw new Error('ไม่พบโรงเรียนหรือไม่มีสิทธิ์เปลี่ยนโลโก้');

  return versionedUrl;
}

/**
 * Saves timetable slots for a school to local storage and Supabase if table exists
 */
export async function saveTimetableSlotsToDb(schoolId: string, slots: TimetableSlot[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const rows = slots.map((s) => ({
    id: s.id,
    school_id: schoolId,
    academic_year: s.academicYear || null,
    semester: s.semester || null,
    day_of_week: s.dayOfWeek,
    period_number: s.periodNumber,
    start_time: s.startTime,
    end_time: s.endTime,
    course_id: s.courseId || null,
    course_code: s.courseCode,
    course_title_th: s.courseTitleTh,
    course_title_en: s.courseTitleEn,
    teacher_name: serializeSlotTeacherForDb(s.teacherName, s.coTeacherName),
    room: s.room,
    classroom: s.classRoom,
    color_tag: s.colorTag || 'sky',
    credits: s.credits ?? 1.5,
    total_semester_hours: s.totalSemesterHours || 60,
  }));

  if (rows.length > 0) {
    const { error } = await client.from('timetable_slots').upsert(rows);
    if (error) throw new Error(`Could not save timetable slots to Supabase: ${error.message}`);
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`eduverse_timetable_slots_${schoolId}`, JSON.stringify(slots));
    } catch (err) {
      console.warn('Could not cache timetable slots locally:', err);
    }
  }
}

/**
 * Deletes a single timetable slot from Supabase
 */
export async function deleteTimetableSlotFromDb(schoolId: string, slotId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { error } = await client
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('id', slotId);
  if (error) throw new Error(`Could not delete timetable slot from Supabase: ${error.message}`);
}

export async function uploadSchoolAttachment(
  schoolId: string,
  folder: string,
  fileOrDataUrl: File | string
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client || !schoolId) return null;

  try {
    let blob: Blob;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (typeof fileOrDataUrl === 'string') {
      if (!fileOrDataUrl.startsWith('data:')) return fileOrDataUrl;
      const mimeMatch = /^data:([^;]+);/.exec(fileOrDataUrl);
      if (mimeMatch?.[1]) {
        contentType = mimeMatch[1];
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('pdf')) ext = 'pdf';
      }
      blob = await (await fetch(fileOrDataUrl)).blob();
    } else {
      blob = fileOrDataUrl;
      contentType = fileOrDataUrl.type || 'image/jpeg';
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else if (contentType.includes('pdf')) ext = 'pdf';
    }

    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '');
    const storagePath = `${schoolId}/${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await client.storage
      .from('school-attachments')
      .upload(storagePath, blob, { contentType, upsert: false });
    if (error) {
      console.warn('[Storage] Could not upload attachment to school-attachments:', error.message);
      return null;
    }

    return client.storage.from('school-attachments').getPublicUrl(storagePath).data.publicUrl;
  } catch (err) {
    console.warn('[Storage] Attachment upload fallback triggered:', err);
    return null;
  }
}

export async function saveLeaveRequestToDb(schoolId: string, req: LeaveRequest): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('leave_requests').upsert({
    id: req.id,
    school_id: schoolId,
    user_id: req.userId,
    user_name: req.userName,
    user_role: req.userRole,
    grade_level_or_department: req.gradeLevelOrDepartment || null,
    leave_scope: req.leaveScope || 'full_day',
    period_number: req.periodNumber ?? null,
    course_id: req.courseId || null,
    course_code: req.courseCode || null,
    course_title: req.courseTitle || null,
    substitute_teacher_id: req.substituteTeacherId || null,
    substitute_teacher_name: req.substituteTeacherName || null,
    cc_emails_or_roles: Array.isArray(req.ccEmailsOrRoles)
      ? req.ccEmailsOrRoles.join(', ')
      : req.ccEmailsOrRoles || null,
    leave_type: req.leaveType,
    start_date: req.startDate,
    end_date: req.endDate,
    reason: req.reason,
    attachment_url: req.attachmentUrl || null,
    status: req.status,
    approved_by: req.approvedBy || null,
    approval_remarks: req.approvalRemarks || null,
    created_at: req.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (isMissingTableError(error)) return false;
    throw new Error(`ไม่สามารถบันทึกใบลาลงฐานข้อมูลได้: ${error.message}`);
  }
  return true;
}

export async function updateLeaveRequestStatusInDb(
  schoolId: string,
  reqId: string,
  status: LeaveStatus,
  approvedBy: string,
  approvalRemarks?: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('leave_requests')
    .update({
      status,
      approved_by: approvedBy,
      approval_remarks: approvalRemarks || null,
      updated_at: new Date().toISOString(),
    })
    .eq('school_id', schoolId)
    .eq('id', reqId);
  if (error) {
    if (isMissingTableError(error)) return false;
    throw new Error(`ไม่สามารถอัปเดตสถานะใบลาได้: ${error.message}`);
  }
  return true;
}

export async function savePeriodAttendanceBatchToDb(
  schoolId: string,
  records: PeriodAttendanceRecord[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || records.length === 0) return false;

  const rows = records.map((r) => ({
    id: r.id,
    school_id: schoolId,
    student_id: r.studentId,
    course_id: r.courseId,
    course_code: r.courseCode || '',
    period_number: r.periodNumber,
    date: r.date,
    time_slot: r.timeSlot || '',
    status: r.status,
    check_method: r.checkMethod || 'teacher_proxy',
    record_type: r.recordType || 'check_in',
    recorded_by: r.verifiedByTeacherName || r.verifiedByTeacherId || null,
    notes: r.remarks || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client
    .from('period_attendance')
    .upsert(rows, { onConflict: 'school_id,student_id,course_id,date,period_number,record_type' });
  if (error) {
    if (isMissingTableError(error)) return false;
    throw new Error(`ไม่สามารถบันทึกการเช็คชื่อรายคาบได้: ${error.message}`);
  }
  return true;
}

export async function submitInvoiceSlipToDb(
  schoolId: string,
  invoiceId: string,
  slipDataUrlOrUrl: string,
  note: string
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const uploadedUrl = await uploadSchoolAttachment(schoolId, 'slips', slipDataUrlOrUrl);
  const finalUrl = uploadedUrl || slipDataUrlOrUrl;

  const { error } = await client.rpc('submit_invoice_slip', {
    target_school_id: schoolId,
    target_invoice_id: invoiceId,
    target_slip_url: finalUrl,
    target_note: note,
  });
  if (error) {
    if (
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      /could not find the function|submit_invoice_slip/i.test(error.message)
    ) {
      console.warn('[Billing] submit_invoice_slip RPC not installed yet; kept locally:', error.message);
      return uploadedUrl;
    }
    throw new Error(`ไม่สามารถส่งหลักฐานสลิปได้: ${error.message}`);
  }
  return finalUrl;
}


