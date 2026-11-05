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
  User
} from 'lucide-react';

interface NavbarProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeSchool,
  currentRole,
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
}) => {
  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';

  const roleLabelMap: Record<UserRole, { th: string; en: string }> = {
    super_admin: { th: 'ผู้ดูแลระบบแม่ข่าย (Super Admin)', en: 'Super Admin' },
    admin: { th: 'ผู้อำนวยการ / ผู้บริหาร', en: 'Principal / Admin' },
    teacher: { th: 'อาจารย์ผู้สอน', en: 'Teacher' },
    student: { th: 'นักเรียน', en: 'Student' },
    parent: { th: 'ผู้ปกครอง', en: 'Parent' },
  };

  return (
    <header className={`border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} sticky top-0 z-30 px-4 md:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs transition-colors`}>
      <div className="flex items-center justify-between gap-3">
        {/* Logo & School Switcher */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                EduVerse
              </span>

              {/* School Switcher Pill */}
              <button
                type="button"
                onClick={onOpenSchoolSwitcher}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title={lang === 'th' ? 'สลับโรงเรียน / วิทยาเขต' : 'Switch School / Campus'}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">
                  {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
                </span>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-bold">
                  {activeSchool.code}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden lg:flex items-center ml-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหานักเรียน, วิชา, งาน...' : 'Search records...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-48 xl:w-56 pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          />
        </div>
      </div>

      {/* Program Mode Selector */}
      <div className="flex items-center justify-center">
        <div className={`flex items-center p-1 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setProgramMode('school_erp')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              programMode === 'school_erp'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'บริหารโรงเรียน (SIS)' : 'School SIS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setProgramMode('lms_classroom')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              programMode === 'lms_classroom'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ห้องเรียนออนไลน์ (LMS)' : 'Virtual LMS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setProgramMode('parent_portal')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              programMode === 'parent_portal'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'พอร์ทัลผู้ปกครอง' : 'Parent Portal'}</span>
          </button>
        </div>
      </div>

      {/* Right controls: Theme, Language, User Identity and Logout */}
      <div className="flex items-center justify-end gap-2.5">
        {/* Eye-Care Theme Switcher */}
        <div className={`flex items-center p-1 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'} gap-1`}>
          <button
            type="button"
            onClick={() => setThemePalette('light_warm')}
            className={`p-1.5 rounded-md transition ${
              isLight ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="โทนสีสว่างสบายตา (Eye-Care)"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setThemePalette('sapphire')}
            className={`p-1.5 rounded-md transition ${
              !isLight ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="โทนสีมืดนุ่มนวล (Soft Dark)"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
            isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
          title="สลับภาษา / Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{lang === 'th' ? '🇹🇭 ไทย' : '🇬🇧 EN'}</span>
        </button>

        {/* Authenticated User Info */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <img
            src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-slate-300"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1 truncate max-w-[140px]">
              {currentUser?.fullNameTh || currentUser?.email}
            </div>
            <div className="text-[10px] text-blue-700 font-medium">
              {roleLabelMap[currentRole]?.[lang] || currentRole}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs flex items-center gap-1 transition"
            title={lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] font-semibold">{lang === 'th' ? 'ออก' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
