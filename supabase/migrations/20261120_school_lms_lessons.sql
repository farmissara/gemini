CREATE TABLE IF NOT EXISTS public.school_lms_lessons (
    id TEXT NOT NULL,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL CHECK (chapter_number >= 1),
    title_th TEXT NOT NULL,
    title_en TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL DEFAULT 1 CHECK (duration_minutes >= 1),
    video_url TEXT,
    content TEXT NOT NULL DEFAULT '',
    materials JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(materials) = 'array'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, school_id),
    CONSTRAINT school_lms_lessons_course_school_fk
        FOREIGN KEY (course_id, school_id)
        REFERENCES public.courses(id, school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS school_lms_lessons_school_course_chapter_idx
    ON public.school_lms_lessons (school_id, course_id, chapter_number, created_at);

ALTER TABLE public.school_lms_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can read LMS lessons" ON public.school_lms_lessons;
CREATE POLICY "School members can read LMS lessons" ON public.school_lms_lessons
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

DROP POLICY IF EXISTS "School staff manage LMS lessons" ON public.school_lms_lessons;
CREATE POLICY "School staff manage LMS lessons" ON public.school_lms_lessons
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

CREATE TABLE IF NOT EXISTS public.school_lesson_completions (
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (school_id, lesson_id, student_id),
    CONSTRAINT school_lesson_completions_lesson_school_fk
        FOREIGN KEY (lesson_id, school_id)
        REFERENCES public.school_lms_lessons(id, school_id) ON DELETE CASCADE,
    CONSTRAINT school_lesson_completions_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS school_lesson_completions_school_student_idx
    ON public.school_lesson_completions (school_id, student_id, completed_at DESC);

ALTER TABLE public.school_lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read permitted lesson completions" ON public.school_lesson_completions;
CREATE POLICY "Users can read permitted lesson completions" ON public.school_lesson_completions
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR public.can_access_student(student_id)
    );

DROP POLICY IF EXISTS "Students can complete lessons for themselves" ON public.school_lesson_completions;
CREATE POLICY "Students can complete lessons for themselves" ON public.school_lesson_completions
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'student'
        AND school_id = public.current_user_school_id()
        AND public.can_access_student(student_id)
        AND EXISTS (
            SELECT 1 FROM public.school_lms_lessons lesson
            WHERE lesson.id = school_lesson_completions.lesson_id
              AND lesson.school_id = school_lesson_completions.school_id
        )
    );

DROP POLICY IF EXISTS "Students can update own lesson completions" ON public.school_lesson_completions;
CREATE POLICY "Students can update own lesson completions" ON public.school_lesson_completions
    FOR UPDATE USING (
        public.current_user_role() = 'student'
        AND school_id = public.current_user_school_id()
        AND public.can_access_student(student_id)
    )
    WITH CHECK (
        public.current_user_role() = 'student'
        AND school_id = public.current_user_school_id()
        AND public.can_access_student(student_id)
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_lms_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.school_lesson_completions TO authenticated;

NOTIFY pgrst, 'reload schema';
