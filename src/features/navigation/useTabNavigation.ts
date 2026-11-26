import { useEffect, useState } from 'react';
import type {
  AdaptivePracticeTopic,
  AppLanguage,
  AppProgramMode,
  RolePermissionConfig,
  SchoolFeatureFlags,
  Student,
  UserRole,
} from '../../types';
import type { NavTab } from '../../components/layout/Sidebar';
import type { DashboardSubTab } from '../../views/DashboardView';
import type { StudentsMoeJumpTarget, StudentsViewSubTab } from '../../views/StudentsView';
import type { SystemSettingsTab } from '../../views/SystemSettingsView';
import type { SchoolPermissionsState } from '../../lib/schoolPermissions';
import type { DeepLinkParams } from './useDeepLinkParams';
import { isAllowedProgramModeForRole } from '../../lib/attendanceScope';
import {
  getPackageLevelLabel,
  getRequiredPackageLevelForTab,
  isProgramModeEnabledByFeatureFlags,
  isTabEnabledByFeatureFlags,
} from '../../lib/schoolFeatureFlags';

export interface GradebookJumpTarget {
  courseId?: string;
  studentId?: string;
  tab?:
    | 'gradebook'
    | 'indicators'
    | 'pp5'
    | 'pp5_core_summary'
    | 'pp6'
    | 'core_report_card'
    | 'qualitative_summary'
    | 'pp3_online'
    | 'moe_student_hub'
    | 'onet_niets';
}

export interface TimetableCheckinTarget {
  courseId?: string;
  courseCode?: string;
  periodNumber: number;
  date: string;
  checkType: 'check_in' | 'check_out';
}

export type SuperAdminSubTab =
  | 'approvals'
  | 'packages'
  | 'permissions'
  | 'promotions'
  | 'schools'
  | 'central_exams'
  | 'exam_payment'
  | 'audit_logs';

const SUPER_ADMIN_TAB_TO_SUBTAB: Partial<Record<NavTab, SuperAdminSubTab>> = {
  super_admin_console: 'approvals',
  super_admin_approvals: 'approvals',
  super_admin_schools: 'schools',
  super_admin_packages: 'packages',
  super_admin_promotions: 'promotions',
  super_admin_permissions: 'permissions',
  super_admin_central_exams: 'central_exams',
  super_admin_exam_payment: 'exam_payment',
  super_admin_audit: 'audit_logs',
};

interface UseTabNavigationParams {
  deepLinkParams: DeepLinkParams | null;
  currentRole: UserRole;
  isSuperAdminSchoolView: boolean;
  lang: AppLanguage;
  rolePermissions: RolePermissionConfig[];
  activeFeatureFlags?: SchoolFeatureFlags;
  schoolPermissions: SchoolPermissionsState;
  onSetSuperAdminSchoolView: (value: boolean) => void;
  onOpenBackupCenter?: () => void;
  onSyncError: (message: string | null) => void;
}

export function useTabNavigation({
  deepLinkParams,
  currentRole,
  isSuperAdminSchoolView,
  lang,
  rolePermissions,
  activeFeatureFlags,
  schoolPermissions,
  onSetSuperAdminSchoolView,
  onOpenBackupCenter,
  onSyncError,
}: UseTabNavigationParams) {
  const [currentTab, setCurrentTab] = useState<NavTab>(deepLinkParams ? 'mobile_checkin' : 'dashboard');
  const [timetableCheckinTarget, setTimetableCheckinTarget] = useState<TimetableCheckinTarget | null>(null);
  const [dashboardInitialSubTab, setDashboardInitialSubTab] = useState<DashboardSubTab>('overview');
  const [systemSettingsInitialTab, setSystemSettingsInitialTab] = useState<SystemSettingsTab>('school_general');
  const [superAdminSubTab, setSuperAdminSubTab] = useState<SuperAdminSubTab>('approvals');
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const [programMode, setProgramMode] = useState<AppProgramMode>('school_erp');
  const [lmsLessonJumpTarget, setLmsLessonJumpTarget] = useState<{ courseId: string; lessonId: string } | null>(null);
  const [adaptivePracticeTopic, setAdaptivePracticeTopic] = useState<AdaptivePracticeTopic | null>(null);
  const [devBookTargetStudentId, setDevBookTargetStudentId] = useState<string | undefined>(undefined);
  const [studentsSubTab, setStudentsSubTab] = useState<StudentsViewSubTab>('roster');
  const [studentsTargetStudentId, setStudentsTargetStudentId] = useState<string | undefined>(undefined);
  const [studentsMoeJumpTarget, setStudentsMoeJumpTarget] = useState<StudentsMoeJumpTarget | null>(null);
  const [gradebookJumpTarget, setGradebookJumpTarget] = useState<GradebookJumpTarget | null>(null);
  const [eduBattleInitialSubTab, setEduBattleInitialSubTab] = useState<'battle_royale_3d' | 'bank' | undefined>(undefined);

  const useImmersiveGameLayout = isGamePlaying || ['games', 'boss_raid', 'subject_labs'].includes(currentTab);

  useEffect(() => {
    setIsGamePlaying(false);
  }, [currentTab]);

  const hasGlobalRolePermission = (permission: keyof RolePermissionConfig['permissions']) => {
    if (currentRole === 'super_admin') return true;
    return rolePermissions.find((item) => item.role === currentRole)?.permissions[permission] === true;
  };

  useEffect(() => {
    const permissions = rolePermissions.find((item) => item.role === currentRole)?.permissions;
    const restrictedTab =
      (currentTab === 'behavior_sdq' && permissions?.manageSdq === false) ||
      (currentTab === 'infirmary' && permissions?.viewInfirmary === false);
    if (restrictedTab) {
      setCurrentTab('dashboard');
    }
  }, [currentTab, currentRole, rolePermissions]);

  useEffect(() => {
    const featureFlagTab = currentTab === 'attendance' && currentRole === 'student'
      ? 'mobile_checkin'
      : currentTab;
    if (currentRole === 'super_admin' && !isSuperAdminSchoolView) {
      if (programMode !== 'school_erp') {
        setProgramMode('school_erp');
      }
      if (currentTab !== 'super_admin_console' && currentTab !== 'admin_superadmin_desk') {
        setCurrentTab('super_admin_console');
      }
      return;
    }
    if (programMode === 'lms_classroom' && !isProgramModeEnabledByFeatureFlags('lms_classroom', activeFeatureFlags)) {
      setProgramMode('school_erp');
      setCurrentTab('dashboard');
      return;
    }
    if (
      programMode === 'parent_portal' &&
      currentRole !== 'parent' &&
      !isProgramModeEnabledByFeatureFlags('parent_portal', activeFeatureFlags)
    ) {
      setProgramMode('school_erp');
      setCurrentTab('dashboard');
      return;
    }
    if (
      programMode === 'school_erp' &&
      !(currentTab === 'super_admin_console' && currentRole === 'super_admin') &&
      !isTabEnabledByFeatureFlags(featureFlagTab, activeFeatureFlags, currentRole)
    ) {
      setCurrentTab('dashboard');
    }
  }, [programMode, currentTab, activeFeatureFlags, currentRole, isSuperAdminSchoolView]);

  const handleChangeProgramMode = (nextMode: AppProgramMode) => {
    if (!isAllowedProgramModeForRole(currentRole, nextMode)) return;
    if (!isProgramModeEnabledByFeatureFlags(nextMode, activeFeatureFlags)) {
      const requiredLevel = nextMode === 'parent_portal' ? 'level_2' : 'level_3';
      onSyncError(
        `โหมดนี้ยังไม่เปิดใช้งานในแพ็กเกจปัจจุบัน (ต้องอัปเกรดเป็น ${getPackageLevelLabel(requiredLevel, lang)})`
      );
      return;
    }
    setProgramMode(nextMode);
  };

  const navigateToAppTab = (tab: NavTab) => {
    setIsGamePlaying(false);
    if (tab !== 'mobile_checkin') {
      setTimetableCheckinTarget(null);
    }

    const requiredGlobalPermission: Partial<Record<NavTab, keyof RolePermissionConfig['permissions']>> = {
      behavior_sdq: 'manageSdq',
      infirmary: 'viewInfirmary',
    };
    const requiredPermission = requiredGlobalPermission[tab];
    if (requiredPermission && !hasGlobalRolePermission(requiredPermission)) {
      setCurrentTab('dashboard');
      setProgramMode('school_erp');
      onSyncError('บทบาทของคุณไม่ได้รับอนุญาตให้เข้าถึงโมดูลนี้จากการตั้งค่าส่วนกลาง');
      return;
    }

    if (currentRole === 'parent') {
      setProgramMode('parent_portal');
      return;
    }

    if (tab === 'super_admin_backup') {
      if (currentRole === 'super_admin') {
        onOpenBackupCenter?.();
      }
      return;
    }

    const mappedSuperAdminSubTab = SUPER_ADMIN_TAB_TO_SUBTAB[tab];
    if (mappedSuperAdminSubTab) {
      if (currentRole === 'super_admin') {
        onSetSuperAdminSchoolView(false);
        setProgramMode('school_erp');
        if (tab !== 'super_admin_console') {
          setSuperAdminSubTab(mappedSuperAdminSubTab);
        }
        setCurrentTab('super_admin_console');
      }
      return;
    }

    if (currentRole === 'super_admin' && !isSuperAdminSchoolView && tab !== 'admin_superadmin_desk') {
      setProgramMode('school_erp');
      setCurrentTab('super_admin_console');
      return;
    }

    if (tab === 'realtime_daily') {
      if (['super_admin', 'admin', 'teacher'].includes(currentRole)) {
        setDashboardInitialSubTab('realtime_daily');
        setProgramMode('school_erp');
        setCurrentTab('dashboard');
      }
      return;
    }

    if (tab === 'executive_monitor') {
      if (['super_admin', 'admin', 'teacher'].includes(currentRole)) {
        setDashboardInitialSubTab('executive_monitor');
        setProgramMode('school_erp');
        setCurrentTab('dashboard');
      }
      return;
    }

    if (tab === 'report_insights') {
      if (['super_admin', 'admin', 'teacher'].includes(currentRole)) {
        setDashboardInitialSubTab('insights');
        setProgramMode('school_erp');
        setCurrentTab('dashboard');
      }
      return;
    }

    if (tab === 'obec_executive_dashboard') {
      if (['super_admin', 'admin', 'teacher'].includes(currentRole)) {
        setDashboardInitialSubTab('obec_learning_areas');
        setProgramMode('school_erp');
        setCurrentTab('dashboard');
      }
      return;
    }

    if (tab === 'pp6_executive_dashboard') {
      if (['super_admin', 'admin', 'teacher'].includes(currentRole)) {
        setDashboardInitialSubTab('pp6_quality_overview');
        setProgramMode('school_erp');
        setCurrentTab('dashboard');
      }
      return;
    }

    if (tab === 'executive_warning') {
      if (!isTabEnabledByFeatureFlags('executive_warning', activeFeatureFlags, currentRole)) {
        onSyncError(
          `ระบบเตือนภัยความเสี่ยงยังไม่เปิดใช้งานในแพ็กเกจปัจจุบัน (ต้องอัปเกรดเป็น ${getPackageLevelLabel(
            getRequiredPackageLevelForTab('executive_warning') ?? 'level_3',
            lang
          )})`
        );
        setDashboardInitialSubTab('overview');
        setCurrentTab('dashboard');
        return;
      }
      if (['super_admin', 'admin', 'teacher'].includes(currentRole)) {
        setDashboardInitialSubTab('early_warning');
        setProgramMode('school_erp');
        setCurrentTab('dashboard');
      }
      return;
    }

    if (tab === 'school_gps') {
      if (['super_admin', 'admin'].includes(currentRole)) {
        setSystemSettingsInitialTab('school_gps');
        setProgramMode('school_erp');
        setCurrentTab('system_settings');
      }
      return;
    }

    if (tab === 'school_permissions') {
      if (['super_admin', 'admin'].includes(currentRole)) {
        setSystemSettingsInitialTab('school_permissions');
        setProgramMode('school_erp');
        setCurrentTab('system_settings');
      }
      return;
    }

    if (tab === 'admin_line_control') {
      if (['super_admin', 'admin'].includes(currentRole)) {
        setSystemSettingsInitialTab('line_events');
        setProgramMode('school_erp');
        setCurrentTab('system_settings');
      }
      return;
    }

    if (tab === 'admin_student_accounts') {
      if (['super_admin', 'admin'].includes(currentRole)) {
        setSystemSettingsInitialTab('student_accounts');
        setProgramMode('school_erp');
        setCurrentTab('system_settings');
      }
      return;
    }

    if (tab === 'admin_saas_audit') {
      if (['super_admin', 'admin'].includes(currentRole)) {
        setSystemSettingsInitialTab('saas_audit');
        setProgramMode('school_erp');
        setCurrentTab('system_settings');
      }
      return;
    }

    if (tab === 'system_settings') {
      if (['super_admin', 'admin'].includes(currentRole)) {
        setSystemSettingsInitialTab('control_overview');
        setProgramMode('school_erp');
        setCurrentTab('system_settings');
      }
      return;
    }

    const staffOnlyTabs: NavTab[] = [
      'students',
      'teachers',
      'courses',
      'billing',
      'announcements',
      'central_exam_hub',
      'realtime_daily',
      'executive_monitor',
      'report_insights',
      'obec_executive_dashboard',
      'pp6_executive_dashboard',
      'student_development_book',
      'qualitative_summary',
      'system_settings',
      'admin_superadmin_desk',
      'super_admin_console',
      'super_admin_approvals',
      'super_admin_schools',
      'super_admin_packages',
      'super_admin_promotions',
      'super_admin_permissions',
      'super_admin_central_exams',
      'super_admin_exam_payment',
      'super_admin_audit',
      'super_admin_backup',
    ];
    if (currentRole === 'student' && staffOnlyTabs.includes(tab)) {
      setDashboardInitialSubTab('overview');
      setCurrentTab('dashboard');
      return;
    }

    if (currentRole === 'student') {
      const blockedByPolicy =
        ((tab === 'attendance' || tab === 'mobile_checkin') && !schoolPermissions.student_self_checkin) ||
        (['games', 'study_streak', 'boss_raid', 'realworld_quests', 'subject_labs', 'ai_diagnostic', 'socratic_tutor', 'hall_of_fame'].includes(tab) &&
          !schoolPermissions.student_treasure_game) ||
        (tab === 'homework' && !schoolPermissions.student_submit_homework) ||
        (tab === 'portfolio' && !schoolPermissions.student_upload_portfolio) ||
        (tab === 'gradebook' && !schoolPermissions.student_view_grades);
      if (blockedByPolicy) {
        setDashboardInitialSubTab('overview');
        setCurrentTab('dashboard');
        return;
      }
    }

    if (currentRole === 'teacher') {
      const blockedByPolicy =
        (tab === 'billing' && !schoolPermissions.teacher_view_financials) ||
        (tab === 'behavior_sdq' && !schoolPermissions.teacher_sdq_screening) ||
        (tab === 'infirmary' && !schoolPermissions.teacher_infirmary_access) ||
        ((tab === 'attendance' || tab === 'mobile_checkin') && !schoolPermissions.teacher_attendance) ||
        (tab === 'homework' && !schoolPermissions.teacher_homework);
      if (blockedByPolicy) {
        setDashboardInitialSubTab('overview');
        setCurrentTab('dashboard');
        return;
      }
    }

    const featureFlagTab = tab === 'attendance' && currentRole === 'student' ? 'mobile_checkin' : tab;
    if (
      !(currentRole === 'super_admin' && tab === 'super_admin_console') &&
      !isTabEnabledByFeatureFlags(featureFlagTab, activeFeatureFlags, currentRole)
    ) {
      const isStudentAiTab =
        currentRole === 'student' &&
        ['ai_diagnostic', 'socratic_tutor', 'realworld_quests', 'career_quest'].includes(tab) &&
        activeFeatureFlags?.allowStudentsAi === false;
      setDashboardInitialSubTab('overview');
      setProgramMode('school_erp');
      setCurrentTab('dashboard');
      onSyncError(
        isStudentAiTab
          ? 'ผู้ดูแลโรงเรียนปิดการใช้งานฟังก์ชัน AI สำหรับนักเรียนชั่วคราว'
          : `โมดูลนี้ยังไม่เปิดใช้งานในแพ็กเกจปัจจุบัน (ต้องอัปเกรดเป็น ${getPackageLevelLabel(
              getRequiredPackageLevelForTab(tab) ?? 'level_2',
              lang
            )})`
      );
      return;
    }

    if (currentRole === 'super_admin' && tab === 'super_admin_console') {
      onSetSuperAdminSchoolView(false);
      setProgramMode('school_erp');
    }
    if (tab === 'dashboard') {
      setDashboardInitialSubTab('overview');
    }
    if (tab === 'students' && ['super_admin', 'admin', 'teacher'].includes(currentRole)) {
      setStudentsSubTab('roster');
      setCurrentTab('students');
      return;
    }
    if (tab === 'gradebook') {
      setGradebookJumpTarget(null);
      if (['super_admin', 'admin', 'teacher'].includes(currentRole)) {
        setStudentsSubTab('gradebook');
        setCurrentTab('students');
        return;
      }
    }
    if (tab === 'student_development_book' && ['super_admin', 'admin', 'teacher'].includes(currentRole)) {
      setDevBookTargetStudentId(undefined);
      setStudentsTargetStudentId(undefined);
      setStudentsSubTab('dev_book');
      setCurrentTab('students');
      return;
    }
    if (tab === 'qualitative_summary' && ['super_admin', 'admin', 'teacher'].includes(currentRole)) {
      setGradebookJumpTarget({ tab: 'qualitative_summary' });
      setStudentsSubTab('gradebook');
      setCurrentTab('students');
      return;
    }
    setCurrentTab(tab);
  };

  const handleOpenExamPaymentSettings = () => {
    setIsGamePlaying(false);
    onSetSuperAdminSchoolView(false);
    setProgramMode('school_erp');
    setSuperAdminSubTab('exam_payment');
    setCurrentTab('super_admin_console');
  };

  const handleOpenStudentMoeDocs = (student: Student) => {
    setIsGamePlaying(false);
    setStudentsTargetStudentId(student.id);
    setStudentsMoeJumpTarget({
      mode: 'docs',
      section: 'profile',
      docView: 'pp1',
      nonce: Date.now(),
    });
    setStudentsSubTab('moe_registry');
    setProgramMode('school_erp');
    setCurrentTab('students');
  };

  return {
    currentTab,
    setCurrentTab,
    programMode,
    setProgramMode,
    timetableCheckinTarget,
    setTimetableCheckinTarget,
    dashboardInitialSubTab,
    setDashboardInitialSubTab,
    systemSettingsInitialTab,
    setSystemSettingsInitialTab,
    superAdminSubTab,
    setSuperAdminSubTab,
    isGamePlaying,
    setIsGamePlaying,
    useImmersiveGameLayout,
    lmsLessonJumpTarget,
    setLmsLessonJumpTarget,
    adaptivePracticeTopic,
    setAdaptivePracticeTopic,
    devBookTargetStudentId,
    setDevBookTargetStudentId,
    studentsSubTab,
    setStudentsSubTab,
    studentsTargetStudentId,
    setStudentsTargetStudentId,
    studentsMoeJumpTarget,
    setStudentsMoeJumpTarget,
    gradebookJumpTarget,
    setGradebookJumpTarget,
    eduBattleInitialSubTab,
    setEduBattleInitialSubTab,
    hasGlobalRolePermission,
    navigateToAppTab,
    handleChangeProgramMode,
    handleOpenExamPaymentSettings,
    handleOpenStudentMoeDocs,
  };
}
