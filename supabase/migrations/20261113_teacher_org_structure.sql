BEGIN;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS reports_to_teacher_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teachers_reports_to_teacher_same_school_fkey'
      AND conrelid = 'public.teachers'::regclass
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_reports_to_teacher_same_school_fkey
      FOREIGN KEY (reports_to_teacher_id, school_id)
      REFERENCES public.teachers(id, school_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teachers_no_self_manager'
      AND conrelid = 'public.teachers'::regclass
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_no_self_manager
      CHECK (reports_to_teacher_id IS NULL OR reports_to_teacher_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teachers_school_reports_to
  ON public.teachers(school_id, reports_to_teacher_id);

COMMIT;

NOTIFY pgrst, 'reload schema';
