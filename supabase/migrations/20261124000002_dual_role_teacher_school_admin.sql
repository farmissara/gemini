BEGIN;

CREATE OR REPLACE FUNCTION public.is_school_admin_teacher(target_school_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        JOIN public.teachers teacher
          ON teacher.school_id = profile.school_id
        WHERE profile.id = auth.uid()
          AND profile.role = 'teacher'
          AND profile.status = 'active'
          AND NOT profile.must_change_password
          AND profile.school_id = target_school_id
          AND teacher.is_school_admin IS TRUE
          AND lower(trim(coalesce(teacher.email, ''))) =
              lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
$$;

REVOKE ALL ON FUNCTION public.is_school_admin_teacher(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_school_admin_teacher(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_current_teacher_in_school(target_school_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        JOIN public.teachers teacher
          ON teacher.school_id = profile.school_id
        WHERE profile.id = auth.uid()
          AND profile.role IN ('admin', 'teacher')
          AND profile.status = 'active'
          AND NOT profile.must_change_password
          AND profile.school_id = target_school_id
          AND lower(trim(coalesce(teacher.email, ''))) =
              lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
$$;

REVOKE ALL ON FUNCTION public.is_current_teacher_in_school(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_teacher_in_school(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_school_role(target_school_id TEXT, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
          AND NOT profile.must_change_password
          AND (profile.role = ANY (allowed_roles)
               OR ('admin' = ANY (allowed_roles)
                   AND public.is_school_admin_teacher(target_school_id))
               OR ('teacher' = ANY (allowed_roles)
                   AND profile.role = 'admin'
                   AND public.is_current_teacher_in_school(target_school_id)))
          AND (profile.role = 'super_admin' OR profile.school_id = target_school_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.has_role_permission(
    target_school_id TEXT,
    target_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        CROSS JOIN LATERAL (
            SELECT CASE
                WHEN profile.role = 'teacher'
                     AND public.is_school_admin_teacher(target_school_id)
                    THEN 'admin'
                ELSE profile.role
            END AS effective_role
        ) effective_actor
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
                      CROSS JOIN LATERAL jsonb_array_elements(
                          CASE
                              WHEN jsonb_typeof(setting.setting_value) = 'array'
                                  THEN setting.setting_value
                              ELSE '[]'::jsonb
                          END
                      ) AS role_entries(role_config)
                      WHERE setting.setting_key = 'role_permissions'
                        AND role_config->>'role' = effective_actor.effective_role
                      LIMIT 1
                  ),
                  FALSE
              )
          )
    )
$$;

DROP FUNCTION IF EXISTS public.get_my_role_permissions();
CREATE OR REPLACE FUNCTION public.get_my_role_permissions(requested_role TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    profile_role TEXT;
    actor_school_id TEXT;
    permission_role TEXT;
    role_config JSONB;
BEGIN
    SELECT profile.role, profile.school_id
      INTO profile_role, actor_school_id
      FROM public.user_profiles profile
     WHERE profile.id = auth.uid()
       AND profile.status = 'active'
       AND NOT profile.must_change_password;

    IF profile_role IS NULL THEN
        RAISE EXCEPTION 'An active user profile is required.';
    END IF;

    permission_role := coalesce(requested_role, profile_role);
    IF permission_role <> profile_role
       AND NOT (
           permission_role = 'admin'
           AND profile_role = 'teacher'
           AND public.is_school_admin_teacher(actor_school_id)
       )
       AND NOT (
           permission_role = 'teacher'
           AND profile_role = 'admin'
           AND EXISTS (
               SELECT 1
               FROM public.teachers teacher
               WHERE teacher.school_id = actor_school_id
                 AND lower(trim(coalesce(teacher.email, ''))) =
                     lower(trim(coalesce(auth.jwt() ->> 'email', '')))
           )
       ) THEN
        RAISE EXCEPTION 'Requested role is not assigned to this account.';
    END IF;

    SELECT item
      INTO role_config
      FROM public.super_admin_settings setting
      CROSS JOIN LATERAL jsonb_array_elements(
          CASE
              WHEN jsonb_typeof(setting.setting_value) = 'array'
                  THEN setting.setting_value
              ELSE '[]'::jsonb
          END
      ) AS role_entries(item)
     WHERE setting.setting_key = 'role_permissions'
       AND item->>'role' = permission_role
     LIMIT 1;

    RETURN role_config;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_role_permissions(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role_permissions(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
