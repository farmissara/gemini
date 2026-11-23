BEGIN;

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS temporary_password_issued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.has_school_role(target_school_id TEXT, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND status = 'active'
          AND NOT must_change_password
          AND role = ANY (allowed_roles)
          AND (role = 'super_admin' OR school_id = target_school_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_student(target_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.students student
        JOIN public.user_profiles profile ON profile.id = auth.uid()
        WHERE student.id = target_student_id
          AND profile.status = 'active'
          AND NOT profile.must_change_password
          AND (
              profile.role = 'super_admin'
              OR (
                  profile.role = 'student'
                  AND profile.school_id = student.school_id
                  AND profile.student_id = student.id
              )
              OR (
                  profile.role = 'parent'
                  AND EXISTS (
                      SELECT 1
                      FROM public.parent_student_links link
                      WHERE link.profile_id = profile.id
                        AND link.student_id = student.id
                        AND link.school_id = student.school_id
                  )
              )
          )
    )
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND NOT must_change_password
$$;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT school_id
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND NOT must_change_password
$$;

DO $$
BEGIN
    IF to_regprocedure('public.has_role_permission(text,text)') IS NOT NULL
       AND to_regclass('public.super_admin_settings') IS NOT NULL THEN
        EXECUTE $function$
            CREATE OR REPLACE FUNCTION public.has_role_permission(target_school_id TEXT, target_permission TEXT)
            RETURNS BOOLEAN
            LANGUAGE SQL
            STABLE
            SECURITY DEFINER
            SET search_path = public, auth, pg_temp
            AS $body$
                SELECT EXISTS (
                    SELECT 1
                    FROM public.user_profiles profile
                    WHERE profile.id = auth.uid()
                      AND profile.status = 'active'
                      AND NOT profile.must_change_password
                      AND (profile.role = 'super_admin' OR profile.school_id = target_school_id)
                      AND (
                          profile.role = 'super_admin'
                          OR COALESCE(
                              (
                                  SELECT (role_config->'permissions'->>target_permission)::BOOLEAN
                                  FROM public.super_admin_settings setting
                                  CROSS JOIN LATERAL jsonb_array_elements(setting.setting_value) role_config
                                  WHERE setting.setting_key = 'role_permissions'
                                    AND role_config->>'role' = profile.role
                                  LIMIT 1
                              ),
                              TRUE
                          )
                      )
                );
            $body$;
        $function$;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_student_password_change()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    UPDATE public.user_profiles profile
    SET must_change_password = FALSE,
        temporary_password_issued_at = NULL,
        temporary_password_expires_at = NULL
    FROM auth.users account
    WHERE profile.id = auth.uid()
      AND profile.id = account.id
      AND profile.role = 'student'
      AND profile.status = 'active'
      AND profile.must_change_password
      AND profile.temporary_password_issued_at IS NOT NULL
      AND account.updated_at > profile.temporary_password_issued_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A new password must be set before this account can be activated.';
    END IF;
END;
$$;

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can view student accounts';
    END IF;

    RETURN QUERY
    SELECT
        profile.id,
        profile.school_id,
        profile.student_id,
        profile.full_name_th,
        profile.full_name_en,
        profile.phone,
        profile.status,
        CASE
            WHEN account.email LIKE '%@accounts.eduverse.invalid' THEN NULL
            ELSE account.email::TEXT
        END,
        profile.created_at
    FROM public.user_profiles profile
    LEFT JOIN auth.users account ON account.id = profile.id
    WHERE profile.school_id = target_school_id
      AND profile.role = 'student'
    ORDER BY
        CASE WHEN profile.status = 'pending' THEN 0 WHEN profile.status = 'active' THEN 1 ELSE 2 END,
        profile.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_student_password_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_student_password_change() TO authenticated;
REVOKE ALL ON FUNCTION public.list_school_student_accounts(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_school_student_accounts(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
