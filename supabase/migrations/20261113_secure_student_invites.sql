BEGIN;

CREATE TABLE IF NOT EXISTS public.student_account_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    invited_email TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

ALTER TABLE public.student_account_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_account_invitations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.student_account_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.handle_auth_user_signup()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    signup_type TEXT := NEW.raw_user_meta_data ->> 'signup_type';
    requested_school_id TEXT := NEW.raw_user_meta_data ->> 'school_id';
    invitation_id UUID;
    invitation public.student_account_invitations%ROWTYPE;
    student_record public.students%ROWTYPE;
    new_school_id TEXT;
    school_name_th TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_th'), '');
    school_name_en TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_name_en'), '');
    school_type TEXT := COALESCE(NEW.raw_user_meta_data ->> 'school_type', 'public');
    school_province TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'school_province'), '');
    school_slug TEXT;
    school_status TEXT;
BEGIN
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
    ELSIF signup_type = 'student_invite' THEN
        BEGIN
            invitation_id := (NEW.raw_user_meta_data ->> 'invitation_id')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid student invitation';
        END;

        SELECT *
        INTO invitation
        FROM public.student_account_invitations
        WHERE id = invitation_id
        FOR UPDATE;

        IF NOT FOUND
           OR invitation.accepted_at IS NOT NULL
           OR invitation.expires_at <= NOW()
           OR LOWER(invitation.invited_email) <> LOWER(COALESCE(NEW.email, '')) THEN
            RAISE EXCEPTION 'Student invitation is invalid or expired';
        END IF;

        SELECT *
        INTO student_record
        FROM public.students
        WHERE id = invitation.student_id
          AND school_id = invitation.school_id;

        IF NOT FOUND OR NOT EXISTS (
            SELECT 1
            FROM public.schools
            WHERE id = invitation.school_id
              AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Student or school is no longer active';
        END IF;

        INSERT INTO public.user_profiles (
            id, school_id, role, student_id, full_name_th, full_name_en, avatar_url, status
        ) VALUES (
            NEW.id,
            invitation.school_id,
            'student',
            invitation.student_id,
            CONCAT_WS(' ', student_record.first_name_th, student_record.last_name_th),
            CONCAT_WS(' ', student_record.first_name_en, student_record.last_name_en),
            COALESCE(student_record.avatar_url, ''),
            CASE WHEN NEW.email_confirmed_at IS NULL THEN 'pending' ELSE 'active' END
        );

        UPDATE public.student_account_invitations
        SET accepted_at = NOW(), accepted_by = NEW.id
        WHERE id = invitation.id;
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
        WHERE id = NEW.id
          AND role IN ('admin', 'student')
          AND status = 'pending';

        UPDATE public.schools school
        SET status = 'active'
        FROM public.user_profiles profile
        WHERE profile.id = NEW.id
          AND profile.role = 'admin'
          AND profile.school_id = school.id
          AND school.status = 'pending';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_verified_school_signup() FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
