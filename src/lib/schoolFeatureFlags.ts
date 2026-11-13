import { SchoolFeatureFlags, SchoolTier } from '../types';

const FEATURE_FLAGS_PREFIX = 'eduverse_feature_flags_v1_';

export const TIER_PRESETS: Record<SchoolTier, SchoolFeatureFlags> = {
  small: {
    tier: 'small',
    lms_classroom: true,
    central_exam_hub: true,
    executive_warning: true,
    ai_diagnostic: false,
    socratic_tutor: false,
    games_3d: false,
    subject_labs: true,
    realworld_quests: false,
    boss_raid: false,
    study_streak: false,
    hall_of_fame: false,
    infirmary: true,
  },
  standard: {
    tier: 'standard',
    lms_classroom: true,
    central_exam_hub: true,
    executive_warning: true,
    ai_diagnostic: true,
    socratic_tutor: true,
    games_3d: false,
    subject_labs: true,
    realworld_quests: true,
    boss_raid: true,
    study_streak: true,
    hall_of_fame: false,
    infirmary: true,
  },
  enterprise: {
    tier: 'enterprise',
    lms_classroom: true,
    central_exam_hub: true,
    executive_warning: true,
    ai_diagnostic: true,
    socratic_tutor: true,
    games_3d: true,
    subject_labs: true,
    realworld_quests: true,
    boss_raid: true,
    study_streak: true,
    hall_of_fame: true,
    infirmary: true,
  },
};

export const FEATURE_FLAG_LABELS: {
  key: keyof Omit<SchoolFeatureFlags, 'tier'>;
  labelTh: string;
  labelEn: string;
  tabIds: string[];
}[] = [
  { key: 'lms_classroom', labelTh: 'LMS ห้องเรียนออนไลน์', labelEn: 'LMS Classroom', tabIds: ['lms_classroom'] },
  { key: 'central_exam_hub', labelTh: 'คลังข้อสอบส่วนกลาง', labelEn: 'Central Exam Hub', tabIds: ['central_exam_hub'] },
  { key: 'executive_warning', labelTh: 'พยากรณ์กลุ่มเสี่ยงผู้บริหาร', labelEn: 'Early Warning Analytics', tabIds: ['executive_warning'] },
  { key: 'ai_diagnostic', labelTh: 'AI วิเคราะห์จุดอ่อนผู้เรียน', labelEn: 'AI Diagnostic', tabIds: ['ai_diagnostic'] },
  { key: 'socratic_tutor', labelTh: 'AI Socratic Tutor', labelEn: 'Socratic Tutor', tabIds: ['socratic_tutor'] },
  { key: 'games_3d', labelTh: 'เกมแข่งขัน 3D & EduArena', labelEn: '3D & EduArena Games', tabIds: ['games', 'edu_battle', 'edu_battle_3d'] },
  { key: 'subject_labs', labelTh: 'ห้องแล็บจำลองเสมือนจริง', labelEn: 'Subject Lab Sim', tabIds: ['subject_labs'] },
  { key: 'realworld_quests', labelTh: 'ภารกิจถ่ายภาพชีวิตจริง', labelEn: 'Snap & Solve Quests', tabIds: ['realworld_quests'] },
  { key: 'boss_raid', labelTh: 'บอสเรดตอบปัญหาแบบทีม', labelEn: 'Co-op Boss Raid', tabIds: ['boss_raid'] },
  { key: 'study_streak', labelTh: 'Study Streak & Perks', labelEn: 'Study Streak Pass', tabIds: ['study_streak'] },
  { key: 'hall_of_fame', labelTh: 'หอเกียรติยศ 3D (Hall of Fame)', labelEn: '3D Hall of Fame', tabIds: ['hall_of_fame'] },
  { key: 'infirmary', labelTh: 'ห้องพยาบาล & สุขภาพ', labelEn: 'School Infirmary', tabIds: ['infirmary'] },
];

export const getSchoolFeatureFlags = (
  schoolId: string,
  fallbackTier: SchoolTier = 'enterprise'
): SchoolFeatureFlags => {
  if (typeof window === 'undefined') return { ...TIER_PRESETS[fallbackTier] };
  try {
    const raw = window.localStorage.getItem(`${FEATURE_FLAGS_PREFIX}${schoolId}`);
    if (!raw) return { ...TIER_PRESETS[fallbackTier] };
    const parsed = JSON.parse(raw) as Partial<SchoolFeatureFlags>;
    const tier: SchoolTier = parsed.tier && TIER_PRESETS[parsed.tier] ? parsed.tier : fallbackTier;
    return {
      ...TIER_PRESETS[tier],
      ...parsed,
      tier,
    };
  } catch {
    return { ...TIER_PRESETS[fallbackTier] };
  }
};

export const saveSchoolFeatureFlags = (schoolId: string, flags: SchoolFeatureFlags): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${FEATURE_FLAGS_PREFIX}${schoolId}`, JSON.stringify(flags));
  } catch {
    // ignore storage errors
  }
};

export const isTabEnabledByFeatureFlags = (tabId: string, flags?: SchoolFeatureFlags): boolean => {
  if (!flags) return true;
  const matched = FEATURE_FLAG_LABELS.find((item) => item.tabIds.includes(tabId));
  if (!matched) return true;
  return Boolean(flags[matched.key]);
};
