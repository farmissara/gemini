BEGIN;

-- ============================================================================
-- 1. SCHOOL LOGIN PORTAL SETTINGS & STUDENT ID LOGIN RESOLUTION
-- ============================================================================
ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS student_login_identifier_type TEXT NOT NULL DEFAULT 'both',
    ADD COLUMN IF NOT EXISTS custom_login_slug TEXT,
    ADD COLUMN IF NOT EXISTS student_default_password_type TEXT NOT NULL DEFAULT 'birthdate',
    ADD COLUMN IF NOT EXISTS student_default_password_note TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'schools_student_login_identifier_type_check'
          AND conrelid = 'public.schools'::regclass
    ) THEN
        ALTER TABLE public.schools
            ADD CONSTRAINT schools_student_login_identifier_type_check
            CHECK (student_login_identifier_type IN ('student_id_only', 'email_only', 'both'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_school_login_portal_info(
    lookup_school_id TEXT DEFAULT NULL,
    lookup_school_code TEXT DEFAULT NULL,
    lookup_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    code TEXT,
    name_th TEXT,
    name_en TEXT,
    slug TEXT,
    logo_url TEXT,
    primary_color TEXT,
    student_login_identifier_type TEXT,
    custom_login_slug TEXT,
    student_default_password_type TEXT,
    student_default_password_note TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        s.id,
        s.code,
        s.name_th,
        s.name_en,
        s.slug,
        s.logo_url,
        s.primary_color,
        COALESCE(s.student_login_identifier_type, 'both'),
        s.custom_login_slug,
        COALESCE(s.student_default_password_type, 'birthdate'),
        s.student_default_password_note
    FROM public.schools s
    WHERE s.status = 'active'
      AND (
          (lookup_school_id IS NOT NULL AND s.id = lookup_school_id)
          OR (lookup_school_code IS NOT NULL AND LOWER(s.code) = LOWER(lookup_school_code))
          OR (lookup_slug IS NOT NULL AND (LOWER(COALESCE(s.custom_login_slug, '')) = LOWER(lookup_slug) OR LOWER(s.slug) = LOWER(lookup_slug)))
      )
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_student_login_email(
    target_school_id TEXT,
    identifier TEXT
)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT u.email
    FROM public.students st
    JOIN public.schools s ON s.id = st.school_id
    JOIN public.user_profiles p ON p.student_id = st.id AND p.school_id = st.school_id
    JOIN auth.users u ON u.id = p.id
    WHERE st.school_id = target_school_id
      AND s.status = 'active'
      AND COALESCE(s.student_login_identifier_type, 'both') IN ('student_id_only', 'both')
      AND p.role = 'student'
      AND p.status = 'active'
      AND LOWER(BTRIM(st.student_id_number)) = LOWER(BTRIM(identifier))
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_school_login_portal_info(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_student_login_email(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_login_portal_info(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_login_email(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- 2. ONLINE LEAVE REQUESTS (PERSISTENT ACROSS DEVICES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('student', 'teacher')),
    grade_level_or_department TEXT,
    leave_scope TEXT NOT NULL DEFAULT 'full_day' CHECK (leave_scope IN ('full_day', 'period_hourly')),
    period_number INTEGER,
    course_id TEXT,
    course_code TEXT,
    course_title TEXT,
    substitute_teacher_id TEXT,
    substitute_teacher_name TEXT,
    cc_emails_or_roles TEXT,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'personal', 'official', 'vacation')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by TEXT,
    approval_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_school_date
    ON public.leave_requests (school_id, start_date DESC, created_at DESC);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School staff manage leave requests" ON public.leave_requests;
CREATE POLICY "School staff manage leave requests"
    ON public.leave_requests
    FOR ALL
    USING (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
    WITH CHECK (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

DROP POLICY IF EXISTS "Students and parents read accessible leave requests" ON public.leave_requests;
CREATE POLICY "Students and parents read accessible leave requests"
    ON public.leave_requests
    FOR SELECT
    USING (
        public.has_school_role(school_id, ARRAY['student', 'parent'])
        AND public.can_access_student(user_id)
    );

DROP POLICY IF EXISTS "Students and parents submit leave requests" ON public.leave_requests;
CREATE POLICY "Students and parents submit leave requests"
    ON public.leave_requests
    FOR INSERT
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['student', 'parent'])
        AND user_role = 'student'
        AND status = 'pending'
        AND public.can_access_student(user_id)
    );

REVOKE ALL ON public.leave_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;

-- ============================================================================
-- 3. PERIOD ATTENDANCE (CLASSROOM QR & TEACHER PROXY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.period_attendance (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL DEFAULT '',
    period_number INTEGER NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
    check_method TEXT NOT NULL DEFAULT 'teacher_proxy',
    record_type TEXT NOT NULL DEFAULT 'check_in' CHECK (record_type IN ('check_in', 'check_out')),
    recorded_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_period_attendance_unique_slot
    ON public.period_attendance (school_id, student_id, course_id, date, period_number, record_type);

CREATE INDEX IF NOT EXISTS idx_period_attendance_school_date
    ON public.period_attendance (school_id, date DESC, course_id, period_number);

ALTER TABLE public.period_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School staff manage period attendance" ON public.period_attendance;
CREATE POLICY "School staff manage period attendance"
    ON public.period_attendance
    FOR ALL
    USING (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
    WITH CHECK (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

DROP POLICY IF EXISTS "Students and parents read own period attendance" ON public.period_attendance;
CREATE POLICY "Students and parents read own period attendance"
    ON public.period_attendance
    FOR SELECT
    USING (
        public.has_school_role(school_id, ARRAY['student', 'parent'])
        AND public.can_access_student(student_id)
    );

DROP POLICY IF EXISTS "Students insert own QR period attendance" ON public.period_attendance;
CREATE POLICY "Students insert own QR period attendance"
    ON public.period_attendance
    FOR INSERT
    WITH CHECK (
        public.current_user_role() = 'student'
        AND public.has_school_role(school_id, ARRAY['student'])
        AND public.can_access_student(student_id)
    );

DROP POLICY IF EXISTS "Students update own QR period attendance" ON public.period_attendance;
CREATE POLICY "Students update own QR period attendance"
    ON public.period_attendance
    FOR UPDATE
    USING (
        public.current_user_role() = 'student'
        AND public.has_school_role(school_id, ARRAY['student'])
        AND public.can_access_student(student_id)
    )
    WITH CHECK (
        public.current_user_role() = 'student'
        AND public.has_school_role(school_id, ARRAY['student'])
        AND public.can_access_student(student_id)
    );

REVOKE ALL ON public.period_attendance FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.period_attendance TO authenticated;

-- ============================================================================
-- 4. INVOICE PAYMENT SLIP PERSISTENCE + SCHOOL ATTACHMENTS STORAGE BUCKET
-- ============================================================================
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS slip_image_url TEXT,
    ADD COLUMN IF NOT EXISTS slip_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS slip_status TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS slip_reject_reason TEXT,
    ADD COLUMN IF NOT EXISTS slip_amount NUMERIC,
    ADD COLUMN IF NOT EXISTS slip_reference_note TEXT;

CREATE OR REPLACE FUNCTION public.submit_invoice_slip(
    target_school_id TEXT,
    target_invoice_id TEXT,
    target_slip_url TEXT,
    target_note TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    inv public.invoices%ROWTYPE;
BEGIN
    SELECT *
    INTO inv
    FROM public.invoices
    WHERE id = target_invoice_id
      AND school_id = target_school_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    IF NOT (
        public.has_school_role(target_school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR public.can_access_student(inv.student_id)
    ) THEN
        RAISE EXCEPTION 'You are not permitted to submit a payment slip for this invoice';
    END IF;

    UPDATE public.invoices
    SET
        slip_image_url = target_slip_url,
        slip_submitted_at = NOW(),
        slip_status = 'pending_review',
        slip_reference_note = NULLIF(BTRIM(target_note), ''),
        slip_reject_reason = NULL
    WHERE id = target_invoice_id
      AND school_id = target_school_id;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_invoice_slip(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_invoice_slip(TEXT, TEXT, TEXT, TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('school-attachments', 'school-attachments', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS "Authenticated users read school attachments" ON storage.objects;
CREATE POLICY "Authenticated users read school attachments"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'school-attachments');

DROP POLICY IF EXISTS "School members upload school attachments" ON storage.objects;
CREATE POLICY "School members upload school attachments"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'school-attachments'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

DROP POLICY IF EXISTS "School staff manage school attachments" ON storage.objects;
CREATE POLICY "School staff manage school attachments"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'school-attachments'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['super_admin', 'admin', 'teacher'])
    );

-- ============================================================================
-- 5. TEACHER & PARENT ACCOUNT INVITATIONS (FROM WEB UI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_parent_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invite_role TEXT NOT NULL CHECK (invite_role IN ('teacher', 'parent')),
    teacher_id TEXT,
    student_id TEXT,
    invited_email TEXT NOT NULL,
    full_name_th TEXT NOT NULL DEFAULT '',
    full_name_en TEXT NOT NULL DEFAULT '',
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.staff_parent_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_parent_invitations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.staff_parent_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.list_school_staff_parent_accounts(target_school_id TEXT)
RETURNS TABLE (
    id UUID,
    school_id TEXT,
    role TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    email TEXT,
    phone TEXT,
    status TEXT,
    linked_student_ids TEXT[],
    created_at TIMESTAMPTZ
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can view staff and parent accounts';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.school_id,
        p.role,
        p.full_name_th,
        p.full_name_en,
        u.email::TEXT,
        p.phone,
        p.status,
        COALESCE(
            (
                SELECT ARRAY_AGG(l.student_id)
                FROM public.parent_student_links l
                WHERE l.profile_id = p.id
                  AND l.school_id = p.school_id
            ),
            ARRAY[]::TEXT[]
        ) AS linked_student_ids,
        p.created_at
    FROM public.user_profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.school_id = target_school_id
      AND p.role IN ('teacher', 'parent')
    ORDER BY p.role, p.full_name_th;
END;
$$;

REVOKE ALL ON FUNCTION public.list_school_staff_parent_accounts(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_school_staff_parent_accounts(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_auth_user_signup()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    signup_type TEXT := NEW.raw_user_meta_data ->> 'signup_type';
    invitation_id UUID;
    student_inv public.student_account_invitations%ROWTYPE;
    staff_inv public.staff_parent_invitations%ROWTYPE;
    student_record public.students%ROWTYPE;
    new_school_id TEXT;
    school_name_th TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_th'), '');
    school_name_en TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_en'), '');
    school_type TEXT := COALESCE(NEW.raw_user_meta_data ->> 'school_type', 'public');
    school_province TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_province'), '');
    school_slug TEXT;
    school_status TEXT;
BEGIN
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
    ELSIF signup_type = 'student_invite' THEN
        BEGIN
            invitation_id := (NEW.raw_user_meta_data ->> 'invitation_id')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid student invitation';
        END;

        SELECT *
        INTO student_inv
        FROM public.student_account_invitations
        WHERE id = invitation_id
        FOR UPDATE;

        IF NOT FOUND
           OR student_inv.accepted_at IS NOT NULL
           OR student_inv.expires_at <= NOW()
           OR LOWER(student_inv.invited_email) <> LOWER(COALESCE(NEW.email, '')) THEN
            RAISE EXCEPTION 'Student invitation is invalid or expired';
        END IF;

        SELECT *
        INTO student_record
        FROM public.students
        WHERE id = student_inv.student_id
          AND school_id = student_inv.school_id;

        IF NOT FOUND OR NOT EXISTS (
            SELECT 1 FROM public.schools
            WHERE id = student_inv.school_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Student or school is no longer active';
        END IF;

        INSERT INTO public.user_profiles (
            id, school_id, role, student_id, full_name_th, full_name_en, avatar_url, status
        ) VALUES (
            NEW.id,
            student_inv.school_id,
            'student',
            student_inv.student_id,
            CONCAT_WS(' ', student_record.first_name_th, student_record.last_name_th),
            CONCAT_WS(' ', student_record.first_name_en, student_record.last_name_en),
            COALESCE(student_record.avatar_url, ''),
            CASE WHEN NEW.email_confirmed_at IS NULL THEN 'pending' ELSE 'active' END
        );

        UPDATE public.student_account_invitations
        SET accepted_at = NOW(), accepted_by = NEW.id
        WHERE id = student_inv.id;
    ELSIF signup_type IN ('teacher_invite', 'parent_invite') THEN
        BEGIN
            invitation_id := (NEW.raw_user_meta_data ->> 'invitation_id')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid staff/parent invitation';
        END;

        SELECT *
        INTO staff_inv
        FROM public.staff_parent_invitations
        WHERE id = invitation_id
        FOR UPDATE;

        IF NOT FOUND
           OR staff_inv.accepted_at IS NOT NULL
           OR staff_inv.expires_at <= NOW()
           OR LOWER(staff_inv.invited_email) <> LOWER(COALESCE(NEW.email, '')) THEN
            RAISE EXCEPTION 'Staff/Parent invitation is invalid or expired';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.schools
            WHERE id = staff_inv.school_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'School is no longer active';
        END IF;

        INSERT INTO public.user_profiles (
            id, school_id, role, full_name_th, full_name_en, status
        ) VALUES (
            NEW.id,
            staff_inv.school_id,
            staff_inv.invite_role,
            COALESCE(NULLIF(BTRIM(staff_inv.full_name_th), ''), NEW.email),
            COALESCE(NULLIF(BTRIM(staff_inv.full_name_en), ''), NULLIF(BTRIM(staff_inv.full_name_th), ''), NEW.email),
            CASE WHEN NEW.email_confirmed_at IS NULL THEN 'pending' ELSE 'active' END
        );

        IF staff_inv.invite_role = 'parent' AND staff_inv.student_id IS NOT NULL THEN
            INSERT INTO public.parent_student_links (profile_id, school_id, student_id)
            VALUES (NEW.id, staff_inv.school_id, staff_inv.student_id)
            ON CONFLICT DO NOTHING;
        END IF;

        UPDATE public.staff_parent_invitations
        SET accepted_at = NOW(), accepted_by = NEW.id
        WHERE id = staff_inv.id;
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
        WHERE id = NEW.id
          AND role IN ('admin', 'student', 'teacher', 'parent')
          AND status = 'pending';

        UPDATE public.schools school
        SET status = 'active'
        FROM public.user_profiles profile
        WHERE profile.id = NEW.id
          AND profile.role = 'admin'
          AND profile.school_id = school.id
          AND school.status = 'pending';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_verified_school_signup() FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
