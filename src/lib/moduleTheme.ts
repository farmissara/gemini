import type { NavCategoryId, NavTab } from '../components/layout/Sidebar';

export type ModuleTone = 'tone-1' | 'tone-2' | 'tone-3' | 'tone-4' | 'tone-5' | 'tone-6' | 'tone-7' | 'tone-8';

/**
 * Canonical Semantic Module Identity Tones
 * - tone-1 (Blue): ทะเบียน & ตารางเรียน (Core Directory & Schedule)
 * - tone-2 (Emerald): วัดผล สพฐ. & การเรียน (Assessment, Grades & OBEC)
 * - tone-3 (Amber): ศูนย์ควบคุมแม่ข่าย & เตือนภัย (Master Console & Early Warning)
 * - tone-4 (Rose): เช็กชื่อ กิจการ & สุขภาพ (Attendance, Care, Health & ID)
 * - tone-5 (Violet): AI & นวัตกรรมการเรียนรู้ (AI & Interactive Learning)
 * - tone-6 (Cyan): การสื่อสาร (Communications)
 * - tone-7 (Slate): ตั้งค่าระบบ & ประสานงาน (Settings, Permissions & Desk)
 */
export const MODULE_TONE_MAP: Record<NavTab, ModuleTone> = {
  // tone-1 (Blue): Core Directory & Schedule
  dashboard: 'tone-1',
  students: 'tone-1',
  teachers: 'tone-1',
  courses: 'tone-1',
  timetable: 'tone-1',

  // tone-2 (Emerald): Assessment, OBEC Analytics & Tasks
  gradebook: 'tone-2',
  student_development_book: 'tone-2',
  qualitative_summary: 'tone-2',
  obec_executive_dashboard: 'tone-2',
  pp6_executive_dashboard: 'tone-2',
  homework: 'tone-2',
  central_exam_hub: 'tone-2',

  // tone-3 (Amber): Master Console, Developer Governance & Early Warning
  executive_warning: 'tone-3',
  super_admin_console: 'tone-3',
  super_admin_approvals: 'tone-3',
  super_admin_audit: 'tone-3',
  super_admin_schools: 'tone-1',
  super_admin_central_exams: 'tone-2',
  super_admin_packages: 'tone-5',
  super_admin_promotions: 'tone-6',
  super_admin_exam_payment: 'tone-6',
  super_admin_permissions: 'tone-7',
  super_admin_backup: 'tone-7',

  // tone-4 (Rose): Attendance, Student Care, Health & Digital ID
  realtime_daily: 'tone-4',
  attendance: 'tone-4',
  mobile_checkin: 'tone-4',
  student_id_cards: 'tone-4',
  behavior_sdq: 'tone-4',
  infirmary: 'tone-4',

  // tone-5 (Violet): AI & Learning Innovation
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

  // tone-6 (Cyan): Announcements & Comms
  announcements: 'tone-6',

  // tone-7 (Slate): System Settings & Coordination Desk
  school_gps: 'tone-7',
  school_permissions: 'tone-7',
  admin_student_accounts: 'tone-7',
  admin_saas_audit: 'tone-7',
  admin_superadmin_desk: 'tone-7',
  system_settings: 'tone-7',

  // tone-8 (Orange): Executive Reports & Quality Analytics
  executive_monitor: 'tone-8',
  report_insights: 'tone-8',
};

export interface ModuleGroupMeta {
  tone: ModuleTone;
  code: string;
  labelTh: string;
  labelEn: string;
  colorNameTh: string;
  colorNameEn: string;
  meaningTh: string;
  meaningEn: string;
}

export const TONE_GROUP_META: Record<ModuleTone, ModuleGroupMeta> = {
  'tone-1': {
    tone: 'tone-1',
    code: '01',
    labelTh: 'ทะเบียน & ตารางเรียน',
    labelEn: 'Directory & Schedule',
    colorNameTh: 'น้ำเงิน',
    colorNameEn: 'Cobalt Blue',
    meaningTh: 'ข้อมูลหลักโรงเรียน นักเรียน ครู รายวิชา และตารางสอน',
    meaningEn: 'Core registry, faculty, courses, and schedules',
  },
  'tone-2': {
    tone: 'tone-2',
    code: '02',
    labelTh: 'วัดผล สพฐ. & การสอน',
    labelEn: 'Assessment & OBEC',
    colorNameTh: 'เขียวมรกต',
    colorNameEn: 'Emerald',
    meaningTh: 'บันทึกคะแนน ปพ. การบ้าน คลังข้อสอบ และสมุดคุณภาพผู้เรียน',
    meaningEn: 'Grading, homework, central exams, and OBEC records',
  },
  'tone-3': {
    tone: 'tone-3',
    code: '03',
    labelTh: 'ศูนย์ควบคุมแม่ข่าย & เตือนภัย',
    labelEn: 'Master & Early Warning',
    colorNameTh: 'เหลืองอำพัน',
    colorNameEn: 'Amber',
    meaningTh: 'งานความสำคัญสูง อนุมัติโรงเรียน และติดตามนักเรียนกลุ่มเสี่ยง',
    meaningEn: 'High-priority governance, approvals, and early warnings',
  },
  'tone-4': {
    tone: 'tone-4',
    code: '04',
    labelTh: 'เช็กชื่อ กิจการ & สุขภาพ',
    labelEn: 'Attendance, Care & Health',
    colorNameTh: 'แดงกุหลาบ',
    colorNameEn: 'Rose',
    meaningTh: 'งานเร่งด่วนประจำวัน เช็กชื่อ ใบลา SDQ ห้องพยาบาล และบัตรนักเรียน',
    meaningEn: 'Daily check-ins, leaves, SDQ care, clinic, and student ID',
  },
  'tone-5': {
    tone: 'tone-5',
    code: '05',
    labelTh: 'AI & นวัตกรรมการเรียนรู้',
    labelEn: 'AI & Learning Innovation',
    colorNameTh: 'ม่วงไวโอเล็ต',
    colorNameEn: 'Violet',
    meaningTh: 'ติวเตอร์ AI แนะแนวอาชีพ ห้องแล็บ เกมฝึกสมอง และแฟ้มผลงาน',
    meaningEn: 'AI tutoring, career quest, virtual labs, games, and portfolio',
  },
  'tone-6': {
    tone: 'tone-6',
    code: '06',
    labelTh: 'การสื่อสาร & ประกาศ',
    labelEn: 'Communications',
    colorNameTh: 'ฟ้าอมเขียว',
    colorNameEn: 'Cyan',
    meaningTh: 'ประกาศข่าวสารโรงเรียนและหนังสือยินยอมผู้ปกครอง',
    meaningEn: 'School announcements and parent consent notices',
  },
  'tone-7': {
    tone: 'tone-7',
    code: '07',
    labelTh: 'ตั้งค่าระบบ & ประสานงาน',
    labelEn: 'Settings & Governance',
    colorNameTh: 'เทาหินชนวน',
    colorNameEn: 'Slate',
    meaningTh: 'ตั้งค่า GPS สิทธิ์บทบาท สำรองข้อมูล และจดหมายประสานงาน',
    meaningEn: 'System configuration, GPS, permissions, and coordination',
  },
  'tone-8': {
    tone: 'tone-8',
    code: '08',
    labelTh: 'รายงาน & ติดตามคุณภาพ',
    labelEn: 'Reports & Quality',
    colorNameTh: 'ส้มอิฐ',
    colorNameEn: 'Terracotta',
    meaningTh: 'วิเคราะห์สถิติ กราฟแนวโน้ม และรายงานคุณภาพผู้บริหาร',
    meaningEn: 'Executive analytics, insights, and quality monitoring',
  },
};

export const CATEGORY_TONE_MAP: Record<NavCategoryId, ModuleTone> = {
  super_admin: 'tone-3',
  dev_platform: 'tone-3',
  dev_saas: 'tone-5',
  dev_infra: 'tone-7',
  daily_work: 'tone-2',
  academic_setup: 'tone-1',
  report_monitor: 'tone-8',
  student_care: 'tone-4',
  innovation: 'tone-5',
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
