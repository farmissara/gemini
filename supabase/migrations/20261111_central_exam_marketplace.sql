-- =========================================================================
-- EduVerse - Central Exam Bank (8 Strands) & School Entitlements Marketplace
-- =========================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.central_exam_packs (
    id TEXT PRIMARY KEY,
    title_th TEXT NOT NULL,
    title_en TEXT NOT NULL,
    strand TEXT NOT NULL CHECK (strand IN ('thai', 'math', 'science_tech', 'social', 'health_pe', 'arts', 'career_tech', 'foreign_lang')),
    grade_level TEXT NOT NULL DEFAULT 'ป.1 - ม.6',
    description_th TEXT NOT NULL DEFAULT '',
    pricing_type TEXT NOT NULL DEFAULT 'free' CHECK (pricing_type IN ('free', 'paid')),
    price_thb NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL DEFAULT 'Super Admin',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_central_exam_packs_status_strand
    ON public.central_exam_packs(status, strand);

ALTER TABLE public.central_exam_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manages central exam packs" ON public.central_exam_packs;
CREATE POLICY "Super admin manages central exam packs"
    ON public.central_exam_packs
    FOR ALL USING (
        public.current_user_role() = 'super_admin'
    )
    WITH CHECK (
        public.current_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "Authenticated users read published central exam packs" ON public.central_exam_packs;
CREATE POLICY "Authenticated users read published central exam packs"
    ON public.central_exam_packs
    FOR SELECT USING (
        status = 'published'
        AND auth.uid() IS NOT NULL
    );

REVOKE SELECT ON public.central_exam_packs FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id, title_th, title_en, strand, grade_level, description_th,
    pricing_type, price_thb, status, created_by, published_at, created_at, updated_at
) ON public.central_exam_packs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.central_exam_packs TO authenticated;

-- School Entitlements (Tracks which central exam packs each school claimed for free or purchased)
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

CREATE INDEX IF NOT EXISTS idx_school_exam_entitlements_school
    ON public.school_exam_entitlements(school_id);

ALTER TABLE public.school_exam_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members read school exam entitlements" ON public.school_exam_entitlements;
CREATE POLICY "School members read school exam entitlements"
    ON public.school_exam_entitlements
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

DROP POLICY IF EXISTS "School admins claim or buy central exam packs" ON public.school_exam_entitlements;

DROP POLICY IF EXISTS "Super admins audit exam entitlements" ON public.school_exam_entitlements;
CREATE POLICY "Super admins audit exam entitlements"
    ON public.school_exam_entitlements
    FOR UPDATE USING (
        public.has_school_role(school_id, ARRAY['super_admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin'])
    );

REVOKE INSERT, UPDATE ON public.school_exam_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.school_exam_entitlements TO authenticated;
GRANT UPDATE (
    audit_status, verified_at, verified_by, revoked_at, revoked_by, revocation_reason
) ON public.school_exam_entitlements TO authenticated;

-- School Question Bank (Claimed central exams + teacher-created/imported questions)
CREATE TABLE IF NOT EXISTS public.school_questions (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    pack_id TEXT,
    strand TEXT,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL DEFAULT 'ป.1 - ม.6',
    category TEXT NOT NULL DEFAULT 'standard_exam',
    question_th TEXT NOT NULL,
    question_en TEXT NOT NULL DEFAULT '',
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index SMALLINT NOT NULL DEFAULT 0,
    explanation_th TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_questions_school
    ON public.school_questions(school_id, strand);

ALTER TABLE public.school_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members read school questions" ON public.school_questions;
CREATE POLICY "School members read school questions"
    ON public.school_questions
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
    );

DROP POLICY IF EXISTS "School staff manage school questions" ON public.school_questions;
CREATE POLICY "School staff manage school questions"
    ON public.school_questions
    FOR ALL USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_questions TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
