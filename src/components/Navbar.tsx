import React from 'react';
import { UserRole, SystemConfig, AppProgramMode, AppLanguage, AppTheme, School, AuthUser, ThemePalette } from '../types';
import { 
  GraduationCap, 
  Building2, 
  Globe, 
  MessageSquare, 
  Search, 
  Laptop, 
  Smartphone, 
  LogOut, 
  ChevronDown,
  Database,
  Palette,
  Cloud
} from 'lucide-react';

interface NavbarProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
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
  onOpenDatabaseBackup: () => void;
  onOpenSupabaseRender?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeSchool,
  currentRole,
  setCurrentRole,
  systemConfig,
  unreadCount,
  searchQuery,
  setSearchQuery,
  programMode,
  setProgramMode,
  lang,
  setLang,
  theme,
  setTheme,
  themePalette,
  setThemePalette,
  onOpenSchoolSwitcher,
  onOpenDatabaseBackup,
  onOpenSupabaseRender,
  onLogout,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur sticky top-0 z-30 px-3 md:px-6 py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        {/* Logo & School Switcher */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                EduVerse
              </span>

              {/* Clickable Multi-School Switcher Pill */}
              <button
                onClick={onOpenSchoolSwitcher}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all group"
                title={lang === 'th' ? 'คลิกเพื่อสลับโรงเรียน / สาขา' : 'Click to switch school / campus'}
              >
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="max-w-[130px] sm:max-w-[180px] truncate">
                  {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-1 py-0.5 rounded border border-cyan-500/20">
                  {activeSchool.code}
                </span>
                <ChevronDown className="w-3 h-3 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {activeSchool.province} • {activeSchool.currentSemester}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden lg:flex items-center ml-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาข้อมูลในโรงเรียน...' : 'Search school data...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-44 xl:w-56 pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Center: Program Format Selector (รูปแบบโปรแกรม) */}
      <div className="flex items-center justify-center">
        <div className="flex items-center p-1 rounded-xl bg-slate-950/90 border border-slate-800 shadow-inner">
          <button
            onClick={() => setProgramMode('school_erp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              programMode === 'school_erp'
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'บริหารโรงเรียน (SIS)' : 'School SIS'}</span>
          </button>

          <button
            onClick={() => setProgramMode('lms_classroom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              programMode === 'lms_classroom'
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ห้องเรียนออนไลน์ (LMS)' : 'Virtual LMS'}</span>
          </button>

          <button
            onClick={() => setProgramMode('parent_portal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              programMode === 'parent_portal'
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'พอร์ทัลผู้ปกครอง' : 'Parent Portal'}</span>
          </button>
        </div>
      </div>

      {/* Right controls: Color Palette, Database Backup, Language, Role Switcher, Logout */}
      <div className="flex items-center justify-between sm:justify-end gap-2">
        {/* Color Palette Switcher (เปลี่ยนสีสันใหม่ด้วย) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1" title="เปลี่ยนโทนสีสันโปรแกรม (Color Theme)">
          <Palette className="w-3 h-3 text-slate-400 ml-1 hidden sm:inline" />
          <button
            onClick={() => setThemePalette('sapphire')}
            className={`w-4 h-4 rounded-full bg-sky-500 transition-all ${themePalette === 'sapphire' ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
            title="Sapphire Sky Theme"
          />
          <button
            onClick={() => setThemePalette('emerald')}
            className={`w-4 h-4 rounded-full bg-emerald-500 transition-all ${themePalette === 'emerald' ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
            title="Emerald Mint Theme"
          />
          <button
            onClick={() => setThemePalette('amethyst')}
            className={`w-4 h-4 rounded-full bg-purple-500 transition-all ${themePalette === 'amethyst' ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
            title="Royal Amethyst Theme"
          />
          <button
            onClick={() => setThemePalette('light')}
            className={`w-4 h-4 rounded-full bg-slate-200 transition-all ${themePalette === 'light' ? 'ring-2 ring-sky-500 scale-110' : 'opacity-60 hover:opacity-100'}`}
            title="Clean Light Theme"
          />
        </div>

        {/* Supabase & Render Deploy Shortcut */}
        {onOpenSupabaseRender && (
          <button
            onClick={onOpenSupabaseRender}
            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 transition-colors"
            title={lang === 'th' ? 'จัดการฐานข้อมูล Supabase & นำขึ้น Render.com' : 'Supabase Database & Render.com Deploy'}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-[11px] font-semibold">Supabase &amp; Render</span>
          </button>
        )}

        {/* Database & Cloud Backup Shortcut */}
        <button
          onClick={onOpenDatabaseBackup}
          className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-1 transition-colors"
          title={lang === 'th' ? 'จัดการฐานข้อมูล & สำรอง Cloud Storage' : 'Database Backups & Cloud Storage'}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden lg:inline text-[11px] font-semibold">Backup</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs text-slate-200 font-semibold transition-colors"
          title="สลับภาษา / Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'th' ? '🇹🇭 ไทย' : '🇬🇧 EN'}</span>
        </button>

        {/* Role Switcher */}
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700/80 text-xs">
          {(['admin', 'teacher', 'student', 'parent'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setCurrentRole(r)}
              className={`px-2 py-1 rounded capitalize font-medium text-[11px] transition-all ${
                currentRole === r
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'th'
                ? r === 'admin'
                  ? 'แอดมิน'
                  : r === 'teacher'
                  ? 'ครู'
                  : r === 'student'
                  ? 'นักเรียน'
                  : 'ผู้ปกครอง'
                : r}
            </button>
          ))}
        </div>

        {/* User Info & Log Out */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
          <img
            src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt="Profile"
            className="w-7 h-7 rounded-full object-cover border border-cyan-500/40"
          />

          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs flex items-center gap-1 transition-colors"
            title={lang === 'th' ? 'ออกจากระบบกลับสู่หน้า Login หลัก' : 'Log out to Login Page'}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
