DROP POLICY IF EXISTS "School members can read timetable slots" ON public.timetable_slots;
CREATE POLICY "School members can read timetable slots" ON public.timetable_slots
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'student', 'parent'])
        OR (
            public.has_school_role(school_id, ARRAY['teacher'])
            AND (
                public.is_current_teacher_for_timetable(school_id, teacher_name)
                OR (
                    course_id IS NOT NULL
                    AND public.can_manage_lms_course(school_id, course_id)
                )
                OR upper(coalesce(course_code, '')) LIKE '%SCOUT%'
                OR upper(coalesce(course_code, '')) LIKE '%LADYSCOUT%'
                OR lower(coalesce(course_title_th, '')) LIKE '%ลูกเสือ%'
                OR lower(coalesce(course_title_th, '')) LIKE '%เนตรนารี%'
                OR lower(coalesce(course_title_th, '')) LIKE '%บำเพ็ญประโยชน์%'
                OR lower(coalesce(course_title_en, '')) LIKE '%scout%'
                OR lower(coalesce(teacher_name, '')) LIKE '%ครูทุกคน%'
                OR lower(coalesce(teacher_name, '')) LIKE '%อาจารย์ทุกคน%'
                OR lower(coalesce(teacher_name, '')) LIKE '%ทุกครู%'
            )
        )
    );
