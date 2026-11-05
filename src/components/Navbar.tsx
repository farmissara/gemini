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
  Cloud,
  BookOpen,
  Sun,
  ShieldAlert
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
  onOpenSystemGuide?: () => void;
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
  onOpenSystemGuide,
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
        {/* Eye-Care Color Theme Palette Switcher */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 gap-1" title={lang === 'th' ? 'เลือกโทนสีสว่างสบายตา (Eye-Care Themes)' : 'Eye-Care Light Color Themes'}>
          <Sun className="w-3.5 h-3.5 text-amber-400 ml-1 hidden sm:inline" />
          <button
            onClick={() => {
              setTheme('light');
              setThemePalette('light_sky');
            }}
            className={`w-4 h-4 rounded-full bg-sky-400 transition-all ${themePalette === 'light_sky' || themePalette === 'light' ? 'ring-2 ring-sky-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
            title={lang === 'th' ? '☀️ ฟ้าละมุน สบายตา (Soft Sky)' : 'Eye-Care Soft Sky'}
          />
          <button
            onClick={() => {
              setTheme('light');
              setThemePalette('light_warm');
            }}
            className={`w-4 h-4 rounded-full bg-amber-600 transition-all ${themePalette === 'light_warm' ? 'ring-2 ring-amber-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
            title={lang === 'th' ? '📜 กระดาษอุ่น ถนอมสายตา ไร้แสงสะท้อน (Warm Paper)' : 'Eye-Care Warm Paper'}
          />
          <button
            onClick={() => {
              setTheme('light');
              setThemePalette('light_mint');
            }}
            className={`w-4 h-4 rounded-full bg-emerald-500 transition-all ${themePalette === 'light_mint' ? 'ring-2 ring-emerald-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
            title={lang === 'th' ? '🌿 มินต์ธรรมชาติ พักสายตา (Gentle Mint)' : 'Eye-Care Gentle Mint'}
          />
          <button
            onClick={() => {
              setTheme('light');
              setThemePalette('light_pure');
            }}
            className={`w-4 h-4 rounded-full bg-white border border-slate-300 transition-all ${themePalette === 'light_pure' ? 'ring-2 ring-indigo-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
            title={lang === 'th' ? '⚪ ขาวสว่าง คลีนมินิมอล (Clean Pure White)' : 'Clean Pure White'}
          />
          <button
            onClick={() => {
              setTheme('light');
              setThemePalette('light_lavender');
            }}
            className={`w-4 h-4 rounded-full bg-purple-400 transition-all ${themePalette === 'light_lavender' ? 'ring-2 ring-purple-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
            title={lang === 'th' ? '💜 ลาเวนเดอร์นุ่มนวล ผ่อนคลายตา (Soft Lavender)' : 'Soft Lavender Care'}
          />
          <div className="w-px h-3 bg-slate-700 mx-0.5" />
          <button
            onClick={() => {
              setTheme('dark');
              setThemePalette('sapphire');
            }}
            className={`w-4 h-4 rounded-full bg-slate-800 border border-slate-600 transition-all ${themePalette === 'sapphire' ? 'ring-2 ring-sky-400 scale-125' : 'opacity-60 hover:opacity-100'}`}
            title={lang === 'th' ? '🌙 ค่ำคืนครามเข้ม (Sapphire Dark)' : 'Sapphire Dark Theme'}
          />
        </div>

        {/* System Guide Shortcut */}
        {onOpenSystemGuide && (
          <button
            onClick={onOpenSystemGuide}
            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-1.5 transition-colors"
            title="คู่มือและแผนผังแนะนำระบบ EduVerse"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline text-[11px] font-semibold">แนะนำระบบ (Guide)</span>
          </button>
        )}

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

        {/* Role Switcher with direct Super Admin access */}
        <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/80 text-xs gap-1">
          {(['super_admin', 'admin', 'teacher', 'student', 'parent'] as UserRole[]).map((r) => {
            const isActive = currentRole === r;
            const isSuper = r === 'super_admin';
            return (
              <button
                key={r}
                onClick={() => setCurrentRole(r)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                  isActive
                    ? isSuper
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isSuper
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title={isSuper ? 'เข้าสู่สิทธิ์แม่ข่ายระดับสูงสุด (Super Admin Portal)' : `สลับมุมมอง: ${r}`}
              >
                {isSuper && <span>👑</span>}
                <span>
                  {lang === 'th'
                    ? r === 'super_admin'
                      ? 'Super Admin'
                      : r === 'admin'
                      ? 'แอดมิน'
                      : r === 'teacher'
                      ? 'ครู'
                      : r === 'student'
                      ? 'นักเรียน'
                      : 'ผู้ปกครอง'
                    : r === 'super_admin' ? 'Super Admin' : r}
                </span>
              </button>
            );
          })}
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
