-- =========================================================================
-- EduVerse: Leveled Purchasable Packages, Full Feature Gating & Student AI Control
-- Idempotent migration (safe to run multiple times in Supabase SQL Editor)
-- =========================================================================

BEGIN;

-- 1. Extend public.schools with package tier, full feature flags JSONB, and student AI access flag
ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'level_4',
    ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ai_student_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Package Catalog (4 purchasable levels configurable by Super Admin)
CREATE TABLE IF NOT EXISTS public.package_catalog (
    id TEXT PRIMARY KEY CHECK (id IN ('level_1', 'level_2', 'level_3', 'level_4')),
    level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 4),
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    audience_th TEXT NOT NULL DEFAULT '',
    audience_en TEXT NOT NULL DEFAULT '',
    description_th TEXT NOT NULL DEFAULT '',
    yearly_price_thb INTEGER NOT NULL DEFAULT 0 CHECK (yearly_price_thb >= 0),
    monthly_price_thb INTEGER NOT NULL DEFAULT 0 CHECK (monthly_price_thb >= 0),
    max_students INTEGER NOT NULL DEFAULT 500 CHECK (max_students >= 1),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    highlight_badge_th TEXT,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read package catalog" ON public.package_catalog;
CREATE POLICY "Authenticated users can read package catalog"
    ON public.package_catalog FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Super admin manages package catalog" ON public.package_catalog;
CREATE POLICY "Super admin manages package catalog"
    ON public.package_catalog FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.status = 'active'
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_catalog TO authenticated;

-- Seed default 4 Package Levels
INSERT INTO public.package_catalog (
    id, level_number, name_th, name_en, audience_th, audience_en, description_th,
    yearly_price_thb, monthly_price_thb, max_students, is_available, highlight_badge_th, features
) VALUES
(
    'level_1', 1, 'Level 1 · Starter Core', 'Level 1 · Starter Core',
    'สำหรับโรงเรียนขนาดเล็ก / เริ่มต้นงานวิชาการดิจิทัล',
    'For small schools starting core SIS & grading',
    'ครบชุดงานทะเบียนนักเรียน ครู รายวิชา ตารางสอน ปพ.5-ปพ.1 การบ้าน บัตรนักเรียน และประกาศ',
    4900, 490, 500, TRUE, NULL,
    '{"students":true,"teachers":true,"courses":true,"timetable":true,"gradebook":true,"homework":true,"announcements":true,"student_id_cards":true,"attendance":false,"mobile_checkin":false,"behavior_sdq":false,"infirmary":false,"billing":false,"portfolio":false,"parent_portal":false,"lms_classroom":false,"central_exam_hub":false,"executive_warning":false,"subject_labs":false,"games_3d":false,"boss_raid":false,"study_streak":false,"hall_of_fame":false,"ai_diagnostic":false,"socratic_tutor":false,"realworld_quests":false,"career_quest":false}'::jsonb
),
(
    'level_2', 2, 'Level 2 · Standard Campus', 'Level 2 · Standard Campus',
    'สำหรับโรงเรียนที่ต้องการระบบเช็คชื่อ ดูแลช่วยเหลือ & การเงิน',
    'For growing schools adding care, GPS check-in & billing',
    'เพิ่มระบบเช็คชื่อ QR/GPS มือถือ ใบลา ห้องพยาบาล SDQ การเงิน PromptPay แฟ้มผลงาน และพอร์ทัลผู้ปกครอง',
    11900, 1190, 1500, TRUE, NULL,
    '{"students":true,"teachers":true,"courses":true,"timetable":true,"gradebook":true,"homework":true,"announcements":true,"student_id_cards":true,"attendance":true,"mobile_checkin":true,"behavior_sdq":true,"infirmary":true,"billing":true,"portfolio":true,"parent_portal":true,"lms_classroom":false,"central_exam_hub":false,"executive_warning":false,"subject_labs":false,"games_3d":false,"boss_raid":false,"study_streak":false,"hall_of_fame":false,"ai_diagnostic":false,"socratic_tutor":false,"realworld_quests":false,"career_quest":false}'::jsonb
),
(
    'level_3', 3, 'Level 3 · Pro Learning & Arcade', 'Level 3 · Pro Learning & Arcade',
    'สำหรับโรงเรียนยุคใหม่เน้น Active Learning & แล็บจำลอง',
    'For interactive classrooms, LMS, exams & 3D labs',
    'เพิ่ม LMS ห้องเรียนออนไลน์ คลังข้อสอบ 8 สาระ พยากรณ์กลุ่มเสี่ยง เกมแข่งขัน 3D และห้องแล็บเสมือนจริง',
    19900, 1990, 3000, TRUE, 'ยอดนิยม',
    '{"students":true,"teachers":true,"courses":true,"timetable":true,"gradebook":true,"homework":true,"announcements":true,"student_id_cards":true,"attendance":true,"mobile_checkin":true,"behavior_sdq":true,"infirmary":true,"billing":true,"portfolio":true,"parent_portal":true,"lms_classroom":true,"central_exam_hub":true,"executive_warning":true,"subject_labs":true,"games_3d":true,"boss_raid":true,"study_streak":true,"hall_of_fame":true,"ai_diagnostic":false,"socratic_tutor":false,"realworld_quests":false,"career_quest":false}'::jsonb
),
(
    'level_4', 4, 'Level 4 · Enterprise AI Complete', 'Level 4 · Enterprise AI Complete',
    'สำหรับโรงเรียนชั้นนำครบทุกโมดูล + ชุด AI เต็มรูปแบบ',
    'All-inclusive campus suite with Career Quest AI & Tutors',
    'เปิดใช้ทุกโมดูล 100% พร้อม Career Quest AI, Socratic Tutor, AI Diagnostic และ Snap & Solve เต็มระบบ',
    29900, 2990, 5000, TRUE, 'ครบทุกฟีเจอร์',
    '{"students":true,"teachers":true,"courses":true,"timetable":true,"gradebook":true,"homework":true,"announcements":true,"student_id_cards":true,"attendance":true,"mobile_checkin":true,"behavior_sdq":true,"infirmary":true,"billing":true,"portfolio":true,"parent_portal":true,"lms_classroom":true,"central_exam_hub":true,"executive_warning":true,"subject_labs":true,"games_3d":true,"boss_raid":true,"study_streak":true,"hall_of_fame":true,"ai_diagnostic":true,"socratic_tutor":true,"realworld_quests":true,"career_quest":true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. School Package Purchase / Upgrade Orders
CREATE TABLE IF NOT EXISTS public.school_package_orders (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,
    target_level TEXT NOT NULL CHECK (target_level IN ('level_1', 'level_2', 'level_3', 'level_4')),
    target_level_name_th TEXT NOT NULL DEFAULT '',
    billing_cycle TEXT NOT NULL DEFAULT 'yearly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    list_price_thb INTEGER NOT NULL DEFAULT 0,
    promo_code TEXT,
    discount_thb INTEGER NOT NULL DEFAULT 0,
    final_amount_thb INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'promptpay' CHECK (payment_method IN ('promptpay', 'invoice')),
    slip_url TEXT,
    transfer_note TEXT,
    requested_by_name TEXT NOT NULL DEFAULT '',
    requested_by_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    review_note TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_package_orders_school
    ON public.school_package_orders(school_id, created_at DESC);

ALTER TABLE public.school_package_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School admins read own package orders" ON public.school_package_orders;
CREATE POLICY "School admins read own package orders"
    ON public.school_package_orders FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND (p.role = 'super_admin' OR (p.role = 'admin' AND p.school_id = school_package_orders.school_id))
        )
    );

DROP POLICY IF EXISTS "School admins submit own package orders" ON public.school_package_orders;
CREATE POLICY "School admins submit own package orders"
    ON public.school_package_orders FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND (p.role = 'super_admin' OR (p.role = 'admin' AND p.school_id = school_package_orders.school_id))
        )
    );

DROP POLICY IF EXISTS "Super admin updates package orders" ON public.school_package_orders;
CREATE POLICY "Super admin updates package orders"
    ON public.school_package_orders FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.status = 'active'
        )
    );

GRANT SELECT, INSERT, UPDATE ON public.school_package_orders TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
