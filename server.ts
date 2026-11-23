import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { Type } from '@google/genai';
import { backupRawParser, createBackupRouter } from './src/server/backupRoutes.ts';
import { createStaffInviteEmailRouter } from './src/server/staffInviteEmailRoutes.ts';
import { createSchoolAiRouter, finishSchoolAiRequest, getSchoolAiContext, prepareSchoolAiRequest, reserveSchoolAiRequest } from './src/server/schoolAiRoutes.ts';

const viteEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const MODEL_NAME = 'gemini-4-hydrogen';

function getStageInstructions(stage: string): string {
  if (stage === 'primary') {
    return 'ระดับประถมศึกษา (ป.1-ป.6): ใช้ภาษาไทยสนุก เป็นกันเอง เข้าใจง่าย อธิบายว่าอาชีพนี้ทำอะไรในชีวิตประจำวัน เน้นความอยากรู้อยากเห็นและภารกิจทดลองง่ายๆ';
  }
  if (stage === 'middle') {
    return 'ระดับมัธยมศึกษาตอนต้น (ม.1-ม.3): เน้นการค้นหาความถนัด วางแผนเลือกสายการเรียน ม.ปลาย (เช่น วิทย์-คณิต, ศิลป์-คำนวณ, ศิลป์-ภาษา, อาชีวศึกษา) และกิจกรรมสร้างพื้นฐาน';
  }
  return 'ระดับมัธยมศึกษาตอนปลาย (ม.4-ม.6): เจาะลึกเกณฑ์จริงในการเข้าศึกษาต่อในประเทศไทย ทั้ง GPAX ขั้นต่ำ, วิชาสอบ TGAT/TPAT/A-Level, คุณสมบัติคณะ/สาขา และแนวทางเก็บ Portfolio (TCAS รอบ 1)';
}

function formatStudentContextSummary(ctx: Record<string, unknown> | undefined): string {
  if (!ctx) return 'ไม่มีข้อมูลผลการเรียนเพิ่มเติม';
  const gradeLevel = String(ctx.gradeLevel || 'ไม่ระบุชั้นเรียน');
  const stage = String(ctx.stage || 'high');
  const gpax = ctx.gpax != null ? Number(ctx.gpax).toFixed(2) : 'ยังไม่มีเกรดเฉลี่ย';
  const attendanceRate = ctx.attendanceRate != null ? `${ctx.attendanceRate}%` : 'ไม่ระบุ';
  const portfolioCount = ctx.portfolioCount != null ? `${ctx.portfolioCount} ชิ้น` : '0 ชิ้น';
  const subjects = Array.isArray(ctx.subjectGrades)
    ? (ctx.subjectGrades as Array<{ title?: string; score?: number; letter?: string }>)
        .slice(0, 10)
        .map((s) => `${s.title || 'วิชา'}: ${s.score ?? '-'}% (เกรด ${s.letter ?? '-'})`)
        .join(', ')
    : 'ยังไม่มีผลคะแนนรายวิชา';
  return `ระดับชั้น: ${gradeLevel} (ช่วงชั้น: ${stage}) | GPAX ปัจจุบัน: ${gpax} | อัตราการมาเรียน: ${attendanceRate} | ผลงาน Portfolio: ${portfolioCount} | คะแนนรายวิชา: ${subjects}`;
}

function handleGeminiError(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Career Quest AI] Gemini error:', message);
  const status = message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
    ? 429
    : message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')
      ? 403
      : 502;
  return res.status(status).json({
    error: 'GEMINI_UPSTREAM_ERROR',
    message,
  });
}

async function reserveCareerQuestAiQuota(req: Request, res: Response): Promise<boolean> {
  const quota = await reserveSchoolAiRequest(req, getServerEnv);
  if (quota.allowed) return true;
  if (quota.reason === 'quota_exceeded') {
    res.status(429).json({
      error: 'SCHOOL_AI_MONTHLY_QUOTA_EXCEEDED',
      message: `โรงเรียนใช้ Gemini ครบโควตาเดือนนี้แล้ว (${quota.used}/${quota.limit} ครั้ง)`,
      used: quota.used,
      limit: quota.limit,
    });
    return false;
  }
  res.status(503).json({ error: 'SCHOOL_AI_NOT_READY', message: 'ระบบ AI ของโรงเรียนยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' });
  return false;
}

function getServerEnv(name: string): string {
  return (process.env[name] || viteEnv[name] || '').trim();
}

const AI_CALL_WINDOW_MS = 5 * 60 * 1000;
const AI_CALL_LIMIT = 30;
const aiCallWindows = new Map<string, { startedAt: number; count: number }>();

type AiRateLimitResult = {
  available: boolean;
  allowed: boolean;
  retryAfterSeconds: number;
};

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
}

function consumeMemoryAiCall(userId: string, now: number): AiRateLimitResult {
  const current = aiCallWindows.get(userId);
  if (!current || now - current.startedAt >= AI_CALL_WINDOW_MS) {
    aiCallWindows.set(userId, { startedAt: now, count: 1 });
  } else if (current.count >= AI_CALL_LIMIT) {
    return {
      available: true,
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((AI_CALL_WINDOW_MS - (now - current.startedAt)) / 1000)),
    };
  } else {
    current.count += 1;
  }

  if (aiCallWindows.size > 5000) {
    for (const [key, window] of aiCallWindows) {
      if (now - window.startedAt >= AI_CALL_WINDOW_MS) aiCallWindows.delete(key);
    }
  }
  return { available: true, allowed: true, retryAfterSeconds: 0 };
}

async function consumeAiCall(userId: string): Promise<AiRateLimitResult> {
  const redisUrl = getServerEnv('REDIS_REST_URL');
  const redisToken = getServerEnv('REDIS_REST_TOKEN');
  if (!redisUrl || !redisToken) {
    if (isProductionRuntime()) {
      return { available: false, allowed: false, retryAfterSeconds: 0 };
    }
    return consumeMemoryAiCall(userId, Date.now());
  }

  const key = `baanpakkru:ai:career:${userId}`;
  const script = [
    "local count = redis.call('INCR', KEYS[1])",
    'if count == 1 then redis.call(\'PEXPIRE\', KEYS[1], ARGV[1]) end',
    "local ttl = redis.call('PTTL', KEYS[1])",
    'if ttl < 0 then redis.call(\'PEXPIRE\', KEYS[1], ARGV[1]); ttl = redis.call(\'PTTL\', KEYS[1]) end',
    'return {count, ttl}',
  ].join('\n');
  const response = await fetch(`${redisUrl.replace(/\/+$/, '')}/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['EVAL', script, '1', key, String(AI_CALL_WINDOW_MS)]),
    signal: AbortSignal.timeout(5000),
  });
  const payload = await response.json().catch(() => null) as { result?: unknown; error?: string } | null;
  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error || `Redis rate limiter returned HTTP ${response.status}`);
  }

  const result = payload.result;
  const count = Array.isArray(result) ? Number(result[0]) : NaN;
  const ttlMs = Array.isArray(result) ? Number(result[1]) : NaN;
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new Error('Redis rate limiter returned an invalid result.');
  }
  return {
    available: true,
    allowed: count <= AI_CALL_LIMIT,
    retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
  };
}

async function requireActiveSupabaseUser(req: Request, res: Response, next: NextFunction) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI' });
    return;
  }

  const supabaseUrl = getServerEnv('SUPABASE_URL') || getServerEnv('VITE_SUPABASE_URL');
  const supabaseKey =
    getServerEnv('SUPABASE_ANON_KEY') ||
    getServerEnv('SUPABASE_PUBLISHABLE_KEY') ||
    getServerEnv('VITE_SUPABASE_ANON_KEY') ||
    getServerEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ error: 'SUPABASE_AUTH_NOT_CONFIGURED', message: 'ระบบยืนยันตัวตนยังตั้งค่าไม่ครบ' });
    return;
  }

  try {
    const token = match[1];
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ error: 'INVALID_SESSION', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
      return;
    }

    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('status, role, school_id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[Career Quest AI] Could not verify user profile:', profileError.message);
      res.status(503).json({ error: 'PROFILE_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบสถานะบัญชีได้' });
      return;
    }
    if (!profile || profile.status !== 'active') {
      res.status(403).json({ error: 'ACCOUNT_INACTIVE', message: 'บัญชีนี้ยังไม่ได้เปิดใช้งาน' });
      return;
    }
    if (profile.role === 'student') {
      if (!profile.school_id) {
        res.status(403).json({ error: 'SCHOOL_REQUIRED', message: 'บัญชีนักเรียนยังไม่ได้ผูกกับโรงเรียน' });
        return;
      }
      const { data: school, error: schoolError } = await client
        .from('schools')
        .select('ai_student_enabled')
        .eq('id', profile.school_id)
        .maybeSingle();
      if (schoolError) {
        console.error('[Career Quest AI] Could not verify school AI access:', schoolError.message);
        res.status(503).json({ error: 'AI_ACCESS_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบสิทธิ์ AI ของโรงเรียนได้' });
        return;
      }
      if (!school?.ai_student_enabled) {
        res.status(403).json({ error: 'STUDENT_AI_DISABLED', message: 'โรงเรียนยังไม่ได้เปิดสิทธิ์ใช้งาน AI สำหรับนักเรียน' });
        return;
      }
    }

    const rateLimit = await consumeAiCall(authData.user.id);
    if (!rateLimit.available) {
      res.status(503).json({
        error: 'AI_RATE_LIMIT_NOT_CONFIGURED',
        message: 'ระบบจำกัดการใช้ AI ยังไม่ได้ตั้งค่า Redis สำหรับ production',
      });
      return;
    }
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      res.status(429).json({ error: 'AI_RATE_LIMITED', message: 'ใช้ AI ครบจำนวนชั่วคราวแล้ว กรุณาลองใหม่ภายหลัง' });
      return;
    }

    if (!profile.school_id) {
      res.status(403).json({ error: 'SCHOOL_REQUIRED', message: 'บัญชีนี้ยังไม่ได้ผูกกับโรงเรียน' });
      return;
    }
    const schoolAi = await prepareSchoolAiRequest(req, profile.school_id, authData.user.id, getServerEnv);
    if (!schoolAi.allowed) {
      if (schoolAi.reason === 'key_missing') {
        res.status(503).json({ error: 'SCHOOL_AI_KEY_NOT_CONFIGURED', message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key' });
        return;
      }
      res.status(503).json({ error: 'SCHOOL_AI_NOT_READY', message: 'ระบบ AI ของโรงเรียนยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' });
      return;
    }
    next();
  } catch (err) {
    console.error('[Career Quest AI] Authentication error:', err instanceof Error ? err.message : String(err));
    res.status(503).json({ error: 'AUTH_CHECK_FAILED', message: 'ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ' });
  }
}

async function createApp() {
  const app = express();
  app.use('/api/backup', backupRawParser());
  app.use(express.json({ limit: '64kb' }));

  app.use('/api/backup', createBackupRouter(getServerEnv));
  app.use('/api/staff-invitations', createStaffInviteEmailRouter(getServerEnv));
  app.use('/api/school-ai', createSchoolAiRouter(getServerEnv));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      schoolAiMode: 'per_school',
      schoolAiEncryptionConfigured: Boolean(getServerEnv('SCHOOL_AI_ENCRYPTION_KEY')),
      supabaseConfigured: Boolean(
        (getServerEnv('SUPABASE_URL') || getServerEnv('VITE_SUPABASE_URL')) &&
        (getServerEnv('SUPABASE_ANON_KEY') || getServerEnv('SUPABASE_PUBLISHABLE_KEY') ||
          getServerEnv('VITE_SUPABASE_ANON_KEY') || getServerEnv('VITE_SUPABASE_PUBLISHABLE_KEY'))
      ),
    });
  });

  // Readiness diagnostics are separate from liveness so an external database
  // incident does not cause the host to restart a healthy web process.
  app.get('/api/ready', async (_req: Request, res: Response) => {
    const url = getServerEnv('SUPABASE_URL') || getServerEnv('VITE_SUPABASE_URL');
    const key = getServerEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      res.status(503).json({ ok: false, checks: { database: false, serviceRoleConfigured: false } });
      return;
    }
    try {
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await client.from('schools').select('id').limit(1);
      if (error) {
        res.status(503).json({ ok: false, checks: { database: false, serviceRoleConfigured: true } });
        return;
      }
      res.json({ ok: true, checks: { database: true, serviceRoleConfigured: true } });
    } catch {
      res.status(503).json({ ok: false, checks: { database: false, serviceRoleConfigured: true } });
    }
  });

  app.use('/api/career-quest', requireActiveSupabaseUser);

  // 1. Analyze any direct or custom dream career for the student
  app.post('/api/career-quest/analyze-career', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { careerQuery, studentContext } = req.body as {
        careerQuery?: string;
        studentContext?: Record<string, unknown>;
      };
      if (!careerQuery || !careerQuery.trim()) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'กรุณาระบุชื่ออาชีพที่ต้องการวิเคราะห์' });
      }
      if (careerQuery.trim().length > 160) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ชื่ออาชีพยาวได้ไม่เกิน 160 ตัวอักษร' });
      }
      if (!(await reserveCareerQuestAiQuota(req, res))) return;

      const stage = String(studentContext?.stage || 'high');
      const prompt = [
        `วิเคราะห์อาชีพเป้าหมายสำหรับนักเรียนไทย Gen Z: "${careerQuery.trim()}"`,
        `บริบทนักเรียน: ${formatStudentContextSummary(studentContext)}`,
        `แนวทางระดับชั้น: ${getStageInstructions(stage)}`,
        `สร้างข้อมูลโปรไฟล์อาชีพสาย RPG พร้อม targetGpax (ตัวเลข 2.00 - 3.90), รายวิชาสำคัญ 3-4 วิชา (ใช้ subjectKey เป็นหนึ่งใน: math, science, thai, english, social, computer, arts, health), ฉายาสุดเท่ (เช่น ว่าที่คุณหมอ, Tech Builder), แผนเส้นทางตามระดับชั้น และชุดภารกิจเริ่มต้น 3 ระดับ (daily_weekly 3 ข้อที่เชื่อมกับเกม/แล็บ/เช็คชื่อ/ติวเตอร์ในแอป, portfolio 2 ข้อที่ทำเป็นชิ้นงานจริงได้, และหัวข้อ Role-Play)`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือ AI Career Architect ผู้ช่วยแนะแนวอาชีพสำหรับนักเรียนไทย Gen Z ตอบเป็น JSON ที่ชัดเจน อบอุ่น ให้กำลังใจ และใช้ข้อมูลการศึกษาไทยจริง (ปพ./TCAS/TGAT/TPAT/A-Level สำหรับ ม.ปลาย)',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titleTh: { type: Type.STRING },
              titleEn: { type: Type.STRING },
              category: { type: Type.STRING },
              taglineTh: { type: Type.STRING },
              taglineEn: { type: Type.STRING },
              targetGpax: { type: Type.NUMBER },
              unlockableTitleTh: { type: Type.STRING },
              unlockableTitleEn: { type: Type.STRING },
              stageRoadmapTh: { type: Type.STRING },
              stageRoadmapEn: { type: Type.STRING },
              examFocusTh: { type: Type.STRING },
              keySubjects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subjectKey: { type: Type.STRING },
                    labelTh: { type: Type.STRING },
                    labelEn: { type: Type.STRING },
                    targetScore: { type: Type.INTEGER },
                    importance: { type: Type.STRING },
                    reasonTh: { type: Type.STRING },
                  },
                },
              },
              quests: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    tier: { type: Type.STRING },
                    titleTh: { type: Type.STRING },
                    titleEn: { type: Type.STRING },
                    descriptionTh: { type: Type.STRING },
                    targetAppTab: { type: Type.STRING },
                    expReward: { type: Type.INTEGER },
                    gemsReward: { type: Type.INTEGER },
                    skillTag: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ career: parsed });
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleGeminiError(res, err);
    }
  });

  // 2. 5-question Career Vibe Quiz + Real Grades -> Top 3 Matches
  app.post('/api/career-quest/vibe-quiz', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { quizAnswers, studentContext } = req.body as {
        quizAnswers?: Array<{ questionTh?: string; selectedLabelTh?: string; traitTag?: string }>;
        studentContext?: Record<string, unknown>;
      };
      if (!Array.isArray(quizAnswers) || quizAnswers.length < 1 || quizAnswers.length > 20) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'กรุณาส่งคำตอบแบบทดสอบ 1–20 ข้อ' });
      }
      if (quizAnswers.some((answer) => String(answer.selectedLabelTh || '').length > 500 || String(answer.questionTh || '').length > 500)) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ข้อความคำตอบยาวเกินกำหนด' });
      }
      if (!(await reserveCareerQuestAiQuota(req, res))) return;
      const stage = String(studentContext?.stage || 'high');
      const answersText = (quizAnswers || [])
        .map((a, idx) => `${idx + 1}. ${a.questionTh || ''} -> เลือก: ${a.selectedLabelTh || ''} (${a.traitTag || ''})`)
        .join('\n');

      const prompt = [
        'วิเคราะห์ผล Career Vibe Quiz 5 ข้อ ร่วมกับผลการเรียนจริงของนักเรียน เพื่อแนะนำ 3 อาชีพที่เข้ากับตัวตนและศักยภาพของนักเรียนมากที่สุด',
        `คำตอบ Vibe Quiz:\n${answersText}`,
        `บริบทนักเรียน: ${formatStudentContextSummary(studentContext)}`,
        `แนวทางระดับชั้น: ${getStageInstructions(stage)}`,
        'เรียงจากอาชีพที่เข้ากันที่สุดอันดับ 1-3 พร้อม matchPercent (65-98), เหตุผลภาษาไทยที่เชื่อมโยงทั้งนิสัยจาก Quiz และวิชาที่ทำได้ดีจริง, targetGpax, keySubjects 3 วิชา, unlockableTitleTh, และ stageRoadmapTh',
      ].join('\n\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือ AI Career Counselor สำหรับเด็ก Gen Z ที่ผสานความชอบส่วนตัวเข้ากับจุดแข็งทางวิชาการอย่างสร้างสรรค์ ตอบเป็น JSON array 3 อาชีพ',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    titleTh: { type: Type.STRING },
                    titleEn: { type: Type.STRING },
                    category: { type: Type.STRING },
                    taglineTh: { type: Type.STRING },
                    matchPercent: { type: Type.INTEGER },
                    reasonTh: { type: Type.STRING },
                    reasonEn: { type: Type.STRING },
                    targetGpax: { type: Type.NUMBER },
                    unlockableTitleTh: { type: Type.STRING },
                    unlockableTitleEn: { type: Type.STRING },
                    stageRoadmapTh: { type: Type.STRING },
                    examFocusTh: { type: Type.STRING },
                    keySubjects: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          subjectKey: { type: Type.STRING },
                          labelTh: { type: Type.STRING },
                          labelEn: { type: Type.STRING },
                          targetScore: { type: Type.INTEGER },
                          importance: { type: Type.STRING },
                          reasonTh: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{"matches":[]}').trim());
      return res.json(parsed);
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleGeminiError(res, err);
    }
  });

  // 3. Refresh / Generate personalized 3-tier quests
  app.post('/api/career-quest/generate-quests', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { careerTitleTh, studentContext } = req.body as {
        careerTitleTh?: string;
        studentContext?: Record<string, unknown>;
      };
      if (careerTitleTh && careerTitleTh.length > 160) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ชื่ออาชีพยาวได้ไม่เกิน 160 ตัวอักษร' });
      }
      if (!(await reserveCareerQuestAiQuota(req, res))) return;
      const stage = String(studentContext?.stage || 'high');

      const prompt = [
        `สร้างชุดภารกิจสายอาชีพชุดใหม่ที่สดใหม่และทำได้จริงสำหรับอาชีพ "${careerTitleTh || 'นักพัฒนาซอฟต์แวร์'}"`,
        `บริบทนักเรียน: ${formatStudentContextSummary(studentContext)}`,
        `ระดับชั้น: ${getStageInstructions(stage)}`,
        'สร้าง 5 ภารกิจ: 3 ภารกิจ daily_weekly (ระบุ targetAppTab เป็นหนึ่งใน games, subject_labs, mobile_checkin, socratic_tutor, homework) และ 2 ภารกิจ portfolio (ระบุ targetAppTab เป็น portfolio ที่เน้นสร้างชิ้นงานจริงเก็บเข้าแฟ้มผลงานได้)',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือ AI Quest Designer สร้างภารกิจการเรียนรู้แบบเกมที่เชื่อมโยงกับการเรียนจริงในโรงเรียนและแฟ้มผลงาน Portfolio',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quests: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    tier: { type: Type.STRING },
                    titleTh: { type: Type.STRING },
                    titleEn: { type: Type.STRING },
                    descriptionTh: { type: Type.STRING },
                    targetAppTab: { type: Type.STRING },
                    expReward: { type: Type.INTEGER },
                    gemsReward: { type: Type.INTEGER },
                    skillTag: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{"quests":[]}').trim());
      return res.json(parsed);
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleGeminiError(res, err);
    }
  });

  // 4. Interactive 3-5 turn AI Role-Play Mission
  app.post('/api/career-quest/roleplay', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const {
        careerTitleTh,
        stage,
        turnNumber,
        maxTurns,
        history,
        chosenOptionText,
      } = req.body as {
        careerTitleTh?: string;
        stage?: string;
        turnNumber?: number;
        maxTurns?: number;
        history?: Array<{ role: string; text: string }>;
        chosenOptionText?: string;
      };

      const currentTurn = Math.max(1, Number(turnNumber) || 1);
      const totalTurns = Math.min(5, Math.max(3, Number(maxTurns) || 4));
      if ((careerTitleTh || '').length > 160 || (chosenOptionText || '').length > 500 || !Array.isArray(history || []) || (history || []).length > 10 || (history || []).some((entry) => String(entry.text || '').length > 1000)) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ข้อมูลสถานการณ์ยาวหรือมีจำนวนเกินกำหนด' });
      }
      if (!(await reserveCareerQuestAiQuota(req, res))) return;
      const isFinalTurn = currentTurn >= totalTurns;

      const historyText = (history || [])
        .map((h) => `${h.role}: ${h.text}`)
        .join('\n');

      const prompt = [
        `คุณกำลังดำเนินมินิเกมจำลองสถานการณ์อาชีพ (Role-Play Mission) สำหรับอาชีพ "${careerTitleTh || 'แพทย์'}"`,
        `ระดับชั้นผู้เล่น: ${getStageInstructions(String(stage || 'high'))}`,
        `ตาปัจจุบัน: ${currentTurn} / ${totalTurns}`,
        historyText ? `ประวัติเหตุการณ์ที่ผ่านมา:\n${historyText}` : 'เริ่มสถานการณ์จำลองตาที่ 1: สร้างเหตุการณ์สมจริงที่สนุก ท้าทาย และเหมาะกับวัยเรียน',
        chosenOptionText ? `ผู้เล่นเพิ่งเลือก: "${chosenOptionText}"` : '',
        isFinalTurn
          ? 'นี่คือตาสุดท้าย! ให้สรุปผลลัพธ์ของการตัดสินใจทั้งหมด ประเมินทักษะ 4 ด้าน (analytical, communication, empathy, problemSolving คะแนน 60-98) และให้ข้อคิดสร้างแรงบันดาลใจ โดยตั้งค่า isCompleted = true และ choices = []'
          : 'ตอบรับการตัดสินใจก่อนหน้าอย่างสร้างสรรค์ (turnFeedbackTh) แล้วดำเนินสถานการณ์ตาถัดไป (sceneTitleTh, situationTh, npcDialogueTh) พร้อมตัวเลือก 3 ข้อที่มีแนวทางแตกต่างกัน (choices) และตั้งค่า isCompleted = false',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือ AI Role-Play Game Master ที่จำลองสถานการณ์การทำงานจริงของอาชีพต่างๆ ให้เด็ก Gen Z ได้ลองสวมบทบาท ตอบกระชับ ชวนติดตาม ปลอดภัย และได้ความรู้จริง',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sceneTitleTh: { type: Type.STRING },
              situationTh: { type: Type.STRING },
              npcDialogueTh: { type: Type.STRING },
              turnFeedbackTh: { type: Type.STRING },
              isCompleted: { type: Type.BOOLEAN },
              choices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    labelTh: { type: Type.STRING },
                    skillHint: { type: Type.STRING },
                  },
                },
              },
              skillScores: {
                type: Type.OBJECT,
                properties: {
                  analytical: { type: Type.INTEGER },
                  communication: { type: Type.INTEGER },
                  empathy: { type: Type.INTEGER },
                  problemSolving: { type: Type.INTEGER },
                },
              },
              summaryFeedbackTh: { type: Type.STRING },
            },
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ roleplay: parsed });
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleGeminiError(res, err);
    }
  });

  // 5. AI Career Coach Personal Mentor
  app.post('/api/career-quest/coach', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { message, careerTitleTh, targetGpax, studentContext, chatHistory } = req.body as {
        message?: string;
        careerTitleTh?: string;
        targetGpax?: number;
        studentContext?: Record<string, unknown>;
        chatHistory?: Array<{ sender?: string; text?: string }>;
      };

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'กรุณาพิมพ์คำถามถึงพี่เลี้ยง AI' });
      }
      if (message.trim().length > 2000 || (chatHistory || []).length > 50 || (chatHistory || []).some((entry) => String(entry.text || '').length > 2000)) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ข้อความหรือประวัติสนทนายาวเกินกำหนด' });
      }
      if (!(await reserveCareerQuestAiQuota(req, res))) return;

      const stage = String(studentContext?.stage || 'high');
      const recentChat = (chatHistory || [])
        .slice(-6)
        .map((c) => `${c.sender === 'student' ? 'นักเรียน' : 'AI พี่เลี้ยง'}: ${c.text}`)
        .join('\n');

      const prompt = [
        `อาชีพเป้าหมายของนักเรียน: ${careerTitleTh || 'ยังไม่ระบุ'} (เป้าหมาย GPAX: ${targetGpax ?? 3.0})`,
        `ข้อมูลจริงของนักเรียน: ${formatStudentContextSummary(studentContext)}`,
        `แนวทางระดับชั้น: ${getStageInstructions(stage)}`,
        recentChat ? `บทสนทนาล่าสุด:\n${recentChat}` : '',
        `คำถามจากนักเรียน: "${message.trim()}"`,
        'ตอบให้กำลังใจอย่างจริงใจ อ้างอิงเกรด/ข้อมูลจริงของนักเรียน และจัดแผนปฏิบัติสั้นๆ 2-3 ขั้นที่ทำได้จริงในสัปดาห์นี้ พร้อมแนะนำแท็บในแอปถ้าเกี่ยวข้อง (socratic_tutor, games, subject_labs, portfolio, gradebook, homework)',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือ AI Career Coach พี่เลี้ยงแนะแนวอาชีพสุดใจดีและเข้าใจวัยรุ่น Gen Z พูดคุยเป็นกันเอง ไม่กดดัน ให้แผนปฏิบัติจริงที่ชัดเจนและสอดคล้องกับข้อมูลเกรดของนักเรียน',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyTh: { type: Type.STRING },
              actionStepsTh: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              encouragedTab: { type: Type.STRING },
            },
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ coach: parsed });
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleGeminiError(res, err);
    }
  });

  const httpServer = http.createServer(app);
  const distDir = path.resolve(import.meta.dirname || process.cwd(), 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.npm_lifecycle_event === 'start' && fs.existsSync(distDir)) ||
    (process.argv.includes('--prod') && fs.existsSync(distDir));

  if (isProd && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    // Keep the local development server in sync with source edits by default.
    // HMR can still be disabled explicitly for constrained environments.
    const hmrEnabled = process.env.NODE_ENV !== 'production' && process.env.DISABLE_HMR !== 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrEnabled ? { server: httpServer } : false,
        ws: hmrEnabled ? { server: httpServer } : false,
        watch: hmrEnabled ? undefined : null,
      },
      appType: 'spa',
    });

    if (!hmrEnabled) {
      app.get('/@vite/client', async (_req: Request, res: Response, next) => {
        try {
          const result = await vite.transformRequest('/@vite/client');
          if (result?.code) {
            const patched = result.code
              .replace(
                /transport\.connect\(createHMRHandler\([^)]*\)\);?/g,
                '/* HMR WebSocket disabled */'
              )
              .replace(
                /throw new SendBeforeConnectError\("send was called before connect"\);?/g,
                'return;'
              )
              .replace(
                /throw new SendBeforeConnectError\("invoke was called before connect"\);?/g,
                'return;'
              );
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.send(patched);
            return;
          }
        } catch {
          // Fall through to default Vite middleware if transform fails
        }
        next();
      });
    }

    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`[BaanPakKru Server] Listening on http://${HOST}:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('[BaanPakKru Server] Fatal startup error:', err);
  process.exit(1);
});
