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
  Coffee,
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
  ArrowLeftRight,
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
  | 'academics'
  | 'assessment'
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
  shortLabelTh: string;
  shortLabelEn: string;
  icon: LucideIcon;
  badge?: string;
  items: NavItemDef[];
}

const FOCUS_TEACHER_TABS = new Set<NavTab>([
  'dashboard',
  'attendance',
  'mobile_checkin',
  'homework',
  'gradebook',
  'student_development_book',
  'qualitative_summary',
  'obec_executive_dashboard',
  'pp6_executive_dashboard',
  'executive_monitor',
  'report_insights',
  'timetable',
  'students',
  'behavior_sdq',
  'career_quest',
  'announcements',
]);

const ARCADE_TABS = new Set<NavTab>(['games', 'boss_raid', 'study_streak', 'hall_of_fame']);

const SIDEBAR_FOCUS_STORAGE_KEY = 'baanpakkru_sidebar_focus_mode';

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  isSuperAdminSchoolView,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
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
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const supportsFocusMode = currentRole === 'teacher';
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    if (!supportsFocusMode) return false;
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(SIDEBAR_FOCUS_STORAGE_KEY);
      if (saved === '1') return true;
      if (saved === '0') return false;
    }
    return currentRole === 'teacher';
  });

  useEffect(() => {
    if (!supportsFocusMode) {
      setFocusMode(false);
      return;
    }
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(SIDEBAR_FOCUS_STORAGE_KEY);
      if (saved === '1') setFocusMode(true);
      else if (saved === '0') setFocusMode(false);
      else setFocusMode(currentRole === 'teacher');
    }
  }, [currentRole, supportsFocusMode]);

  const setFocusModeState = (next: boolean) => {
    setFocusMode(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SIDEBAR_FOCUS_STORAGE_KEY, next ? '1' : '0');
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

  // Master Categories Definition — separated clearly by domain & color identity
  const categories: NavCategoryDef[] = useMemo(() => {
    const list: NavCategoryDef[] = [];

    // Category 0: Super Admin Console (Amber · tone-3)
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

    // Category 1: Core Directory & Schedule (Blue · tone-1)
    list.push({
      id: 'academics',
      labelTh: 'ทะเบียน & ตารางเรียน',
      labelEn: 'Directory & Schedule',
      shortLabelTh: 'ทะเบียน',
      shortLabelEn: 'Directory',
      icon: Users,
      items: [
        {
          id: 'students',
          labelTh: 'ทะเบียนนักเรียน',
          labelEn: 'Student Directory',
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
          id: 'timetable',
          labelTh: 'ตารางเรียน & ตารางสอน',
          labelEn: 'Timetable & Schedule',
          shortLabelTh: 'ตาราง',
          shortLabelEn: 'Schedule',
          icon: Calendar,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    });

    // Category 2: Assessment & Teaching Tasks (Emerald · tone-2)
    list.push({
      id: 'assessment',
      labelTh: 'วัดผล สพฐ. & การสอน',
      labelEn: 'Assessment & Teaching',
      shortLabelTh: 'วัดผล',
      shortLabelEn: 'Grading',
      icon: Award,
      items: [
        {
          id: 'gradebook',
          labelTh: 'บันทึกคะแนน & งานทะเบียน',
          labelEn: 'Gradebook & Registration',
          shortLabelTh: 'คะแนน/ทะเบียน',
          shortLabelEn: 'Grades',
          icon: Award,
          roles: ['super_admin', 'admin', 'teacher'],
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
          id: 'central_exam_hub',
          labelTh: 'คลังข้อสอบกลางมาตรฐาน',
          labelEn: 'Central Exam Hub',
          icon: BookOpen,
          badge: unclaimedCentralPacksCount > 0 ? `${unclaimedCentralPacksCount} ใหม่` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'student_development_book',
          labelTh: 'สมุดพัฒนาคุณภาพผู้เรียน',
          labelEn: 'Student Development Book',
          icon: BookMarked,
          roles: ['super_admin', 'admin', 'teacher'],
        },
      ],
    });

    // Category 2B: Report / Monitor (Blue · tone-1)
    list.push({
      id: 'report_monitor',
      labelTh: 'Report / Monitor',
      labelEn: 'Report / Monitor',
      shortLabelTh: 'รายงาน',
      shortLabelEn: 'Reports',
      icon: Monitor,
      items: [
        {
          id: 'executive_monitor',
          labelTh: 'ศูนย์มอนิเตอร์รายงานผู้บริหาร',
          labelEn: 'Executive Report Monitor',
          icon: Monitor,
          roles: ['super_admin', 'admin', 'teacher'],
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
          id: 'qualitative_summary',
          labelTh: 'สรุปคุณลักษณะฯ & อ่านคิดวิเคราะห์',
          labelEn: 'Qualitative & Reading Analytics',
          icon: ClipboardCheck,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'executive_warning',
          labelTh: 'เรดาร์เตือนภัยผู้เรียน (EWS)',
          labelEn: 'Early Warning Radar',
          icon: ShieldAlert,
          roles: ['super_admin', 'admin'],
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

    // Category 3: Student Care, Attendance & Health (Rose · tone-4)
    list.push({
      id: 'student_care',
      labelTh: 'เช็กชื่อ กิจการ & สุขภาพ',
      labelEn: 'Attendance, Care & Health',
      shortLabelTh: 'เช็กชื่อ',
      shortLabelEn: 'Care',
      icon: HeartPulse,
      items: [
        {
          id: 'attendance',
          labelTh: 'ระบบสแกนเช็คชื่อหน้าประตู',
          labelEn: 'Gate QR Check-in',
          shortLabelTh: 'เช็กชื่อ',
          shortLabelEn: 'Check-in',
          icon: QrCode,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'mobile_checkin',
          labelTh: 'เช็คชื่อเข้าเรียนผ่านมือถือ',
          labelEn: 'Mobile Check-in',
          icon: Smartphone,
          roles: ['super_admin', 'admin', 'teacher', 'student'],
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
        {
          id: 'behavior_sdq',
          labelTh: 'ระบบดูแลช่วยเหลือนักเรียน & SDQ',
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
      ],
    });

    // Category 4: Learning & Innovation (Violet · tone-5)
    list.push({
      id: 'innovation',
      labelTh: 'AI & นวัตกรรมการเรียนรู้',
      labelEn: 'AI & Learning Innovation',
      shortLabelTh: 'นวัตกรรม',
      shortLabelEn: 'Innovation',
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

    // Category 5: Finance & Announcements (Cyan · tone-6)
    list.push({
      id: 'finance',
      labelTh: 'การเงิน & การสื่อสาร',
      labelEn: 'Finance & News',
      shortLabelTh: 'การเงิน',
      shortLabelEn: 'Finance',
      icon: Receipt,
      items: [
        {
          id: 'announcements',
          labelTh: 'ข่าวสาร & ประกาศโรงเรียน',
          labelEn: 'Announcements & News',
          shortLabelTh: 'ประกาศ',
          shortLabelEn: 'News',
          icon: BellRing,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
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

    // Category 6: System Control & Administration (Slate · tone-7)
    list.push({
      id: 'administration',
      labelTh: 'ควบคุมและจัดการระบบโรงเรียน',
      labelEn: 'System Control & Admin',
      shortLabelTh: 'คุมระบบ',
      shortLabelEn: 'Control',
      icon: SlidersHorizontal,
      items: [
        {
          id: 'system_settings',
          labelTh: 'ศูนย์ควบคุมระบบโรงเรียน',
          labelEn: 'System Control Center',
          shortLabelTh: 'คุมระบบ',
          shortLabelEn: 'Control',
          icon: SlidersHorizontal,
          roles: ['super_admin', 'admin'],
        },
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
        {
          id: 'admin_superadmin_desk',
          labelTh: 'จดหมายประสานงานส่วนกลาง',
          labelEn: 'Super Admin Desk',
          icon: Mail,
          badge: coordinationUnreadCount > 0 ? `${coordinationUnreadCount} ใหม่` : null,
          roles: ['admin'],
        },
      ],
    });

    return list;
  }, [currentRole, isSuperAdminSchoolView, studentsCount, teachersCount, coursesCount, coordinationUnreadCount, unclaimedCentralPacksCount]);

  // Resolve visual active tab in Sidebar when inside system_settings or dashboard monitor sub-tabs
  const resolvedSidebarActiveTab: NavTab = useMemo(() => {
    if (currentTab === 'dashboard') {
      if (activeDashboardSubTab === 'executive_monitor') return 'executive_monitor';
      if (activeDashboardSubTab === 'obec_learning_areas') return 'obec_executive_dashboard';
      if (activeDashboardSubTab === 'pp6_quality_overview') return 'pp6_executive_dashboard';
      if (activeDashboardSubTab === 'early_warning') return 'executive_warning';
      if (activeDashboardSubTab === 'insights') return 'report_insights';
      return 'dashboard';
    }
    if (currentTab !== 'system_settings') return currentTab;
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
  }, [currentTab, activeSettingsSubTab, activeDashboardSubTab]);

  // Dashboard standalone entry + quick shortcuts (keep items inside their true categories too!)
  const dashboardItem: NavItemDef = useMemo(() => ({
    id: 'dashboard',
    labelTh: 'แดชบอร์ดหลักรวมศูนย์',
    labelEn: 'Unified Dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  }), []);

  const quickShortcuts = useMemo(() => {
    const ids: NavTab[] = currentRole === 'student'
      ? ['career_quest', 'timetable', 'homework']
      : currentRole === 'parent'
      ? ['student_id_cards', 'billing', 'announcements']
      : currentRole === 'admin'
      ? ['attendance', 'teachers', 'system_settings']
      : ['attendance', 'students', 'gradebook'];
    const all = categories.flatMap((c) => c.items);
    return ids
      .map((id) =>
        all.find(
          (i) =>
            i.id === id &&
            i.roles.includes(currentRole) &&
            isTabEnabledByFeatureFlags(i.id, featureFlags, currentRole) &&
            isAllowedBySchoolPolicy(i.id)
        )
      )
      .filter((i): i is NavItemDef => Boolean(i));
  }, [categories, currentRole, featureFlags, schoolPermissions]);

  // Visible items per category
  const visibleCategories = useMemo(() => {
    return categories
      .map((cat) => {
        const items = cat.items.filter(
          (i) =>
            i.roles.includes(currentRole) &&
            isTabEnabledByFeatureFlags(i.id, featureFlags, currentRole) &&
            isAllowedBySchoolPolicy(i.id) &&
            (!focusMode || !supportsFocusMode || FOCUS_TEACHER_TABS.has(i.id) || i.id === resolvedSidebarActiveTab)
        );
        return { ...cat, items };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, currentRole, featureFlags, schoolPermissions, focusMode, supportsFocusMode, resolvedSidebarActiveTab]);

  // Search filtered items across dashboard + all categories
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

  const anyCategoryExpanded = visibleCategories.some(
    (cat) => !(collapsed[cat.id] ?? cat.id !== activeCatId)
  );

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
        if (!FOCUS_TEACHER_TABS.has(item.id) && item.id !== resolvedSidebarActiveTab) {
          hidden += 1;
        }
      });
    });
    return hidden;
  }, [categories, currentRole, featureFlags, schoolPermissions, focusMode, supportsFocusMode, resolvedSidebarActiveTab]);

  const renderItem = (item: NavItemDef, onClick?: () => void) => {
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
        className={`${getModuleTone(item.id)} group w-full flex min-h-8.5 items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition cursor-pointer ${
          isActive
            ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-semibold'
            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isActive
                ? 'text-[var(--tone)]'
                : 'text-[color-mix(in_srgb,var(--tone)_72%,var(--color-text-muted))] group-hover:text-[var(--tone)]'
            }`}
          />
          <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
        </span>
        {item.badge && (
          <span
            className={`shrink-0 tabular-nums ${
              isNumericBadge
                ? 'text-[11px] font-medium text-[var(--color-text-muted)]'
                : isAiBadge
                  ? 'text-[10px] font-bold text-[var(--tone)]'
                  : 'text-[10px] font-semibold text-rose-600 dark:text-rose-400'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  if (desktopCollapsed) {
    return (
      <aside className="w-15 border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-200">
        {onToggleDesktopCollapse && (
          <div className="shrink-0 p-2 border-b border-[var(--color-border)] flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleDesktopCollapse}
              title={lang === 'th' ? 'ขยายเมนูด้านข้าง' : 'Expand sidebar'}
              aria-label={lang === 'th' ? 'ขยายเมนูด้านข้าง' : 'Expand sidebar'}
              className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[#1e293b] dark:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
              <button
                type="button"
                onClick={() => onSwitchOperationalRole(currentRole === 'admin' ? 'teacher' : 'admin')}
                title={
                  currentRole === 'admin'
                    ? (lang === 'th' ? 'กำลังใช้โหมดผู้ดูแล (Admin) — คลิกสลับเป็นโหมดครูผู้สอน' : 'Admin Mode — Click to switch to Teacher Mode')
                    : (lang === 'th' ? 'กำลังใช้โหมดครูผู้สอน — คลิกสลับเข้าโหมดผู้ดูแล (Admin)' : 'Teacher Mode — Click to switch to Admin Mode')
                }
                aria-label={lang === 'th' ? 'สลับโหมด Admin และครู' : 'Switch Admin/Teacher mode'}
                className={`w-10 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                  currentRole === 'admin'
                    ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            )}
            {supportsFocusMode && (
              <button
                type="button"
                onClick={toggleFocusMode}
                aria-pressed={focusMode}
                title={
                  focusMode
                    ? lang === 'th'
                      ? 'โหมดลดภาระครู (ซ่อนเมนูรอง) — คลิกเพื่อแสดงทั้งหมด'
                      : 'Teacher Focus Mode ON — click to show all'
                    : lang === 'th'
                      ? 'กำลังแสดงทุกเมนู — คลิกเพื่อเปิดโหมดลดภาระครู'
                      : 'All menus shown — click for Teacher Focus Mode'
                }
                className={`w-10 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                  focusMode
                    ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <nav className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1 flex flex-col items-center">
          {/* Home Dashboard Icon */}
          <button
            type="button"
            data-nav-tab={dashboardItem.id}
            onClick={() => setCurrentTab(dashboardItem.id)}
            title={lang === 'th' ? dashboardItem.labelTh : dashboardItem.labelEn}
            aria-label={lang === 'th' ? dashboardItem.labelTh : dashboardItem.labelEn}
            className={`${getModuleTone(dashboardItem.id)} relative w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
              resolvedSidebarActiveTab === dashboardItem.id
                ? 'bg-[var(--tone-soft)] text-[var(--tone)]'
                : 'text-[var(--tone)]/80 hover:bg-[var(--tone-soft)]/60 hover:text-[var(--tone)]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>

          {visibleCategories.map((cat) => (
            <React.Fragment key={cat.id}>
              <div className="w-6 h-px bg-[var(--color-border)] my-1 shrink-0" aria-hidden="true" />
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
                    className={`${getModuleTone(item.id)} relative w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                      isActive
                        ? 'bg-[var(--tone-soft)] text-[var(--tone)]'
                        : 'text-[color-mix(in_srgb,var(--tone)_75%,var(--color-text-muted))] hover:bg-[var(--tone-soft)]/50 hover:text-[var(--tone)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.badge && !/^\d+$/.test(String(item.badge)) && item.badge !== 'AI' && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
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
    <aside className="w-68 border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-200">
      {/* Search + Collapse Header */}
      <div className="shrink-0 p-2.5 border-b border-[var(--color-border)] flex items-center gap-1.5" data-guide-id="sidebar-search">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาเมนู...' : 'Search menu...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-6 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              aria-label="clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        {onToggleDesktopCollapse && (
          <button
            type="button"
            onClick={onToggleDesktopCollapse}
            title={lang === 'th' ? 'ย่อแถบเมนูเพื่อเพิ่มพื้นที่ทำงาน' : 'Collapse sidebar for more workspace'}
            aria-label={lang === 'th' ? 'ย่อแถบเมนู' : 'Collapse sidebar'}
            className="shrink-0 w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dual-Privilege Admin ↔ Teacher Operational Mode Switcher */}
      {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
        <div className="shrink-0 px-2.5 py-2 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)]/70">
          <div className="flex items-center justify-between gap-2 px-0.5 pb-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
            <span className="truncate">{lang === 'th' ? 'สลับโหมดปฏิบัติงาน' : 'Operational Mode'}</span>
            <span className="text-[var(--color-primary-text)] shrink-0">
              {currentRole === 'admin'
                ? (lang === 'th' ? 'สิทธิ์ Admin' : 'Admin Active')
                : (lang === 'th' ? 'สิทธิ์ครูผู้สอน' : 'Teacher Active')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onSwitchOperationalRole('admin')}
              aria-pressed={currentRole === 'admin'}
              className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 font-bold transition cursor-pointer whitespace-nowrap ${
                currentRole === 'admin'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span className="truncate">{lang === 'th' ? 'โหมด Admin' : 'Admin'}</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchOperationalRole('teacher')}
              aria-pressed={currentRole === 'teacher'}
              className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 font-bold transition cursor-pointer whitespace-nowrap ${
                currentRole === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <GraduationCap className="w-3 h-3 shrink-0" />
              <span className="truncate">{lang === 'th' ? 'โหมดครู' : 'Teacher'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Teacher Focus vs All Menus Segmented Bar */}
      {supportsFocusMode && (
        <div className="shrink-0 px-2.5 py-2 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)]/60">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFocusModeState(true)}
              aria-pressed={focusMode}
              className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 font-semibold transition cursor-pointer whitespace-nowrap ${
                focusMode
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title={lang === 'th' ? 'แสดงเฉพาะงานสอนและงานประจำของครู' : 'Daily teaching focus'}
            >
              <Coffee className="w-3 h-3 shrink-0" />
              <span className="truncate">{lang === 'th' ? 'ลดภาระครู' : 'Focus'}</span>
              {focusMode && hiddenByFocusCount > 0 && (
                <span className="opacity-85 tabular-nums">(-{hiddenByFocusCount})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFocusModeState(false)}
              aria-pressed={!focusMode}
              className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 font-semibold transition cursor-pointer whitespace-nowrap ${
                !focusMode
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <span className="truncate">{lang === 'th' ? 'แสดงทั้งหมด' : 'All Menus'}</span>
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-3">
        {searchFilter.trim() ? (
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
              {lang === 'th' ? `ผลการค้นหา (${searchResults.length})` : `Results (${searchResults.length})`}
            </div>
            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                {lang === 'th' ? 'ไม่พบเมนู' : 'No menus found'}
              </div>
            ) : (
              searchResults.map((item) => renderItem(item, () => setSearchFilter('')))
            )}
          </div>
        ) : (
          <>
            {/* Primary Overview + Compact 1-Row Quick Shortcuts */}
            <div className="space-y-1.5">
              <button
                type="button"
                data-nav-tab={dashboardItem.id}
                onClick={() => setCurrentTab(dashboardItem.id)}
                className={`${getModuleTone(dashboardItem.id)} w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-bold transition cursor-pointer border ${
                  resolvedSidebarActiveTab === dashboardItem.id
                    ? 'bg-[var(--tone-soft)] text-[var(--tone)] border-[color-mix(in_srgb,var(--tone)_32%,transparent)]'
                    : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--tone-soft)]/50'
                }`}
              >
                <span className="tone-chip w-6 h-6 rounded-lg">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">{lang === 'th' ? dashboardItem.labelTh : dashboardItem.labelEn}</span>
              </button>

              {quickShortcuts.length > 0 && (
                <div className="grid grid-cols-3 gap-1">
                  {quickShortcuts.map((item) => {
                    const Icon = item.icon;
                    const isActive = resolvedSidebarActiveTab === item.id;
                    return (
                      <button
                        key={`quick-${item.id}`}
                        type="button"
                        onClick={() => setCurrentTab(item.id)}
                        title={lang === 'th' ? item.labelTh : item.labelEn}
                        className={`${getModuleTone(item.id)} flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer border whitespace-nowrap ${
                          isActive
                            ? 'bg-[var(--tone-soft)] text-[var(--tone)] border-[color-mix(in_srgb,var(--tone)_35%,transparent)]'
                            : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--tone-soft)]/60 hover:text-[var(--tone)]'
                        }`}
                      >
                        <Icon className="w-3 h-3 shrink-0 text-[var(--tone)]" />
                        <span className="truncate">
                          {lang === 'th' ? item.shortLabelTh || item.labelTh : item.shortLabelEn || item.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section Header + Expand/Collapse All */}
            <div className="pt-1 border-t border-[var(--color-border)] flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'กลุ่มงานตามฝ่าย' : 'Workspaces'}
              </span>
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer transition"
              >
                <ChevronsUpDown className="w-3 h-3" />
                <span>
                  {anyCategoryExpanded
                    ? lang === 'th'
                      ? 'ย่อทั้งหมด'
                      : 'Collapse all'
                    : lang === 'th'
                      ? 'ขยายทั้งหมด'
                      : 'Expand all'}
                </span>
              </button>
            </div>

            {/* Color-Coded Work Groups */}
            <div className="space-y-1.5">
              {visibleCategories.map((cat) => {
                const isCollapsed = collapsed[cat.id] ?? cat.id !== activeCatId;
                const CategoryIcon = cat.icon;
                const isActiveCategory = cat.id === activeCatId;
                const catTone = getCategoryTone(cat.id);
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
                          [cat.id]: !(previous[cat.id] ?? cat.id !== activeCatId),
                        }));
                      }}
                      className={`w-full flex min-h-9.5 items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left transition cursor-pointer border ${
                        isActiveCategory || !isCollapsed
                          ? 'bg-[color-mix(in_srgb,var(--tone-soft)_68%,var(--color-card))] border-[color-mix(in_srgb,var(--tone)_28%,var(--color-border))] text-[var(--color-text-title)]'
                          : 'bg-[var(--color-card)] border-transparent hover:bg-[color-mix(in_srgb,var(--tone-soft)_42%,var(--color-card))] hover:border-[color-mix(in_srgb,var(--tone)_20%,var(--color-border))] text-[var(--color-text-body)]'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="tone-chip w-6 h-6 rounded-lg">
                          <CategoryIcon className="h-3.5 w-3.5 shrink-0" />
                        </span>
                        <span className="truncate text-[12px] font-bold">
                          {lang === 'th' ? cat.labelTh : cat.labelEn}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {isCollapsed && alertBadge && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            {alertBadge}
                          </span>
                        )}
                        <span className="text-[11px] font-medium tabular-nums text-[var(--color-text-muted)]">
                          {cat.items.length}
                        </span>
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[var(--tone)]" />
                        )}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div
                        id={`sidebar-category-${cat.id}`}
                        className="space-y-0.5 pl-2.5 pr-0.5 pt-0.5 pb-1"
                      >
                        {cat.items.map((item) => renderItem(item))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
};

