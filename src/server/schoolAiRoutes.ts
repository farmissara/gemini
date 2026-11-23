import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

type EnvReader = (name: string) => string;
export type SchoolAiSecret = {
  school_id: string;
  key_ciphertext: string | null;
  key_iv: string | null;
  key_auth_tag: string | null;
  key_last4: string | null;
  enabled: boolean;
  monthly_request_limit: number;
};
type AiContext = { schoolId: string; userId: string; requestId?: string; client: GoogleGenAI };

const attachedContext = new WeakMap<Request, AiContext>();

function clients(env: EnvReader, token?: string) {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY') || env('VITE_SUPABASE_PUBLISHABLE_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return null;
  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { auth, admin };
}

function encryptionKey(env: EnvReader): Buffer {
  const value = env('SCHOOL_AI_ENCRYPTION_KEY');
  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  const decoded = Buffer.from(value, 'base64');
  if (decoded.byteLength !== 32) throw new Error('SCHOOL_AI_ENCRYPTION_KEY must be 32 random bytes encoded as 64 hex characters or base64.');
  return decoded;
}

function isEncryptionReady(env: EnvReader) {
  try {
    encryptionKey(env);
    return true;
  } catch {
    return false;
  }
}

export function decryptSchoolApiKey(env: EnvReader, secret: SchoolAiSecret): string {
  if (!secret.key_ciphertext || !secret.key_iv || !secret.key_auth_tag) throw new Error('SCHOOL_AI_KEY_NOT_CONFIGURED');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(env), Buffer.from(secret.key_iv, 'base64'));
  decipher.setAAD(Buffer.from(secret.school_id, 'utf8'));
  decipher.setAuthTag(Buffer.from(secret.key_auth_tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.key_ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptSchoolApiKey(env: EnvReader, schoolId: string, apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(env), iv);
  cipher.setAAD(Buffer.from(schoolId, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return {
    key_ciphertext: ciphertext.toString('base64'),
    key_iv: iv.toString('base64'),
    key_auth_tag: cipher.getAuthTag().toString('base64'),
    key_last4: apiKey.slice(-4),
  };
}

async function getServiceClients(env: EnvReader) {
  const bundle = clients(env);
  if (!bundle) throw new Error('SCHOOL_AI_SERVER_NOT_CONFIGURED');
  return bundle;
}

async function getSecret(env: EnvReader, schoolId: string): Promise<SchoolAiSecret | null> {
  const { admin } = await getServiceClients(env);
  const { data, error } = await admin.from('school_ai_secrets').select('*').eq('school_id', schoolId).maybeSingle();
  if (error) throw new Error(`Could not read school AI settings: ${error.message}`);
  return data as SchoolAiSecret | null;
}

function bearer(req: Request) {
  return (req.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || '';
}

async function resolveSchoolAdmin(req: Request, res: Response, env: EnvReader, requestedSchoolId?: string) {
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนตั้งค่า AI ของโรงเรียน' });
    return null;
  }
  const bundle = clients(env, token);
  if (!bundle) {
    res.status(503).json({ error: 'SCHOOL_AI_SERVER_NOT_CONFIGURED', message: 'ระบบจัดการ AI ยังตั้งค่า Supabase ไม่ครบ' });
    return null;
  }
  const { data: authData, error: authError } = await bundle.auth.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'INVALID_SESSION', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    return null;
  }
  const { data: profile, error } = await bundle.admin.from('user_profiles')
    .select('id, school_id, role, status').eq('id', authData.user.id).maybeSingle();
  if (error || !profile || profile.status !== 'active') {
    res.status(403).json({ error: 'ACCOUNT_INACTIVE', message: 'บัญชีนี้ไม่มีสิทธิ์ตั้งค่า AI หรือยังไม่เปิดใช้งาน' });
    return null;
  }

  let schoolId = String(profile.school_id || '');
  let isSchoolAdmin = profile.role === 'admin';
  if (profile.role === 'teacher' && schoolId && authData.user.email) {
    const { data: teacher } = await bundle.admin.from('teachers').select('is_school_admin')
      .eq('school_id', schoolId).ilike('email', authData.user.email).maybeSingle();
    isSchoolAdmin = Boolean(teacher?.is_school_admin);
  }
  if (profile.role === 'super_admin') {
    schoolId = requestedSchoolId || '';
  } else if (!isSchoolAdmin || !schoolId || (requestedSchoolId && requestedSchoolId !== schoolId)) {
    res.status(403).json({ error: 'SCHOOL_AI_FORBIDDEN', message: 'ผู้ดูแลโรงเรียนตั้งค่าได้เฉพาะโรงเรียนของตนเอง' });
    return null;
  }
  if (!schoolId) {
    res.status(400).json({ error: 'SCHOOL_REQUIRED', message: 'กรุณาเลือกโรงเรียน' });
    return null;
  }
  return { user: authData.user, schoolId, admin: bundle.admin };
}

export function createSchoolAiRouter(getEnv: EnvReader) {
  const router = Router();

  router.get('/settings', async (req, res) => {
    try {
      const access = await resolveSchoolAdmin(req, res, getEnv, String(req.query.schoolId || '') || undefined);
      if (!access) return;
      const [secret, usageResult] = await Promise.all([
        getSecret(getEnv, access.schoolId),
        access.admin.rpc('school_ai_usage_summary', { target_school_id: access.schoolId }),
      ]);
      if (usageResult.error) throw new Error(usageResult.error.message);
      const usage = Array.isArray(usageResult.data) ? usageResult.data[0] : usageResult.data;
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        schoolId: access.schoolId,
        configured: Boolean(secret?.enabled && secret?.key_ciphertext),
        keyLast4: secret?.key_last4 || null,
        monthlyRequestLimit: Number(secret?.monthly_request_limit || 300),
        encryptionReady: isEncryptionReady(getEnv),
        usage: {
          month: usage?.period_start || new Date().toISOString().slice(0, 7),
          requests: Number(usage?.request_count || 0),
          promptTokens: Number(usage?.prompt_tokens || 0),
          outputTokens: Number(usage?.output_tokens || 0),
          remainingRequests: Math.max(0, Number(secret?.monthly_request_limit || 300) - Number(usage?.request_count || 0)),
        },
      });
    } catch (error) {
      res.status(503).json({ error: 'SCHOOL_AI_SETTINGS_FAILED', message: error instanceof Error ? error.message : 'อ่านค่าการใช้งาน AI ไม่สำเร็จ' });
    }
  });

  router.put('/settings', async (req, res) => {
    try {
      const requestedSchoolId = String(req.body?.schoolId || '') || undefined;
      const access = await resolveSchoolAdmin(req, res, getEnv, requestedSchoolId);
      if (!access) return;
      const monthlyLimit = Number(req.body?.monthlyRequestLimit ?? 300);
      if (!Number.isInteger(monthlyLimit) || monthlyLimit < 10 || monthlyLimit > 20000) {
        res.status(400).json({ error: 'INVALID_QUOTA', message: 'โควตาต้องเป็นจำนวนเต็มตั้งแต่ 10 ถึง 20,000 ครั้งต่อเดือน' });
        return;
      }
      const rawKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
      let encrypted: ReturnType<typeof encryptSchoolApiKey> | null = null;
      if (rawKey) {
        if (rawKey.length < 20 || rawKey.length > 256 || /\s/.test(rawKey)) {
          res.status(400).json({ error: 'INVALID_API_KEY', message: 'กรุณาตรวจสอบ API key ให้ถูกต้อง (20–256 ตัวอักษรและไม่มีช่องว่าง)' });
          return;
        }
        try {
          encrypted = encryptSchoolApiKey(getEnv, access.schoolId, rawKey);
        } catch {
          res.status(503).json({ error: 'SCHOOL_AI_ENCRYPTION_NOT_CONFIGURED', message: 'ผู้ดูแลระบบต้องตั้ง SCHOOL_AI_ENCRYPTION_KEY บน Render ก่อน จึงจะบันทึก API key ได้' });
          return;
        }
      }
      const current = await getSecret(getEnv, access.schoolId);
      if (!encrypted && !current?.key_ciphertext) {
        res.status(400).json({ error: 'API_KEY_REQUIRED', message: 'กรุณาใส่ Gemini API key ก่อนบันทึกโควตา' });
        return;
      }
      const { error } = await access.admin.from('school_ai_secrets').upsert({
        school_id: access.schoolId,
        ...(encrypted || {}),
        enabled: true,
        monthly_request_limit: monthlyLimit,
        updated_by: access.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'school_id' });
      if (error) throw new Error(error.message);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ok: true, configured: true, keyLast4: encrypted?.key_last4 || current?.key_last4 || null, monthlyRequestLimit: monthlyLimit });
    } catch (error) {
      res.status(503).json({ error: 'SCHOOL_AI_SETTINGS_SAVE_FAILED', message: error instanceof Error ? error.message : 'บันทึกการตั้งค่า AI ไม่สำเร็จ' });
    }
  });

  router.delete('/settings', async (req, res) => {
    try {
      const access = await resolveSchoolAdmin(req, res, getEnv, String(req.query.schoolId || '') || undefined);
      if (!access) return;
      const { error } = await access.admin.from('school_ai_secrets').update({
        key_ciphertext: null, key_iv: null, key_auth_tag: null, key_last4: null,
        enabled: false, updated_by: access.user.id, updated_at: new Date().toISOString(),
      }).eq('school_id', access.schoolId);
      if (error) throw new Error(error.message);
      res.json({ ok: true, configured: false });
    } catch (error) {
      res.status(503).json({ error: 'SCHOOL_AI_KEY_REMOVE_FAILED', message: error instanceof Error ? error.message : 'ลบ API key ไม่สำเร็จ' });
    }
  });
  return router;
}

export async function prepareSchoolAiRequest(
  req: Request,
  schoolId: string,
  userId: string,
  getEnv: EnvReader,
): Promise<{ allowed: boolean; reason?: 'key_missing' | 'not_configured' }> {
  try {
    const secret = await getSecret(getEnv, schoolId);
    if (!secret?.enabled || !secret.key_ciphertext) return { allowed: false, reason: 'key_missing' };
    const apiKey = decryptSchoolApiKey(getEnv, secret);
    attachedContext.set(req, {
      schoolId,
      userId,
      client: new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }),
    });
    return { allowed: true };
  } catch (error) {
    console.error('[School AI] Could not prepare school AI request:', error instanceof Error ? error.message : String(error));
    return { allowed: false, reason: 'not_configured' };
  }
}

export async function reserveSchoolAiRequest(
  req: Request,
  getEnv: EnvReader,
): Promise<{ allowed: boolean; reason?: 'quota_exceeded' | 'not_configured'; used?: number; limit?: number }> {
  const context = attachedContext.get(req);
  if (!context) return { allowed: false, reason: 'not_configured' };
  try {
    const requestId = randomUUID();
    const { admin } = await getServiceClients(getEnv);
    const { data, error } = await admin.rpc('reserve_school_ai_request', {
      target_school_id: context.schoolId,
      target_user_id: context.userId,
      target_request_id: requestId,
    });
    if (error) throw new Error(error.message);
    const reservation = Array.isArray(data) ? data[0] : data;
    if (!reservation?.allowed) {
      return { allowed: false, reason: reservation?.monthly_limit ? 'quota_exceeded' : 'not_configured', used: Number(reservation?.used_requests || 0), limit: Number(reservation?.monthly_limit || 0) };
    }
    context.requestId = requestId;
    return { allowed: true, used: Number(reservation.used_requests), limit: Number(reservation.monthly_limit) };
  } catch (error) {
    console.error('[School AI] Could not reserve school AI quota:', error instanceof Error ? error.message : String(error));
    return { allowed: false, reason: 'not_configured' };
  }
}

export function getSchoolAiContext(req: Request): AiContext | null {
  return attachedContext.get(req) || null;
}

export async function finishSchoolAiRequest(req: Request, usage: unknown, status: 'succeeded' | 'failed', getEnv: EnvReader) {
  const context = attachedContext.get(req);
  if (!context?.requestId) return;
  const metadata = usage && typeof usage === 'object' ? usage as Record<string, unknown> : {};
  const promptTokens = Math.max(0, Math.min(1000000, Number(metadata.promptTokenCount) || 0));
  const outputTokens = Math.max(0, Math.min(1000000, Number(metadata.candidatesTokenCount) || 0));
  try {
    const { admin } = await getServiceClients(getEnv);
    const { error } = await admin.rpc('record_school_ai_request_result', {
      target_school_id: context.schoolId,
      target_request_id: context.requestId,
      target_prompt_tokens: promptTokens,
      target_output_tokens: outputTokens,
      target_status: status,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error('[School AI] Could not record request usage:', error instanceof Error ? error.message : String(error));
  }
}
