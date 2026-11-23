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
