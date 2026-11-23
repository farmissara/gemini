-- Make permission checks fail closed and let an active user load only the
-- role-permission configuration used by the application UI.

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
        WHERE profile.id = auth.uid()
          AND profile.status = 'active'
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
                        AND role_config->>'role' = profile.role
                      LIMIT 1
                  ),
                  FALSE
              )
          )
    );
$$;

REVOKE ALL ON FUNCTION public.has_role_permission(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role_permission(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_role_permissions()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    actor_role TEXT;
    role_config JSONB;
BEGIN
    SELECT profile.role
      INTO actor_role
      FROM public.user_profiles profile
     WHERE profile.id = auth.uid()
       AND profile.status = 'active';

    IF actor_role IS NULL THEN
        RAISE EXCEPTION 'An active user profile is required.';
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
       AND item->>'role' = actor_role
     LIMIT 1;

    RETURN role_config;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_role_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role_permissions() TO authenticated;

-- These capabilities are intentionally administrator-only in the current
-- timetable/course RLS policies. Keep the editable Super Admin settings in
-- sync with the enforcement layer.
UPDATE public.super_admin_settings setting
   SET setting_value = (
       SELECT jsonb_agg(
           CASE
               WHEN item->>'role' = 'teacher' THEN
                   jsonb_set(
                       jsonb_set(item, '{permissions,manageCourses}', 'false'::jsonb, true),
                       '{permissions,manageTimetable}', 'false'::jsonb, true
                   )
               ELSE item
           END
           ORDER BY ordinal
       )
       FROM jsonb_array_elements(
           CASE
               WHEN jsonb_typeof(setting.setting_value) = 'array'
                   THEN setting.setting_value
               ELSE '[]'::jsonb
           END
       ) WITH ORDINALITY AS entries(item, ordinal)
   ),
       updated_at = NOW()
 WHERE setting.setting_key = 'role_permissions'
   AND jsonb_typeof(setting.setting_value) = 'array';
