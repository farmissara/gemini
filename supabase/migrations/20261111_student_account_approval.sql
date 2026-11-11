-- Allow school admins and super admins to approve or update pending student accounts
-- and optionally link them to a student record in one RPC call.

CREATE OR REPLACE FUNCTION public.list_school_student_accounts(target_school_id TEXT)
RETURNS TABLE (
    id UUID,
    school_id TEXT,
    student_id TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    phone TEXT,
    status TEXT,
    email TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can view student accounts';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.school_id,
        p.student_id,
        p.full_name_th,
        p.full_name_en,
        p.phone,
        p.status,
        u.email::TEXT,
        p.created_at
    FROM public.user_profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.school_id = target_school_id
      AND p.role = 'student'
    ORDER BY
        CASE WHEN p.status = 'pending' THEN 0 WHEN p.status = 'active' THEN 1 ELSE 2 END,
        p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_student_account(
    target_school_id TEXT,
    target_user_id UUID,
    target_student_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can approve student accounts';
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

    IF target_student_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.students student
        WHERE student.id = target_student_id
          AND student.school_id = target_school_id
    ) THEN
        RAISE EXCEPTION 'Student record does not belong to this school';
    END IF;

    UPDATE public.user_profiles
    SET
        status = 'active',
        student_id = COALESCE(target_student_id, student_id)
    WHERE id = target_user_id;

    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_account_status(
    target_school_id TEXT,
    target_user_id UUID,
    next_status TEXT
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF next_status NOT IN ('pending', 'active', 'suspended') THEN
        RAISE EXCEPTION 'Invalid account status';
    END IF;

    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can update student account status';
    END IF;

    UPDATE public.user_profiles
    SET status = next_status
    WHERE id = target_user_id
      AND school_id = target_school_id
      AND role = 'student';
END;
$$;

REVOKE ALL ON FUNCTION public.list_school_student_accounts(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_student_account(TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_student_account_status(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_school_student_accounts(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_account(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_account_status(TEXT, UUID, TEXT) TO authenticated;
