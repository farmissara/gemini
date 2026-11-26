import React, { useMemo } from 'react';
import {
  Activity,
  ArrowLeft,
  Award,
  BellRing,
  BookOpen,
  Building2,
  Calendar,
  FileCheck2,
  Focus,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Mail,
  Monitor,
  MonitorPlay,
  Package,
  QrCode,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { AppLanguage, AppProgramMode, SchoolFeatureFlags, UserRole } from '../../types';
import type { NavTab } from './Sidebar';
import { isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import type { SchoolPolicyId } from '../../lib/schoolPermissions';
import { getModuleGroupMeta, getModuleTone } from '../../lib/moduleTheme';

interface FocusToolbarProps {
  currentTab: NavTab;
  programMode: AppProgramMode;
  currentRole: UserRole;
  isSuperAdminSchoolView?: boolean;
  lang: AppLanguage;
  featureFlags?: SchoolFeatureFlags;
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  onNavigateTab: (tab: NavTab) => void;
  onChangeProgramMode: (mode: AppProgramMode) => void;
  onExitFocusMode: () => void;
  adminSimplifiedView?: boolean;
}

interface FocusToolMeta {
  id: NavTab;
  labelTh: string;
  labelEn: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const TOOL_CATALOG: Record<string, FocusToolMeta> = {
  dashboard: {
    id: 'dashboard',
    labelTh: 'หน้าหลัก',
    labelEn: 'Overview',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  },
  timetable: {
    id: 'timetable',
    labelTh: 'ตารางสอน / เรียน',
    labelEn: 'Timetable',
    icon: Calendar,
    roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  },
  courses: {
    id: 'courses',
    labelTh: 'รายวิชา',
    labelEn: 'Courses',
    icon: BookOpen,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  attendance: {
    id: 'attendance',
    labelTh: 'เช็คชื่อ & เวลาเรียน',
    labelEn: 'Attendance',
    icon: QrCode,
    roles: ['super_admin', 'admin', 'teacher', 'student'],
  },
  homework: {
    id: 'homework',
    labelTh: 'การบ้าน & ภาระงาน',
    labelEn: 'Homework',
    icon: FileCheck2,
    roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  },
  gradebook: {
    id: 'gradebook',
    labelTh: 'ผลการเรียน',
    labelEn: 'Grades',
    icon: Award,
    roles: ['student', 'parent'],
  },
  central_exam_hub: {
    id: 'central_exam_hub',
    labelTh: 'คลังข้อสอบกลาง',
    labelEn: 'Exam Hub',
    icon: BookOpen,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  students: {
    id: 'students',
    labelTh: 'นักเรียน · คะแนน & ปพ.',
    labelEn: 'Students & Grades',
    icon: Users,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  teachers: {
    id: 'teachers',
    labelTh: 'ครู & บุคลากร',
    labelEn: 'Faculty',
    icon: GraduationCap,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  behavior_sdq: {
    id: 'behavior_sdq',
    labelTh: 'พฤติกรรม & SDQ',
    labelEn: 'Behavior & SDQ',
    icon: HeartHandshake,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  infirmary: {
    id: 'infirmary',
    labelTh: 'ห้องพยาบาล',
    labelEn: 'Infirmary',
    icon: HeartPulse,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  announcements: {
    id: 'announcements',
    labelTh: 'ประกาศโรงเรียน',
    labelEn: 'Announcements',
    icon: BellRing,
    roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
  },
  billing: {
    id: 'billing',
    labelTh: 'ค่าเทอม & ใบเสร็จ',
    labelEn: 'Billing',
    icon: Receipt,
    roles: ['super_admin', 'admin', 'parent'],
  },
  realtime_daily: {
    id: 'realtime_daily',
    labelTh: 'เรียลไทม์ประจำวัน',
    labelEn: 'Live Daily Radar',
    icon: Activity,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  executive_monitor: {
    id: 'executive_monitor',
    labelTh: 'มอนิเตอร์ & สพฐ.',
    labelEn: 'OBEC Monitor',
    icon: Monitor,
    roles: ['super_admin', 'admin', 'teacher'],
  },
  executive_warning: {
    id: 'executive_warning',
    labelTh: 'เตือนภัยผู้เรียน',
    labelEn: 'Early Warning',
    icon: ShieldAlert,
    roles: ['super_admin', 'admin'],
  },
  system_settings: {
    id: 'system_settings',
    labelTh: 'ตั้งค่าระบบ',
    labelEn: 'Settings',
    icon: SlidersHorizontal,
    roles: ['super_admin', 'admin'],
  },
  admin_superadmin_desk: {
    id: 'admin_superadmin_desk',
    labelTh: 'ประสานงานส่วนกลาง',
    labelEn: 'Admin Desk',
    icon: Mail,
    roles: ['admin', 'super_admin'],
  },
  super_admin_approvals: {
    id: 'super_admin_approvals',
    labelTh: 'อนุมัติโรงเรียนใหม่',
    labelEn: 'Approvals',
    icon: ShieldCheck,
    roles: ['super_admin'],
  },
  super_admin_schools: {
    id: 'super_admin_schools',
    labelTh: 'สถานศึกษาในระบบ',
    labelEn: 'Schools',
    icon: Building2,
    roles: ['super_admin'],
  },
  super_admin_packages: {
    id: 'super_admin_packages',
    labelTh: 'แพ็กเกจ & Feature Flags',
    labelEn: 'SaaS Packages',
    icon: Package,
    roles: ['super_admin'],
  },
  super_admin_permissions: {
    id: 'super_admin_permissions',
    labelTh: 'สิทธิ์ & บัญชีผู้ใช้',
    labelEn: 'Roles & Accounts',
    icon: KeyRound,
    roles: ['super_admin'],
  },
  super_admin_audit: {
    id: 'super_admin_audit',
    labelTh: 'Audit Log ส่วนกลาง',
    labelEn: 'Global Audit',
    icon: Activity,
    roles: ['super_admin'],
  },
};

const EXTRA_ACTIVE_LABELS: Partial<Record<NavTab, { th: string; en: string }>> = {
  realtime_daily: { th: 'ภาพรวมเรียลไทม์ประจำวัน', en: 'Real-Time Daily Radar' },
  obec_executive_dashboard: { th: 'รายงาน 8 กลุ่มสาระฯ สพฐ.', en: 'OBEC 8-Area Analytics' },
  pp6_executive_dashboard: { th: 'ภาพรวมคุณภาพ ปพ.6', en: 'Pp.6 Executive Overview' },
  qualitative_summary: { th: 'สรุปคุณลักษณะ & อ่านคิดวิเคราะห์', en: 'Qualitative Summary' },
  report_insights: { th: 'รายงานสถิติ & กราฟ', en: 'Analytics & Charts' },
  school_permissions: { th: 'ตั้งค่าสิทธิ์บทบาท', en: 'Role Permissions' },
  school_gps: { th: 'ตั้งค่า GPS โรงเรียน', en: 'School GPS' },
  admin_line_control: { th: 'ตั้งค่าแจ้งเตือน LINE OA', en: 'LINE OA Rules' },
  admin_student_accounts: { th: 'บัญชีนักเรียน', en: 'Student Accounts' },
  admin_saas_audit: { th: 'แพ็กเกจ AI & Audit Log', en: 'Packages & Audit' },
  student_id_cards: { th: 'บัตรนักเรียนดิจิทัล', en: 'Digital Student ID' },
  portfolio: { th: 'แฟ้มสะสมผลงาน', en: 'Portfolio' },
  subject_labs: { th: 'ห้องทดลองเสมือนจริง', en: 'Subject Labs' },
  socratic_tutor: { th: 'ติวเตอร์ AI', en: 'AI Tutor' },
  career_quest: { th: 'เส้นทางอาชีพ AI', en: 'Career Quest' },
  ai_diagnostic: { th: 'วิเคราะห์จุดอ่อน AI', en: 'AI Diagnostic' },
  realworld_quests: { th: 'ภารกิจนอกห้องเรียน', en: 'Snap Quest' },
  study_streak: { th: 'ภารกิจสะสมวินัย', en: 'Study Streak' },
  games: { th: 'เกมฝึกทักษะ', en: 'Learning Games' },
  boss_raid: { th: 'โหมดรวมพลังตอบคำถาม', en: 'Co-op Quiz' },
  hall_of_fame: { th: 'หอเกียรติยศ', en: 'Hall of Fame' },
  super_admin_console: { th: 'ศูนย์ควบคุมผู้พัฒนาระบบ', en: 'Developer Console' },
  super_admin_promotions: { th: 'โปรโมชัน & สัญญาสมาชิก', en: 'Promotions & Plans' },
  super_admin_central_exams: { th: 'คลังข้อสอบกลาง (ผู้พัฒนา)', en: 'Central Exam Bank' },
  super_admin_exam_payment: { th: 'ตั้งค่ารับเงิน PromptPay', en: 'Exam Payment Setup' },
  super_admin_backup: { th: 'สำรอง & กู้คืนระบบ', en: 'Backup & Restore' },
};

const CONTEXTUAL_CLUSTERS: Record<string, NavTab[]> = {
  teaching: ['timetable', 'courses', 'attendance', 'homework', 'students'],
  attendance: ['attendance', 'timetable', 'behavior_sdq', 'students'],
  grading: ['students', 'homework', 'central_exam_hub', 'courses', 'timetable'],
  directory: ['students', 'teachers', 'timetable', 'courses', 'attendance'],
  care_ops: ['behavior_sdq', 'infirmary', 'attendance', 'announcements', 'billing'],
  executive_admin: ['dashboard', 'realtime_daily', 'executive_monitor', 'executive_warning', 'attendance'],
  executive_teacher: ['dashboard', 'timetable', 'attendance', 'homework', 'students'],
  student_parent_home: ['dashboard', 'timetable', 'homework', 'gradebook', 'announcements'],
  settings: ['system_settings', 'students', 'teachers', 'admin_superadmin_desk', 'dashboard'],
};

const ADMIN_SIMPLIFIED_CORE_TABS = new Set<NavTab>([
  'dashboard',
  'students',
  'teachers',
  'courses',
  'timetable',
  'attendance',
  'homework',
  'announcements',
]);

function getContextualClusterIds(tab: NavTab, role: UserRole): NavTab[] {
  if (tab === 'attendance' || tab === 'mobile_checkin') return CONTEXTUAL_CLUSTERS.attendance;
  if (tab === 'timetable' || tab === 'courses') return CONTEXTUAL_CLUSTERS.teaching;
  if (tab === 'homework' || tab === 'central_exam_hub' || tab === 'gradebook' || tab === 'student_development_book' || tab === 'qualitative_summary') {
    return role === 'student' || role === 'parent' ? CONTEXTUAL_CLUSTERS.student_parent_home : CONTEXTUAL_CLUSTERS.grading;
  }
  if (tab === 'students' || tab === 'teachers') return CONTEXTUAL_CLUSTERS.directory;
  if (tab === 'behavior_sdq' || tab === 'infirmary' || tab === 'billing' || tab === 'announcements') {
    return role === 'student' || role === 'parent' ? CONTEXTUAL_CLUSTERS.student_parent_home : CONTEXTUAL_CLUSTERS.care_ops;
  }
  if (
    tab === 'system_settings' ||
    tab === 'school_gps' ||
    tab === 'school_permissions' ||
    tab === 'admin_line_control' ||
    tab === 'admin_student_accounts' ||
    tab === 'admin_saas_audit' ||
    tab === 'admin_superadmin_desk'
  ) {
    return CONTEXTUAL_CLUSTERS.settings;
  }
  if (role === 'student' || role === 'parent') return CONTEXTUAL_CLUSTERS.student_parent_home;
  if (role === 'teacher') return CONTEXTUAL_CLUSTERS.executive_teacher;
  return CONTEXTUAL_CLUSTERS.executive_admin;
}

const DEVELOPER_ONLY_TOOL_IDS = new Set<NavTab>([
  'super_admin_approvals',
  'super_admin_schools',
  'super_admin_packages',
  'super_admin_permissions',
  'super_admin_audit',
  'admin_superadmin_desk',
]);

export const FocusToolbar: React.FC<FocusToolbarProps> = ({
  currentTab,
  programMode,
  currentRole,
  isSuperAdminSchoolView = false,
  lang,
  featureFlags,
  schoolPermissions,
  onNavigateTab,
  onChangeProgramMode,
  onExitFocusMode,
  adminSimplifiedView = false,
}) => {
  const isDeveloperPlatformMode = currentRole === 'super_admin' && !isSuperAdminSchoolView;
  const isSimplifiedAdmin = currentRole === 'admin' && adminSimplifiedView;
  const isAllowedTool = (tabId: NavTab): boolean => {
    if (isDeveloperPlatformMode) {
      return DEVELOPER_ONLY_TOOL_IDS.has(tabId);
    }
    if (isSimplifiedAdmin && !ADMIN_SIMPLIFIED_CORE_TABS.has(tabId)) return false;
    const meta = TOOL_CATALOG[tabId];
    if (!meta || !meta.roles.includes(currentRole)) return false;
    const featureFlagTab = tabId === 'attendance' && currentRole === 'student' ? 'mobile_checkin' : tabId;
    if (!isTabEnabledByFeatureFlags(featureFlagTab, featureFlags, currentRole)) return false;
    if (schoolPermissions) {
      if (currentRole === 'teacher') {
        if (tabId === 'billing' && schoolPermissions.teacher_view_financials === false) return false;
        if (tabId === 'behavior_sdq' && schoolPermissions.teacher_sdq_screening === false) return false;
        if (tabId === 'infirmary' && schoolPermissions.teacher_infirmary_access === false) return false;
        if ((tabId === 'attendance' || tabId === 'mobile_checkin') && schoolPermissions.teacher_attendance === false) return false;
        if (tabId === 'homework' && schoolPermissions.teacher_homework === false) return false;
      }
      if (currentRole === 'student') {
        if ((tabId === 'attendance' || tabId === 'mobile_checkin') && schoolPermissions.student_self_checkin === false) return false;
        if (tabId === 'homework' && schoolPermissions.student_submit_homework === false) return false;
        if (tabId === 'gradebook' && schoolPermissions.student_view_grades === false) return false;
      }
    }
    return true;
  };

  const quickTools = useMemo(() => {
    if (isDeveloperPlatformMode) {
      const devSuggestions: NavTab[] = [
        'super_admin_approvals',
        'super_admin_schools',
        'super_admin_packages',
        'super_admin_audit',
      ];
      return devSuggestions
        .filter((id) => isAllowedTool(id))
        .map((id) => TOOL_CATALOG[id]);
    }
    if (programMode !== 'school_erp') {
      const lmsSuggestions: NavTab[] = ['timetable', 'homework', 'gradebook'];
      return lmsSuggestions
        .filter((id) => isAllowedTool(id))
        .slice(0, 3)
        .map((id) => TOOL_CATALOG[id]);
    }

    const candidates = isSimplifiedAdmin
      ? (['dashboard', 'students', 'courses', 'attendance'] as NavTab[])
      : getContextualClusterIds(currentTab, currentRole);
    return candidates
      .filter((id) => isAllowedTool(id))
      .slice(0, 4)
      .map((id) => TOOL_CATALOG[id]);
  }, [isDeveloperPlatformMode, currentTab, currentRole, programMode, featureFlags, schoolPermissions, isSimplifiedAdmin]);

  const activeTitle = useMemo(() => {
    if (programMode === 'lms_classroom') {
      return lang === 'th' ? 'ห้องเรียนออนไลน์ (LMS)' : 'Virtual Classroom (LMS)';
    }
    if (programMode === 'parent_portal') {
      return lang === 'th' ? 'พอร์ทัลผู้ปกครอง' : 'Parent Portal';
    }
    const catalogHit = TOOL_CATALOG[currentTab];
    if (catalogHit) return lang === 'th' ? catalogHit.labelTh : catalogHit.labelEn;
    const extraHit = EXTRA_ACTIVE_LABELS[currentTab];
    if (extraHit) return lang === 'th' ? extraHit.th : extraHit.en;
    return lang === 'th' ? 'พื้นที่ทำงานโฟกัส' : 'Focused Workspace';
  }, [programMode, currentTab, lang]);

  const normalizedActiveToolId: NavTab = useMemo(() => {
    if (
      currentTab === 'school_gps' ||
      currentTab === 'school_permissions' ||
      currentTab === 'admin_line_control' ||
      currentTab === 'admin_student_accounts' ||
      currentTab === 'admin_saas_audit'
    ) {
      return 'system_settings';
    }
    if (
      currentTab === 'obec_executive_dashboard' ||
      currentTab === 'pp6_executive_dashboard' ||
      currentTab === 'report_insights'
    ) {
      return 'executive_monitor';
    }
    return currentTab;
  }, [currentTab]);

  const homeTargetTab: NavTab = isDeveloperPlatformMode ? 'super_admin_console' : 'dashboard';
  const canGoHome = programMode !== 'school_erp' || currentTab !== homeTargetTab;
  const activeTone = getModuleTone(currentTab);
  const activeGroupMeta = getModuleGroupMeta(currentTab);

  return (
    <div
      role="region"
      aria-label={lang === 'th' ? 'แถบเครื่องมือโหมดโฟกัส' : 'Focus mode toolbar'}
      className={`${activeTone} no-print mb-3 sm:mb-4 rounded-xl border border-[color-mix(in_srgb,var(--tone)_24%,var(--color-border))] bg-[var(--color-card)] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5`}
    >
      {/* Left: Active task context & quick home escape */}
      <div className="flex items-center gap-2.5 min-w-0">
        {canGoHome && (
          <>
            <button
              type="button"
              onClick={() => {
                if (programMode !== 'school_erp') {
                  onChangeProgramMode('school_erp');
                }
                onNavigateTab(homeTargetTab);
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>{isDeveloperPlatformMode ? (lang === 'th' ? 'ศูนย์ควบคุม' : 'Console') : (lang === 'th' ? 'หน้าหลัก' : 'Home')}</span>
            </button>
            <span className="h-4 w-px bg-[var(--color-border)] shrink-0" aria-hidden="true" />
          </>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--tone-soft)] text-[var(--tone)] shrink-0">
            {programMode === 'lms_classroom' ? (
              <MonitorPlay className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Focus className="w-3.5 h-3.5 shrink-0" />
            )}
          </span>
          <span className="text-[11px] font-bold text-[var(--tone)] whitespace-nowrap shrink-0 hidden sm:inline">
            {activeGroupMeta.code} · {lang === 'th' ? activeGroupMeta.labelTh : activeGroupMeta.labelEn}
            <span className="mx-1.5 text-[var(--color-text-muted)]" aria-hidden="true">/</span>
          </span>
          <span className="text-[13px] font-bold text-[var(--color-text-title)] truncate">
            {activeTitle}
          </span>
        </div>
      </div>

      {/* Center / Right: Contextual tools relevant ONLY to current work + Exit Focus */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0 max-w-full">
        {quickTools.length > 0 && (
          <div className="seg-tab-group overflow-x-auto no-scrollbar max-w-full">
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              const isCurrent = programMode === 'school_erp' && normalizedActiveToolId === tool.id;
              const toolTone = getModuleTone(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  data-active={isCurrent}
                  onClick={() => {
                    if (programMode !== 'school_erp') {
                      onChangeProgramMode('school_erp');
                    }
                    onNavigateTab(tool.id);
                  }}
                  className={`${toolTone} seg-tab-btn whitespace-nowrap shrink-0`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
                  <span>{lang === 'th' ? tool.labelTh : tool.labelEn}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onExitFocusMode}
          title={lang === 'th' ? 'ออกจากโหมดโฟกัส (Ctrl+Shift+F)' : 'Exit Focus Mode (Ctrl+Shift+F)'}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)] transition cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
        >
          <X className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'th' ? 'ออกจากโฟกัส' : 'Exit Focus'}</span>
        </button>
      </div>
    </div>
  );
};
