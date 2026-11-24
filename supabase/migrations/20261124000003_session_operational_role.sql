BEGIN;

CREATE TABLE IF NOT EXISTS public.user_operational_role_sessions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    operational_role TEXT NOT NULL CHECK (operational_role IN ('admin', 'teacher')),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, session_id)
);

ALTER TABLE public.user_operational_role_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_operational_role_sessions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_operational_role()
RETURNS TEXT
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    actor_role TEXT;
    actor_school_id TEXT;
    token_session_id UUID;
    session_role TEXT;
BEGIN
    SELECT profile.role, profile.school_id
      INTO actor_role, actor_school_id
      FROM public.user_profiles profile
     WHERE profile.id = auth.uid()
       AND profile.status = 'active'
       AND NOT profile.must_change_password;

    IF actor_role IS NULL THEN
        RETURN NULL;
    END IF;

    token_session_id := NULLIF(auth.jwt() ->> 'session_id', '')::UUID;
    IF token_session_id IS NULL OR actor_role NOT IN ('admin', 'teacher') THEN
        RETURN actor_role;
    END IF;

    SELECT session.operational_role
      INTO session_role
      FROM public.user_operational_role_sessions session
     WHERE session.user_id = auth.uid()
       AND session.session_id = token_session_id
       AND session.expires_at > NOW();

    IF session_role IS NULL OR session_role = actor_role THEN
        RETURN actor_role;
    END IF;

    IF session_role = 'admin'
       AND actor_role = 'teacher'
       AND public.is_school_admin_teacher(actor_school_id) THEN
        RETURN session_role;
    END IF;

    IF session_role = 'teacher'
       AND actor_role = 'admin'
       AND public.is_current_teacher_in_school(actor_school_id) THEN
        RETURN session_role;
    END IF;

    RETURN actor_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_operational_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.current_operational_role()
$$;

CREATE OR REPLACE FUNCTION public.set_my_operational_role(requested_role TEXT)
RETURNS TEXT
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    actor_role TEXT;
    actor_school_id TEXT;
    token_session_id UUID;
BEGIN
    IF requested_role IS NULL OR requested_role NOT IN ('admin', 'teacher') THEN
        RAISE EXCEPTION 'Only the admin and teacher operational roles can be selected.';
    END IF;

    SELECT profile.role, profile.school_id
      INTO actor_role, actor_school_id
      FROM public.user_profiles profile
     WHERE profile.id = auth.uid()
       AND profile.status = 'active'
       AND NOT profile.must_change_password;

    IF actor_role IS NULL THEN
        RAISE EXCEPTION 'An active user profile is required.';
    END IF;

    IF actor_role NOT IN ('admin', 'teacher')
       OR (
           requested_role <> actor_role
           AND NOT (
               requested_role = 'admin'
               AND actor_role = 'teacher'
               AND public.is_school_admin_teacher(actor_school_id)
           )
           AND NOT (
               requested_role = 'teacher'
               AND actor_role = 'admin'
               AND public.is_current_teacher_in_school(actor_school_id)
           )
       ) THEN
        RAISE EXCEPTION 'Requested operational role is not assigned to this account.';
    END IF;

    token_session_id := NULLIF(auth.jwt() ->> 'session_id', '')::UUID;
    IF token_session_id IS NULL THEN
        RAISE EXCEPTION 'The authenticated session could not be identified.';
    END IF;

    DELETE FROM public.user_operational_role_sessions
     WHERE user_id = auth.uid()
       AND expires_at <= NOW();

    INSERT INTO public.user_operational_role_sessions (
        user_id,
        session_id,
        operational_role,
        expires_at
    )
    VALUES (
        auth.uid(),
        token_session_id,
        requested_role,
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (user_id, session_id)
    DO UPDATE SET
        operational_role = EXCLUDED.operational_role,
        expires_at = EXCLUDED.expires_at;

    RETURN requested_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.current_operational_role()
$$;

CREATE OR REPLACE FUNCTION public.can_manage_lms_course(target_school_id TEXT, target_course_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH actor AS (
        SELECT
            profile.school_id,
            public.current_operational_role() AS role,
            lower(coalesce(auth_user.email, '')) AS email
        FROM public.user_profiles profile
        LEFT JOIN auth.users auth_user ON auth_user.id = profile.id
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
          AND NOT profile.must_change_password
    ), target_course AS (
        SELECT course.*
        FROM public.courses course
        WHERE course.id = target_course_id
          AND course.school_id = target_school_id
    )
    SELECT EXISTS (
        SELECT 1
        FROM actor
        JOIN target_course ON target_course.school_id = actor.school_id
        WHERE actor.role = 'teacher'
          AND (
              (
                  actor.email <> ''
                  AND lower(trim(coalesce(target_course.teacher_email, ''))) = actor.email
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.teachers teacher
                  CROSS JOIN LATERAL regexp_split_to_table(
                      coalesce(target_course.teacher_name, ''), '[+,/]'
                  ) AS assigned_name(name)
                  WHERE teacher.school_id = actor.school_id
                    AND actor.email <> ''
                    AND lower(trim(coalesce(teacher.email, ''))) = actor.email
                    AND (
                        (
                            lower(trim(coalesce(target_course.teacher_email, ''))) <> ''
                            AND lower(trim(coalesce(target_course.teacher_email, ''))) = lower(trim(coalesce(teacher.email, '')))
                        )
                        OR public.lms_normalize_teacher_name(assigned_name.name) = public.lms_normalize_teacher_name(teacher.full_name_th)
                        OR public.lms_normalize_teacher_name(assigned_name.name) = public.lms_normalize_teacher_name(teacher.full_name_en)
                    )
              )
          )
    )
$$;

CREATE OR REPLACE FUNCTION public.is_current_teacher_for_timetable(
    target_school_id TEXT,
    target_teacher_name TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        JOIN public.teachers teacher
          ON teacher.school_id = profile.school_id
         AND lower(trim(coalesce(teacher.email, ''))) =
             lower(trim(coalesce(auth.jwt() ->> 'email', '')))
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
          AND NOT profile.must_change_password
          AND public.current_operational_role() = 'teacher'
          AND profile.school_id = target_school_id
          AND EXISTS (
              SELECT 1
              FROM regexp_split_to_table(
                  coalesce(target_teacher_name, ''), '[+,/]'
              ) AS assigned_name(name)
              WHERE public.lms_normalize_teacher_name(assigned_name.name) IN (
                  public.lms_normalize_teacher_name(teacher.full_name_th),
                  public.lms_normalize_teacher_name(teacher.full_name_en)
              )
          )
    )
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_access_student(
    target_school_id TEXT,
    target_student_id TEXT,
    target_student_number TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.current_operational_role() = 'teacher'
       AND (
            EXISTS (
                SELECT 1
                FROM public.courses course
                WHERE course.school_id = target_school_id
                  AND public.can_manage_lms_course(course.school_id, course.id)
                  AND jsonb_typeof(course.enrolled_student_ids) = 'array'
                  AND (
                      course.enrolled_student_ids ? coalesce(target_student_id, '')
                      OR course.enrolled_student_ids ? coalesce(target_student_number, '')
                  )
            )
            OR EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                JOIN public.teachers teacher
                  ON teacher.school_id = profile.school_id
                 AND lower(trim(coalesce(teacher.email, ''))) =
                     lower(trim(coalesce(auth.jwt() ->> 'email', '')))
                JOIN public.students student
                  ON student.school_id = teacher.school_id
                CROSS JOIN LATERAL jsonb_array_elements_text(
                    CASE
                        WHEN jsonb_typeof(teacher.homeroom_classes) = 'array'
                            THEN teacher.homeroom_classes
                        ELSE '[]'::jsonb
                    END
                ) AS homeroom(class_name)
                WHERE profile.id = auth.uid()
                  AND profile.status = 'active'
                  AND NOT profile.must_change_password
                  AND profile.school_id = target_school_id
                  AND student.school_id = target_school_id
                  AND (
                      student.id = target_student_id
                      OR student.student_id_number = target_student_number
                  )
                  AND regexp_replace(lower(trim(homeroom.class_name)), '[[:space:]]', '', 'g') IN (
                      regexp_replace(lower(trim(coalesce(student.room, ''))), '[[:space:]]', '', 'g'),
                      regexp_replace(lower(trim(coalesce(student.grade_level, '') || '/' || coalesce(student.room, ''))), '[[:space:]]', '', 'g')
                  )
            )
       )
$$;

CREATE OR REPLACE FUNCTION public.has_school_role(target_school_id TEXT, allowed_roles TEXT[])
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
          AND NOT profile.must_change_password
          AND public.current_operational_role() = ANY (allowed_roles)
          AND (profile.role = 'super_admin' OR profile.school_id = target_school_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.has_role_permission(
    target_school_id TEXT,
    target_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        CROSS JOIN LATERAL (
            SELECT public.current_operational_role() AS effective_role
        ) effective_actor
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
          AND NOT profile.must_change_password
          AND (profile.role = 'super_admin' OR profile.school_id = target_school_id)
          AND (
              effective_actor.effective_role = 'super_admin'
              OR COALESCE(
                  (
                      SELECT (role_config->'permissions'->>target_permission)::BOOLEAN
                      FROM public.super_admin_settings setting
                      CROSS JOIN LATERAL jsonb_array_elements(
                          CASE
                              WHEN jsonb_typeof(setting.setting_value) = 'array'
                                  THEN setting.setting_value
                              ELSE '[]'::jsonb
                          END
                      ) AS role_entries(role_config)
                      WHERE setting.setting_key = 'role_permissions'
                        AND role_config->>'role' = effective_actor.effective_role
                      LIMIT 1
                  ),
                  FALSE
              )
          )
    )
$$;

CREATE OR REPLACE FUNCTION public.get_my_role_permissions(requested_role TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    effective_role TEXT;
    role_config JSONB;
BEGIN
    effective_role := public.current_operational_role();
    IF effective_role IS NULL THEN
        RAISE EXCEPTION 'An active user profile is required.';
    END IF;

    IF requested_role IS NOT NULL AND requested_role <> effective_role THEN
        RAISE EXCEPTION 'Requested permission role does not match this session.';
    END IF;

    SELECT item
      INTO role_config
      FROM public.super_admin_settings setting
      CROSS JOIN LATERAL jsonb_array_elements(
          CASE
              WHEN jsonb_typeof(setting.setting_value) = 'array'
                  THEN setting.setting_value
              ELSE '[]'::jsonb
          END
      ) AS role_entries(item)
     WHERE setting.setting_key = 'role_permissions'
       AND item->>'role' = effective_role
     LIMIT 1;

    RETURN role_config;
END;
$$;

REVOKE ALL ON FUNCTION public.current_operational_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_operational_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_operational_role(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_lms_course(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_teacher_for_timetable(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_school_role(TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role_permission(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_role_permissions(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_operational_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_operational_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_operational_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_lms_course(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_teacher_for_timetable(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_school_role(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_permission(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role_permissions(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.teacher_can_access_student(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_access_student(TEXT, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "School members can read teachers" ON public.teachers;
CREATE POLICY "School members can read teachers" ON public.teachers
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'student', 'parent'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND lower(trim(coalesce(email, ''))) =
                    lower(trim(coalesce(auth.jwt() ->> 'email', '')))
            )
        )
    );

DROP POLICY IF EXISTS "School members can read timetable slots" ON public.timetable_slots;
CREATE POLICY "School members can read timetable slots" ON public.timetable_slots
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'student', 'parent'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND (
                public.is_current_teacher_for_timetable(school_id, teacher_name)
                OR (
                    course_id IS NOT NULL
                    AND public.can_manage_lms_course(school_id, course_id)
                )
            )
        )
    );

DROP POLICY IF EXISTS "School members can read assignments" ON public.school_assignments;
CREATE POLICY "School members can read assignments" ON public.school_assignments
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'student', 'parent'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND public.can_manage_lms_course(school_id, course_id)
        )
    );

DROP POLICY IF EXISTS "School staff manage assignments" ON public.school_assignments;
CREATE POLICY "School staff manage assignments" ON public.school_assignments
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND public.can_manage_lms_course(school_id, course_id)
        )
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND public.can_manage_lms_course(school_id, course_id)
        )
    );

DROP POLICY IF EXISTS "Users can read permitted homework submissions" ON public.homework_submissions;
CREATE POLICY "Users can read permitted homework submissions" ON public.homework_submissions
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND EXISTS (
                SELECT 1
                FROM public.school_assignments assignment
                WHERE assignment.id = homework_submissions.assignment_id
                  AND assignment.school_id = homework_submissions.school_id
                  AND public.can_manage_lms_course(assignment.school_id, assignment.course_id)
                  AND public.teacher_can_access_student(
                      homework_submissions.school_id,
                      homework_submissions.student_id,
                      NULL
                  )
            )
        )
        OR (
            school_id = public.current_user_school_id()
            AND public.can_access_student(student_id)
        )
    );

DROP POLICY IF EXISTS "School staff manage homework submissions" ON public.homework_submissions;
CREATE POLICY "School staff manage homework submissions" ON public.homework_submissions
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND public.has_role_permission(school_id, 'editGrades')
            AND EXISTS (
                SELECT 1
                FROM public.school_assignments assignment
                WHERE assignment.id = homework_submissions.assignment_id
                  AND assignment.school_id = homework_submissions.school_id
                  AND public.can_manage_lms_course(assignment.school_id, assignment.course_id)
                  AND public.teacher_can_access_student(
                      homework_submissions.school_id,
                      homework_submissions.student_id,
                      NULL
                  )
            )
        )
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND public.has_role_permission(school_id, 'editGrades')
            AND EXISTS (
                SELECT 1
                FROM public.school_assignments assignment
                WHERE assignment.id = homework_submissions.assignment_id
                  AND assignment.school_id = homework_submissions.school_id
                  AND public.can_manage_lms_course(assignment.school_id, assignment.course_id)
                  AND public.teacher_can_access_student(
                      homework_submissions.school_id,
                      homework_submissions.student_id,
                      NULL
                  )
            )
        )
    );

DROP POLICY IF EXISTS "School users can read permitted student records" ON public.school_student_records;
CREATE POLICY "School users can read permitted student records" ON public.school_student_records
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND (
                owner_user_id = auth.uid()
                OR (
                    record_kind = 'portfolio'
                    AND EXISTS (
                        SELECT 1
                        FROM public.teachers teacher
                        WHERE teacher.school_id = school_student_records.school_id
                          AND lower(trim(coalesce(teacher.email, ''))) =
                              lower(trim(coalesce(auth.jwt() ->> 'email', '')))
                          AND payload->>'ownerId' = teacher.id
                    )
                )
                OR (
                    student_id IS NOT NULL
                    AND public.teacher_can_access_student(school_id, student_id, NULL)
                )
            )
        )
        OR (
            owner_user_id = auth.uid()
            AND public.has_school_role(school_id, ARRAY['student', 'parent'])
        )
        OR (student_id IS NOT NULL AND public.can_access_student(student_id))
    );

DROP POLICY IF EXISTS "School staff manage student records" ON public.school_student_records;
CREATE POLICY "School staff manage student records" ON public.school_student_records
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND (
                owner_user_id = auth.uid()
                OR (
                    record_kind = 'portfolio'
                    AND EXISTS (
                        SELECT 1
                        FROM public.teachers teacher
                        WHERE teacher.school_id = school_student_records.school_id
                          AND lower(trim(coalesce(teacher.email, ''))) =
                              lower(trim(coalesce(auth.jwt() ->> 'email', '')))
                          AND payload->>'ownerId' = teacher.id
                    )
                )
                OR (
                    student_id IS NOT NULL
                    AND public.teacher_can_access_student(school_id, student_id, NULL)
                )
            )
        )
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND (
                owner_user_id = auth.uid()
                OR (
                    record_kind = 'portfolio'
                    AND EXISTS (
                        SELECT 1
                        FROM public.teachers teacher
                        WHERE teacher.school_id = school_student_records.school_id
                          AND lower(trim(coalesce(teacher.email, ''))) =
                              lower(trim(coalesce(auth.jwt() ->> 'email', '')))
                          AND payload->>'ownerId' = teacher.id
                    )
                )
                OR (
                    student_id IS NOT NULL
                    AND public.teacher_can_access_student(school_id, student_id, NULL)
                )
            )
        )
    );

DROP POLICY IF EXISTS "School staff manage leave requests" ON public.leave_requests;
CREATE POLICY "School staff manage leave requests" ON public.leave_requests
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "Teachers read own leave requests" ON public.leave_requests;
CREATE POLICY "Teachers read own leave requests" ON public.leave_requests
    FOR SELECT USING (
        user_role = 'teacher'
        AND user_id = auth.uid()::TEXT
        AND public.has_school_role(school_id, ARRAY['teacher'])
    );

DROP POLICY IF EXISTS "Teachers submit own leave requests" ON public.leave_requests;
CREATE POLICY "Teachers submit own leave requests" ON public.leave_requests
    FOR INSERT WITH CHECK (
        user_role = 'teacher'
        AND user_id = auth.uid()::TEXT
        AND status = 'pending'
        AND public.has_school_role(school_id, ARRAY['teacher'])
    );

DROP POLICY IF EXISTS "Teachers read assigned student leave requests" ON public.leave_requests;
CREATE POLICY "Teachers read assigned student leave requests" ON public.leave_requests
    FOR SELECT USING (
        user_role = 'student'
        AND public.has_school_role(school_id, ARRAY['teacher'])
        AND public.has_role_permission(school_id, 'recordAttendance')
        AND (
            public.teacher_can_access_student(school_id, user_id, NULL)
            OR (
                leave_scope = 'period_hourly'
                AND course_id IS NOT NULL
                AND public.can_manage_lms_course(school_id, course_id)
            )
        )
    );

DROP POLICY IF EXISTS "Teachers approve assigned student leave requests" ON public.leave_requests;
CREATE POLICY "Teachers approve assigned student leave requests" ON public.leave_requests
    FOR UPDATE USING (
        user_role = 'student'
        AND status = 'pending'
        AND public.has_school_role(school_id, ARRAY['teacher'])
        AND public.has_role_permission(school_id, 'recordAttendance')
        AND (
            public.teacher_can_access_student(school_id, user_id, NULL)
            OR (
                leave_scope = 'period_hourly'
                AND course_id IS NOT NULL
                AND public.can_manage_lms_course(school_id, course_id)
            )
        )
    )
    WITH CHECK (
        user_role = 'student'
        AND status IN ('approved', 'rejected')
        AND public.has_school_role(school_id, ARRAY['teacher'])
        AND public.has_role_permission(school_id, 'recordAttendance')
        AND (
            public.teacher_can_access_student(school_id, user_id, NULL)
            OR (
                leave_scope = 'period_hourly'
                AND course_id IS NOT NULL
                AND public.can_manage_lms_course(school_id, course_id)
            )
        )
    );

DROP POLICY IF EXISTS "arcade_player_profiles_school_read" ON public.arcade_player_profiles;
CREATE POLICY "arcade_player_profiles_school_read"
    ON public.arcade_player_profiles FOR SELECT TO authenticated
    USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'student', 'parent'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND (
                user_id = auth.uid()::TEXT
                OR public.teacher_can_access_student(school_id, student_id, NULL)
            )
        )
    );

DROP POLICY IF EXISTS "arcade_reward_redemptions_school_read" ON public.arcade_reward_redemptions;
CREATE POLICY "arcade_reward_redemptions_school_read"
    ON public.arcade_reward_redemptions FOR SELECT TO authenticated
    USING (
        (user_id = auth.uid()::TEXT AND public.has_school_role(school_id, ARRAY['student']))
        OR public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                WHERE profile.id::TEXT = arcade_reward_redemptions.user_id
                  AND profile.school_id = arcade_reward_redemptions.school_id
                  AND public.teacher_can_access_student(
                      profile.school_id,
                      profile.student_id,
                      NULL
                  )
            )
        )
    );

DROP POLICY IF EXISTS "arcade_reward_redemptions_staff_update" ON public.arcade_reward_redemptions;
CREATE POLICY "arcade_reward_redemptions_staff_update"
    ON public.arcade_reward_redemptions FOR UPDATE TO authenticated
    USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                WHERE profile.id::TEXT = arcade_reward_redemptions.user_id
                  AND profile.school_id = arcade_reward_redemptions.school_id
                  AND public.teacher_can_access_student(
                      profile.school_id,
                      profile.student_id,
                      NULL
                  )
            )
        )
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                WHERE profile.id::TEXT = arcade_reward_redemptions.user_id
                  AND profile.school_id = arcade_reward_redemptions.school_id
                  AND public.teacher_can_access_student(
                      profile.school_id,
                      profile.student_id,
                      NULL
                  )
            )
        )
    );

NOTIFY pgrst, 'reload schema';
COMMIT;
