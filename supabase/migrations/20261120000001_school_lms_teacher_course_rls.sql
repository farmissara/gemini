-- Restrict lesson authoring to administrators and teachers assigned to the course.
-- Apply after 20261120_school_lms_lessons.sql.

CREATE OR REPLACE FUNCTION public.lms_normalize_teacher_name(target_name TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
SET search_path = public, pg_temp
AS $$
    SELECT regexp_replace(
        regexp_replace(
            lower(trim(coalesce(target_name, ''))),
            '^(อ[.]ดร[.]|ดร[.]|ผศ[.]|รศ[.]|ศ[.]|อาจารย์|คุณครู|ครู|นาย|นางสาว|นาง|น[.]ส[.]|mr[.]?|mrs[.]?|ms[.]?)',
            '',
            'i'
        ),
        '[[:space:].]+',
        '',
        'g'
    )
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
            profile.id,
            profile.school_id,
            profile.role,
            profile.full_name_th,
            profile.full_name_en,
            lower(coalesce(auth_user.email, '')) AS email
        FROM public.user_profiles profile
        LEFT JOIN auth.users auth_user ON auth_user.id = profile.id
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
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
                    AND (
                        (actor.email <> '' AND lower(trim(coalesce(teacher.email, ''))) = actor.email)
                        OR public.lms_normalize_teacher_name(teacher.full_name_th) = public.lms_normalize_teacher_name(actor.full_name_th)
                        OR public.lms_normalize_teacher_name(teacher.full_name_en) = public.lms_normalize_teacher_name(actor.full_name_en)
                    )
                    AND (
                        (
                            lower(trim(coalesce(target_course.teacher_email, ''))) <> ''
                            AND lower(trim(coalesce(target_course.teacher_email, ''))) = lower(trim(coalesce(teacher.email, '')))
                        )
                        OR public.lms_normalize_teacher_name(assigned_name.name) = public.lms_normalize_teacher_name(teacher.full_name_th)
                        OR public.lms_normalize_teacher_name(assigned_name.name) = public.lms_normalize_teacher_name(teacher.full_name_en)
                    )
              )
              OR EXISTS (
                  SELECT 1
                  FROM (
                      VALUES (actor.full_name_th), (actor.full_name_en)
                  ) AS actor_name(name)
                  CROSS JOIN LATERAL regexp_split_to_table(
                      coalesce(target_course.teacher_name, ''), '[+,/]'
                  ) AS assigned_name(name)
                  WHERE public.lms_normalize_teacher_name(actor_name.name) <> ''
                    AND public.lms_normalize_teacher_name(actor_name.name) = public.lms_normalize_teacher_name(assigned_name.name)
              )
          )
    )
$$;

REVOKE ALL ON FUNCTION public.lms_normalize_teacher_name(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_lms_course(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_lms_course(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "School staff manage LMS lessons" ON public.school_lms_lessons;
CREATE POLICY "School staff manage assigned LMS lessons" ON public.school_lms_lessons
    FOR ALL
    USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR public.can_manage_lms_course(school_id, course_id)
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR public.can_manage_lms_course(school_id, course_id)
    );

NOTIFY pgrst, 'reload schema';
