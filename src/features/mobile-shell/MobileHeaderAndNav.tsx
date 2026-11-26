import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  BellRing,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  Edit3,
  Gamepad2,
  Globe,
  Home,
  Laptop,
  LayoutGrid,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import type { AppLanguage, AuthUser, School, ThemePalette, UserRole } from '../../types';
import { BaanPakKruLogo } from '../../components/common/BaanPakKruLogo';
import { FutureNavIcon } from '../../components/common/FutureIcon';
import type { ActiveGameView, MobileTab } from './types';

interface MobileHeaderProps {
  activeSchool: School;
  currentUser?: AuthUser | null;
  currentRole: UserRole;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  isLight: boolean;
  setThemePalette: (palette: ThemePalette) => void;
  unreadCount: number;
  onOpenNotifications?: () => void;
  onOpenProfile: () => void;
  onOpenSchoolSwitcher?: () => void;
  canSwitchAdminTeacherMode: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  onSwitchToDesktopMode: () => void;
  onLogout: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeSchool,
  currentUser,
  currentRole,
  lang,
  setLang,
  isLight,
  setThemePalette,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenSchoolSwitcher,
  canSwitchAdminTeacherMode,
  onSwitchOperationalRole,
  onSwitchToDesktopMode,
  onLogout,
}) => {
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const profileDisplayName =
    (lang === 'th' ? currentUser?.fullNameTh : currentUser?.fullNameEn) ||
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    currentUser?.email ||
    '';
  const profileInitials = profileDisplayName.trim().slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isHeaderMenuOpen]);

  return (
    <header className="app-topbar sticky top-0 z-40 transition-colors">
      <div className="px-3.5 h-12 sm:h-14 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <BaanPakKruLogo size={26} />
          {onOpenSchoolSwitcher && currentRole === 'super_admin' ? (
            <button
              type="button"
              onClick={onOpenSchoolSwitcher}
              className="text-sm font-bold text-[var(--color-text-title)] truncate hover:underline cursor-pointer"
            >
              {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
            </button>
          ) : (
            <span className="text-sm font-bold text-[var(--color-text-title)] truncate">
              {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] transition cursor-pointer"
              aria-label={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600" />
              )}
            </button>
          )}

          <div ref={headerMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
              aria-expanded={isHeaderMenuOpen}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
              aria-label={lang === 'th' ? 'เมนูโปรไฟล์และการตั้งค่า' : 'Profile & Settings'}
              title={profileDisplayName || (lang === 'th' ? 'เมนูโปรไฟล์' : 'Profile')}
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={profileDisplayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                />
              ) : (
                <span className="w-7 h-7 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-bold flex items-center justify-center">
                  {profileInitials || <User className="w-3.5 h-3.5" />}
                </span>
              )}
            </button>
            {isHeaderMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg p-1.5 space-y-0.5 text-[13px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span>{lang === 'th' ? 'บัญชีและโปรไฟล์' : 'Account & Profile'}</span>
                </button>
                {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onSwitchOperationalRole(currentRole === 'admin' ? 'teacher' : 'admin');
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 font-bold text-[var(--color-primary-text)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4 shrink-0" />
                    <span>
                      {currentRole === 'admin'
                        ? (lang === 'th' ? 'สลับเป็นโหมดครูผู้สอน' : 'Switch to Teacher Mode')
                        : (lang === 'th' ? 'สลับเป็นโหมด Admin' : 'Switch to Admin Mode')}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onSwitchToDesktopMode();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <Laptop className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span>{lang === 'th' ? 'สลับมุมมองคอมพิวเตอร์' : 'Desktop View'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setLang(lang === 'th' ? 'en' : 'th');
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-left flex items-center justify-between text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[var(--color-text-muted)]" />
                    {lang === 'th' ? 'ภาษา' : 'Language'}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-text-muted)]">{lang.toUpperCase()}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setThemePalette(isLight ? 'sapphire' : 'light_warm');
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  {isLight ? (
                    <Moon className="w-4 h-4 text-[var(--color-text-muted)]" />
                  ) : (
                    <Sun className="w-4 h-4 text-[var(--color-text-muted)]" />
                  )}
                  <span>{isLight ? (lang === 'th' ? 'โหมดกลางคืน' : 'Dark Mode') : (lang === 'th' ? 'โหมดสว่าง' : 'Light Mode')}</span>
                </button>
                <div className="my-1 border-t border-[var(--color-border)]" />
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

interface MobileBottomNavProps {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  setActiveGameView: (view: ActiveGameView) => void;
  currentRole: UserRole;
  lang: AppLanguage;
  canSelfCheckin: boolean;
  canViewTimetable: boolean;
  canOpenAnnouncements: boolean;
  canPlayGames: boolean;
  canAccessHomework: boolean;
  canViewGradesStudent: boolean;
  canOpenPortfolio: boolean;
  pendingLeavesCount: number;
  onResetCheckinToSelfie: () => void;
  onOpenAllModules?: () => void;
  allModulesActive?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  setActiveGameView,
  currentRole,
  lang,
  canSelfCheckin,
  canViewTimetable,
  canOpenAnnouncements,
  canPlayGames,
  canAccessHomework,
  canViewGradesStudent,
  canOpenPortfolio,
  pendingLeavesCount,
  onResetCheckinToSelfie,
  onOpenAllModules,
  allModulesActive = false,
}) => {
  const slot1Active = activeTab === 'home';
  const slot2Active = canSelfCheckin
    ? activeTab === 'checkin' ||
      activeTab === 'student_attendance' ||
      activeTab === 'leave' ||
      activeTab === 'attendance_history'
    : canViewTimetable
      ? activeTab === 'timetable'
      : activeTab === 'announcements';
  const slot3Active =
    currentRole === 'admin'
      ? activeTab === 'admin_quick'
      : currentRole === 'super_admin'
        ? activeTab === 'super_schools'
        : currentRole === 'teacher'
          ? canViewTimetable
            ? activeTab === 'timetable'
            : canOpenAnnouncements
              ? activeTab === 'announcements'
              : activeTab === 'executive'
          : currentRole === 'parent'
            ? canOpenAnnouncements
              ? activeTab === 'announcements'
              : canViewTimetable
                ? activeTab === 'timetable'
                : false
            : canPlayGames
              ? activeTab === 'games'
              : canAccessHomework
                ? activeTab === 'homework'
                : canViewGradesStudent
                  ? activeTab === 'student_grades'
                  : canOpenPortfolio
                    ? activeTab === 'portfolio'
                    : false;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]/92 backdrop-blur-xl shadow-[0_-8px_28px_-14px_rgba(37,99,235,0.18)] px-2 py-1 safe-area-bottom">
      <div className={`max-w-md mx-auto grid ${onOpenAllModules ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
        {/* SLOT 1: HOME */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`tone-1 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            slot1Active
              ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <span
            className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
              slot1Active ? 'tone-chip-solid shadow-xs' : ''
            }`}
          >
            <FutureNavIcon
              tab={currentRole === 'super_admin' ? 'super_admin_console' : 'dashboard'}
              size={18}
              active={slot1Active}
            />
          </span>
          <span className="text-[11px] truncate max-w-full">
            {currentRole === 'super_admin'
              ? lang === 'th'
                ? 'แม่ข่าย'
                : 'Master'
              : lang === 'th'
                ? 'หน้าหลัก'
                : 'Home'}
          </span>
        </button>

        {/* SLOT 2: CHECK-IN (or Timetable / Announcements fallback) */}
        <button
          type="button"
          onClick={() => {
            if (canSelfCheckin) {
              onResetCheckinToSelfie();
              setActiveTab('checkin');
            } else if (currentRole === 'super_admin') {
              setActiveTab('executive');
            } else if (canViewTimetable) {
              setActiveTab('timetable');
            } else if (canOpenAnnouncements) {
              setActiveTab('announcements');
            } else {
              setActiveTab('home');
            }
          }}
          className={`tone-2 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            slot2Active
              ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <span
            className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
              slot2Active ? 'tone-chip-solid shadow-xs' : ''
            }`}
          >
            <FutureNavIcon
              tab={
                canSelfCheckin
                  ? 'attendance'
                  : currentRole === 'super_admin'
                    ? 'executive_monitor'
                    : 'timetable'
              }
              size={18}
              active={slot2Active}
            />
          </span>
          <span className="text-[11px] truncate max-w-full">
            {!canSelfCheckin
              ? currentRole === 'super_admin'
                ? lang === 'th'
                  ? 'ภาพรวม'
                  : 'Overview'
                : canViewTimetable
                  ? lang === 'th'
                    ? 'ตารางเรียน'
                    : 'Schedule'
                  : canOpenAnnouncements
                    ? lang === 'th'
                      ? 'ประกาศ'
                      : 'News'
                    : lang === 'th'
                      ? 'หน้าหลัก'
                      : 'Home'
              : currentRole === 'parent'
                ? lang === 'th'
                  ? 'มาเรียน'
                  : 'Logs'
                : lang === 'th'
                  ? 'เช็คชื่อ'
                  : 'Check-in'}
          </span>
        </button>

        {/* SLOT 3: ROLE PRIMARY ACTION */}
        {currentRole === 'admin' ? (
          <button
            type="button"
            onClick={() => setActiveTab('admin_quick')}
            className={`tone-8 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
              slot3Active
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {pendingLeavesCount > 0 && (
              <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-rose-600" />
            )}
            <span
              className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
                slot3Active ? 'tone-chip-solid shadow-xs' : ''
              }`}
            >
              <FutureNavIcon tab="system_settings" size={18} active={slot3Active} />
            </span>
            <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'จัดการด่วน' : 'Manage'}</span>
          </button>
        ) : currentRole === 'super_admin' ? (
          <button
            type="button"
            onClick={() => setActiveTab('super_schools')}
            className={`tone-8 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              slot3Active
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
                slot3Active ? 'tone-chip-solid shadow-xs' : ''
              }`}
            >
              <Building2 className="w-4.5 h-4.5" />
            </span>
            <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'โรงเรียน' : 'Schools'}</span>
          </button>
        ) : currentRole === 'teacher' ? (
          <button
            type="button"
            onClick={() => {
              if (canViewTimetable) setActiveTab('timetable');
              else if (canOpenAnnouncements) setActiveTab('announcements');
              else setActiveTab('executive');
            }}
            className={`tone-4 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              slot3Active
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
                slot3Active ? 'tone-chip-solid shadow-xs' : ''
              }`}
            >
              <FutureNavIcon tab="timetable" size={18} active={slot3Active} />
            </span>
            <span className="text-[11px] truncate max-w-full">
              {canViewTimetable
                ? lang === 'th'
                  ? 'ตารางสอน'
                  : 'Schedule'
                : canOpenAnnouncements
                  ? lang === 'th'
                    ? 'ประกาศ'
                    : 'News'
                  : lang === 'th'
                    ? 'ภาพรวม'
                    : 'Overview'}
            </span>
          </button>
        ) : currentRole === 'parent' ? (
          <button
            type="button"
            onClick={() => {
              if (canOpenAnnouncements) setActiveTab('announcements');
              else if (canViewTimetable) setActiveTab('timetable');
              else setActiveTab('profile');
            }}
            className={`tone-6 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              slot3Active
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
                slot3Active ? 'tone-chip-solid shadow-xs' : ''
              }`}
            >
              <FutureNavIcon tab="announcements" size={18} active={slot3Active} />
            </span>
            <span className="text-[11px] truncate max-w-full">
              {canOpenAnnouncements
                ? lang === 'th'
                  ? 'ประกาศ'
                  : 'News'
                : canViewTimetable
                  ? lang === 'th'
                    ? 'ตารางเรียน'
                    : 'Schedule'
                  : lang === 'th'
                    ? 'บัตร'
                    : 'ID'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (canPlayGames) {
                setActiveTab('games');
                setActiveGameView('hub');
              } else if (canAccessHomework) {
                setActiveTab('homework');
              } else if (canViewGradesStudent) {
                setActiveTab('student_grades');
              } else if (canOpenPortfolio) {
                setActiveTab('portfolio');
              } else {
                setActiveTab('profile');
              }
            }}
            className={`tone-5 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              slot3Active
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
                slot3Active ? 'tone-chip-solid shadow-xs' : ''
              }`}
            >
              <FutureNavIcon
                tab={canPlayGames ? 'games' : canAccessHomework ? 'homework' : 'gradebook'}
                size={18}
                active={slot3Active}
              />
            </span>
            <span className="text-[11px] truncate max-w-full">
              {canPlayGames
                ? lang === 'th'
                  ? 'เกมส์'
                  : 'Arcade'
                : canAccessHomework
                  ? lang === 'th'
                    ? 'การบ้าน'
                    : 'Tasks'
                  : canViewGradesStudent
                    ? lang === 'th'
                      ? 'เกรด'
                      : 'Grades'
                    : lang === 'th'
                      ? 'ผลงาน'
                      : 'Portfolio'}
            </span>
          </button>
        )}

        {onOpenAllModules && (
          <button
            type="button"
            onClick={onOpenAllModules}
            aria-label={lang === 'th' ? 'เปิดเมนูทุกฟังก์ชัน' : 'Open all modules'}
            aria-pressed={allModulesActive}
            className={`tone-7 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              allModulesActive
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
                allModulesActive ? 'tone-chip-solid shadow-xs' : ''
              }`}
            >
              <FutureNavIcon tab="dashboard" size={18} active={allModulesActive} />
            </span>
            <span className="text-[11px] truncate max-w-full">
              {lang === 'th' ? 'ทุกฟังก์ชัน' : 'Modules'}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
