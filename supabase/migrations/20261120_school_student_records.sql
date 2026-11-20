CREATE TABLE IF NOT EXISTS public.school_student_records (
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    record_kind TEXT NOT NULL CHECK (record_kind IN ('portfolio', 'behavior', 'sdq', 'infirmary')),
    record_id TEXT NOT NULL,
    student_id TEXT,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (school_id, record_kind, record_id),
    CONSTRAINT school_student_records_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS school_student_records_school_kind_student_idx
    ON public.school_student_records (school_id, record_kind, student_id);

ALTER TABLE public.school_student_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School users can read permitted student records" ON public.school_student_records;
CREATE POLICY "School users can read permitted student records" ON public.school_student_records
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR (
            owner_user_id = auth.uid()
            AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
        )
        OR (student_id IS NOT NULL AND public.can_access_student(student_id))
    );

DROP POLICY IF EXISTS "School staff manage student records" ON public.school_student_records;
CREATE POLICY "School staff manage student records" ON public.school_student_records
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

DROP POLICY IF EXISTS "Users can create own portfolio and SDQ records" ON public.school_student_records;
CREATE POLICY "Users can create own portfolio and SDQ records" ON public.school_student_records
    FOR INSERT WITH CHECK (
        record_kind = 'portfolio'
        AND (
            (
                owner_user_id = auth.uid()
                AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
            )
            OR (student_id IS NOT NULL AND public.can_access_student(student_id))
        )
        AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
        OR record_kind = 'sdq'
        AND student_id IS NOT NULL
        AND public.can_access_student(student_id)
        AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own portfolio records" ON public.school_student_records;
CREATE POLICY "Users can update own portfolio records" ON public.school_student_records
    FOR UPDATE USING (
        record_kind = 'portfolio'
        AND (
            (
                owner_user_id = auth.uid()
                AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
            )
            OR (student_id IS NOT NULL AND public.can_access_student(student_id))
        )
        AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
    )
    WITH CHECK (
        record_kind = 'portfolio'
        AND (
            (
                owner_user_id = auth.uid()
                AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
            )
            OR (student_id IS NOT NULL AND public.can_access_student(student_id))
        )
        AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete own portfolio records" ON public.school_student_records;
CREATE POLICY "Users can delete own portfolio records" ON public.school_student_records
    FOR DELETE USING (
        record_kind = 'portfolio'
        AND (
            (
                owner_user_id = auth.uid()
                AND public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
            )
            OR (student_id IS NOT NULL AND public.can_access_student(student_id))
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_student_records TO authenticated;

NOTIFY pgrst, 'reload schema';
