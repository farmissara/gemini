import type {
  AppProgramMode,
  PackageFeatureCategoryId,
  PackageLevelConfig,
  PackageLevelId,
  SchoolFeatureFlagKey,
  SchoolFeatureFlags,
  SchoolTier,
  UserRole,
} from '../types';
import { DEFAULT_SELFIE_RETENTION_MINUTES, normalizeSelfieRetentionMinutes } from './selfieCleanupLogic';

const FEATURE_FLAGS_PREFIX = 'eduverse_feature_flags_v1_';
const PACKAGE_CATALOG_STORAGE_KEY = 'eduverse_package_catalog_v1';

export interface FeatureFlagDescriptor {
  key: SchoolFeatureFlagKey;
  category: PackageFeatureCategoryId;
  minLevel: PackageLevelId;
  isAiModule?: boolean;
  labelTh: string;
  labelEn: string;
  descTh: string;
  tabIds: string[];
  programModes?: AppProgramMode[];
}

export const PACKAGE_CATEGORY_META: {
  id: PackageFeatureCategoryId;
  labelTh: string;
  labelEn: string;
}[] = [
  { id: 'academics', labelTh: 'งานวิชาการ & ทะเบียนหลัก', labelEn: 'Core Academics & SIS' },
  { id: 'student_care', labelTh: 'เช็คชื่อ กิจการ & สุขภาพ', labelEn: 'Attendance, Care & Health' },
  { id: 'finance_portal', labelTh: 'แฟ้มผลงาน & พอร์ทัลผู้ปกครอง', labelEn: 'Portfolio & Portal' },
  { id: 'learning_games', labelTh: 'LMS คลังข้อสอบ เกม & แล็บ 3D', labelEn: 'LMS, Exams, Games & Labs' },
  { id: 'ai_suite', labelTh: 'ชุดปัญญาประดิษฐ์ (AI Suite)', labelEn: 'AI Intelligence Suite' },
];

export const AI_FEATURE_FLAG_KEYS: SchoolFeatureFlagKey[] = [
  'ai_diagnostic',
  'socratic_tutor',
  'realworld_quests',
  'career_quest',
];

export const FEATURE_FLAG_LABELS: FeatureFlagDescriptor[] = [
  // Category 1: Core Academics & SIS (Level 1)
  {
    key: 'students',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'ทะเบียนนักเรียน (DMC & Profile)',
    labelEn: 'Student Directory',
    descTh: 'จัดเก็บประวัตินักเรียน สถานะศึกษา นำเข้า/ส่งออก DMC',
    tabIds: ['students'],
  },
  {
    key: 'teachers',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'บุคลากรครู & แฟ้ม ว.PA',
    labelEn: 'Faculty & Staff',
    descTh: 'ทะเบียนครู โครงสร้างบริหาร และผลงาน ว.PA',
    tabIds: ['teachers'],
  },
  {
    key: 'courses',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'รายวิชา & หลักสูตร',
    labelEn: 'Courses & Curriculum',
    descTh: 'จัดการรายวิชา หน่วยกิต และการลงทะเบียนเรียน',
    tabIds: ['courses'],
  },
  {
    key: 'timetable',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'ตารางเรียน ตารางสอน & ปฏิทิน',
    labelEn: 'Timetable & Calendar',
    descTh: 'จัดตารางสอน วันหยุดราชการ และซิงค์ .ics',
    tabIds: ['timetable'],
  },
  {
    key: 'gradebook',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'บันทึกคะแนน ปพ.5 & ตัดเกรด ปพ.1',
    labelEn: 'Gradebook & Transcripts',
    descTh: 'กรอกคะแนน เกรดเฉลี่ย GPA/GPAX เอกสาร ปพ. และสมุดบันทึกพัฒนาคุณภาพผู้เรียน',
    tabIds: ['gradebook', 'student_development_book', 'qualitative_summary'],
  },
  {
    key: 'homework',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'การบ้าน & ส่งงานออนไลน์',
    labelEn: 'Homework & Tasks',
    descTh: 'สั่งการบ้าน ตรวจงาน และติดตามงานค้างส่ง',
    tabIds: ['homework'],
  },
  {
    key: 'announcements',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'ประกาศข่าวสาร & หนังสือยินยอม',
    labelEn: 'Announcements & Consent',
    descTh: 'ประกาศข่าวสารโรงเรียนและแบบฟอร์มขออนุญาตผู้ปกครอง',
    tabIds: ['announcements'],
  },
  {
    key: 'student_id_cards',
    category: 'academics',
    minLevel: 'level_1',
    labelTh: 'บัตรนักเรียนดิจิทัล & QR',
    labelEn: 'Digital Student ID',
    descTh: 'บัตรประจำตัวนักเรียนพร้อม QR Code ประจำตัว',
    tabIds: ['student_id_cards'],
  },

  // Category 2: Attendance, Care & Health (Level 2)
  {
    key: 'attendance',
    category: 'student_care',
    minLevel: 'level_2',
    labelTh: 'สแกนเช็คชื่อหน้าประตู (QR/RFID)',
    labelEn: 'Gate QR Check-in',
    descTh: 'สแกนเข้า-ออกโรงเรียน รายงานมาสาย และจุดสแกนกลุ่ม',
    tabIds: ['attendance'],
  },
  {
    key: 'mobile_checkin',
    category: 'student_care',
    minLevel: 'level_2',
    labelTh: 'เช็คชื่อมือถือ GPS & ยื่นใบลา',
    labelEn: 'Mobile Check-in & Leave',
    descTh: 'เช็คอินเข้าเรียนรายคาบ ตรวจพิกัด GPS และอนุมัติใบลา',
    tabIds: ['mobile_checkin'],
  },
  {
    key: 'behavior_sdq',
    category: 'student_care',
    minLevel: 'level_2',
    labelTh: 'ระบบดูแลช่วยเหลือ & SDQ สพฐ.',
    labelEn: 'Student Care & SDQ',
    descTh: 'บันทึกพฤติกรรม คะแนนความดี/วินัย และประเมิน SDQ',
    tabIds: ['behavior_sdq'],
  },
  {
    key: 'infirmary',
    category: 'student_care',
    minLevel: 'level_2',
    labelTh: 'ห้องพยาบาล & เวชระเบียน',
    labelEn: 'School Infirmary',
    descTh: 'บันทึกการเข้าห้องพยาบาล จ่ายยา และประวัติแพ้ยา',
    tabIds: ['infirmary'],
  },

  // Category 3: Portfolio & Parent Portal (Level 2)
  {
    key: 'portfolio',
    category: 'finance_portal',
    minLevel: 'level_2',
    labelTh: 'แฟ้มผลงานดิจิทัล (TCAS Portfolio)',
    labelEn: 'Digital Portfolio',
    descTh: 'สะสมเกียรติบัตร โครงงาน และสร้างแฟ้มผลงานนักเรียน',
    tabIds: ['portfolio'],
  },
  {
    key: 'parent_portal',
    category: 'finance_portal',
    minLevel: 'level_2',
    labelTh: 'พอร์ทัลผู้ปกครอง (Parent Portal)',
    labelEn: 'Parent Portal Mode',
    descTh: 'หน้าติดตามเวลาเรียน เกรด การลา และประกาศสำหรับผู้ปกครอง',
    tabIds: [],
    programModes: ['parent_portal'],
  },

  // Category 4: LMS, Central Exams, Analytics, Games & 3D Labs (Level 3)
  {
    key: 'lms_classroom',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'LMS ห้องเรียนออนไลน์เสมือนจริง',
    labelEn: 'Virtual LMS Classroom',
    descTh: 'บทเรียนออนไลน์ คลังสื่อ และแบบทดสอบในชั้นเรียน',
    tabIds: ['lms_classroom'],
    programModes: ['lms_classroom'],
  },
  {
    key: 'central_exam_hub',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'คลังข้อสอบกลางมาตรฐาน 8 สาระ',
    labelEn: 'Central Exam Hub',
    descTh: 'คลังข้อสอบมาตรฐาน O-NET / A-Level ส่งคะแนนเข้า ปพ.5',
    tabIds: ['central_exam_hub'],
  },
  {
    key: 'executive_warning',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'วิเคราะห์ & พยากรณ์กลุ่มเสี่ยงผู้บริหาร',
    labelEn: 'Early Warning Analytics',
    descTh: 'ระบบเฝ้าระวังนักเรียนเสี่ยงออกกลางคันหรือเวลาเรียนไม่ครบ',
    tabIds: ['executive_warning'],
  },
  {
    key: 'subject_labs',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'ห้องแล็บจำลองเสมือนจริง (Subject Labs)',
    labelEn: 'Subject Lab Sim',
    descTh: 'แล็บทดลองวิทย์ คณิต ฟิสิกส์ เคมี ชีวะ แบบโต้ตอบ',
    tabIds: ['subject_labs'],
  },
  {
    key: 'games_3d',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'เกมแข่งขัน 3D & EduArena Arcade',
    labelEn: '3D & EduArena Games',
    descTh: 'เกมตอบคำถาม 3 มิติ และมินิเกม 8 สาระการเรียนรู้',
    tabIds: ['games', 'edu_battle', 'edu_battle_3d'],
  },
  {
    key: 'boss_raid',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'ภารกิจบอสเรดตอบปัญหาแบบทีม',
    labelEn: 'Co-op Boss Raid',
    descTh: 'กิจกรรมร่วมมือพิชิตโจทย์ท้าทายพร้อมระบบปาร์ตี้ห้องเรียน',
    tabIds: ['boss_raid'],
  },
  {
    key: 'study_streak',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'Study Streak & ภารกิจการเรียน',
    labelEn: 'Study Streak Pass',
    descTh: 'ระบบสะสมวินัยการเรียนต่อเนื่อง EXP และของรางวัล',
    tabIds: ['study_streak'],
  },
  {
    key: 'hall_of_fame',
    category: 'learning_games',
    minLevel: 'level_3',
    labelTh: 'หอเกียรติยศ 3D (Hall of Fame)',
    labelEn: '3D Hall of Fame',
    descTh: 'จัดแสดงผลงานดีเด่นและเกียรติบัตรนักเรียนแบบ 3 มิติ',
    tabIds: ['hall_of_fame'],
  },

  // Category 5: AI Intelligence Suite (Level 4)
  {
    key: 'ai_diagnostic',
    category: 'ai_suite',
    minLevel: 'level_4',
    isAiModule: true,
    labelTh: 'AI วิเคราะห์จุดอ่อน & เสริมทักษะ',
    labelEn: 'AI Skill Diagnostics',
    descTh: 'วิเคราะห์ช่องว่างการเรียนรู้รายบุคคลและแนะนำแนวทางซ่อมเสริม',
    tabIds: ['ai_diagnostic'],
  },
  {
    key: 'socratic_tutor',
    category: 'ai_suite',
    minLevel: 'level_4',
    isAiModule: true,
    labelTh: 'AI Socratic Tutor (ติวเตอร์ถาม-ตอบ)',
    labelEn: 'AI Socratic Tutor',
    descTh: 'ผู้ช่วยสอนตั้งคำถามนำคิดทีละขั้นไม่บอกคำตอบลัด',
    tabIds: ['socratic_tutor'],
  },
  {
    key: 'realworld_quests',
    category: 'ai_suite',
    minLevel: 'level_4',
    isAiModule: true,
    labelTh: 'AI เควสต์การเรียนรู้จากภาพถ่าย',
    labelEn: 'Snap & Solve Quests',
    descTh: 'ถ่ายภาพโจทย์หรือสิ่งรอบตัวเพื่อถอดความรู้สู่ภารกิจจริง',
    tabIds: ['realworld_quests'],
  },
  {
    key: 'career_quest',
    category: 'ai_suite',
    minLevel: 'level_4',
    isAiModule: true,
    labelTh: 'Career Quest AI (เส้นทางสู่อาชีพในฝัน)',
    labelEn: 'Career Quest AI',
    descTh: 'Vibe Quiz 5 ข้อ การ์ดความพร้อมเทียบเกรดจริง Role-Play และโค้ชอาชีพ',
    tabIds: ['career_quest'],
  },
];

const LEVEL_1_FEATURES: Record<SchoolFeatureFlagKey, boolean> = {
  students: true,
  teachers: true,
  courses: true,
  timetable: true,
  gradebook: true,
  homework: true,
  announcements: true,
  student_id_cards: true,
  attendance: false,
  mobile_checkin: false,
  behavior_sdq: false,
  infirmary: false,
  portfolio: false,
  parent_portal: false,
  lms_classroom: false,
  central_exam_hub: false,
  executive_warning: false,
  subject_labs: false,
  games_3d: false,
  boss_raid: false,
  study_streak: false,
  hall_of_fame: false,
  ai_diagnostic: false,
  socratic_tutor: false,
  realworld_quests: false,
  career_quest: false,
};

const LEVEL_2_FEATURES: Record<SchoolFeatureFlagKey, boolean> = {
  ...LEVEL_1_FEATURES,
  attendance: true,
  mobile_checkin: true,
  behavior_sdq: true,
  infirmary: true,
  portfolio: true,
  parent_portal: true,
};

const LEVEL_3_FEATURES: Record<SchoolFeatureFlagKey, boolean> = {
  ...LEVEL_2_FEATURES,
  lms_classroom: true,
  central_exam_hub: true,
  executive_warning: true,
  subject_labs: true,
  games_3d: true,
  boss_raid: true,
  study_streak: true,
  hall_of_fame: true,
};

const LEVEL_4_FEATURES: Record<SchoolFeatureFlagKey, boolean> = {
  ...LEVEL_3_FEATURES,
  ai_diagnostic: true,
  socratic_tutor: true,
  realworld_quests: true,
  career_quest: true,
};

export const DEFAULT_PACKAGE_CATALOG: PackageLevelConfig[] = [
  {
    id: 'level_1',
    levelNumber: 1,
    nameTh: 'Level 1 · Starter Core',
    nameEn: 'Level 1 · Starter Core',
    audienceTh: 'สำหรับโรงเรียนขนาดเล็ก / เริ่มต้นงานวิชาการดิจิทัล',
    audienceEn: 'For small schools starting core SIS & grading',
    descriptionTh: 'ครบชุดงานทะเบียนนักเรียน ครู รายวิชา ตารางสอน ปพ.5-ปพ.1 การบ้าน บัตรนักเรียน และประกาศ',
    yearlyPriceThb: 4900,
    monthlyPriceThb: 490,
    maxStudents: 500,
    isAvailable: true,
    features: { ...LEVEL_1_FEATURES },
  },
  {
    id: 'level_2',
    levelNumber: 2,
    nameTh: 'Level 2 · Standard Campus',
    nameEn: 'Level 2 · Standard Campus',
    audienceTh: 'สำหรับโรงเรียนที่ต้องการระบบเช็คชื่อ ดูแลช่วยเหลือ & พอร์ทัลผู้ปกครอง',
    audienceEn: 'For growing schools adding care, GPS check-in & parent portal',
    descriptionTh: 'เพิ่มระบบเช็คชื่อ QR/GPS มือถือ ใบลา ห้องพยาบาล SDQ แฟ้มผลงาน และพอร์ทัลผู้ปกครอง',
    yearlyPriceThb: 11900,
    monthlyPriceThb: 1190,
    maxStudents: 1500,
    isAvailable: true,
    features: { ...LEVEL_2_FEATURES },
  },
  {
    id: 'level_3',
    levelNumber: 3,
    nameTh: 'Level 3 · Pro Learning & Arcade',
    nameEn: 'Level 3 · Pro Learning & Arcade',
    audienceTh: 'สำหรับโรงเรียนยุคใหม่เน้น Active Learning & แล็บจำลอง',
    audienceEn: 'For interactive classrooms, LMS, exams & 3D labs',
    descriptionTh: 'เพิ่ม LMS ห้องเรียนออนไลน์ คลังข้อสอบ 8 สาระ พยากรณ์กลุ่มเสี่ยง เกมแข่งขัน 3D และห้องแล็บเสมือนจริง',
    yearlyPriceThb: 19900,
    monthlyPriceThb: 1990,
    maxStudents: 3000,
    isAvailable: true,
    highlightBadgeTh: 'ยอดนิยม',
    features: { ...LEVEL_3_FEATURES },
  },
  {
    id: 'level_4',
    levelNumber: 4,
    nameTh: 'Level 4 · Enterprise AI Complete',
    nameEn: 'Level 4 · Enterprise AI Complete',
    audienceTh: 'สำหรับโรงเรียนชั้นนำครบทุกโมดูล + ชุด AI เต็มรูปแบบ',
    audienceEn: 'All-inclusive campus suite with Career Quest AI & Tutors',
    descriptionTh: 'เปิดใช้ทุกโมดูล 100% พร้อม Career Quest AI, Socratic Tutor, AI Diagnostic และ Snap & Solve เต็มระบบ',
    yearlyPriceThb: 29900,
    monthlyPriceThb: 2990,
    maxStudents: 5000,
    isAvailable: true,
    highlightBadgeTh: 'ครบทุกฟีเจอร์',
    features: { ...LEVEL_4_FEATURES },
  },
];

export function normalizeSchoolTier(tier?: SchoolTier | string | null): PackageLevelId {
  if (tier === 'level_1' || tier === 'small') return 'level_1';
  if (tier === 'level_2' || tier === 'standard') return 'level_2';
  if (tier === 'level_3') return 'level_3';
  if (tier === 'level_4' || tier === 'enterprise') return 'level_4';
  return 'level_4';
}

export function getPackageLevelLabel(
  tier: SchoolTier | string | undefined,
  lang: 'th' | 'en' = 'th',
  catalog: PackageLevelConfig[] = getStoredPackageCatalog()
): string {
  const normalized = normalizeSchoolTier(tier);
  const found = catalog.find((item) => item.id === normalized);
  if (found) return lang === 'th' ? found.nameTh : found.nameEn;
  return normalized.toUpperCase();
}

export function getStoredPackageCatalog(): PackageLevelConfig[] {
  if (typeof window === 'undefined') return DEFAULT_PACKAGE_CATALOG;
  try {
    const raw = window.localStorage.getItem(PACKAGE_CATALOG_STORAGE_KEY);
    if (!raw) return DEFAULT_PACKAGE_CATALOG;
    const parsed = JSON.parse(raw) as PackageLevelConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PACKAGE_CATALOG;
    return DEFAULT_PACKAGE_CATALOG.map((def) => {
      const override = parsed.find((p) => p.id === def.id);
      if (!override) return def;
      return {
        ...def,
        ...override,
        features: {
          ...def.features,
          ...(override.features || {}),
        },
      };
    });
  } catch {
    return DEFAULT_PACKAGE_CATALOG;
  }
}

export function cachePackageCatalog(catalog: PackageLevelConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PACKAGE_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // ignore storage quota errors
  }
}

export function buildFlagsFromLevel(
  tier: SchoolTier,
  catalog: PackageLevelConfig[] = getStoredPackageCatalog(),
  allowStudentsAi?: boolean,
  autoDeleteSelfiesAfterCheckout: boolean = true,
  selfieRetentionAfterCheckoutMinutes: number = DEFAULT_SELFIE_RETENTION_MINUTES
): SchoolFeatureFlags {
  const levelId = normalizeSchoolTier(tier);
  const pkg = catalog.find((item) => item.id === levelId) || DEFAULT_PACKAGE_CATALOG.find((item) => item.id === levelId)!;
  const anyAiEnabled = AI_FEATURE_FLAG_KEYS.some((k) => Boolean(pkg.features[k]));
  return {
    ...pkg.features,
    tier: levelId,
    allowStudentsAi: allowStudentsAi !== undefined ? allowStudentsAi : anyAiEnabled,
    autoDeleteSelfiesAfterCheckout,
    selfieRetentionAfterCheckoutMinutes: normalizeSelfieRetentionMinutes(selfieRetentionAfterCheckoutMinutes),
  };
}

export const TIER_PRESETS: Record<SchoolTier, SchoolFeatureFlags> = {
  level_1: { ...LEVEL_1_FEATURES, tier: 'level_1', allowStudentsAi: false, autoDeleteSelfiesAfterCheckout: true, selfieRetentionAfterCheckoutMinutes: DEFAULT_SELFIE_RETENTION_MINUTES },
  level_2: { ...LEVEL_2_FEATURES, tier: 'level_2', allowStudentsAi: false, autoDeleteSelfiesAfterCheckout: true, selfieRetentionAfterCheckoutMinutes: DEFAULT_SELFIE_RETENTION_MINUTES },
  level_3: { ...LEVEL_3_FEATURES, tier: 'level_3', allowStudentsAi: false, autoDeleteSelfiesAfterCheckout: true, selfieRetentionAfterCheckoutMinutes: DEFAULT_SELFIE_RETENTION_MINUTES },
  level_4: { ...LEVEL_4_FEATURES, tier: 'level_4', allowStudentsAi: true, autoDeleteSelfiesAfterCheckout: true, selfieRetentionAfterCheckoutMinutes: DEFAULT_SELFIE_RETENTION_MINUTES },
  small: { ...LEVEL_1_FEATURES, tier: 'level_1', allowStudentsAi: false, autoDeleteSelfiesAfterCheckout: true, selfieRetentionAfterCheckoutMinutes: DEFAULT_SELFIE_RETENTION_MINUTES },
  standard: { ...LEVEL_2_FEATURES, tier: 'level_2', allowStudentsAi: false, autoDeleteSelfiesAfterCheckout: true, selfieRetentionAfterCheckoutMinutes: DEFAULT_SELFIE_RETENTION_MINUTES },
  enterprise: { ...LEVEL_4_FEATURES, tier: 'level_4', allowStudentsAi: true, autoDeleteSelfiesAfterCheckout: true, selfieRetentionAfterCheckoutMinutes: DEFAULT_SELFIE_RETENTION_MINUTES },
};

export const getSchoolFeatureFlags = (
  schoolId: string,
  fallbackTier: SchoolTier = 'enterprise'
): SchoolFeatureFlags => {
  const catalog = getStoredPackageCatalog();
  const baseDefault = buildFlagsFromLevel(fallbackTier, catalog);
  if (typeof window === 'undefined') return baseDefault;
  try {
    const raw = window.localStorage.getItem(`${FEATURE_FLAGS_PREFIX}${schoolId}`);
    if (!raw) return baseDefault;
    const parsed = JSON.parse(raw) as Partial<SchoolFeatureFlags>;
    const normalizedTier = normalizeSchoolTier(parsed.tier || fallbackTier);
    const tierPreset = buildFlagsFromLevel(normalizedTier, catalog);
    return {
      ...tierPreset,
      ...parsed,
      tier: normalizedTier,
      allowStudentsAi:
        typeof parsed.allowStudentsAi === 'boolean'
          ? parsed.allowStudentsAi
          : tierPreset.allowStudentsAi,
      autoDeleteSelfiesAfterCheckout:
        typeof parsed.autoDeleteSelfiesAfterCheckout === 'boolean'
          ? parsed.autoDeleteSelfiesAfterCheckout
          : tierPreset.autoDeleteSelfiesAfterCheckout,
      selfieRetentionAfterCheckoutMinutes:
        parsed.selfieRetentionAfterCheckoutMinutes !== undefined
          ? normalizeSelfieRetentionMinutes(parsed.selfieRetentionAfterCheckoutMinutes)
          : tierPreset.selfieRetentionAfterCheckoutMinutes,
    };
  } catch {
    return baseDefault;
  }
};

export const saveSchoolFeatureFlags = (schoolId: string, flags: SchoolFeatureFlags): void => {
  if (typeof window === 'undefined') return;
  try {
    const normalized: SchoolFeatureFlags = {
      ...flags,
      tier: normalizeSchoolTier(flags.tier),
      autoDeleteSelfiesAfterCheckout: flags.autoDeleteSelfiesAfterCheckout !== false,
      selfieRetentionAfterCheckoutMinutes: normalizeSelfieRetentionMinutes(
        flags.selfieRetentionAfterCheckoutMinutes
      ),
    };
    window.localStorage.setItem(`${FEATURE_FLAGS_PREFIX}${schoolId}`, JSON.stringify(normalized));
  } catch {
    // ignore storage errors
  }
};

// Tabs that are always accessible to keep navigation and Super Admin controls working
const PROTECTED_SYSTEM_TABS = new Set<string>([
  'dashboard',
  'system_settings',
  'super_admin_console',
  'super_admin_approvals',
  'super_admin_schools',
  'super_admin_packages',
  'super_admin_promotions',
  'super_admin_permissions',
  'super_admin_central_exams',
  'super_admin_exam_payment',
  'super_admin_audit',
  'super_admin_backup',
  'admin_superadmin_desk',
  'school_gps',
  'school_permissions',
  'admin_student_accounts',
  'admin_saas_audit',
  'realtime_daily',
  'executive_monitor',
  'obec_executive_dashboard',
  'pp6_executive_dashboard',
  'report_insights',
]);

export const isTabEnabledByFeatureFlags = (
  tabId: string,
  flags?: SchoolFeatureFlags,
  userRole?: UserRole
): boolean => {
  if (!flags) return true;
  if (PROTECTED_SYSTEM_TABS.has(tabId)) return true;

  const matched = FEATURE_FLAG_LABELS.find((item) => item.tabIds.includes(tabId));
  if (!matched) return true;

  const isModuleEnabled = flags[matched.key] !== false;
  if (!isModuleEnabled) return false;

  // Enforce School Admin toggle for student AI usage
  if (matched.isAiModule && userRole === 'student' && flags.allowStudentsAi === false) {
    return false;
  }

  return true;
};

export const isProgramModeEnabledByFeatureFlags = (
  mode: AppProgramMode,
  flags?: SchoolFeatureFlags
): boolean => {
  if (!flags) return true;
  if (mode === 'lms_classroom') return flags.lms_classroom !== false;
  if (mode === 'parent_portal') return flags.parent_portal !== false;
  return true;
};

export const getRequiredPackageLevelForTab = (tabId: string): PackageLevelId | null => {
  const matched = FEATURE_FLAG_LABELS.find((item) => item.tabIds.includes(tabId));
  return matched ? matched.minLevel : null;
};

export const countEnabledFeatures = (features: Record<SchoolFeatureFlagKey, boolean>): number => {
  return FEATURE_FLAG_LABELS.reduce((sum, item) => sum + (features[item.key] ? 1 : 0), 0);
};
