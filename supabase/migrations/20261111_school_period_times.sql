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
