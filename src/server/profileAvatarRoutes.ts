import express, { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type EnvReader = (name: string) => string;

const MAX_AVATAR_URL_LENGTH = 450_000;

function isValidAvatarUrl(value: string): boolean {
  if (!value || value.length > MAX_AVATAR_URL_LENGTH) return false;
  if (/^https?:\/\/\S+$/i.test(value)) return true;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) return true;
  return false;
}

function getSupabaseServerClients(env: EnvReader, token: string): {
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
} | null {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey =
    env('SUPABASE_ANON_KEY') ||
    env('SUPABASE_PUBLISHABLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY') ||
    env('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    serviceKey;
  if (!url || !anonKey || !serviceKey) return null;

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { userClient, serviceClient };
}

export function createProfileAvatarRouter(getEnv: EnvReader) {
  const router = Router();
  router.use(express.json({ limit: '512kb' }));

  router.post('/', async (req: Request, res: Response) => {
    const authHeader = req.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนบันทึกรูปภาพ' });
    }

    const clients = getSupabaseServerClients(getEnv, match[1]);
    if (!clients) {
      return res.status(503).json({ error: 'SERVICE_ROLE_UNAVAILABLE', message: 'Server Supabase service role is not configured.' });
    }

    const { userClient, serviceClient } = clients;
    try {
      const { data: authData, error: authError } = await userClient.auth.getUser(match[1]);
      if (authError || !authData.user) {
        return res.status(401).json({ error: 'INVALID_SESSION', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
      }

      const { data: profile, error: profileError } = await serviceClient
        .from('user_profiles')
        .select('id, school_id, role, status, student_id, full_name_th')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.status !== 'active') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'บัญชีนี้ไม่มีสิทธิ์ใช้งาน' });
      }

      const body = (req.body || {}) as {
        targetType?: 'self' | 'student' | 'teacher';
        schoolId?: string;
        targetId?: string;
        avatarUrl?: string;
      };

      const targetType = body.targetType === 'student' || body.targetType === 'teacher' ? body.targetType : 'self';
      const requestedSchoolId = typeof body.schoolId === 'string' ? body.schoolId.trim() : '';
      const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
      const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';

      if (!isValidAvatarUrl(avatarUrl)) {
        return res.status(400).json({ error: 'INVALID_AVATAR_URL', message: 'รูปแบบรูปภาพไม่ถูกต้องหรือมีขนาดใหญ่เกินกำหนด' });
      }

      const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
      const schoolId = profile.role === 'super_admin' && requestedSchoolId
        ? requestedSchoolId
        : String(profile.school_id || requestedSchoolId || '');

      if (!schoolId) {
        return res.status(400).json({ error: 'SCHOOL_REQUIRED', message: 'ไม่พบรหัสโรงเรียน' });
      }
      if (requestedSchoolId && profile.role !== 'super_admin' && requestedSchoolId !== String(profile.school_id || '')) {
        return res.status(403).json({ error: 'CROSS_SCHOOL_FORBIDDEN', message: 'ไม่สามารถแก้ไขข้อมูลต่างโรงเรียนได้' });
      }

      // Check whether caller is updating their own linked record
      const isSelfStudent =
        targetType === 'student' &&
        profile.role === 'student' &&
        Boolean(targetId) &&
        (targetId === String(profile.student_id || '') || targetId === profile.id);

      let isSelfTeacher = false;
      if (targetType === 'teacher' && (profile.role === 'teacher' || isAdmin) && targetId) {
        const { data: teacherRow } = await serviceClient
          .from('teachers')
          .select('id, email, full_name_th')
          .eq('school_id', schoolId)
          .eq('id', targetId)
          .maybeSingle();
        if (teacherRow) {
          const userEmail = (authData.user.email || '').trim().toLowerCase();
          const tEmail = (teacherRow.email || '').trim().toLowerCase();
          isSelfTeacher =
            teacherRow.id === profile.id ||
            (Boolean(userEmail) && userEmail === tEmail) ||
            (Boolean(profile.full_name_th) && profile.full_name_th.trim() === (teacherRow.full_name_th || '').trim());
        } else if (targetId === profile.id) {
          isSelfTeacher = true;
        }
      }

      if (targetType === 'self' || isSelfStudent || isSelfTeacher) {
        // 1. Update caller's user_profiles.avatar_url
        const { error: upErr } = await serviceClient
          .from('user_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', profile.id);
        if (upErr) throw new Error(upErr.message);

        // 2. Sync linked student row if applicable
        const studentRowId = isSelfStudent ? targetId : String(profile.student_id || '');
        if (studentRowId && profile.role === 'student') {
          await serviceClient
            .from('students')
            .update({ avatar_url: avatarUrl })
            .eq('school_id', schoolId)
            .eq('id', studentRowId);
        }

        // 3. Sync linked teacher row if applicable
        if (profile.role === 'teacher' || isAdmin) {
          if (isSelfTeacher && targetId && targetId !== profile.id) {
            await serviceClient
              .from('teachers')
              .update({ avatar_url: avatarUrl })
              .eq('school_id', schoolId)
              .eq('id', targetId);
          } else {
            const userEmail = (authData.user.email || '').trim().toLowerCase();
            if (userEmail) {
              await serviceClient
                .from('teachers')
                .update({ avatar_url: avatarUrl })
                .eq('school_id', schoolId)
                .ilike('email', userEmail);
            }
          }
        }

        return res.json({ ok: true, avatarUrl, scope: 'self' });
      }

      // Admin updating another student or teacher in the same school
      if (!isAdmin) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'ไม่มีสิทธิ์แก้ไขรูปภาพของผู้อื่น' });
      }
      if (!targetId) {
        return res.status(400).json({ error: 'TARGET_REQUIRED', message: 'กรุณาระบุรหัสรายการที่ต้องการอัปเดต' });
      }

      if (targetType === 'student') {
        const { error: stuErr } = await serviceClient
          .from('students')
          .update({ avatar_url: avatarUrl })
          .eq('school_id', schoolId)
          .eq('id', targetId);
        if (stuErr) throw new Error(stuErr.message);

        await serviceClient
          .from('user_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('school_id', schoolId)
          .eq('student_id', targetId);

        return res.json({ ok: true, avatarUrl, scope: 'student' });
      }

      if (targetType === 'teacher') {
        const { data: teacherRow } = await serviceClient
          .from('teachers')
          .select('id, email')
          .eq('school_id', schoolId)
          .eq('id', targetId)
          .maybeSingle();

        const { error: tchErr } = await serviceClient
          .from('teachers')
          .update({ avatar_url: avatarUrl })
          .eq('school_id', schoolId)
          .eq('id', targetId);
        if (tchErr) throw new Error(tchErr.message);

        if (teacherRow?.email) {
          const { data: authUsersData } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const matchedAuthUser = authUsersData?.users?.find(
            (u) => (u.email || '').trim().toLowerCase() === teacherRow.email.trim().toLowerCase()
          );
          if (matchedAuthUser) {
            await serviceClient
              .from('user_profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', matchedAuthUser.id)
              .eq('school_id', schoolId);
          }
        }

        return res.json({ ok: true, avatarUrl, scope: 'teacher' });
      }

      return res.status(400).json({ error: 'INVALID_TARGET', message: 'Invalid targetType.' });
    } catch (error) {
      return res.status(500).json({
        error: 'AVATAR_SAVE_FAILED',
        message: error instanceof Error ? error.message : 'ไม่สามารถบันทึกรูปภาพได้',
      });
    }
  });

  return router;
}
