import React from 'react';
import { UserRole, SystemConfig, AppProgramMode, AppLanguage, AppTheme, School, AuthUser, ThemePalette } from '../../types';
import { 
  GraduationCap, 
  Building2, 
  Globe, 
  Search, 
  LogOut, 
  ChevronDown,
  Sun,
  Moon,
  Laptop,
  Smartphone,
  ShieldCheck,
  Menu,
  HelpCircle,
  FileSpreadsheet,
  Sparkles,
  Bell,
  Mail,
  CreditCard,
  SlidersHorizontal
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';

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
  onOpenGuide?: () => void;
  onOpenImportExport?: () => void;
  onOpenOnboardingTutor?: () => void;
  onSwitchToMobileMode?: () => void;
  onOpenNotifications?: () => void;
  coordinationUnreadCount?: number;
  onOpenCoordinationDesk?: () => void;
  onOpenExamPaymentSettings?: () => void;
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
  onOpenImportExport,
  onOpenOnboardingTutor,
  onSwitchToMobileMode,
  unreadCount = 0,
  onOpenNotifications,
  coordinationUnreadCount = 0,
  onOpenCoordinationDesk,
  onOpenExamPaymentSettings,
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
    <header className="border-b border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] sticky top-0 z-30 px-3 sm:px-4 md:px-6 py-2 shadow-xs transition-colors w-full max-w-full overflow-x-auto lg:overflow-visible no-scrollbar">
      {/* Top Row: Logo, School Name, Mobile Toggle, and User Controls */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Left: Mobile Menu Trigger + Logo + School Switcher */}
        <div className="flex items-center gap-2 min-w-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
              title="เปิดเมนู"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            {activeSchool.logoUrl ? (
              <img src={activeSchool.logoUrl} alt={`โลโก้${activeSchool.nameTh}`} className="w-full h-full object-contain bg-white" />
            ) : (
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--color-text-title)] shrink-0">
              EduVerse
            </span>

            {/* School Switcher Pill */}
            {canAccessSchoolOperations && (
              <>
                <button
                  type="button"
                  onClick={onOpenSchoolSwitcher}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] text-[11px] sm:text-xs font-medium transition min-w-0 max-w-[110px] sm:max-w-[160px] md:max-w-[200px] cursor-pointer"
                  title={lang === 'th' ? 'สลับโรงเรียน / วิทยาเขต' : 'Switch School / Campus'}
                >
                  <Building2 className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
                  <span className="truncate">
                    {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Center Search (Hidden on Mobile) */}
        {canAccessSchoolOperations && <div className="relative hidden lg:flex items-center ml-2">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหานักเรียน, วิชา, งาน...' : 'Search records...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40 xl:w-52 pl-9 pr-3 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[var(--color-primary)] transition-colors"
          />
        </div>}

        {/* Right Controls: Theme, Lang, and User Identity */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Eye-Care Theme Switcher */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
            <button
              type="button"
              onClick={() => setThemePalette('light_warm')}
              className={`p-1 rounded transition cursor-pointer ${
                isLight ? 'bg-[var(--color-card)] text-amber-700 shadow-xs' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title="ถนอมสายตา"
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

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] text-[11px] font-bold transition cursor-pointer"
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            <Globe className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
            <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
          </button>

          <details
            className="relative"
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('button')) {
                event.currentTarget.removeAttribute('open');
              }
            }}
          >
            <summary
              aria-label={lang === 'th' ? 'เปิดเมนูเครื่องมือ' : 'Open tools menu'}
              className="flex list-none cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-body)] transition hover:bg-[var(--color-primary-light)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
              <span>{lang === 'th' ? 'เครื่องมือ' : 'Tools'}</span>
              <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 max-h-[75vh] w-60 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-lg">
              {onSwitchToMobileMode && (
                <button
                  type="button"
                  onClick={onSwitchToMobileMode}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
                >
                  <Smartphone className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  <span>{lang === 'th' ? 'มุมมองมือถือ' : 'Mobile View'}</span>
                </button>
              )}
              <PWAInstallButton lang={lang} variant="sidebar" className="my-1" />
              {canAccessSchoolOperations && onOpenGuide && (
                <button
                  type="button"
                  onClick={onOpenGuide}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
                >
                  <HelpCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <span>{lang === 'th' ? 'คู่มือระบบ' : 'System guide'}</span>
                </button>
              )}
              {currentTab !== 'students' && currentTab !== 'teachers' && currentTab !== 'courses'
                && canAccessSchoolOperations
                && onOpenImportExport
                && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <button
                    type="button"
                    onClick={onOpenImportExport}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                    <span>{lang === 'th' ? 'นำเข้า/ส่งออกข้อมูล' : 'Import / Export data'}</span>
                  </button>
                )}
              {onOpenCoordinationDesk && ['admin', 'super_admin'].includes(currentRole) && (
                <button
                  type="button"
                  onClick={onOpenCoordinationDesk}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                    <span>{lang === 'th' ? 'ประสานงาน Super Admin' : 'Super Admin desk'}</span>
                  </span>
                  {coordinationUnreadCount > 0 && (
                    <span className="min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white tabular-nums">
                      {coordinationUnreadCount > 9 ? '9+' : coordinationUnreadCount}
                    </span>
                  )}
                </button>
              )}
              {currentRole === 'super_admin' && onOpenExamPaymentSettings && (
                <button
                  type="button"
                  onClick={onOpenExamPaymentSettings}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
                >
                  <CreditCard className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  <span>{lang === 'th' ? 'ตั้งค่า QR ขายข้อสอบ' : 'Exam payment settings'}</span>
                </button>
              )}
              {canAccessSchoolOperations && onOpenOnboardingTutor && (
                <button
                  type="button"
                  onClick={onOpenOnboardingTutor}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
                >
                  <Sparkles className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                  <span>{lang === 'th' ? 'ติวเตอร์ระบบ' : 'System tutor'}</span>
                </button>
              )}
            </div>
          </details>

          {/* Notification Center Trigger (Web Push & In-App) */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] transition cursor-pointer"
              title={lang === 'th' ? 'ศูนย์การแจ้งเตือน Web Push & ในระบบ' : 'Web Push & Notification Center'}
            >
              <Bell className="w-4 h-4 text-[var(--color-primary-text)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--color-border)]">
            <button
              type="button"
              onClick={onOpenProfile}
              aria-label={lang === 'th' ? 'เปิดโปรไฟล์' : 'Open profile'}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-[var(--color-card-subtle)] transition text-left group cursor-pointer"
              title={lang === 'th' ? 'คลิกเพื่อแก้ไขโปรไฟล์ & ผลงาน (Portfolio)' : 'Edit Profile & Portfolio'}
            >
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)] shrink-0 group-hover:ring-2 group-hover:ring-[var(--color-primary)]"
              />
              <div className="hidden xl:block text-left text-xs">
                <div className="font-bold text-[var(--color-text-title)] truncate max-w-[105px] group-hover:text-[var(--color-primary-text)]">
                  {currentUser?.fullNameTh?.split(' ')[0] || currentUser?.email?.split('@')[0]}
                </div>
                <div className="text-[10px] text-[var(--color-primary-text)] font-medium leading-none">
                  {roleLabelMap[currentRole]?.[lang] || currentRole}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p-1 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-200 text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
              title={lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Second Row: Program Mode Selector - Horizontally Scrollable on Mobile to prevent any overflow */}
      {canAccessSchoolOperations && <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)] flex items-center justify-center overflow-x-auto no-scrollbar w-full">
        <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] shrink-0">
          <button
            type="button"
            onClick={() => setProgramMode('school_erp')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer ${
              programMode === 'school_erp'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Building2 className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'บริหารโรงเรียน (SIS)' : 'School SIS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setProgramMode('lms_classroom')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer ${
              programMode === 'lms_classroom'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Laptop className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'ห้องเรียนออนไลน์ (LMS)' : 'Virtual LMS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setProgramMode('parent_portal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer ${
              programMode === 'parent_portal'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Smartphone className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'พอร์ทัลผู้ปกครอง' : 'Parent Portal'}</span>
          </button>
        </div>
      </div>}
    </header>
  );
};
