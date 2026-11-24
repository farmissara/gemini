-- Unified Avatar Sync: keep user_profiles.avatar_url and linked students / teachers avatar_url synchronized
CREATE OR REPLACE FUNCTION public.update_own_avatar(target_avatar_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_profile RECORD;
  caller_email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_avatar_url IS NULL OR length(trim(target_avatar_url)) = 0 OR length(target_avatar_url) > 450000 THEN
    RAISE EXCEPTION 'Invalid avatar URL payload';
  END IF;

  SELECT id, school_id, role, status, student_id, full_name_th
  INTO caller_profile
  FROM public.user_profiles
  WHERE id = caller_id;

  IF NOT FOUND OR caller_profile.status <> 'active' THEN
    RAISE EXCEPTION 'Active user profile not found';
  END IF;

  UPDATE public.user_profiles
  SET avatar_url = target_avatar_url
  WHERE id = caller_id;

  IF caller_profile.role = 'student' AND caller_profile.student_id IS NOT NULL AND caller_profile.school_id IS NOT NULL THEN
    UPDATE public.students
    SET avatar_url = target_avatar_url
    WHERE school_id = caller_profile.school_id
      AND id = caller_profile.student_id;
  END IF;

  IF caller_profile.role IN ('teacher', 'admin', 'super_admin') AND caller_profile.school_id IS NOT NULL THEN
    UPDATE public.teachers
    SET avatar_url = target_avatar_url
    WHERE school_id = caller_profile.school_id
      AND (
        id = caller_id::text
        OR (caller_email <> '' AND lower(trim(coalesce(email, ''))) = caller_email)
        OR (coalesce(trim(caller_profile.full_name_th), '') <> '' AND trim(full_name_th) = trim(caller_profile.full_name_th))
      );
  END IF;

  RETURN target_avatar_url;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_avatar(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_avatar(TEXT) TO authenticated;
