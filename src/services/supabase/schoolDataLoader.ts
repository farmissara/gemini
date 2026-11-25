import type {
  Announcement,
  Assignment,
  AttendanceRecord,
  CampusGateGeofence,
  Course,
  GradeRecord,
  HomeworkSubmission,
  LeaveRequest,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
  TuitionInvoice,
} from '../../types';
import { getCourseType, inferCourseLearningArea } from '../../lib/courseClassification';
import { getLocalDateString } from '../../lib/date';
import { loadSchoolSnapshot, saveSchoolSnapshot } from '../../lib/offlineSchoolCache';
import { loadCachedSchoolPeriods } from '../../lib/schoolCustomPresets';
import { sanitizeSchoolCampusGates } from '../../lib/schoolGps';
import { DEFAULT_SCHOOL_PERIODS } from '../../lib/schoolPeriods';
import { parseSlotTeachersFromRaw } from '../../lib/timetableTeachers';
import { getSupabaseClient, isMissingTableError } from './client';
import {
  type AttendanceDbRow,
  mapAttendanceDbRow,
  parseAssignmentStatus,
  parseHomeworkStatus,
} from './mappers';

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

const ATTENDANCE_SELECT =
  'id, school_id, student_id, user_name, record_type, date, time, status, checkin_method, photo_url, remarks, line_notification_sent';
const SUPABASE_PAGE_SIZE = 1000;
const RECENT_ATTENDANCE_DAYS = 30;

function getRecentAttendanceRange(): { start: string; end: string } {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (RECENT_ATTENDANCE_DAYS - 1));
  return { start: getLocalDateString(startDate), end: getLocalDateString(endDate) };
}

async function fetchRemainingPages<T>(
  initialRows: T[],
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  errorContext: string,
): Promise<T[]> {
  const rows = [...initialRows];
  if (rows.length < SUPABASE_PAGE_SIZE) return rows;
  for (let offset = SUPABASE_PAGE_SIZE; ; offset += SUPABASE_PAGE_SIZE) {
    const { data, error } = await fetchPage(offset, offset + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(`${errorContext}: ${error.message}`);
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
  }
  return rows;
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
  for (let offset = 0; ; offset += SUPABASE_PAGE_SIZE) {
    let query = client
      .from('attendance')
      .select(ATTENDANCE_SELECT)
      .eq('school_id', schoolId)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + SUPABASE_PAGE_SIZE - 1);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw new Error(`Could not load attendance history: ${error.message}`);
    const page = (data || []) as AttendanceDbRow[];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
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

  const STUDENTS_SELECT =
    'id, school_id, student_id_number, national_id, first_name_en, last_name_en, first_name_th, last_name_th, gender, date_of_birth, grade_level, room, status, avatar_url, gpa, guardian_name, guardian_relation, guardian_phone, guardian_email, line_user_id, line_linked, line_notify_enabled, enrolled_date';
  const COURSES_SELECT =
    'id, school_id, code, title_en, title_th, category, course_type, learning_area, credits, weekly_hours, total_hours, min_attendance_hours, teacher_name, teacher_email, department, schedule, room, academic_year, semester, enrolled_student_ids, description, cover_image';
  const GRADES_SELECT =
    'id, school_id, student_id, course_id, academic_year, semester, midterm_score, final_score, assignment_score, quiz_score, total_score, letter_grade, grade_point';
  const INVOICES_SELECT =
    'id, school_id, invoice_number, student_id, semester, academic_year, issue_date, due_date, total_amount, status, items, payment_method, paid_at, receipt_number, slip_image_url, slip_submitted_at, slip_status, slip_reject_reason, slip_amount, slip_reference_note';
  const ANNOUNCEMENTS_SELECT =
    'id, school_id, title, content, category, target_audience, published_at, author, author_role, pinned, line_broadcast_sent, resend_email_sent';
  const TEACHERS_SELECT =
    'id, school_id, teacher_id_number, full_name_th, full_name_en, gender, email, phone, avatar_url, academic_degree, major, minor, academic_standing, position_title, reports_to_teacher_id, department, teacher_license_no, teaching_subjects, homeroom_classes, teaching_grades, is_school_admin, line_user_id, line_linked, other_skills, certifications, teaching_experience_years, pa_score, self_development_plan, pa_portfolio';

  const attendanceLoadedRange = getRecentAttendanceRange();
  const schoolDataQueries = [
    client
      .from('students')
      .select(STUDENTS_SELECT)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('courses')
      .select(COURSES_SELECT)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('grades')
      .select(GRADES_SELECT)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('attendance')
      .select(ATTENDANCE_SELECT)
      .eq('school_id', schoolId)
      .gte('date', attendanceLoadedRange.start)
      .lte('date', attendanceLoadedRange.end)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('invoices')
      .select(INVOICES_SELECT)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('announcements')
      .select(ANNOUNCEMENTS_SELECT)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
  ] as const;
  const results = await Promise.all(schoolDataQueries);
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

  const [studentResult, courseResult, gradeResult, initialAttendanceResult, invoiceResult, announcementResult] = results;
  const [
    studentRows,
    courseRows,
    gradeRows,
    attendanceRows,
    invoiceRows,
    announcementRows,
  ] = await Promise.all([
    fetchRemainingPages(
      studentResult.data || [],
      (from, to) =>
        client
          .from('students')
          .select(STUDENTS_SELECT)
          .eq('school_id', schoolId)
          .order('id', { ascending: true })
          .range(from, to),
      'Could not load students',
    ),
    fetchRemainingPages(
      courseResult.data || [],
      (from, to) =>
        client
          .from('courses')
          .select(COURSES_SELECT)
          .eq('school_id', schoolId)
          .order('id', { ascending: true })
          .range(from, to),
      'Could not load courses',
    ),
    fetchRemainingPages(
      gradeResult.data || [],
      (from, to) =>
        client
          .from('grades')
          .select(GRADES_SELECT)
          .eq('school_id', schoolId)
          .order('id', { ascending: true })
          .range(from, to),
      'Could not load grades',
    ),
    fetchRemainingPages(
      (initialAttendanceResult.data || []) as AttendanceDbRow[],
      (from, to) =>
        client
          .from('attendance')
          .select(ATTENDANCE_SELECT)
          .eq('school_id', schoolId)
          .gte('date', attendanceLoadedRange.start)
          .lte('date', attendanceLoadedRange.end)
          .order('date', { ascending: false })
          .order('time', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to),
      'Could not load recent attendance',
    ),
    fetchRemainingPages(
      invoiceResult.data || [],
      (from, to) =>
        client
          .from('invoices')
          .select(INVOICES_SELECT)
          .eq('school_id', schoolId)
          .order('id', { ascending: true })
          .range(from, to),
      'Could not load invoices',
    ),
    fetchRemainingPages(
      announcementResult.data || [],
      (from, to) =>
        client
          .from('announcements')
          .select(ANNOUNCEMENTS_SELECT)
          .eq('school_id', schoolId)
          .order('id', { ascending: true })
          .range(from, to),
      'Could not load announcements',
    ),
  ]);

  const teacherResult = await client
    .from('teachers')
    .select(TEACHERS_SELECT)
    .eq('school_id', schoolId)
    .order('id', { ascending: true })
    .range(0, SUPABASE_PAGE_SIZE - 1);
  if (teacherResult.error) {
    if (!isMissingTableError(teacherResult.error)) {
      throw new Error(`Could not load teachers: ${teacherResult.error.message}`);
    }
    console.warn('Teachers table is not installed yet; loading the rest of the school data.');
  }
  const teacherRows = teacherResult.error
    ? []
    : await fetchRemainingPages(
        teacherResult.data || [],
        (from, to) =>
          client
            .from('teachers')
            .select(TEACHERS_SELECT)
            .eq('school_id', schoolId)
            .order('id', { ascending: true })
            .range(from, to),
        'Could not load teachers',
      );
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
    }),
  );
  if (cachedPeriods) {
    cachedPeriods.forEach((cp) => {
      if (!savedPeriods.has(cp.periodNumber)) {
        savedPeriods.set(cp.periodNumber, cp);
      }
    });
  }
  const schoolPeriods: SchoolPeriodTime[] =
    savedPeriods.size > 0
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
    schoolId,
  );
  const teachers: Teacher[] = teacherRows.map((row) => ({
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

  const students: Student[] = studentRows.map((row) => ({
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
  const courses: Course[] = courseRows.map((row) => ({
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
  const grades: GradeRecord[] = gradeRows.map((row) => ({
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
  const invoices: TuitionInvoice[] = invoiceRows.map((row) => ({
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
  const announcements: Announcement[] = announcementRows.map((row) => ({
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

  const TIMETABLE_SELECT =
    'id, school_id, academic_year, semester, day_of_week, period_number, start_time, end_time, course_id, course_code, course_title_th, course_title_en, teacher_name, room, classroom, color_tag, credits, total_semester_hours';
  const LEAVE_REQUESTS_SELECT =
    'id, school_id, user_id, user_name, user_role, grade_level_or_department, leave_scope, period_number, course_id, course_code, course_title, substitute_teacher_id, substitute_teacher_name, cc_emails_or_roles, leave_type, start_date, end_date, reason, attachment_url, status, approved_by, approval_remarks, created_at, updated_at';
  const PERIOD_ATTENDANCE_SELECT =
    'id, school_id, course_id, course_code, period_number, time_slot, date, student_id, status, record_type, recorded_by, check_method, notes';
  const ASSIGNMENTS_SELECT =
    'id, school_id, course_id, course_code, title_th, title_en, description, due_date, points, status';
  const SUBMISSIONS_SELECT =
    'id, school_id, assignment_id, assignment_title, course_code, course_title_th, student_id, student_name, student_room, due_date, submitted_at, status, file_attachment, text_submission, score, max_score, teacher_feedback, graded_at, graded_by';

  const [timetableResult, leaveResult, periodAttResult] = await Promise.all([
    client
      .from('timetable_slots')
      .select(TIMETABLE_SELECT)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('leave_requests')
      .select(LEAVE_REQUESTS_SELECT)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('period_attendance')
      .select(PERIOD_ATTENDANCE_SELECT)
      .eq('school_id', schoolId)
      .order('date', { ascending: false })
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
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
    client
      .from('school_assignments')
      .select(ASSIGNMENTS_SELECT)
      .eq('school_id', schoolId)
      .order('due_date')
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
    client
      .from('homework_submissions')
      .select(SUBMISSIONS_SELECT)
      .eq('school_id', schoolId)
      .order('submitted_at', { ascending: false })
      .order('id', { ascending: true })
      .range(0, SUPABASE_PAGE_SIZE - 1),
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

  const [timetableRows, leaveRows, periodAttRows, assignmentRows, submissionRows] = await Promise.all([
    timetableResult.error
      ? []
      : fetchRemainingPages(
          timetableResult.data || [],
          (from, to) =>
            client
              .from('timetable_slots')
              .select(TIMETABLE_SELECT)
              .eq('school_id', schoolId)
              .order('id', { ascending: true })
              .range(from, to),
          'Could not load timetable slots',
        ),
    leaveResult.error
      ? []
      : fetchRemainingPages(
          leaveResult.data || [],
          (from, to) =>
            client
              .from('leave_requests')
              .select(LEAVE_REQUESTS_SELECT)
              .eq('school_id', schoolId)
              .order('created_at', { ascending: false })
              .order('id', { ascending: true })
              .range(from, to),
          'Could not load leave requests',
        ),
    periodAttResult.error
      ? []
      : fetchRemainingPages(
          periodAttResult.data || [],
          (from, to) =>
            client
              .from('period_attendance')
              .select(PERIOD_ATTENDANCE_SELECT)
              .eq('school_id', schoolId)
              .order('date', { ascending: false })
              .order('id', { ascending: true })
              .range(from, to),
          'Could not load period attendance',
        ),
    assignmentResult.error
      ? []
      : fetchRemainingPages(
          assignmentResult.data || [],
          (from, to) =>
            client
              .from('school_assignments')
              .select(ASSIGNMENTS_SELECT)
              .eq('school_id', schoolId)
              .order('due_date')
              .order('id', { ascending: true })
              .range(from, to),
          'Could not load assignments',
        ),
    submissionResult.error
      ? []
      : fetchRemainingPages(
          submissionResult.data || [],
          (from, to) =>
            client
              .from('homework_submissions')
              .select(SUBMISSIONS_SELECT)
              .eq('school_id', schoolId)
              .order('submitted_at', { ascending: false })
              .order('id', { ascending: true })
              .range(from, to),
          'Could not load homework submissions',
        ),
  ]);

  const timetableSlots: TimetableSlot[] = timetableRows.map((row) => {
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
  const leaveRequests: LeaveRequest[] = leaveRows.map((row) => ({
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
  const periodAttendance: PeriodAttendanceRecord[] = periodAttRows.map((row) => ({
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
  const homeworkSubmissions: HomeworkSubmission[] = submissionRows.map((row) => {
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
  const assignments: Assignment[] = assignmentRows.map((row) => ({
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

export async function fetchSchoolCounts(
  schoolIds: string[],
): Promise<Record<string, { studentsCount: number; teachersCount: number }>> {
  const result: Record<string, { studentsCount: number; teachersCount: number }> = {};
  for (const id of schoolIds) {
    result[id] = { studentsCount: 0, teachersCount: 0 };
  }

  const client = getSupabaseClient();
  if (!client || schoolIds.length === 0) return result;

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
