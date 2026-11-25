CREATE TABLE IF NOT EXISTS public.school_campus_records (
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    record_kind TEXT NOT NULL CHECK (
        record_kind IN (
            'consent_form',
            'consent_response',
            'risk_intervention',
            'lab_completion',
            'study_streak_pass'
        )
    ),
    record_id TEXT NOT NULL,
    student_id TEXT,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (school_id, record_kind, record_id)
);

CREATE INDEX IF NOT EXISTS school_campus_records_school_kind_idx
    ON public.school_campus_records (school_id, record_kind, student_id);

ALTER TABLE public.school_campus_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members read permitted campus records" ON public.school_campus_records;
CREATE POLICY "School members read permitted campus records" ON public.school_campus_records
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR (
            record_kind = 'consent_form'
            AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
        )
        OR (
            owner_user_id = auth.uid()
            AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
        )
        OR (student_id IS NOT NULL AND public.can_access_student(student_id))
    );

DROP POLICY IF EXISTS "School staff manage campus records" ON public.school_campus_records;
CREATE POLICY "School staff manage campus records" ON public.school_campus_records
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

DROP POLICY IF EXISTS "Parents submit own consent responses" ON public.school_campus_records;
CREATE POLICY "Parents submit own consent responses" ON public.school_campus_records
    FOR INSERT WITH CHECK (
        (
            record_kind = 'consent_response'
            AND student_id IS NOT NULL
            AND public.can_access_student(student_id)
            AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
        )
        OR (
            record_kind IN ('lab_completion', 'study_streak_pass')
            AND owner_user_id = auth.uid()
            AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
        )
    );

DROP POLICY IF EXISTS "Parents and students update own campus records" ON public.school_campus_records;
CREATE POLICY "Parents and students update own campus records" ON public.school_campus_records
    FOR UPDATE USING (
        (
            record_kind = 'consent_response'
            AND student_id IS NOT NULL
            AND public.can_access_student(student_id)
        )
        OR (
            record_kind IN ('lab_completion', 'study_streak_pass')
            AND owner_user_id = auth.uid()
            AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
        )
    )
    WITH CHECK (
        (
            record_kind = 'consent_response'
            AND student_id IS NOT NULL
            AND public.can_access_student(student_id)
            AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
        )
        OR (
            record_kind IN ('lab_completion', 'study_streak_pass')
            AND owner_user_id = auth.uid()
            AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_campus_records TO authenticated;

CREATE TABLE IF NOT EXISTS public.school_moe_qualitative (
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    record_kind TEXT NOT NULL CHECK (record_kind IN ('student_qualitative', 'pp5_course_config')),
    record_id TEXT NOT NULL,
    academic_year TEXT,
    semester TEXT,
    student_id TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (school_id, record_kind, record_id)
);

CREATE INDEX IF NOT EXISTS school_moe_qualitative_lookup_idx
    ON public.school_moe_qualitative (school_id, record_kind, academic_year, semester);

ALTER TABLE public.school_moe_qualitative ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School staff manage MOE qualitative records" ON public.school_moe_qualitative;
CREATE POLICY "School staff manage MOE qualitative records" ON public.school_moe_qualitative
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

DROP POLICY IF EXISTS "Students and parents read own qualitative records" ON public.school_moe_qualitative;
CREATE POLICY "Students and parents read own qualitative records" ON public.school_moe_qualitative
    FOR SELECT USING (
        record_kind = 'student_qualitative'
        AND student_id IS NOT NULL
        AND public.can_access_student(student_id)
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_moe_qualitative TO authenticated;

NOTIFY pgrst, 'reload schema';
