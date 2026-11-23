-- Teachers can read the students, courses and timetable assigned to them,
-- while school registration and scheduling changes remain admin-only.

CREATE OR REPLACE FUNCTION public.teacher_can_access_student(
    target_school_id TEXT,
    target_student_id TEXT,
    target_student_number TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
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
        FROM public.students student
        JOIN public.teachers teacher ON teacher.school_id = student.school_id
        CROSS JOIN LATERAL jsonb_array_elements_text(
            CASE
                WHEN jsonb_typeof(teacher.homeroom_classes) = 'array' THEN teacher.homeroom_classes
                ELSE '[]'::jsonb
            END
        ) AS homeroom(class_name)
        WHERE student.school_id = target_school_id
          AND (student.id = target_student_id OR student.student_id_number = target_student_number)
          AND (
              lower(trim(coalesce(teacher.email, ''))) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
              OR teacher.full_name_th = (
                  SELECT profile.full_name_th
                  FROM public.user_profiles profile
                  WHERE profile.id = auth.uid()
                    AND profile.status = 'active'
              )
          )
          AND regexp_replace(lower(trim(homeroom.class_name)), '[[:space:]]', '', 'g') IN (
              regexp_replace(lower(trim(coalesce(student.room, ''))), '[[:space:]]', '', 'g'),
              regexp_replace(lower(trim(coalesce(student.grade_level, '') || '/' || coalesce(student.room, ''))), '[[:space:]]', '', 'g')
          )
    )
$$;

REVOKE ALL ON FUNCTION public.teacher_can_access_student(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_access_student(TEXT, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Members can read school students" ON public.students;
CREATE POLICY "Members can read school students" ON public.students
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
            OR public.teacher_can_access_student(school_id, id, student_id_number)
            OR public.can_access_student(id)
        )
    );

DROP POLICY IF EXISTS "School members can read courses" ON public.courses;
CREATE POLICY "School members can read courses" ON public.courses
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'student', 'parent'])
            OR public.can_manage_lms_course(school_id, id)
        )
    );
DROP POLICY IF EXISTS "School staff can manage courses" ON public.courses;
CREATE POLICY "School staff can manage courses" ON public.courses
    FOR ALL USING (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "School members can read teachers" ON public.teachers;
CREATE POLICY "School members can read teachers" ON public.teachers
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'student', 'parent'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND (
                    lower(trim(coalesce(email, ''))) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
                    OR full_name_th = (
                        SELECT profile.full_name_th
                        FROM public.user_profiles profile
                        WHERE profile.id = auth.uid()
                          AND profile.status = 'active'
                    )
                )
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
DROP POLICY IF EXISTS "School staff can manage timetable slots" ON public.timetable_slots;
CREATE POLICY "School staff can manage timetable slots" ON public.timetable_slots
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "School staff can manage school period times" ON public.school_period_times;
CREATE POLICY "School staff can manage school period times" ON public.school_period_times
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "Users can read permitted grades" ON public.grades;
CREATE POLICY "Users can read permitted grades" ON public.grades
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND course_id IS NOT NULL
                AND public.can_manage_lms_course(school_id, course_id)
            )
            OR public.can_access_student(student_id)
        )
    );
DROP POLICY IF EXISTS "School staff can manage grades" ON public.grades;
CREATE POLICY "School staff can manage grades" ON public.grades
    FOR ALL USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND course_id IS NOT NULL
                AND public.can_manage_lms_course(school_id, course_id)
                AND public.has_role_permission(school_id, 'editGrades')
            )
        )
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND course_id IS NOT NULL
                AND public.can_manage_lms_course(school_id, course_id)
                AND public.has_role_permission(school_id, 'editGrades')
            )
        )
    );

DROP POLICY IF EXISTS "Users can read permitted attendance" ON public.attendance;
CREATE POLICY "Users can read permitted attendance" ON public.attendance
    FOR SELECT USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND public.teacher_can_access_student(school_id, student_id, NULL)
            )
            OR public.can_access_student(student_id)
        )
    );
DROP POLICY IF EXISTS "School staff can manage attendance" ON public.attendance;
CREATE POLICY "School staff can manage attendance" ON public.attendance
    FOR ALL USING (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND public.teacher_can_access_student(school_id, student_id, NULL)
                AND public.has_role_permission(school_id, 'recordAttendance')
            )
        )
    )
    WITH CHECK (
        school_id IS NOT NULL
        AND (
            public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
            OR (
                public.has_school_role(school_id, ARRAY['teacher'])
                AND public.teacher_can_access_student(school_id, student_id, NULL)
                AND public.has_role_permission(school_id, 'recordAttendance')
            )
        )
    );

DO $$
BEGIN
    IF to_regclass('public.period_attendance') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "School staff manage period attendance" ON public.period_attendance';
        EXECUTE 'CREATE POLICY "School staff manage period attendance" ON public.period_attendance
            FOR ALL USING (
                public.has_school_role(school_id, ARRAY[''super_admin'', ''admin''])
                OR (
                    public.has_school_role(school_id, ARRAY[''teacher''])
                    AND public.can_manage_lms_course(school_id, course_id)
                    AND public.has_role_permission(school_id, ''recordAttendance'')
                )
            )
            WITH CHECK (
                public.has_school_role(school_id, ARRAY[''super_admin'', ''admin''])
                OR (
                    public.has_school_role(school_id, ARRAY[''teacher''])
                    AND public.can_manage_lms_course(school_id, course_id)
                    AND public.has_role_permission(school_id, ''recordAttendance'')
                )
            )';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
