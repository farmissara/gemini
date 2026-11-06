-- Enable self-service school registration for projects that already ran the
-- previous EduVerse schema. New schools become active after email confirmation.

CREATE OR REPLACE FUNCTION public.handle_auth_user_signup()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    signup_type TEXT := NEW.raw_user_meta_data ->> 'signup_type';
    requested_school_id TEXT := NEW.raw_user_meta_data ->> 'school_id';
    new_school_id TEXT;
    school_name_th TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_th'), '');
    school_name_en TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_en'), '');
    school_type TEXT := COALESCE(NEW.raw_user_meta_data ->> 'school_type', 'public');
    school_province TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_province'), '');
    school_slug TEXT;
    school_status TEXT;
BEGIN
    IF signup_type IS NULL AND requested_school_id IS NOT NULL THEN
        signup_type := 'student';
    END IF;
    IF signup_type IS NULL THEN
        RETURN NEW;
    END IF;

    IF signup_type = 'school_admin' THEN
        IF school_name_th IS NULL OR school_province IS NULL THEN
            RAISE EXCEPTION 'School name and province are required';
        END IF;
        IF school_type NOT IN ('public', 'private', 'international', 'demonstration') THEN
            RAISE EXCEPTION 'Invalid school type';
        END IF;

        new_school_id := 'school-' || NEW.id::TEXT;
        school_slug := TRIM(BOTH '-' FROM REGEXP_REPLACE(
            LOWER(COALESCE(school_name_en, 'school')),
            '[^a-z0-9]+',
            '-',
            'g'
        ));
        IF school_slug = '' THEN
            school_slug := 'school';
        END IF;
        school_slug := school_slug || '-' || REPLACE(NEW.id::TEXT, '-', '');
        school_status := CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active' ELSE 'pending' END;

        INSERT INTO public.schools (
            id, code, name_th, name_en, slug, type, province, email, phone, status
        ) VALUES (
            new_school_id,
            'EDU-' || UPPER(REPLACE(NEW.id::TEXT, '-', '')),
            school_name_th,
            COALESCE(school_name_en, school_name_th),
            school_slug,
            school_type,
            school_province,
            NEW.email,
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), ''),
            school_status
        );

        INSERT INTO public.user_profiles (
            id, school_id, role, full_name_th, full_name_en, phone, status
        ) VALUES (
            NEW.id,
            new_school_id,
            'admin',
            COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name_th'), ''), school_name_th),
            COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name_en'), ''), school_name_en, school_name_th),
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), ''),
            school_status
        );
    ELSIF signup_type = 'student' THEN
        IF requested_school_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.schools
            WHERE id = requested_school_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'A valid active school is required to register';
        END IF;

        INSERT INTO public.user_profiles (
            id, school_id, role, full_name_th, full_name_en, avatar_url, phone, status
        ) VALUES (
            NEW.id,
            requested_school_id,
            'student',
            COALESCE(NEW.raw_user_meta_data ->> 'full_name_th', ''),
            COALESCE(NEW.raw_user_meta_data ->> 'full_name_en', ''),
            COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
            NEW.raw_user_meta_data ->> 'phone',
            'pending'
        );
    ELSE
        RAISE EXCEPTION 'Invalid account registration type';
    END IF;

    RETURN NEW;
END;
$$;

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

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_signup();

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.activate_verified_school_signup();

DROP FUNCTION IF EXISTS public.create_student_profile_for_signup();
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_verified_school_signup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_school_role(TEXT, TEXT[]) TO anon, authenticated;
