-- Fix PL/pgSQL output-parameter collision ("column reference \"id\" is ambiguous")
-- in list_audit_logs and list_super_admin_accounts.

BEGIN;

CREATE OR REPLACE FUNCTION public.list_audit_logs(target_school_id TEXT DEFAULT NULL)
RETURNS TABLE (
    id BIGINT,
    school_id TEXT,
    school_name TEXT,
    actor_name TEXT,
    actor_role TEXT,
    action_type TEXT,
    target_label TEXT,
    details TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles caller
        WHERE caller.id = auth.uid() AND caller.role = 'super_admin' AND caller.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;
    RETURN QUERY
    SELECT log.id, log.school_id, log.school_name, log.actor_name, log.actor_role,
           log.action_type, log.target_label, log.details, log.created_at
    FROM public.audit_logs log
    WHERE target_school_id IS NULL OR log.school_id = target_school_id
    ORDER BY log.created_at DESC
    LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_super_admin_accounts(
    page_limit INTEGER DEFAULT 100,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    role TEXT,
    school_id TEXT,
    status TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles caller
        WHERE caller.id = auth.uid() AND caller.role = 'super_admin' AND caller.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access is required.';
    END IF;
    RETURN QUERY
    SELECT profile.id, account.email::TEXT, profile.full_name_th, profile.full_name_en,
           profile.role, profile.school_id, profile.status, profile.avatar_url,
           profile.created_at
    FROM public.user_profiles profile
    LEFT JOIN auth.users account ON account.id = profile.id
    ORDER BY profile.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(page_limit, 100), 1), 500)
    OFFSET GREATEST(COALESCE(page_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.list_audit_logs(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_super_admin_accounts(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_audit_logs(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admin_accounts(INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
