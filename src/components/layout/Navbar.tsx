import React, { useEffect, useRef, useState } from 'react';
import { UserRole, SystemConfig, AppProgramMode, AppLanguage, AppTheme, School, AuthUser, ThemePalette, Course, GradeRecord, Student, Teacher, SchoolFeatureFlags } from '../../types';
import {
  Globe,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Smartphone,
  Menu,
  HelpCircle,
  FileSpreadsheet,
  Bell,
  User,
  ShieldCheck,
  GraduationCap,
  Building2,
  MonitorPlay,
  Users,
  Check,
  Sparkles,
  Mail,
  CreditCard,
  BookOpen,
  Focus,
  Eye,
  EyeOff,
  MoreVertical,
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';
import { UnifiedNavbarSearch } from './UnifiedNavbarSearch';
import { BaanPakKruLogo } from '../common/BaanPakKruLogo';
import type { NavTab } from './Sidebar';
import type { SuperAdminSubTab } from '../../features/navigation/useTabNavigation';
import { isAllowedProgramModeForRole } from '../../lib/attendanceScope';
import { isProgramModeEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getModuleGroupMeta, getModuleTone, MODULE_TONE_MAP } from '../../lib/moduleTheme';

interface NavbarProps {
  currentTab?: string;
  superAdminSubTab?: SuperAdminSubTab;
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
  isSuperAdminSchoolView: boolean;
  systemConfig: SystemConfig;
  unreadCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  programMode: AppProgramMode;
  setProgramMode: (mode: AppProgramMode) => void;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  themePalette: ThemePalette;
  setThemePalette: (palette: ThemePalette) => void;
  onOpenSchoolSwitcher: () => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
  onOpenProfile?: () => void;
  onOpenGuide?: (roleTab?: 'all' | 'student' | 'teacher') => void;
  onOpenLoginGuide?: () => void;
  onOpenImportExport?: () => void;
  onOpenOnboardingTutor?: () => void;
  onSwitchToMobileMode?: () => void;
  onOpenNotifications?: () => void;
  coordinationUnreadCount?: number;
  onOpenCoordinationDesk?: () => void;
  onOpenExamPaymentSettings?: () => void;
  students?: Student[];
  teachers?: Teacher[];
  courses?: Course[];
  grades?: GradeRecord[];
  onOpenStudentProfile?: (student: Student) => void;
  onOpenReportCard?: (student: Student) => void;
  onNavigateTab?: (tab: NavTab) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  featureFlags?: SchoolFeatureFlags;
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  isMascotHidden?: boolean;
  onToggleMascotHidden?: () => void;
}

const buildInitialsAvatar = (name?: string) => {
  const ch = encodeURIComponent(((name || 'U').trim().charAt(0) || 'U').toUpperCase());
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23e2e8f0"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="%23334155">${ch}</text></svg>`;
};

const WORKSPACE_MODES = [
  {
    id: 'school_erp',
    tone: 'tone-1',
    th: 'บริหารโรงเรียน',
    en: 'School SIS',
    descTh: 'งานทะเบียน เช็คชื่อ ตารางสอน เกรด ปพ.',
    descEn: 'Attendance, timetable, grading & admin',
    icon: Building2,
  },
  {
    id: 'lms_classroom',
    tone: 'tone-2',
    th: 'ห้องเรียน LMS',
    en: 'Virtual LMS',
    descTh: 'บทเรียนวิดีโอ ชีทสรุป และส่งการบ้าน',
    descEn: 'Video lessons, materials & homework',
    icon: MonitorPlay,
  },
  {
    id: 'parent_portal',
    tone: 'tone-6',
    th: 'ผู้ปกครอง',
    en: 'Parent Portal',
    descTh: 'ติดตามเวลาเรียน ผลการเรียน และค่าเทอม',
    descEn: 'Track attendance, grades & tuition',
    icon: Users,
  },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  superAdminSubTab = 'approvals',
  currentUser,
  activeSchool,
  currentRole,
  isSuperAdminSchoolView,
  searchQuery,
  setSearchQuery,
  programMode,
  setProgramMode,
  lang,
  setLang,
  themePalette,
  setThemePalette,
  onOpenSchoolSwitcher,
  onLogout,
  onToggleMobileMenu,
  onOpenProfile,
  onOpenGuide,
  onOpenLoginGuide,
  onOpenImportExport,
  onOpenOnboardingTutor,
  onSwitchToMobileMode,
  unreadCount = 0,
  onOpenNotifications,
  coordinationUnreadCount = 0,
  onOpenCoordinationDesk,
  onOpenExamPaymentSettings,
  students = [],
  teachers = [],
  courses = [],
  grades = [],
  onOpenStudentProfile,
  onOpenReportCard,
  onNavigateTab,
  focusMode = false,
  onToggleFocusMode,
  featureFlags,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
  isMascotHidden = false,
  onToggleMascotHidden,
}) => {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';
  const isDeveloperPlatformMode = currentRole === 'super_admin' && !isSuperAdminSchoolView;
  const canAccessSchoolOperations = !isDeveloperPlatformMode;
  const canSwitchSchool = currentRole === 'super_admin';
  const allowedWorkspaceModes = WORKSPACE_MODES
    .map((mode) =>
      currentRole === 'student' && mode.id === 'school_erp'
        ? { ...mode, th: 'หน้าหลักนักเรียน', en: 'Student Home' }
        : mode
    )
    .filter(
      (mode) =>
        isAllowedProgramModeForRole(currentRole, mode.id) &&
        isProgramModeEnabledByFeatureFlags(mode.id, featureFlags)
    );

  const activeWorkspaceMode =
    allowedWorkspaceModes.find((m) => m.id === programMode) || allowedWorkspaceModes[0];
  const ActiveWorkspaceIcon = activeWorkspaceMode?.icon || Building2;
  const subTabToNavTab: Record<SuperAdminSubTab, NavTab> = {
    approvals: 'super_admin_approvals',
    schools: 'super_admin_schools',
    packages: 'super_admin_packages',
    promotions: 'super_admin_promotions',
    permissions: 'super_admin_permissions',
    central_exams: 'super_admin_central_exams',
    exam_payment: 'super_admin_exam_payment',
    audit_logs: 'super_admin_audit',
  };
  const effectiveTabForTone =
    isDeveloperPlatformMode && currentTab === 'super_admin_console'
      ? subTabToNavTab[superAdminSubTab]
      : currentTab;
  const activeTabKey =
    effectiveTabForTone && effectiveTabForTone in MODULE_TONE_MAP
      ? (effectiveTabForTone as NavTab)
      : null;
  const activeGroupMeta = activeTabKey ? getModuleGroupMeta(activeTabKey) : null;
  const activeModuleTone = activeTabKey ? getModuleTone(activeTabKey) : 'tone-1';

  useEffect(() => {
    if (!isWorkspaceMenuOpen && !isToolsMenuOpen && !isAccountMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isWorkspaceMenuOpen && workspaceMenuRef.current && !workspaceMenuRef.current.contains(target)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (isToolsMenuOpen && toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setIsToolsMenuOpen(false);
      }
      if (isAccountMenuOpen && accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsWorkspaceMenuOpen(false);
        setIsToolsMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWorkspaceMenuOpen, isToolsMenuOpen, isAccountMenuOpen]);

  const roleLabelMap: Record<UserRole, { th: string; en: string }> = {
    super_admin: { th: 'ผู้ดูแลระบบแม่ข่าย', en: 'Super Admin' },
    admin: { th: 'ผู้บริหารโรงเรียน', en: 'Admin' },
    teacher: { th: 'อาจารย์', en: 'Teacher' },
    student: { th: 'นักเรียน', en: 'Student' },
    parent: { th: 'ผู้ปกครอง', en: 'Parent' },
  };

  const displayName =
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const showImportExportAction =
    currentTab !== 'students' &&
    currentTab !== 'teachers' &&
    currentTab !== 'courses' &&
    canAccessSchoolOperations &&
    Boolean(onOpenImportExport) &&
    ['super_admin', 'admin', 'teacher'].includes(currentRole);

  const hasGuideItems =
    (canAccessSchoolOperations && Boolean(onOpenGuide)) ||
    Boolean(onOpenOnboardingTutor) ||
    Boolean(onOpenLoginGuide) ||
    Boolean(onToggleMascotHidden);

  const hasSystemToolsItems =
    Boolean(onSwitchToMobileMode) ||
    showImportExportAction ||
    ((canAccessSchoolOperations || currentRole === 'super_admin') && Boolean(onOpenCoordinationDesk)) ||
    Boolean(onOpenExamPaymentSettings) ||
    Boolean(onToggleFocusMode);

  return (
    <header className="app-topbar h-14 border-b border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] sticky top-0 z-30 px-2 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-4 w-full max-w-full">
      {/* Zone 1: Brand + School Context / Developer Mode Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] active:scale-95 transition cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
            aria-label={lang === 'th' ? 'เปิดเมนู' : 'Open menu'}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <BaanPakKruLogo size={26} />
          <span className="hidden sm:inline font-bold text-[15px] sm:text-base tracking-tight text-[var(--color-text-title)] whitespace-nowrap shrink-0">
            BaanPakKru
          </span>
        </div>

        {isDeveloperPlatformMode && (
          <>
            <span className="hidden sm:inline h-5 w-px bg-[var(--color-border)] select-none" aria-hidden="true" />
            <span className="tone-7 hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[var(--tone-soft)] border border-[color-mix(in_srgb,var(--tone)_24%,transparent)] text-[12px] font-bold text-[var(--tone)] whitespace-nowrap shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'โหมดผู้พัฒนาระบบ' : 'Developer Console'}</span>
            </span>
            {!focusMode && (
              <button
                type="button"
                data-guide-id="nav-school-switcher"
                onClick={onOpenSchoolSwitcher}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
                title={lang === 'th' ? 'เลือกโรงเรียนเพื่อเข้าตรวจสอบข้อมูล' : 'Select a school to inspect'}
              >
                <Building2 className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'เข้าตรวจสอบโรงเรียน' : 'Inspect School'}</span>
              </button>
            )}
          </>
        )}

        {canAccessSchoolOperations && (
          <>
            <span className="hidden sm:inline h-5 w-px bg-[var(--color-border)] select-none" aria-hidden="true" />
            {canSwitchSchool && !focusMode ? (
              <button
                type="button"
                data-guide-id="nav-school-switcher"
                onClick={onOpenSchoolSwitcher}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] text-[13px] font-medium transition min-w-0 max-w-[120px] sm:max-w-[200px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
                title={lang === 'th' ? 'สลับโรงเรียน' : 'Switch School'}
              >
                <span className="truncate">{lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}</span>
                <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              </button>
            ) : (
              <span
                className="hidden sm:inline-flex items-center px-1.5 py-1 text-[13px] font-medium text-[var(--color-text-body)] min-w-0 max-w-[150px] lg:max-w-[220px] truncate"
                title={lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
              >
                <span className="truncate">{lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}</span>
              </span>
            )}
          </>
        )}

        {/* Consolidated Workspace Mode Dropdown (Replaces multi-tab horizontal bar) */}
        {canAccessSchoolOperations && !focusMode && allowedWorkspaceModes.length > 1 && activeWorkspaceMode && (
          <div ref={workspaceMenuRef} className={`${activeWorkspaceMode.tone} relative shrink-0 ml-0.5 sm:ml-1`}>
            <button
              type="button"
              data-guide-id={`nav-program-${programMode}`}
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="menu"
              aria-label={lang === 'th' ? 'สลับโหมดการทำงาน' : 'Switch workspace mode'}
              onClick={() => {
                setIsWorkspaceMenuOpen((prev) => !prev);
                setIsToolsMenuOpen(false);
                setIsAccountMenuOpen(false);
              }}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--tone-soft)]/75 hover:bg-[var(--tone-soft)] border border-[color-mix(in_srgb,var(--tone)_22%,var(--color-border))] text-[13px] font-semibold text-[var(--color-text-title)] transition cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tone)]/40"
            >
              <ActiveWorkspaceIcon className="w-4 h-4 text-[var(--tone)] shrink-0" />
              <span className="hidden xs:inline sm:inline">
                {lang === 'th' ? activeWorkspaceMode.th : activeWorkspaceMode.en}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-150 ${
                  isWorkspaceMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isWorkspaceMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] space-y-1 animate-in fade-in duration-100"
              >
                <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'สลับโหมดระบบ' : 'Workspace Mode'}
                </div>
                {allowedWorkspaceModes.map((mode) => {
                  const Icon = mode.icon;
                  const active = programMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      data-guide-id={`nav-program-${mode.id}`}
                      onClick={() => {
                        setProgramMode(mode.id);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`${mode.tone} w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition cursor-pointer ${
                        active
                          ? 'bg-[var(--tone-soft)] text-[var(--tone)]'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          active ? 'bg-[var(--color-card)] text-[var(--tone)] shadow-2xs' : 'bg-[var(--tone-soft)]/70 text-[var(--tone)]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold truncate">
                            {lang === 'th' ? mode.th : mode.en}
                          </span>
                          {active && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                        <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-muted)] line-clamp-2">
                          {lang === 'th' ? mode.descTh : mode.descEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Active Functional Work Group Context Cue */}
        {!focusMode && programMode === 'school_erp' && activeGroupMeta && (
          <div
            title={lang === 'th' ? activeGroupMeta.meaningTh : activeGroupMeta.meaningEn}
            className={`${activeModuleTone} hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--tone-soft)]/75 border border-[color-mix(in_srgb,var(--tone)_22%,transparent)] text-[11px] font-bold text-[var(--tone)] whitespace-nowrap shrink-0`}
          >
            <span className="font-mono opacity-80">{activeGroupMeta.code}</span>
            <span>·</span>
            <span>{lang === 'th' ? activeGroupMeta.labelTh : activeGroupMeta.labelEn}</span>
          </div>
        )}
      </div>

      {/* Zone 2: Compact Search + Direct Focus Mode Toggle + Alerts + Account Menu */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {!focusMode && canAccessSchoolOperations && (
          <div className="hidden md:block">
            <UnifiedNavbarSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              students={students}
              teachers={teachers}
              courses={courses}
              grades={grades}
              activeSchool={activeSchool}
              gradingSystem={activeSchool.gradingSystem}
              currentRole={currentRole}
              isSuperAdminSchoolView={isSuperAdminSchoolView}
              currentUser={currentUser}
              currentStudentRecordId={currentUser?.studentRecordId}
              featureFlags={featureFlags}
              lang={lang}
              onOpenStudentProfile={onOpenStudentProfile}
              onOpenReportCard={onOpenReportCard}
              onNavigateTab={onNavigateTab}
            />
          </div>
        )}

        {!focusMode && onOpenNotifications && (
          <button
            type="button"
            data-guide-id="nav-notifications"
            onClick={onOpenNotifications}
            className="relative w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
            aria-label={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            title={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
          >
            <Bell className="w-[18px] h-[18px]" />
            {(unreadCount > 0 || coordinationUnreadCount > 0) && (
              <span className="absolute top-2 right-2.5 sm:top-1.5 sm:right-2 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-[var(--color-card)]" />
            )}
          </button>
        )}

        {/* Consolidated 3-Dot System Tools, Guides, Import/Export & Display Preferences Menu */}
        <div ref={toolsMenuRef} data-guide-id="nav-tools-menu" className="relative">
          <button
            type="button"
            aria-expanded={isToolsMenuOpen}
            aria-haspopup="menu"
            aria-label={lang === 'th' ? 'เครื่องมือและการตั้งค่าระบบ' : 'System tools & settings'}
            title={lang === 'th' ? 'เครื่องมือ คู่มือ และการตั้งค่า' : 'Tools, guides & settings'}
            onClick={() => {
              setIsToolsMenuOpen((prev) => !prev);
              setIsWorkspaceMenuOpen(false);
              setIsAccountMenuOpen(false);
            }}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
              isToolsMenuOpen
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                : 'border-transparent hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <MoreVertical className="w-[18px] h-[18px]" />
            {coordinationUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-[var(--color-card)]" />
            )}
          </button>

          {isToolsMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 max-h-[82vh] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] space-y-1 animate-in fade-in duration-100"
            >
              {hasSystemToolsItems && (
                <div className="space-y-0.5 pb-1.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'จัดการระบบ & นำเข้า/ส่งออก' : 'System & Data Tools'}
                  </div>

                  {showImportExportAction && onOpenImportExport && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenImportExport();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{lang === 'th' ? 'นำเข้า / ส่งออก Excel' : 'Import / Export'}</span>
                    </button>
                  )}

                  {(canAccessSchoolOperations || currentRole === 'super_admin') && onOpenCoordinationDesk && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenCoordinationDesk();
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-[var(--color-text-muted)]" />
                        <span>{lang === 'th' ? 'ประสานงานส่วนกลาง' : 'Coordination Desk'}</span>
                      </span>
                      {coordinationUnreadCount > 0 && (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {coordinationUnreadCount}
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenExamPaymentSettings && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenExamPaymentSettings();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{lang === 'th' ? 'ตั้งค่าชำระเงินคลังข้อสอบ' : 'Exam Payment Settings'}</span>
                    </button>
                  )}

                  {onSwitchToMobileMode && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onSwitchToMobileMode();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <Smartphone className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{lang === 'th' ? 'สลับเป็นมุมมองมือถือ' : 'Mobile View'}</span>
                    </button>
                  )}

                  {onToggleFocusMode && (
                    <button
                      type="button"
                      role="menuitem"
                      data-guide-id="nav-focus-toggle"
                      aria-pressed={focusMode}
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onToggleFocusMode();
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Focus className={`h-4 w-4 shrink-0 ${focusMode ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'}`} />
                        <span className="truncate">{lang === 'th' ? 'โหมดโฟกัส (Focus Mode)' : 'Focus Mode'}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Ctrl+Shift+F</span>
                        {focusMode && <Check className="h-4 w-4 text-[var(--color-primary-text)]" />}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {hasGuideItems && (
                <div className="pt-1.5 border-t border-[var(--color-border)] space-y-0.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'คู่มือและตัวช่วย' : 'Guides & Assistance'}
                  </div>

                  {canAccessSchoolOperations && onOpenGuide && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenGuide(currentRole === 'student' || currentRole === 'parent' ? 'student' : 'teacher');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <HelpCircle className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{lang === 'th' ? 'คู่มือการใช้งานระบบ' : 'User Guide'}</span>
                    </button>
                  )}

                  {onOpenOnboardingTutor && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenOnboardingTutor();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{lang === 'th' ? 'ติวเตอร์แนะนำระบบ' : 'System Tutor'}</span>
                    </button>
                  )}

                  {onOpenLoginGuide && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenLoginGuide();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{lang === 'th' ? 'คู่มือการเข้าสู่ระบบ' : 'Login Guide'}</span>
                    </button>
                  )}

                  {onToggleMascotHidden && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onToggleMascotHidden();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                    >
                      {isMascotHidden ? (
                        <Eye className="h-4 w-4 shrink-0 text-[var(--color-primary-text)]" />
                      ) : (
                        <EyeOff className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                      )}
                      <span className="truncate">
                        {isMascotHidden
                          ? lang === 'th'
                            ? 'แสดงการ์ตูนนำทาง (ชาโค & หมี)'
                            : 'Show Mascot Guide'
                          : lang === 'th'
                            ? 'ซ่อนการ์ตูนนำทาง (ชาโค & หมี)'
                            : 'Hide Mascot Guide'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              <div className="px-3 py-2.5 border-t border-[var(--color-border)] space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'การตั้งค่าการแสดงผล' : 'Display Settings'}
                </div>
                <div data-guide-id="nav-theme-toggle" className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[var(--color-text-body)]">
                    {lang === 'th' ? 'ธีมสี' : 'Theme'}
                  </span>
                  <div className="flex items-center p-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
                    <button
                      type="button"
                      onClick={() => setThemePalette('light_warm')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                        isLight ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'สว่าง' : 'Light'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePalette('sapphire')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                        !isLight ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'มืด' : 'Dark'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[var(--color-text-body)]">
                    {lang === 'th' ? 'ภาษา' : 'Language'}
                  </span>
                  <button
                    type="button"
                    data-guide-id="nav-lang-toggle"
                    onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-semibold cursor-pointer transition"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
                  </button>
                </div>

                {!focusMode && (
                  <div className="pt-1">
                    <PWAInstallButton lang={lang} variant="nav" className="w-full justify-center py-2 text-xs" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Streamlined Account Menu */}
        <div ref={accountMenuRef} className="relative">
          <button
            type="button"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
            aria-label={lang === 'th' ? 'บัญชีผู้ใช้' : 'User account'}
            onClick={() => {
              setIsAccountMenuOpen((prev) => !prev);
              setIsWorkspaceMenuOpen(false);
              setIsToolsMenuOpen(false);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-xl p-1 sm:pl-1 sm:pr-2 hover:bg-[var(--color-card-subtle)] transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
          >
            <img
              src={currentUser?.avatarUrl || buildInitialsAvatar(displayName)}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--color-card)] border border-[var(--color-border)] shrink-0"
            />
            <span className="hidden sm:inline text-[13px] font-medium text-[var(--color-text-title)] truncate max-w-[110px]">
              {displayName.split(' ')[0]}
            </span>
            <ChevronDown
              className={`hidden sm:block h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-150 ${
                isAccountMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isAccountMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 max-h-[82vh] w-[min(17.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] space-y-1 animate-in fade-in duration-100"
            >
              <div className="flex items-center gap-3 px-3 py-3 border-b border-[var(--color-border)] mb-1">
                <img
                  src={currentUser?.avatarUrl || buildInitialsAvatar(displayName)}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-title)] truncate">{displayName}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {roleLabelMap[currentRole]?.[lang] || currentRole}
                  </p>
                </div>
              </div>

              {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
                <div className="px-2 py-2.5 border-b border-[var(--color-border)] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-1">
                    {lang === 'th' ? 'สลับโหมดปฏิบัติงาน' : 'Operational Role Mode'}
                  </p>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onSwitchOperationalRole('admin');
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-bold cursor-pointer transition ${
                        currentRole === 'admin'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{lang === 'th' ? 'โหมด Admin' : 'Admin'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onSwitchOperationalRole('teacher');
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-bold cursor-pointer transition ${
                        currentRole === 'teacher'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 shrink-0" />
                      <span>{lang === 'th' ? 'โหมดครู' : 'Teacher'}</span>
                    </button>
                  </div>
                </div>
              )}

              {onOpenProfile && (
                <button
                  type="button"
                  data-guide-id="nav-profile"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 sm:py-2 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                >
                  <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <span>{lang === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</span>
                </button>
              )}

              <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 sm:py-2 text-left text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
