-- =========================================================================
-- EduVerse - Consolidated Idempotent Patch Migration (Safe to Re-run)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Fixes:
--   1. Missing public.teachers table (HRMS & DPA)
--   2. Missing attendance columns (record_type, user_name, photo_url) + selfie bucket
--   3. Campus gates & period times tables
--   4. Student account approval RPCs
--   5. Admin <-> Super Admin coordination messages table
--   6. Refreshes Supabase PostgREST schema cache (NOTIFY pgrst, 'reload schema')
-- =========================================================================

BEGIN;

-- 0. Ensure user_profiles.status exists for policies & approval RPCs
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 1. TEACHERS TABLE (HRMS & DPA Staff System)
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

CREATE INDEX IF NOT EXISTS idx_teachers_school ON public.teachers(school_id);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

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
    FOR UPDATE USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "School staff can delete teachers" ON public.teachers;
CREATE POLICY "School staff can delete teachers" ON public.teachers
    FOR DELETE USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;

-- 2. ATTENDANCE COLUMNS (photo_url, record_type, user_name) & SELF-ATTENDANCE STORAGE
ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'check_in',
    ADD COLUMN IF NOT EXISTS user_name TEXT,
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_unique_student_link
    ON public.user_profiles(student_id)
    WHERE role = 'student' AND student_id IS NOT NULL;

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

REVOKE EXECUTE ON FUNCTION public.link_student_account(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_student_account(TEXT, UUID, TEXT) TO authenticated;

GRANT INSERT ON public.attendance TO authenticated;

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

-- 3. SCHOOL PERIOD TIMES & CAMPUS GATES
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

ALTER TABLE public.school_period_times ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, UPDATE ON public.school_period_times TO authenticated;

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

ALTER TABLE public.school_campus_gates ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_campus_gates TO authenticated;

-- 4. STUDENT ACCOUNT APPROVAL RPCs
CREATE OR REPLACE FUNCTION public.list_school_student_accounts(target_school_id TEXT)
RETURNS TABLE (
    id UUID,
    school_id TEXT,
    student_id TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    phone TEXT,
    status TEXT,
    email TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can view student accounts';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.school_id,
        p.student_id,
        p.full_name_th,
        p.full_name_en,
        p.phone,
        p.status,
        u.email::TEXT,
        p.created_at
    FROM public.user_profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.school_id = target_school_id
      AND p.role = 'student'
    ORDER BY
        CASE WHEN p.status = 'pending' THEN 0 WHEN p.status = 'active' THEN 1 ELSE 2 END,
        p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_student_account(
    target_school_id TEXT,
    target_user_id UUID,
    target_student_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can approve student accounts';
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

    IF target_student_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.students student
        WHERE student.id = target_student_id
          AND student.school_id = target_school_id
    ) THEN
        RAISE EXCEPTION 'Student record does not belong to this school';
    END IF;

    UPDATE public.user_profiles
    SET
        status = 'active',
        student_id = COALESCE(target_student_id, student_id)
    WHERE id = target_user_id;

    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_account_status(
    target_school_id TEXT,
    target_user_id UUID,
    next_status TEXT
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF next_status NOT IN ('pending', 'active', 'suspended') THEN
        RAISE EXCEPTION 'Invalid account status';
    END IF;

    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can update student account status';
    END IF;

    UPDATE public.user_profiles
    SET status = next_status
    WHERE id = target_user_id
      AND school_id = target_school_id
      AND role = 'student';
END;
$$;

REVOKE ALL ON FUNCTION public.list_school_student_accounts(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_student_account(TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_student_account_status(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_school_student_accounts(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_account(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_account_status(TEXT, UUID, TEXT) TO authenticated;

-- 5. ADMIN <-> SUPER ADMIN COORDINATION DESK
CREATE TABLE IF NOT EXISTS public.admin_coordination_messages (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'super_admin')),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    channel_type TEXT NOT NULL DEFAULT 'chat' CHECK (channel_type IN ('chat', 'letter')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal')),
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    read_by_admin BOOLEAN NOT NULL DEFAULT false,
    read_by_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_coord_school_created
    ON public.admin_coordination_messages(school_id, created_at DESC);

ALTER TABLE public.admin_coordination_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and super admins can read coordination messages" ON public.admin_coordination_messages;
CREATE POLICY "Admins and super admins can read coordination messages"
    ON public.admin_coordination_messages
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "Admins and super admins can insert coordination messages" ON public.admin_coordination_messages;
CREATE POLICY "Admins and super admins can insert coordination messages"
    ON public.admin_coordination_messages
    FOR INSERT WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "Admins and super admins can update coordination messages" ON public.admin_coordination_messages;
CREATE POLICY "Admins and super admins can update coordination messages"
    ON public.admin_coordination_messages
    FOR UPDATE USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

GRANT SELECT, INSERT, UPDATE ON public.admin_coordination_messages TO authenticated;

-- 6. CENTRAL EXAM BANK (8 STRANDS) & SCHOOL ENTITLEMENTS MARKETPLACE
CREATE TABLE IF NOT EXISTS public.central_exam_packs (
    id TEXT PRIMARY KEY,
    title_th TEXT NOT NULL,
    title_en TEXT NOT NULL,
    strand TEXT NOT NULL CHECK (strand IN ('thai', 'math', 'science_tech', 'social', 'health_pe', 'arts', 'career_tech', 'foreign_lang')),
    grade_level TEXT NOT NULL DEFAULT 'ป.1 - ม.6',
    description_th TEXT NOT NULL DEFAULT '',
    pricing_type TEXT NOT NULL DEFAULT 'free' CHECK (pricing_type IN ('free', 'paid')),
    price_thb NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL DEFAULT 'Super Admin',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_central_exam_packs_status_strand
    ON public.central_exam_packs(status, strand);

ALTER TABLE public.central_exam_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manages central exam packs" ON public.central_exam_packs;
CREATE POLICY "Super admin manages central exam packs"
    ON public.central_exam_packs
    FOR ALL USING (
        public.current_user_role() = 'super_admin'
    )
    WITH CHECK (
        public.current_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "Authenticated users read published central exam packs" ON public.central_exam_packs;
CREATE POLICY "Authenticated users read published central exam packs"
    ON public.central_exam_packs
    FOR SELECT USING (
        status = 'published'
        AND auth.uid() IS NOT NULL
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.central_exam_packs TO authenticated;

CREATE TABLE IF NOT EXISTS public.school_exam_entitlements (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    pack_id TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK (claim_type IN ('free', 'purchased')),
    amount_paid_thb NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'free' CHECK (payment_method IN ('free', 'promptpay', 'invoice')),
    claimed_by TEXT NOT NULL DEFAULT '',
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    slip_url TEXT,
    slip_attached_at TIMESTAMPTZ,
    audit_status TEXT NOT NULL DEFAULT 'verified'
        CHECK (audit_status IN ('pending_audit', 'verified', 'revoked')),
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revocation_reason TEXT,
    UNIQUE (school_id, pack_id)
);

ALTER TABLE public.school_exam_entitlements
    ADD COLUMN IF NOT EXISTS slip_url TEXT,
    ADD COLUMN IF NOT EXISTS slip_attached_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS audit_status TEXT NOT NULL DEFAULT 'verified'
        CHECK (audit_status IN ('pending_audit', 'verified', 'revoked')),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by TEXT,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS revoked_by TEXT,
    ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_school_exam_entitlements_school
    ON public.school_exam_entitlements(school_id);

ALTER TABLE public.school_exam_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members read school exam entitlements" ON public.school_exam_entitlements;
CREATE POLICY "School members read school exam entitlements"
    ON public.school_exam_entitlements
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

DROP POLICY IF EXISTS "School admins claim or buy central exam packs" ON public.school_exam_entitlements;
CREATE POLICY "School admins claim or buy central exam packs"
    ON public.school_exam_entitlements
    FOR INSERT WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "Super admins audit exam entitlements" ON public.school_exam_entitlements;
CREATE POLICY "Super admins audit exam entitlements"
    ON public.school_exam_entitlements
    FOR UPDATE USING (
        public.has_school_role(school_id, ARRAY['super_admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin'])
    );

GRANT SELECT, INSERT, UPDATE ON public.school_exam_entitlements TO authenticated;

CREATE TABLE IF NOT EXISTS public.school_questions (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    pack_id TEXT,
    strand TEXT,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL DEFAULT 'ป.1 - ม.6',
    category TEXT NOT NULL DEFAULT 'standard_exam',
    question_th TEXT NOT NULL,
    question_en TEXT NOT NULL DEFAULT '',
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index SMALLINT NOT NULL DEFAULT 0,
    explanation_th TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_questions_school
    ON public.school_questions(school_id, strand);

ALTER TABLE public.school_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members read school questions" ON public.school_questions;
CREATE POLICY "School members read school questions"
    ON public.school_questions
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

DROP POLICY IF EXISTS "School staff manage school questions" ON public.school_questions;
CREATE POLICY "School staff manage school questions"
    ON public.school_questions
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_questions TO authenticated;

-- 7. Persistent school timetables (teacher writes are limited to their own rows)
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri')),
    period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    course_id TEXT,
    course_code TEXT NOT NULL DEFAULT '',
    course_title_th TEXT NOT NULL DEFAULT '',
    course_title_en TEXT NOT NULL DEFAULT '',
    teacher_name TEXT NOT NULL DEFAULT '',
    room TEXT NOT NULL DEFAULT '',
    classroom TEXT NOT NULL DEFAULT '',
    color_tag TEXT NOT NULL DEFAULT 'sky',
    credits NUMERIC(4,1) NOT NULL DEFAULT 1.5,
    total_semester_hours NUMERIC(6,1) NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT timetable_slots_course_school_fk
        FOREIGN KEY (course_id)
        REFERENCES public.courses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_school_day
    ON public.timetable_slots(school_id, day_of_week, period_number);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can read timetable slots" ON public.timetable_slots;
CREATE POLICY "School members can read timetable slots"
    ON public.timetable_slots
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

CREATE OR REPLACE FUNCTION public.is_current_teacher_for_timetable(
    target_school_id TEXT,
    target_teacher_name TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        JOIN public.teachers teacher
          ON teacher.school_id = profile.school_id
         AND lower(teacher.email) = lower(auth.jwt() ->> 'email')
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
          AND profile.role = 'teacher'
          AND profile.school_id = target_school_id
          AND teacher.full_name_th = target_teacher_name
    )
$$;

REVOKE ALL ON FUNCTION public.is_current_teacher_for_timetable(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_teacher_for_timetable(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "School staff can manage timetable slots" ON public.timetable_slots;
CREATE POLICY "School staff can manage timetable slots"
    ON public.timetable_slots
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR public.is_current_teacher_for_timetable(school_id, teacher_name)
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR public.is_current_teacher_for_timetable(school_id, teacher_name)
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_slots TO authenticated;

COMMIT;

-- 7. Refresh Supabase PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
