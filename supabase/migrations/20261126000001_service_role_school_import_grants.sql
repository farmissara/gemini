-- Allow trusted server-side service_role clients to preflight and upsert the
-- core school export. Do not grant DELETE; the importer never deletes rows.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.schools,
  public.students,
  public.teachers,
  public.courses,
  public.school_period_times,
  public.timetable_slots
TO service_role;
