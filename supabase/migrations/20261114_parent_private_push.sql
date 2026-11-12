BEGIN;

CREATE TABLE IF NOT EXISTS public.parent_notification_preferences (
    profile_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    attendance_enabled BOOLEAN NOT NULL DEFAULT true,
    homework_enabled BOOLEAN NOT NULL DEFAULT true,
    announcement_enabled BOOLEAN NOT NULL DEFAULT true,
    billing_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_push_subscriptions_profile
    ON public.parent_push_subscriptions(profile_id);

CREATE TABLE IF NOT EXISTS public.parent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    event_key TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('attendance', 'homework', 'announcement', 'billing')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT parent_notification_student_school_fk
        FOREIGN KEY (student_id, school_id)
        REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    CONSTRAINT parent_notification_recipient_event_unique
        UNIQUE (recipient_profile_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_parent_notifications_recipient_created
    ON public.parent_notifications(recipient_profile_id, created_at DESC);

ALTER TABLE public.parent_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents manage their notification preferences"
    ON public.parent_notification_preferences;
CREATE POLICY "Parents manage their notification preferences"
    ON public.parent_notification_preferences
    FOR ALL
    USING (
        profile_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
              AND profile.role = 'parent'
              AND profile.status = 'active'
        )
    )
    WITH CHECK (
        profile_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
              AND profile.role = 'parent'
              AND profile.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Parents read their linked child notifications"
    ON public.parent_notifications;
CREATE POLICY "Parents read their linked child notifications"
    ON public.parent_notifications
    FOR SELECT
    USING (
        recipient_profile_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles profile
            JOIN public.parent_student_links link
              ON link.profile_id = profile.id
             AND link.school_id = parent_notifications.school_id
             AND link.student_id = parent_notifications.student_id
            WHERE profile.id = auth.uid()
              AND profile.role = 'parent'
              AND profile.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Parents update their linked child notification read state"
    ON public.parent_notifications;
CREATE POLICY "Parents update their linked child notification read state"
    ON public.parent_notifications
    FOR UPDATE
    USING (
        recipient_profile_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles profile
            JOIN public.parent_student_links link
              ON link.profile_id = profile.id
             AND link.school_id = parent_notifications.school_id
             AND link.student_id = parent_notifications.student_id
            WHERE profile.id = auth.uid()
              AND profile.role = 'parent'
              AND profile.status = 'active'
        )
    )
    WITH CHECK (
        recipient_profile_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles profile
            JOIN public.parent_student_links link
              ON link.profile_id = profile.id
             AND link.school_id = parent_notifications.school_id
             AND link.student_id = parent_notifications.student_id
            WHERE profile.id = auth.uid()
              AND profile.role = 'parent'
              AND profile.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Parents delete their linked child notifications"
    ON public.parent_notifications;
CREATE POLICY "Parents delete their linked child notifications"
    ON public.parent_notifications
    FOR DELETE
    USING (
        recipient_profile_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles profile
            JOIN public.parent_student_links link
              ON link.profile_id = profile.id
             AND link.school_id = parent_notifications.school_id
             AND link.student_id = parent_notifications.student_id
            WHERE profile.id = auth.uid()
              AND profile.role = 'parent'
              AND profile.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Parents read their push subscriptions"
    ON public.parent_push_subscriptions;
CREATE POLICY "Parents read their push subscriptions"
    ON public.parent_push_subscriptions
    FOR SELECT
    USING (
        profile_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles profile
            WHERE profile.id = auth.uid()
              AND profile.role = 'parent'
              AND profile.status = 'active'
        )
    );

REVOKE ALL ON public.parent_notification_preferences,
    public.parent_push_subscriptions, public.parent_notifications
    FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
    ON public.parent_notification_preferences TO authenticated;
GRANT SELECT, DELETE ON public.parent_notifications TO authenticated;
GRANT UPDATE (read_at) ON public.parent_notifications TO authenticated;
GRANT SELECT ON public.parent_push_subscriptions TO authenticated;
GRANT ALL ON public.parent_notification_preferences,
    public.parent_push_subscriptions, public.parent_notifications TO service_role;

COMMIT;
