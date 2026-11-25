import express, { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';

type EnvReader = (name: string) => string;

function createAuthClient(env: EnvReader, token?: string) {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey =
    env('SUPABASE_ANON_KEY') ||
    env('SUPABASE_PUBLISHABLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY') ||
    env('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

export function createLineMessagingRouter(getEnv: EnvReader) {
  const router = Router();
  router.use(express.json({ limit: '32kb' }));

  router.get('/status', (_req: Request, res: Response) => {
    const token = getEnv('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      configured: Boolean(token),
      oaAddFriendUrl: getEnv('LINE_OA_ADD_FRIEND_URL') || null,
    });
  });

  router.post('/broadcast', async (req: Request, res: Response) => {
    const authHeader = req.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'กรุณาเข้าสู่ระบบก่อนส่งแจ้งเตือน LINE OA',
      });
    }

    const client = createAuthClient(getEnv, match[1]);
    if (!client) {
      return res.status(503).json({
        error: 'SUPABASE_AUTH_NOT_CONFIGURED',
        message: 'ระบบยืนยันตัวตนยังตั้งค่าไม่ครบ',
      });
    }

    try {
      const { data: authData, error: authError } = await client.auth.getUser(match[1]);
      if (authError || !authData.user) {
        return res.status(401).json({ error: 'INVALID_SESSION', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
      }

      const { data: profile, error: profileError } = await client
        .from('user_profiles')
        .select('role, status, school_id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.status !== 'active') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'บัญชีนี้ไม่มีสิทธิ์ส่งประกาศ LINE OA' });
      }
      if (!['super_admin', 'admin', 'teacher'].includes(String(profile.role || ''))) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลหรือครูเท่านั้นที่สามารถส่งแจ้งเตือน LINE OA ได้' });
      }

      const lineAccessToken = getEnv('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN');
      if (!lineAccessToken) {
        return res.status(503).json({
          error: 'LINE_MESSAGING_NOT_CONFIGURED',
          message: 'ยังไม่ได้ตั้งค่า LINE_MESSAGING_CHANNEL_ACCESS_TOKEN บนเซิร์ฟเวอร์ จึงยังไม่สามารถยิงข้อความเข้า LINE OA จริงได้',
        });
      }

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      if (!title && !content) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'กรุณาระบุข้อความที่ต้องการส่ง' });
      }

      const textBody = [title ? `📢 ${title}` : '', content].filter(Boolean).join('\n\n').slice(0, 4500);
      const lineResponse = await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lineAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ type: 'text', text: textBody }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!lineResponse.ok) {
        const errPayload = await lineResponse.json().catch(() => null) as { message?: string } | null;
        return res.status(502).json({
          error: 'LINE_API_ERROR',
          message: errPayload?.message || `LINE Messaging API ตอบกลับสถานะ ${lineResponse.status}`,
        });
      }

      return res.json({ ok: true, message: 'ส่งข้อความผ่าน LINE Messaging API เรียบร้อยแล้ว' });
    } catch (error) {
      return res.status(502).json({
        error: 'LINE_BROADCAST_FAILED',
        message: error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อ LINE Messaging API ได้',
      });
    }
  });

  return router;
}
