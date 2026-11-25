-- Provide a secure RPC for school administrators (including dual-role school admin teachers)
-- to cancel or delete student account registrations/profiles and clean up the backing auth.users row.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_student_account_registration(
    target_school_id TEXT,
    target_user_id UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can delete student account registrations';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = target_user_id
          AND profile.school_id = target_school_id
          AND profile.role = 'student'
    ) THEN
        RAISE EXCEPTION 'Student account does not belong to this school';
    END IF;

    DELETE FROM public.user_profiles
    WHERE id = target_user_id
      AND school_id = target_school_id
      AND role = 'student';

    DELETE FROM auth.users
    WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_student_account_registration(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_student_account_registration(TEXT, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
