-- Fix student self-attendance RLS policies that mistakenly required the staff
-- 'recordAttendance' permission (which defaults to false for the student role).
-- Students must still be active, linked to their student record, belong to the
-- target school, and have completed any required password change.

BEGIN;

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
        AND (storage.foldername(name))[1] = public.current_user_school_id()
        AND (storage.foldername(name))[2] = auth.uid()::TEXT
        AND public.current_user_role() = 'student'
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
              AND profile.status = 'active'
              AND profile.role = 'student'
              AND profile.school_id = (storage.foldername(name))[1]
              AND profile.student_id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Students can remove unattached attendance selfies" ON storage.objects;
CREATE POLICY "Students can remove unattached attendance selfies" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[1] = public.current_user_school_id()
        AND (storage.foldername(name))[2] = auth.uid()::TEXT
        AND public.current_user_role() = 'student'
        AND NOT EXISTS (
            SELECT 1
            FROM public.attendance record
            WHERE record.photo_url = name
        )
    );

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

DO $$
BEGIN
    IF to_regclass('public.period_attendance') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Students insert own QR period attendance" ON public.period_attendance';
        EXECUTE 'CREATE POLICY "Students insert own QR period attendance" ON public.period_attendance
            FOR INSERT WITH CHECK (
                public.current_user_role() = ''student''
                AND public.has_school_role(school_id, ARRAY[''student''])
                AND public.can_access_student(student_id)
            )';
        EXECUTE 'DROP POLICY IF EXISTS "Students update own QR period attendance" ON public.period_attendance';
        EXECUTE 'CREATE POLICY "Students update own QR period attendance" ON public.period_attendance
            FOR UPDATE USING (
                public.current_user_role() = ''student''
                AND public.has_school_role(school_id, ARRAY[''student''])
                AND public.can_access_student(student_id)
            )
            WITH CHECK (
                public.current_user_role() = ''student''
                AND public.has_school_role(school_id, ARRAY[''student''])
                AND public.can_access_student(student_id)
            )';
    END IF;
END;
$$;

COMMIT;
