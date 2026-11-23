import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  QrCode,
  Award,
  Receipt,
  BellRing,
  Swords,
  Smartphone,
  FolderGit2,
  Calendar,
  HeartHandshake,
  CreditCard,
  HeartPulse,
  FileCheck2,
  SlidersHorizontal,
  ShieldCheck,
  GraduationCap,
  FlaskConical,
  BrainCircuit,
  Trophy,
  Flame,
  Camera,
  Sparkles,
  Search,
  Mail,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  BarChart3,
  BookMarked,
  ClipboardCheck,
  ChevronsUpDown,
  Monitor,
  ShieldAlert,
  MapPin,
  KeyRound,
  Sliders,
  Layers,
  LucideIcon,
} from 'lucide-react';
import { UserRole, AppLanguage, SchoolFeatureFlags } from '../../types';
import { isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getModuleTone, getCategoryTone } from '../../lib/moduleTheme';
import { SchoolPolicyId } from '../../lib/schoolPermissions';

export type NavTab =
  | 'super_admin_console'
  | 'school_permissions'
  | 'system_settings'
  | 'school_gps'
  | 'admin_line_control'
  | 'admin_student_accounts'
  | 'admin_saas_audit'
  | 'executive_warning'
  | 'executive_monitor'
  | 'obec_executive_dashboard'
  | 'pp6_executive_dashboard'
  | 'admin_superadmin_desk'
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'courses'
  | 'timetable'
  | 'homework'
  | 'study_streak'
  | 'career_quest'
  | 'socratic_tutor'
  | 'realworld_quests'
  | 'ai_diagnostic'
  | 'attendance'
  | 'mobile_checkin'
  | 'behavior_sdq'
  | 'student_id_cards'
  | 'infirmary'
  | 'subject_labs'
  | 'games'
  | 'boss_raid'
  | 'hall_of_fame'
  | 'portfolio'
  | 'gradebook'
  | 'student_development_book'
  | 'qualitative_summary'
  | 'central_exam_hub'
  | 'report_insights'
  | 'billing'
  | 'announcements';

export type NavCategoryId =
  | 'super_admin'
  | 'daily_work'
  | 'academic_setup'
  | 'report_monitor'
  | 'student_care'
  | 'innovation'
  | 'finance'
  | 'administration';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  currentRole: UserRole;
  isSuperAdminSchoolView: boolean;
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  activeSettingsSubTab?: string;
  activeDashboardSubTab?: string;
  studentsCount: number;
  coursesCount: number;
  teachersCount?: number;
  coordinationUnreadCount?: number;
  unclaimedCentralPacksCount?: number;
  featureFlags?: SchoolFeatureFlags;
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  lang: AppLanguage;
  desktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
  adminSimplifiedView?: boolean;
  onToggleAdminSimplifiedView?: () => void;
}

export interface NavItemDef {
  id: NavTab;
  labelTh: string;
  labelEn: string;
  shortLabelTh?: string;
  shortLabelEn?: string;
  icon: LucideIcon;
  badge?: string | null;
  roles: UserRole[];
}

export interface NavCategoryDef {
  id: NavCategoryId;
  labelTh: string;
  labelEn: string;
  helperTh?: string;
  helperEn?: string;
  shortLabelTh: string;
  shortLabelEn: string;
  icon: LucideIcon;
  badge?: string;
  items: NavItemDef[];
}

// Focused daily teaching tools for Teachers (keeps student arcade & executive reports tucked away)
const FOCUS_TEACHER_TABS = new Set<NavTab>([
  'dashboard',
  'gradebook',
  'timetable',
  'courses',
  'students',
  'attendance',
  'mobile_checkin',
  'homework',
  'central_exam_hub',
  'behavior_sdq',
  'announcements',
]);

// Focused school administration tools for Admins (removes duplicate sub-tab links & student arcade)
const ADMIN_FOCUS_TABS = new Set<NavTab>([
  'dashboard',
  'gradebook',
  'students',
  'teachers',
  'courses',
  'timetable',
  'homework',
  'central_exam_hub',
  'executive_monitor',
  'executive_warning',
  'attendance',
  'mobile_checkin',
  'behavior_sdq',
  'infirmary',
  'billing',
  'announcements',
  'system_settings',
  'admin_superadmin_desk',
]);

// Simplified View tabs for Admin dashboard (hides technical settings & executive tools, keeping core operations)
const ADMIN_SIMPLIFIED_TABS = new Set<NavTab>([
  'dashboard',
  'gradebook',
  'students',
  'teachers',
  'courses',
  'timetable',
  'attendance',
  'mobile_checkin',
  'homework',
  'announcements',
]);

const ARCADE_TABS = new Set<NavTab>(['games', 'boss_raid', 'study_streak', 'hall_of_fame']);
const SIDEBAR_FOCUS_STORAGE_KEY = 'baanpakkru_sidebar_focus_mode';

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  isSuperAdminSchoolView,
  activeSettingsSubTab,
  activeDashboardSubTab,
  studentsCount,
  coursesCount,
  teachersCount = 0,
  coordinationUnreadCount = 0,
  unclaimedCentralPacksCount = 0,
  featureFlags,
  schoolPermissions,
  lang,
  desktopCollapsed = false,
  onToggleDesktopCollapse,
  adminSimplifiedView = false,
  onToggleAdminSimplifiedView,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const isSimplifiedAdmin = currentRole === 'admin' && adminSimplifiedView;
  const supportsFocusMode = (currentRole === 'teacher' || currentRole === 'admin') && !isSimplifiedAdmin;
  const focusStorageKey = currentRole === 'teacher'
    ? SIDEBAR_FOCUS_STORAGE_KEY
    : `${SIDEBAR_FOCUS_STORAGE_KEY}_${currentRole}`;
  const focusTabs = isSimplifiedAdmin
    ? ADMIN_SIMPLIFIED_TABS
    : currentRole === 'admin'
      ? ADMIN_FOCUS_TABS
      : FOCUS_TEACHER_TABS;

  const [focusMode, setFocusMode] = useState<boolean>(() => {
    if (!supportsFocusMode) return false;
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(focusStorageKey);
      if (saved === '1') return true;
      if (saved === '0') return false;
    }
    return true;
  });

  useEffect(() => {
    if (!supportsFocusMode) {
      setFocusMode(false);
      return;
    }
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(focusStorageKey);
      if (saved === '1') setFocusMode(true);
      else if (saved === '0') setFocusMode(false);
      else setFocusMode(true);
    }
  }, [focusStorageKey, supportsFocusMode]);

  const setFocusModeState = (next: boolean) => {
    setFocusMode(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(focusStorageKey, next ? '1' : '0');
      } catch {
        // ignore storage failure
      }
    }
  };

  const toggleFocusMode = () => {
    setFocusModeState(!focusMode);
  };

  const isAllowedBySchoolPolicy = (tabId: NavTab): boolean => {
    if (!schoolPermissions) return true;
    if (currentRole === 'student') {
      if (tabId === 'mobile_checkin' && schoolPermissions.student_self_checkin === false) return false;
      if (ARCADE_TABS.has(tabId) && schoolPermissions.student_treasure_game === false) return false;
      if (tabId === 'homework' && schoolPermissions.student_submit_homework === false) return false;
      if (tabId === 'portfolio' && schoolPermissions.student_upload_portfolio === false) return false;
      if (tabId === 'gradebook' && schoolPermissions.student_view_grades === false) return false;
    }
    if (currentRole === 'teacher') {
      if (tabId === 'billing' && schoolPermissions.teacher_view_financials === false) return false;
      if (tabId === 'behavior_sdq' && schoolPermissions.teacher_sdq_screening === false) return false;
      if (tabId === 'infirmary' && schoolPermissions.teacher_infirmary_access === false) return false;
      if ((tabId === 'attendance' || tabId === 'mobile_checkin') && schoolPermissions.teacher_attendance === false) return false;
      if (tabId === 'homework' && schoolPermissions.teacher_homework === false) return false;
    }
    return true;
  };

  // Master Categories Definition
  const categories: NavCategoryDef[] = useMemo(() => {
    const list: NavCategoryDef[] = [];

    if (currentRole === 'super_admin') {
      list.push({
        id: 'super_admin',
        labelTh: 'ศูนย์ควบคุมแม่ข่าย',
        labelEn: 'Master Console',
        shortLabelTh: 'แม่ข่าย',
        shortLabelEn: 'Master',
        icon: ShieldCheck,
        items: [
          {
            id: 'super_admin_console',
            labelTh: isSuperAdminSchoolView ? 'กลับศูนย์ควบคุมแม่ข่าย' : 'ศูนย์ควบคุมระบบแม่ข่าย',
            labelEn: isSuperAdminSchoolView ? 'Back to Control Center' : 'System Control Center',
            icon: ShieldCheck,
            roles: ['super_admin'],
          },
          {
            id: 'admin_superadmin_desk',
            labelTh: 'แชต/จดหมายประสานงานโรงเรียน',
            labelEn: 'School Urgent Desk',
            icon: Mail,
            badge: coordinationUnreadCount > 0 ? `${coordinationUnreadCount} ใหม่` : null,
            roles: ['super_admin'],
          },
        ],
      });
    }

    // Setup and registry work is usually done at the start of a term or when records change.
    list.push({
      id: 'academic_setup',
      labelTh: 'ทะเบียนและเตรียมภาคเรียน',
      labelEn: 'Registry & Term Setup',
      helperTh: 'ทำตอนเปิดเทอม หรือเมื่อข้อมูลเปลี่ยน',
      helperEn: 'Start of term or when records change',
      shortLabelTh: 'ทะเบียน',
      shortLabelEn: 'Registry',
      icon: Users,
      items: [
        {
          id: 'students',
          labelTh: 'ทะเบียนนักเรียน',
          labelEn: 'Student Registry',
          shortLabelTh: 'นักเรียน',
          shortLabelEn: 'Students',
          icon: Users,
          badge: studentsCount > 0 ? `${studentsCount}` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'teachers',
          labelTh: 'บุคลากรและครู',
          labelEn: 'Faculty & Staff',
          shortLabelTh: 'บุคลากร',
          shortLabelEn: 'Faculty',
          icon: GraduationCap,
          badge: teachersCount > 0 ? `${teachersCount}` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'courses',
          labelTh: 'รายวิชา & หลักสูตร',
          labelEn: 'Courses & Curriculum',
          shortLabelTh: 'รายวิชา',
          shortLabelEn: 'Courses',
          icon: BookOpen,
          badge: coursesCount > 0 ? `${coursesCount}` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'central_exam_hub',
          labelTh: 'คลังข้อสอบกลาง (ตามรอบ)',
          labelEn: 'Central Exam Hub',
          icon: BookOpen,
          badge: unclaimedCentralPacksCount > 0 ? `${unclaimedCentralPacksCount} ใหม่` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
      ],
    });

    // Daily workflow, ordered from preparing the day through attendance and follow-up.
    list.push({
      id: 'daily_work',
      labelTh: 'งานประจำวัน',
      labelEn: 'Daily Work',
      helperTh: 'ดูตาราง → เช็คชื่อ → บันทึก/ติดตามงาน',
      helperEn: 'Schedule → attendance → grades and follow-up',
      shortLabelTh: 'งานประจำ',
      shortLabelEn: 'Daily',
      icon: Calendar,
      items: [
        {
          id: 'timetable',
          labelTh: 'ตารางเรียน & ตารางสอนวันนี้',
          labelEn: 'Today’s Timetable',
          shortLabelTh: 'ตาราง',
          shortLabelEn: 'Schedule',
          icon: Calendar,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'attendance',
          labelTh: 'เช็คชื่อหน้าประตู / QR',
          labelEn: 'Gate & QR Check-in',
          shortLabelTh: 'เช็กชื่อ',
          shortLabelEn: 'Check-in',
          icon: QrCode,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'mobile_checkin',
          labelTh: 'เช็คชื่อมือถือ & ใบลา',
          labelEn: 'Mobile Check-in & Leaves',
          icon: Smartphone,
          roles: ['super_admin', 'admin', 'teacher', 'student'],
        },
        {
          id: 'gradebook',
          labelTh: 'บันทึกคะแนน & ตัวชี้วัด',
          labelEn: 'Grades & Learning Indicators',
          shortLabelTh: 'คะแนน',
          shortLabelEn: 'Grades',
          icon: Award,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'homework',
          labelTh: 'การบ้าน & ภาระงาน',
          labelEn: 'Homework & Tasks',
          shortLabelTh: 'การบ้าน',
          shortLabelEn: 'Tasks',
          icon: FileCheck2,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'announcements',
          labelTh: 'ข่าวสาร & ประกาศโรงเรียน',
          labelEn: 'Announcements & News',
          shortLabelTh: 'ประกาศ',
          shortLabelEn: 'News',
          icon: BellRing,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    });

    // Student care tools are for cases, reviews, and periodic screening.
    list.push({
      id: 'student_care',
      labelTh: 'ดูแลช่วยเหลือนักเรียน',
      labelEn: 'Student Support',
      helperTh: 'ใช้เมื่อมีเคส หรือถึงรอบคัดกรอง',
      helperEn: 'As cases arise or during screening periods',
      shortLabelTh: 'ดูแล',
      shortLabelEn: 'Care',
      icon: HeartPulse,
      items: [
        {
          id: 'behavior_sdq',
          labelTh: 'ดูแลช่วยเหลือนักเรียน & SDQ',
          labelEn: 'Student Care & SDQ',
          icon: HeartHandshake,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'infirmary',
          labelTh: 'ห้องพยาบาล & เวชระเบียน',
          labelEn: 'Infirmary Clinic',
          icon: HeartPulse,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'student_id_cards',
          labelTh: 'บัตรนักเรียนดิจิทัล',
          labelEn: 'Digital Student ID',
          shortLabelTh: 'บัตร',
          shortLabelEn: 'ID Card',
          icon: CreditCard,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    });

    // Billing is used by payment cycle; announcements stay with daily work.
    list.push({
      id: 'finance',
      labelTh: 'การเงินตามรอบชำระ',
      labelEn: 'Billing Cycle',
      helperTh: 'ตรวจเมื่อถึงรอบชำระ หรือมีรายการรอตรวจ',
      helperEn: 'Check during billing cycles or when items are pending',
      shortLabelTh: 'การเงิน',
      shortLabelEn: 'Finance',
      icon: Receipt,
      items: [
        {
          id: 'billing',
          labelTh: 'ค่าเทอม & ใบเสร็จรับเงิน',
          labelEn: 'Tuition & Invoices',
          shortLabelTh: 'ค่าเทอม',
          shortLabelEn: 'Billing',
          icon: Receipt,
          roles: ['super_admin', 'admin', 'parent'],
        },
      ],
    });

    // System administration is intentionally kept below everyday workflows.
    list.push({
      id: 'administration',
      labelTh: 'ตั้งค่าและควบคุมระบบ',
      labelEn: 'System Administration',
      helperTh: 'ตั้งครั้งแรก หรือเมื่อมีการเปลี่ยนแปลง',
      helperEn: 'Initial setup or when configuration changes',
      shortLabelTh: 'ตั้งค่า',
      shortLabelEn: 'Admin',
      icon: SlidersHorizontal,
      items: [
        {
          id: 'system_settings',
          labelTh: focusMode && supportsFocusMode ? 'ตั้งค่าระบบ (GPS · สิทธิ์ · LINE)' : 'ศูนย์ควบคุมระบบโรงเรียน',
          labelEn: focusMode && supportsFocusMode ? 'School Settings & Control' : 'System Control Center',
          shortLabelTh: 'คุมระบบ',
          shortLabelEn: 'Control',
          icon: SlidersHorizontal,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'admin_superadmin_desk',
          labelTh: 'จดหมายประสานงานส่วนกลาง',
          labelEn: 'Super Admin Desk',
          icon: Mail,
          badge: coordinationUnreadCount > 0 ? `${coordinationUnreadCount} ใหม่` : null,
          roles: ['admin'],
        },
        // Secondary deep-link shortcuts (visible only when All Menus is expanded or via Search)
        {
          id: 'school_permissions',
          labelTh: 'สิทธิ์บทบาท & การเข้าถึง',
          labelEn: 'Roles & Permissions',
          icon: ShieldCheck,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'school_gps',
          labelTh: 'พิกัด GPS & จุดสแกนประตู',
          labelEn: 'School GPS & Gates',
          icon: MapPin,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'admin_line_control',
          labelTh: 'แจ้งเตือน LINE & เวลาตัดสาย',
          labelEn: 'LINE OA & Cutoff Rules',
          icon: BellRing,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'admin_student_accounts',
          labelTh: 'บัญชีนักเรียน & ลิงก์ล็อกอิน',
          labelEn: 'Student Accounts & Login',
          icon: KeyRound,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'admin_saas_audit',
          labelTh: 'แพ็กเกจ สิทธิ์ AI & Audit Log',
          labelEn: 'Packages, AI & Audit Log',
          icon: Sliders,
          roles: ['super_admin', 'admin'],
        },
      ],
    });

    // Periodic reports and quality monitoring.
    list.push({
      id: 'report_monitor',
      labelTh: 'รายงานและติดตามคุณภาพ',
      labelEn: 'Reports & Quality Monitoring',
      helperTh: 'ทบทวนรายเดือน / รายภาคเรียน',
      helperEn: 'Review monthly or each term',
      shortLabelTh: 'รายงาน',
      shortLabelEn: 'Reports',
      icon: BarChart3,
      items: [
        {
          id: 'executive_monitor',
          labelTh: focusMode && supportsFocusMode ? 'รายงานผู้บริหาร & สพฐ.' : 'รายงานผู้บริหารและ สพฐ.',
          labelEn: 'Executive & OBEC Reports',
          icon: Monitor,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'executive_warning',
          labelTh: 'ติดตามนักเรียนกลุ่มเสี่ยง (EWS)',
          labelEn: 'At-Risk Student Monitor (EWS)',
          icon: ShieldAlert,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'obec_executive_dashboard',
          labelTh: 'ประเมินผล 8 กลุ่มสาระฯ (สพฐ.)',
          labelEn: 'OBEC 8-Area Analytics',
          icon: BarChart3,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'pp6_executive_dashboard',
          labelTh: 'ภาพรวมคุณภาพ ปพ.6 (ผู้บริหาร)',
          labelEn: 'OBEC Pp.6 Executive',
          icon: GraduationCap,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'report_insights',
          labelTh: 'รายงานสถิติ & กราฟสรุปผล',
          labelEn: 'Analytics & Charts Report',
          icon: BarChart3,
          roles: ['super_admin', 'admin', 'teacher'],
        },
      ],
    });

    // Optional enrichment and AI modules.
    list.push({
      id: 'innovation',
      labelTh: 'กิจกรรมเสริมและ AI',
      labelEn: 'Enrichment & AI',
      helperTh: 'ใช้เสริมตามแผนการเรียนรู้',
      helperEn: 'Use as learning extensions',
      shortLabelTh: 'กิจกรรม',
      shortLabelEn: 'Arcade',
      icon: Sparkles,
      items: [
        {
          id: 'career_quest',
          labelTh: 'เส้นทางอาชีพ (Career Quest AI)',
          labelEn: 'Career Quest AI',
          shortLabelTh: 'อาชีพ AI',
          shortLabelEn: 'Career',
          icon: Compass,
          badge: 'AI',
          roles: ['super_admin', 'admin', 'teacher', 'student'],
        },
        {
          id: 'socratic_tutor',
          labelTh: 'ติวเตอร์ปัญญาประดิษฐ์',
          labelEn: 'AI Socratic Tutor',
          icon: Sparkles,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'ai_diagnostic',
          labelTh: 'วิเคราะห์ทักษะ & เสริมจุดแข็ง',
          labelEn: 'Skill Diagnostics',
          icon: BrainCircuit,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'portfolio',
          labelTh: 'แฟ้มผลงานดิจิทัล',
          labelEn: 'Digital Portfolio',
          icon: FolderGit2,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'subject_labs',
          labelTh: 'ห้องปฏิบัติการเสมือนจริง',
          labelEn: 'Virtual Subject Labs',
          icon: FlaskConical,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'realworld_quests',
          labelTh: 'เควสต์การเรียนรู้จากภาพถ่าย',
          labelEn: 'Real-World Visual Quests',
          icon: Camera,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'study_streak',
          labelTh: 'สตรีคประจำวัน & ภารกิจการเรียน',
          labelEn: 'Daily Study Streak',
          icon: Flame,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'boss_raid',
          labelTh: 'ภารกิจแก้โจทย์ท้าทายกลุ่ม',
          labelEn: 'Co-op Challenge Quest',
          icon: Swords,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'games',
          labelTh: 'เกมการเรียนรู้ฝึกสมอง',
          labelEn: 'Educational Arcade',
          icon: Swords,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'hall_of_fame',
          labelTh: 'หอเกียรติยศ & เกียรติบัตร',
          labelEn: 'Hall of Fame & Certs',
          icon: Trophy,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    });

    const categoryOrder: NavCategoryId[] = [
      'super_admin',
      'daily_work',
      'academic_setup',
      'student_care',
      'finance',
      'report_monitor',
      'administration',
      'innovation',
    ];
    return list.sort((a, b) => categoryOrder.indexOf(a.id) - categoryOrder.indexOf(b.id));
  }, [
    currentRole,
    isSuperAdminSchoolView,
    studentsCount,
    teachersCount,
    coursesCount,
    coordinationUnreadCount,
    unclaimedCentralPacksCount,
    focusMode,
    supportsFocusMode,
  ]);

  // Resolve visual active tab in Sidebar
  const resolvedSidebarActiveTab: NavTab = useMemo(() => {
    if (currentTab === 'dashboard') {
      if (activeDashboardSubTab === 'executive_monitor') return 'executive_monitor';
      if (activeDashboardSubTab === 'obec_learning_areas') {
        return focusMode && supportsFocusMode ? 'executive_monitor' : 'obec_executive_dashboard';
      }
      if (activeDashboardSubTab === 'pp6_quality_overview') {
        return focusMode && supportsFocusMode ? 'executive_monitor' : 'pp6_executive_dashboard';
      }
      if (activeDashboardSubTab === 'early_warning') return 'executive_warning';
      if (activeDashboardSubTab === 'insights') {
        return focusMode && supportsFocusMode ? 'executive_monitor' : 'report_insights';
      }
      return 'dashboard';
    }
    if (currentTab !== 'system_settings') return currentTab;
    // In Focus mode, highlight the single consolidated System Settings item cleanly
    if (focusMode && supportsFocusMode) return 'system_settings';
    if (activeSettingsSubTab === 'school_gps') return 'school_gps';
    if (activeSettingsSubTab === 'school_permissions') return 'school_permissions';
    if (
      activeSettingsSubTab === 'line_events' ||
      activeSettingsSubTab === 'line_connection' ||
      activeSettingsSubTab === 'preview_simulator' ||
      activeSettingsSubTab === 'subscribers'
    ) {
      return 'admin_line_control';
    }
    if (activeSettingsSubTab === 'student_accounts' || activeSettingsSubTab === 'student_login_config') {
      return 'admin_student_accounts';
    }
    if (activeSettingsSubTab === 'saas_audit') return 'admin_saas_audit';
    return 'system_settings';
  }, [currentTab, activeSettingsSubTab, activeDashboardSubTab, focusMode, supportsFocusMode]);

  // Dashboard standalone entry
  const dashboardItem: NavItemDef = useMemo(() => ({
    id: 'dashboard',
    labelTh: currentRole === 'teacher'
      ? 'โต๊ะทำงานครู'
      : currentRole === 'admin' || currentRole === 'super_admin'
        ? 'ภาพรวมโรงเรียน'
        : currentRole === 'student'
          ? 'หน้าหลักนักเรียน'
          : 'ภาพรวมผู้ปกครอง',
    labelEn: currentRole === 'teacher'
      ? "Teacher's Desk"
      : currentRole === 'admin' || currentRole === 'super_admin'
        ? 'School Overview'
        : currentRole === 'student'
          ? 'Student Home'
          : 'Parent Overview',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  }), [currentRole]);

  // Visible items per category
  const visibleCategories = useMemo(() => {
    return categories
      .map((cat) => {
        const items = cat.items.filter(
          (i) =>
            i.roles.includes(currentRole) &&
            isTabEnabledByFeatureFlags(i.id, featureFlags, currentRole) &&
            isAllowedBySchoolPolicy(i.id) &&
            (isSimplifiedAdmin
              ? ADMIN_SIMPLIFIED_TABS.has(i.id)
              : !focusMode || !supportsFocusMode || focusTabs.has(i.id) || i.id === resolvedSidebarActiveTab)
        );
        return { ...cat, items };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, currentRole, featureFlags, schoolPermissions, isSimplifiedAdmin, focusMode, supportsFocusMode, focusTabs, resolvedSidebarActiveTab]);

  // Search filters across ALL role-allowed modules (including hidden extra ones)
  const searchResults = useMemo(() => {
    if (!searchFilter.trim()) return [];
    const query = searchFilter.toLowerCase().trim();
    const results: NavItemDef[] = [];
    const pool = [dashboardItem, ...categories.flatMap((c) => c.items)];
    const seen = new Set<NavTab>();
    pool.forEach((item) => {
      if (seen.has(item.id)) return;
      if (!item.roles.includes(currentRole)) return;
      if (!isTabEnabledByFeatureFlags(item.id, featureFlags, currentRole)) return;
      if (!isAllowedBySchoolPolicy(item.id)) return;
      if (
        item.labelTh.toLowerCase().includes(query) ||
        item.labelEn.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      ) {
        seen.add(item.id);
        results.push(item);
      }
    });
    return results;
  }, [searchFilter, dashboardItem, categories, currentRole, featureFlags, schoolPermissions]);

  const activeCatId = visibleCategories.find((c) => c.items.some((i) => i.id === resolvedSidebarActiveTab))?.id;
  useEffect(() => {
    if (activeCatId) {
      setCollapsed((prev) => {
        if (prev[activeCatId] === false) return prev;
        return { ...prev, [activeCatId]: false };
      });
    }
  }, [activeCatId]);

  const isCategoryCollapsed = (catId: NavCategoryId): boolean => {
    if (Object.prototype.hasOwnProperty.call(collapsed, catId)) {
      return Boolean(collapsed[catId]);
    }
    // In Simplified Admin or Focus Mode for Admin/Teacher, keep core groups open so staff never hunt inside accordions
    if (isSimplifiedAdmin || (focusMode && supportsFocusMode)) {
      return false;
    }
    return catId !== activeCatId;
  };

  const anyCategoryExpanded = visibleCategories.some((cat) => !isCategoryCollapsed(cat.id));

  const handleToggleExpandAll = () => {
    const nextState = anyCategoryExpanded;
    const updated: Record<string, boolean> = {};
    visibleCategories.forEach((cat) => {
      updated[cat.id] = nextState;
    });
    setCollapsed(updated);
  };

  const hiddenByFocusCount = useMemo(() => {
    if (!supportsFocusMode || !focusMode) return 0;
    const seen = new Set<NavTab>();
    let hidden = 0;
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (seen.has(item.id)) return;
        if (!item.roles.includes(currentRole) || !isTabEnabledByFeatureFlags(item.id, featureFlags, currentRole) || !isAllowedBySchoolPolicy(item.id)) return;
        seen.add(item.id);
        if (!focusTabs.has(item.id) && item.id !== resolvedSidebarActiveTab) {
          hidden += 1;
        }
      });
    });
    return hidden;
  }, [categories, currentRole, featureFlags, schoolPermissions, focusMode, supportsFocusMode, focusTabs, resolvedSidebarActiveTab]);

  const renderItem = (item: NavItemDef, onClick?: () => void, tone = getModuleTone(item.id)) => {
    const Icon = item.icon;
    const isActive = resolvedSidebarActiveTab === item.id;
    const isNumericBadge = Boolean(item.badge && /^\d+$/.test(String(item.badge)));
    const isAiBadge = item.badge === 'AI';
    return (
      <button
        key={item.id}
        type="button"
        data-nav-tab={item.id}
        onClick={() => {
          setCurrentTab(item.id);
          onClick?.();
        }}
        className={`${tone} group relative w-full flex min-h-10 sm:min-h-9 items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-[13px] transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tone)]/40 ${
          isActive
            ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold shadow-[inset_3px_0_0_var(--tone)]'
            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? 'text-[var(--tone)]'
                : 'text-[var(--color-text-muted)] group-hover:text-[var(--tone)]'
            }`}
          />
          <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
        </span>
        {item.badge && (
          <span
            className={isNumericBadge ? 'ui-count-badge shrink-0' : 'ui-status shrink-0'}
            data-state={isAiBadge ? 'info' : isNumericBadge ? undefined : 'danger'}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  if (desktopCollapsed) {
    return (
      <aside className="app-sidebar w-16 border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-200">
        {onToggleDesktopCollapse && (
          <div className="shrink-0 p-2.5 border-b border-[var(--color-border)] flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onToggleDesktopCollapse}
              title={lang === 'th' ? 'ขยายเมนูด้านข้าง' : 'Expand sidebar'}
              aria-label={lang === 'th' ? 'ขยายเมนูด้านข้าง' : 'Expand sidebar'}
              className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs hover:bg-[var(--color-primary-light)] hover:border-[var(--color-primary)]/40 text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
            >
              <PanelLeftOpen className="w-[18px] h-[18px]" />
            </button>
            {supportsFocusMode && (
              <button
                type="button"
                onClick={toggleFocusMode}
                aria-pressed={!focusMode}
                title={
                  focusMode
                    ? (lang === 'th' ? 'แสดงเมนูเสริมทั้งหมด' : 'Show all modules')
                    : (lang === 'th' ? 'ซ่อนเมนูเสริม (โหมดงานหลัก)' : 'Show core modules only')
                }
                className={`w-10 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition ${
                  !focusMode
                    ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <Layers className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <nav className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5 flex flex-col items-center">
          <button
            type="button"
            data-nav-tab={dashboardItem.id}
            onClick={() => setCurrentTab(dashboardItem.id)}
            title={lang === 'th' ? dashboardItem.labelTh : dashboardItem.labelEn}
            aria-label={lang === 'th' ? dashboardItem.labelTh : dashboardItem.labelEn}
            className={`${getModuleTone(dashboardItem.id)} relative w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tone)]/40 ${
              resolvedSidebarActiveTab === dashboardItem.id
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] shadow-xs'
                : 'text-[var(--tone)]/80 hover:bg-[var(--tone-soft)]/60 hover:text-[var(--tone)]'
            }`}
          >
            <LayoutDashboard className="w-[18px] h-[18px]" />
          </button>

          {visibleCategories.map((cat) => (
            <React.Fragment key={cat.id}>
              <div className="w-7 h-px bg-[var(--color-border)] my-1.5 shrink-0" aria-hidden="true" />
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = resolvedSidebarActiveTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-nav-tab={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    title={`${lang === 'th' ? cat.shortLabelTh : cat.shortLabelEn} · ${lang === 'th' ? item.labelTh : item.labelEn}`}
                    aria-label={lang === 'th' ? item.labelTh : item.labelEn}
                    className={`${getCategoryTone(cat.id)} relative w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tone)]/40 ${
                      isActive
                        ? 'bg-[var(--tone-soft)] text-[var(--tone)] shadow-xs'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--tone-soft)]/50 hover:text-[var(--tone)]'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {item.badge && !/^\d+$/.test(String(item.badge)) && item.badge !== 'AI' && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[var(--color-card)]" />
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="app-sidebar w-64 max-w-[85vw] border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-200">
      {/* Compact Search + Collapse Header */}
      <div className="shrink-0 p-3 border-b border-[var(--color-border)]/70 bg-[var(--color-card)] flex items-center gap-2" data-guide-id="sidebar-search">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาเมนู...' : 'Search menu...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full h-9 pl-9 pr-8 text-[13px] rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] transition focus:outline-hidden focus:bg-[var(--color-card)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              aria-label="clear"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-text-title)] cursor-pointer transition"
            >
              ✕
            </button>
          )}
        </div>
        {onToggleDesktopCollapse && (
          <button
            type="button"
            onClick={onToggleDesktopCollapse}
            title={lang === 'th' ? 'ย่อแถบเมนู' : 'Collapse sidebar'}
            aria-label={lang === 'th' ? 'ย่อแถบเมนู' : 'Collapse sidebar'}
            className="shrink-0 w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
          >
            <PanelLeftClose className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5 space-y-2">
        {searchFilter.trim() ? (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
              {lang === 'th' ? `ผลการค้นหา (${searchResults.length})` : `Results (${searchResults.length})`}
            </div>
            {searchResults.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
                {lang === 'th' ? 'ไม่พบเมนู' : 'No menus found'}
              </div>
            ) : (
              searchResults.map((item) => renderItem(item, () => setSearchFilter('')))
            )}
          </div>
        ) : (
          <>
            {/* Primary Home Entry */}
            <div>
              <button
                type="button"
                data-nav-tab={dashboardItem.id}
                onClick={() => setCurrentTab(dashboardItem.id)}
                className={`${getModuleTone(dashboardItem.id)} w-full flex min-h-10 items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tone)]/40 ${
                  resolvedSidebarActiveTab === dashboardItem.id
                    ? 'bg-[var(--tone-soft)] text-[var(--tone)] border-[color-mix(in_srgb,var(--tone)_32%,transparent)]'
                    : 'bg-[var(--color-card)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--tone-soft)]/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 text-[var(--tone)]" />
                <span className="truncate">{lang === 'th' ? dashboardItem.labelTh : dashboardItem.labelEn}</span>
              </button>
            </div>

            {/* Expand/Collapse All shown only when viewing All Menus */}
            {!isSimplifiedAdmin && (!focusMode || !supportsFocusMode) && visibleCategories.length > 2 && (
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'หมวดงานทั้งหมด' : 'All Workspaces'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] cursor-pointer transition"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  <span>
                    {anyCategoryExpanded
                      ? (lang === 'th' ? 'ย่อทั้งหมด' : 'Collapse all')
                      : (lang === 'th' ? 'ขยายทั้งหมด' : 'Expand all')}
                  </span>
                </button>
              </div>
            )}

            {/* Work Groups */}
            <div className="space-y-3">
              {visibleCategories.map((cat) => {
                const isCollapsed = isCategoryCollapsed(cat.id);
                const catTone = getCategoryTone(cat.id);
                const CategoryIcon = cat.icon;
                const alertBadge = cat.items.find(
                  (i) => i.badge && !/^\d+$/.test(String(i.badge)) && i.badge !== 'AI'
                )?.badge;

                return (
                  <div key={cat.id} className={`${catTone} space-y-1`}>
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      aria-controls={`sidebar-category-${cat.id}`}
                      onClick={() => {
                        setCollapsed((previous) => ({
                          ...previous,
                          [cat.id]: !isCategoryCollapsed(cat.id),
                        }));
                      }}
                      data-expanded={!isCollapsed}
                      className="sidebar-category-trigger w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tone)]/30"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="ui-icon-tile h-7 w-7 shrink-0 rounded-lg">
                          <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="block min-w-0">
                          <span className="block truncate text-[13px] leading-5 font-extrabold tracking-tight text-[var(--tone)]">
                            {lang === 'th' ? cat.labelTh : cat.labelEn}
                          </span>
                          {(lang === 'th' ? cat.helperTh : cat.helperEn) && (
                            <span className="block truncate text-[11px] leading-4 font-medium text-[var(--color-text-muted)]">
                              {lang === 'th' ? cat.helperTh : cat.helperEn}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {isCollapsed && alertBadge && (
                          <span className="ui-status shrink-0" data-state="danger">
                            {alertBadge}
                          </span>
                        )}
                        <span className="ui-count-badge min-w-5 min-h-5 px-1.5 text-[10px]">
                          {cat.items.length}
                        </span>
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div
                        id={`sidebar-category-${cat.id}`}
                        className="sidebar-category-items ml-3 space-y-0.5 border-l border-[color-mix(in_srgb,var(--tone)_24%,var(--color-border))] pl-2"
                      >
                        {cat.items.map((item) => renderItem(item, undefined, catTone))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiet Bottom Toggle for Simplified View or Secondary/Student Modules */}
            {isSimplifiedAdmin && onToggleAdminSimplifiedView ? (
              <div className="pt-3 mt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={onToggleAdminSimplifiedView}
                  aria-pressed={true}
                  className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--color-primary-text)] bg-[var(--color-primary-light)]/70 hover:bg-[var(--color-primary-light)] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {lang === 'th' ? 'แสดงเมนู & ตั้งค่าทั้งหมด' : 'Exit Simplified View'}
                    </span>
                  </span>
                </button>
              </div>
            ) : supportsFocusMode && (
              <div className="pt-3 mt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  aria-pressed={!focusMode}
                  className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {focusMode
                        ? (lang === 'th' ? 'แสดงเมนูเสริม & กิจกรรมเด็ก' : 'Show More & Student Tools')
                        : (lang === 'th' ? 'กลับสู่โหมดงานหลัก (ซ่อนเมนูรอง)' : 'Core Work Menus Only')}
                    </span>
                  </span>
                  {focusMode && hiddenByFocusCount > 0 && (
                    <span className="shrink-0 tabular-nums text-[11px] font-semibold text-[var(--color-text-muted)]">
                      +{hiddenByFocusCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </nav>
    </aside>
  );
};
