import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  Globe,
  GraduationCap,
  Laptop,
  LogOut,
  Moon,
  MoreVertical,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from 'lucide-react';
import type { AppLanguage, AuthUser, School, ThemePalette, UserRole } from '../../types';
import { BaanPakKruLogo } from '../../components/common/BaanPakKruLogo';
import { FutureNavIcon } from '../../components/common/FutureIcon';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import type { ActiveGameView, MobileTab } from './types';

export interface MobileQuickMenuItem {
  id: string;
  label: string;
  meta?: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

interface MobileHeaderProps {
  activeSchool: School;
  currentUser?: AuthUser | null;
  currentRole: UserRole;
  lang: AppLanguage;
  setLang?: (lang: AppLanguage) => void;
  isLight?: boolean;
  setThemePalette?: (palette: ThemePalette) => void;
  unreadCount: number;
  coordinationUnreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile: () => void;
  onOpenProfileModal?: () => void;
  onOpenSchoolSwitcher?: () => void;
  onSwitchToDesktopMode?: () => void;
  onOpenOnboardingTutor?: () => void;
  onLogout?: () => void;
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  otherMenuItems?: MobileQuickMenuItem[];
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeSchool,
  currentUser,
  currentRole,
  lang,
  setLang,
  isLight = true,
  setThemePalette,
  unreadCount,
  coordinationUnreadCount = 0,
  onOpenNotifications,
  onOpenProfile,
  onOpenProfileModal,
  onOpenSchoolSwitcher,
  onSwitchToDesktopMode,
  onOpenOnboardingTutor,
  onLogout,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
  otherMenuItems = [],
}) => {
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isToolsMenuOpen && !isAccountMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isToolsMenuOpen && toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setIsToolsMenuOpen(false);
      }
      if (isAccountMenuOpen && accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsToolsMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isToolsMenuOpen, isAccountMenuOpen]);

  const roleLabelMap: Record<UserRole, { th: string; en: string }> = {
    super_admin: { th: 'ผู้ดูแลระบบแม่ข่าย', en: 'Super Admin' },
    admin: { th: 'ผู้บริหารโรงเรียน', en: 'Admin' },
    teacher: { th: 'ครูผู้สอน', en: 'Teacher' },
    student: { th: 'นักเรียน', en: 'Student' },
    parent: { th: 'ผู้ปกครอง', en: 'Parent' },
  };

  const profileDisplayName =
    (lang === 'th' ? currentUser?.fullNameTh : currentUser?.fullNameEn) ||
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    currentUser?.email ||
    '';
  const profileInitials = profileDisplayName.trim().slice(0, 2).toUpperCase();
  const hasUnread = unreadCount > 0 || coordinationUnreadCount > 0;

  return (
    <header className="app-topbar sticky top-0 z-40 border-b border-[var(--color-border)] transition-colors">
      <div className="px-3.5 sm:px-5 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BaanPakKruLogo size={28} />
          {onOpenSchoolSwitcher && currentRole === 'super_admin' ? (
            <button
              type="button"
              onClick={onOpenSchoolSwitcher}
              className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-text-title)] truncate hover:underline cursor-pointer min-w-0"
            >
              <span className="truncate">{lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}</span>
              <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>
          ) : (
            <span className="text-sm font-bold text-[var(--color-text-title)] truncate">
              {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onOpenNotifications && (
            <button
              type="button"
              onClick={() => {
                setIsToolsMenuOpen(false);
                setIsAccountMenuOpen(false);
                onOpenNotifications();
              }}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
              aria-label={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
              title={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            >
              <Bell className="w-[18px] h-[18px]" />
              {hasUnread && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-[var(--color-card)]" />
              )}
            </button>
          )}

          {/* 3-Dot Menu: Secondary Functions & Display Preferences */}
          <div ref={toolsMenuRef} className="relative">
            <button
              type="button"
              aria-expanded={isToolsMenuOpen}
              aria-haspopup="menu"
              aria-label={lang === 'th' ? 'ฟังก์ชันอื่นๆ และการตั้งค่า' : 'More functions & settings'}
              title={lang === 'th' ? 'ฟังก์ชันอื่นๆ และการตั้งค่า' : 'More functions & settings'}
              onClick={() => {
                setIsToolsMenuOpen((prev) => !prev);
                setIsAccountMenuOpen(false);
              }}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
                isToolsMenuOpen
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                  : 'border-transparent hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <MoreVertical className="w-[18px] h-[18px]" />
            </button>

            {isToolsMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 max-h-[80dvh] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] space-y-1 animate-in fade-in duration-100"
              >
                {otherMenuItems.length > 0 && (
                  <div className="space-y-0.5 pb-1.5">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'ฟังก์ชันอื่นๆ' : 'Other Functions'}
                    </div>
                    {otherMenuItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          item.onClick();
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition cursor-pointer ${
                          item.active
                            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                        }`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="w-4 h-4 flex items-center justify-center shrink-0">
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.meta && (
                          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] tabular-nums shrink-0">
                            {item.meta}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {(onSwitchToDesktopMode || onOpenOnboardingTutor) && (
                  <div className={`${otherMenuItems.length > 0 ? 'pt-1.5 border-t border-[var(--color-border)]' : ''} space-y-0.5 pb-1`}>
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'มุมมองและคู่มือ' : 'View & Guide'}
                    </div>
                    {onSwitchToDesktopMode && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          onSwitchToDesktopMode();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                      >
                        <Laptop className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                        <span>{lang === 'th' ? 'สลับมุมมองคอมพิวเตอร์' : 'Desktop View'}</span>
                      </button>
                    )}
                    {onOpenOnboardingTutor && currentRole !== 'student' && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          onOpenOnboardingTutor();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                        <span>{lang === 'th' ? 'ติวเตอร์แนะนำระบบ' : 'System Tutor'}</span>
                      </button>
                    )}
                  </div>
                )}

                {(setThemePalette || setLang) && (
                  <div className="px-3 py-2 border-t border-[var(--color-border)] space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'การแสดงผล' : 'Display'}
                    </div>
                    {setThemePalette && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-[var(--color-text-body)]">
                          {lang === 'th' ? 'ธีมสี' : 'Theme'}
                        </span>
                        <div className="flex items-center p-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
                          <button
                            type="button"
                            onClick={() => setThemePalette('light_warm')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                              isLight
                                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'สว่าง' : 'Light'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setThemePalette('sapphire')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                              !isLight
                                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                            }`}
                          >
                            <Moon className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'มืด' : 'Dark'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                    {setLang && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-[var(--color-text-body)]">
                          {lang === 'th' ? 'ภาษา' : 'Language'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-semibold cursor-pointer transition"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
                        </button>
                      </div>
                    )}
                    <div className="pt-0.5">
                      <PWAInstallButton lang={lang} variant="nav" className="w-full justify-center py-2 text-xs" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Single Profile Avatar Trigger (Account Menu) */}
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setIsAccountMenuOpen((prev) => !prev);
                setIsToolsMenuOpen(false);
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
                isAccountMenuOpen ? 'bg-[var(--color-primary-light)]' : 'hover:bg-[var(--color-card-subtle)]'
              }`}
              aria-label={lang === 'th' ? 'บัญชีและโปรไฟล์' : 'Account & Profile'}
              title={profileDisplayName || (lang === 'th' ? 'บัญชีและโปรไฟล์' : 'Account & Profile')}
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={profileDisplayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--color-card)] border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                />
              ) : (
                <span className="w-8 h-8 rounded-full ring-2 ring-[var(--color-card)] border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-bold flex items-center justify-center">
                  {profileInitials || <User className="w-4 h-4" />}
                </span>
              )}
            </button>

            {isAccountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 max-h-[80dvh] w-[min(17.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] space-y-1 animate-in fade-in duration-100"
              >
                <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--color-border)] mb-1">
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-bold flex items-center justify-center shrink-0">
                      {profileInitials || <User className="w-4 h-4" />}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-title)] truncate">
                      {profileDisplayName || (lang === 'th' ? 'ผู้ใช้งาน' : 'User')}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {roleLabelMap[currentRole]?.[lang] || currentRole}
                    </p>
                  </div>
                </div>

                {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
                  <div className="px-2 py-2 border-b border-[var(--color-border)] space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-1">
                      {lang === 'th' ? 'สลับโหมดปฏิบัติงาน' : 'Operational Role Mode'}
                    </p>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onSwitchOperationalRole('admin');
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-bold cursor-pointer transition ${
                          currentRole === 'admin'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)]'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>{lang === 'th' ? 'โหมด Admin' : 'Admin'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onSwitchOperationalRole('teacher');
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-bold cursor-pointer transition ${
                          currentRole === 'teacher'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)]'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4 shrink-0" />
                        <span>{lang === 'th' ? 'โหมดครู' : 'Teacher'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                >
                  <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <span>{lang === 'th' ? 'โปรไฟล์ & บัตรดิจิทัล' : 'Profile & Digital ID'}</span>
                </button>

                {onOpenProfileModal && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenProfileModal();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                  >
                    <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span>{lang === 'th' ? 'แก้ไขข้อมูลบัญชี' : 'Edit Account'}</span>
                  </button>
                )}

                {onLogout && (
                  <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
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
        : canViewTimetable
          ? activeTab === 'timetable'
          : currentRole === 'student'
            ? canAccessHomework
              ? activeTab === 'homework'
              : canViewGradesStudent
                ? activeTab === 'student_grades'
                : canPlayGames
                  ? activeTab === 'games'
                  : activeTab === 'portfolio'
            : activeTab === 'executive';

  const slot4IsAnnouncements = canOpenAnnouncements;
  const slot4Active = slot4IsAnnouncements
    ? activeTab === 'announcements'
    : activeTab === 'profile';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]/92 backdrop-blur-xl shadow-[0_-8px_28px_-14px_rgba(37,99,235,0.18)] px-2 py-1 safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
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

        {/* SLOT 2: CHECK-IN / LOGS */}
        <button
          type="button"
          onClick={() => {
            if (canSelfCheckin) {
              if (currentRole === 'parent') {
                setActiveTab('attendance_history');
              } else {
                onResetCheckinToSelfie();
                setActiveTab('checkin');
              }
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
                  ? 'ลงเวลา'
                  : 'Check-in'}
          </span>
        </button>

        {/* SLOT 3: TIMETABLE / ADMIN MANAGE */}
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
        ) : (
          <button
            type="button"
            onClick={() => {
              if (canViewTimetable) {
                setActiveTab('timetable');
              } else if (currentRole === 'student') {
                if (canAccessHomework) setActiveTab('homework');
                else if (canViewGradesStudent) setActiveTab('student_grades');
                else if (canPlayGames) {
                  setActiveTab('games');
                  setActiveGameView('hub');
                } else if (canOpenPortfolio) setActiveTab('portfolio');
                else setActiveTab('profile');
              } else {
                setActiveTab('executive');
              }
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
              <FutureNavIcon
                tab={
                  canViewTimetable
                    ? 'timetable'
                    : currentRole === 'student'
                      ? canAccessHomework
                        ? 'homework'
                        : 'gradebook'
                      : 'executive_monitor'
                }
                size={18}
                active={slot3Active}
              />
            </span>
            <span className="text-[11px] truncate max-w-full">
              {canViewTimetable
                ? currentRole === 'teacher'
                  ? lang === 'th'
                    ? 'ตารางสอน'
                    : 'Schedule'
                  : lang === 'th'
                    ? 'ตารางเรียน'
                    : 'Schedule'
                : currentRole === 'student'
                  ? canAccessHomework
                    ? lang === 'th'
                      ? 'การบ้าน'
                      : 'Tasks'
                    : canViewGradesStudent
                      ? lang === 'th'
                        ? 'เกรด'
                        : 'Grades'
                      : lang === 'th'
                        ? 'เกมส์'
                        : 'Games'
                  : lang === 'th'
                    ? 'ภาพรวม'
                    : 'Overview'}
            </span>
          </button>
        )}

        {/* SLOT 4: ANNOUNCEMENTS / ACCOUNT */}
        <button
          type="button"
          onClick={() => setActiveTab(slot4IsAnnouncements ? 'announcements' : 'profile')}
          className={`tone-6 min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            slot4Active
              ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-bold'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <span
            className={`inline-flex items-center justify-center w-8 h-6 rounded-lg mb-0.5 transition ${
              slot4Active ? 'tone-chip-solid shadow-xs' : ''
            }`}
          >
            {slot4IsAnnouncements ? (
              <FutureNavIcon tab="announcements" size={18} active={slot4Active} />
            ) : (
              <User className="w-4.5 h-4.5" />
            )}
          </span>
          <span className="text-[11px] truncate max-w-full">
            {slot4IsAnnouncements
              ? lang === 'th'
                ? 'ประกาศ'
                : 'News'
              : lang === 'th'
                ? 'บัญชี'
                : 'Account'}
          </span>
        </button>
      </div>
    </nav>
  );
};
