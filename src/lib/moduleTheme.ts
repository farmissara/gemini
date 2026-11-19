import type { NavCategoryId, NavTab } from '../components/layout/Sidebar';

export type ModuleTone = 'tone-1' | 'tone-2' | 'tone-3' | 'tone-4' | 'tone-5' | 'tone-6' | 'tone-7';

/**
 * Canonical Semantic Module Identity Tones
 * - tone-1 (Blue): ทะเบียน & ตารางเรียน (Core Directory & Schedule)
 * - tone-2 (Emerald): วัดผล สพฐ. & การเรียน (Assessment, Grades & OBEC)
 * - tone-3 (Amber): ศูนย์ควบคุมแม่ข่าย & เตือนภัย (Master Console & Early Warning)
 * - tone-4 (Rose): เช็กชื่อ กิจการ & สุขภาพ (Attendance, Care, Health & ID)
 * - tone-5 (Violet): AI & นวัตกรรมการเรียนรู้ (AI & Interactive Learning)
 * - tone-6 (Cyan): การเงิน & การสื่อสาร (Finance & Communications)
 * - tone-7 (Slate): ตั้งค่าระบบ & ประสานงาน (Settings, Permissions & Desk)
 */
export const MODULE_TONE_MAP: Record<NavTab, ModuleTone> = {
  // tone-1: Core Directory & Schedule
  dashboard: 'tone-1',
  executive_monitor: 'tone-1',
  students: 'tone-1',
  teachers: 'tone-1',
  courses: 'tone-1',
  timetable: 'tone-1',

  // tone-2: Assessment, OBEC Analytics & Tasks
  gradebook: 'tone-2',
  student_development_book: 'tone-2',
  qualitative_summary: 'tone-2',
  obec_executive_dashboard: 'tone-2',
  pp6_executive_dashboard: 'tone-2',
  homework: 'tone-2',
  central_exam_hub: 'tone-2',

  // tone-3: Master Console & Early Warning
  executive_warning: 'tone-3',
  super_admin_console: 'tone-3',

  // tone-4: Attendance, Student Care, Health & Digital ID
  attendance: 'tone-4',
  mobile_checkin: 'tone-4',
  student_id_cards: 'tone-4',
  behavior_sdq: 'tone-4',
  infirmary: 'tone-4',

  // tone-5: AI & Learning Innovation
  career_quest: 'tone-5',
  socratic_tutor: 'tone-5',
  ai_diagnostic: 'tone-5',
  subject_labs: 'tone-5',
  realworld_quests: 'tone-5',
  study_streak: 'tone-5',
  boss_raid: 'tone-5',
  games: 'tone-5',
  portfolio: 'tone-5',
  hall_of_fame: 'tone-5',

  // tone-6: Finance & Announcements
  billing: 'tone-6',
  announcements: 'tone-6',

  // tone-7: System Settings & Coordination Desk
  school_gps: 'tone-7',
  school_permissions: 'tone-7',
  admin_line_control: 'tone-7',
  admin_student_accounts: 'tone-7',
  admin_saas_audit: 'tone-7',
  admin_superadmin_desk: 'tone-7',
  system_settings: 'tone-7',
};

export interface ModuleGroupMeta {
  tone: ModuleTone;
  labelTh: string;
  labelEn: string;
}

export const TONE_GROUP_META: Record<ModuleTone, ModuleGroupMeta> = {
  'tone-1': {
    tone: 'tone-1',
    labelTh: 'ทะเบียน & ตารางเรียน',
    labelEn: 'Directory & Schedule',
  },
  'tone-2': {
    tone: 'tone-2',
    labelTh: 'วัดผล สพฐ. & การสอน',
    labelEn: 'Assessment & OBEC',
  },
  'tone-3': {
    tone: 'tone-3',
    labelTh: 'ศูนย์ควบคุมแม่ข่าย',
    labelEn: 'Master Console',
  },
  'tone-4': {
    tone: 'tone-4',
    labelTh: 'เช็กชื่อ กิจการ & สุขภาพ',
    labelEn: 'Attendance, Care & Health',
  },
  'tone-5': {
    tone: 'tone-5',
    labelTh: 'AI & นวัตกรรมการเรียนรู้',
    labelEn: 'AI & Learning Innovation',
  },
  'tone-6': {
    tone: 'tone-6',
    labelTh: 'การเงิน & การสื่อสาร',
    labelEn: 'Finance & Comms',
  },
  'tone-7': {
    tone: 'tone-7',
    labelTh: 'ตั้งค่าระบบ & ประสานงาน',
    labelEn: 'Settings & Desk',
  },
};

export const CATEGORY_TONE_MAP: Record<NavCategoryId, ModuleTone> = {
  super_admin: 'tone-3',
  academics: 'tone-1',
  assessment: 'tone-2',
  student_care: 'tone-4',
  innovation: 'tone-5',
  finance: 'tone-6',
  administration: 'tone-7',
};

export function getModuleTone(tab: NavTab): ModuleTone {
  return MODULE_TONE_MAP[tab] ?? 'tone-1';
}

export function getModuleGroupMeta(tab: NavTab): ModuleGroupMeta {
  return TONE_GROUP_META[getModuleTone(tab)];
}

export function getCategoryTone(categoryId: NavCategoryId): ModuleTone {
  return CATEGORY_TONE_MAP[categoryId] ?? 'tone-1';
}

export function getCategoryGroupMeta(categoryId: NavCategoryId): ModuleGroupMeta {
  return TONE_GROUP_META[getCategoryTone(categoryId)];
}
