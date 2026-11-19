BEGIN;

-- Ensure staff_parent_invitations exists (safe if 20261116 wasn't run yet)
CREATE TABLE IF NOT EXISTS public.staff_parent_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invite_role TEXT NOT NULL CHECK (invite_role IN ('teacher', 'parent')),
    teacher_id TEXT,
    student_id TEXT,
    invited_email TEXT NOT NULL,
    full_name_th TEXT NOT NULL DEFAULT '',
    full_name_en TEXT NOT NULL DEFAULT '',
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.staff_parent_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_parent_invitations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.staff_parent_invitations TO service_role;

-- RPC Fallback: Create a signed Teacher/Parent invitation record without needing an Edge Function
CREATE OR REPLACE FUNCTION public.create_staff_parent_invitation(
    target_school_id TEXT,
    target_invite_role TEXT,
    target_email TEXT,
    target_full_name_th TEXT DEFAULT '',
    target_full_name_en TEXT DEFAULT '',
    target_teacher_id TEXT DEFAULT NULL,
    target_student_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor_id UUID := auth.uid();
    cleaned_email TEXT := LOWER(BTRIM(COALESCE(target_email, '')));
    cleaned_name_th TEXT := BTRIM(COALESCE(target_full_name_th, ''));
    cleaned_name_en TEXT := BTRIM(COALESCE(target_full_name_en, ''));
    new_invitation_id UUID;
BEGIN
    IF actor_id IS NULL OR NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only an active school administrator can send staff or parent invitations' USING ERRCODE = '42501';
    END IF;

    IF target_invite_role NOT IN ('teacher', 'parent') THEN
        RAISE EXCEPTION 'Invalid invitation role';
    END IF;

    IF cleaned_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'A valid email address is required';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.schools
        WHERE id = target_school_id AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Target school is not active';
    END IF;

    IF target_invite_role = 'parent' THEN
        IF target_student_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.students
            WHERE id = target_student_id AND school_id = target_school_id
        ) THEN
            RAISE EXCEPTION 'Linked student record was not found in this school';
        END IF;
    END IF;

    INSERT INTO public.staff_parent_invitations (
        school_id,
        invite_role,
        teacher_id,
        student_id,
        invited_email,
        full_name_th,
        full_name_en,
        created_by
    )
    VALUES (
        target_school_id,
        target_invite_role,
        NULLIF(BTRIM(COALESCE(target_teacher_id, '')), ''),
        NULLIF(BTRIM(COALESCE(target_student_id, '')), ''),
        cleaned_email,
        COALESCE(NULLIF(cleaned_name_th, ''), cleaned_email),
        COALESCE(NULLIF(cleaned_name_en, ''), NULLIF(cleaned_name_th, ''), cleaned_email),
        actor_id
    )
    RETURNING id INTO new_invitation_id;

    RETURN new_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_parent_invitation(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_staff_parent_invitation(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Public invitation lookup by UUID token (used by AuthLayout when teacher/parent opens ?inviteId=...)
CREATE OR REPLACE FUNCTION public.get_staff_parent_invitation_public(target_invitation_id UUID)
RETURNS TABLE (
    invitation_id UUID,
    school_id TEXT,
    school_name_th TEXT,
    school_name_en TEXT,
    school_code TEXT,
    invite_role TEXT,
    invited_email TEXT,
    full_name_th TEXT,
    full_name_en TEXT,
    expires_at TIMESTAMPTZ,
    is_accepted BOOLEAN,
    is_expired BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        inv.id AS invitation_id,
        inv.school_id,
        s.name_th AS school_name_th,
        s.name_en AS school_name_en,
        s.code AS school_code,
        inv.invite_role,
        inv.invited_email,
        inv.full_name_th,
        inv.full_name_en,
        inv.expires_at,
        (inv.accepted_at IS NOT NULL) AS is_accepted,
        (inv.expires_at <= NOW()) AS is_expired
    FROM public.staff_parent_invitations inv
    JOIN public.schools s ON s.id = inv.school_id
    WHERE inv.id = target_invitation_id
      AND s.status = 'active'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_staff_parent_invitation_public(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_parent_invitation_public(UUID) TO anon, authenticated;

-- Allow School Admin / Super Admin to activate a pending teacher/parent account manually
-- (e.g. if SMTP confirmation email was delayed or unavailable)
CREATE OR REPLACE FUNCTION public.approve_staff_parent_account(
    target_school_id TEXT,
    target_user_id UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    target_role TEXT;
    target_confirmed BOOLEAN;
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can activate teacher or parent accounts' USING ERRCODE = '42501';
    END IF;

    SELECT p.role, (u.email_confirmed_at IS NOT NULL)
    INTO target_role, target_confirmed
    FROM public.user_profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = target_user_id
      AND p.school_id = target_school_id
      AND p.role IN ('teacher', 'parent')
    FOR UPDATE OF p, u;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff or parent account not found in this school';
    END IF;

    IF NOT target_confirmed THEN
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
      AND role = target_role;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_staff_parent_account(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_staff_parent_account(TEXT, UUID) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.handle_auth_user_signup()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    signup_type TEXT := NEW.raw_user_meta_data ->> 'signup_type';
    invitation_id UUID;
    student_inv public.student_account_invitations%ROWTYPE;
    staff_inv public.staff_parent_invitations%ROWTYPE;
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
        INTO student_inv
        FROM public.student_account_invitations
        WHERE id = invitation_id
        FOR UPDATE;

        IF NOT FOUND
           OR student_inv.accepted_at IS NOT NULL
           OR student_inv.expires_at <= NOW()
           OR LOWER(student_inv.invited_email) <> LOWER(COALESCE(NEW.email, '')) THEN
            RAISE EXCEPTION 'Student invitation is invalid or expired';
        END IF;

        SELECT *
        INTO student_record
        FROM public.students
        WHERE id = student_inv.student_id
          AND school_id = student_inv.school_id;

        IF NOT FOUND OR NOT EXISTS (
            SELECT 1 FROM public.schools
            WHERE id = student_inv.school_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Student or school is no longer active';
        END IF;

        INSERT INTO public.user_profiles (
            id, school_id, role, student_id, full_name_th, full_name_en, avatar_url, status
        ) VALUES (
            NEW.id,
            student_inv.school_id,
            'student',
            student_inv.student_id,
            CONCAT_WS(' ', student_record.first_name_th, student_record.last_name_th),
            CONCAT_WS(' ', student_record.first_name_en, student_record.last_name_en),
            COALESCE(student_record.avatar_url, ''),
            CASE WHEN NEW.email_confirmed_at IS NULL THEN 'pending' ELSE 'active' END
        );

        UPDATE public.student_account_invitations
        SET accepted_at = NOW(), accepted_by = NEW.id
        WHERE id = student_inv.id;
    ELSIF signup_type IN ('teacher_invite', 'parent_invite') THEN
        BEGIN
            invitation_id := (NEW.raw_user_meta_data ->> 'invitation_id')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid staff/parent invitation';
        END;

        SELECT *
        INTO staff_inv
        FROM public.staff_parent_invitations
        WHERE id = invitation_id
        FOR UPDATE;

        IF NOT FOUND
           OR staff_inv.accepted_at IS NOT NULL
           OR staff_inv.expires_at <= NOW()
           OR LOWER(staff_inv.invited_email) <> LOWER(COALESCE(NEW.email, '')) THEN
            RAISE EXCEPTION 'Staff/Parent invitation is invalid or expired';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.schools
            WHERE id = staff_inv.school_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'School is no longer active';
        END IF;

        INSERT INTO public.user_profiles (
            id, school_id, role, full_name_th, full_name_en, status
        ) VALUES (
            NEW.id,
            staff_inv.school_id,
            staff_inv.invite_role,
            COALESCE(NULLIF(BTRIM(staff_inv.full_name_th), ''), NEW.email),
            COALESCE(NULLIF(BTRIM(staff_inv.full_name_en), ''), NULLIF(BTRIM(staff_inv.full_name_th), ''), NEW.email),
            CASE WHEN NEW.email_confirmed_at IS NULL THEN 'pending' ELSE 'active' END
        );

        IF staff_inv.invite_role = 'parent' AND staff_inv.student_id IS NOT NULL THEN
            INSERT INTO public.parent_student_links (profile_id, school_id, student_id)
            VALUES (NEW.id, staff_inv.school_id, staff_inv.student_id)
            ON CONFLICT DO NOTHING;
        END IF;

        UPDATE public.staff_parent_invitations
        SET accepted_at = NOW(), accepted_by = NEW.id
        WHERE id = staff_inv.id;
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
          AND role IN ('admin', 'student', 'teacher', 'parent')
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

NOTIFY pgrst, 'reload schema';

COMMIT;
