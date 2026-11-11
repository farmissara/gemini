BEGIN;

ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'check_in',
    ADD COLUMN IF NOT EXISTS user_name TEXT,
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_unique_student_link
    ON public.user_profiles(student_id)
    WHERE role = 'student' AND student_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.link_student_account(
    target_school_id TEXT,
    target_user_id UUID,
    target_student_id TEXT
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only school administrators can link student accounts';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = target_user_id
          AND profile.school_id = target_school_id
          AND profile.role = 'student'
    ) THEN
        RAISE EXCEPTION 'Student account does not belong to this school';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.students student
        WHERE student.id = target_student_id
          AND student.school_id = target_school_id
    ) THEN
        RAISE EXCEPTION 'Student record does not belong to this school';
    END IF;

    UPDATE public.user_profiles
    SET student_id = target_student_id
    WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_student_account(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_student_account(TEXT, UUID, TEXT) TO authenticated;

GRANT INSERT ON public.attendance TO authenticated;

DROP POLICY IF EXISTS "Students can record their own selfie attendance" ON public.attendance;
CREATE POLICY "Students can record their own selfie attendance" ON public.attendance
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'student'
        AND school_id = public.current_user_school_id()
        AND public.can_access_student(student_id)
        AND record_type IN ('check_in', 'check_out')
        AND checkin_method = 'selfie_geofence'
        AND status IN ('present', 'late')
        AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date::text
        AND user_name = (
            SELECT profile.full_name_th
            FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
        )
        AND split_part(photo_url, '/', 1) = public.current_user_school_id()
        AND split_part(photo_url, '/', 2) = auth.uid()::text
        AND split_part(photo_url, '/', 3) = id || '.jpg'
    );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attendance-selfies', 'attendance-selfies', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg'];

DROP POLICY IF EXISTS "Students can upload own attendance selfies" ON storage.objects;
CREATE POLICY "Students can upload own attendance selfies" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND storage.foldername(name)[1] = public.current_user_school_id()
        AND storage.foldername(name)[2] = auth.uid()::text
        AND public.current_user_role() = 'student'
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
              AND profile.status = 'active'
              AND profile.role = 'student'
              AND profile.school_id = storage.foldername(name)[1]
              AND profile.student_id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Students can remove unattached attendance selfies" ON storage.objects;
CREATE POLICY "Students can remove unattached attendance selfies" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'attendance-selfies'
        AND storage.foldername(name)[2] = auth.uid()::text
        AND NOT EXISTS (
            SELECT 1
            FROM public.attendance record
            WHERE record.photo_url = name
        )
    );

DROP POLICY IF EXISTS "Users can read permitted attendance selfies" ON storage.objects;
CREATE POLICY "Users can read permitted attendance selfies" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'attendance-selfies'
        AND (
            storage.foldername(name)[2] = auth.uid()::text
            OR public.has_school_role(
                storage.foldername(name)[1],
                ARRAY['super_admin', 'admin', 'teacher']
            )
            OR EXISTS (
                SELECT 1
                FROM public.attendance record
                WHERE record.photo_url = name
                  AND public.can_access_student(record.student_id)
            )
        )
    );

COMMIT;
