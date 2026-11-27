import React from 'react';
import {
  ArrowLeftRight,
  Bell,
  Building2,
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
  setLang?: (lang: AppLanguage) => void;
  isLight?: boolean;
  setThemePalette?: (palette: ThemePalette) => void;
  unreadCount: number;
  onOpenNotifications?: () => void;
  onOpenProfile: () => void;
  onOpenSchoolSwitcher?: () => void;
  canSwitchAdminTeacherMode: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  onSwitchToDesktopMode?: () => void;
  onLogout?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeSchool,
  currentUser,
  currentRole,
  lang,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenSchoolSwitcher,
  canSwitchAdminTeacherMode,
  onSwitchOperationalRole,
}) => {
  const profileDisplayName =
    (lang === 'th' ? currentUser?.fullNameTh : currentUser?.fullNameEn) ||
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    currentUser?.email ||
    '';
  const profileInitials = profileDisplayName.trim().slice(0, 2).toUpperCase();

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

        <div className="flex items-center gap-1 shrink-0">
          {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
            <button
              type="button"
              onClick={() => onSwitchOperationalRole(currentRole === 'admin' ? 'teacher' : 'admin')}
              className="min-h-[36px] px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-bold text-[var(--color-primary-text)] inline-flex items-center gap-1 cursor-pointer transition hover:bg-[var(--color-card)]"
              title={
                currentRole === 'admin'
                  ? lang === 'th'
                    ? 'สลับเป็นโหมดครูผู้สอน'
                    : 'Teacher mode'
                  : lang === 'th'
                    ? 'สลับเป็นโหมด Admin'
                    : 'Admin mode'
              }
            >
              <ArrowLeftRight className="w-3 h-3 shrink-0" />
              <span>{currentRole === 'admin' ? (lang === 'th' ? 'โหมดครู' : 'Teacher') : 'Admin'}</span>
            </button>
          )}

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

          <button
            type="button"
            onClick={onOpenProfile}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
            aria-label={lang === 'th' ? 'บัญชีและโปรไฟล์' : 'Account & Profile'}
            title={profileDisplayName || (lang === 'th' ? 'บัญชีและโปรไฟล์' : 'Account & Profile')}
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
