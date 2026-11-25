import React from 'react';
import { Briefcase, LayoutDashboard, QrCode, User } from 'lucide-react';
import type { AppProgramMode, SchoolFeatureFlags, UserRole } from '../../types';
import type { NavTab } from '../../components/layout/Sidebar';
import type { SchoolPermissionsState } from '../../lib/schoolPermissions';
import { isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getModuleTone } from '../../lib/moduleTheme';

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

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-card)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-3 py-1.5 grid grid-cols-4 gap-1">
      <button
        type="button"
        onClick={() => {
          onChangeProgramMode('school_erp');
          onNavigateTab('dashboard');
        }}
        className={`${getModuleTone('dashboard')} min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
          programMode === 'school_erp' && currentTab === 'dashboard'
            ? 'text-[var(--tone)] bg-[var(--tone-soft)]/70 font-semibold'
            : 'text-[var(--color-text-muted)]'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>หน้าหลัก</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onChangeProgramMode('school_erp');
          onNavigateTab(slot2Target);
        }}
        className={`${getModuleTone(slot2Target)} min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
          programMode === 'school_erp' && currentTab === slot2Target
            ? 'text-[var(--tone)] bg-[var(--tone-soft)]/70 font-semibold'
            : 'text-[var(--color-text-muted)]'
        }`}
      >
        <QrCode className="w-5 h-5" />
        <span>{slot2Label}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onChangeProgramMode('school_erp');
          onNavigateTab(slot3Target);
        }}
        className={`${getModuleTone(slot3Target)} min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
          programMode === 'school_erp' && currentTab === slot3Target
            ? 'text-[var(--tone)] bg-[var(--tone-soft)]/70 font-semibold'
            : 'text-[var(--color-text-muted)]'
        }`}
      >
        <Briefcase className="w-5 h-5" />
        <span>{slot3Label}</span>
      </button>

      <button
        type="button"
        onClick={onOpenProfileModal}
        className="tone-7 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition text-[var(--color-text-muted)] hover:text-[var(--tone)] cursor-pointer"
      >
        <User className="w-5 h-5" />
        <span>บัญชี</span>
      </button>
    </nav>
  );
};
