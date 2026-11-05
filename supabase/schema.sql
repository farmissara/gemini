-- =========================================================================
-- EduVerse - Supabase PostgreSQL Schema & RLS Policies
-- Compatible with Supabase SQL Editor
-- =========================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SCHOOLS TABLE
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

-- 2. STUDENTS TABLE
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

-- 3. COURSES TABLE
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

-- 4. GRADES TABLE
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

-- 5. ATTENDANCE TABLE
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

-- 6. INVOICES TABLE
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

-- 7. ANNOUNCEMENTS TABLE
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

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_school ON public.courses(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON public.announcements(school_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create Open Access Policies for Web Application (Can be restricted later)
DO $$
BEGIN
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
END $$;
