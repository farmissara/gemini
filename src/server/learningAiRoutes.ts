import express from 'express';
import type { Request, Response } from 'express';
import { Type } from '@google/genai';
import {
  finishSchoolAiRequest,
  getSchoolAiContext,
  reserveSchoolAiRequest,
} from './schoolAiRoutes.ts';

type EnvReader = (name: string) => string;

const MODEL_NAME = 'gemini-4-hydrogen';

async function reserveLearningAiQuota(
  req: Request,
  res: Response,
  getServerEnv: EnvReader
): Promise<boolean> {
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
  res.status(503).json({
    error: 'SCHOOL_AI_NOT_READY',
    message: 'ระบบ AI ของโรงเรียนยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ',
  });
  return false;
}

function handleLearningGeminiError(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Learning AI] Gemini error:', message);
  const status =
    message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
      ? 429
      : message.includes('403') ||
          message.includes('PERMISSION_DENIED') ||
          message.includes('API_KEY_INVALID')
        ? 403
        : 502;
  return res.status(status).json({
    error: 'GEMINI_UPSTREAM_ERROR',
    message,
  });
}

function parseSafeImageDataUrl(raw: unknown): { mimeType: string; data: string } | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) return null;
  const rawMime = match[1].toLowerCase();
  const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
  const base64Data = match[2].replace(/\s+/g, '');
  if (!base64Data || base64Data.length > 1_400_000) return null;
  return { mimeType, data: base64Data };
}

export function createLearningAiRouter(getServerEnv: EnvReader) {
  const router = express.Router();

  // 1. Socratic Tutor dialogue (step-by-step scaffolding, never spoils final answer right away)
  router.post('/socratic-chat', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { message, subjectContext, studentName, lang, chatHistory } = req.body as {
        message?: string;
        subjectContext?: string;
        studentName?: string;
        lang?: string;
        chatHistory?: Array<{ sender?: string; text?: string }>;
      };

      const trimmedMessage = typeof message === 'string' ? message.trim() : '';
      if (!trimmedMessage) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'กรุณาพิมพ์คำถามที่ต้องการให้พี่รหัส AI ช่วยคิด' });
      }
      if (trimmedMessage.length > 2000) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'คำถามยาวเกิน 2,000 ตัวอักษร' });
      }

      const historyList = Array.isArray(chatHistory) ? chatHistory.slice(-12) : [];
      if (historyList.some((entry) => String(entry?.text || '').length > 2000)) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ข้อความในประวัติแชทยาวเกินกำหนด' });
      }

      if (!(await reserveLearningAiQuota(req, res, getServerEnv))) return;

      const historySummary = historyList
        .map((m) => `${m.sender === 'student' ? 'นักเรียน' : 'พี่รหัส AI'}: ${String(m.text || '').trim()}`)
        .filter(Boolean)
        .join('\n');

      const prompt = [
        `ผู้เรียน: ${String(studentName || 'นักเรียน').slice(0, 120)}`,
        subjectContext ? `วิชาหรือหัวข้อที่กำลังโฟกัส: ${String(subjectContext).slice(0, 200)}` : '',
        `ภาษาที่ตอบ: ${lang === 'en' ? 'English (clear and supportive)' : 'ภาษาไทยสุภาพ เป็นกันเองเหมือนรุ่นพี่ติวเตอร์'}`,
        historySummary ? `บทสนทนาก่อนหน้า:\n${historySummary}` : '',
        `คำถามล่าสุดจากนักเรียน: "${trimmedMessage}"`,
        'จงตอบตามหลัก Socratic Method:',
        '- replyTh: ตอบรับอย่างให้กำลังใจ เชื่อมโยงหลักการพื้นฐานโดยยังไม่เฉลยคำตอบสุดท้ายแบบรวบรัด (ยกเว้นนักเรียนตอบถูกแล้วให้ชื่นชมและสรุป)',
        '- scaffoldingHint: คำใบ้เฉพาะจุด 1-2 ประโยคที่ช่วยให้นักเรียนคิดต่อได้',
        '- followUpPrompt: คำถามปลายปิดหรือคำถามสั้น 1 ข้อเพื่อให้นักเรียนลองตอบขั้นถัดไป',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือ "พี่รหัส AI" ติวเตอร์สาย Socratic สำหรับนักเรียนไทย คิดเป็นขั้นตอน ชวนคิดวิเคราะห์ด้วยเหตุผล ห้ามเฉลยคำตอบทันทีจนกว่าผู้เรียนจะลองคิดด้วยตนเอง',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyTh: { type: Type.STRING },
              scaffoldingHint: { type: Type.STRING },
              followUpPrompt: { type: Type.STRING },
            },
            required: ['replyTh', 'scaffoldingHint', 'followUpPrompt'],
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ reply: parsed });
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleLearningGeminiError(res, err);
    }
  });

  // 2. Teacher 2-Minute Micro-Recap Lecture Script Generator
  router.post('/socratic-talking-points', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { subject, topicTh, commonMisconceptionTh, suggestedLessonPlanTh, strugglePercent, lang } = req.body as {
        subject?: string;
        topicTh?: string;
        commonMisconceptionTh?: string;
        suggestedLessonPlanTh?: string;
        strugglePercent?: number;
        lang?: string;
      };

      const cleanTopic = typeof topicTh === 'string' ? topicTh.trim() : '';
      if (!cleanTopic) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'กรุณาระบุหัวข้อบทเรียน' });
      }
      if (cleanTopic.length > 300) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ชื่อหัวข้อยาวเกินกำหนด' });
      }

      if (!(await reserveLearningAiQuota(req, res, getServerEnv))) return;

      const prompt = [
        `รายวิชา: ${String(subject || 'ทั่วไป').slice(0, 120)}`,
        `หัวข้อที่นักเรียนสับสน (${Number(strugglePercent) || 0}% ของห้อง): ${cleanTopic}`,
        commonMisconceptionTh ? `ความเข้าใจคลาดเคลื่อนที่พบบ่อย: ${String(commonMisconceptionTh).slice(0, 800)}` : '',
        suggestedLessonPlanTh ? `แนวทางเดิม: ${String(suggestedLessonPlanTh).slice(0, 800)}` : '',
        `ภาษา: ${lang === 'en' ? 'English' : 'ภาษาไทย'}`,
        'สร้างบทพูดสอนซ้ำหน้าชั้นเรียนแบบกระชับ 2 นาที แบ่งเป็น 3 ช่วงชัดเจน:',
        '1. [Hook 30 วินาที] คำถามเปิดประเด็นดึงความสนใจตรงจุดที่เด็กเข้าใจผิด',
        '2. [Clarify 1 นาที] คำอธิบายเปรียบเทียบที่เข้าใจง่าย แก้ความเข้าใจผิดทันที',
        '3. [Check 30 วินาที] คำถามเช็คความเข้าใจ 1 ข้อให้นักเรียนทั้งห้องตอบพร้อมกัน',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือผู้เชี่ยวชาญด้านการออกแบบการสอน (Instructional Coach) ช่วยครูไทยสร้างสคริปต์ Micro-Recap 2 นาทีที่ใช้ได้จริงหน้าชั้นเรียน',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              microRecapPlanTh: { type: Type.STRING },
            },
            required: ['microRecapPlanTh'],
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ microRecapPlanTh: String(parsed.microRecapPlanTh || '') });
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleLearningGeminiError(res, err);
    }
  });

  // 3. Adaptive Weakness Diagnostic & Remedial Micro-Quests
  router.post('/diagnostic-plan', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { studentName, gradeLevel, averageScore, attendanceRate, weakCourses, lang } = req.body as {
        studentName?: string;
        gradeLevel?: string;
        averageScore?: number;
        attendanceRate?: number;
        weakCourses?: Array<{ code?: string; title?: string; score?: number; letter?: string }>;
        lang?: string;
      };

      const coursesList = Array.isArray(weakCourses) ? weakCourses.slice(0, 12) : [];
      if (!(await reserveLearningAiQuota(req, res, getServerEnv))) return;

      const courseSummary =
        coursesList.length > 0
          ? coursesList
              .map(
                (c) =>
                  `- ${String(c.code || '').slice(0, 24)} ${String(c.title || 'รายวิชา').slice(0, 120)}: ${Number(c.score) || 0}/100 (เกรด ${String(c.letter || '-')})`
              )
              .join('\n')
          : '- ยังไม่มีคะแนนรายวิชาต่ำกว่าเกณฑ์ (สร้างแผนทบทวนพื้นฐานเชิงลึกให้สมวัย)';

      const prompt = [
        `วิเคราะห์จุดอ่อนและจัดทำภารกิจซ่อมเสริมเฉพาะบุคคล (Adaptive Remedial Plan)`,
        `นักเรียน: ${String(studentName || 'ผู้เรียน').slice(0, 120)} | ชั้น: ${String(gradeLevel || 'มัธยมศึกษา').slice(0, 60)}`,
        `คะแนนเฉลี่ยรวม: ${Number(averageScore ?? 75).toFixed(1)}% | การมาเรียน: ${Number(attendanceRate ?? 95).toFixed(1)}%`,
        `รายวิชาที่ต้องติดตาม/พัฒนา:\n${courseSummary}`,
        `ภาษา: ${lang === 'en' ? 'English' : 'ภาษาไทย'}`,
        'สร้างผลวินิจฉัย 2 รายการ (diagnostics) โดยแต่ละรายการต้องมีคำถามแบบเลือกตอบ 4 ตัวเลือก จำนวน 3 ข้อ (microQuests) พร้อมเฉลย (correctIndex 0-3) และคำอธิบายที่ตรงกับหลักสูตรไทยจริง',
      ].join('\n\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือ AI Learning Diagnostician ผู้เชี่ยวชาญการวิเคราะห์สมรรถนะผู้เรียนตามหลักสูตรแกนกลาง พ.ศ. 2551 และสร้างแบบทดสอบซ่อมเสริมที่ถูกต้องแม่นยำ',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryTh: { type: Type.STRING },
              diagnostics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subject: { type: Type.STRING },
                    topicTh: { type: Type.STRING },
                    accuracyRate: { type: Type.INTEGER },
                    rootCauseTh: { type: Type.STRING },
                    recommendedActionTh: { type: Type.STRING },
                    microQuests: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          questionTh: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          correctIndex: { type: Type.INTEGER },
                          explanationTh: { type: Type.STRING },
                        },
                        required: ['id', 'questionTh', 'options', 'correctIndex', 'explanationTh'],
                      },
                    },
                  },
                  required: ['subject', 'topicTh', 'accuracyRate', 'rootCauseTh', 'recommendedActionTh', 'microQuests'],
                },
              },
            },
            required: ['summaryTh', 'diagnostics'],
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ plan: parsed });
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleLearningGeminiError(res, err);
    }
  });

  // 4. Multimodal Real-World Snap Quest Verification
  router.post('/snap-quest-verify', async (req: Request, res: Response) => {
    const ai = getSchoolAiContext(req)?.client;
    if (!ai) {
      return res.status(503).json({
        error: 'SCHOOL_AI_KEY_NOT_CONFIGURED',
        message: 'โรงเรียนยังไม่ได้ตั้งค่า Gemini API key',
      });
    }

    try {
      const { questTitle, subject, scenario, instruction, studentNote, imageDataUrl, lang } = req.body as {
        questTitle?: string;
        subject?: string;
        scenario?: string;
        instruction?: string;
        studentNote?: string;
        imageDataUrl?: string;
        lang?: string;
      };

      const cleanTitle = typeof questTitle === 'string' ? questTitle.trim() : '';
      if (!cleanTitle || cleanTitle.length > 200) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ชื่อภารกิจไม่ถูกต้อง' });
      }

      const parsedImage = parseSafeImageDataUrl(imageDataUrl);
      if (!parsedImage) {
        return res.status(400).json({
          error: 'INVALID_IMAGE',
          message: 'กรุณาถ่ายภาพหรืออัปโหลดไฟล์ภาพ (JPEG/PNG/WebP ขนาดไม่เกิน 1 MB) จากอุปกรณ์ของคุณ',
        });
      }

      if (!(await reserveLearningAiQuota(req, res, getServerEnv))) return;

      const prompt = [
        `ตรวจภาพถ่ายจริงที่นักเรียนส่งเข้าภารกิจ: "${cleanTitle}"`,
        subject ? `หมวดวิชา: ${String(subject).slice(0, 60)}` : '',
        scenario ? `สถานการณ์โจทย์: ${String(scenario).slice(0, 600)}` : '',
        instruction ? `สิ่งที่ให้สังเกตในภาพ: ${String(instruction).slice(0, 400)}` : '',
        studentNote ? `บันทึกเพิ่มเติมของนักเรียน: "${String(studentNote).slice(0, 600)}"` : '',
        `ภาษาที่ตอบ: ${lang === 'en' ? 'English' : 'ภาษาไทย'}`,
        'วิเคราะห์สิ่งที่เห็นในภาพถ่ายจริงอย่างซื่อสัตย์:',
        '- identifiedObject: ระบุวัตถุหรือสิ่งที่เห็นในภาพอย่างชัดเจน',
        '- confidencePercent: ความมั่นใจ (0-100)',
        '- isPass: true หากภาพตรงกับวัตถุประสงค์ของภารกิจ, false หากภาพไม่เกี่ยวข้องหรือไม่ชัดเจนพอ',
        '- feedbackTh: คำอธิบายเชิงวิชาการที่เชื่อมโยงสิ่งที่เห็นในภาพกับบทเรียน หรือแนะนำสิ่งที่ควรถ่ายเพิ่มเติม',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            inlineData: {
              mimeType: parsedImage.mimeType,
              data: parsedImage.data,
            },
          },
          { text: prompt },
        ],
        config: {
          systemInstruction:
            'คุณคือครูผู้ช่วย AI ตรวจภาพถ่ายการเรียนรู้ในชีวิตจริง ประเมินตรงไปตรงมาตามภาพที่เห็นจริง ให้กำลังใจและคำแนะนำทางวิชาการที่เป็นประโยชน์',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              identifiedObject: { type: Type.STRING },
              confidencePercent: { type: Type.NUMBER },
              feedbackTh: { type: Type.STRING },
              isPass: { type: Type.BOOLEAN },
            },
            required: ['identifiedObject', 'confidencePercent', 'feedbackTh', 'isPass'],
          },
        },
      });

      await finishSchoolAiRequest(req, response.usageMetadata, 'succeeded', getServerEnv);
      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ verification: parsed });
    } catch (err) {
      await finishSchoolAiRequest(req, null, 'failed', getServerEnv);
      return handleLearningGeminiError(res, err);
    }
  });

  return router;
}
