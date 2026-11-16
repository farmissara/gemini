ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS show_primary_course_credits BOOLEAN NOT NULL DEFAULT FALSE;
