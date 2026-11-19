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
  Maximize2,
  Minimize2,
  User,
  ShieldCheck,
  GraduationCap,
  Building2,
  MonitorPlay,
  Users,
  Check,
  Wrench,
  Sparkles,
  Mail,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';
import { UnifiedNavbarSearch } from './UnifiedNavbarSearch';
import { BaanPakKruLogo } from '../common/BaanPakKruLogo';
import { isAllowedProgramModeForRole } from '../../lib/attendanceScope';
import { isProgramModeEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';

interface NavbarProps {
  currentTab?: string;
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
  onNavigateTab?: (tab: 'students' | 'teachers' | 'courses' | 'gradebook') => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  featureFlags?: SchoolFeatureFlags;
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
}

const buildInitialsAvatar = (name?: string) => {
  const ch = encodeURIComponent(((name || 'U').trim().charAt(0) || 'U').toUpperCase());
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23e2e8f0"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="%23334155">${ch}</text></svg>`;
};

const WORKSPACE_MODES = [
  {
    id: 'school_erp',
    th: 'บริหารโรงเรียน',
    en: 'School SIS',
    descTh: 'งานทะเบียน เช็คชื่อ ตารางสอน เกรด ปพ.',
    descEn: 'Attendance, timetable, grading & admin',
    icon: Building2,
  },
  {
    id: 'lms_classroom',
    th: 'ห้องเรียน LMS',
    en: 'Virtual LMS',
    descTh: 'บทเรียนวิดีโอ ชีทสรุป และส่งการบ้าน',
    descEn: 'Video lessons, materials & homework',
    icon: MonitorPlay,
  },
  {
    id: 'parent_portal',
    th: 'ผู้ปกครอง',
    en: 'Parent Portal',
    descTh: 'ติดตามเวลาเรียน ผลการเรียน และค่าเทอม',
    descEn: 'Track attendance, grades & tuition',
    icon: Users,
  },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
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
}) => {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isToolsGroupOpen, setIsToolsGroupOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';
  const canAccessSchoolOperations = currentRole !== 'super_admin' || isSuperAdminSchoolView;
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

  useEffect(() => {
    if (!isWorkspaceMenuOpen && !isAccountMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isWorkspaceMenuOpen && workspaceMenuRef.current && !workspaceMenuRef.current.contains(target)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (isAccountMenuOpen && accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsWorkspaceMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWorkspaceMenuOpen, isAccountMenuOpen]);

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

  const hasMoreToolsItems =
    Boolean(onSwitchToMobileMode) ||
    showImportExportAction ||
    (canAccessSchoolOperations && Boolean(onOpenGuide)) ||
    Boolean(onOpenOnboardingTutor) ||
    Boolean(onOpenLoginGuide) ||
    (canAccessSchoolOperations && Boolean(onOpenCoordinationDesk)) ||
    Boolean(onOpenExamPaymentSettings) ||
    !focusMode;

  return (
    <header className="h-12 border-b border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] sticky top-0 z-30 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full">
      {/* Zone 1: Brand + School Context + Consolidated Workspace Mode Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer shrink-0"
            aria-label={lang === 'th' ? 'เปิดเมนู' : 'Open menu'}
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <BaanPakKruLogo size={22} />
          <span className="font-bold text-sm tracking-tight text-[var(--color-text-title)] whitespace-nowrap shrink-0">
            BaanPakKru
          </span>
        </div>

        {canAccessSchoolOperations && (
          <>
            <span className="hidden sm:inline text-[var(--color-border)] select-none">/</span>
            {canSwitchSchool ? (
              <button
                type="button"
                data-guide-id="nav-school-switcher"
                onClick={onOpenSchoolSwitcher}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] text-xs font-medium transition min-w-0 max-w-[120px] sm:max-w-[175px] cursor-pointer"
                title={lang === 'th' ? 'สลับโรงเรียน' : 'Switch School'}
              >
                <span className="truncate">{lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
              </button>
            ) : (
              <span
                className="hidden sm:inline-flex items-center px-1.5 py-1 text-xs font-medium text-[var(--color-text-body)] min-w-0 max-w-[150px] lg:max-w-[180px] truncate"
                title={lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
              >
                <span className="truncate">{lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}</span>
              </span>
            )}
          </>
        )}

        {/* Consolidated Workspace Mode Dropdown (Replaces multi-tab horizontal bar) */}
        {canAccessSchoolOperations && !focusMode && allowedWorkspaceModes.length > 1 && activeWorkspaceMode && (
          <div ref={workspaceMenuRef} className="relative shrink-0 ml-0.5 sm:ml-1">
            <button
              type="button"
              data-guide-id={`nav-program-${programMode}`}
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="menu"
              aria-label={lang === 'th' ? 'สลับโหมดการทำงาน' : 'Switch workspace mode'}
              onClick={() => {
                setIsWorkspaceMenuOpen((prev) => !prev);
                setIsAccountMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)]/50 hover:border-[var(--color-primary)]/40 text-xs font-semibold text-[var(--color-text-title)] transition cursor-pointer whitespace-nowrap"
            >
              <ActiveWorkspaceIcon className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
              <span className="hidden xs:inline sm:inline">
                {lang === 'th' ? activeWorkspaceMode.th : activeWorkspaceMode.en}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-150 ${
                  isWorkspaceMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isWorkspaceMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-xl space-y-0.5 animate-in fade-in duration-100"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
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
                      className={`w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                        active
                          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          active ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate">
                            {lang === 'th' ? mode.th : mode.en}
                          </span>
                          {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate">
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
      </div>

      {/* Zone 2: Compact Search + Alerts + Unified Account & Tools Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {canAccessSchoolOperations && (
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
              currentUser={currentUser}
              currentStudentRecordId={currentUser?.studentRecordId}
              lang={lang}
              onOpenStudentProfile={onOpenStudentProfile}
              onOpenReportCard={onOpenReportCard}
              onNavigateTab={onNavigateTab}
            />
          </div>
        )}

        {focusMode && onToggleFocusMode && (
          <button
            type="button"
            onClick={onToggleFocusMode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Minimize2 className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'ปิดโฟกัส' : 'Exit Focus'}</span>
          </button>
        )}

        {!focusMode && onOpenNotifications && (
          <button
            type="button"
            data-guide-id="nav-notifications"
            onClick={onOpenNotifications}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] transition cursor-pointer"
            aria-label={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            title={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {(unreadCount > 0 || coordinationUnreadCount > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600" />
            )}
          </button>
        )}

        {/* Unified Controlled Account, Preferences & Secondary Tools Menu */}
        <div ref={accountMenuRef} data-guide-id="nav-tools-menu" className="relative">
          <button
            type="button"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
            aria-label={lang === 'th' ? 'บัญชีและการตั้งค่า' : 'Account & preferences'}
            onClick={() => {
              setIsAccountMenuOpen((prev) => !prev);
              setIsWorkspaceMenuOpen(false);
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-[var(--color-card-subtle)] transition whitespace-nowrap"
          >
            <img
              src={currentUser?.avatarUrl || buildInitialsAvatar(displayName)}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-6.5 h-6.5 rounded-full object-cover border border-[var(--color-border)] shrink-0"
            />
            <span className="hidden sm:inline text-xs font-medium text-[var(--color-text-title)] truncate max-w-[100px]">
              {displayName.split(' ')[0]}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          </button>

          {isAccountMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1.5 max-h-[82vh] w-68 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-xl space-y-1 animate-in fade-in duration-100"
            >
              <div className="px-2.5 py-2 border-b border-[var(--color-border)]">
                <p className="text-xs font-semibold text-[var(--color-text-title)] truncate">{displayName}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {roleLabelMap[currentRole]?.[lang] || currentRole}
                </p>
              </div>

              {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
                <div className="px-2 py-2 border-b border-[var(--color-border)] space-y-1.5">
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)] px-0.5">
                    {lang === 'th' ? 'สลับโหมดปฏิบัติงาน' : 'Operational Role Mode'}
                  </p>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onSwitchOperationalRole('admin');
                      }}
                      className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 font-bold cursor-pointer transition ${
                        currentRole === 'admin'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'th' ? 'โหมด Admin' : 'Admin'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onSwitchOperationalRole('teacher');
                      }}
                      className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 font-bold cursor-pointer transition ${
                        currentRole === 'teacher'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
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
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <span>{lang === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</span>
                </button>
              )}

              <div className="px-2.5 py-2 border-t border-[var(--color-border)] space-y-2">
                <div data-guide-id="nav-theme-toggle" className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--color-text-body)]">
                    {lang === 'th' ? 'ธีมสี' : 'Theme'}
                  </span>
                  <div className="flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
                    <button
                      type="button"
                      onClick={() => setThemePalette('light_warm')}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                        isLight ? 'bg-[var(--color-card)] text-[var(--color-text-title)]' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      <Sun className="w-3 h-3" />
                      <span>{lang === 'th' ? 'สว่าง' : 'Light'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePalette('sapphire')}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                        !isLight ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      <Moon className="w-3 h-3" />
                      <span>{lang === 'th' ? 'มืด' : 'Dark'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--color-text-body)]">
                    {lang === 'th' ? 'ภาษา' : 'Language'}
                  </span>
                  <button
                    type="button"
                    data-guide-id="nav-lang-toggle"
                    onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-[11px] font-semibold cursor-pointer"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
                  </button>
                </div>
              </div>

              {onToggleFocusMode && (
                <button
                  type="button"
                  data-guide-id="nav-focus-toggle"
                  aria-pressed={focusMode}
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onToggleFocusMode();
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4 text-[var(--color-text-muted)]" />}
                    <span>{lang === 'th' ? 'โหมดโฟกัสเนื้อหา' : 'Focus Mode'}</span>
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {focusMode ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              {/* Collapsible Secondary Tools, Guides & Support Group */}
              {hasMoreToolsItems && (
                <div className="pt-1 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    aria-expanded={isToolsGroupOpen}
                    onClick={() => setIsToolsGroupOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>{lang === 'th' ? 'เครื่องมือและคู่มือเพิ่มเติม' : 'Tools & Guides'}</span>
                      {coordinationUnreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                          {coordinationUnreadCount}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-150 ${
                        isToolsGroupOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isToolsGroupOpen && (
                    <div className="mt-1 pl-1 space-y-0.5">
                      {onSwitchToMobileMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onSwitchToMobileMode();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                        >
                          <Smartphone className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          <span>{lang === 'th' ? 'มุมมองมือถือ' : 'Mobile View'}</span>
                        </button>
                      )}

                      {showImportExportAction && onOpenImportExport && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenImportExport();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          <span>{lang === 'th' ? 'นำเข้า / ส่งออก' : 'Import / Export'}</span>
                        </button>
                      )}

                      {canAccessSchoolOperations && onOpenCoordinationDesk && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenCoordinationDesk();
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <Mail className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                            <span>{lang === 'th' ? 'ประสานงานส่วนกลาง' : 'Coordination Desk'}</span>
                          </span>
                          {coordinationUnreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                              {coordinationUnreadCount}
                            </span>
                          )}
                        </button>
                      )}

                      {onOpenExamPaymentSettings && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenExamPaymentSettings();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          <span>{lang === 'th' ? 'ตั้งค่าชำระเงินคลังข้อสอบ' : 'Exam Payment Settings'}</span>
                        </button>
                      )}

                      {canAccessSchoolOperations && onOpenGuide && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenGuide(currentRole === 'student' || currentRole === 'parent' ? 'student' : 'teacher');
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          <span>{lang === 'th' ? 'คู่มือการใช้งาน' : 'User Guide'}</span>
                        </button>
                      )}

                      {onOpenOnboardingTutor && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenOnboardingTutor();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          <span>{lang === 'th' ? 'ติวเตอร์แนะนำระบบ' : 'System Tutor'}</span>
                        </button>
                      )}

                      {onOpenLoginGuide && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenLoginGuide();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          <span>{lang === 'th' ? 'คู่มือการเข้าสู่ระบบ' : 'Login Guide'}</span>
                        </button>
                      )}

                      {!focusMode && (
                        <div className="pt-1">
                          <PWAInstallButton lang={lang} variant="nav" className="w-full justify-center py-1.5 text-[11px]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-1 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
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
