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
--   7. Persistent course workload hours
-- =========================================================================

BEGIN;

-- 0. Ensure user_profiles.status exists for policies & approval RPCs
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS total_hours NUMERIC(7,2),
    ADD COLUMN IF NOT EXISTS min_attendance_hours NUMERIC(7,2);

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_period_times TO authenticated;

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

REVOKE SELECT ON public.central_exam_packs FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id, title_th, title_en, strand, grade_level, description_th,
    pricing_type, price_thb, status, created_by, published_at, created_at, updated_at
) ON public.central_exam_packs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.central_exam_packs TO authenticated;

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

DROP POLICY IF EXISTS "Super admins audit exam entitlements" ON public.school_exam_entitlements;
CREATE POLICY "Super admins audit exam entitlements"
    ON public.school_exam_entitlements
    FOR UPDATE USING (
        public.has_school_role(school_id, ARRAY['super_admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin'])
    );

REVOKE INSERT, UPDATE ON public.school_exam_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.school_exam_entitlements TO authenticated;
GRANT UPDATE (
    audit_status, verified_at, verified_by, revoked_at, revoked_by, revocation_reason
) ON public.school_exam_entitlements TO authenticated;

CREATE OR REPLACE FUNCTION public.list_central_exam_packs()
RETURNS TABLE (
    id TEXT,
    title_th TEXT,
    title_en TEXT,
    strand TEXT,
    grade_level TEXT,
    description_th TEXT,
    pricing_type TEXT,
    price_thb NUMERIC,
    status TEXT,
    question_count INTEGER,
    questions JSONB,
    created_by TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        p.id,
        p.title_th,
        p.title_en,
        p.strand,
        p.grade_level,
        p.description_th,
        p.pricing_type,
        p.price_thb,
        p.status,
        CASE
            WHEN jsonb_typeof(p.questions) = 'array' THEN jsonb_array_length(p.questions)
            ELSE 0
        END,
        CASE
            WHEN p.pricing_type = 'free'
              OR public.has_school_role(NULL, ARRAY['super_admin'])
              OR (
                  public.has_school_role(
                      public.current_user_school_id(),
                      ARRAY['admin', 'teacher', 'student', 'parent']
                  )
                  AND EXISTS (
                      SELECT 1
                      FROM public.school_exam_entitlements AS e
                      WHERE e.school_id = public.current_user_school_id()
                        AND e.pack_id = p.id
                        AND e.audit_status <> 'revoked'
                  )
              )
            THEN p.questions
            ELSE COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', q.item -> 'id',
                            'questionTh', q.item -> 'questionTh',
                            'questionEn', q.item -> 'questionEn',
                            'options', q.item -> 'options'
                        )
                        ORDER BY q.ordinality
                    )
                    FROM jsonb_array_elements(
                        CASE
                            WHEN jsonb_typeof(p.questions) = 'array' THEN p.questions
                            ELSE '[]'::jsonb
                        END
                    ) WITH ORDINALITY AS q(item, ordinality)
                    WHERE q.ordinality <= 3
                ),
                '[]'::jsonb
            )
        END,
        p.created_by,
        p.published_at,
        p.created_at,
        p.updated_at
    FROM public.central_exam_packs AS p
    WHERE auth.uid() IS NOT NULL
      AND (
          p.status = 'published'
          OR public.has_school_role(NULL, ARRAY['super_admin'])
      )
    ORDER BY p.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_central_exam_packs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_central_exam_packs() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_central_exam_pack(
    target_school_id TEXT,
    target_pack_id TEXT,
    target_payment_method TEXT,
    target_slip_data TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    pack_row public.central_exam_packs%ROWTYPE;
    entitlement_row public.school_exam_entitlements%ROWTYPE;
    claimed_by_name TEXT;
    claim_time TIMESTAMPTZ := NOW();
    is_paid BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to claim an exam pack.'
            USING ERRCODE = '42501';
    END IF;

    IF target_school_id IS NULL
       OR NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only an active school admin can claim an exam pack.'
            USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO pack_row
    FROM public.central_exam_packs
    WHERE id = target_pack_id
      AND status = 'published'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The exam pack is unavailable.'
            USING ERRCODE = '22023';
    END IF;

    is_paid := pack_row.pricing_type = 'paid';
    IF is_paid AND pack_row.price_thb <= 0 THEN
        RAISE EXCEPTION 'The paid exam pack has an invalid price.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT is_paid AND target_payment_method IS DISTINCT FROM 'free' THEN
        RAISE EXCEPTION 'The payment method does not match this free exam pack.'
            USING ERRCODE = '22023';
    END IF;

    IF is_paid AND (
        target_payment_method IS NULL
        OR target_payment_method NOT IN ('promptpay', 'invoice')
    ) THEN
        RAISE EXCEPTION 'Choose a supported payment method for this paid exam pack.'
            USING ERRCODE = '22023';
    END IF;

    IF is_paid AND (
        target_slip_data IS NULL
        OR length(target_slip_data) > 7000000
        OR target_slip_data !~* '^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$'
    ) THEN
        RAISE EXCEPTION 'A valid payment slip image is required for this paid exam pack.'
            USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(NULLIF(BTRIM(profile.full_name_th), ''), auth.uid()::TEXT)
    INTO claimed_by_name
    FROM public.user_profiles AS profile
    WHERE profile.id = auth.uid();

    INSERT INTO public.school_exam_entitlements (
        id,
        school_id,
        pack_id,
        claim_type,
        amount_paid_thb,
        payment_method,
        claimed_by,
        claimed_at,
        slip_url,
        slip_attached_at,
        audit_status,
        verified_at,
        verified_by,
        revoked_at,
        revoked_by,
        revocation_reason
    )
    VALUES (
        'ent-' || target_school_id || '-' || target_pack_id,
        target_school_id,
        target_pack_id,
        CASE WHEN is_paid THEN 'purchased' ELSE 'free' END,
        CASE WHEN is_paid THEN pack_row.price_thb ELSE 0 END,
        CASE WHEN is_paid THEN target_payment_method ELSE 'free' END,
        COALESCE(claimed_by_name, auth.uid()::TEXT),
        claim_time,
        CASE WHEN is_paid THEN target_slip_data ELSE NULL END,
        CASE WHEN is_paid THEN claim_time ELSE NULL END,
        CASE WHEN is_paid THEN 'pending_audit' ELSE 'verified' END,
        CASE WHEN is_paid THEN NULL ELSE claim_time END,
        CASE WHEN is_paid THEN NULL ELSE 'system' END,
        NULL,
        NULL,
        NULL
    )
    ON CONFLICT (school_id, pack_id) DO UPDATE
    SET id = EXCLUDED.id,
        claim_type = EXCLUDED.claim_type,
        amount_paid_thb = EXCLUDED.amount_paid_thb,
        payment_method = EXCLUDED.payment_method,
        claimed_by = EXCLUDED.claimed_by,
        claimed_at = EXCLUDED.claimed_at,
        slip_url = EXCLUDED.slip_url,
        slip_attached_at = EXCLUDED.slip_attached_at,
        audit_status = EXCLUDED.audit_status,
        verified_at = EXCLUDED.verified_at,
        verified_by = EXCLUDED.verified_by,
        revoked_at = NULL,
        revoked_by = NULL,
        revocation_reason = NULL
    WHERE school_exam_entitlements.audit_status = 'revoked'
    RETURNING * INTO entitlement_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'This school already has an active entitlement for the exam pack.'
            USING ERRCODE = '23505';
    END IF;

    RETURN jsonb_build_object(
        'entitlement', to_jsonb(entitlement_row),
        'questions', pack_row.questions
    );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_central_exam_pack(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_central_exam_pack(TEXT, TEXT, TEXT, TEXT)
    TO authenticated;

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

-- 6. SCHOOL LOGO STORAGE
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

ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS semester_options JSONB NOT NULL DEFAULT '["1", "2", "Summer"]'::jsonb,
    ADD COLUMN IF NOT EXISTS grading_system TEXT NOT NULL DEFAULT 'thai',
    ADD COLUMN IF NOT EXISTS staff_position_options JSONB NOT NULL DEFAULT '["นักการภารโรง", "เจ้าหน้าที่ธุรการ", "ครูอัตราจ้าง", "ครูผู้ช่วย", "ครู", "รองผู้อำนวยการ", "ผู้อำนวยการ"]'::jsonb,
    ADD COLUMN IF NOT EXISTS room_options JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'schools_grading_system_check'
          AND conrelid = 'public.schools'::regclass
    ) THEN
        ALTER TABLE public.schools
            ADD CONSTRAINT schools_grading_system_check
            CHECK (grading_system IN ('thai', 'international'));
    END IF;
END $$;

ALTER TABLE public.teachers
    ADD COLUMN IF NOT EXISTS position_title TEXT;

COMMIT;

-- 7. Refresh Supabase PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
