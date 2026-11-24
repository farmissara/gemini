import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  BellRing,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  Clock,
  Edit3,
  Gamepad2,
  Globe,
  Home,
  Laptop,
  LogOut,
  Moon,
  MoreHorizontal,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import type { AppLanguage, School, ThemePalette, TuitionInvoice, UserRole } from '../../types';
import { BaanPakKruLogo } from '../../components/common/BaanPakKruLogo';
import type { NavTab } from '../../components/layout/Sidebar';
import type { ActiveGameView, MobileTab } from './types';

interface MobileHeaderProps {
  activeSchool: School;
  currentRole: UserRole;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  isLight: boolean;
  setThemePalette: (palette: ThemePalette) => void;
  unreadCount: number;
  onOpenNotifications?: () => void;
  onOpenSchoolSwitcher?: () => void;
  canSwitchAdminTeacherMode: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  onSwitchToDesktopMode: () => void;
  onLogout: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeSchool,
  currentRole,
  lang,
  setLang,
  isLight,
  setThemePalette,
  unreadCount,
  onOpenNotifications,
  onOpenSchoolSwitcher,
  canSwitchAdminTeacherMode,
  onSwitchOperationalRole,
  onSwitchToDesktopMode,
  onLogout,
}) => {
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md transition-colors">
      <div className="px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BaanPakKruLogo size={24} />
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
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
              aria-label={lang === 'th' ? 'เมนูเพิ่มเติม' : 'Menu'}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {isHeaderMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg p-1.5 space-y-0.5 text-[13px]">
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
  isModuleEnabled: (tab: NavTab) => boolean;
  pendingLeavesCount: number;
  invoices: TuitionInvoice[];
  onResetCheckinToSelfie: () => void;
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
  isModuleEnabled,
  pendingLeavesCount,
  invoices,
  onResetCheckinToSelfie,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md px-2 py-1 safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {/* SLOT 1: HOME */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'home' ||
            activeTab === 'portfolio' ||
            activeTab === 'student_grades' ||
            (canSelfCheckin && activeTab === 'timetable') ||
            (canPlayGames && activeTab === 'homework')
              ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          {currentRole === 'super_admin' ? (
            <ShieldCheck className="w-5 h-5 mb-0.5" />
          ) : (
            <Home className="w-5 h-5 mb-0.5" />
          )}
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
            } else if (canViewTimetable) {
              setActiveTab('timetable');
            } else if (canOpenAnnouncements) {
              setActiveTab('announcements');
            } else {
              setActiveTab('home');
            }
          }}
          className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'checkin' || activeTab === 'leave' || (!canSelfCheckin && activeTab === 'timetable')
              ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          {canSelfCheckin ? <Clock className="w-5 h-5 mb-0.5" /> : <Calendar className="w-5 h-5 mb-0.5" />}
          <span className="text-[11px] truncate max-w-full">
            {!canSelfCheckin
              ? canViewTimetable
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
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
              activeTab === 'admin_quick'
                ? 'text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {pendingLeavesCount + invoices.filter((i) => i.slipStatus === 'pending_review').length > 0 && (
              <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-rose-600" />
            )}
            <Edit3 className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'จัดการด่วน' : 'Manage'}</span>
          </button>
        ) : currentRole === 'super_admin' ? (
          <button
            type="button"
            onClick={() => setActiveTab('super_schools')}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'super_schools'
                ? 'text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'โรงเรียน' : 'Schools'}</span>
          </button>
        ) : currentRole === 'teacher' ? (
          <button
            type="button"
            onClick={() => {
              if (isModuleEnabled('gradebook')) setActiveTab('gradebook');
              else if (canViewTimetable) setActiveTab('timetable');
              else if (canOpenAnnouncements) setActiveTab('announcements');
              else setActiveTab('executive');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'gradebook'
                ? 'text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <ClipboardCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] truncate max-w-full">
              {isModuleEnabled('gradebook')
                ? lang === 'th'
                  ? 'คะแนน'
                  : 'Grades'
                : canViewTimetable
                  ? lang === 'th'
                    ? 'ตารางสอน'
                    : 'Schedule'
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
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'announcements'
                ? 'text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <BellRing className="w-5 h-5 mb-0.5" />
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
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              (canPlayGames
                ? activeTab === 'games'
                : canAccessHomework
                  ? activeTab === 'homework'
                  : activeTab === 'student_grades')
                ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {canPlayGames ? <Gamepad2 className="w-5 h-5 mb-0.5" /> : <BookOpen className="w-5 h-5 mb-0.5" />}
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

        {/* SLOT 4: ACCOUNT / SETTINGS */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'บัญชี' : 'Account'}</span>
        </button>
      </div>
    </nav>
  );
};
