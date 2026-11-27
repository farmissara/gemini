import React from 'react';
import { Briefcase, Gamepad2, LayoutDashboard, QrCode, User } from 'lucide-react';
import type { AppProgramMode, SchoolFeatureFlags, UserRole } from '../../types';
import type { NavTab } from '../../components/layout/Sidebar';
import type { SchoolPermissionsState } from '../../lib/schoolPermissions';
import { isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getModuleTone } from '../../lib/moduleTheme';
import { FutureNavIcon } from '../../components/common/FutureIcon';

interface MobileBottomNavProps {
  currentRole: UserRole;
  isSuperAdminSchoolView: boolean;
  useImmersiveGameLayout: boolean;
  programMode: AppProgramMode;
  currentTab: NavTab;
  activeFeatureFlags?: SchoolFeatureFlags;
  schoolPermissions: SchoolPermissionsState;
  onChangeProgramMode: (mode: AppProgramMode) => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenProfileModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRole,
  isSuperAdminSchoolView,
  useImmersiveGameLayout,
  programMode,
  currentTab,
  activeFeatureFlags,
  schoolPermissions,
  onChangeProgramMode,
  onNavigateTab,
  onOpenProfileModal,
}) => {
  if ((currentRole === 'super_admin' && !isSuperAdminSchoolView) || currentRole === 'parent' || useImmersiveGameLayout) {
    return null;
  }

  const slot2Target: NavTab =
    currentRole === 'student'
      ? (schoolPermissions.student_self_checkin !== false && isTabEnabledByFeatureFlags('mobile_checkin', activeFeatureFlags, currentRole)
          ? 'mobile_checkin'
          : isTabEnabledByFeatureFlags('timetable', activeFeatureFlags, currentRole)
            ? 'timetable'
            : 'dashboard')
      : (isTabEnabledByFeatureFlags('attendance', activeFeatureFlags, currentRole)
          ? 'attendance'
          : isTabEnabledByFeatureFlags('timetable', activeFeatureFlags, currentRole)
            ? 'timetable'
            : 'dashboard');

  const slot2Label =
    slot2Target === 'mobile_checkin' || slot2Target === 'attendance'
      ? 'เช็คชื่อ'
      : slot2Target === 'timetable'
        ? 'ตารางเรียน'
        : 'หน้าหลัก';

  const canPortfolio =
    isTabEnabledByFeatureFlags('portfolio', activeFeatureFlags, currentRole) &&
    (currentRole !== 'student' || schoolPermissions.student_upload_portfolio);
  const canGrades =
    isTabEnabledByFeatureFlags('gradebook', activeFeatureFlags, currentRole) &&
    (currentRole !== 'student' || schoolPermissions.student_view_grades !== false);

  const slot3Target: NavTab = canPortfolio
    ? 'portfolio'
    : canGrades
      ? 'gradebook'
      : isTabEnabledByFeatureFlags('homework', activeFeatureFlags, currentRole)
        ? 'homework'
        : 'dashboard';

  const slot3Label =
    slot3Target === 'portfolio'
      ? 'ผลงาน'
      : slot3Target === 'gradebook'
        ? 'ผลการเรียน'
        : slot3Target === 'homework'
          ? 'การบ้าน'
          : 'หน้าหลัก';

  const canFarm = isTabEnabledByFeatureFlags('school_farm', activeFeatureFlags, currentRole);
  const canGames = isTabEnabledByFeatureFlags('games', activeFeatureFlags, currentRole);
  const showGamesSlot =
    (currentRole !== 'student' || schoolPermissions.student_treasure_game !== false) &&
    (canFarm || canGames);
  const gamesTarget: NavTab = canFarm ? 'school_farm' : 'games';

  const isHomeActive = programMode === 'school_erp' && currentTab === 'dashboard';
  const isSlot2Active = programMode === 'school_erp' && currentTab === slot2Target;
  const isSlot3Active = programMode === 'school_erp' && currentTab === slot3Target;
  const isGamesActive = currentTab === 'school_farm' || currentTab === 'games';

  return (
    <nav className={`md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-card)]/92 backdrop-blur-xl border-t border-[var(--color-border)] px-2 py-1.5 grid ${showGamesSlot ? 'grid-cols-5' : 'grid-cols-4'} gap-1 shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.18)]`}>
      <button
        type="button"
        onClick={() => {
          onChangeProgramMode('school_erp');
          onNavigateTab('dashboard');
        }}
        className={`${getModuleTone('dashboard')} min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition cursor-pointer ${
          isHomeActive
            ? 'text-[var(--tone)] font-bold'
            : 'text-[var(--color-text-muted)]'
        }`}
      >
        <span className={`flex h-7 w-11 items-center justify-center rounded-xl transition-all ${isHomeActive ? 'tone-chip-solid' : ''}`}>
          <FutureNavIcon tab="dashboard" fallback={LayoutDashboard} size={18} active={isHomeActive} />
        </span>
        <span>หน้าหลัก</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onChangeProgramMode('school_erp');
          onNavigateTab(slot2Target);
        }}
        className={`${getModuleTone(slot2Target)} min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition cursor-pointer ${
          isSlot2Active
            ? 'text-[var(--tone)] font-bold'
            : 'text-[var(--color-text-muted)]'
        }`}
      >
        <span className={`flex h-7 w-11 items-center justify-center rounded-xl transition-all ${isSlot2Active ? 'tone-chip-solid' : ''}`}>
          <FutureNavIcon tab={slot2Target} fallback={QrCode} size={18} active={isSlot2Active} />
        </span>
        <span>{slot2Label}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onChangeProgramMode('school_erp');
          onNavigateTab(slot3Target);
        }}
        className={`${getModuleTone(slot3Target)} min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition cursor-pointer ${
          isSlot3Active
            ? 'text-[var(--tone)] font-bold'
            : 'text-[var(--color-text-muted)]'
        }`}
      >
        <span className={`flex h-7 w-11 items-center justify-center rounded-xl transition-all ${isSlot3Active ? 'tone-chip-solid' : ''}`}>
          <FutureNavIcon tab={slot3Target} fallback={Briefcase} size={18} active={isSlot3Active} />
        </span>
        <span>{slot3Label}</span>
      </button>

      {showGamesSlot && (
        <button
          type="button"
          onClick={() => {
            onNavigateTab(gamesTarget);
          }}
          className={`${getModuleTone(gamesTarget)} min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition cursor-pointer ${
            isGamesActive
              ? 'text-[var(--tone)] font-bold'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          <span className={`flex h-7 w-11 items-center justify-center rounded-xl transition-all ${isGamesActive ? 'tone-chip-solid' : ''}`}>
            <FutureNavIcon tab={gamesTarget} fallback={Gamepad2} size={18} active={isGamesActive} />
          </span>
          <span>เกมส์</span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenProfileModal}
        className="tone-7 min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition text-[var(--color-text-muted)] hover:text-[var(--tone)] cursor-pointer"
      >
        <span className="flex h-7 w-11 items-center justify-center rounded-xl">
          <User className="w-[18px] h-[18px]" strokeWidth={1.9} />
        </span>
        <span>บัญชี</span>
      </button>
    </nav>
  );
};
