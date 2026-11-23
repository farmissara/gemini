CREATE TABLE IF NOT EXISTS public.school_assignments (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL DEFAULT '',
    title_th TEXT NOT NULL,
    title_en TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    due_date TEXT NOT NULL,
    points NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (points >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT school_assignments_id_school_unique UNIQUE (id, school_id),
    CONSTRAINT school_assignments_course_school_fk
        FOREIGN KEY (course_id, school_id)
        REFERENCES public.courses(id, school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.homework_submissions (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    assignment_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    assignment_title TEXT NOT NULL,
    course_code TEXT NOT NULL DEFAULT '',
    course_title_th TEXT NOT NULL DEFAULT '',
    student_name TEXT NOT NULL DEFAULT '',
    student_room TEXT NOT NULL DEFAULT '',
    due_date TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('submitted', 'late', 'pending', 'graded')),
    file_attachment JSONB,
    text_submission TEXT,
    score NUMERIC(8,2),
    max_score NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (max_score >= 0),
    teacher_feedback TEXT,
    graded_at TIMESTAMPTZ,
    graded_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT homework_submissions_assignment_school_fk
        FOREIGN KEY (assignment_id, school_id)
        REFERENCES public.school_assignments(id, school_id) ON DELETE CASCADE,
    CONSTRAINT homework_submissions_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS school_assignments_school_course_due_idx
    ON public.school_assignments (school_id, course_id, due_date);
CREATE INDEX IF NOT EXISTS homework_submissions_school_assignment_idx
    ON public.homework_submissions (school_id, assignment_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS homework_submissions_school_student_idx
    ON public.homework_submissions (school_id, student_id, submitted_at DESC);

ALTER TABLE public.school_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can read assignments" ON public.school_assignments;
CREATE POLICY "School members can read assignments" ON public.school_assignments
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

DROP POLICY IF EXISTS "School staff manage assignments" ON public.school_assignments;
CREATE POLICY "School staff manage assignments" ON public.school_assignments
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

DROP POLICY IF EXISTS "Users can read permitted homework submissions" ON public.homework_submissions;
CREATE POLICY "Users can read permitted homework submissions" ON public.homework_submissions
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
        OR (
            school_id = public.current_user_school_id()
            AND public.can_access_student(student_id)
        )
    );

DROP POLICY IF EXISTS "Students can submit own homework" ON public.homework_submissions;
CREATE POLICY "Students can submit own homework" ON public.homework_submissions
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'student'
        AND school_id = public.current_user_school_id()
        AND public.can_access_student(student_id)
        AND status IN ('submitted', 'late')
        AND score IS NULL
        AND graded_at IS NULL
        AND EXISTS (
            SELECT 1
            FROM public.school_assignments assignment
            WHERE assignment.id = homework_submissions.assignment_id
              AND assignment.school_id = homework_submissions.school_id
              AND assignment.status = 'active'
        )
    );

DROP POLICY IF EXISTS "School staff manage homework submissions" ON public.homework_submissions;
CREATE POLICY "School staff manage homework submissions" ON public.homework_submissions
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
