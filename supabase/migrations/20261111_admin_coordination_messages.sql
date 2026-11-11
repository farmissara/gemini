-- Urgent coordination chat and official mail between School Admins and Super Admin

CREATE TABLE IF NOT EXISTS public.admin_coordination_messages (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'super_admin')),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    channel_type TEXT NOT NULL DEFAULT 'chat' CHECK (channel_type IN ('chat', 'letter')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal')),
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    read_by_admin BOOLEAN NOT NULL DEFAULT false,
    read_by_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_coord_school_created
    ON public.admin_coordination_messages(school_id, created_at DESC);

ALTER TABLE public.admin_coordination_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and super admins can read coordination messages" ON public.admin_coordination_messages;
CREATE POLICY "Admins and super admins can read coordination messages"
    ON public.admin_coordination_messages
    FOR SELECT USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "Admins and super admins can insert coordination messages" ON public.admin_coordination_messages;
CREATE POLICY "Admins and super admins can insert coordination messages"
    ON public.admin_coordination_messages
    FOR INSERT WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

DROP POLICY IF EXISTS "Admins and super admins can update coordination messages" ON public.admin_coordination_messages;
CREATE POLICY "Admins and super admins can update coordination messages"
    ON public.admin_coordination_messages
    FOR UPDATE USING (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    )
    WITH CHECK (
        public.has_school_role(school_id, ARRAY['super_admin', 'admin'])
    );

GRANT SELECT, INSERT, UPDATE ON public.admin_coordination_messages TO authenticated;
