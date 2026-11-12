BEGIN;

CREATE TABLE IF NOT EXISTS public.school_exam_entitlements (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    pack_id TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK (claim_type IN ('free', 'purchased')),
    amount_paid_thb NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'free' CHECK (payment_method IN ('free', 'promptpay', 'invoice')),
    claimed_by TEXT NOT NULL DEFAULT '',
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    slip_url TEXT,
    slip_attached_at TIMESTAMPTZ,
    audit_status TEXT NOT NULL DEFAULT 'verified'
        CHECK (audit_status IN ('pending_audit', 'verified', 'revoked')),
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revocation_reason TEXT,
    UNIQUE (school_id, pack_id)
);

ALTER TABLE public.school_exam_entitlements
    ADD COLUMN IF NOT EXISTS slip_url TEXT,
    ADD COLUMN IF NOT EXISTS slip_attached_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS audit_status TEXT NOT NULL DEFAULT 'verified'
        CHECK (audit_status IN ('pending_audit', 'verified', 'revoked')),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by TEXT,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS revoked_by TEXT,
    ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

DROP POLICY IF EXISTS "Super admins audit exam entitlements" ON public.school_exam_entitlements;
CREATE POLICY "Super admins audit exam entitlements"
    ON public.school_exam_entitlements
    FOR UPDATE USING (
        public.has_school_role(school_id, ARRAY['super_admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin'])
    );

CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri')),
    period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    course_id TEXT,
    course_code TEXT NOT NULL DEFAULT '',
    course_title_th TEXT NOT NULL DEFAULT '',
    course_title_en TEXT NOT NULL DEFAULT '',
    teacher_name TEXT NOT NULL DEFAULT '',
    room TEXT NOT NULL DEFAULT '',
    classroom TEXT NOT NULL DEFAULT '',
    color_tag TEXT NOT NULL DEFAULT 'sky',
    credits NUMERIC(4,1) NOT NULL DEFAULT 1.5,
    total_semester_hours NUMERIC(6,1) NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT timetable_slots_course_school_fk
        FOREIGN KEY (course_id)
        REFERENCES public.courses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_school_day
    ON public.timetable_slots(school_id, day_of_week, period_number);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can read timetable slots" ON public.timetable_slots;
CREATE POLICY "School members can read timetable slots"
    ON public.timetable_slots
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

CREATE OR REPLACE FUNCTION public.is_current_teacher_for_timetable(
    target_school_id TEXT,
    target_teacher_name TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        JOIN public.teachers teacher
          ON teacher.school_id = profile.school_id
         AND lower(teacher.email) = lower(auth.jwt() ->> 'email')
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
          AND profile.role = 'teacher'
          AND profile.school_id = target_school_id
          AND teacher.full_name_th = target_teacher_name
    )
$$;

REVOKE ALL ON FUNCTION public.is_current_teacher_for_timetable(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_teacher_for_timetable(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "School staff can manage timetable slots" ON public.timetable_slots;
CREATE POLICY "School staff can manage timetable slots"
    ON public.timetable_slots
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR public.is_current_teacher_for_timetable(school_id, teacher_name)
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
        OR public.is_current_teacher_for_timetable(school_id, teacher_name)
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_slots TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
