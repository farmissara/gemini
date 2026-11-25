BEGIN;

ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS student_id_min_length INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN IF NOT EXISTS student_id_max_length INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS student_id_digits_only BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS student_id_example TEXT,
    ADD COLUMN IF NOT EXISTS student_short_id_password_prefix TEXT;

DROP FUNCTION IF EXISTS public.get_school_login_portal_info(TEXT, TEXT, TEXT);

CREATE FUNCTION public.get_school_login_portal_info(
    lookup_school_id TEXT DEFAULT NULL,
    lookup_school_code TEXT DEFAULT NULL,
    lookup_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    code TEXT,
    name_th TEXT,
    name_en TEXT,
    slug TEXT,
    logo_url TEXT,
    primary_color TEXT,
    student_login_identifier_type TEXT,
    custom_login_slug TEXT,
    student_default_password_type TEXT,
    student_default_password_note TEXT,
    student_id_min_length INTEGER,
    student_id_max_length INTEGER,
    student_id_digits_only BOOLEAN,
    student_id_example TEXT,
    student_short_id_password_prefix TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        s.id::TEXT,
        s.code,
        s.name_th,
        s.name_en,
        s.slug,
        s.logo_url,
        s.primary_color,
        COALESCE(s.student_login_identifier_type, 'both'),
        s.custom_login_slug,
        COALESCE(s.student_default_password_type, 'student_id'),
        s.student_default_password_note,
        COALESCE(s.student_id_min_length, 4),
        COALESCE(s.student_id_max_length, 12),
        COALESCE(s.student_id_digits_only, FALSE),
        NULLIF(BTRIM(s.student_id_example), ''),
        NULLIF(BTRIM(s.student_short_id_password_prefix), '')
    FROM public.schools s
    WHERE s.status = 'active'
      AND (
          (lookup_school_id IS NOT NULL AND s.id::TEXT = lookup_school_id)
          OR (lookup_school_code IS NOT NULL AND LOWER(s.code) = LOWER(lookup_school_code))
          OR (lookup_slug IS NOT NULL AND (
              LOWER(COALESCE(s.custom_login_slug, '')) = LOWER(lookup_slug)
              OR LOWER(s.slug) = LOWER(lookup_slug)
          ))
      )
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_school_login_portal_info(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_login_portal_info(TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
