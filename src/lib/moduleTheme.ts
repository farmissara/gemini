import type { NavCategoryId, NavTab } from '../components/layout/Sidebar';

export type ModuleTone = 'tone-1' | 'tone-2' | 'tone-3' | 'tone-4' | 'tone-5' | 'tone-6';

/**
 * Canonical Semantic Module Identity Tones
 * - tone-1 (Blue/Indigo): ทะเบียน & โครงสร้างหลัก (Core Directory & Academics)
 * - tone-2 (Emerald/Green): การเรียน วัดผล & เช็กชื่อ (Assessment, Attendance & Tasks)
 * - tone-3 (Amber): ดูแลช่วยเหลือ เตือนภัย & ศูนย์แม่ข่าย (Care, Early Warning & Master)
 * - tone-4 (Rose/Crimson): สุขภาพ & ความปลอดภัย (Health & Digital ID)
 * - tone-5 (Violet/Purple): AI & นวัตกรรมการเรียนรู้ (AI & Interactive Learning)
 * - tone-6 (Cyan/Teal): การเงิน สื่อสาร & ตั้งค่าระบบ (Finance, Comms & System Config)
 */
export const MODULE_TONE_MAP: Record<NavTab, ModuleTone> = {
  // tone-1: Core Directory & Academics
  dashboard: 'tone-1',
  executive_monitor: 'tone-1',
  students: 'tone-1',
  teachers: 'tone-1',
  courses: 'tone-1',
  timetable: 'tone-1',

  // tone-2: Assessment, Attendance & Tasks
  gradebook: 'tone-2',
  attendance: 'tone-2',
  mobile_checkin: 'tone-2',
  homework: 'tone-2',
  central_exam_hub: 'tone-2',

  // tone-3: Student Care Warnings & Super Admin Master
  behavior_sdq: 'tone-3',
  executive_warning: 'tone-3',
  super_admin_console: 'tone-3',

  // tone-4: Health & Safety / Digital ID
  infirmary: 'tone-4',
  student_id_cards: 'tone-4',

  // tone-5: AI & Learning Innovation
  socratic_tutor: 'tone-5',
  ai_diagnostic: 'tone-5',
  subject_labs: 'tone-5',
  realworld_quests: 'tone-5',
  study_streak: 'tone-5',
  boss_raid: 'tone-5',
  games: 'tone-5',
  portfolio: 'tone-5',
  hall_of_fame: 'tone-5',

  // tone-6: Finance, Comms & System Settings
  billing: 'tone-6',
  announcements: 'tone-6',
  school_gps: 'tone-6',
  school_permissions: 'tone-6',
  admin_superadmin_desk: 'tone-6',
  system_settings: 'tone-6',
};

export const CATEGORY_TONE_MAP: Record<NavCategoryId, ModuleTone> = {
  super_admin: 'tone-3',
  academics: 'tone-1',
  student_care: 'tone-4',
  innovation: 'tone-5',
  administration: 'tone-6',
  finance: 'tone-6',
};

export function getModuleTone(tab: NavTab): ModuleTone {
  return MODULE_TONE_MAP[tab] ?? 'tone-1';
}

export function getCategoryTone(categoryId: NavCategoryId): ModuleTone {
  return CATEGORY_TONE_MAP[categoryId] ?? 'tone-1';
}
