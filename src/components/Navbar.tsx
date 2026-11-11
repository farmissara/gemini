import React from 'react';
import { UserRole, SystemConfig, AppProgramMode, AppLanguage, AppTheme, School, AuthUser, ThemePalette } from '../types';
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
  User,
  Menu,
  HelpCircle,
  FileSpreadsheet,
  MapPin,
  Sparkles
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
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
  onOpenGpsSettings?: () => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
  onOpenProfile?: () => void;
  onOpenGuide?: () => void;
  onOpenImportExport?: () => void;
  onOpenOnboardingTutor?: () => void;
  onSwitchToMobileMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
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
  onOpenGpsSettings,
  onLogout,
  onToggleMobileMenu,
  onOpenProfile,
  onOpenGuide,
  onOpenImportExport,
  onOpenOnboardingTutor,
  onSwitchToMobileMode,
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
        {/* Left: Mobile Menu Trigger + Logo + School Switcher + GPS Button */}
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

          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
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

                {/* Dedicated GPS Settings Button for School Admin */}
                {onOpenGpsSettings && (
                  <button
                    type="button"
                    onClick={onOpenGpsSettings}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900 transition shadow-2xs shrink-0 cursor-pointer"
                    title={lang === 'th' ? `ตั้งค่าพิกัด GPS ประจำโรงเรียน (${activeSchool.nameTh})` : 'Configure School GPS Coordinates'}
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
                    <span className="hidden md:inline">{lang === 'th' ? '📍 พิกัด GPS' : 'GPS'}</span>
                  </button>
                )}
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

          {/* Switch to Compact Mobile Mode (for mobile users or responsive testing) */}
          {onSwitchToMobileMode && (
            <button
              type="button"
              onClick={onSwitchToMobileMode}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900"
              title={lang === 'th' ? 'สลับไปยังมุมมองมือถือแบบกระชับ' : 'Switch to Compact Mobile View'}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
              <span>{lang === 'th' ? 'มุมมองมือถือ' : 'Mobile View'}</span>
            </button>
          )}

          {/* PWA Install Button (Prompt to install app on home screen) */}
          <div className="hidden sm:flex">
            <PWAInstallButton lang={lang} variant="nav" />
          </div>

          {/* User Guide Modal Trigger */}
          {canAccessSchoolOperations && onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
              title={lang === 'th' ? 'คู่มือการใช้งานระบบ' : 'System Guide'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              <span>{lang === 'th' ? 'คู่มือระบบ' : 'Guide'}</span>
            </button>
          )}

          {/* Bulk Import / Export Data Trigger (For Admin & Teacher) */}
          {canAccessSchoolOperations && onOpenImportExport && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
            <button
              type="button"
              onClick={onOpenImportExport}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-900"
              title={lang === 'th' ? 'นำเข้า/ส่งออกข้อมูล Excel & CSV' : 'Import / Export Excel'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-300" />
              <span className="hidden xl:inline">{lang === 'th' ? 'นำเข้า/ส่งออก' : 'Import/Export'}</span>
            </button>
          )}

          {/* School Onboarding Tutor Trigger (สพฐ. / ศธ. Guide & Sandbox) */}
          {canAccessSchoolOperations && onOpenOnboardingTutor && (
            <button
              type="button"
              onClick={onOpenOnboardingTutor}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-700 dark:text-purple-200 shadow-xs"
              title={lang === 'th' ? 'ติวเตอร์แนะนำการเริ่มต้นใช้งาน 8 ระบบ สพฐ./ศธ.' : 'School Onboarding Tutor'}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
              <span className="hidden sm:inline">{lang === 'th' ? 'ติวเตอร์ระบบ' : 'Tutor'}</span>
            </button>
          )}

          {/* User Avatar & Profile Trigger & Logout */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--color-border)]">
            <button
              type="button"
              onClick={onOpenProfile}
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

            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-200 text-[11px] font-semibold transition shrink-0 shadow-xs cursor-pointer"
                title={lang === 'th' ? 'แก้ไขโปรไฟล์และสะสมผลงาน' : 'My Profile & Portfolio'}
              >
                <User className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'โปรไฟล์' : 'Profile'}</span>
              </button>
            )}

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
