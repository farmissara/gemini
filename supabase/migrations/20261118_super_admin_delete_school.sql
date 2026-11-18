CREATE OR REPLACE FUNCTION public.delete_school_permanently(target_school_id TEXT)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.user_profiles actor
        WHERE actor.id = auth.uid()
          AND actor.role = 'super_admin'
          AND actor.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access required' USING ERRCODE = '42501';
    END IF;

    IF target_school_id IS NULL OR BTRIM(target_school_id) = '' THEN
        RAISE EXCEPTION 'A school ID is required';
    END IF;

    PERFORM 1
    FROM public.schools
    WHERE id = target_school_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'School not found';
    END IF;

    DELETE FROM auth.users account
    USING public.user_profiles profile
    WHERE profile.id = account.id
      AND profile.school_id = target_school_id;

    DELETE FROM public.schools
    WHERE id = target_school_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_school_permanently(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_school_permanently(TEXT) TO authenticated;
