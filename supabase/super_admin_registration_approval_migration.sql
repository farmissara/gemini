-- Allow an active Super Admin to manually confirm a pending school
-- administrator when confirmation email delivery is unavailable.
-- This does not approve student accounts.

ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approval_method TEXT;

-- A user's own profile must not be able to grant itself a privileged role,
-- change school membership, or reactivate a suspended account.
REVOKE UPDATE ON TABLE public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name_th, full_name_en, avatar_url, phone)
    ON TABLE public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_verified_school_signup()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        UPDATE public.user_profiles
        SET status = 'active'
        WHERE id = NEW.id AND role = 'admin' AND status = 'pending';

        UPDATE public.schools s
        SET status = 'active'
        FROM public.user_profiles p
        WHERE p.id = NEW.id
          AND p.role = 'admin'
          AND p.school_id = s.id
          AND s.status = 'pending';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.activate_verified_school_signup();

CREATE OR REPLACE FUNCTION public.list_pending_school_registrations()
RETURNS TABLE (
    user_id UUID,
    school_id TEXT,
    email TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    school_name_th TEXT,
    school_name_en TEXT,
    province TEXT,
    registration_created_at TIMESTAMPTZ,
    email_confirmed BOOLEAN
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.user_profiles actor
        WHERE actor.id = auth.uid()
          AND actor.role = 'super_admin'
          AND actor.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access required' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        profile.id,
        school.id,
        account.email::TEXT,
        profile.full_name_th,
        profile.full_name_en,
        school.name_th,
        school.name_en,
        school.province,
        account.created_at,
        account.email_confirmed_at IS NOT NULL
    FROM public.user_profiles profile
    JOIN public.schools school ON school.id = profile.school_id
    JOIN auth.users account ON account.id = profile.id
    WHERE profile.role = 'admin'
      AND profile.status = 'pending'
      AND school.status = 'pending'
    ORDER BY account.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_pending_school_registration(target_user_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    actor_id UUID := auth.uid();
    target_school_id TEXT;
    target_email_confirmed BOOLEAN;
BEGIN
    IF actor_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.user_profiles actor
        WHERE actor.id = actor_id
          AND actor.role = 'super_admin'
          AND actor.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Active Super Admin access required' USING ERRCODE = '42501';
    END IF;

    SELECT profile.school_id, account.email_confirmed_at IS NOT NULL
    INTO target_school_id, target_email_confirmed
    FROM public.user_profiles profile
    JOIN public.schools school ON school.id = profile.school_id
    JOIN auth.users account ON account.id = profile.id
    WHERE profile.id = target_user_id
      AND profile.role = 'admin'
      AND profile.status = 'pending'
      AND school.status = 'pending'
    FOR UPDATE OF profile, school, account;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No pending school registration found for this account';
    END IF;

    IF NOT target_email_confirmed THEN
        UPDATE auth.users
        SET email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = target_user_id
          AND email_confirmed_at IS NULL;
    END IF;

    UPDATE public.user_profiles
    SET status = 'active'
    WHERE id = target_user_id
      AND school_id = target_school_id
      AND role = 'admin'
      AND status = 'pending';

    UPDATE public.schools
    SET status = 'active',
        approved_at = NOW(),
        approved_by = actor_id,
        approval_method = CASE
            WHEN target_email_confirmed THEN 'admin_approved'
            ELSE 'admin_confirmed_email'
        END
    WHERE id = target_school_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_pending_school_registrations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_pending_school_registration(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_pending_school_registrations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pending_school_registration(UUID) TO authenticated;
