BEGIN;

ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS custom_login_slug TEXT,
    ADD COLUMN IF NOT EXISTS student_login_identifier_type TEXT NOT NULL DEFAULT 'both',
    ADD COLUMN IF NOT EXISTS student_default_password_type TEXT NOT NULL DEFAULT 'birthdate',
    ADD COLUMN IF NOT EXISTS student_default_password_note TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.schools
        WHERE NULLIF(BTRIM(custom_login_slug), '') IS NOT NULL
        GROUP BY LOWER(BTRIM(custom_login_slug))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate school login shortcodes exist. Resolve them before applying this migration.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_school_login_portal_info(
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
    student_default_password_note TEXT
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
        COALESCE(s.student_default_password_type, 'birthdate'),
        s.student_default_password_note
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

CREATE UNIQUE INDEX IF NOT EXISTS schools_custom_login_slug_unique_lower_idx
    ON public.schools (LOWER(BTRIM(custom_login_slug)))
    WHERE NULLIF(BTRIM(custom_login_slug), '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_school_login_shortcode_available(
    target_school_id TEXT,
    candidate_shortcode TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['admin', 'super_admin']) THEN
        RAISE EXCEPTION 'Active school administrator access is required.';
    END IF;

    IF candidate_shortcode IS NULL
       OR candidate_shortcode !~ '^[a-zA-Z0-9_-]{2,16}$' THEN
        RAISE EXCEPTION 'School short code must contain 2-16 letters, numbers, hyphens, or underscores.';
    END IF;

    RETURN NOT EXISTS (
        SELECT 1
        FROM public.schools school
        WHERE (
            LOWER(BTRIM(COALESCE(school.custom_login_slug, ''))) = LOWER(BTRIM(candidate_shortcode))
            OR LOWER(BTRIM(COALESCE(school.slug, ''))) = LOWER(BTRIM(candidate_shortcode))
        )
          AND school.id::TEXT <> target_school_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_school_login_shortcode_available(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_school_login_shortcode_available(TEXT, TEXT) TO authenticated;

COMMIT;
