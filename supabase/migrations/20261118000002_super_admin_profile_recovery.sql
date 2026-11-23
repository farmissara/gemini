-- Ensure the master account always has an active Super Admin application profile.
-- Run this migration once in Supabase, then Sign Out / Sign In again.

CREATE OR REPLACE FUNCTION public.ensure_master_super_admin_profile()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    master_email TEXT := 'baanpakkru@gmail.com';
BEGIN
    IF lower(coalesce(NEW.email, '')) <> master_email THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.user_profiles (
        id,
        school_id,
        role,
        status,
        full_name_th,
        full_name_en,
        avatar_url,
        phone
    )
    VALUES (
        NEW.id,
        NULL,
        'super_admin',
        'active',
        'ผู้ดูแลระบบสูงสุด',
        'Super Admin',
        '',
        NULL
    )
    ON CONFLICT (id) DO UPDATE
    SET
        school_id = NULL,
        role = 'super_admin',
        status = 'active';

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_master_super_admin_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_master_super_admin_created ON auth.users;
CREATE TRIGGER on_auth_master_super_admin_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_master_super_admin_profile();

INSERT INTO public.user_profiles (
    id,
    school_id,
    role,
    status,
    full_name_th,
    full_name_en,
    avatar_url,
    phone
)
SELECT
    u.id,
    NULL,
    'super_admin',
    'active',
    'ผู้ดูแลระบบสูงสุด',
    'Super Admin',
    '',
    NULL
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE lower(coalesce(u.email, '')) = 'baanpakkru@gmail.com'
  AND p.id IS NULL;

UPDATE public.user_profiles p
SET
    school_id = NULL,
    role = 'super_admin',
    status = 'active'
FROM auth.users u
WHERE p.id = u.id
  AND lower(coalesce(u.email, '')) = 'baanpakkru@gmail.com';
