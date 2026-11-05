import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  School, 
  Student, 
  Course, 
  GradeRecord, 
  AttendanceRecord, 
  TuitionInvoice, 
  Announcement 
} from '../types';

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

export const SUPABASE_SCHEMA_SQL = `-- EduVerse PostgreSQL Schema for Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT NOT NULL,
    type TEXT DEFAULT 'public',
    province TEXT DEFAULT 'กรุงเทพมหานคร',
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0284c7',
    students_count INTEGER DEFAULT 0,
    teachers_count INTEGER DEFAULT 0,
    academic_year TEXT DEFAULT '2569 (2026)',
    current_semester TEXT DEFAULT '1',
    line_oa_id TEXT DEFAULT '@eduverse_th',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id_number TEXT NOT NULL,
    national_id TEXT,
    first_name_en TEXT NOT NULL,
    last_name_en TEXT NOT NULL,
    first_name_th TEXT NOT NULL,
    last_name_th TEXT NOT NULL,
    gender TEXT DEFAULT 'other',
    date_of_birth TEXT,
    grade_level TEXT,
    room TEXT,
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    gpa NUMERIC(3,2) DEFAULT 0.00,
    guardian_name TEXT,
    guardian_relation TEXT,
    guardian_phone TEXT,
    guardian_email TEXT,
    line_user_id TEXT,
    line_linked BOOLEAN DEFAULT false,
    line_notify_enabled BOOLEAN DEFAULT false,
    enrolled_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_th TEXT NOT NULL,
    category TEXT DEFAULT 'core',
    credits NUMERIC(3,1) DEFAULT 1.0,
    teacher_name TEXT,
    teacher_email TEXT,
    department TEXT,
    schedule TEXT,
    room TEXT,
    academic_year TEXT,
    semester TEXT DEFAULT '1',
    enrolled_student_ids JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    cover_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grades (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    academic_year TEXT,
    semester TEXT,
    midterm_score NUMERIC(5,2) DEFAULT 0,
    final_score NUMERIC(5,2) DEFAULT 0,
    assignment_score NUMERIC(5,2) DEFAULT 0,
    quiz_score NUMERIC(5,2) DEFAULT 0,
    total_score NUMERIC(5,2) DEFAULT 0,
    letter_grade TEXT DEFAULT 'F',
    grade_point NUMERIC(3,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'present',
    checkin_method TEXT DEFAULT 'qr_scanner',
    remarks TEXT,
    line_notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    semester TEXT,
    academic_year TEXT,
    issue_date TEXT,
    due_date TEXT,
    total_amount NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    items JSONB DEFAULT '[]'::jsonb,
    payment_method TEXT,
    paid_at TEXT,
    receipt_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    target_audience TEXT DEFAULT 'all',
    published_at TEXT,
    author TEXT,
    author_role TEXT,
    pinned BOOLEAN DEFAULT false,
    line_broadcast_sent BOOLEAN DEFAULT false,
    resend_email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public schools access" ON public.schools;
    CREATE POLICY "Public schools access" ON public.schools FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public students access" ON public.students;
    CREATE POLICY "Public students access" ON public.students FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public courses access" ON public.courses;
    CREATE POLICY "Public courses access" ON public.courses FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public grades access" ON public.grades;
    CREATE POLICY "Public grades access" ON public.grades FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public attendance access" ON public.attendance;
    CREATE POLICY "Public attendance access" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public invoices access" ON public.invoices;
    CREATE POLICY "Public invoices access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public announcements access" ON public.announcements;
    CREATE POLICY "Public announcements access" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
END $$;`;

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

// Convert camelCase models to snake_case Postgres columns and back
export async function syncDataToSupabase(payload: {
  school: School;
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
}): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not connected' };
  }

  try {
    // 1. Upsert School
    const { error: schoolErr } = await client.from('schools').upsert({
      id: payload.school.id,
      code: payload.school.code,
      name_th: payload.school.nameTh,
      name_en: payload.school.nameEn,
      slug: payload.school.slug,
      type: payload.school.type,
      province: payload.school.province,
      address: payload.school.address,
      phone: payload.school.phone,
      email: payload.school.email,
      logo_url: payload.school.logoUrl,
      primary_color: payload.school.primaryColor,
      students_count: payload.school.studentsCount,
      teachers_count: payload.school.teachersCount,
      academic_year: payload.school.academicYear,
      current_semester: payload.school.currentSemester,
      line_oa_id: payload.school.lineOaId,
      status: payload.school.status,
    });
    if (schoolErr) throw new Error(`Schools sync error: ${schoolErr.message}`);

    // 2. Upsert Students
    if (payload.students.length > 0) {
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

    // 5. Upsert Attendance
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
      }));
      const { error: attErr } = await client.from('attendance').upsert(attRows);
      if (attErr) throw new Error(`Attendance sync error: ${attErr.message}`);
    }

    // 6. Upsert Invoices
    if (payload.invoices.length > 0) {
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

    return {
      success: true,
      message: `Successfully synchronized ${payload.students.length} students, ${payload.courses.length} courses, ${payload.grades.length} grades, ${payload.attendance.length} attendance records to Supabase!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}
