import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type EnvReader = (name: string) => string;

function clientsForRequest(env: EnvReader, token: string) {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY') || env('VITE_SUPABASE_PUBLISHABLE_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return null;
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { url, userClient, serviceClient };
}

export function createStaffInviteEmailRouter(getEnv: EnvReader) {
  const router = Router();
  router.post('/send', async (req: Request, res: Response) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบใหม่' });
    const clients = clientsForRequest(getEnv, token);
    if (!clients) return res.status(503).json({ error: 'INVITE_EMAIL_NOT_CONFIGURED', message: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า service role key สำหรับส่งอีเมลคำเชิญ' });

    const { data: authData, error: authError } = await clients.userClient.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: 'INVALID_SESSION', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    const { data: actor, error: actorError } = await clients.userClient.from('user_profiles')
      .select('role, school_id, status').eq('id', authData.user.id).maybeSingle();
    if (actorError || !actor || actor.status !== 'active' || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ error: 'INVITE_FORBIDDEN', message: 'ต้องใช้บัญชีผู้ดูแลโรงเรียนที่เปิดใช้งานเพื่อส่งคำเชิญ' });
    }

    const invitationId = typeof req.body?.invitationId === 'string' ? req.body.invitationId.trim() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(invitationId)) {
      return res.status(400).json({ error: 'INVALID_INVITATION', message: 'รหัสคำเชิญไม่ถูกต้อง' });
    }
    const { data: invitation, error: invitationError } = await clients.serviceClient.from('staff_parent_invitations')
      .select('id, school_id, invite_role, invited_email, full_name_th, full_name_en, expires_at, accepted_at')
      .eq('id', invitationId).maybeSingle();
    if (invitationError || !invitation) return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'ไม่พบคำเชิญนี้ กรุณาสร้างคำเชิญใหม่' });
    if (actor.role === 'admin' && actor.school_id !== invitation.school_id) {
      return res.status(403).json({ error: 'SCHOOL_SCOPE_FORBIDDEN', message: 'ส่งคำเชิญได้เฉพาะโรงเรียนของตนเอง' });
    }
    if (invitation.accepted_at || new Date(invitation.expires_at).getTime() <= Date.now()) {
      return res.status(409).json({ error: 'INVITATION_INACTIVE', message: 'คำเชิญนี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาสร้างคำเชิญใหม่' });
    }

    const configuredOrigin = getEnv('APP_SITE_URL');
    const requestedOrigin = typeof req.body?.redirectTo === 'string' && /^https?:\/\//i.test(req.body.redirectTo)
      ? new URL(req.body.redirectTo).origin
      : '';
    const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestedOrigin);
    const siteOrigin = configuredOrigin
      ? new URL(configuredOrigin).origin
      : (!/production/i.test(getEnv('NODE_ENV')) && isLocalOrigin ? requestedOrigin : '');
    const redirectTo = siteOrigin ? `${siteOrigin}/?inviteId=${encodeURIComponent(invitation.id)}` : undefined;
    const { error: sendError } = await clients.serviceClient.auth.admin.inviteUserByEmail(invitation.invited_email, {
      ...(redirectTo ? { redirectTo } : {}),
      data: {
        signup_type: invitation.invite_role === 'teacher' ? 'teacher_invite' : 'parent_invite',
        invitation_id: invitation.id,
        full_name_th: invitation.full_name_th,
        full_name_en: invitation.full_name_en,
      },
    });
    if (sendError) {
      console.error('[Staff invite email] Supabase Auth invite failed:', sendError.message);
      return res.status(502).json({ error: 'INVITE_EMAIL_FAILED', message: 'ส่งอีเมลไม่สำเร็จ ตรวจสอบ SMTP/เทมเพลตอีเมลใน Supabase Auth หรือสร้างคำเชิญใหม่หากอีเมลนี้มีบัญชีอยู่แล้ว' });
    }
    return res.json({ sent: true, email: invitation.invited_email, invitationId: invitation.id });
  });
  return router;
}
