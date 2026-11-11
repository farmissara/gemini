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
