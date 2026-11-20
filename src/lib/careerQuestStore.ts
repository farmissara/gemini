import {
  CareerCoachMessage,
  CareerEducationStage,
  CareerProfile,
  CareerRoleplayTurn,
  CareerVibeMatch,
  CareerVibeQuizAnswer,
  StudentCareerQuestState,
} from '../types';
import { getSupabaseClient } from './supabase';
import { POPULAR_CAREERS } from '../data/careerQuestData';

const LOCAL_STORAGE_KEY_PREFIX = 'baanpakkru_career_quest_v1_';

async function postCareerQuestAi<T>(path: string, payload: unknown): Promise<T> {
  const client = getSupabaseClient();
  if (!client) throw new Error('ยังไม่ได้เชื่อมต่อ Supabase');

  const { data, error } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน AI');

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `ไม่สามารถเรียกใช้ AI ได้ (${response.status})`);
  }
  return result as T;
}

function storageKey(schoolId: string, userId: string): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${schoolId}_${userId}`;
}

export function createEmptyCareerQuestState(params: {
  schoolId: string;
  userId: string;
  studentId?: string;
  studentName: string;
  gradeLevel?: string;
}): StudentCareerQuestState {
  return {
    schoolId: params.schoolId,
    userId: params.userId,
    studentId: params.studentId,
    studentName: params.studentName,
    gradeLevel: params.gradeLevel,
    activeCareerId: null,
    pinnedCareers: [],
    vibeQuizAnswers: [],
    vibeMatches: [],
    completedQuestIds: [],
    roleplayRunsCount: 0,
    coachMessages: [],
    careerExp: 0,
    unlockedTitles: [],
    shareWithTeachersAndParents: true,
    lastReadinessPercent: 0,
    lastReadinessLevel: 'Lv.1 นักสำรวจ',
    updatedAt: new Date().toISOString(),
  };
}

function isMissingCareerTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as { code?: string; message?: string };
  const msg = (errObj.message || '').toLowerCase();
  return (
    errObj.code === '42P01' ||
    errObj.code === 'PGRST205' ||
    msg.includes('student_career_quests') ||
    msg.includes('does not exist')
  );
}

export function readLocalCareerQuestState(
  schoolId: string,
  userId: string
): StudentCareerQuestState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(schoolId, userId));
    if (!raw) return null;
    return JSON.parse(raw) as StudentCareerQuestState;
  } catch {
    return null;
  }
}

export function writeLocalCareerQuestState(state: StudentCareerQuestState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(state.schoolId, state.userId),
      JSON.stringify(state)
    );
  } catch {
    // ignore storage quota errors
  }
}

export async function loadStudentCareerQuest(params: {
  schoolId: string;
  userId: string;
  studentId?: string;
  studentName: string;
  gradeLevel?: string;
}): Promise<StudentCareerQuestState> {
  const local = readLocalCareerQuestState(params.schoolId, params.userId);
  const client = getSupabaseClient();
  if (!client || !params.schoolId || !params.userId) {
    return local || createEmptyCareerQuestState(params);
  }

  try {
    const { data, error } = await client
      .from('student_career_quests')
      .select('*')
      .eq('school_id', params.schoolId)
      .eq('user_id', params.userId)
      .maybeSingle();

    if (error) {
      if (!isMissingCareerTableError(error)) {
        console.warn('[CareerQuest] Supabase load error:', error.message);
      }
      return local || createEmptyCareerQuestState(params);
    }

    if (!data) {
      return local || createEmptyCareerQuestState(params);
    }

    const remote: StudentCareerQuestState = {
      schoolId: data.school_id,
      userId: data.user_id,
      studentId: data.student_id || params.studentId,
      studentName: data.student_name || params.studentName,
      gradeLevel: data.grade_level || params.gradeLevel,
      activeCareerId: data.active_career_id || null,
      pinnedCareers: Array.isArray(data.pinned_careers) ? data.pinned_careers : [],
      vibeQuizAnswers: Array.isArray(data.vibe_quiz_answers) ? data.vibe_quiz_answers : [],
      vibeMatches: Array.isArray(data.vibe_matches) ? data.vibe_matches : [],
      completedQuestIds: Array.isArray(data.completed_quest_ids) ? data.completed_quest_ids : [],
      roleplayRunsCount: Number(data.roleplay_runs_count) || 0,
      latestRoleplaySkills: data.latest_roleplay_skills || undefined,
      coachMessages: Array.isArray(data.coach_messages) ? data.coach_messages : [],
      careerExp: Number(data.career_exp) || 0,
      unlockedTitles: Array.isArray(data.unlocked_titles) ? data.unlocked_titles : [],
      equippedCareerTitle: data.equipped_career_title || undefined,
      shareWithTeachersAndParents: data.share_with_teachers_parents !== false,
      lastReadinessPercent: Number(data.last_readiness_percent) || 0,
      lastReadinessLevel: data.last_readiness_level || 'Lv.1 นักสำรวจ',
      updatedAt: data.updated_at || new Date().toISOString(),
    };
    writeLocalCareerQuestState(remote);
    return remote;
  } catch {
    return local || createEmptyCareerQuestState(params);
  }
}

export async function saveStudentCareerQuest(
  state: StudentCareerQuestState
): Promise<void> {
  const nextState: StudentCareerQuestState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  writeLocalCareerQuestState(nextState);

  const client = getSupabaseClient();
  if (!client || !nextState.schoolId || !nextState.userId) return;

  try {
    const { error } = await client.from('student_career_quests').upsert(
      {
        school_id: nextState.schoolId,
        user_id: nextState.userId,
        student_id: nextState.studentId || null,
        student_name: nextState.studentName,
        grade_level: nextState.gradeLevel || null,
        active_career_id: nextState.activeCareerId,
        pinned_careers: nextState.pinnedCareers,
        vibe_quiz_answers: nextState.vibeQuizAnswers,
        vibe_matches: nextState.vibeMatches,
        completed_quest_ids: nextState.completedQuestIds,
        roleplay_runs_count: nextState.roleplayRunsCount,
        latest_roleplay_skills: nextState.latestRoleplaySkills || null,
        coach_messages: nextState.coachMessages.slice(-24),
        career_exp: nextState.careerExp,
        unlocked_titles: nextState.unlockedTitles,
        equipped_career_title: nextState.equippedCareerTitle || null,
        share_with_teachers_parents: nextState.shareWithTeachersAndParents,
        last_readiness_percent: nextState.lastReadinessPercent ?? 0,
        last_readiness_level: nextState.lastReadinessLevel || 'Lv.1 นักสำรวจ',
        updated_at: nextState.updatedAt,
      },
      { onConflict: 'school_id,user_id' }
    );
    if (error && !isMissingCareerTableError(error)) {
      console.warn('[CareerQuest] Supabase save error:', error.message);
    }
  } catch {
    // offline fallback already persisted locally
  }
}

export async function loadSchoolSharedCareerQuests(
  schoolId: string
): Promise<StudentCareerQuestState[]> {
  const results = new Map<string, StudentCareerQuestState>();

  if (typeof window !== 'undefined') {
    try {
      const prefix = `${LOCAL_STORAGE_KEY_PREFIX}${schoolId}_`;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as StudentCareerQuestState;
            if (parsed.shareWithTeachersAndParents !== false && parsed.activeCareerId) {
              results.set(parsed.userId, parsed);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const client = getSupabaseClient();
  if (!client || !schoolId) {
    return Array.from(results.values());
  }

  try {
    const { data, error } = await client
      .from('student_career_quests')
      .select('*')
      .eq('school_id', schoolId)
      .eq('share_with_teachers_parents', true)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        if (!row.active_career_id) return;
        results.set(row.user_id, {
          schoolId: row.school_id,
          userId: row.user_id,
          studentId: row.student_id || undefined,
          studentName: row.student_name || 'นักเรียน',
          gradeLevel: row.grade_level || undefined,
          activeCareerId: row.active_career_id || null,
          pinnedCareers: Array.isArray(row.pinned_careers) ? row.pinned_careers : [],
          vibeQuizAnswers: Array.isArray(row.vibe_quiz_answers) ? row.vibe_quiz_answers : [],
          vibeMatches: Array.isArray(row.vibe_matches) ? row.vibe_matches : [],
          completedQuestIds: Array.isArray(row.completed_quest_ids) ? row.completed_quest_ids : [],
          roleplayRunsCount: Number(row.roleplay_runs_count) || 0,
          latestRoleplaySkills: row.latest_roleplay_skills || undefined,
          coachMessages: [],
          careerExp: Number(row.career_exp) || 0,
          unlockedTitles: Array.isArray(row.unlocked_titles) ? row.unlocked_titles : [],
          equippedCareerTitle: row.equipped_career_title || undefined,
          shareWithTeachersAndParents: true,
          lastReadinessPercent: Number(row.last_readiness_percent) || 0,
          lastReadinessLevel: row.last_readiness_level || 'Lv.1 นักสำรวจ',
          updatedAt: row.updated_at || new Date().toISOString(),
        });
      });
    }
  } catch {
    // ignore
  }

  return Array.from(results.values());
}

export function findCareerForStudentState(
  state: StudentCareerQuestState | null | undefined,
  studentId?: string
): StudentCareerQuestState | null {
  if (state) return state;
  if (!studentId) return null;
  return null;
}

export function getSharedCareerSnapshotForStudent(
  schoolId: string,
  studentId: string
): StudentCareerQuestState | null {
  if (typeof window === 'undefined') return null;
  try {
    const prefix = `${LOCAL_STORAGE_KEY_PREFIX}${schoolId}_`;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StudentCareerQuestState;
      if (
        (parsed.studentId === studentId || parsed.userId === studentId) &&
        parsed.shareWithTeachersAndParents !== false &&
        parsed.activeCareerId
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export interface StudentAiContextPayload {
  gradeLevel: string;
  stage: CareerEducationStage;
  gpax: number | null;
  attendanceRate: number | null;
  portfolioCount: number;
  subjectGrades: { title: string; score: number; letter: string }[];
  lang: 'th' | 'en';
}

function normalizeAiCareer(raw: Record<string, unknown>, fallbackTitle: string): CareerProfile {
  const titleTh = String(raw.titleTh || fallbackTitle || 'อาชีพในฝัน');
  const titleEn = String(raw.titleEn || fallbackTitle || 'Dream Career');
  const id = `career-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const rawSubjects = Array.isArray(raw.keySubjects) ? raw.keySubjects : [];
  const rawQuests = Array.isArray(raw.quests) ? raw.quests : [];
  const roadmapText = String(raw.stageRoadmapTh || 'วางแผนฝึกทักษะพื้นฐานและสะสมผลงานต่อเนื่องในระดับชั้นของคุณ');
  const roadmapEnText = String(raw.stageRoadmapEn || 'Build core academic skills and collect portfolio artifacts.');

  return {
    id,
    titleTh,
    titleEn,
    category: (['medical', 'tech', 'education', 'creative', 'business', 'culinary', 'aviation', 'science', 'social'].includes(String(raw.category))
      ? String(raw.category)
      : 'tech') as CareerProfile['category'],
    taglineTh: String(raw.taglineTh || `เส้นทางสู่การเป็น ${titleTh} ที่ออกแบบเฉพาะตัวคุณ`),
    taglineEn: String(raw.taglineEn || `Personalized roadmap to become a ${titleEn}`),
    targetGpax: Number(raw.targetGpax) > 0 ? Math.min(4.0, Math.max(2.0, Number(raw.targetGpax))) : 3.0,
    unlockableTitleTh: String(raw.unlockableTitleTh || `ว่าที่ ${titleTh}`),
    unlockableTitleEn: String(raw.unlockableTitleEn || `Future ${titleEn}`),
    examFocusHighTh: String(raw.examFocusHighTh || raw.examFocusTh || 'TGAT, TPAT และ A-Level ในกลุ่มวิชาที่เกี่ยวข้องกับสาขานี้'),
    keySubjects: rawSubjects.slice(0, 4).map((s: Record<string, unknown>) => ({
      subjectKey: (['math', 'science', 'thai', 'english', 'social', 'computer', 'arts', 'health'].includes(String(s.subjectKey))
        ? String(s.subjectKey)
        : 'english') as CareerProfile['keySubjects'][number]['subjectKey'],
      labelTh: String(s.labelTh || 'วิชาหลัก'),
      labelEn: String(s.labelEn || 'Core Subject'),
      targetScore: Number(s.targetScore) > 0 ? Math.min(95, Math.max(60, Number(s.targetScore))) : 75,
      importance: s.importance === 'supporting' ? 'supporting' : 'core',
      reasonTh: String(s.reasonTh || 'ทักษะสำคัญที่ใช้จริงในสายอาชีพนี้'),
    })),
    roadmaps: {
      primary: roadmapText,
      middle: roadmapText,
      high: roadmapText,
    },
    roadmapsEn: {
      primary: roadmapEnText,
      middle: roadmapEnText,
      high: roadmapEnText,
    },
    quests: rawQuests.map((q: Record<string, unknown>, idx: number) => ({
      id: String(q.id || `${id}-q${idx + 1}`),
      tier: q.tier === 'portfolio' ? 'portfolio' : 'daily_weekly',
      titleTh: String(q.titleTh || 'ภารกิจฝึกทักษะอาชีพ'),
      titleEn: String(q.titleEn || 'Career Skill Quest'),
      descriptionTh: String(q.descriptionTh || 'ลงมือฝึกจริงเพื่อสะสมความพร้อมสู่สายอาชีพ'),
      targetAppTab: String(q.targetAppTab || (q.tier === 'portfolio' ? 'portfolio' : 'games')),
      expReward: Number(q.expReward) || (q.tier === 'portfolio' ? 140 : 80),
      gemsReward: Number(q.gemsReward) || (q.tier === 'portfolio' ? 40 : 20),
      skillTag: String(q.skillTag || titleTh),
      isAiGenerated: true,
    })),
    isCustomAi: true,
  };
}

export async function analyzeCareerWithGemini(
  careerQuery: string,
  studentContext: StudentAiContextPayload
): Promise<CareerProfile> {
  const data = await postCareerQuestAi<{ career?: Record<string, unknown> }>(
    '/api/career-quest/analyze-career',
    { careerQuery, studentContext }
  );
  return normalizeAiCareer(data.career || {}, careerQuery);
}

export async function runVibeQuizWithGemini(
  quizAnswers: CareerVibeQuizAnswer[],
  studentContext: StudentAiContextPayload
): Promise<CareerVibeMatch[]> {
  const data = await postCareerQuestAi<{ matches?: Array<Record<string, unknown>> }>(
    '/api/career-quest/vibe-quiz',
    { quizAnswers, studentContext }
  );
  const rawMatches = Array.isArray(data.matches) ? data.matches : [];
  return rawMatches.slice(0, 3).map((m: Record<string, unknown>, idx: number) => {
    const matchedPreset = POPULAR_CAREERS.find(
      (c) =>
        c.titleTh === String(m.titleTh || '') ||
        c.titleEn.toLowerCase() === String(m.titleEn || '').toLowerCase()
    );
    const career = matchedPreset
      ? {
          ...matchedPreset,
          roadmaps: {
            ...matchedPreset.roadmaps,
            [studentContext.stage]: String(m.stageRoadmapTh || matchedPreset.roadmaps[studentContext.stage]),
          },
        }
      : normalizeAiCareer(m, `อาชีพแนะนำ #${idx + 1}`);
    return {
      career,
      matchPercent: Math.min(99, Math.max(60, Number(m.matchPercent) || 88 - idx * 5)),
      reasonTh: String(m.reasonTh || 'สอดคล้องกับความถนัดและสไตล์การแก้ปัญหาของคุณ'),
      reasonEn: String(m.reasonEn || ''),
    };
  });
}

export async function generateQuestsWithGemini(
  careerTitleTh: string,
  studentContext: StudentAiContextPayload
) {
  const data = await postCareerQuestAi<{ quests?: Array<Record<string, unknown>> }>(
    '/api/career-quest/generate-quests',
    { careerTitleTh, studentContext }
  );
  const list = Array.isArray(data.quests) ? data.quests : [];
  return list.map((q: Record<string, unknown>, idx: number) => ({
    id: String(q.id || `ai-q-${Date.now()}-${idx}`),
    tier: (q.tier === 'portfolio' ? 'portfolio' : 'daily_weekly') as 'portfolio' | 'daily_weekly',
    titleTh: String(q.titleTh || 'ภารกิจสายอาชีพ'),
    titleEn: String(q.titleEn || 'Career Quest'),
    descriptionTh: String(q.descriptionTh || 'ฝึกทักษะเฉพาะสายอาชีพผ่านแอป'),
    targetAppTab: String(q.targetAppTab || (q.tier === 'portfolio' ? 'portfolio' : 'games')),
    expReward: Number(q.expReward) || (q.tier === 'portfolio' ? 140 : 80),
    gemsReward: Number(q.gemsReward) || (q.tier === 'portfolio' ? 40 : 20),
    skillTag: String(q.skillTag || careerTitleTh),
    isAiGenerated: true,
  }));
}

export async function nextRoleplayTurnWithGemini(params: {
  careerTitleTh: string;
  stage: CareerEducationStage;
  turnNumber: number;
  maxTurns: number;
  history: { role: string; text: string }[];
  chosenOptionText?: string;
}): Promise<CareerRoleplayTurn> {
  const data = await postCareerQuestAi<{ roleplay?: Record<string, unknown> }>(
    '/api/career-quest/roleplay',
    params
  );
  const rp = (data.roleplay || {}) as Record<string, unknown>;
  return {
    turnNumber: params.turnNumber,
    sceneTitleTh: String(rp.sceneTitleTh || `ด่านที่ ${params.turnNumber}`),
    situationTh: String(rp.situationTh || ''),
    npcDialogueTh: String(rp.npcDialogueTh || ''),
    turnFeedbackTh: rp.turnFeedbackTh ? String(rp.turnFeedbackTh) : undefined,
    chosenLabelTh: params.chosenOptionText,
    choices: Array.isArray(rp.choices)
      ? rp.choices.map((c: Record<string, unknown>, idx: number) => ({
          id: String(c.id || `choice-${idx}`),
          labelTh: String(c.labelTh || 'เลือกแนวทางนี้'),
          skillHint: c.skillHint ? String(c.skillHint) : undefined,
        }))
      : [],
    isCompleted: Boolean(rp.isCompleted),
    skillScores: rp.skillScores as CareerRoleplayTurn['skillScores'] | undefined,
    summaryFeedbackTh: rp.summaryFeedbackTh ? String(rp.summaryFeedbackTh) : undefined,
  };
}

export async function askCareerCoachWithGemini(params: {
  message: string;
  careerTitleTh: string;
  targetGpax: number;
  studentContext: StudentAiContextPayload;
  chatHistory: CareerCoachMessage[];
}): Promise<{ replyTh: string; actionStepsTh: string[]; encouragedTab?: string }> {
  const data = await postCareerQuestAi<{ coach?: Record<string, unknown> }>(
    '/api/career-quest/coach',
    {
      message: params.message,
      careerTitleTh: params.careerTitleTh,
      targetGpax: params.targetGpax,
      studentContext: params.studentContext,
      chatHistory: params.chatHistory.map((m) => ({
        sender: m.sender,
        text: m.textTh,
      })),
    }
  );
  const coach = (data.coach || {}) as Record<string, unknown>;
  return {
    replyTh: String(coach.replyTh || 'สู้ๆ นะครับ ค่อยๆ พัฒนาทีละวิชาไปพร้อมกัน!'),
    actionStepsTh: Array.isArray(coach.actionStepsTh)
      ? coach.actionStepsTh.map((s: unknown) => String(s))
      : [],
    encouragedTab: coach.encouragedTab ? String(coach.encouragedTab) : undefined,
  };
}
