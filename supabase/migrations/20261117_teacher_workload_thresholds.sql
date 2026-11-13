BEGIN;

ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS teaching_load_min_periods INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS teaching_load_max_periods INTEGER NOT NULL DEFAULT 22;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'schools_teaching_load_min_periods_check'
          AND conrelid = 'public.schools'::regclass
    ) THEN
        ALTER TABLE public.schools
            ADD CONSTRAINT schools_teaching_load_min_periods_check
            CHECK (teaching_load_min_periods BETWEEN 0 AND 60);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'schools_teaching_load_max_periods_check'
          AND conrelid = 'public.schools'::regclass
    ) THEN
        ALTER TABLE public.schools
            ADD CONSTRAINT schools_teaching_load_max_periods_check
            CHECK (teaching_load_max_periods BETWEEN 0 AND 60);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'schools_teaching_load_thresholds_check'
          AND conrelid = 'public.schools'::regclass
    ) THEN
        ALTER TABLE public.schools
            ADD CONSTRAINT schools_teaching_load_thresholds_check
            CHECK (teaching_load_min_periods <= teaching_load_max_periods);
    END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
