ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS semester_options JSONB NOT NULL DEFAULT '["1", "2", "Summer"]'::jsonb,
  ADD COLUMN IF NOT EXISTS grading_system TEXT NOT NULL DEFAULT 'thai',
  ADD COLUMN IF NOT EXISTS staff_position_options JSONB NOT NULL DEFAULT '["นักการภารโรง", "เจ้าหน้าที่ธุรการ", "ครูอัตราจ้าง", "ครูผู้ช่วย", "ครู", "รองผู้อำนวยการ", "ผู้อำนวยการ"]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schools_grading_system_check'
      AND conrelid = 'public.schools'::regclass
  ) THEN
    ALTER TABLE public.schools
      ADD CONSTRAINT schools_grading_system_check
      CHECK (grading_system IN ('thai', 'international'));
  END IF;
END $$;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS position_title TEXT;
