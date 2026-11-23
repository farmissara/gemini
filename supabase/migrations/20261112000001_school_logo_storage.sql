BEGIN;

ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('school-logos', 'school-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "Users can read school logos" ON storage.objects;
CREATE POLICY "Users can read school logos"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'school-logos');

DROP POLICY IF EXISTS "School admins upload school logos" ON storage.objects;
CREATE POLICY "School admins upload school logos"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    );

DROP POLICY IF EXISTS "School admins update school logos" ON storage.objects;
CREATE POLICY "School admins update school logos"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    )
    WITH CHECK (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    );

DROP POLICY IF EXISTS "School admins delete school logos" ON storage.objects;
CREATE POLICY "School admins delete school logos"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'school-logos'
        AND public.has_school_role((storage.foldername(name))[1], ARRAY['admin', 'super_admin'])
    );

COMMIT;

NOTIFY pgrst, 'reload schema';
