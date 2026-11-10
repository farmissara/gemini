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
  MapPin
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
    <header className={`border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} sticky top-0 z-30 px-3 sm:px-4 md:px-6 py-2 shadow-xs transition-colors w-full max-w-full overflow-x-auto lg:overflow-visible no-scrollbar`}>
      {/* Top Row: Logo, School Name, Mobile Toggle, and User Controls */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Left: Mobile Menu Trigger + Logo + School Switcher + GPS Button */}
        <div className="flex items-center gap-2 min-w-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              title="เปิดเมนู"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white shrink-0">
              EduVerse
            </span>

            {/* School Switcher Pill */}
            {canAccessSchoolOperations && (
              <>
                <button
                  type="button"
                  onClick={onOpenSchoolSwitcher}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] sm:text-xs font-medium transition min-w-0 max-w-[110px] sm:max-w-[160px] md:max-w-[200px] ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={lang === 'th' ? 'สลับโรงเรียน / วิทยาเขต' : 'Switch School / Campus'}
                >
                  <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">
                    {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-300 shrink-0" />
                </button>

                {/* Dedicated GPS Settings Button for School Admin */}
                {onOpenGpsSettings && (
                  <button
                    type="button"
                    onClick={onOpenGpsSettings}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs shrink-0 cursor-pointer"
                    title={lang === 'th' ? `ตั้งค่าพิกัด GPS ประจำโรงเรียน (${activeSchool.nameTh})` : 'Configure School GPS Coordinates'}
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="hidden md:inline">{lang === 'th' ? '📍 พิกัด GPS' : 'GPS'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Center Search (Hidden on Mobile) */}
        {canAccessSchoolOperations && <div className="relative hidden lg:flex items-center ml-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหานักเรียน, วิชา, งาน...' : 'Search records...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-40 xl:w-52 pl-9 pr-3 py-1 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-500' : 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400'
            }`}
          />
        </div>}

        {/* Right Controls: Theme, Lang, and User Identity */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Eye-Care Theme Switcher */}
          <div className={`flex items-center p-0.5 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
            <button
              type="button"
              onClick={() => setThemePalette('light_warm')}
              className={`p-1 rounded transition ${
                isLight ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="ถนอมสายตา"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setThemePalette('sapphire')}
              className={`p-1 rounded transition ${
                !isLight ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
              isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50' : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
            }`}
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            <Globe className="w-3 h-3 text-blue-600 shrink-0" />
            <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
          </button>

          {/* Switch to Compact Mobile Mode (for mobile users or responsive testing) */}
          {onSwitchToMobileMode && (
            <button
              type="button"
              onClick={onSwitchToMobileMode}
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
              }`}
              title={lang === 'th' ? 'สลับไปยังมุมมองมือถือแบบกระชับ' : 'Switch to Compact Mobile View'}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
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
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-200 hover:bg-amber-900/60'
              }`}
              title={lang === 'th' ? 'คู่มือการใช้งานระบบ' : 'System Guide'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'th' ? 'คู่มือระบบ' : 'Guide'}</span>
            </button>
          )}

          {/* Bulk Import / Export Data Trigger (For Admin & Teacher) */}
          {canAccessSchoolOperations && onOpenImportExport && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
            <button
              type="button"
              onClick={onOpenImportExport}
              className={`hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                isLight
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300 hover:bg-indigo-900/60'
              }`}
              title={lang === 'th' ? 'นำเข้า/ส่งออกข้อมูล Excel & CSV' : 'Import / Export Excel'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">{lang === 'th' ? 'นำเข้า/ส่งออก' : 'Import/Export'}</span>
            </button>
          )}

          {/* User Avatar & Profile Trigger & Logout */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left group cursor-pointer"
              title={lang === 'th' ? 'คลิกเพื่อแก้ไขโปรไฟล์ & ผลงาน (Portfolio)' : 'Edit Profile & Portfolio'}
            >
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600 shrink-0 group-hover:ring-2 group-hover:ring-blue-500"
              />
              <div className="hidden xl:block text-left text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[105px] group-hover:text-blue-700 dark:group-hover:text-blue-300">
                  {currentUser?.fullNameTh?.split(' ')[0] || currentUser?.email?.split('@')[0]}
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium leading-none">
                  {roleLabelMap[currentRole]?.[lang] || currentRole}
                </div>
              </div>
            </button>

            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 dark:text-blue-200 text-[11px] font-semibold transition shrink-0 shadow-xs cursor-pointer"
                title={lang === 'th' ? 'แก้ไขโปรไฟล์และสะสมผลงาน' : 'My Profile & Portfolio'}
              >
                <User className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'โปรไฟล์' : 'Profile'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="p-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 dark:text-rose-200 text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
              title={lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Second Row: Program Mode Selector - Horizontally Scrollable on Mobile to prevent any overflow */}
      {canAccessSchoolOperations && <div className={`mt-1.5 pt-1.5 border-t ${isLight ? 'border-slate-100' : 'border-slate-800'} flex items-center justify-center overflow-x-auto no-scrollbar w-full`}>
        <div className={`inline-flex items-center p-0.5 rounded-lg border shrink-0 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setProgramMode('school_erp')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 ${
              programMode === 'school_erp'
                ? (isLight ? 'bg-white text-blue-700 shadow-xs' : 'bg-blue-600 text-white shadow-xs')
                : (isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-300 hover:text-white')
            }`}
          >
            <Building2 className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'บริหารโรงเรียน (SIS)' : 'School SIS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setProgramMode('lms_classroom')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 ${
              programMode === 'lms_classroom'
                ? (isLight ? 'bg-white text-blue-700 shadow-xs' : 'bg-blue-600 text-white shadow-xs')
                : (isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-300 hover:text-white')
            }`}
          >
            <Laptop className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'ห้องเรียนออนไลน์ (LMS)' : 'Virtual LMS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setProgramMode('parent_portal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 ${
              programMode === 'parent_portal'
                ? (isLight ? 'bg-white text-blue-700 shadow-xs' : 'bg-blue-600 text-white shadow-xs')
                : (isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-300 hover:text-white')
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
