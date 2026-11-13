-- Allow flexible periods (> 7) and custom break periods in school_period_times
ALTER TABLE public.school_period_times
  DROP CONSTRAINT IF EXISTS school_period_times_period_number_check,
  DROP CONSTRAINT IF EXISTS school_period_times_check1;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.school_period_times'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%period_number%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.school_period_times DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.school_period_times
  ADD CONSTRAINT school_period_times_period_number_range CHECK (period_number >= 0 AND period_number <= 99);
