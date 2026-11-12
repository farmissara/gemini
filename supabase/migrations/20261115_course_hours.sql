BEGIN;

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS total_hours NUMERIC(7,2),
    ADD COLUMN IF NOT EXISTS min_attendance_hours NUMERIC(7,2);

NOTIFY pgrst, 'reload schema';
COMMIT;
