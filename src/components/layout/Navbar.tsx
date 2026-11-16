import React from 'react';
import { UserRole, SystemConfig, AppProgramMode, AppLanguage, AppTheme, School, AuthUser, ThemePalette } from '../../types';
import { 
  GraduationCap, 
  Building2, 
  Globe, 
  LogOut, 
  ChevronDown,
  Sun,
  Moon,
  Laptop,
  Smartphone,
  Menu,
  HelpCircle,
  FileSpreadsheet,
  Sparkles,
  Bell,
  SlidersHorizontal,
  Compass,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';
import { UnifiedNavbarSearch } from './UnifiedNavbarSearch';
import { BaanPakKruLogo } from '../common/BaanPakKruLogo';
import { Course, GradeRecord, Student, Teacher } from '../../types';

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
  isMascotGuideEnabled?: boolean;
  onToggleMascotGuide?: () => void;
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
}

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
  isMascotGuideEnabled,
  onToggleMascotGuide,
  onOpenImportExport,
  onOpenOnboardingTutor,
  onSwitchToMobileMode,
  unreadCount = 0,
  onOpenNotifications,
  students = [],
  teachers = [],
  courses = [],
  grades = [],
  onOpenStudentProfile,
  onOpenReportCard,
  onNavigateTab,
  focusMode = false,
  onToggleFocusMode,
}) => {
  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';
  const canAccessSchoolOperations = currentRole !== 'super_admin' || isSuperAdminSchoolView;

  const roleLabelMap: Record<UserRole, { th: string; en: string }> = {
    super_admin: { th: 'ผู้ดูแลระบบแม่ข่าย', en: 'Super Admin' },
    admin: { th: 'ผู้บริหารโรงเรียน', en: 'Principal / Admin' },
    teacher: { th: 'อาจารย์ผู้สอน', en: 'Teacher' },
    student: { th: 'นักเรียน', en: 'Student' },
    parent: { th: 'ผู้ปกครอง', en: 'Parent' },
  };

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] sticky top-0 z-30 px-2.5 sm:px-3.5 py-1 shadow-xs transition-colors w-full max-w-full">
      {/* Single-Row Top Bar: Brand, Program Mode, Search, and User Controls */}
      <div className="flex items-center justify-between gap-2 w-full min-w-0">
        {/* Left: Mobile Menu Trigger + BaanPakKru Logo + School Switcher */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer shrink-0"
              title="เปิดเมนู"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0" title="BaanPakKru · บ้านพักครู">
            <BaanPakKruLogo size={26} />
            <span className="font-extrabold text-sm tracking-tight text-[var(--color-text-title)] whitespace-nowrap shrink-0">
              BaanPakKru
              <span className="hidden 2xl:inline font-semibold text-xs text-[var(--color-text-muted)] ml-1">
                · บ้านพักครู
              </span>
            </span>
          </div>

          {/* School Switcher */}
          {canAccessSchoolOperations && (
            <button
              type="button"
              data-guide-id="nav-school-switcher"
              onClick={onOpenSchoolSwitcher}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] text-[11px] font-medium transition min-w-0 max-w-[115px] sm:max-w-[155px] cursor-pointer"
              title={lang === 'th' ? 'สลับโรงเรียน / วิทยาเขต' : 'Switch School / Campus'}
            >
              {activeSchool.logoUrl ? (
                <img src={activeSchool.logoUrl} alt={`โลโก้${activeSchool.nameTh}`} className="w-3.5 h-3.5 rounded-xs object-contain bg-white shrink-0" />
              ) : (
                <Building2 className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
              )}
              <span className="truncate">
                {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />
            </button>
          )}
        </div>

        {/* Center: Inline Program Mode Switcher (Desktop) & Quick Search */}
        {canAccessSchoolOperations && (
          <div className="hidden md:flex flex-1 items-center justify-center gap-1.5 min-w-0 px-1">
            {!focusMode && (
              <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] shrink-0">
                <button
                  type="button"
                  data-guide-id="nav-program-school_erp"
                  onClick={() => setProgramMode('school_erp')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    programMode === 'school_erp'
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span>{lang === 'th' ? 'บริหารโรงเรียน' : 'School SIS'}</span>
                </button>

                <button
                  type="button"
                  data-guide-id="nav-program-lms_classroom"
                  onClick={() => setProgramMode('lms_classroom')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    programMode === 'lms_classroom'
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <Laptop className="w-3 h-3 shrink-0" />
                  <span>{lang === 'th' ? 'ห้องเรียน LMS' : 'Virtual LMS'}</span>
                </button>

                <button
                  type="button"
                  data-guide-id="nav-program-parent_portal"
                  onClick={() => setProgramMode('parent_portal')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    programMode === 'parent_portal'
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <Smartphone className="w-3 h-3 shrink-0" />
                  <span>{lang === 'th' ? 'ผู้ปกครอง' : 'Parent Portal'}</span>
                </button>
              </div>
            )}

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
              currentStudentRecordId={currentUser?.studentRecordId}
              lang={lang}
              onOpenStudentProfile={onOpenStudentProfile}
              onOpenReportCard={onOpenReportCard}
              onNavigateTab={onNavigateTab}
            />
          </div>
        )}

        {/* Right Controls: Focus Mode, Theme, Lang, Tools, Notifications (hidden in Focus Mode), Profile, Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleFocusMode && (
            <button
              type="button"
              data-guide-id="nav-focus-toggle"
              aria-pressed={focusMode}
              onClick={onToggleFocusMode}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                focusMode
                  ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                  : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-text-title)]'
              }`}
              title={
                focusMode
                  ? lang === 'th'
                    ? 'ออกจากโหมดโฟกัส (แสดงเมนูข้างและการแจ้งเตือน)'
                    : 'Exit Focus Mode (Ctrl+Shift+F)'
                  : lang === 'th'
                  ? 'เปิดโหมดโฟกัส: พับเมนูข้างและการแจ้งเตือนรอง (Ctrl+Shift+F)'
                  : 'Enable Focus Mode: collapse sidebar & secondary panels (Ctrl+Shift+F)'
              }
            >
              {focusMode ? (
                <Minimize2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary-text)]" />
              )}
              <span className="hidden sm:inline">
                {focusMode
                  ? lang === 'th' ? 'ปิดโฟกัส' : 'Exit Focus'
                  : lang === 'th' ? 'โหมดโฟกัส' : 'Focus'}
              </span>
            </button>
          )}

          {/* Eye-Care Theme Switcher */}
          <div data-guide-id="nav-theme-toggle" className="flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
            <button
              type="button"
              onClick={() => setThemePalette('light_warm')}
              className={`p-1 rounded transition cursor-pointer ${
                isLight ? 'bg-[var(--color-card)] text-amber-700 shadow-xs' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title="โหมดสว่างถนอมสายตา"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setThemePalette('sapphire')}
              className={`p-1 rounded transition cursor-pointer ${
                !isLight ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title="โหมดมืด"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Install Button (compact, hidden in Focus Mode to keep header calm) */}
          {!focusMode && (
            <PWAInstallButton lang={lang} variant="nav" className="hidden 2xl:inline-flex py-1 text-[11px]" />
          )}

          {/* Language Switcher */}
          <button
            type="button"
            data-guide-id="nav-lang-toggle"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            <Globe className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
            <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
          </button>

          <details
            data-guide-id="nav-tools-menu"
            className="relative"
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('button')) {
                event.currentTarget.removeAttribute('open');
              }
            }}
          >
            <summary
              aria-label={lang === 'th' ? 'เปิดเมนูเครื่องมือ' : 'Open tools menu'}
              className="flex list-none cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-body)] transition hover:bg-[var(--color-primary-light)] whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
              <span className="hidden sm:inline">{lang === 'th' ? 'เครื่องมือ' : 'Tools'}</span>
              <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-1.5 max-h-[75vh] w-60 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg">
              {onToggleMascotGuide && (
                <button
                  type="button"
                  data-guide-id="nav-guide-toggle"
                  onClick={onToggleMascotGuide}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    <span>{lang === 'th' ? 'ตัวการ์ตูนนำทาง' : 'Mascot Guide'}</span>
                  </span>
                  <span className={`text-[10px] font-bold ${isMascotGuideEnabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--color-text-muted)]'}`}>
                    {isMascotGuideEnabled ? (lang === 'th' ? 'เปิด' : 'ON') : (lang === 'th' ? 'ปิด' : 'OFF')}
                  </span>
                </button>
              )}
              {onSwitchToMobileMode && (
                <button
                  type="button"
                  onClick={onSwitchToMobileMode}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  <span>{lang === 'th' ? 'มุมมองมือถือ' : 'Mobile View'}</span>
                </button>
              )}
              {canAccessSchoolOperations && onOpenGuide && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenGuide('student')}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <GraduationCap className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                    <span>{lang === 'th' ? 'คู่มือนักเรียน (ในโมดูล)' : 'Student Guide'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenGuide('teacher')}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    <span>{lang === 'th' ? 'คู่มือคุณครู (ในโมดูล)' : 'Teacher Guide'}</span>
                  </button>
                </>
              )}
              {currentTab !== 'students' && currentTab !== 'teachers' && currentTab !== 'courses'
                && canAccessSchoolOperations
                && onOpenImportExport
                && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <button
                    type="button"
                    onClick={onOpenImportExport}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                    <span>{lang === 'th' ? 'นำเข้า/ส่งออกข้อมูล' : 'Import / Export data'}</span>
                  </button>
                )}
              {canAccessSchoolOperations && onOpenOnboardingTutor && (
                <button
                  type="button"
                  onClick={onOpenOnboardingTutor}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                  <span>{lang === 'th' ? 'ติวเตอร์ระบบ' : 'System tutor'}</span>
                </button>
              )}
            </div>
          </details>

          {/* Notification Center Trigger (collapsed in Focus Mode) */}
          {!focusMode && onOpenNotifications && (
            <button
              type="button"
              data-guide-id="nav-notifications"
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] transition cursor-pointer"
              title={lang === 'th' ? 'ศูนย์การแจ้งเตือน' : 'Notifications'}
            >
              <Bell className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1 pl-1 border-l border-[var(--color-border)]">
            <button
              type="button"
              data-guide-id="nav-profile"
              onClick={onOpenProfile}
              aria-label={lang === 'th' ? 'เปิดโปรไฟล์' : 'Open profile'}
              className="flex items-center gap-1.5 p-0.5 pr-1 rounded-lg hover:bg-[var(--color-card-subtle)] transition text-left group cursor-pointer"
              title={lang === 'th' ? 'โปรไฟล์ & ผลงาน' : 'Profile & Portfolio'}
            >
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)] shrink-0"
              />
              <div className="hidden xl:block text-left text-[11px] leading-tight">
                <div className="font-bold text-[var(--color-text-title)] truncate max-w-[96px]">
                  {currentUser?.fullNameTh?.split(' ')[0] || currentUser?.email?.split('@')[0]}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] leading-none">
                  {roleLabelMap[currentRole]?.[lang] || currentRole}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-200 transition shrink-0 cursor-pointer"
              title={lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact Program Mode Switcher on Small Screens Only (hidden during Focus Mode) */}
      {canAccessSchoolOperations && !focusMode && (
        <div className="md:hidden mt-1.5 pt-1.5 border-t border-[var(--color-border)] flex items-center justify-center overflow-x-auto no-scrollbar w-full">
          <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] shrink-0">
            <button
              type="button"
              onClick={() => setProgramMode('school_erp')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                programMode === 'school_erp'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)]'
              }`}
            >
              <Building2 className="w-3 h-3 shrink-0" />
              <span>{lang === 'th' ? 'บริหารโรงเรียน' : 'School SIS'}</span>
            </button>
            <button
              type="button"
              onClick={() => setProgramMode('lms_classroom')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                programMode === 'lms_classroom'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)]'
              }`}
            >
              <Laptop className="w-3 h-3 shrink-0" />
              <span>{lang === 'th' ? 'ห้องเรียน LMS' : 'Virtual LMS'}</span>
            </button>
            <button
              type="button"
              onClick={() => setProgramMode('parent_portal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                programMode === 'parent_portal'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)]'
              }`}
            >
              <Smartphone className="w-3 h-3 shrink-0" />
              <span>{lang === 'th' ? 'ผู้ปกครอง' : 'Parent Portal'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
