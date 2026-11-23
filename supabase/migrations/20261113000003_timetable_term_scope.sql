BEGIN;

ALTER TABLE public.timetable_slots
    ADD COLUMN IF NOT EXISTS academic_year TEXT,
    ADD COLUMN IF NOT EXISTS semester TEXT;

UPDATE public.timetable_slots AS slot
SET
    academic_year = COALESCE(NULLIF(BTRIM(slot.academic_year), ''), NULLIF(BTRIM(school.academic_year), '')),
    semester = COALESCE(NULLIF(BTRIM(slot.semester), ''), NULLIF(BTRIM(school.current_semester), ''))
FROM public.schools AS school
WHERE school.id = slot.school_id
  AND (
      NULLIF(BTRIM(slot.academic_year), '') IS NULL
      OR NULLIF(BTRIM(slot.semester), '') IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_timetable_slots_school_term_day
    ON public.timetable_slots(school_id, academic_year, semester, day_of_week, period_number);

ALTER TABLE public.timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_period_number_check;

ALTER TABLE public.timetable_slots
    ADD CONSTRAINT timetable_slots_period_number_check
    CHECK (period_number BETWEEN 1 AND 12);

COMMIT;

NOTIFY pgrst, 'reload schema';
