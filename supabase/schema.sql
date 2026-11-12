-- =========================================================================
-- EduVerse - Supabase PostgreSQL Schema & RLS Policies
-- Compatible with Supabase SQL Editor
-- =========================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Revoke the legacy unrestricted policies before any migration can fail.
DO $$
BEGIN
    IF to_regclass('public.schools') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Public schools access" ON public.schools;
    END IF;
    IF to_regclass('public.students') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Public students access" ON public.students;
    END IF;
    IF to_regclass('public.courses') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Public courses access" ON public.courses;
    END IF;
    IF to_regclass('public.grades') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Public grades access" ON public.grades;
    END IF;
    IF to_regclass('public.attendance') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Public attendance access" ON public.attendance;
    END IF;
    IF to_regclass('public.invoices') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Public invoices access" ON public.invoices;
    END IF;
    IF to_regclass('public.announcements') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Public announcements access" ON public.announcements;
    END IF;
END $$;

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT students_id_school_unique UNIQUE (id, school_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.students'::regclass
          AND conname = 'students_id_school_unique'
    ) THEN
        ALTER TABLE public.students
            ADD CONSTRAINT students_id_school_unique UNIQUE (id, school_id);
    END IF;
END $$;

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT courses_id_school_unique UNIQUE (id, school_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.courses'::regclass
          AND conname = 'courses_id_school_unique'
    ) THEN
        ALTER TABLE public.courses
            ADD CONSTRAINT courses_id_school_unique UNIQUE (id, school_id);
    END IF;
END $$;

-- 3.1 TEACHERS TABLE (HRMS & DPA Staff System)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id_number TEXT NOT NULL,
    full_name_th TEXT NOT NULL,
    full_name_en TEXT NOT NULL,
    gender TEXT DEFAULT 'other',
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    academic_degree TEXT,
    major TEXT,
    minor TEXT,
    academic_standing TEXT,
    department TEXT,
    teacher_license_no TEXT,
    teaching_subjects JSONB DEFAULT '[]'::jsonb,
    homeroom_classes JSONB DEFAULT '[]'::jsonb,
    teaching_grades JSONB DEFAULT '[]'::jsonb,
    is_school_admin BOOLEAN DEFAULT false,
    line_user_id TEXT,
    line_linked BOOLEAN DEFAULT false,
    other_skills JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    teaching_experience_years NUMERIC(4,1) DEFAULT 0,
    pa_score NUMERIC(5,2) DEFAULT 0,
    self_development_plan TEXT,
    pa_portfolio JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT teachers_id_school_unique UNIQUE (id, school_id)
);

ALTER TABLE public.teachers
    ADD COLUMN IF NOT EXISTS pa_portfolio JSONB NOT NULL DEFAULT '[]'::jsonb;

-- School-wide bell schedule, including the lunch break (period_number = 0).
CREATE TABLE IF NOT EXISTS public.school_period_times (
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 0 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (school_id, period_number),
    CHECK (end_time > start_time),
    CHECK ((period_number = 0) = is_break)
);

CREATE TABLE IF NOT EXISTS public.school_campus_gates (
    id TEXT NOT NULL,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL CHECK (radius_meters > 0),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    type TEXT NOT NULL DEFAULT 'main_gate',
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (school_id, id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.teachers'::regclass
          AND conname = 'teachers_id_school_unique'
    ) THEN
        ALTER TABLE public.teachers
            ADD CONSTRAINT teachers_id_school_unique UNIQUE (id, school_id);
    END IF;
END $$;

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT grades_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    CONSTRAINT grades_course_school_fk
        FOREIGN KEY (course_id, school_id)
        REFERENCES public.courses(id, school_id) ON DELETE CASCADE
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
    record_type TEXT NOT NULL DEFAULT 'check_in',
    user_name TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendance_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'check_in',
    ADD COLUMN IF NOT EXISTS user_name TEXT,
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT invoices_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.grades'::regclass AND conname = 'grades_student_school_fk'
    ) THEN
        ALTER TABLE public.grades
            ADD CONSTRAINT grades_student_school_fk
            FOREIGN KEY (student_id, school_id)
            REFERENCES public.students(id, school_id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.grades'::regclass AND conname = 'grades_course_school_fk'
    ) THEN
        ALTER TABLE public.grades
            ADD CONSTRAINT grades_course_school_fk
            FOREIGN KEY (course_id, school_id)
            REFERENCES public.courses(id, school_id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.attendance'::regclass AND conname = 'attendance_student_school_fk'
    ) THEN
        ALTER TABLE public.attendance
            ADD CONSTRAINT attendance_student_school_fk
            FOREIGN KEY (student_id, school_id)
            REFERENCES public.students(id, school_id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.invoices'::regclass AND conname = 'invoices_student_school_fk'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT invoices_student_school_fk
            FOREIGN KEY (student_id, school_id)
            REFERENCES public.students(id, school_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Authenticated identity and school membership. Administrative roles must be
-- assigned by a trusted operator, never from client-provided signup metadata.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'student'
        CHECK (role IN ('super_admin', 'admin', 'teacher', 'student', 'parent')),
    student_id TEXT REFERENCES public.students(id) ON DELETE SET NULL,
    full_name_th TEXT NOT NULL DEFAULT '',
    full_name_en TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (role = 'super_admin' OR school_id IS NOT NULL),
    CONSTRAINT user_profiles_id_school_unique UNIQUE (id, school_id),
    CONSTRAINT user_profiles_status_check CHECK (status IN ('pending', 'active', 'suspended'))
);

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_profiles'::regclass
          AND conname = 'user_profiles_status_check'
    ) THEN
        ALTER TABLE public.user_profiles
            ADD CONSTRAINT user_profiles_status_check
            CHECK (status IN ('pending', 'active', 'suspended'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_profiles'::regclass
          AND conname = 'user_profiles_id_school_unique'
    ) THEN
        ALTER TABLE public.user_profiles
            ADD CONSTRAINT user_profiles_id_school_unique UNIQUE (id, school_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.parent_student_links (
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, student_id),
    CONSTRAINT parent_link_profile_school_fk
        FOREIGN KEY (profile_id, school_id)
        REFERENCES public.user_profiles(id, school_id) ON DELETE CASCADE,
    CONSTRAINT parent_link_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT school_id FROM public.user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_school_role(target_school_id TEXT, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND status = 'active'
          AND role = ANY (allowed_roles)
          AND (role = 'super_admin' OR school_id = target_school_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_student(target_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.students s
        JOIN public.user_profiles p ON p.id = auth.uid()
        WHERE s.id = target_student_id
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role = 'student'
                  AND p.school_id = s.school_id
                  AND p.student_id = s.id
              )
              OR (
                  p.role = 'parent'
                  AND EXISTS (
                  SELECT 1
                  FROM public.parent_student_links l
                  WHERE l.profile_id = p.id AND l.student_id = s.id AND l.school_id = s.school_id
                  )
              )
          )
    )
$$;

CREATE OR REPLACE FUNCTION public.link_student_account(
    target_school_id TEXT,
    target_user_id UUID,
    target_student_id TEXT
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can link student accounts';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = target_user_id
          AND profile.school_id = target_school_id
          AND profile.role = 'student'
    ) THEN
        RAISE EXCEPTION 'Student account does not belong to this school';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.students student
        WHERE student.id = target_student_id
          AND student.school_id = target_school_id
    ) THEN
        RAISE EXCEPTION 'Student record does not belong to this school';
    END IF;

    UPDATE public.user_profiles
    SET student_id = target_student_id
    WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_signup()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    signup_type TEXT := NEW.raw_user_meta_data ->> 'signup_type';
    requested_school_id TEXT := NEW.raw_user_meta_data ->> 'school_id';
    new_school_id TEXT;
    school_name_th TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_th'), '');
    school_name_en TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_en'), '');
    school_type TEXT := COALESCE(NEW.raw_user_meta_data ->> 'school_type', 'public');
    school_province TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_province'), '');
    school_slug TEXT;
    school_status TEXT;
BEGIN
    IF signup_type IS NULL AND requested_school_id IS NOT NULL THEN
        signup_type := 'student';
    END IF;
    IF signup_type IS NULL THEN
        RETURN NEW;
    END IF;

    IF signup_type = 'school_admin' THEN
        IF school_name_th IS NULL OR school_province IS NULL THEN
            RAISE EXCEPTION 'School name and province are required';
        END IF;
        IF school_type NOT IN ('public', 'private', 'international', 'demonstration') THEN
            RAISE EXCEPTION 'Invalid school type';
        END IF;

        new_school_id := 'school-' || NEW.id::TEXT;
        school_slug := TRIM(BOTH '-' FROM REGEXP_REPLACE(
            LOWER(COALESCE(school_name_en, 'school')),
            '[^a-z0-9]+',
            '-',
            'g'
        ));
        IF school_slug = '' THEN
            school_slug := 'school';
        END IF;
        school_slug := school_slug || '-' || REPLACE(NEW.id::TEXT, '-', '');
        school_status := CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active' ELSE 'pending' END;

        INSERT INTO public.schools (
            id, code, name_th, name_en, slug, type, province, email, phone, status
        ) VALUES (
            new_school_id,
            'EDU-' || UPPER(REPLACE(NEW.id::TEXT, '-', '')),
            school_name_th,
            COALESCE(school_name_en, school_name_th),
            school_slug,
            school_type,
            school_province,
            NEW.email,
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), ''),
            school_status
        );

        INSERT INTO public.user_profiles (
            id, school_id, role, full_name_th, full_name_en, phone, status
        ) VALUES (
            NEW.id,
            new_school_id,
            'admin',
            COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name_th'), ''), school_name_th),
            COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name_en'), ''), school_name_en, school_name_th),
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), ''),
            school_status
        );
    ELSIF signup_type = 'student' THEN
        IF requested_school_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.schools
            WHERE id = requested_school_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'A valid active school is required to register';
        END IF;

        INSERT INTO public.user_profiles (
            id, school_id, role, full_name_th, full_name_en, avatar_url, phone, status
        ) VALUES (
            NEW.id,
            requested_school_id,
            'student',
            COALESCE(NEW.raw_user_meta_data ->> 'full_name_th', ''),
            COALESCE(NEW.raw_user_meta_data ->> 'full_name_en', ''),
            COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
            NEW.raw_user_meta_data ->> 'phone',
            'pending'
        );
    ELSE
        RAISE EXCEPTION 'Invalid account registration type';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_verified_school_signup()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        UPDATE public.user_profiles
        SET status = 'active'
        WHERE id = NEW.id AND role = 'admin' AND status = 'pending';

        UPDATE public.schools s
        SET status = 'active'
        FROM public.user_profiles p
        WHERE p.id = NEW.id
          AND p.role = 'admin'
          AND p.school_id = s.id
          AND s.status = 'pending';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_signup();

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.activate_verified_school_signup();

DROP FUNCTION IF EXISTS public.create_student_profile_for_signup();

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_school ON public.courses(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON public.announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.user_profiles(school_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_unique_student_link
    ON public.user_profiles(student_id)
    WHERE role = 'student' AND student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON public.parent_student_links(student_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_period_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_campus_gates ENABLE ROW LEVEL SECURITY;

-- Remove the previous unrestricted policies and replace them with membership-
-- and role-scoped policies. RLS is fail-closed until a user has a profile.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public schools access" ON public.schools;
    DROP POLICY IF EXISTS "Public students access" ON public.students;
    DROP POLICY IF EXISTS "Public courses access" ON public.courses;
    DROP POLICY IF EXISTS "Public grades access" ON public.grades;
    DROP POLICY IF EXISTS "Public attendance access" ON public.attendance;
    DROP POLICY IF EXISTS "Public invoices access" ON public.invoices;
    DROP POLICY IF EXISTS "Public announcements access" ON public.announcements;
END $$;

DROP POLICY IF EXISTS "School members can read their school" ON public.schools;
CREATE POLICY "School members can read their school" ON public.schools
    FOR SELECT USING (
        status = 'active' AND auth.uid() IS NULL
        OR public.has_school_role(id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );
DROP POLICY IF EXISTS "School admins can update their school" ON public.schools;
CREATE POLICY "School admins can update their school" ON public.schools
    FOR UPDATE USING (public.has_school_role(id, ARRAY['super_admin', 'admin']))
    WITH CHECK (public.has_school_role(id, ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS "Users can read permitted profiles" ON public.user_profiles;
CREATE POLICY "Users can read permitted profiles" ON public.user_profiles
    FOR SELECT USING (
        id = auth.uid()
        OR public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Members can read school students" ON public.students;
CREATE POLICY "Members can read school students" ON public.students
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR public.can_access_student(id)
        )
    );
DROP POLICY IF EXISTS "School staff can add students" ON public.students;
CREATE POLICY "School staff can add students" ON public.students
    FOR INSERT WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );
DROP POLICY IF EXISTS "School admins can update students" ON public.students;
CREATE POLICY "School admins can update students" ON public.students
    FOR UPDATE USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']))
    WITH CHECK (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']));
DROP POLICY IF EXISTS "School admins can delete students" ON public.students;
CREATE POLICY "School admins can delete students" ON public.students
    FOR DELETE USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS "School members can read courses" ON public.courses;
CREATE POLICY "School members can read courses" ON public.courses
    FOR SELECT USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );
DROP POLICY IF EXISTS "School staff can manage courses" ON public.courses;
CREATE POLICY "School staff can manage courses" ON public.courses
    FOR ALL USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
    WITH CHECK (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

DROP POLICY IF EXISTS "School members can read teachers" ON public.teachers;
CREATE POLICY "School members can read teachers" ON public.teachers
    FOR SELECT USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );
DROP POLICY IF EXISTS "School staff can add teachers" ON public.teachers;
CREATE POLICY "School staff can add teachers" ON public.teachers
    FOR INSERT WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );
DROP POLICY IF EXISTS "School staff can update teachers" ON public.teachers;
CREATE POLICY "School staff can update teachers" ON public.teachers
    FOR UPDATE USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']))
    WITH CHECK (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']));
DROP POLICY IF EXISTS "School staff can delete teachers" ON public.teachers;
CREATE POLICY "School staff can delete teachers" ON public.teachers
    FOR DELETE USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS "School members can read school period times" ON public.school_period_times;
CREATE POLICY "School members can read school period times" ON public.school_period_times
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );
DROP POLICY IF EXISTS "School staff can manage school period times" ON public.school_period_times;
CREATE POLICY "School staff can manage school period times" ON public.school_period_times
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

DROP POLICY IF EXISTS "School members can read campus gates" ON public.school_campus_gates;
CREATE POLICY "School members can read campus gates" ON public.school_campus_gates
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );
DROP POLICY IF EXISTS "School staff can manage campus gates" ON public.school_campus_gates;
CREATE POLICY "School staff can manage campus gates" ON public.school_campus_gates
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

DROP POLICY IF EXISTS "Users can read permitted grades" ON public.grades;
CREATE POLICY "Users can read permitted grades" ON public.grades
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR public.can_access_student(student_id)
        )
    );
DROP POLICY IF EXISTS "School staff can manage grades" ON public.grades;
CREATE POLICY "School staff can manage grades" ON public.grades
    FOR ALL USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
    WITH CHECK (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

DROP POLICY IF EXISTS "Users can read permitted attendance" ON public.attendance;
CREATE POLICY "Users can read permitted attendance" ON public.attendance
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR public.can_access_student(student_id)
        )
    );
DROP POLICY IF EXISTS "School staff can manage attendance" ON public.attendance;
CREATE POLICY "School staff can manage attendance" ON public.attendance
    FOR ALL USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
    WITH CHECK (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));
DROP POLICY IF EXISTS "Students can record their own selfie attendance" ON public.attendance;
CREATE POLICY "Students can record their own selfie attendance" ON public.attendance
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'student'
        AND school_id = public.current_user_school_id()
        AND public.can_access_student(student_id)
        AND record_type IN ('check_in', 'check_out')
        AND checkin_method = 'selfie_geofence'
        AND status IN ('present', 'late')
        AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date::text
        AND user_name = (
            SELECT profile.full_name_th
            FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
        )
        AND split_part(photo_url, '/', 1) = public.current_user_school_id()
        AND split_part(photo_url, '/', 2) = auth.uid()::text
        AND split_part(photo_url, '/', 3) = id || '.jpg'
    );

DROP POLICY IF EXISTS "Users can read permitted invoices" ON public.invoices;
CREATE POLICY "Users can read permitted invoices" ON public.invoices
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR public.can_access_student(student_id)
        )
    );
DROP POLICY IF EXISTS "School admins can manage invoices" ON public.invoices;
CREATE POLICY "School admins can manage invoices" ON public.invoices
    FOR ALL USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']))
    WITH CHECK (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS "School members can read announcements" ON public.announcements;
CREATE POLICY "School members can read announcements" ON public.announcements
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR (
            target_audience = 'all'
            AND public.has_school_role(school_id, ARRAY['student', 'parent'])
        )
        OR (
            target_audience = 'students'
            AND public.has_school_role(school_id, ARRAY['student'])
        )
        OR (
            target_audience = 'parents'
            AND public.has_school_role(school_id, ARRAY['parent'])
        )
        )
    );
DROP POLICY IF EXISTS "School staff can manage announcements" ON public.announcements;
CREATE POLICY "School staff can manage announcements" ON public.announcements
    FOR ALL USING (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
    WITH CHECK (school_id IS NOT NULL AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

DROP POLICY IF EXISTS "Users can read permitted parent links" ON public.parent_student_links;
CREATE POLICY "Users can read permitted parent links" ON public.parent_student_links
    FOR SELECT USING (
        profile_id = auth.uid()
        OR public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );
DROP POLICY IF EXISTS "School admins can manage parent links" ON public.parent_student_links;
CREATE POLICY "School admins can manage parent links" ON public.parent_student_links
    FOR ALL USING (public.has_school_role(school_id, ARRAY['super_admin', 'admin']))
    WITH CHECK (public.has_school_role(school_id, ARRAY['super_admin', 'admin']));

REVOKE ALL ON public.schools, public.students, public.courses, public.grades,
    public.attendance, public.invoices, public.announcements,
    public.user_profiles, public.parent_student_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.schools TO anon;
GRANT SELECT ON public.schools, public.students, public.courses, public.grades,
    public.attendance, public.invoices, public.announcements,
    public.user_profiles, public.parent_student_links TO authenticated;
GRANT UPDATE ON public.schools TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.students, public.courses, public.grades,
    public.attendance, public.invoices, public.announcements,
    public.parent_student_links TO authenticated;
GRANT UPDATE (full_name_th, full_name_en, avatar_url, phone)
    ON public.user_profiles TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_verified_school_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_school_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_school_role(TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_student(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_student_account(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_school_role(TEXT, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_student(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_student_account(TEXT, UUID, TEXT) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_period_times TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_campus_gates TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attendance-selfies', 'attendance-selfies', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg'];

DROP POLICY IF EXISTS "Students can upload own attendance selfies" ON storage.objects;
CREATE POLICY "Students can upload own attendance selfies" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[1] = public.current_user_school_id()
        AND (storage.foldername(name))[2] = auth.uid()::text
        AND public.current_user_role() = 'student'
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
              AND profile.status = 'active'
              AND profile.role = 'student'
              AND profile.school_id = (storage.foldername(name))[1]
              AND profile.student_id IS NOT NULL
        )
    );
DROP POLICY IF EXISTS "Students can remove unattached attendance selfies" ON storage.objects;
CREATE POLICY "Students can remove unattached attendance selfies" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[2] = auth.uid()::text
        AND NOT EXISTS (
            SELECT 1
            FROM public.attendance record
            WHERE record.photo_url = name
        )
    );
DROP POLICY IF EXISTS "Users can read permitted attendance selfies" ON storage.objects;
CREATE POLICY "Users can read permitted attendance selfies" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'attendance-selfies'
        AND (
            (storage.foldername(name))[2] = auth.uid()::text
            OR public.has_school_role(
                (storage.foldername(name))[1],
                ARRAY['super_admin', 'admin', 'teacher']
            )
            OR EXISTS (
                SELECT 1
                FROM public.attendance record
                WHERE record.photo_url = name
                  AND public.can_access_student(record.student_id)
            )
        )
    );

ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('school-logos', 'school-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "Users can read school logos" ON storage.objects;
CREATE POLICY "Users can read school logos"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'school-logos');

DROP POLICY IF EXISTS "School admins upload school logos" ON storage.objects;
CREATE POLICY "School admins upload school logos"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    );

DROP POLICY IF EXISTS "School admins update school logos" ON storage.objects;
CREATE POLICY "School admins update school logos"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    )
    WITH CHECK (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    );

DROP POLICY IF EXISTS "School admins delete school logos" ON storage.objects;
CREATE POLICY "School admins delete school logos"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    );

-- Super Admin registration review. Run the corresponding migration on
-- databases that already have this schema installed.
ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approval_method TEXT;

CREATE OR REPLACE FUNCTION public.list_pending_school_registrations()
RETURNS TABLE (
    user_id UUID,
    school_id TEXT,
    email TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    school_name_th TEXT,
    school_name_en TEXT,
    province TEXT,
    registration_created_at TIMESTAMPTZ,
    email_confirmed BOOLEAN
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.user_profiles actor
        WHERE actor.id = auth.uid()
          AND actor.role = 'super_admin'
          AND actor.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access required' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        profile.id,
        school.id,
        account.email::TEXT,
        profile.full_name_th,
        profile.full_name_en,
        school.name_th,
        school.name_en,
        school.province,
        account.created_at,
        account.email_confirmed_at IS NOT NULL
    FROM public.user_profiles profile
    JOIN public.schools school ON school.id = profile.school_id
    JOIN auth.users account ON account.id = profile.id
    WHERE profile.role = 'admin'
      AND profile.status = 'pending'
      AND school.status = 'pending'
    ORDER BY account.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_pending_school_registration(target_user_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    actor_id UUID := auth.uid();
    target_school_id TEXT;
    target_email_confirmed BOOLEAN;
BEGIN
    IF actor_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.user_profiles actor
        WHERE actor.id = actor_id
          AND actor.role = 'super_admin'
          AND actor.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access required' USING ERRCODE = '42501';
    END IF;

    SELECT profile.school_id, account.email_confirmed_at IS NOT NULL
    INTO target_school_id, target_email_confirmed
    FROM public.user_profiles profile
    JOIN public.schools school ON school.id = profile.school_id
    JOIN auth.users account ON account.id = profile.id
    WHERE profile.id = target_user_id
      AND profile.role = 'admin'
      AND profile.status = 'pending'
      AND school.status = 'pending'
    FOR UPDATE OF profile, school, account;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No pending school registration found for this account';
    END IF;

    IF NOT target_email_confirmed THEN
        UPDATE auth.users
        SET email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = target_user_id
          AND email_confirmed_at IS NULL;
    END IF;

    UPDATE public.user_profiles
    SET status = 'active'
    WHERE id = target_user_id
      AND school_id = target_school_id
      AND role = 'admin'
      AND status = 'pending';

    UPDATE public.schools
    SET status = 'active',
        approved_at = NOW(),
        approved_by = actor_id,
        approval_method = CASE
            WHEN target_email_confirmed THEN 'admin_approved'
            ELSE 'admin_confirmed_email'
        END
    WHERE id = target_school_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_pending_school_registrations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_pending_school_registration(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_pending_school_registrations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pending_school_registration(UUID) TO authenticated;
