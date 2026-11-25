BEGIN;

CREATE TABLE IF NOT EXISTS public.super_admin_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.super_admin_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.super_admin_settings FROM PUBLIC, anon, authenticated;

INSERT INTO public.super_admin_settings (setting_key, setting_value)
VALUES
    ('role_permissions', '[
      {"role":"admin","roleNameTh":"ผู้บริหารสถานศึกษา","roleNameEn":"School Administrator","descriptionTh":"","permissions":{"manageStudents":true,"manageCourses":true,"editGrades":true,"recordAttendance":true,"manageTuition":true,"sendBroadcastLine":true,"manageTimetable":true,"manageSdq":true,"viewInfirmary":true,"approveTranscripts":true}},
      {"role":"teacher","roleNameTh":"ครู","roleNameEn":"Teacher","descriptionTh":"","permissions":{"manageStudents":false,"manageCourses":true,"editGrades":true,"recordAttendance":true,"manageTuition":false,"sendBroadcastLine":true,"manageTimetable":true,"manageSdq":true,"viewInfirmary":true,"approveTranscripts":false}},
      {"role":"student","roleNameTh":"นักเรียน","roleNameEn":"Student","descriptionTh":"","permissions":{"manageStudents":false,"manageCourses":false,"editGrades":false,"recordAttendance":false,"manageTuition":false,"sendBroadcastLine":false,"manageTimetable":false,"manageSdq":false,"viewInfirmary":false,"approveTranscripts":false}},
      {"role":"parent","roleNameTh":"ผู้ปกครอง","roleNameEn":"Parent","descriptionTh":"","permissions":{"manageStudents":false,"manageCourses":false,"editGrades":false,"recordAttendance":false,"manageTuition":false,"sendBroadcastLine":false,"manageTimetable":false,"manageSdq":false,"viewInfirmary":false,"approveTranscripts":false}}
    ]'::jsonb),
    ('promotions', '[]'::jsonb),
    ('subscription_plans', '[]'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_super_admin_settings()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE settings JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;

    SELECT COALESCE(jsonb_object_agg(setting_key, setting_value), '{}'::jsonb)
    INTO settings
    FROM public.super_admin_settings
    WHERE setting_key <> 'central_exam_payment_settings';
    RETURN settings;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_central_exam_payment_settings()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT setting_value
    FROM public.super_admin_settings
    WHERE setting_key = 'central_exam_payment_settings'
      AND auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.save_super_admin_setting(target_key TEXT, target_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;

    IF target_key NOT IN ('role_permissions', 'promotions', 'subscription_plans', 'central_exam_payment_settings') THEN
        RAISE EXCEPTION 'Unsupported Super Admin setting: %', target_key;
    END IF;

    IF target_key IN ('role_permissions', 'promotions', 'subscription_plans')
       AND jsonb_typeof(target_value) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Setting % must be a JSON array.', target_key;
    END IF;
    IF target_key = 'central_exam_payment_settings'
       AND jsonb_typeof(target_value) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Payment settings must be a JSON object.';
    END IF;

    INSERT INTO public.super_admin_settings (setting_key, setting_value, updated_by, updated_at)
    VALUES (target_key, target_value, auth.uid(), NOW())
    ON CONFLICT (setting_key) DO UPDATE
    SET setting_value = EXCLUDED.setting_value,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_super_admin_settings(target_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE setting_item RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;
    IF jsonb_typeof(target_settings) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Settings payload must be a JSON object.';
    END IF;

    FOR setting_item IN SELECT key, value FROM jsonb_each(target_settings)
    LOOP
        IF setting_item.key NOT IN ('role_permissions', 'promotions', 'subscription_plans', 'central_exam_payment_settings') THEN
            RAISE EXCEPTION 'Unsupported Super Admin setting: %', setting_item.key;
        END IF;
        IF setting_item.key IN ('role_permissions', 'promotions', 'subscription_plans')
           AND jsonb_typeof(setting_item.value) IS DISTINCT FROM 'array' THEN
            RAISE EXCEPTION 'Setting % must be a JSON array.', setting_item.key;
        END IF;
        IF setting_item.key = 'central_exam_payment_settings'
           AND jsonb_typeof(setting_item.value) IS DISTINCT FROM 'object' THEN
            RAISE EXCEPTION 'Payment settings must be a JSON object.';
        END IF;

        INSERT INTO public.super_admin_settings (setting_key, setting_value, updated_by, updated_at)
        VALUES (setting_item.key, setting_item.value, auth.uid(), NOW())
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = EXCLUDED.updated_at;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role_permission(target_school_id TEXT, target_permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
          AND (profile.role = 'super_admin' OR profile.school_id = target_school_id)
          AND (
              profile.role = 'super_admin'
              OR COALESCE(
                  (
                      SELECT (role_config->'permissions'->>target_permission)::BOOLEAN
                      FROM public.super_admin_settings setting
                      CROSS JOIN LATERAL jsonb_array_elements(setting.setting_value) role_config
                      WHERE setting.setting_key = 'role_permissions'
                        AND role_config->>'role' = profile.role
                      LIMIT 1
                  ),
                  TRUE
              )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.link_student_account(
    target_school_id TEXT,
    target_user_id UUID,
    target_student_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin'])
       OR NOT public.has_role_permission(target_school_id, 'manageStudents') THEN
        RAISE EXCEPTION 'This role cannot manage student accounts.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles profile
        WHERE profile.id = target_user_id
          AND profile.school_id = target_school_id
          AND profile.role = 'student'
    ) THEN
        RAISE EXCEPTION 'Student account does not belong to this school';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.students student
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

CREATE OR REPLACE FUNCTION public.approve_student_account(
    target_school_id TEXT,
    target_user_id UUID,
    target_student_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin'])
       OR NOT public.has_role_permission(target_school_id, 'manageStudents') THEN
        RAISE EXCEPTION 'This role cannot manage student accounts.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles profile
        WHERE profile.id = target_user_id
          AND profile.school_id = target_school_id
          AND profile.role = 'student'
    ) THEN
        RAISE EXCEPTION 'Student account does not belong to this school';
    END IF;
    IF target_student_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.students student
        WHERE student.id = target_student_id
          AND student.school_id = target_school_id
    ) THEN
        RAISE EXCEPTION 'Student record does not belong to this school';
    END IF;

    UPDATE public.user_profiles
    SET status = 'active',
        student_id = COALESCE(target_student_id, student_id)
    WHERE id = target_user_id
      AND school_id = target_school_id
      AND role = 'student';
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF next_status NOT IN ('pending', 'active', 'suspended') THEN
        RAISE EXCEPTION 'Invalid account status';
    END IF;
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin'])
       OR NOT public.has_role_permission(target_school_id, 'manageStudents') THEN
        RAISE EXCEPTION 'This role cannot manage student accounts.';
    END IF;
    UPDATE public.user_profiles
    SET status = next_status
    WHERE id = target_user_id
      AND school_id = target_school_id
      AND role = 'student';
END;
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_central_exam_payment_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_super_admin_setting(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_super_admin_settings(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role_permission(TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_super_admin_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_central_exam_payment_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_super_admin_setting(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_super_admin_settings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_permission(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_student_account(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_account(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_account_status(TEXT, UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "School staff add students" ON public.students;
DROP POLICY IF EXISTS "School staff can add students" ON public.students;
CREATE POLICY "School staff can add students" ON public.students
    FOR INSERT WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageStudents')
    );

DROP POLICY IF EXISTS "School admins can update students" ON public.students;
CREATE POLICY "School admins can update students" ON public.students
    FOR UPDATE USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageStudents')
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageStudents')
    );

DROP POLICY IF EXISTS "School admins can delete students" ON public.students;
CREATE POLICY "School admins can delete students" ON public.students
    FOR DELETE USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageStudents')
    );

DROP POLICY IF EXISTS "School staff can manage courses" ON public.courses;
CREATE POLICY "School staff can manage courses" ON public.courses
    FOR ALL USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'manageCourses')
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'manageCourses')
    );

DROP POLICY IF EXISTS "School staff can manage grades" ON public.grades;
CREATE POLICY "School staff can manage grades" ON public.grades
    FOR ALL USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'editGrades')
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'editGrades')
    );

DROP POLICY IF EXISTS "School staff can manage attendance" ON public.attendance;
CREATE POLICY "School staff can manage attendance" ON public.attendance
    FOR ALL USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'recordAttendance')
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'recordAttendance')
    );

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
            SELECT profile.full_name_th FROM public.user_profiles profile WHERE profile.id = auth.uid()
        )
        AND split_part(photo_url, '/', 1) = public.current_user_school_id()
        AND split_part(photo_url, '/', 2) = auth.uid()::text
        AND split_part(photo_url, '/', 3) = id || '.jpg'
    );

DROP POLICY IF EXISTS "School admins can manage invoices" ON public.invoices;
CREATE POLICY "School admins can manage invoices" ON public.invoices
    FOR ALL USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageTuition')
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageTuition')
    );

DROP POLICY IF EXISTS "School staff can manage announcements" ON public.announcements;
CREATE POLICY "School staff can manage announcements" ON public.announcements
    FOR ALL USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'sendBroadcastLine')
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'sendBroadcastLine')
    );

DROP POLICY IF EXISTS "School staff can manage school period times" ON public.school_period_times;
CREATE POLICY "School staff can manage school period times" ON public.school_period_times
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'manageTimetable')
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'manageTimetable')
    );

DROP POLICY IF EXISTS "School staff can manage campus gates" ON public.school_campus_gates;
CREATE POLICY "School staff can manage campus gates" ON public.school_campus_gates
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'recordAttendance')
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        AND public.has_role_permission(school_id, 'recordAttendance')
    );

DROP POLICY IF EXISTS "School admins can manage parent links" ON public.parent_student_links;
CREATE POLICY "School admins can manage parent links" ON public.parent_student_links
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageStudents')
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        AND public.has_role_permission(school_id, 'manageStudents')
    );

DROP POLICY IF EXISTS "Students can upload own attendance selfies" ON storage.objects;
CREATE POLICY "Students can upload own attendance selfies" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[1] = public.current_user_school_id()
        AND (storage.foldername(name))[2] = auth.uid()::TEXT
        AND public.current_user_role() = 'student'
        AND EXISTS (
            SELECT 1 FROM public.user_profiles profile
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
        AND (storage.foldername(name))[1] = public.current_user_school_id()
        AND (storage.foldername(name))[2] = auth.uid()::TEXT
        AND public.current_user_role() = 'student'
        AND NOT EXISTS (
            SELECT 1 FROM public.attendance record
            WHERE record.photo_url = name
        )
    );

DO $$
BEGIN
    IF to_regclass('public.timetable_slots') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "School staff can manage timetable slots" ON public.timetable_slots';
        EXECUTE 'CREATE POLICY "School staff can manage timetable slots" ON public.timetable_slots
            FOR ALL USING (
                public.has_school_role(school_id, ARRAY[''super_admin'', ''admin'', ''teacher''])
                AND public.has_role_permission(school_id, ''manageTimetable'')
            )
            WITH CHECK (
                public.has_school_role(school_id, ARRAY[''super_admin'', ''admin'', ''teacher''])
                AND public.has_role_permission(school_id, ''manageTimetable'')
            )';
    END IF;
    IF to_regclass('public.period_attendance') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "School staff manage period attendance" ON public.period_attendance';
        EXECUTE 'CREATE POLICY "School staff manage period attendance" ON public.period_attendance
            FOR ALL USING (
                public.has_school_role(school_id, ARRAY[''super_admin'', ''admin'', ''teacher''])
                AND public.has_role_permission(school_id, ''recordAttendance'')
            )
            WITH CHECK (
                public.has_school_role(school_id, ARRAY[''super_admin'', ''admin'', ''teacher''])
                AND public.has_role_permission(school_id, ''recordAttendance'')
            )';
        EXECUTE 'DROP POLICY IF EXISTS "Students insert own QR period attendance" ON public.period_attendance';
        EXECUTE 'CREATE POLICY "Students insert own QR period attendance" ON public.period_attendance
            FOR INSERT WITH CHECK (
                public.current_user_role() = ''student''
                AND public.has_school_role(school_id, ARRAY[''student''])
                AND public.can_access_student(student_id)
            )';
        EXECUTE 'DROP POLICY IF EXISTS "Students update own QR period attendance" ON public.period_attendance';
        EXECUTE 'CREATE POLICY "Students update own QR period attendance" ON public.period_attendance
            FOR UPDATE USING (
                public.current_user_role() = ''student''
                AND public.has_school_role(school_id, ARRAY[''student''])
                AND public.can_access_student(student_id)
            )
            WITH CHECK (
                public.current_user_role() = ''student''
                AND public.has_school_role(school_id, ARRAY[''student''])
                AND public.can_access_student(student_id)
            )';
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    school_id TEXT,
    school_name TEXT NOT NULL DEFAULT '',
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_label TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created
    ON public.audit_logs(school_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.append_audit_log(
    target_school_id TEXT,
    target_label TEXT,
    target_details TEXT,
    target_action_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE profile_row public.user_profiles%ROWTYPE;
BEGIN
    SELECT * INTO profile_row
    FROM public.user_profiles
    WHERE id = auth.uid() AND status = 'active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'An active account is required to record an audit event.';
    END IF;
    IF profile_row.role <> 'super_admin'
       AND profile_row.school_id IS DISTINCT FROM target_school_id THEN
        RAISE EXCEPTION 'Audit events can only be recorded for the caller''s school.';
    END IF;
    INSERT INTO public.audit_logs (
        school_id, school_name, actor_id, actor_name, actor_role,
        action_type, target_label, details
    )
    SELECT target_school_id, COALESCE(school.name_th, ''), profile_row.id,
           profile_row.full_name_th, profile_row.role, target_action_type,
           target_label, target_details
    FROM (SELECT 1) seed
    LEFT JOIN public.schools school ON school.id = target_school_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_audit_logs(target_school_id TEXT DEFAULT NULL)
RETURNS TABLE (
    id BIGINT,
    school_id TEXT,
    school_name TEXT,
    actor_name TEXT,
    actor_role TEXT,
    action_type TEXT,
    target_label TEXT,
    details TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles caller
        WHERE caller.id = auth.uid() AND caller.role = 'super_admin' AND caller.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;
    RETURN QUERY
    SELECT log.id, log.school_id, log.school_name, log.actor_name, log.actor_role,
           log.action_type, log.target_label, log.details, log.created_at
    FROM public.audit_logs log
    WHERE target_school_id IS NULL OR log.school_id = target_school_id
    ORDER BY log.created_at DESC
    LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_super_admin_accounts(
    page_limit INTEGER DEFAULT 100,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    role TEXT,
    school_id TEXT,
    status TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles caller
        WHERE caller.id = auth.uid() AND caller.role = 'super_admin' AND caller.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;
    RETURN QUERY
    SELECT profile.id, account.email::TEXT, profile.full_name_th, profile.full_name_en,
           profile.role, profile.school_id, profile.status, profile.avatar_url,
           profile.created_at
    FROM public.user_profiles profile
    LEFT JOIN auth.users account ON account.id = profile.id
    ORDER BY profile.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(page_limit, 100), 1), 500)
    OFFSET GREATEST(COALESCE(page_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_super_admin_school_counts(target_school_ids TEXT[])
RETURNS TABLE (school_id TEXT, students_count BIGINT, teachers_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;
    RETURN QUERY
    SELECT target.id,
           (SELECT COUNT(*) FROM public.students student WHERE student.school_id = target.id),
           (SELECT COUNT(*) FROM public.teachers teacher WHERE teacher.school_id = target.id)
    FROM unnest(COALESCE(target_school_ids, ARRAY[]::TEXT[])) AS target(id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_pending_school_registration(
    target_user_id UUID,
    target_school_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;

    PERFORM 1
    FROM public.schools school
    JOIN public.user_profiles profile ON profile.school_id = school.id
    WHERE school.id = target_school_id
      AND school.status = 'pending'
      AND profile.id = target_user_id
      AND profile.status = 'pending'
    FOR UPDATE OF school, profile;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'The pending registration was not found or is no longer pending.';
    END IF;

    DELETE FROM public.user_profiles
    WHERE id = target_user_id AND school_id = target_school_id AND status = 'pending';
    DELETE FROM public.schools WHERE id = target_school_id AND status = 'pending';
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.append_audit_log(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_audit_logs(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_super_admin_accounts(INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_super_admin_school_counts(TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_pending_school_registration(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.append_audit_log(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_audit_logs(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admin_accounts(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_admin_school_counts(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_school_registration(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
