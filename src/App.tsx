import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  UserRole, 
  School,
  AuthUser,
  Student, 
  Teacher,
  Course, 
  AttendanceRecord, 
  GradeRecord, 
  TuitionInvoice, 
  Announcement, 
  SystemConfig, 
  AttendanceStatus,
  AttendanceCheckType,
  AttendanceUserType,
  AppProgramMode,
  AppLanguage,
  AppTheme,
  ThemePalette,
  GradingSystem,
  Lesson,
  Assignment,
  QuizQuestion,
  PlayerScore,
  RewardItem,
  RewardRedemptionRequest,
  PeriodAttendanceRecord,
  PortfolioItem,
  SchoolPeriodTime,
  TimetableSlot,
  BehaviorRecord,
  SdqAssessment,
  InfirmaryVisit,
  HomeworkSubmission,
  RolePermissionConfig,
  PromotionCampaign,
  SchoolSubscriptionPlan,
  LeaveRequest,
  LeaveStatus,
  CampusGateGeofence,
  CentralExamPack,
  SchoolExamEntitlement,
  AdaptivePracticeTopic,
  SchoolFeatureFlags
} from './types';
import {
  DEFAULT_ARCADE_REWARDS,
  awardArcadeRewardEvent,
  computeRankTitle,
  computeUpdatedDailyStreak,
  createRewardRedemptionRequest,
  loadAuthoritativeArcadeProfile,
  loadSchoolArcadeProfiles,
  loadSchoolRewardRedemptions,
  loadSchoolRewardsCatalog,
  saveSchoolCustomReward,
  redeemArcadeReward,
  triggerHaptic,
  updateRewardRedemptionStatus,
  upsertArcadePlayerProfile,
} from './lib/arcadeStore';
import {
  INITIAL_SYSTEM_CONFIG,
  INITIAL_ROLE_PERMISSIONS,
} from './data/mockData';
import {
  fetchMyRolePermissionConfig,
  fetchSuperAdminSettings,
  saveSuperAdminSetting,
  saveSuperAdminSettings,
} from './lib/superAdminSettings';
import {
  isPasswordRecoveryRedirect,
  restoreSupabaseSession,
  signOutFromSupabase,
  updateSchoolSettingsInSupabase,
  updateSchoolStatusInSupabase,
  updateUserProfileInSupabase,
} from './lib/authDb';
import type { AuthContext } from './lib/authDb';
import { fetchCoordinationMessages } from './lib/coordinationDesk';

type CoreSyncRows = {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
};

function findChangedRowIds<T extends { id: string }>(current: T[], previous: T[] | undefined): string[] {
  if (!previous) return current.map((row) => row.id);
  const previousById = new Map(previous.map((row) => [row.id, JSON.stringify(row)]));
  return current
    .filter((row) => previousById.get(row.id) !== JSON.stringify(row))
    .map((row) => row.id);
}

function hasChangedRowIds(changedIds: Record<keyof CoreSyncRows, string[]>): boolean {
  return Object.values(changedIds).some((ids) => ids.length > 0);
}

function getAcademicYearStartDate(label: string): string {
  const westernYear = label.match(/\b(20\d{2})\b/)?.[1];
  const thaiYear = label.match(/\b(25\d{2})\b/)?.[1];
  const year = westernYear ? Number(westernYear) : thaiYear ? Number(thaiYear) - 543 : new Date().getFullYear();
  return `${year}-05-01`;
}
import { 
  loadSchoolData, 
  loadAttendanceRangeFromSupabase,
  saveSchoolCampusGates, 
  saveSchoolGpsCoordinates, 
  saveSchoolPeriodTimes, 
  syncDataToSupabase, 
  loadSupabasePatchMigrationSql,
  deleteStudentFromDb,
  deleteTeacherFromDb,
  deleteCoursesFromDb,
  deleteStaleGradesFromDb,
  updateCourseEnrollmentInDb,
  deleteGradesForEnrollmentFromDb,
  saveTeachersToDb,
  saveTimetableSlotsToDb,
  deleteTimetableSlotFromDb,
  uploadSchoolAttachment,
  saveLeaveRequestToDb,
  updateLeaveRequestStatusInDb,
  savePeriodAttendanceBatchToDb,
  submitInvoiceSlipToDb,
  saveSchoolAssignmentToDb,
  saveHomeworkSubmissionToDb,
  saveHomeworkGradeToDb,
  saveQueuedAttendanceToDb,
} from './lib/supabase';
import { cleanupStudentCampusData } from './lib/campusDataStore';
import { clearSchoolSnapshotsForUser } from './lib/offlineSchoolCache';
import { hydrateSchoolRegistryFromSupabase } from './lib/studentRegistryStore';
import {
  deleteSchoolStudentRecord,
  loadSchoolStudentRecords,
  saveSchoolStudentRecord,
} from './lib/studentRecordsPersistence';
import { DEFAULT_SCHOOL_PERIODS } from './lib/schoolPeriods';
import {
  buildPrimaryGateFromSchool,
  isValidCoordinatePair,
  sanitizeSchoolCampusGates,
} from './lib/schoolGps';
import {
  calculateGrade,
  DEFAULT_SEMESTER_OPTIONS,
  DEFAULT_STAFF_POSITION_OPTIONS,
} from './lib/schoolSettings';
import {
  calculateStudentAcademicSummary,
  isSpecialMoeGrade,
} from './lib/moeGrading';
import {
  getDuplicateIdReports,
  getDuplicateRecordReports,
  getGradeDuplicateReasons,
} from './lib/duplicateRecords';
import type { DuplicateRecordReport, DuplicateRecordTarget } from './lib/duplicateRecords';
import { isMobileViewport } from './lib/screenOrientation';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { getModuleTone } from './lib/moduleTheme';
import { FocusToolbar } from './components/layout/FocusToolbar';
import { AuthLayout } from './components/layout/AuthLayout';
import { ViewErrorBoundary } from './components/common/ViewErrorBoundary';
import { PageSkeleton } from './components/common/PageSkeleton';
import { emitAppToast } from './components/common/ToastProvider';
import type { DashboardSubTab } from './views/DashboardView';
import type { StudentsViewSubTab, StudentsMoeJumpTarget } from './views/StudentsView';
import type { SystemSettingsTab } from './views/SystemSettingsView';
import type { GuideModuleId, ModuleGuideRoleView } from './components/modals/ModuleGuideModal';
import { GuideTourProvider } from './components/guide/GuideTourContext';
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { ConfirmActionModal } from './components/modals/ConfirmActionModal';

function lazyNamed<T extends Record<string, any>, K extends keyof T>(
  factory: () => Promise<T>,
  exportName: K,
): React.LazyExoticComponent<T[K]> {
  return lazy(() => factory().then((mod) => ({ default: mod[exportName] })));
}

const SchoolSwitcherModal = lazyNamed(() => import('./components/modals/SchoolSwitcherModal'), 'SchoolSwitcherModal');
const DashboardView = lazyNamed(() => import('./views/DashboardView'), 'DashboardView');
const StudentsView = lazyNamed(() => import('./views/StudentsView'), 'StudentsView');
const TeachersView = lazyNamed(() => import('./views/TeachersView'), 'TeachersView');
const CoursesView = lazyNamed(() => import('./views/CoursesView'), 'CoursesView');
const AttendanceView = lazyNamed(() => import('./views/AttendanceView'), 'AttendanceView');
const MobileAttendanceView = lazyNamed(() => import('./views/MobileAttendanceView'), 'MobileAttendanceView');
const EduBattleGameView = lazyNamed(() => import('./views/EduBattleGameView'), 'EduBattleGameView');
const PortfolioView = lazyNamed(() => import('./views/PortfolioView'), 'PortfolioView');
const GradebookView = lazyNamed(() => import('./views/GradebookView'), 'GradebookView');
const StudentQualityDevelopmentBookView = lazyNamed(() => import('./views/StudentQualityDevelopmentBookView'), 'StudentQualityDevelopmentBookView');
const GradeLevelQualitativeSummaryView = lazyNamed(() => import('./components/GradeLevelQualitativeSummaryView'), 'GradeLevelQualitativeSummaryView');
const BillingView = lazyNamed(() => import('./views/BillingView'), 'BillingView');
const AnnouncementsView = lazyNamed(() => import('./views/AnnouncementsView'), 'AnnouncementsView');
const LmsClassroomView = lazyNamed(() => import('./views/LmsClassroomView'), 'LmsClassroomView');
const ParentPortalView = lazyNamed(() => import('./views/ParentPortalView'), 'ParentPortalView');
const ReportCardModal = lazyNamed(() => import('./components/modals/ReportCardModal'), 'ReportCardModal');
const StudentDetailModal = lazyNamed(() => import('./components/modals/StudentDetailModal'), 'StudentDetailModal');
const TimetableScheduleView = lazyNamed(() => import('./views/TimetableScheduleView'), 'TimetableScheduleView');
const BehaviorSdqView = lazyNamed(() => import('./views/BehaviorSdqView'), 'BehaviorSdqView');
const DigitalIdCardView = lazyNamed(() => import('./views/DigitalIdCardView'), 'DigitalIdCardView');
const InfirmaryHealthView = lazyNamed(() => import('./views/InfirmaryHealthView'), 'InfirmaryHealthView');
const HomeworkTrackerView = lazyNamed(() => import('./views/HomeworkTrackerView'), 'HomeworkTrackerView');
const SuperAdminConsoleView = lazyNamed(() => import('./views/SuperAdminConsoleView'), 'SuperAdminConsoleView');
const SubjectLabSimulationView = lazyNamed(() => import('./views/SubjectLabSimulationView'), 'SubjectLabSimulationView');
const UserProfileModal = lazyNamed(() => import('./components/modals/UserProfileModal'), 'UserProfileModal');
const SystemSettingsView = lazyNamed(() => import('./views/SystemSettingsView'), 'SystemSettingsView');
const SchoolGpsModal = lazyNamed(() => import('./components/modals/SchoolGpsModal'), 'SchoolGpsModal');
const DataImportExportModal = lazyNamed(() => import('./components/modals/DataImportExportModal'), 'DataImportExportModal');
const BackupCenterModal = lazyNamed(() => import('./components/modals/BackupCenterModal'), 'BackupCenterModal');
const ModuleGuideModal = lazyNamed(() => import('./components/modals/ModuleGuideModal'), 'ModuleGuideModal');
const SchoolOnboardingTutorModal = lazyNamed(() => import('./components/modals/SchoolOnboardingTutorModal'), 'SchoolOnboardingTutorModal');
const AiDiagnosticLearningView = lazyNamed(() => import('./views/AiDiagnosticLearningView'), 'AiDiagnosticLearningView');
const HallOfFame3DView = lazyNamed(() => import('./views/HallOfFame3DView'), 'HallOfFame3DView');
const StudyStreakQuestPassView = lazyNamed(() => import('./views/StudyStreakQuestPassView'), 'StudyStreakQuestPassView');
const CoopBossRaidView = lazyNamed(() => import('./views/CoopBossRaidView'), 'CoopBossRaidView');
const SocraticTutorView = lazyNamed(() => import('./views/SocraticTutorView'), 'SocraticTutorView');
const RealWorldSnapQuestView = lazyNamed(() => import('./views/RealWorldSnapQuestView'), 'RealWorldSnapQuestView');
const MobileAppShell = lazyNamed(() => import('./components/layout/MobileAppShell'), 'MobileAppShell');
const NotificationCenterModal = lazyNamed(() => import('./components/modals/NotificationCenterModal'), 'NotificationCenterModal');
const AdminSuperAdminDeskView = lazyNamed(() => import('./views/AdminSuperAdminDeskView'), 'AdminSuperAdminDeskView');
const CentralExamHubView = lazyNamed(() => import('./views/CentralExamHubView'), 'CentralExamHubView');
const CentralExamNotificationPopup = lazyNamed(() => import('./views/CentralExamHubView'), 'CentralExamNotificationPopup');
const CareerQuestView = lazyNamed(() => import('./views/CareerQuestView'), 'CareerQuestView');
import {
  buildCentralExamSignature,
  CENTRAL_EXAMS_UPDATED_EVENT,
  claimCentralExamPack,
  countMissingBuiltInPacks,
  fetchCentralExamPacks,
  fetchSchoolExamEntitlements,
  fetchSchoolPersistedQuestions,
  getUnclaimedPublishedPacks,
  hasBuiltInSeedCompleted,
  hasSeenCentralExamPopup,
  markCentralExamPopupSeen,
  saveSchoolQuestionsBatch,
  syncMissingDefaultCentralExamPacksToSupabase,
} from './lib/centralExamBank';
import {
  getScopedNotificationsForUser,
  getScopedUnreadCountForUser,
  sendEduVerseNotification,
} from './lib/pushNotifications';
import { getParentUnreadNotificationCount, sendPrivateParentNotification } from './lib/parentNotifications';
import { dispatchGradeAlert } from './lib/gradeNotifications';
import { getLocalDateString } from './lib/date';
import { getHolidayForDate, isWeekendDate, syncPublicHolidaysFromApi } from './lib/thaiHolidays';
import { slotHasTeacher } from './lib/timetableTeachers';
import { enqueueOfflineAction, isOnlineNow, type OfflineQueueItem } from './lib/offlineSync';
import { appendAuditLog } from './lib/auditLog';
import {
  getSchoolFeatureFlags,
  isTabEnabledByFeatureFlags,
  isProgramModeEnabledByFeatureFlags,
  getRequiredPackageLevelForTab,
  getPackageLevelLabel,
} from './lib/schoolFeatureFlags';
import {
  loadPackageCatalog,
  loadSchoolFeatureFlagsFromDb,
  saveSchoolFeatureFlagsToDb,
} from './lib/schoolPackageStore';
import { useSchoolPermissions } from './lib/schoolPermissions';
import { loadSchoolLessons, saveSchoolLessonCompletionToDb, saveSchoolLessonToDb } from './lib/lmsPersistence';
import {
  resolveMatchedTeacherForUser,
  slotMatchesLoggedInTeacher,
  teacherMatchesCourse,
} from './lib/courseTeacherFilter';
import {
  filterAttendanceForUser,
  filterLeaveRequestsForUser,
  filterPeriodAttendanceForUser,
  isAllowedProgramModeForRole,
  resolveLinkedStudentsForUser,
} from './lib/attendanceScope';
import {
  filterAnnouncementsForRole,
  filterAssignmentsForPersonalRole,
  filterCoursesForPersonalRole,
  filterTimetableSlotsForPersonalRole,
} from './lib/studentDataScope';
import {
  getBiometricSoftLock,
  getPasskeyForUser,
  setBiometricSoftLock,
  verifyBiometricPasskey,
} from './lib/webAuthn';
import { LayoutDashboard, QrCode, Briefcase, X, User, Check, Copy, Database, Fingerprint, Lock, LogOut, RotateCw } from 'lucide-react';

const EMPTY_SCHOOL: School = {
  id: '',
  code: '',
  nameTh: '',
  nameEn: '',
  slug: '',
  type: 'public',
  province: '',
  address: '',
  phone: '',
  email: '',
  primaryColor: '#1d4ed8',
  studentsCount: 0,
  teachersCount: 0,
  academicYear: '',
  currentSemester: '',
  lineOaId: '',
  createdAt: '',
  status: 'pending',
};

export const App: React.FC = () => {
  // Multi-School & Auth State
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSchool, setActiveSchool] = useState<School>(EMPTY_SCHOOL);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => isPasswordRecoveryRedirect());
  const isDemoMode = false;
  const [isSuperAdminSchoolView, setIsSuperAdminSchoolView] = useState(false);
  const skipNextSuperAdminSyncRef = useRef(false);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [loadedSchoolId, setLoadedSchoolId] = useState<string | null>(null);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [isUsingCachedSchoolData, setIsUsingCachedSchoolData] = useState(false);
  const [dataSyncError, setDataSyncError] = useState<string | null>(null);
  const [dataSyncWarnings, setDataSyncWarnings] = useState<string[]>([]);
  const [dataSyncSummary, setDataSyncSummary] = useState<string | null>(null);
  const [orphanedGrades, setOrphanedGrades] = useState<GradeRecord[]>([]);
  const [isCleaningOrphanedGrades, setIsCleaningOrphanedGrades] = useState(false);
  const [showSchemaMigrationModal, setShowSchemaMigrationModal] = useState(false);
  const [patchMigrationSql, setPatchMigrationSql] = useState('');
  const [copiedMigrationSql, setCopiedMigrationSql] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [isUnlockingBiometrics, setIsUnlockingBiometrics] = useState(false);
  const [biometricLockError, setBiometricLockError] = useState<string | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const skipNextOfflineRowSyncRef = useRef(false);
  const lastSyncedRowsBySchoolRef = useRef(new Map<string, CoreSyncRows>());
  const attendanceLoadedRangesRef = useRef(new Map<string, Array<{ start: string | null; end: string | null; studentId?: string }>>());
  const attendanceRangeRequestsRef = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    if (showSchemaMigrationModal && !patchMigrationSql) {
      void loadSupabasePatchMigrationSql().then(setPatchMigrationSql);
    }
  }, [showSchemaMigrationModal, patchMigrationSql]);

  useEffect(() => {
    if (dataSyncSummary) {
      emitAppToast({ tone: 'success', message: dataSyncSummary });
    }
  }, [dataSyncSummary]);

  useEffect(() => {
    if (dataSyncError) {
      emitAppToast({ tone: 'error', title: 'ซิงก์ข้อมูลไม่สำเร็จ', message: dataSyncError });
    }
  }, [dataSyncError]);

  const handleCopyMigrationSql = async () => {
    try {
      const sql = patchMigrationSql || await loadSupabasePatchMigrationSql();
      if (!patchMigrationSql) setPatchMigrationSql(sql);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sql);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = sql;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedMigrationSql(true);
      emitAppToast({ tone: 'success', message: 'คัดลอกโค้ด SQL Migration แล้ว' });
      window.setTimeout(() => setCopiedMigrationSql(false), 2500);
    } catch (err) {
      console.warn('Could not copy SQL migration:', err);
    }
  };

  // Super Admin Management State (RBAC, Promotions, Subscription Plans)
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>(INITIAL_ROLE_PERMISSIONS);
  const [promotions, setPromotions] = useState<PromotionCampaign[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SchoolSubscriptionPlan[]>([]);
  const [superAdminConfigError, setSuperAdminConfigError] = useState<string | null>(null);

  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  useEffect(() => {
    if (!currentUser || isDemoMode || currentRole === 'super_admin') return;
    let active = true;
    // Never keep permissive mock defaults while the authenticated role's
    // server-side permission config is loading or unavailable.
    setRolePermissions([]);
    fetchMyRolePermissionConfig()
      .then((config) => {
        if (!active) return;
        const roleConfig = config && typeof config === 'object' && !Array.isArray(config)
          ? config as RolePermissionConfig
          : null;
        setRolePermissions(roleConfig?.role === currentRole ? [roleConfig] : []);
      })
      .catch(() => {
        if (active) setRolePermissions([]);
      });
    return () => { active = false; };
  }, [currentUser?.id, currentRole, isDemoMode]);

  useEffect(() => {
    if (currentUser?.role !== 'super_admin' || isDemoMode) return;
    let active = true;
    setSuperAdminConfigError(null);
    fetchSuperAdminSettings()
      .then((settings) => {
        if (!active) return;
        if (Array.isArray(settings.role_permissions)) {
          setRolePermissions(settings.role_permissions as RolePermissionConfig[]);
        }
        if (Array.isArray(settings.promotions)) {
          setPromotions(settings.promotions as PromotionCampaign[]);
        }
        if (Array.isArray(settings.subscription_plans)) {
          setSubscriptionPlans(settings.subscription_plans as SchoolSubscriptionPlan[]);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSuperAdminConfigError(
            error instanceof Error ? error.message : 'โหลดการตั้งค่า Super Admin ไม่สำเร็จ'
          );
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.role, isDemoMode]);

  // Parse URL query params for direct Period QR / Check-in Link entry
  const deepLinkParams = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const sp = new URLSearchParams(window.location.search);
      const tab = sp.get('tab');
      const subTab = sp.get('subTab');
      const courseId = sp.get('courseId') || undefined;
      const periodStr = sp.get('period');
      const date = sp.get('date') || undefined;
      const code = sp.get('code') || undefined;
      const expStr = sp.get('exp');
      const token = sp.get('token') || undefined;
      const checkTypeParam = sp.get('checkType');
      const checkType: 'check_in' | 'check_out' | undefined =
        checkTypeParam === 'check_out' ? 'check_out' : checkTypeParam === 'check_in' ? 'check_in' : undefined;
      const expiresAt = expStr && !Number.isNaN(Number(expStr)) ? Number(expStr) : undefined;
      const periodNumber = periodStr && !Number.isNaN(Number(periodStr)) ? Number(periodStr) : undefined;
      const isPeriodDeepLink = tab === 'mobile_checkin' || subTab === 'period_checkin' || Boolean(courseId);
      if (!isPeriodDeepLink) return null;
      return {
        subTab: (subTab === 'leave_request' || subTab === 'period_checkin' || subTab === 'teacher_proxy' || subTab === 'nfc_tap'
          ? subTab
          : 'period_checkin') as 'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin',
        courseId,
        periodNumber,
        date,
        code,
        expiresAt,
        token,
        checkType,
      };
    } catch {
      return null;
    }
  })();

  // Navigation, Mode, Theme, Language & Mobile Drawer State
  const [currentTab, setCurrentTab] = useState<NavTab>(deepLinkParams ? 'mobile_checkin' : 'dashboard');
  const [timetableCheckinTarget, setTimetableCheckinTarget] = useState<{
    courseId?: string;
    courseCode?: string;
    periodNumber: number;
    date: string;
    checkType: 'check_in' | 'check_out';
  } | null>(null);
  const [dashboardInitialSubTab, setDashboardInitialSubTab] = useState<DashboardSubTab>('overview');
  const [systemSettingsInitialTab, setSystemSettingsInitialTab] = useState<SystemSettingsTab>('school_general');
  const [superAdminSubTab, setSuperAdminSubTab] = useState<'approvals' | 'permissions' | 'promotions' | 'schools' | 'central_exams' | 'exam_payment'>('approvals');
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const [programMode, setProgramMode] = useState<AppProgramMode>('school_erp');
  const [lmsLessonJumpTarget, setLmsLessonJumpTarget] = useState<{ courseId: string; lessonId: string } | null>(null);
  const [lang, setLang] = useState<AppLanguage>('th');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [themePalette, setThemePalette] = useState<ThemePalette>('light_warm');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCompactViewport, setIsSidebarCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1360,
  );
  const [isSidebarExpandedForCompactViewport, setIsSidebarExpandedForCompactViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('eduverse_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('eduverse_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed]);
  useEffect(() => {
    const updateViewportSidebar = () => {
      const compact = window.innerWidth < 1360;
      setIsSidebarCompactViewport(compact);
      if (!compact) setIsSidebarExpandedForCompactViewport(false);
    };
    window.addEventListener('resize', updateViewportSidebar, { passive: true });
    return () => window.removeEventListener('resize', updateViewportSidebar);
  }, []);
  const sidebarIsCollapsed = isSidebarCollapsed || (isSidebarCompactViewport && !isSidebarExpandedForCompactViewport);

  const [focusMode, setFocusMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('baanpakkru_focus_mode') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (focusMode) {
      setIsMobileMenuOpen(false);
    }
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('baanpakkru_focus_mode', focusMode ? '1' : '0');
    } catch {
      // ignore
    }
  }, [focusMode]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFocusMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const [adminSimplifiedView, setAdminSimplifiedView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('baanpakkru_admin_simplified_view') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('baanpakkru_admin_simplified_view', adminSimplifiedView ? '1' : '0');
    } catch {
      // ignore
    }
  }, [adminSimplifiedView]);
  const [dismissedDuplicateWarning, setDismissedDuplicateWarning] = useState(false);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const [adaptivePracticeTopic, setAdaptivePracticeTopic] = useState<AdaptivePracticeTopic | null>(null);
  const [devBookTargetStudentId, setDevBookTargetStudentId] = useState<string | undefined>(undefined);
  const [studentsSubTab, setStudentsSubTab] = useState<StudentsViewSubTab>('roster');
  const [studentsTargetStudentId, setStudentsTargetStudentId] = useState<string | undefined>(undefined);
  const [studentsMoeJumpTarget, setStudentsMoeJumpTarget] = useState<StudentsMoeJumpTarget | null>(null);
  const [gradebookJumpTarget, setGradebookJumpTarget] = useState<{
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
  } | null>(null);
  const [featureFlagsBySchool, setFeatureFlagsBySchool] = useState<Record<string, SchoolFeatureFlags>>({});

  useEffect(() => {
    setDismissedDuplicateWarning(false);
    setShowDuplicateDetails(false);
  }, [activeSchool.id]);

  // Screen size detection and user view preference ('auto' | 'mobile' | 'desktop')
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => isMobileViewport());
  const [isPortraitScreen, setIsPortraitScreen] = useState<boolean>(() => (
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  ));
  const [deviceViewPreference, setDeviceViewPreference] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(isMobileViewport());
      setIsPortraitScreen(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const shouldShowMobileView = deviceViewPreference === 'mobile' || (deviceViewPreference === 'auto' && isMobileScreen);
  const isMobileInDesktopView = isMobileScreen && deviceViewPreference === 'desktop';
  const useImmersiveGameLayout = isGamePlaying || ['games', 'boss_raid', 'subject_labs'].includes(currentTab);

  // Sync Tailwind .dark class and custom CSS theme variables with active themePalette
  useEffect(() => {
    const isDarkTheme = themePalette?.includes('dark') || themePalette === 'sapphire';
    const rootEl = document.documentElement;
    rootEl.classList.toggle('dark', isDarkTheme);
    rootEl.classList.remove('theme-light_warm', 'theme-light_sky', 'theme-sapphire', 'theme-light', 'theme-dark');
    if (themePalette) {
      rootEl.classList.add(`theme-${themePalette}`);
    }
    setTheme(isDarkTheme ? 'dark' : 'light');
  }, [themePalette]);

  useEffect(() => {
    setIsGamePlaying(false);
  }, [currentTab]);

  // Primary Domain State
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const getCurrentSchoolSyncRows = (): CoreSyncRows => ({
    students: students.filter((item) => item.schoolId === activeSchool.id),
    teachers: teachers.filter((item) => !item.schoolId || item.schoolId === activeSchool.id),
    courses: courses.filter((item) => item.schoolId === activeSchool.id),
    grades: grades.filter((item) => item.schoolId === activeSchool.id),
    attendance: attendance.filter((item) => item.schoolId === activeSchool.id),
    invoices: invoices.filter((item) => item.schoolId === activeSchool.id),
    announcements: announcements.filter((item) => item.schoolId === activeSchool.id),
  });
  const loadAttendanceHistory = useCallback(async (
    startDate?: string | null,
    endDate?: string | null,
    studentId?: string,
  ) => {
    const schoolId = activeSchool.id;
    if (!schoolId) return;
    const ownerId = currentUser?.id || 'anonymous';
    const rangeScopeKey = `${ownerId}:${schoolId}`;
    const requestKey = `${rangeScopeKey}:${studentId || '*'}:${startDate || '*'}:${endDate || '*'}`;
    const currentRanges = attendanceLoadedRangesRef.current.get(rangeScopeKey) || [];
    const requestStart = startDate || '0000-01-01';
    const requestEnd = endDate || '9999-12-31';
    const alreadyCovered = currentRanges.some((range) => {
      const coversStudent = !range.studentId || range.studentId === studentId;
      const rangeStart = range.start || '0000-01-01';
      const rangeEnd = range.end || '9999-12-31';
      return coversStudent && rangeStart <= requestStart && rangeEnd >= requestEnd;
    });
    if (alreadyCovered) return;
    const inFlight = attendanceRangeRequestsRef.current.get(requestKey);
    if (inFlight) return inFlight;

    const request = loadAttendanceRangeFromSupabase(schoolId, startDate, endDate, studentId)
      .then((loadedRows) => {
        if (activeSchool.id !== schoolId || (currentUser?.id || 'anonymous') !== ownerId) return;
        const ranges = attendanceLoadedRangesRef.current.get(rangeScopeKey) || [];
        ranges.push({ start: startDate || null, end: endDate || null, ...(studentId ? { studentId } : {}) });
        attendanceLoadedRangesRef.current.set(rangeScopeKey, ranges);
        const syncBaseline = lastSyncedRowsBySchoolRef.current.get(schoolId);
        if (syncBaseline) {
          const baselineById = new Map(syncBaseline.attendance.map((record) => [record.id, record]));
          loadedRows.forEach((record) => {
            if (!baselineById.has(record.id)) baselineById.set(record.id, record);
          });
          lastSyncedRowsBySchoolRef.current.set(schoolId, {
            ...syncBaseline,
            attendance: [...baselineById.values()],
          });
        }
        setAttendance((previous) => {
          const recordsById = new Map(previous.map((record) => [record.id, record]));
          loadedRows.forEach((record) => {
            if (!recordsById.has(record.id)) recordsById.set(record.id, record);
          });
          return [...recordsById.values()].sort((a, b) => (`${b.date} ${b.time}`).localeCompare(`${a.date} ${a.time}`));
        });
      })
      .catch((error: unknown) => {
        console.warn('Could not load selected attendance history:', error);
      })
      .finally(() => attendanceRangeRequestsRef.current.delete(requestKey));
    attendanceRangeRequestsRef.current.set(requestKey, request);
    return request;
  }, [activeSchool.id, currentUser?.id]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>(DEFAULT_ARCADE_REWARDS);
  const [rewardRedemptions, setRewardRedemptions] = useState<RewardRedemptionRequest[]>([]);
  const [periodAttendance, setPeriodAttendance] = useState<PeriodAttendanceRecord[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [schoolPeriods, setSchoolPeriods] = useState<SchoolPeriodTime[]>(DEFAULT_SCHOOL_PERIODS);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
  const [sdqAssessments, setSdqAssessments] = useState<SdqAssessment[]>([]);
  const [infirmaryVisits, setInfirmaryVisits] = useState<InfirmaryVisit[]>([]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>([]);
  const [campusGates, setCampusGates] = useState<CampusGateGeofence[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    const isGradebookOpen = currentTab === 'gradebook' || (currentTab === 'students' && studentsSubTab === 'gradebook');
    if (!isGradebookOpen || !['admin', 'teacher', 'super_admin'].includes(currentUser?.role || '')) return;
    void loadAttendanceHistory(
      getAcademicYearStartDate(systemConfig.academicYear || activeSchool.academicYear || ''),
      getLocalDateString(),
    );
  }, [currentTab, studentsSubTab, currentUser?.role, activeSchool.id, activeSchool.academicYear, systemConfig.academicYear, loadAttendanceHistory]);

  // Load and synchronize real school GPS campus gates per active school (never sample/demo gates)
  useEffect(() => {
    try {
      const cacheKey = `eduverse_campus_gates_${activeSchool.id}`;
      const savedGatesRaw = localStorage.getItem(cacheKey);
      if (savedGatesRaw) {
        const parsed = JSON.parse(savedGatesRaw) as CampusGateGeofence[];
        const cleaned = sanitizeSchoolCampusGates(parsed, activeSchool.id);
        if (cleaned.length > 0) {
          if (cleaned.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
            localStorage.setItem(cacheKey, JSON.stringify(cleaned));
          }
          setCampusGates(cleaned);
          return;
        }
        // Purge stale legacy sample gates from localStorage
        localStorage.removeItem(cacheKey);
      }

      const primaryFromSchool = buildPrimaryGateFromSchool(activeSchool);
      if (primaryFromSchool) {
        setCampusGates([primaryFromSchool]);
      } else {
        setCampusGates([]);
      }
    } catch {
      setCampusGates([]);
    }
  }, [activeSchool.id, activeSchool.nameTh, activeSchool.nameEn, activeSchool.latitude, activeSchool.longitude, activeSchool.geofenceRadiusMeters]);

  // Modals
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideModalInitialModule, setGuideModalInitialModule] = useState<GuideModuleId>('dashboard');
  const [guideModalInitialRoleView, setGuideModalInitialRoleView] = useState<ModuleGuideRoleView | undefined>(undefined);
  const [isGuideTourEnabled, setIsGuideTourEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('eduverse_guide_tour_enabled') !== '0';
  });
  const handleToggleGuideTour = (next?: boolean) => {
    setIsGuideTourEnabled((prev) => {
      const resolved = typeof next === 'boolean' ? next : !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('eduverse_guide_tour_enabled', resolved ? '1' : '0');
      }
      return resolved;
    });
  };
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    detailNote?: string;
    confirmLabel: string;
    tone?: 'danger' | 'primary';
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [isConfirmModalBusy, setIsConfirmModalBusy] = useState(false);
  const [showOnboardingTutorModal, setShowOnboardingTutorModal] = useState<boolean>(false);
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);
  const [showBackupCenterModal, setShowBackupCenterModal] = useState(false);
  const [importExportInitialTab, setImportExportInitialTab] = useState<string>('students');
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [coordinationUnreadCount, setCoordinationUnreadCount] = useState<number>(0);
  const [centralExamPacks, setCentralExamPacks] = useState<CentralExamPack[]>([]);
  const [schoolExamEntitlements, setSchoolExamEntitlements] = useState<SchoolExamEntitlement[]>([]);
  const [showCentralExamPopup, setShowCentralExamPopup] = useState<boolean>(false);
  const [eduBattleInitialSubTab, setEduBattleInitialSubTab] = useState<'battle_royale_3d' | 'bank' | undefined>(undefined);

  useEffect(() => {
    void syncPublicHolidaysFromApi(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (!currentUser || !['admin', 'super_admin'].includes(currentRole)) {
      setCoordinationUnreadCount(0);
      return;
    }
    let active = true;
    const scopeId = currentRole === 'super_admin' ? undefined : activeSchool.id;
    fetchCoordinationMessages(scopeId)
      .then((msgs) => {
        if (!active) return;
        const count = currentRole === 'super_admin'
          ? msgs.filter((m) => m.senderRole === 'admin' && !m.readBySuperAdmin).length
          : msgs.filter((m) => m.schoolId === activeSchool.id && m.senderRole === 'super_admin' && !m.readByAdmin).length;
        setCoordinationUnreadCount(count);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCoordinationUnreadCount(0);
        setDataSyncError(
          error instanceof Error
            ? `Coordination inbox error: ${error.message}`
            : 'Could not load coordination inbox.'
        );
      });
    return () => {
      active = false;
    };
  }, [currentUser, currentRole, activeSchool.id, currentTab]);

  // Load Central Exam Packs (8 Strands), School Entitlements, and Persisted School Questions
  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    const loadCentralExamState = async () => {
      try {
        let [packs, entitlements, persistedSchoolQs] = await Promise.all([
          fetchCentralExamPacks(isDemoMode),
          fetchSchoolExamEntitlements(activeSchool.id, isDemoMode),
          fetchSchoolPersistedQuestions(activeSchool.id, isDemoMode),
        ]);
        if (!active) return;

        if (
          !isDemoMode &&
          currentRole === 'super_admin' &&
          countMissingBuiltInPacks(packs) > 0 &&
          (packs.length === 0 || !hasBuiltInSeedCompleted())
        ) {
          try {
            const synced = await syncMissingDefaultCentralExamPacksToSupabase(packs, {
              isDemoMode,
              silent: true,
            });
            if (!active) return;
            packs = synced.packs;
          } catch (seedError) {
            console.warn('Auto-seed central exam packs skipped:', seedError);
          }
        }

        setCentralExamPacks(packs);
        setSchoolExamEntitlements(entitlements);

        if (persistedSchoolQs.length > 0) {
          setQuestions((prev) => {
            const byId = new Map<string, QuizQuestion>();
            for (const q of [...persistedSchoolQs, ...prev]) {
              byId.set(q.id, q);
            }
            return Array.from(byId.values());
          });
        }
      } catch (error) {
        if (active) {
          setDataSyncError(
            error instanceof Error ? `Central exam data error: ${error.message}` : 'Could not load central exam data.'
          );
        }
      }
    };

    void loadCentralExamState();
    const handleUpdated = () => {
      void loadCentralExamState();
    };
    window.addEventListener(CENTRAL_EXAMS_UPDATED_EVENT, handleUpdated);
    return () => {
      active = false;
      window.removeEventListener(CENTRAL_EXAMS_UPDATED_EVENT, handleUpdated);
    };
  }, [currentUser?.id, currentRole, activeSchool.id, isDemoMode]);

  const unclaimedCentralPacks = getUnclaimedPublishedPacks(centralExamPacks, schoolExamEntitlements);

  // Filter items by active school
  const schoolStudents = students.filter((s) => s.schoolId === activeSchool.id);
  const schoolTeachers = teachers.filter((t) => !t.schoolId || t.schoolId === activeSchool.id);
  const schoolCourses = courses.filter((c) => c.schoolId === activeSchool.id);
  const schoolGrades = grades.filter((g) => g.schoolId === activeSchool.id);
  const schoolAttendance = attendance.filter((a) => a.schoolId === activeSchool.id);
  const schoolInvoices = invoices.filter((i) => i.schoolId === activeSchool.id);
  const schoolAnnouncements = announcements.filter((a) => a.schoolId === activeSchool.id);
  const schoolLessons = lessons.filter((l) => l.schoolId === activeSchool.id);
  const schoolAssignments = assignments.filter((a) => a.schoolId === activeSchool.id);
  const schoolQuestions = questions.filter((q) => !q.schoolId || q.schoolId === activeSchool.id);
  const schoolPeriodAttendance = periodAttendance.filter((p) => !p.schoolId || p.schoolId === activeSchool.id);
  const schoolPortfolioItems = portfolioItems.filter((p) => !p.schoolId || p.schoolId === activeSchool.id);
  const timetableAcademicYear = activeSchool.academicYear || systemConfig.academicYear;
  const timetableSemester = activeSchool.currentSemester || systemConfig.currentSemester;
  const schoolTimetableSlotsAllTerms = timetableSlots
    .filter((slot) => !slot.schoolId || slot.schoolId === activeSchool.id)
    .map((slot) => ({
      ...slot,
      academicYear: slot.academicYear || timetableAcademicYear,
      semester: slot.semester || timetableSemester,
    }));
  const schoolTimetableSlots = schoolTimetableSlotsAllTerms.filter((slot) => (
      slot.academicYear === timetableAcademicYear &&
      slot.semester === timetableSemester
    ));
  const schoolBehaviorRecords = behaviorRecords.filter((b) => !b.schoolId || b.schoolId === activeSchool.id);
  const schoolSdqAssessments = sdqAssessments.filter((s) => !s.schoolId || s.schoolId === activeSchool.id);
  const schoolInfirmaryVisits = infirmaryVisits.filter((i) => !i.schoolId || i.schoolId === activeSchool.id);
  const schoolHomeworkSubmissions = homeworkSubmissions.filter((h) => !h.schoolId || h.schoolId === activeSchool.id);
  const schoolLeaveRequests = leaveRequests.filter((request) => !request.schoolId || request.schoolId === activeSchool.id);
  const schoolPermissions = useSchoolPermissions(activeSchool.id);
  const matchedTeacherForScope = currentRole === 'teacher'
    ? resolveMatchedTeacherForUser(currentUser, schoolTeachers)
    : undefined;
  const teacherScopedCourses = currentRole === 'teacher' && matchedTeacherForScope
    ? schoolCourses.filter((course) => teacherMatchesCourse(matchedTeacherForScope, course))
    : currentRole === 'teacher' ? [] : schoolCourses;
  const teacherCourseIds = new Set(teacherScopedCourses.map((course) => course.id));
  const teacherStudentKeys = new Set<string>();
  teacherScopedCourses.forEach((course) => {
    (course.enrolledStudentIds || []).forEach((id) => teacherStudentKeys.add(id));
  });
  const teacherScopedTimetableSlots = currentRole === 'teacher'
    ? schoolTimetableSlotsAllTerms.filter((slot) =>
        slotMatchesLoggedInTeacher(slot, currentUser, matchedTeacherForScope, teacherScopedCourses)
      )
    : schoolTimetableSlotsAllTerms;
  const normalizeRoomScope = (value: string) => value
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase()
    .replace(/^(?:ห้องเรียน|ห้อง|room|class)\s*/i, '')
    .replace(/\s+/g, '');
  const teacherRoomKeys = new Set<string>([
    ...(matchedTeacherForScope?.homeroomClasses || []),
    ...teacherScopedTimetableSlots.map((slot) => slot.classRoom).filter(Boolean),
  ].map(normalizeRoomScope).filter(Boolean));
  const teacherScopedStudents = currentRole === 'teacher'
    ? schoolStudents.filter((student) => {
        if (teacherStudentKeys.has(student.id) || teacherStudentKeys.has(student.studentIdNumber)) return true;
        const rooms = [student.room, ...(student.enrolledRooms || [])].filter(Boolean);
        const gradeShort = student.gradeLevel.match(/(?:อ|ป|ม)\.?\s*\d{1,2}/i)?.[0] || '';
        const candidates = rooms.flatMap((room) => [room, gradeShort ? `${gradeShort}/${room}` : '']);
        return candidates.some((room) => teacherRoomKeys.has(normalizeRoomScope(room)));
      })
    : schoolStudents;
  const teacherStudentIds = new Set<string>();
  teacherScopedStudents.forEach((student) => {
    teacherStudentIds.add(student.id);
    teacherStudentIds.add(student.studentIdNumber);
  });
  const isRestrictedViewer = currentRole === 'student' || currentRole === 'parent';
  const linkedStudentsForUser = useMemo(
    () => (isRestrictedViewer ? resolveLinkedStudentsForUser(currentUser, schoolStudents) : schoolStudents),
    [currentUser, isRestrictedViewer, schoolStudents]
  );
  const ownStudentIds = useMemo(() => {
    const ids = new Set<string>();
    linkedStudentsForUser.forEach((stu) => {
      ids.add(stu.id);
      if (stu.studentIdNumber) ids.add(stu.studentIdNumber);
    });
    if (currentRole === 'student' && currentUser) {
      ids.add(currentUser.id);
      if (currentUser.studentRecordId) ids.add(currentUser.studentRecordId);
      if (currentUser.studentIdNumber) ids.add(currentUser.studentIdNumber);
    }
    return Array.from(ids);
  }, [currentRole, currentUser, linkedStudentsForUser]);
  const viewAnnouncements = useMemo(
    () => filterAnnouncementsForRole(schoolAnnouncements, currentUser),
    [schoolAnnouncements, currentUser]
  );

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotifCount(0);
      return;
    }
    const resolvedSchoolId = activeSchool.id || currentUser.schoolId;
    if (currentUser.role === 'parent') {
      let active = true;
      let refreshing = false;
      const updateUnread = async () => {
        if (!active || document.visibilityState === 'hidden' || refreshing) return;
        refreshing = true;
        try {
          const count = await getParentUnreadNotificationCount();
          const extraUnread = getScopedNotificationsForUser({
            currentUser,
            schoolId: resolvedSchoolId,
            ownStudentIds,
            announcements: viewAnnouncements,
            lang,
          }).filter((n) => (n.sourceKind === 'announcement' || n.sourceKind === 'holiday') && !n.read).length;
          if (active) setUnreadNotifCount(count + extraUnread);
        } catch (error) {
          console.error('Could not refresh private child notification count:', error);
        } finally {
          refreshing = false;
        }
      };
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') void updateUnread();
      };
      void updateUnread();
      window.addEventListener('eduverse:notification', updateUnread);
      window.addEventListener('eduverse:holidays-updated', updateUnread);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('focus', onVisibilityChange);
      const interval = window.setInterval(updateUnread, 60000);
      return () => {
        active = false;
        window.clearInterval(interval);
        window.removeEventListener('eduverse:notification', updateUnread);
        window.removeEventListener('eduverse:holidays-updated', updateUnread);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('focus', onVisibilityChange);
      };
    }

    const updateUnread = () => {
      setUnreadNotifCount(
        getScopedUnreadCountForUser({
          currentUser,
          schoolId: resolvedSchoolId,
          ownStudentIds,
          announcements: viewAnnouncements,
          lang,
        })
      );
    };
    updateUnread();
    window.addEventListener('eduverse:notification', updateUnread);
    window.addEventListener('eduverse:holidays-updated', updateUnread);
    return () => {
      window.removeEventListener('eduverse:notification', updateUnread);
      window.removeEventListener('eduverse:holidays-updated', updateUnread);
    };
  }, [currentUser, activeSchool.id, ownStudentIds, viewAnnouncements, lang]);

  const activeFeatureFlags = activeSchool.id
    ? (featureFlagsBySchool[activeSchool.id] || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise'))
    : undefined;
  const duplicateReportMap = new Map<DuplicateRecordTarget, DuplicateRecordReport>();
  [
    ...getDuplicateIdReports({
      students: schoolStudents,
      teachers: schoolTeachers,
      courses: schoolCourses,
      grades: schoolGrades,
      attendance: schoolAttendance,
      invoices: schoolInvoices,
      announcements: schoolAnnouncements,
      lessons: schoolLessons,
      assignments: schoolAssignments,
      questions: schoolQuestions,
      periodAttendance: schoolPeriodAttendance,
      portfolioItems: schoolPortfolioItems,
      timetableSlots: schoolTimetableSlots,
      behaviorRecords: schoolBehaviorRecords,
      sdqAssessments: schoolSdqAssessments,
      infirmaryVisits: schoolInfirmaryVisits,
      homeworkSubmissions: schoolHomeworkSubmissions,
    }),
    ...getDuplicateRecordReports({
      students: schoolStudents,
      teachers: schoolTeachers,
      courses: schoolCourses,
      grades: schoolGrades,
      invoices: schoolInvoices,
      timetableSlots: schoolTimetableSlots,
      attendance: schoolAttendance,
      periodAttendance: schoolPeriodAttendance,
      announcements: schoolAnnouncements,
      behaviorRecords: schoolBehaviorRecords,
      sdqAssessments: schoolSdqAssessments,
      infirmaryVisits: schoolInfirmaryVisits,
      homeworkSubmissions: schoolHomeworkSubmissions,
      leaveRequests: schoolLeaveRequests,
    }),
  ].forEach((report) => {
    const existing = duplicateReportMap.get(report.target);
    if (existing) existing.checks.push(...report.checks);
    else duplicateReportMap.set(report.target, { ...report, checks: [...report.checks] });
  });
  const duplicateReports = [...duplicateReportMap.values()];
  const duplicateRecordGroupCount = duplicateReports.reduce(
    (total, report) => total + report.checks.reduce((count, check) => count + check.groups.length, 0),
    0
  );

  // Keep the live Supabase account flow separate from the local demo session.
  const handleLogin = (context: AuthContext) => {
    const school = context.school;
    setBiometricSoftLock(null);
    setIsBiometricLocked(false);
    setBiometricLockError(null);
    setIsSuperAdminSchoolView(false);
    setSchools(context.schools);
    setCurrentUser(context.user);
    setCurrentRole(context.user.role);
    setDataLoadError(null);
    if (school) {
      setActiveSchool(school);
      setLoadedSchoolId(null);
      setSystemConfig((prev) => ({
        ...prev,
        schoolNameEn: school.nameEn,
        schoolNameTh: school.nameTh,
        academicYear: school.academicYear,
        currentSemester: school.currentSemester,
        semesterOptions: school.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
        gradingSystem: school.gradingSystem || 'thai',
        staffPositionOptions: school.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
      }));
    }
    // Registered real school starts clean without mock data pollution
    setStudents([]);
    setTeachers([]);
    setCourses([]);
    setGrades([]);
    setAttendance([]);
    setInvoices([]);
    setAnnouncements([]);
    setLessons([]);
    setAssignments([]);
    setQuestions([]);
    setPlayerScores([]);
    setRewardItems([]);
    setPeriodAttendance([]);
    setPortfolioItems([]);
    setTimetableSlots([]);
    setSchoolPeriods(DEFAULT_SCHOOL_PERIODS);
    setBehaviorRecords([]);
    setSdqAssessments([]);
    setInfirmaryVisits([]);
    setHomeworkSubmissions([]);
    setLeaveRequests([]);
    setShowSchoolSwitcher(false);
    setDashboardInitialSubTab('overview');
    setSystemSettingsInitialTab('school_general');
    if (context.user.role === 'super_admin') {
      setProgramMode('school_erp');
      setCurrentTab('super_admin_console');
    } else if (context.user.role === 'parent') {
      setProgramMode('parent_portal');
      setCurrentTab('dashboard');
    } else {
      setProgramMode('school_erp');
      setCurrentTab(deepLinkParams ? 'mobile_checkin' : 'dashboard');
    }
  };

  const handleUpdateSchool = async (updates: Partial<School>) => {
    try {
      if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
        throw new Error('เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่แก้ไขการตั้งค่าโรงเรียนได้');
      }
      if (!isDemoMode) await updateSchoolSettingsInSupabase(activeSchool.id, updates);
      if (updates.gradingSystem && updates.gradingSystem !== systemConfig.gradingSystem) {
        const targetMode = updates.gradingSystem;
        const recalculatedGrades = grades.map((grade) => {
          if (grade.schoolId && grade.schoolId !== activeSchool.id) return grade;
          if (isSpecialMoeGrade(grade.letterGrade)) {
            return { ...grade, gradePoint: 0 };
          }
          const nextGrade = calculateGrade(grade.totalScore, targetMode);
          return {
            ...grade,
            letterGrade: nextGrade.letter,
            gradePoint: nextGrade.point,
          };
        });
        setGrades(recalculatedGrades);
        syncStudentGpaFromGrades(recalculatedGrades, undefined, schoolCourses, targetMode);
      }
      setActiveSchool((prev) => {
        const next = { ...prev, ...updates };
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(`eduverse_school_custom_settings_${next.id}`);
            const existing = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
              `eduverse_school_custom_settings_${next.id}`,
              JSON.stringify({ ...existing, ...updates })
            );
          } catch {
            // ignore
          }
        }
        return next;
      });
      setSchools((prev) =>
        prev.map((school) => (school.id === activeSchool.id ? { ...school, ...updates } : school))
      );
      setSystemConfig((prev) => ({
        ...prev,
        ...(updates.academicYear !== undefined ? { academicYear: updates.academicYear } : {}),
        ...(updates.currentSemester !== undefined ? { currentSemester: updates.currentSemester } : {}),
        ...(updates.semesterOptions !== undefined ? { semesterOptions: updates.semesterOptions } : {}),
        ...(updates.gradingSystem !== undefined ? { gradingSystem: updates.gradingSystem } : {}),
        ...(updates.staffPositionOptions !== undefined ? { staffPositionOptions: updates.staffPositionOptions } : {}),
      }));
      if (updates.academicYear !== undefined || updates.currentSemester !== undefined) {
        appendAuditLog(activeSchool.id, {
          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
          actorRole: currentUser.role,
          actionType: 'academic_period_update',
          targetLabel: activeSchool.nameTh || activeSchool.id,
          details: `ปีการศึกษา ${updates.academicYear ?? activeSchool.academicYear} ภาคเรียนที่ ${updates.currentSemester ?? activeSchool.currentSemester}`,
        });
      }
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const handleUpdateAcademicPeriod = async (
    academicYear: string,
    currentSemester: string,
    semesterOptions?: string[]
  ) => {
    await handleUpdateSchool({
      academicYear,
      currentSemester,
      ...(semesterOptions ? { semesterOptions } : {}),
    });
  };

  const handleCopyCoursesToSchool = (newCourses: Course[]) => {
    if (newCourses.length === 0) return;
    setCourses((prev) => [...newCourses.map((c) => ({ ...c, schoolId: activeSchool.id })), ...prev]);
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'academic_period_update',
        targetLabel: activeSchool.nameTh || activeSchool.id,
        details: `คัดลอกรายวิชาจากคลังย้อนหลังมาใช้งาน ${newCourses.length} วิชา`,
      });
    }
  };

  const handleApplyAcademicRollover = async (payload: {
    academicYear: string;
    currentSemester: string;
    newCourses: Course[];
    newTimetableSlots: TimetableSlot[];
    promotedStudents?: Student[];
  }) => {
    await handleUpdateSchool({
      academicYear: payload.academicYear,
      currentSemester: payload.currentSemester,
    });
    if (payload.newCourses.length > 0) {
      setCourses((prev) => [...payload.newCourses, ...prev]);
    }
    if (payload.newTimetableSlots.length > 0) {
      setTimetableSlots((prev) => [...payload.newTimetableSlots, ...prev]);
      if (!isDemoMode) {
        await saveTimetableSlotsToDb(activeSchool.id, payload.newTimetableSlots).catch(() => {
          // non-blocking fallback; local state already updated
        });
      }
    }
    if (payload.promotedStudents && payload.promotedStudents.length > 0) {
      const promotedMap = new Map(payload.promotedStudents.map((s) => [s.id, s]));
      setStudents((prev) => prev.map((s) => promotedMap.get(s.id) || s));
    }
  };

  const handleUpdateSchoolFeatureFlags = (schoolId: string, flags: SchoolFeatureFlags) => {
    setFeatureFlagsBySchool((prev) => ({ ...prev, [schoolId]: flags }));
    setSchools((prev) =>
      prev.map((school) =>
        school.id === schoolId
          ? { ...school, schoolTier: flags.tier, aiStudentEnabled: flags.allowStudentsAi }
          : school
      )
    );
    setActiveSchool((prev) =>
      prev.id === schoolId
        ? { ...prev, schoolTier: flags.tier, aiStudentEnabled: flags.allowStudentsAi }
        : prev
    );
    if (!isDemoMode) {
      void saveSchoolFeatureFlagsToDb(schoolId, flags);
    }
    if (currentUser) {
      appendAuditLog(schoolId, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'feature_flags_update',
        targetLabel: flags.tier,
        details: `อัปเดตแพ็กเกจโมดูล (${flags.tier}) · สิทธิ์ AI นักเรียน: ${flags.allowStudentsAi ? 'เปิด' : 'ปิด'}`,
      });
    }
  };

  const handleLogout = async () => {
    try {
      if (currentUser?.id) {
        try {
          await clearSchoolSnapshotsForUser(currentUser.id);
        } catch (cacheError) {
          console.warn('Could not clear this account\'s offline data cache:', cacheError);
        }
      }
      await signOutFromSupabase();
      setBiometricSoftLock(null);
      setIsBiometricLocked(false);
      setBiometricLockError(null);
      setCurrentUser(null);
      setIsSuperAdminSchoolView(false);
      setIsDataReady(false);
      setLoadedSchoolId(null);
      setDataLoadError(null);
      setDataSyncError(null);
    } catch (error) {
      setDataLoadError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleLockWithBiometrics = () => {
    if (!currentUser) return;
    setBiometricSoftLock({
      userId: currentUser.id,
      email: currentUser.email,
      fullNameTh: currentUser.fullNameTh,
      fullNameEn: currentUser.fullNameEn,
      role: currentUser.role,
      schoolId: activeSchool.id,
      lockedAt: new Date().toISOString(),
    });
    setBiometricLockError(null);
    setIsBiometricLocked(true);
  };

  const handleUnlockBiometricScreen = async () => {
    if (!currentUser) return;
    setIsUnlockingBiometrics(true);
    setBiometricLockError(null);
    try {
      await verifyBiometricPasskey({ userId: currentUser.id });
      setBiometricSoftLock(null);
      setIsBiometricLocked(false);
    } catch (err) {
      setBiometricLockError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUnlockingBiometrics(false);
    }
  };

  const handleChangeProgramMode = (nextMode: AppProgramMode) => {
    if (!isAllowedProgramModeForRole(currentRole, nextMode)) return;
    if (!isProgramModeEnabledByFeatureFlags(nextMode, activeFeatureFlags)) {
      const requiredLevel = nextMode === 'parent_portal' ? 'level_2' : 'level_3';
      setDataSyncError(
        `โหมดนี้ยังไม่เปิดใช้งานในแพ็กเกจปัจจุบัน (ต้องอัปเกรดเป็น ${getPackageLevelLabel(requiredLevel, lang)})`
      );
      return;
    }
    setProgramMode(nextMode);
  };

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
      !isTabEnabledByFeatureFlags(currentTab, activeFeatureFlags, currentRole)
    ) {
      setCurrentTab('dashboard');
    }
  }, [programMode, currentTab, activeFeatureFlags, currentRole]);

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
      setDataSyncError('บทบาทของคุณไม่ได้รับอนุญาตให้เข้าถึงโมดูลนี้จากการตั้งค่าส่วนกลาง');
      return;
    }

    if (currentRole === 'parent') {
      setProgramMode('parent_portal');
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
        setDataSyncError(
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
      'attendance',
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
    ];
    if (currentRole === 'student' && staffOnlyTabs.includes(tab)) {
      setDashboardInitialSubTab('overview');
      setCurrentTab('dashboard');
      return;
    }

    if (currentRole === 'student') {
      const blockedByPolicy =
        (tab === 'mobile_checkin' && !schoolPermissions.student_self_checkin) ||
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
        (tab === 'attendance' && !schoolPermissions.teacher_attendance) ||
        (tab === 'homework' && !schoolPermissions.teacher_homework);
      if (blockedByPolicy) {
        setDashboardInitialSubTab('overview');
        setCurrentTab('dashboard');
        return;
      }
    }

    if (
      !(currentRole === 'super_admin' && tab === 'super_admin_console') &&
      !isTabEnabledByFeatureFlags(tab, activeFeatureFlags, currentRole)
    ) {
      const isStudentAiTab =
        currentRole === 'student' &&
        ['ai_diagnostic', 'socratic_tutor', 'realworld_quests', 'career_quest'].includes(tab) &&
        activeFeatureFlags?.allowStudentsAi === false;
      setDashboardInitialSubTab('overview');
      setProgramMode('school_erp');
      setCurrentTab('dashboard');
      setDataSyncError(
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
      setIsSuperAdminSchoolView(false);
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
    setIsSuperAdminSchoolView(false);
    setProgramMode('school_erp');
    setSuperAdminSubTab('exam_payment');
    setCurrentTab('super_admin_console');
  };

  const handleViewSchool = (school: School) => {
    if (currentRole !== 'super_admin') return;
    setActiveSchool(school);
    setSystemConfig((prev) => ({
      ...prev,
      schoolNameEn: school.nameEn,
      schoolNameTh: school.nameTh,
      academicYear: school.academicYear,
      currentSemester: school.currentSemester,
      semesterOptions: school.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
      gradingSystem: school.gradingSystem || 'thai',
      staffPositionOptions: school.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
    }));
    setProgramMode('school_erp');
    setIsSuperAdminSchoolView(true);
    setCurrentTab('dashboard');
  };

  const handleToggleSchoolStatus = async (schoolId: string, nextStatus: School['status']) => {
    const school = schools.find((item) => item.id === schoolId);
    if (!school) throw new Error('School not found.');
    if (school.status === 'pending') {
      throw new Error('Pending registrations must be approved from the registration queue.');
    }
    await updateSchoolStatusInSupabase(schoolId, nextStatus);
    setSchools((current) => current.map((school) => (
      school.id === schoolId ? { ...school, status: nextStatus } : school
    )));
    setActiveSchool((current) => (
      current.id === schoolId ? { ...current, status: nextStatus } : current
    ));
  };

  useEffect(() => {
    if (isPasswordRecovery) return;

    let active = true;
    restoreSupabaseSession()
      .then((context) => {
        if (active && context) {
          const softLock = getBiometricSoftLock();
          const shouldStayLocked =
            Boolean(softLock && softLock.userId === context.user.id && getPasskeyForUser(context.user.id));
          handleLogin(context);
          if (shouldStayLocked) {
            setIsBiometricLocked(true);
            setBiometricSoftLock(softLock);
          }
        }
      })
      .catch((error: unknown) => {
        if (active) setDataLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || isDemoMode) return;
    if (currentUser.role === 'super_admin' && !isSuperAdminSchoolView) {
      setDataLoadError(null);
      setIsDataReady(true);
      setLoadedSchoolId(activeSchool.id);
      return;
    }

    let active = true;
    setIsDataReady(false);
    setLoadedSchoolId(null);
    setDataLoadError(null);
    setIsUsingCachedSchoolData(false);
    setOrphanedGrades([]);
    loadSchoolData(activeSchool.id, currentUser.id)
      .then((data) => {
        if (!active) return;
        // Hydrating the initial school snapshot must not trigger the broad
        // write-back effect below. The first sync should follow a user edit.
        skipNextOfflineRowSyncRef.current = ['super_admin', 'admin', 'teacher'].includes(currentUser.role);
        if (data.attendanceLoadedRange) {
          const rangeScopeKey = `${currentUser.id}:${activeSchool.id}`;
          const loadedRanges = attendanceLoadedRangesRef.current.get(rangeScopeKey) || [];
          loadedRanges.push(data.attendanceLoadedRange);
          attendanceLoadedRangesRef.current.set(rangeScopeKey, loadedRanges);
        }
        setIsUsingCachedSchoolData(Boolean(data.loadedFromCache));
        if (currentUser.role === 'super_admin') {
          skipNextSuperAdminSyncRef.current = true;
        }
        let resolvedStudents = data.students;
        let resolvedTeachers = data.teachers;
        let resolvedCourses = data.courses;
        let resolvedGrades = data.grades;
        let deletedStudentGrades: GradeRecord[] = [];
        let resolvedAttendance = data.attendance;
        let resolvedInvoices = data.invoices;
        let resolvedTimetableSlots = (data.timetableSlots || []).map((slot) => ({
          ...slot,
          academicYear: slot.academicYear || activeSchool.academicYear || systemConfig.academicYear,
          semester: slot.semester || activeSchool.currentSemester || systemConfig.currentSemester,
        }));
        if (typeof window !== 'undefined') {
          try {
            const deletedStudentIds: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_student_ids_${activeSchool.id}`) || '[]');
            const deletedTeacherIds: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`) || '[]');
            const deletedCourseIds: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_course_ids_${activeSchool.id}`) || '[]');
            const deletedStudentSet = new Set(deletedStudentIds);
            const deletedCourseSet = new Set(deletedCourseIds);
            if (deletedStudentSet.size > 0) {
              resolvedStudents = resolvedStudents.filter((s) => !deletedStudentSet.has(s.id));
              deletedStudentGrades = resolvedGrades.filter((g) => deletedStudentSet.has(g.studentId));
              resolvedGrades = resolvedGrades.filter((g) => !deletedStudentSet.has(g.studentId));
              resolvedAttendance = resolvedAttendance.filter((a) => !deletedStudentSet.has(a.studentId));
              resolvedInvoices = resolvedInvoices.filter((inv) => !deletedStudentSet.has(inv.studentId));
              resolvedCourses = resolvedCourses.map((c) => ({
                ...c,
                enrolledStudentIds: (c.enrolledStudentIds || []).filter((id) => !deletedStudentSet.has(id)),
              }));
            }
            if (deletedTeacherIds.length > 0) {
              resolvedTeachers = resolvedTeachers.filter((t) => !deletedTeacherIds.includes(t.id));
            }
            if (deletedCourseSet.size > 0) {
              resolvedCourses = resolvedCourses.filter((c) => !deletedCourseSet.has(c.id));
              resolvedGrades = resolvedGrades.filter((g) => !deletedCourseSet.has(g.courseId));
              resolvedTimetableSlots = resolvedTimetableSlots.map((slot) =>
                slot.courseId && deletedCourseSet.has(slot.courseId) ? { ...slot, courseId: undefined } : slot
              );
            }
          } catch (e) {
            console.warn('Could not parse deleted IDs from localStorage:', e);
          }
        }
        const studentRefs = new Set(resolvedStudents.map((student) => student.id.trim().toLowerCase()));
        const studentNumberCounts = new Map<string, number>();
        resolvedStudents.forEach((student) => {
          const number = student.studentIdNumber.trim().toLowerCase();
          if (number) studentNumberCounts.set(number, (studentNumberCounts.get(number) || 0) + 1);
        });
        resolvedStudents.forEach((student) => {
          const number = student.studentIdNumber.trim().toLowerCase();
          if (number && studentNumberCounts.get(number) === 1) studentRefs.add(number);
        });
        const invalidGradeRows = [...new Map(
          [...deletedStudentGrades, ...resolvedGrades.filter(
            (grade) => !studentRefs.has(grade.studentId.trim().toLowerCase())
          )].map((grade) => [grade.id, grade])
        ).values()];
        resolvedGrades = resolvedGrades.filter(
          (grade) => studentRefs.has(grade.studentId.trim().toLowerCase())
        );
        setOrphanedGrades(invalidGradeRows);
        const normalizedGrades = resolvedGrades.map((grade) => {
          if (isSpecialMoeGrade(grade.letterGrade)) {
            return {
              ...grade,
              gradePoint: 0,
            };
          }
          const currentGrade = calculateGrade(grade.totalScore, systemConfig.gradingSystem);
          return {
            ...grade,
            letterGrade: currentGrade.letter,
            gradePoint: currentGrade.point,
          };
        });
        const syncedStudents = resolvedStudents.map((stu) => {
          const summary = calculateStudentAcademicSummary({
            student: stu,
            courses: resolvedCourses,
            grades: normalizedGrades,
            gradingSystem: systemConfig.gradingSystem,
            currentAcademicYear: activeSchool.academicYear || systemConfig.academicYear,
            currentSemester: activeSchool.currentSemester || systemConfig.currentSemester,
          });
          if (summary.hideGpaCalculations) return stu;
          if (!summary.hasRecordedGrades || summary.gpax === null) {
            return { ...stu, gpa: 0 };
          }
          return { ...stu, gpa: summary.gpax };
        });
        setStudents(syncedStudents);
        setTeachers(resolvedTeachers);
        setCourses(resolvedCourses);
        setGrades(normalizedGrades);
        setAttendance(resolvedAttendance);
        if (typeof window !== 'undefined') {
          try {
            const rawSlips = localStorage.getItem(`eduverse_invoice_slips_v1_${activeSchool.id}`);
            if (rawSlips) {
              const slipMap = JSON.parse(rawSlips) as Record<string, Partial<TuitionInvoice>>;
              resolvedInvoices = resolvedInvoices.map((inv) => {
                const hasDbSlip = Boolean(inv.slipImageUrl || (inv.slipStatus && inv.slipStatus !== 'none'));
                if (!hasDbSlip && slipMap[inv.id]) {
                  return { ...inv, ...slipMap[inv.id] };
                }
                return inv;
              });
            }
          } catch {
            // ignore corrupt local slip cache
          }
        }
        setInvoices(resolvedInvoices);
        setAnnouncements(data.announcements);
        setSchoolPeriods(data.schoolPeriods);
        setTimetableSlots(resolvedTimetableSlots);
        const realDbGates = sanitizeSchoolCampusGates(data.campusGates, activeSchool.id);
        if (realDbGates.length > 0) {
          setCampusGates(realDbGates);
          const primaryDbGate = realDbGates.find((g) => g.isPrimary) || realDbGates[0];
          if (primaryDbGate && isValidCoordinatePair(primaryDbGate.lat, primaryDbGate.lng)) {
            setActiveSchool((prev) =>
              prev.id === activeSchool.id
                ? {
                    ...prev,
                    latitude: primaryDbGate.lat,
                    longitude: primaryDbGate.lng,
                    geofenceRadiusMeters: primaryDbGate.radiusMeters,
                  }
                : prev
            );
            setSystemConfig((prev) => ({
              ...prev,
              latitude: primaryDbGate.lat,
              longitude: primaryDbGate.lng,
              geofenceRadiusMeters: primaryDbGate.radiusMeters,
            }));
          }
          try {
            localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(realDbGates));
          } catch (error) {
            console.warn('Could not cache school check-in points locally:', error);
          }
        } else {
          const fallbackSchoolGate = buildPrimaryGateFromSchool(activeSchool);
          const resolvedGates = fallbackSchoolGate ? [fallbackSchoolGate] : [];
          setCampusGates(resolvedGates);
          try {
            if (resolvedGates.length > 0) {
              localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(resolvedGates));
            } else {
              localStorage.removeItem(`eduverse_campus_gates_${activeSchool.id}`);
            }
          } catch {
            // ignore storage errors
          }
        }
        // Real schools keep only their own school-scoped items (no sample data)
        setLessons(prev => prev.length > 0 ? prev.filter(l => l.schoolId === activeSchool.id) : []);
        setAssignments(data.assignments || []);
        setQuestions(prev => prev.length > 0 ? prev.filter(q => q.schoolId === activeSchool.id) : []);
        setPlayerScores(prev => prev);
        setRewardItems(prev => (prev.length > 0 ? prev : DEFAULT_ARCADE_REWARDS));
        setPeriodAttendance(data.periodAttendance || []);
        setPortfolioItems((prev) => {
          try {
            const raw = localStorage.getItem(`eduverse_portfolio_items_${activeSchool.id}`);
            if (raw) {
              const parsed = JSON.parse(raw) as PortfolioItem[];
              if (Array.isArray(parsed)) return parsed;
            }
          } catch {
            // ignore storage errors
          }
          return prev.length > 0 ? prev.filter((p) => p.schoolId === activeSchool.id) : [];
        });
        setBehaviorRecords(prev => prev.length > 0 ? prev.filter(b => b.schoolId === activeSchool.id) : []);
        setSdqAssessments(prev => prev.length > 0 ? prev.filter(s => s.schoolId === activeSchool.id) : []);
        setInfirmaryVisits(prev => prev.length > 0 ? prev.filter(i => i.schoolId === activeSchool.id) : []);
        setHomeworkSubmissions(data.homeworkSubmissions || []);
        setLeaveRequests(data.leaveRequests || []);
        setIsDataReady(true);
        setLoadedSchoolId(activeSchool.id);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDataLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.role, activeSchool.id, isDemoMode, isSuperAdminSchoolView]);

  useEffect(() => {
    // LMS lesson bodies and progress are sizable. Load them only when the user
    // opens the classroom instead of on every ERP dashboard visit.
    if (programMode !== 'lms_classroom' || !activeSchool.id || !currentUser || !isDataReady || loadedSchoolId !== activeSchool.id || isDemoMode) return;
    let active = true;
    void loadSchoolLessons(activeSchool.id)
      .then((items) => {
        if (active) setLessons(items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      });
    return () => { active = false; };
  }, [programMode, activeSchool.id, currentUser?.id, loadedSchoolId, isDataReady, isDemoMode]);

  useEffect(() => {
    if (!activeSchool.id || !currentUser || !isDataReady || isDemoMode) return;
    let active = true;

    const loadStudentRecords = async () => {
      const [portfolioResult, behaviorResult, sdqResult, infirmaryResult] = await Promise.allSettled([
        loadSchoolStudentRecords<PortfolioItem>(activeSchool.id, 'portfolio'),
        loadSchoolStudentRecords<BehaviorRecord>(activeSchool.id, 'behavior'),
        loadSchoolStudentRecords<SdqAssessment>(activeSchool.id, 'sdq'),
        loadSchoolStudentRecords<InfirmaryVisit>(activeSchool.id, 'infirmary'),
      ]);
      if (!active) return;

      const failures = [portfolioResult, behaviorResult, sdqResult, infirmaryResult]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
      if (failures.length > 0) {
        setDataSyncError(failures[0]);
        setDataSyncWarnings((prev) => [...new Set([...prev, ...failures])]);
      }

      if (portfolioResult.status === 'fulfilled') {
        let cachedItems: PortfolioItem[] = [];
        try {
          const raw = localStorage.getItem(`eduverse_portfolio_items_${activeSchool.id}`);
          const parsed: unknown = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) {
            cachedItems = (parsed as PortfolioItem[]).filter((item) => !item.schoolId || item.schoolId === activeSchool.id);
          }
        } catch {
          // Keep remote portfolio records if a legacy local cache is invalid.
        }
        const byId = new Map<string, PortfolioItem>();
        cachedItems.forEach((item) => byId.set(item.id, { ...item, schoolId: activeSchool.id }));
        portfolioResult.value.forEach((item) => byId.set(item.id, { ...item, schoolId: activeSchool.id }));
        setPortfolioItems([...byId.values()]);

        const remoteIds = new Set(portfolioResult.value.map((item) => item.id));
        const localItemsToMigrate = cachedItems.filter((item) => !remoteIds.has(item.id));
        if (localItemsToMigrate.length > 0) {
          const migrationResults = await Promise.allSettled(localItemsToMigrate.map((item) => {
            const student = item.ownerRole === 'student'
              ? schoolStudents.find((candidate) => candidate.id === item.ownerId)
                || (item.ownerId === currentUser.id && currentUser.studentRecordId
                  ? schoolStudents.find((candidate) => candidate.id === currentUser.studentRecordId)
                  : undefined)
              : undefined;
            return saveSchoolStudentRecord({
              schoolId: activeSchool.id,
              recordKind: 'portfolio',
              recordId: item.id,
              studentId: student?.id,
              ownerUserId: item.ownerId === currentUser.id ? currentUser.id : undefined,
              record: { ...item, schoolId: activeSchool.id },
            });
          }));
          const migrationFailures = migrationResults
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
          if (active && migrationFailures.length > 0) {
            setDataSyncError(migrationFailures[0]);
            setDataSyncWarnings((prev) => [...new Set([...prev, ...migrationFailures])]);
          }
        }
      }
      if (behaviorResult.status === 'fulfilled') setBehaviorRecords(behaviorResult.value);
      if (sdqResult.status === 'fulfilled') setSdqAssessments(sdqResult.value);
      if (infirmaryResult.status === 'fulfilled') setInfirmaryVisits(infirmaryResult.value);
    };

    void loadStudentRecords().catch((error: unknown) => {
      if (active) {
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      }
    });
    return () => {
      active = false;
    };
  }, [activeSchool.id, currentUser?.id, loadedSchoolId, isDataReady, isDemoMode]);

  // Load real school-scoped Arcade Profiles, Rewards Catalog & Teacher Perk Redemptions from Supabase + local cache
  useEffect(() => {
    if (!activeSchool.id) return;
    let active = true;
    Promise.all([
      loadSchoolArcadeProfiles(activeSchool.id),
      loadSchoolRewardsCatalog(activeSchool.id),
      loadSchoolRewardRedemptions(activeSchool.id),
    ])
      .then(([profiles, catalog, redemptions]) => {
        if (!active) return;
        setPlayerScores(profiles);
        setRewardItems(catalog);
        setRewardRedemptions(redemptions);
      })
      .catch(() => {
        // graceful fallback handled inside arcadeStore
      });
    return () => {
      active = false;
    };
  }, [activeSchool.id]);

  // Load Package Catalog & School Feature Flags (+ Student AI switch) from Supabase with local fallback
  useEffect(() => {
    if (isDemoMode) return;
    let active = true;
    void loadPackageCatalog();
    if (!activeSchool.id) {
      return () => {
        active = false;
      };
    }
    loadSchoolFeatureFlagsFromDb(activeSchool.id, activeSchool.schoolTier || 'enterprise')
      .then((flags) => {
        if (!active) return;
        setFeatureFlagsBySchool((prev) => ({ ...prev, [activeSchool.id]: flags }));
      })
      .catch(() => {
        // local cache fallback handled in schoolPackageStore
      });
    return () => {
      active = false;
    };
  }, [activeSchool.id, activeSchool.schoolTier, isDemoMode]);

  // Hydrate unified student OBEC/MOE registration records + qualitative assessments from Supabase into local cache
  useEffect(() => {
    if (isDemoMode || !isDataReady || !activeSchool.id || loadedSchoolId !== activeSchool.id) {
      return;
    }
    void hydrateSchoolRegistryFromSupabase(
      activeSchool.id,
      systemConfig.academicYear || '2569',
      systemConfig.currentSemester || '1'
    );
  }, [
    isDemoMode,
    isDataReady,
    activeSchool.id,
    loadedSchoolId,
    systemConfig.academicYear,
    systemConfig.currentSemester,
  ]);

  useEffect(() => {
    if (
      !currentUser ||
      isDemoMode ||
      (currentUser.role === 'super_admin' && !isSuperAdminSchoolView) ||
      !['super_admin', 'admin', 'teacher'].includes(currentUser.role) ||
      !isDataReady ||
      loadedSchoolId !== activeSchool.id
    ) return;
    if (skipNextOfflineRowSyncRef.current) {
      skipNextOfflineRowSyncRef.current = false;
      lastSyncedRowsBySchoolRef.current.set(activeSchool.id, getCurrentSchoolSyncRows());
      return;
    }
    if (currentUser.role === 'super_admin' && skipNextSuperAdminSyncRef.current) {
      skipNextSuperAdminSyncRef.current = false;
      lastSyncedRowsBySchoolRef.current.set(activeSchool.id, getCurrentSchoolSyncRows());
      return;
    }
    const timeoutId = window.setTimeout(() => {
      syncQueueRef.current = syncQueueRef.current.then(async () => {
        const rows = getCurrentSchoolSyncRows();
        const previousRows = lastSyncedRowsBySchoolRef.current.get(activeSchool.id);
        const changedIds = {
          students: findChangedRowIds(rows.students, previousRows?.students),
          teachers: findChangedRowIds(rows.teachers, previousRows?.teachers),
          courses: findChangedRowIds(rows.courses, previousRows?.courses),
          grades: findChangedRowIds(rows.grades, previousRows?.grades),
          attendance: findChangedRowIds(rows.attendance, previousRows?.attendance),
          invoices: findChangedRowIds(rows.invoices, previousRows?.invoices),
          announcements: findChangedRowIds(rows.announcements, previousRows?.announcements),
        };
        if (!hasChangedRowIds(changedIds)) return;
        const result = await syncDataToSupabase({
          school: activeSchool,
          role: currentUser.role,
          ...rows,
          changedIds,
        });
        if (result.success) lastSyncedRowsBySchoolRef.current.set(activeSchool.id, rows);
        setDataSyncError(result.success ? null : result.message);
        setDataSyncWarnings(result.warnings || []);
        setDataSyncSummary(result.warnings && result.warnings.length > 0 ? result.message : null);
      }).catch((error: unknown) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        setDataSyncError(errMsg);
      });
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [
    currentUser?.id,
    currentUser?.role,
    isDemoMode,
    isSuperAdminSchoolView,
    isDataReady,
    loadedSchoolId,
    activeSchool,
    students,
    teachers,
    courses,
    grades,
    attendance,
    invoices,
    announcements,
  ]);

  // Domain Handlers
  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [{ ...newStudent, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddStudents = (newStudents: Student[]) => {
    setStudents((prev) => [
      ...newStudents.map((student) => ({ ...student, schoolId: activeSchool.id })),
      ...prev,
    ]);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
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

  const handleCleanupOrphanGrades = () => {
    if (!['admin', 'super_admin'].includes(currentRole)) {
      setDataSyncError('ต้องใช้สิทธิ์ผู้ดูแลโรงเรียนเพื่อลบผลการเรียนที่ไม่มีนักเรียนอ้างอิง');
      return;
    }
    const gradeIds = orphanedGrades.map((grade) => grade.id);
    if (gradeIds.length === 0) return;

    setConfirmModal({
      title: `ยืนยันลบผลการเรียนตกค้าง (${gradeIds.length} รายการ)`,
      description: `ต้องการลบผลการเรียนจำนวน ${gradeIds.length} รายการที่ไม่พบนักเรียนในทะเบียนของโรงเรียนนี้หรือไม่?`,
      detailNote: 'การดำเนินการนี้จะลบเฉพาะแถวคะแนนที่ไม่มีข้อมูลนักเรียนอ้างอิงในระบบแล้วเท่านั้น',
      confirmLabel: `ลบ ${gradeIds.length} รายการ`,
      tone: 'danger',
      onConfirm: async () => {
        setIsCleaningOrphanedGrades(true);
        try {
          await deleteStaleGradesFromDb(activeSchool.id, gradeIds);
          setOrphanedGrades([]);
          setDataSyncError(null);
        } catch (error) {
          setDataSyncError(error instanceof Error ? error.message : String(error));
        } finally {
          setIsCleaningOrphanedGrades(false);
        }
      },
    });
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      if (!isDemoMode) {
        await deleteStudentFromDb(activeSchool.id, studentId);
      }

      const removedInvoiceIds = new Set(
        invoices.filter((inv) => inv.studentId === studentId).map((inv) => inv.id)
      );

      setStudents((prev) => {
        const next = prev.filter((student) => student.id !== studentId);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`eduverse_students_${activeSchool.id}`, JSON.stringify(next));
            const deleted: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_student_ids_${activeSchool.id}`) || '[]');
            if (!deleted.includes(studentId)) deleted.push(studentId);
            localStorage.setItem(`eduverse_deleted_student_ids_${activeSchool.id}`, JSON.stringify(deleted));
          } catch (error) {
            console.warn('Could not update deleted student in localStorage:', error);
          }
        }
        return next;
      });

      setCourses((prev) => {
        const next = prev.map((course) => ({
          ...course,
          enrolledStudentIds: (course.enrolledStudentIds || []).filter((id) => id !== studentId),
        }));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`eduverse_courses_${activeSchool.id}`, JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
        }
        return next;
      });

      setGrades((prev) => {
        const next = prev.filter((grade) => grade.studentId !== studentId);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`eduverse_grades_${activeSchool.id}`, JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
        }
        return next;
      });

      setAttendance((prev) => prev.filter((rec) => rec.studentId !== studentId));
      setPeriodAttendance((prev) => prev.filter((rec) => rec.studentId !== studentId));
      setInvoices((prev) => prev.filter((inv) => inv.studentId !== studentId));
      setLessons((prev) => prev.map((lesson) => ({
        ...lesson,
        completedByStudentIds: (lesson.completedByStudentIds || []).filter((id) => id !== studentId),
      })));
      setAssignments((prev) => prev.map((assignment) => ({
        ...assignment,
        submittedStudentIds: (assignment.submittedStudentIds || []).filter((id) => id !== studentId),
      })));
      setHomeworkSubmissions((prev) => prev.filter((sub) => sub.studentId !== studentId));
      setLeaveRequests((prev) => prev.filter((req) => !(req.userRole === 'student' && req.userId === studentId)));
      setBehaviorRecords((prev) => prev.filter((rec) => rec.studentId !== studentId));
      setSdqAssessments((prev) => prev.filter((rec) => rec.studentId !== studentId));
      setInfirmaryVisits((prev) => prev.filter((visit) => visit.studentId !== studentId));
      setPortfolioItems((prev) => prev.filter((item) => !(item.ownerRole === 'student' && item.ownerId === studentId)));

      if (typeof window !== 'undefined') {
        try {
          if (removedInvoiceIds.size > 0) {
            const rawSlips = localStorage.getItem(`eduverse_invoice_slips_v1_${activeSchool.id}`);
            if (rawSlips) {
              const slipMap = JSON.parse(rawSlips) as Record<string, unknown>;
              removedInvoiceIds.forEach((invId) => {
                delete slipMap[invId];
              });
              localStorage.setItem(`eduverse_invoice_slips_v1_${activeSchool.id}`, JSON.stringify(slipMap));
            }
          }
          cleanupStudentCampusData(activeSchool.id, studentId);
        } catch (error) {
          console.warn('Could not clean student local cache:', error);
        }
      }

      if (currentUser) {
        appendAuditLog(activeSchool.id, {
          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
          actorRole: currentUser.role,
          actionType: 'student_delete',
          targetLabel: studentId,
          details: 'ลบข้อมูลทะเบียนนักเรียนและล้างข้อมูลที่เกี่ยวข้อง (รายวิชา เกรด เวลาเรียน แคช)',
        });
      }
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const handlePurgeSampleStudents = async () => {
    const sampleIds = students
      .filter((student) => /^(std-0|std-demo|std-mock)/.test(student.id))
      .map((student) => student.id);
    const errors: string[] = [];
    for (const studentId of sampleIds) {
      try {
        await handleDeleteStudent(studentId);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    setDataSyncError(errors.length ? `Could not delete ${errors.length} sample student record(s): ${errors.join('; ')}` : null);
  };

  const handleToggleLineSync = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              lineLinked: !s.lineLinked,
              lineNotifyEnabled: !s.lineLinked,
            }
          : s
      )
    );
    setDataSyncError(null);
  };

  const handleAddTeacher = (newTeacher: Teacher) => {
    const fullTeacher = { ...newTeacher, schoolId: activeSchool.id };
    setTeachers((prev) => [fullTeacher, ...prev]);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t))
    );
  };

  const handleDeleteTeacher = (teacherId: string) => {
    void (async () => {
      try {
        await deleteTeacherFromDb(activeSchool.id, teacherId);
        setTeachers((prev) => {
          const next = prev
            .filter((teacher) => teacher.id !== teacherId)
            .map((teacher) => teacher.reportsToTeacherId === teacherId
              ? { ...teacher, reportsToTeacherId: undefined }
              : teacher);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`eduverse_teachers_${activeSchool.id}`, JSON.stringify(next));
              const deleted: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`) || '[]');
              if (!deleted.includes(teacherId)) deleted.push(teacherId);
              localStorage.setItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`, JSON.stringify(deleted));
            } catch (error) {
              console.warn('Could not update deleted teacher in localStorage:', error);
            }
          }
          return next;
        });
        setDataSyncError(null);
      } catch (error) {
        setDataSyncError(error instanceof Error ? error.message : String(error));
      }
    })();
  };

  const handlePurgeSampleTeachers = () => {
    setConfirmModal({
      title: 'ยืนยันล้างข้อมูลครูตัวอย่างทั้งหมด',
      description: 'ต้องการล้างข้อมูลครูตัวอย่าง (Sample Teachers) ออกจากโรงเรียนนี้หรือไม่?',
      detailNote: 'ข้อมูลครูจริงที่สร้างหรือนำเข้าใหม่จะไม่ได้รับผลกระทบ',
      confirmLabel: 'ยืนยันล้างข้อมูลตัวอย่าง',
      tone: 'danger',
      onConfirm: async () => {
        const sampleIds = teachers
          .filter((teacher) => /^(tch-0|tch-demo|tch-mock)/.test(teacher.id))
          .map((teacher) => teacher.id);
        const deletedIds: string[] = [];
        const errors: string[] = [];
        for (const teacherId of sampleIds) {
          try {
            await deleteTeacherFromDb(activeSchool.id, teacherId);
            deletedIds.push(teacherId);
          } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
          }
        }
        if (deletedIds.length > 0) {
          setTeachers((prev) => prev
            .filter((teacher) => !deletedIds.includes(teacher.id))
            .map((teacher) => deletedIds.includes(teacher.reportsToTeacherId || '')
              ? { ...teacher, reportsToTeacherId: undefined }
              : teacher));
          if (typeof window !== 'undefined') {
            try {
              const remaining = teachers
                .filter((teacher) => !deletedIds.includes(teacher.id))
                .map((teacher) => deletedIds.includes(teacher.reportsToTeacherId || '')
                  ? { ...teacher, reportsToTeacherId: undefined }
                  : teacher);
              localStorage.setItem(`eduverse_teachers_${activeSchool.id}`, JSON.stringify(remaining));
              const deleted: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`) || '[]');
              localStorage.setItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`, JSON.stringify([...new Set([...deleted, ...deletedIds])]));
            } catch (error) {
              console.warn('Could not cache purged teacher IDs:', error);
            }
          }
        }
        setDataSyncError(errors.length ? `Could not delete ${errors.length} sample teacher record(s): ${errors.join('; ')}` : null);
      },
    });
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setStudents((prev) => [
      ...newStudents.map((s) => ({ ...s, schoolId: activeSchool.id })),
      ...prev,
    ]);
  };

  const handleImportTeachers = async (newTeachers: Teacher[]) => {
    const importedTeachers = newTeachers.map((teacher) => ({ ...teacher, schoolId: activeSchool.id }));
    try {
      if (!isDemoMode) {
        if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
          throw new Error('เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่นำเข้ารายชื่อครูได้');
        }
        await saveTeachersToDb(activeSchool.id, importedTeachers);
      }
      setTeachers((prev) => [...importedTeachers, ...prev]);
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const handleAddCourse = (newCourse: Course) => {
    setCourses((prev) => [{ ...newCourse, schoolId: activeSchool.id }, ...prev]);
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
    );
  };

  const cleanupDeletedCoursesStateAndCache = (courseIds: string[]) => {
    const ids = new Set(courseIds);
    setCourses((prev) => {
      const next = prev.filter((course) => !ids.has(course.id));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`eduverse_courses_${activeSchool.id}`, JSON.stringify(next));
          const deleted: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_course_ids_${activeSchool.id}`) || '[]');
          localStorage.setItem(`eduverse_deleted_course_ids_${activeSchool.id}`, JSON.stringify([...new Set([...deleted, ...courseIds])]));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
    const remainingCourses = courses.filter((course) => !ids.has(course.id));
    setGrades((prev) => {
      const next = prev.filter((grade) => !ids.has(grade.courseId));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`eduverse_grades_${activeSchool.id}`, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      syncStudentGpaFromGrades(next, undefined, remainingCourses);
      return next;
    });
    setTimetableSlots((prev) => {
      const next = prev.map((slot) => (
        slot.courseId && ids.has(slot.courseId) ? { ...slot, courseId: undefined } : slot
      ));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`eduverse_timetable_slots_${activeSchool.id}`, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
    const removedAssignmentIds = new Set(assignments.filter((assignment) => ids.has(assignment.courseId)).map((assignment) => assignment.id));
    setLessons((prev) => prev.filter((lesson) => !ids.has(lesson.courseId)));
    setAssignments((prev) => prev.filter((assignment) => !ids.has(assignment.courseId)));
    setHomeworkSubmissions((prev) => prev.filter((sub) => !removedAssignmentIds.has(sub.assignmentId)));
    setPeriodAttendance((prev) => prev.filter((rec) => !ids.has(rec.courseId)));
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      if (!isDemoMode) await deleteCoursesFromDb(activeSchool.id, [courseId]);
      cleanupDeletedCoursesStateAndCache([courseId]);
      if (currentUser) {
        appendAuditLog(activeSchool.id, {
          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
          actorRole: currentUser.role,
          actionType: 'course_delete',
          targetLabel: courseId,
          details: 'ลบรายวิชาและล้างข้อมูลผลการเรียน/ตารางสอน/แคชที่เกี่ยวข้อง',
        });
      }
      setDataSyncError(null);
      return true;
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const handleDeleteCourses = async (courseIds: string[]) => {
    if (courseIds.length === 0) return false;
    try {
      if (!isDemoMode) await deleteCoursesFromDb(activeSchool.id, courseIds);
      cleanupDeletedCoursesStateAndCache(courseIds);
      if (currentUser) {
        appendAuditLog(activeSchool.id, {
          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
          actorRole: currentUser.role,
          actionType: 'course_delete_batch',
          targetLabel: `${courseIds.length} รายวิชา`,
          details: 'ลบรายวิชาที่เลือกเป็นชุดและล้างข้อมูลแคช/ฐานข้อมูลที่เกี่ยวข้อง',
        });
      }
      setDataSyncError(null);
      return true;
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const handleEnrollStudent = (courseId: string, studentId: string) => {
    setCourses((prev) => {
      const next = prev.map((c) => {
        if (c.id === courseId && !c.enrolledStudentIds.includes(studentId)) {
          return {
            ...c,
            enrolledStudentIds: [...c.enrolledStudentIds, studentId],
          };
        }
        return c;
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`eduverse_courses_${activeSchool.id}`, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  const handleEnrollStudentsBatch = (courseId: string, studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setCourses((prev) => {
      const next = prev.map((c) => {
        if (c.id !== courseId) return c;
        const merged = Array.from(new Set([...(c.enrolledStudentIds || []), ...studentIds]));
        return {
          ...c,
          enrolledStudentIds: merged,
        };
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`eduverse_courses_${activeSchool.id}`, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  const cleanupEnrollmentCancellation = async (courseId: string, studentIds: string[]) => {
    if (studentIds.length === 0) return;
    const removeSet = new Set(studentIds);
    const targetCourse = courses.find((c) => c.id === courseId);
    const nextEnrolledIds = (targetCourse?.enrolledStudentIds || []).filter((id) => !removeSet.has(id));

    try {
      if (!isDemoMode) {
        await updateCourseEnrollmentInDb(activeSchool.id, courseId, nextEnrolledIds);
        await deleteGradesForEnrollmentFromDb(activeSchool.id, courseId, studentIds);
      }

      setCourses((prev) => {
        const next = prev.map((c) => (
          c.id === courseId
            ? { ...c, enrolledStudentIds: (c.enrolledStudentIds || []).filter((id) => !removeSet.has(id)) }
            : c
        ));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`eduverse_courses_${activeSchool.id}`, JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
        }
        return next;
      });

      setGrades((prev) => {
        const next = prev.filter((g) => !(g.courseId === courseId && removeSet.has(g.studentId)));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`eduverse_grades_${activeSchool.id}`, JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
        }
        syncStudentGpaFromGrades(next, removeSet);
        return next;
      });

      setLessons((prev) => prev.map((lesson) => (
        lesson.courseId === courseId
          ? { ...lesson, completedByStudentIds: (lesson.completedByStudentIds || []).filter((id) => !removeSet.has(id)) }
          : lesson
      )));
      setAssignments((prev) => prev.map((assignment) => (
        assignment.courseId === courseId
          ? { ...assignment, submittedStudentIds: (assignment.submittedStudentIds || []).filter((id) => !removeSet.has(id)) }
          : assignment
      )));
      const courseAssignmentIds = new Set(assignments.filter((assignment) => assignment.courseId === courseId).map((assignment) => assignment.id));
      setHomeworkSubmissions((prev) => prev.filter((sub) => !(courseAssignmentIds.has(sub.assignmentId) && removeSet.has(sub.studentId))));
      setPeriodAttendance((prev) => prev.filter((rec) => !(rec.courseId === courseId && removeSet.has(rec.studentId))));

      if (currentUser) {
        appendAuditLog(activeSchool.id, {
          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
          actorRole: currentUser.role,
          actionType: 'enrollment_cancel',
          targetLabel: `${targetCourse?.code || courseId} (${studentIds.length} คน)`,
          details: 'ยกเลิกการลงทะเบียนเรียนและล้างคะแนน/ความก้าวหน้า/แคชที่เกี่ยวข้อง',
        });
      }
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const handleUnenrollStudent = async (courseId: string, studentId: string) => {
    await cleanupEnrollmentCancellation(courseId, [studentId]);
  };

  const handleUnenrollStudentsBatch = async (courseId: string, studentIds: string[]) => {
    await cleanupEnrollmentCancellation(courseId, studentIds);
  };

  const handleImportCourses = (newCourses: Course[]) => {
    setCourses((prev) => [...newCourses.map((course) => ({ ...course, schoolId: activeSchool.id })), ...prev]);
  };

  const handleImportEnrollment = (courseCode: string, studentIds: string[]) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.code.toLowerCase() === courseCode.toLowerCase() || c.id === courseCode) {
          const merged = Array.from(new Set([...(c.enrolledStudentIds || []), ...studentIds]));
          return { ...c, enrolledStudentIds: merged };
        }
        return c;
      })
    );
  };

  const syncStudentGpaFromGrades = (
    nextGrades: GradeRecord[],
    targetStudentIds?: Set<string>,
    coursesOverride?: Course[],
    gradingSystemOverride?: GradingSystem
  ) => {
    setStudents((prevStudents) =>
      prevStudents.map((stu) => {
        if (stu.schoolId && stu.schoolId !== activeSchool.id) return stu;
        if (targetStudentIds && !targetStudentIds.has(stu.id)) return stu;
        const summary = calculateStudentAcademicSummary({
          student: stu,
          courses: coursesOverride ?? schoolCourses,
          grades: nextGrades,
          gradingSystem: gradingSystemOverride ?? systemConfig.gradingSystem,
          currentAcademicYear: systemConfig.academicYear,
          currentSemester: systemConfig.currentSemester,
        });
        if (summary.hideGpaCalculations) return stu;
        if (!summary.hasRecordedGrades || summary.gpax === null) {
          return { ...stu, gpa: 0 };
        }
        return { ...stu, gpa: summary.gpax };
      })
    );
  };

  const applyImportedGrades = (newGrades: GradeRecord[]) => {
    const dispatchedItems: { grade: GradeRecord; isNewRecord: boolean }[] = [];
    setGrades((prev) => {
      const updated = [...prev];
      const affectedIds = new Set<string>();
      newGrades.forEach((ng) => {
        affectedIds.add(ng.studentId);
        const idx = updated.findIndex((g) => (g.studentId === ng.studentId || g.id === ng.id) && g.courseId === ng.courseId);
        if (idx >= 0) {
          const merged = { ...updated[idx], ...ng, schoolId: activeSchool.id };
          updated[idx] = merged;
          dispatchedItems.push({ grade: merged, isNewRecord: false });
        } else {
          const created: GradeRecord = {
            ...ng,
            id: ng.id || `grd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            schoolId: activeSchool.id,
          };
          updated.push(created);
          dispatchedItems.push({ grade: created, isNewRecord: true });
        }
      });
      syncStudentGpaFromGrades(updated, affectedIds);
      return updated;
    });

    if (dispatchedItems.length > 0) {
      if (dispatchedItems.length <= 10) {
        dispatchedItems.forEach(({ grade, isNewRecord }) => {
          const student = schoolStudents.find((s) => s.id === grade.studentId);
          const course = schoolCourses.find((c) => c.id === grade.courseId);
          if (student) {
            void dispatchGradeAlert({
              student,
              course,
              grade,
              systemConfig,
              schoolId: activeSchool.id,
              isNewRecord,
              isDemoMode,
            });
          }
        });
      } else {
        void sendEduVerseNotification({
          title: `📊 นำเข้าและอัปเดตผลการเรียน ${dispatchedItems.length} รายการ`,
          body: `ระบบได้บันทึกผลการเรียนและส่งแจ้งเตือนไปยังนักเรียนและผู้ปกครองที่เกี่ยวข้องเรียบร้อยแล้ว`,
          category: 'homework',
          priority: 'normal',
          tag: `grade-import-${Date.now()}`,
          schoolId: activeSchool.id,
          targetStudentIds: Array.from(new Set(dispatchedItems.map((d) => d.grade.studentId))),
          targetRoles: ['student', 'parent', 'teacher', 'admin', 'super_admin'],
          metadata: {
            alertType: 'grade_update',
            count: dispatchedItems.length,
            targetAudience: ['student', 'parent'],
          },
        });
      }
    }
  };

  const handleImportGrades = (newGrades: GradeRecord[]) => {
    const duplicateReasons = getGradeDuplicateReasons(newGrades, schoolGrades);
    if (duplicateReasons.length > 0) {
      setConfirmModal({
        title: 'พบข้อมูลผลการเรียนซ้ำซ้อน',
        description: `${duplicateReasons.join(' และ ')} ในรายการนำเข้าหรือทะเบียนเดิม ต้องการเขียนทับและนำเข้าต่อหรือไม่?`,
        confirmLabel: 'นำเข้าต่อและเขียนทับ',
        tone: 'primary',
        onConfirm: () => applyImportedGrades(newGrades),
      });
      return;
    }

    applyImportedGrades(newGrades);
  };

  const handleRecordAttendance = (
    studentId: string, 
    status: AttendanceStatus, 
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: {
      recordType?: AttendanceCheckType;
      photoUrl?: string;
      location?: AttendanceRecord['location'];
      userType?: AttendanceUserType;
      teacherId?: string;
      userName?: string;
      userRole?: string;
      userAvatar?: string;
      userDepartmentOrRoom?: string;
      date?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
    }
  ) => {
    const todayStr = extra?.date || getLocalDateString();
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const attendanceRecordId = extra?.recordId || `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    skipNextOfflineRowSyncRef.current = !isDemoMode && ['super_admin', 'admin', 'teacher'].includes(currentUser?.role || '');
    setAttendance((prev) => {
      const isCheckOut = extra?.recordType === 'check_out';
      const isCurrentUser = currentUser && (currentUser.id === studentId || currentUser.studentRecordId === studentId);
      const st = schoolStudents.find(s => s.id === studentId);
      const tc = schoolTeachers.find(t => t.id === studentId || t.id === extra?.teacherId);

      const resolvedUserType: AttendanceUserType = extra?.userType || (tc || (isCurrentUser && currentUser?.role !== 'student') ? 'teacher' : 'student');
      const resolvedName = extra?.userName || (isCurrentUser ? currentUser.fullNameTh : (st ? `${st.firstNameTh} ${st.lastNameTh}` : (tc ? tc.fullNameTh : 'ผู้ใช้งาน')));
      const resolvedRole = extra?.userRole || (isCurrentUser
        ? (currentUser.role === 'super_admin' ? 'ผู้ดูแลระบบสูงสุด (Super Admin)' : currentUser.role === 'admin' ? 'ผู้บริหาร/ผู้ดูแลระบบ (Admin)' : currentUser.role === 'teacher' ? (currentUser.academicStanding || 'ครูผู้สอน') : `นักเรียน (${currentUser.gradeLevel || 'ม.4'})`)
        : (st ? `นักเรียน (${st.gradeLevel})` : (tc ? tc.academicStanding : 'ครู/บุคลากร')));
      const resolvedAvatar = extra?.photoUrl || extra?.userAvatar || (isCurrentUser ? currentUser.avatarUrl : (st ? st.avatarUrl : (tc ? tc.avatarUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200')));
      const resolvedDeptOrRoom = extra?.userDepartmentOrRoom || (isCurrentUser ? (currentUser.department || currentUser.room || '') : (st ? st.room : (tc ? tc.department : '')));

      const newRecord: AttendanceRecord = {
        id: attendanceRecordId,
        schoolId: activeSchool.id,
        studentId,
        teacherId: extra?.teacherId || (resolvedUserType === 'teacher' ? studentId : undefined),
        userType: resolvedUserType,
        userName: resolvedName,
        userRole: resolvedRole,
        userAvatar: resolvedAvatar,
        userDepartmentOrRoom: resolvedDeptOrRoom,
        recordType: extra?.recordType || 'check_in',
        date: todayStr,
        time: nowTime,
        status,
        remarks,
        checkinMethod: method || (extra?.photoUrl ? 'selfie_geofence' : 'qr_scanner'),
        photoUrl: extra?.photoUrl,
        photoStoragePath: extra?.photoStoragePath,
        location: extra?.location,
        lineNotificationSent: true,
        recordedBy: extra?.recordedBy,
        recordedByRole: extra?.recordedByRole
      };

      if (isCheckOut) {
        const checkInIdx = prev.findIndex(a => a.studentId === studentId && a.date === todayStr && a.recordType !== 'check_out');
        if (checkInIdx >= 0) {
          const updated = [...prev];
          updated[checkInIdx] = {
            ...updated[checkInIdx],
            checkOutTime: nowTime
          };
          return [newRecord, ...updated];
        }
      }

      return [newRecord, ...prev];
    });

    const isCheckOut = extra?.recordType === 'check_out';
    const st = schoolStudents.find(s => s.id === studentId);
    const tc = schoolTeachers.find(t => t.id === studentId || t.id === extra?.teacherId);
    const personName = extra?.userName || (st ? `${st.firstNameTh} ${st.lastNameTh}` : (tc ? tc.fullNameTh : 'นักเรียน/บุคลากร'));
    if (!isDemoMode) {
      const queuedRecord = {
        id: attendanceRecordId,
        schoolId: activeSchool.id,
        studentId,
        date: todayStr,
        time: nowTime,
        status,
        checkinMethod: method || (extra?.photoUrl ? 'selfie_geofence' : 'qr_scanner'),
        remarks,
        recordType: extra?.recordType || 'check_in',
        userName: personName,
      };
      void saveQueuedAttendanceToDb(queuedRecord).catch((error: unknown) => {
        enqueueOfflineAction({
          actionType: 'attendance',
          userId: currentUser?.id || '',
          schoolId: activeSchool.id,
          description: `เช็คชื่อรอซิงค์: ${personName}`,
          payload: {
            studentId,
            status,
            remarks,
            method: queuedRecord.checkinMethod,
            extra: { ...extra, date: todayStr, recordId: attendanceRecordId, userName: personName },
          },
        });
        setDataSyncError(error instanceof Error ? error.message : String(error));
      });
    }
    const statusLabel = status === 'present' ? 'มาเรียน (ตรงเวลา)' : status === 'late' ? 'มาสาย' : 'ลา';

    const isCurrentActor = currentUser && (currentUser.id === studentId || currentUser.studentRecordId === studentId);
    sendEduVerseNotification({
      title: isCheckOut ? '🔔 บันทึกสแกนเลิกเรียนสำเร็จ' : '🔔 บันทึกการเข้าเรียนสำเร็จ',
      body: `${personName} • สถานะ: ${statusLabel} เวลา ${nowTime}`,
      category: 'attendance',
      tag: `att-${studentId}-${todayStr}`,
      schoolId: activeSchool.id,
      targetStudentIds: st ? [st.id, st.studentIdNumber || ''].filter(Boolean) : undefined,
      targetUserIds: tc
        ? [tc.id, ...(isCurrentActor && currentUser ? [currentUser.id] : [])]
        : (isCurrentActor && currentUser ? [currentUser.id] : undefined),
      targetRoles: st ? ['student', 'parent', 'teacher', 'admin', 'super_admin'] : ['teacher', 'admin', 'super_admin'],
      data: { studentId, status, date: todayStr }
    });

    if (
      !isDemoMode &&
      st &&
      currentUser &&
      ['admin', 'super_admin', 'teacher'].includes(currentUser.role)
    ) {
      const privateTitle = isCheckOut ? 'บันทึกการออกจากโรงเรียนแล้ว' : 'บันทึกการเข้าโรงเรียนแล้ว';
      void sendPrivateParentNotification({
        schoolId: activeSchool.id,
        studentId: st.id,
        eventId: attendanceRecordId,
        category: 'attendance',
        title: privateTitle,
        body: `${st.firstNameTh} ${st.lastNameTh} • ${statusLabel} เวลา ${nowTime}`,
      }).catch((error: unknown) => {
        console.error('Could not send private attendance notification to linked parents:', error);
      });
    }

    if (!isCheckOut && (status === 'present' || status === 'late')) {
      setPlayerScores((prev) =>
        prev.map((p) => {
          const isMatch = p.studentId === studentId || p.userId === studentId;
          if (!isMatch) return p;
          const isPresent = status === 'present';
          return {
            ...p,
            attendanceDays: (p.attendanceDays ?? 0) + 1,
            attendanceStreak: isPresent ? (p.attendanceStreak ?? p.streak) + 1 : p.attendanceStreak ?? p.streak,
            exp: p.exp + (isPresent ? 35 : 15),
            gems: p.gems + (isPresent ? 5 : 2),
          };
        })
      );
    }
  };

  const handleBulkImportAttendance = (records: AttendanceRecord[]) => {
    if (records.length === 0) return;
    const taggedRecords: AttendanceRecord[] = records.map((rec) => ({
      ...rec,
      schoolId: rec.schoolId || activeSchool.id,
    }));

    setAttendance((prev) => [...taggedRecords, ...prev]);

    const bonusByStudent = new Map<string, { present: number; late: number }>();
    for (const rec of taggedRecords) {
      if (rec.recordType === 'check_out') continue;
      if (rec.status !== 'present' && rec.status !== 'late') continue;
      const entry = bonusByStudent.get(rec.studentId) || { present: 0, late: 0 };
      if (rec.status === 'present') entry.present += 1;
      else entry.late += 1;
      bonusByStudent.set(rec.studentId, entry);
    }

    if (bonusByStudent.size > 0) {
      setPlayerScores((prev) =>
        prev.map((p) => {
          const bonus =
            bonusByStudent.get(p.studentId || '') ||
            bonusByStudent.get(p.userId);
          if (!bonus) return p;
          return {
            ...p,
            attendanceDays: (p.attendanceDays ?? 0) + bonus.present + bonus.late,
            attendanceStreak: (p.attendanceStreak ?? p.streak) + bonus.present,
            exp: p.exp + bonus.present * 35 + bonus.late * 15,
            gems: p.gems + bonus.present * 5 + bonus.late * 2,
          };
        })
      );
    }

    sendEduVerseNotification({
      title: '📥 นำเข้าข้อมูลการเข้าเรียนสำเร็จ',
      body: `นำเข้าบันทึกการเช็คชื่อจำนวน ${taggedRecords.length} รายการจากไฟล์ Excel/CSV เรียบร้อยแล้ว`,
      category: 'attendance',
      tag: `att-import-${Date.now()}`,
      schoolId: activeSchool.id,
      targetRoles: ['teacher', 'admin', 'super_admin'],
    });
  };

  const handleRecordPeriodAttendance = (records: PeriodAttendanceRecord[]) => {
    const taggedRecords = records.map((r) => ({ ...r, schoolId: activeSchool.id }));
    setPeriodAttendance((prev) => {
      const updated = [...prev];
      for (const rec of taggedRecords) {
        const idx = updated.findIndex(
          (p) => p.id === rec.id || (p.studentId === rec.studentId && p.courseId === rec.courseId && p.date === rec.date && p.periodNumber === rec.periodNumber && (p.recordType || 'check_in') === (rec.recordType || 'check_in'))
        );
        if (idx >= 0) {
          updated[idx] = rec;
        } else {
          updated.push(rec);
        }
      }
      return updated;
    });

    if (!isDemoMode && activeSchool.id && taggedRecords.length > 0) {
      void savePeriodAttendanceBatchToDb(activeSchool.id, taggedRecords).catch((error: unknown) => {
        setDataSyncError(error instanceof Error ? error.message : String(error));
      });
    }

    if (taggedRecords.length > 0) {
      const firstRec = taggedRecords[0];
      const isCheckout = firstRec.recordType === 'check_out';
      const course = courses.find((c) => c.id === firstRec.courseId);
      const student = students.find((s) => s.id === firstRec.studentId);
      const studentName = student ? `${student.firstNameTh} ${student.lastNameTh}` : 'นักเรียน';

      if (taggedRecords.length === 1) {
        const singleTitle = isCheckout
          ? '🔴 เช็คชื่อออกคาบเรียนสำเร็จ (Check-out)'
          : firstRec.status === 'absent'
            ? '⚠️ บันทึกขาดเรียนรายคาบ'
            : firstRec.status === 'excused'
              ? '📝 บันทึกลารายคาบ'
              : firstRec.status === 'late'
                ? '🟡 บันทึกมาสายรายคาบ'
                : '🟢 เช็คชื่อเข้าคาบเรียนสำเร็จ (มาเรียน)';
        sendEduVerseNotification({
          title: singleTitle,
          body: `${studentName} • วิชา ${firstRec.courseCode || course?.code} คาบที่ ${firstRec.periodNumber} (${firstRec.timeSlot})`,
          category: 'attendance',
          priority: firstRec.status === 'absent' ? 'urgent' : 'normal',
          schoolId: activeSchool.id,
          targetStudentIds: student ? [student.id, student.studentIdNumber || ''].filter(Boolean) : [firstRec.studentId],
          targetRoles: ['student', 'parent', 'teacher', 'admin', 'super_admin'],
        }).catch(() => {});
      } else {
        sendEduVerseNotification({
          title: '📋 บันทึกเช็คชื่อทั้งคาบเรียนสำเร็จ',
          body: `วิชา ${firstRec.courseCode || course?.code} คาบที่ ${firstRec.periodNumber} บันทึกรายชื่อแล้ว ${taggedRecords.length} คน`,
          category: 'attendance',
          priority: 'normal',
          schoolId: activeSchool.id,
          targetStudentIds: Array.from(new Set(taggedRecords.map((r) => r.studentId))),
          targetRoles: ['student', 'parent', 'teacher', 'admin', 'super_admin'],
        }).catch(() => {});
      }
    }
  };

  const handleAddLeaveRequest = (req: LeaveRequest) => {
    const taggedReq: LeaveRequest = { ...req, schoolId: activeSchool.id };
    setLeaveRequests(prev => [taggedReq, ...prev]);

    if (!isDemoMode && activeSchool.id) {
      void (async () => {
        try {
          let finalAttachmentUrl = taggedReq.attachmentUrl;
          if (finalAttachmentUrl && finalAttachmentUrl.startsWith('data:')) {
            const uploadedUrl = await uploadSchoolAttachment(activeSchool.id, 'leave-attachments', finalAttachmentUrl);
            if (uploadedUrl) {
              finalAttachmentUrl = uploadedUrl;
              setLeaveRequests(prev =>
                prev.map(item => (item.id === taggedReq.id ? { ...item, attachmentUrl: uploadedUrl } : item))
              );
            }
          }
          await saveLeaveRequestToDb(activeSchool.id, {
            ...taggedReq,
            attachmentUrl: finalAttachmentUrl,
          });
        } catch (error) {
          setDataSyncError(error instanceof Error ? error.message : String(error));
        }
      })();
    }
  };

  const handleUpdateLeaveStatus = (reqId: string, status: LeaveStatus, remarks?: string) => {
    const approverName = currentUser?.fullNameTh || currentUser?.fullNameEn || 'ฝ่ายบริหารวิชาการ';
    setLeaveRequests(prev => prev.map(req => {
      if (req.id !== reqId) return req;
      return {
        ...req,
        status,
        approvalRemarks: remarks || req.approvalRemarks,
        approvedBy: approverName
      };
    }));

    if (!isDemoMode && activeSchool.id) {
      void updateLeaveRequestStatusInDb(activeSchool.id, reqId, status, approverName, remarks).catch((error: unknown) => {
        setDataSyncError(error instanceof Error ? error.message : String(error));
      });
    }

    // If approved and the leave covers today, automatically reflect in today's attendance
    if (status === 'approved') {
      const targetReq = leaveRequests.find(r => r.id === reqId);
      if (targetReq) {
        const todayStr = getLocalDateString();
        if (targetReq.startDate <= todayStr && targetReq.endDate >= todayStr) {
          const attStatus: AttendanceStatus = targetReq.leaveType === 'sick' ? 'sick' : 'leave';
          handleRecordAttendance(
            targetReq.userId,
            attStatus,
            `อนุมัติใบลาออนไลน์: ${targetReq.reason} (${targetReq.leaveType === 'sick' ? 'ลาป่วย' : 'ลากิจ'})`,
            'manual',
            {
              recordType: 'check_in',
              userName: targetReq.userName,
              userRole: targetReq.userRole === 'student' ? 'นักเรียน' : 'ครู',
              userDepartmentOrRoom: targetReq.gradeLevelOrDepartment,
              userType: targetReq.userRole
            }
          );
        }
      }
    }
  };

  const handleUpdateCampusGates = (gates: CampusGateGeofence[]) => {
    const cleaned = sanitizeSchoolCampusGates(gates, activeSchool.id);
    setCampusGates(cleaned);
    try {
      if (cleaned.length > 0) {
        localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(cleaned));
      } else {
        localStorage.removeItem(`eduverse_campus_gates_${activeSchool.id}`);
      }
    } catch (e) {
      console.warn('Failed to save campus gates to localStorage', e);
    }
    const primaryGate = cleaned.find((g) => g.isPrimary || g.isActive) || cleaned[0];
    if (primaryGate && isValidCoordinatePair(primaryGate.lat, primaryGate.lng)) {
      const gateLat = primaryGate.lat;
      const gateLng = primaryGate.lng;
      setActiveSchool((prev) => ({
        ...prev,
        latitude: gateLat,
        longitude: gateLng,
        geofenceRadiusMeters: primaryGate.radiusMeters,
      }));
      setSchools((prev) =>
        prev.map((s) =>
          s.id === activeSchool.id
            ? {
                ...s,
                latitude: gateLat,
                longitude: gateLng,
                geofenceRadiusMeters: primaryGate.radiusMeters,
              }
            : s
        )
      );
      setSystemConfig((prev) => ({
        ...prev,
        latitude: gateLat,
        longitude: gateLng,
        geofenceRadiusMeters: primaryGate.radiusMeters,
      }));
    }
  };

  // -------------------------------------------------------------
  // SCHEDULE & TIMETABLE AUTOMATED NOTIFICATION WATCHER
  // Monitored for all users (students, teachers, admins):
  // 1. Period Start & Check-in reminder (5 mins before / at start)
  // 2. Period End & Check-out reminder (at end time)
  // 3. Late warning / Missed Check-in alert (10 mins after start)
  // 4. Morning arrival reminder & Late warning (> 08:00)
  // 5. Afternoon departure reminder (15:30 - 16:30)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentUser || currentUser.role === 'parent') return;
    const FIRED_STORAGE_PREFIX = 'eduverse_fired_schedule_alerts_v1_';
    const readFiredForDay = (dayStr: string): Set<string> => {
      try {
        const raw = window.localStorage.getItem(`${FIRED_STORAGE_PREFIX}${dayStr}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? new Set(parsed) : new Set();
      } catch {
        return new Set();
      }
    };
    const markFiredForDay = (dayStr: string, set: Set<string>, key: string) => {
      set.add(key);
      try {
        window.localStorage.setItem(`${FIRED_STORAGE_PREFIX}${dayStr}`, JSON.stringify(Array.from(set)));
        // Clean up older day keys so storage stays tiny
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(FIRED_STORAGE_PREFIX) && k !== `${FIRED_STORAGE_PREFIX}${dayStr}`) {
            window.localStorage.removeItem(k);
          }
        }
      } catch {
        // ignore quota errors
      }
    };

    const checkScheduleAndAttendance = () => {
      const now = new Date();
      const todayStr = getLocalDateString();
      const firedAlerts = readFiredForDay(todayStr);
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const totalMinutes = currentHours * 60 + currentMins;
      const dayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[now.getDay()];

      // Skip schedule reminders on weekends and official/school holidays
      if (isWeekendDate(todayStr)) return;
      const todayHoliday = getHolidayForDate(todayStr, activeSchool.id);
      if (todayHoliday) {
        const holidayKey = `${todayStr}-holiday-${todayHoliday.id}-${currentUser.id}`;
        const unifiedHolidayTag = `hol-notif-${todayHoliday.date}-${todayHoliday.id}`;
        if (!firedAlerts.has(holidayKey)) {
          markFiredForDay(todayStr, firedAlerts, holidayKey);
          sendEduVerseNotification({
            title: `🗓️ วันหยุด: ${todayHoliday.nameTh}`,
            body: 'ไม่มีการเรียนการสอนในวันนี้ (ระบบหยุดการแจ้งเตือนเข้าคาบเรียนอัตโนมัติ)',
            category: 'announcement',
            priority: 'normal',
            tag: unifiedHolidayTag,
            dedupeByTag: true,
            schoolId: activeSchool.id || currentUser.schoolId,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
            sourceKind: 'holiday',
          }).catch(() => {});
        }
        return;
      }

      // 1. Morning School Arrival (07:30 - 08:00: reminder to check-in)
      const morningKey = `${todayStr}-morning-arrival-${currentUser.id}`;
      if (totalMinutes >= 450 && totalMinutes <= 480 && !firedAlerts.has(morningKey)) {
        markFiredForDay(todayStr, firedAlerts, morningKey);
        sendEduVerseNotification({
          title: '☀️ สวัสดีตอนเช้า: อย่าลืมสแกนเข้าโรงเรียน',
          body: 'ยินดีต้อนรับสู่โรงเรียน กรุณาถ่ายรูปหรือสแกนบัตรเช็คอินผ่านพิกัด GPS ประตูโรงเรียนก่อนเวลา 08:00 น.',
          category: 'attendance',
          priority: 'normal',
          tag: morningKey,
          dedupeByTag: true,
          schoolId: activeSchool.id,
          targetUserIds: [currentUser.id],
          targetRoles: [currentUser.role],
        }).catch(() => {});
      }

      // 2. Morning Late Alert (> 08:05: if not checked in yet)
      const lateKey = `${todayStr}-morning-late-alert-${currentUser.id}`;
      if (totalMinutes >= 485 && totalMinutes <= 540 && !firedAlerts.has(lateKey)) {
        markFiredForDay(todayStr, firedAlerts, lateKey);
        const userHasCheckedIn = attendance.some(
          (a) =>
            a.date === todayStr &&
            (a.recordType === 'check_in' || !a.recordType) &&
            ((currentUser?.studentRecordId && a.studentId === currentUser.studentRecordId) ||
              (currentUser?.teacherRecordId &&
                (a.teacherId === currentUser.teacherRecordId || a.studentId === currentUser.teacherRecordId)) ||
              (currentUser?.fullNameTh && a.userName?.includes(currentUser.fullNameTh)))
        );
        if (!userHasCheckedIn) {
          sendEduVerseNotification({
            title: '⚠️ แจ้งเตือนเวลาเข้าโรงเรียน (เลยเวลา 08:00 น.)',
            body: 'ขณะนี้เลยเวลา 08:00 น. แล้ว ระบบยังไม่พบบันทึกการเช็คอินเข้าโรงเรียนของคุณ กรุณาติดต่อครูเวรประจำวันหรือสแกนเช็คชื่อด่วน',
            category: 'attendance',
            priority: 'urgent',
            tag: lateKey,
            dedupeByTag: true,
            schoolId: activeSchool.id,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }
      }

      // 3. Afternoon Departure Check-out (15:30 - 16:30)
      const departureKey = `${todayStr}-afternoon-departure-${currentUser.id}`;
      if (totalMinutes >= 930 && totalMinutes <= 990 && !firedAlerts.has(departureKey)) {
        markFiredForDay(todayStr, firedAlerts, departureKey);
        sendEduVerseNotification({
          title: '🏫 สิ้นสุดเวลาเรียนประจำวัน: อย่าลืมเช็คเอาท์',
          body: 'หมดเวลาเรียนตามตารางแล้ว กรุณาสแกนหรือถ่ายรูปเช็คเอาท์ (Check-out) ก่อนเดินทางกลับบ้านอย่างปลอดภัย',
          category: 'attendance',
          priority: 'normal',
          tag: departureKey,
          dedupeByTag: true,
          schoolId: activeSchool.id,
          targetUserIds: [currentUser.id],
          targetRoles: [currentUser.role],
        }).catch(() => {});
      }

      // 4. Period Timetable Notifications — strictly only for this user's scheduled slots today
      const personalTodaySlots = filterTimetableSlotsForPersonalRole(
        schoolTimetableSlots,
        currentUser,
        schoolStudents,
        schoolCourses
      ).filter((slot) => {
        if (slot.dayOfWeek !== dayKey) return false;
        if (currentUser.role === 'teacher') {
          const teacherName = currentUser.fullNameTh || currentUser.fullNameEn || '';
          return teacherName ? slotHasTeacher(slot, teacherName) : true;
        }
        return true;
      });

      const periodsToCheck = (schoolPeriods.length > 0 ? schoolPeriods : DEFAULT_SCHOOL_PERIODS).filter(
        (p) => !p.isBreak && p.periodNumber > 0
      );

      periodsToCheck.forEach((p) => {
        const matchedSlot = personalTodaySlots.find((s) => s.periodNumber === p.periodNumber);
        if (!matchedSlot) return;

        const [sH, sM] = p.startTime.split(':').map(Number);
        const [eH, eM] = p.endTime.split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;
        const subjectLabel = matchedSlot.courseTitleTh || matchedSlot.courseCode || `คาบที่ ${p.periodNumber}`;

        // 4.1. Period Start & Check-in Reminder (within 5 minutes before or at start)
        const pStartKey = `${todayStr}-p${p.periodNumber}-start-${currentUser.id}`;
        if (totalMinutes >= startMin - 5 && totalMinutes <= startMin + 3 && !firedAlerts.has(pStartKey)) {
          markFiredForDay(todayStr, firedAlerts, pStartKey);
          sendEduVerseNotification({
            title: `⏰ คาบที่ ${p.periodNumber}: ${subjectLabel} (${p.startTime} - ${p.endTime})`,
            body: `ใกล้เริ่มวิชา ${subjectLabel} ห้อง ${matchedSlot.room || '-'} แล้ว กรุณาเช็คชื่อเข้าคาบเรียน (Check-in)`,
            category: 'attendance',
            priority: 'urgent',
            tag: pStartKey,
            dedupeByTag: true,
            schoolId: activeSchool.id,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }

        // 4.2. Mid-period Late / Missed Check-in Reminder (10 mins after start)
        const pLateKey = `${todayStr}-p${p.periodNumber}-missed-${currentUser.id}`;
        if (totalMinutes >= startMin + 10 && totalMinutes <= startMin + 15 && !firedAlerts.has(pLateKey)) {
          markFiredForDay(todayStr, firedAlerts, pLateKey);
          sendEduVerseNotification({
            title: `⚠️ แจ้งเตือนเช็คชื่อคาบที่ ${p.periodNumber}: ${subjectLabel}`,
            body: `วิชา ${subjectLabel} (${p.startTime} - ${p.endTime}) เริ่มไปแล้ว 10 นาที กรุณาตรวจสอบการเช็คชื่อเข้าคาบเรียน`,
            category: 'attendance',
            priority: 'urgent',
            tag: pLateKey,
            dedupeByTag: true,
            schoolId: activeSchool.id,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }

        // 4.3. Period End & Check-out Reminder (within 3 mins of end)
        const pEndKey = `${todayStr}-p${p.periodNumber}-end-${currentUser.id}`;
        if (totalMinutes >= endMin - 2 && totalMinutes <= endMin + 3 && !firedAlerts.has(pEndKey)) {
          markFiredForDay(todayStr, firedAlerts, pEndKey);
          sendEduVerseNotification({
            title: `🔔 สิ้นสุดคาบที่ ${p.periodNumber}: ${subjectLabel} (${p.endTime} น.)`,
            body: `หมดเวลาวิชา ${subjectLabel} แล้ว สามารถกดเช็คชื่อออกคาบเรียน (Check-out) ได้จากตารางเรียน`,
            category: 'attendance',
            priority: 'normal',
            tag: pEndKey,
            dedupeByTag: true,
            schoolId: activeSchool.id,
            targetUserIds: [currentUser.id],
            targetRoles: [currentUser.role],
          }).catch(() => {});
        }
      });
    };

    checkScheduleAndAttendance();
    const interval = setInterval(checkScheduleAndAttendance, 30000);
    return () => clearInterval(interval);
  }, [schoolPeriods, attendance, currentUser, activeSchool.id, schoolTimetableSlots, schoolStudents, schoolCourses]);

  const handleSaveCampusGates = async (gates: CampusGateGeofence[]) => {
    if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
      throw new Error('เฉพาะผู้ดูแลระบบโรงเรียนเท่านั้นที่มีสิทธิ์แก้ไขพิกัดและจุดเช็คชื่อ');
    }
    const cleaned = sanitizeSchoolCampusGates(gates, activeSchool.id);
    const savedToDatabase = isDemoMode ? false : await saveSchoolCampusGates(activeSchool.id, cleaned);
    handleUpdateCampusGates(cleaned);
    return savedToDatabase;
  };

  const handleUpdateSchoolCoordinates = (lat: number, lng: number, radiusMeters: number) => {
    if (!isValidCoordinatePair(lat, lng)) return;
    const safeRadius = Number.isFinite(radiusMeters) && radiusMeters > 0 ? Math.round(radiusMeters) : 150;
    setActiveSchool((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      geofenceRadiusMeters: safeRadius,
    }));
    setSchools((prev) =>
      prev.map((s) =>
        s.id === activeSchool.id
          ? {
              ...s,
              latitude: lat,
              longitude: lng,
              geofenceRadiusMeters: safeRadius,
            }
          : s
      )
    );
    setSystemConfig((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      geofenceRadiusMeters: safeRadius,
    }));
    try {
      localStorage.setItem(`eduverse_school_gps_${activeSchool.id}`, JSON.stringify({ lat, lng, radiusMeters: safeRadius }));
    } catch (e) {
      console.warn('Failed to save school gps to localStorage', e);
    }
    if (!isDemoMode && activeSchool.id) {
      saveSchoolGpsCoordinates(activeSchool.id, lat, lng, safeRadius).catch(err => {
        console.warn('Could not sync school coordinates to Supabase:', err);
      });
    }
    setCampusGates((prevGates) => {
      const cleanedPrev = sanitizeSchoolCampusGates(prevGates, activeSchool.id);
      let nextGates: CampusGateGeofence[];
      if (cleanedPrev.length === 0) {
        nextGates = [
          {
            id: `gate_${activeSchool.id}_1`,
            schoolId: activeSchool.id,
            nameTh: `ประตูหลัก ${activeSchool.nameTh}`,
            nameEn: `Main Gate ${activeSchool.nameEn}`,
            lat,
            lng,
            latitude: lat,
            longitude: lng,
            radiusMeters: safeRadius,
            isPrimary: true,
            isActive: true,
            type: 'main_gate',
          },
        ];
      } else {
        nextGates = cleanedPrev.map((g, idx) => {
          if (g.isPrimary || idx === 0) {
            return {
              ...g,
              lat,
              lng,
              latitude: lat,
              longitude: lng,
              radiusMeters: safeRadius,
            };
          }
          return g;
        });
      }
      try {
        localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(nextGates));
      } catch { /* ignore */ }
      if (!isDemoMode && activeSchool.id) {
        saveSchoolCampusGates(activeSchool.id, nextGates).catch(err => {
          console.warn('Could not sync updated primary gate to Supabase:', err);
        });
      }
      return nextGates;
    });
  };

  const handleQuickCheckIn = (studentId: string) => {
    handleRecordAttendance(studentId, 'present', 'สแกนบัตรผ่านประตูอัตโนมัติ (Gate Turnstile)');
  };

  const saveInvoiceSlipOverlay = (
    schoolId: string,
    invoiceId: string,
    patch: Partial<Pick<TuitionInvoice, 'slipImageUrl' | 'slipSubmittedAt' | 'slipStatus' | 'slipRejectReason' | 'slipReferenceNote' | 'status' | 'paidAt' | 'receiptNumber' | 'paymentMethod'>>
  ) => {
    if (typeof window === 'undefined' || !schoolId) return;
    try {
      const key = `eduverse_invoice_slips_v1_${schoolId}`;
      const raw = localStorage.getItem(key);
      const map = raw ? (JSON.parse(raw) as Record<string, Partial<TuitionInvoice>>) : {};
      map[invoiceId] = { ...(map[invoiceId] || {}), ...patch };
      localStorage.setItem(key, JSON.stringify(map));
    } catch {
      // ignore storage quota errors
    }
  };

  const handlePayInvoice = (invoiceId: string, method?: TuitionInvoice['paymentMethod']) => {
    const paidTime = new Date().toISOString();
    const receiptNum = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const resolvedMethod = method || 'promptpay';
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'paid',
              paymentMethod: resolvedMethod,
              paidAt: paidTime,
              receiptNumber: receiptNum,
            }
          : inv
      )
    );
    saveInvoiceSlipOverlay(activeSchool.id, invoiceId, {
      status: 'paid',
      paymentMethod: resolvedMethod,
      paidAt: paidTime,
      receiptNumber: receiptNum,
    });
    setDataSyncError(null);
  };

  const handleSubmitInvoiceSlip = (invoiceId: string, slipDataUrl: string, note: string) => {
    const submittedAt = new Date().toISOString();
    const patch: Partial<TuitionInvoice> = {
      slipImageUrl: slipDataUrl,
      slipSubmittedAt: submittedAt,
      slipStatus: 'pending_review',
      slipReferenceNote: note,
      slipRejectReason: undefined,
    };
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...patch } : inv))
    );
    saveInvoiceSlipOverlay(activeSchool.id, invoiceId, patch);
    if (!isDemoMode && activeSchool.id) {
      void submitInvoiceSlipToDb(activeSchool.id, invoiceId, slipDataUrl, note)
        .then((finalUrl) => {
          if (finalUrl && finalUrl !== slipDataUrl) {
            setInvoices((prev) =>
              prev.map((inv) => (inv.id === invoiceId ? { ...inv, slipImageUrl: finalUrl } : inv))
            );
            saveInvoiceSlipOverlay(activeSchool.id, invoiceId, { slipImageUrl: finalUrl });
          }
        })
        .catch((error: unknown) => {
          setDataSyncError(error instanceof Error ? error.message : String(error));
        });
    }
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'invoice_slip_submitted',
        targetLabel: invoiceId,
        details: note || 'ผู้ปกครองแนบสลิป PromptPay รอตรวจสอบ',
      });
    }
  };

  const handleApproveInvoiceSlip = (invoiceId: string) => {
    handlePayInvoice(invoiceId, 'promptpay');
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, slipStatus: 'approved', slipRejectReason: undefined } : inv))
    );
    saveInvoiceSlipOverlay(activeSchool.id, invoiceId, {
      slipStatus: 'approved',
      slipRejectReason: undefined,
    });
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'invoice_slip_approved',
        targetLabel: invoiceId,
        details: 'อนุมัติสลิปโอนเงินและออกเลขที่ใบเสร็จอัตโนมัติ',
      });
    }
  };

  const handleRejectInvoiceSlip = (invoiceId: string, reason: string) => {
    const patch: Partial<TuitionInvoice> = {
      slipStatus: 'rejected',
      slipRejectReason: reason,
    };
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...patch } : inv))
    );
    saveInvoiceSlipOverlay(activeSchool.id, invoiceId, patch);
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'invoice_slip_rejected',
        targetLabel: invoiceId,
        details: reason,
      });
    }
  };

  const handleSendPrivateAppReminder = async (invoice: TuitionInvoice) => {
    const student = schoolStudents.find((item) => item.id === invoice.studentId);
    if (!student) throw new Error('ไม่พบข้อมูลนักเรียนที่ผูกกับใบแจ้งหนี้นี้');
    if (!currentUser || !['admin', 'super_admin', 'teacher'].includes(currentUser.role)) {
      throw new Error('เฉพาะผู้ดูแลหรือครูที่มีสิทธิ์เท่านั้นที่ส่งแจ้งเตือนได้');
    }
    const result = await sendPrivateParentNotification({
      schoolId: activeSchool.id,
      studentId: student.id,
      eventId: `${invoice.id}-reminder-${getLocalDateString()}`,
      category: 'billing',
      title: 'มีรายการค่าใช้จ่ายของบุตรหลาน',
      body: `${student.firstNameTh} ${student.lastNameTh} • ใบแจ้งหนี้ ${invoice.invoiceNumber} • ครบกำหนด ${invoice.dueDate} • ${invoice.totalAmount.toLocaleString('th-TH')} บาท`,
    });
    setDataSyncError(null);
    return result;
  };

  const handleAddInvoice = (newInvoice: TuitionInvoice) => {
    setInvoices((prev) => [{ ...newInvoice, schoolId: activeSchool.id }, ...prev]);
    setDataSyncError(null);
  };

  const handleAddAnnouncement = (newAnn: Announcement) => {
    const scopedAnn: Announcement = { ...newAnn, schoolId: activeSchool.id };
    setAnnouncements((prev) => [scopedAnn, ...prev]);
    const audienceRoles: UserRole[] =
      scopedAnn.targetAudience === 'students'
        ? ['student', 'teacher', 'admin', 'super_admin']
        : scopedAnn.targetAudience === 'parents'
          ? ['parent', 'teacher', 'admin', 'super_admin']
          : scopedAnn.targetAudience === 'teachers'
            ? ['teacher', 'admin', 'super_admin']
            : ['student', 'parent', 'teacher', 'admin', 'super_admin'];
    void sendEduVerseNotification({
      title: `📢 ประกาศโรงเรียน: ${scopedAnn.title}`,
      body: scopedAnn.content,
      category: 'announcement',
      priority: scopedAnn.category === 'urgent' ? 'urgent' : 'normal',
      tag: `ann-${scopedAnn.id}`,
      schoolId: activeSchool.id,
      isBroadcast: true,
      targetRoles: audienceRoles,
      sourceKind: 'announcement',
    });
  };

  const handleBroadcastLine = (announcementId: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, lineBroadcastSent: true } : a))
    );
    setDataSyncError(null);
  };

  const handleCompleteLesson = async (lessonId: string) => {
    if (currentUser?.role !== 'student') throw new Error('Only students can complete lessons.');
    const lesson = schoolLessons.find((item) => item.id === lessonId && item.schoolId === activeSchool.id);
    if (!lesson) throw new Error('The selected lesson is no longer available.');
    const enrolledCourseIds = new Set(
      filterCoursesForPersonalRole(schoolCourses, currentUser, schoolStudents).map((course) => course.id)
    );
    if (!enrolledCourseIds.has(lesson.courseId)) throw new Error('This lesson is not available for your enrolled courses.');
    const actorStudentId = resolveLinkedStudentsForUser(currentUser, schoolStudents)[0]?.id || currentUser.studentRecordId;
    if (!actorStudentId) throw new Error('Your student record could not be found.');
    await saveSchoolLessonCompletionToDb(activeSchool.id, lesson.id, actorStudentId);
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const completedByStudentIds = actorStudentId
          ? Array.from(new Set([...(l.completedByStudentIds || []), actorStudentId]))
          : l.completedByStudentIds;
        return { ...l, completed: true, completedByStudentIds };
      })
    );
  };

  const handleSaveSchoolLesson = async (lesson: Lesson) => {
    if (!currentUser || !['admin', 'super_admin', 'teacher'].includes(currentUser.role)) {
      throw new Error('Only school staff can manage lessons.');
    }
    const course = schoolCourses.find((item) => item.id === lesson.courseId);
    if (!course) throw new Error('Select a valid course in this school.');
    if (currentUser.role === 'teacher') {
      const teacher = schoolTeachers.find((item) =>
        item.id === currentUser.teacherRecordId || item.email?.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (!teacher || !teacherMatchesCourse(teacher, course)) {
        throw new Error('You can only manage lessons for courses assigned to you.');
      }
    }
    const schoolLesson = { ...lesson, schoolId: activeSchool.id };
    await saveSchoolLessonToDb(activeSchool.id, schoolLesson, currentUser.id);
    setLessons((prev) => [...prev.filter((item) => item.id !== schoolLesson.id), schoolLesson]
      .sort((a, b) => a.courseId.localeCompare(b.courseId) || a.chapterNumber - b.chapterNumber));
    setDataSyncError(null);
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (currentUser?.role !== 'student') throw new Error('Only students can submit an assignment.');
    if (schoolPermissions.student_submit_homework === false) {
      throw new Error('Online homework submission is disabled by the school.');
    }
    const assignment = schoolAssignments.find((item) => item.id === assignmentId);
    if (!assignment || assignment.status !== 'active') throw new Error('The selected assignment is no longer available.');
    const enrolledCourseIds = new Set(
      filterCoursesForPersonalRole(schoolCourses, currentUser, schoolStudents).map((course) => course.id)
    );
    if (!enrolledCourseIds.has(assignment.courseId)) {
      throw new Error('This assignment is not available for your enrolled courses.');
    }
    const linkedStudent = resolveLinkedStudentsForUser(currentUser, schoolStudents)[0];
    const student = schoolStudents.find((item) => item.id === (linkedStudent?.id || currentUser.studentRecordId));
    if (!student) throw new Error('Your student record could not be found.');
    const alreadySubmitted = schoolHomeworkSubmissions.some(
      (submission) =>
        submission.assignmentId === assignment.id &&
        submission.studentId === student.id &&
        submission.status !== 'pending'
    );
    if (alreadySubmitted) throw new Error('You have already submitted this assignment.');

    const course = schoolCourses.find((item) => item.id === assignment.courseId);
    const submittedAt = new Date().toISOString();
    const submission: HomeworkSubmission = {
      id: `submission-${crypto.randomUUID()}`,
      schoolId: activeSchool.id,
      assignmentId: assignment.id,
      assignmentTitle: assignment.titleTh,
      courseCode: assignment.courseCode || course?.code || '',
      courseTitleTh: course?.titleTh || '',
      studentId: student.id,
      studentName: `${student.firstNameTh} ${student.lastNameTh}`.trim(),
      studentRoom: student.room,
      dueDate: assignment.dueDate,
      submittedAt,
      status: getLocalDateString() <= assignment.dueDate ? 'submitted' : 'late',
      maxScore: assignment.maxScore ?? assignment.points,
    };
    if (!isDemoMode) await saveHomeworkSubmissionToDb(activeSchool.id, submission);
    setHomeworkSubmissions((prev) => [submission, ...prev]);
    setAssignments((prev) => prev.map((item) => (
      item.id === assignment.id
        ? { ...item, submittedStudentIds: Array.from(new Set([...(item.submittedStudentIds || []), student.id])) }
        : item
    )));
  };

  const handleAddQuestion = (question: QuizQuestion) => {
    const tagged = { ...question, schoolId: activeSchool.id };
    setQuestions((prev) => [tagged, ...prev.filter((q) => q.id !== tagged.id)]);
    void saveSchoolQuestionsBatch(activeSchool.id, [tagged], isDemoMode);
  };

  const handleImportQuestions = (newQuestions: QuizQuestion[]) => {
    const tagged = newQuestions.map((q) => ({ ...q, schoolId: activeSchool.id }));
    setQuestions((prev) => {
      const byId = new Map<string, QuizQuestion>();
      for (const q of [...tagged, ...prev]) {
        byId.set(q.id, q);
      }
      return Array.from(byId.values());
    });
    void saveSchoolQuestionsBatch(activeSchool.id, tagged, isDemoMode);
  };

  const handleClaimFreeCentralPack = async (pack: CentralExamPack) => {
    const res = await claimCentralExamPack({
      schoolId: activeSchool.id,
      pack,
      paymentMethod: 'free',
      claimedBy: currentUser?.fullNameTh || currentUser?.email || 'School Admin',
      isDemoMode,
    });
    setSchoolExamEntitlements(res.allEntitlements);
    handleImportQuestions(res.addedQuestions);
    sendEduVerseNotification({
      title: `รับข้อสอบกลางเข้าโรงเรียนสำเร็จ: ${pack.titleTh}`,
      body: `เพิ่มข้อสอบใหม่ ${res.addedQuestions.length} ข้อเข้าคลังข้อสอบของ ${activeSchool.nameTh} แล้ว`,
      category: 'system',
      schoolId: activeSchool.id,
      targetRoles: ['admin', 'super_admin', 'teacher'],
    });
  };

  const handleClaimAllFreeCentralPacks = async () => {
    const freePacks = unclaimedCentralPacks.filter((p) => p.pricingType === 'free');
    for (const pack of freePacks) {
      await handleClaimFreeCentralPack(pack);
    }
  };

  const handlePurchaseCentralPack = async (
    pack: CentralExamPack,
    method: 'promptpay' | 'invoice',
    slipUrl?: string
  ) => {
    const res = await claimCentralExamPack({
      schoolId: activeSchool.id,
      pack,
      paymentMethod: method,
      claimedBy: currentUser?.fullNameTh || currentUser?.email || 'School Admin',
      isDemoMode,
      slipUrl,
    });
    setSchoolExamEntitlements(res.allEntitlements);
    handleImportQuestions(res.addedQuestions);
    sendEduVerseNotification({
      title: `⚡ ปลดล็อกข้อสอบกลางทันที: ${pack.titleTh}`,
      body: `ปลดล็อก ${res.addedQuestions.length} ข้อเข้าคลังโรงเรียนแล้ว (แนบสลิป 100% รอตรวจสอบย้อนหลัง)`,
      category: 'billing',
      schoolId: activeSchool.id,
      targetRoles: ['admin', 'super_admin'],
    });
  };

  const handleEarnRewards = (userId: string, exp: number, gems: number, isWin: boolean) => {
    const resolvedUserId = userId === 'temp' && currentUser?.id ? currentUser.id : userId;
    if (!resolvedUserId || !currentUser || resolvedUserId !== currentUser.id) return;
    const eventId = globalThis.crypto?.randomUUID?.() || `arc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    triggerHaptic(isWin ? 'success' : 'light');

    setPlayerScores((prev) => {
      const existing = prev.find((p) => p.userId === resolvedUserId);
      const streakUpdate = computeUpdatedDailyStreak(
        existing?.dailyStreak,
        existing?.lastPlayedDate
      );
      const nextExp = (existing?.exp || 0) + Math.max(0, exp);
      const nextGems = (existing?.gems || 0) + Math.max(0, gems);
      const nextWins = (existing?.battleWins || 0) + (isWin ? 1 : 0);
      const nextWinStreak = isWin ? (existing?.streak || 0) + 1 : 0;

      const updatedProfile: PlayerScore = existing
        ? {
            ...existing,
            schoolId: activeSchool.id,
            name:
              existing.userId === currentUser?.id
                ? currentUser.fullNameTh || currentUser.fullNameEn || existing.name
                : existing.name,
            avatarUrl:
              existing.userId === currentUser?.id && currentUser.avatarUrl
                ? currentUser.avatarUrl
                : existing.avatarUrl,
            exp: nextExp,
            gems: nextGems,
            rankTitle: computeRankTitle(nextExp),
            battleWins: nextWins,
            streak: nextWinStreak,
            dailyStreak: streakUpdate.dailyStreak,
            lastPlayedDate: streakUpdate.lastPlayedDate,
          }
        : {
            userId: resolvedUserId,
            schoolId: activeSchool.id,
            studentId: currentUser?.studentRecordId,
            name: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้เล่น',
            role: currentUser?.role === 'teacher' ? 'teacher' : 'student',
            avatarUrl: currentUser?.avatarUrl || '',
            exp: nextExp,
            gems: nextGems,
            rankTitle: computeRankTitle(nextExp),
            battleWins: nextWins,
            streak: nextWinStreak,
            dailyStreak: streakUpdate.dailyStreak,
            lastPlayedDate: streakUpdate.lastPlayedDate,
            equippedFrameId: 'frame-default',
            unlockedItemIds: [],
          };

      const nextList = existing
        ? prev.map((p) => (p.userId === resolvedUserId ? updatedProfile : p))
        : [updatedProfile, ...prev];
      return [...nextList].sort((a, b) => b.exp - a.exp);
    });

    if (activeSchool.id) {
      awardArcadeRewardEvent(activeSchool.id, eventId, Math.max(0, exp), Math.max(0, gems), isWin)
        .then((authoritativeProfile) => {
          if (!authoritativeProfile) return;
          setPlayerScores((prev) => [
            authoritativeProfile,
            ...prev.filter((profile) => profile.userId !== authoritativeProfile.userId),
          ].sort((a, b) => b.exp - a.exp));
        })
        .catch((error) => {
          console.warn('Arcade reward was not accepted by the server:', error);
          loadAuthoritativeArcadeProfile(activeSchool.id, resolvedUserId)
            .then((authoritativeProfile) => setPlayerScores((prev) => authoritativeProfile
              ? [authoritativeProfile, ...prev.filter((profile) => profile.userId !== resolvedUserId)]
              : prev.filter((profile) => profile.userId !== resolvedUserId)))
            .catch(() => {});
        });
    }
  };

  const handleRecordMilestoneActivity = (
    userId: string,
    kind: 'library_visit' | 'attendance',
    studentId?: string
  ) => {
    if (kind === 'attendance' && studentId) {
      handleRecordAttendance(
        studentId,
        'present',
        'บันทึกเข้าเรียนและอัปเดตเหรียญ Milestone Achievement'
      );
      return;
    }

    setPlayerScores((prev) =>
      prev.map((p) => {
        if (p.userId !== userId && (!studentId || p.studentId !== studentId)) {
          return p;
        }
        if (kind === 'library_visit') {
          return {
            ...p,
            libraryVisits: (p.libraryVisits ?? 0) + 1,
            exp: p.exp + 50,
            gems: p.gems + 5,
          };
        }
        return {
          ...p,
          attendanceDays: (p.attendanceDays ?? 0) + 1,
          attendanceStreak: (p.attendanceStreak ?? p.streak) + 1,
          exp: p.exp + 35,
          gems: p.gems + 5,
        };
      })
    );
  };

  const handleRedeemReward = async (rewardId: string, costGems: number) => {
    if (!currentUser || !activeSchool.id) return;
    const item = rewardItems.find((r) => r.id === rewardId);
    const currentProfile = playerScores.find((p) => p.userId === currentUser.id);
    if (!item || !currentProfile || currentProfile.gems < costGems) {
      triggerHaptic('error');
      return;
    }

    const isCosmetic = item.category === 'frame' || item.category === 'title';
    const alreadyOwned = (currentProfile.unlockedItemIds || []).includes(item.id);
    if (isCosmetic && alreadyOwned) {
      handleEquipCosmetic({
        frameId: item.frameId,
        title: item.titleLabel,
      });
      return;
    }

    const matchedStudent = students.find(
      (s) => s.id === currentUser.studentRecordId || s.studentIdNumber === currentUser.studentIdNumber
    );
    const requestId = globalThis.crypto?.randomUUID?.() || `redeem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const secureResult = await redeemArcadeReward(activeSchool.id, requestId, item.id);
      if (secureResult) {
        triggerHaptic('success');
        setPlayerScores((prev) => [
          secureResult.profile,
          ...prev.filter((profile) => profile.userId !== secureResult.profile.userId),
        ].sort((a, b) => b.exp - a.exp));
        if (secureResult.redemption) {
          setRewardRedemptions((prev) => [
            secureResult.redemption!,
            ...prev.filter((request) => request.id !== secureResult.redemption!.id),
          ]);
          setRewardItems((prev) => prev.map((reward) =>
            reward.id === item.id && reward.stock > 0 ? { ...reward, stock: reward.stock - 1 } : reward
          ));
        }
        return;
      }
    } catch (error) {
      console.warn('Arcade redemption was not accepted by the server:', error);
      triggerHaptic('error');
      return;
    }

    // Local-only demo/offline mode. Persistent accounts use the atomic server RPC above.
    triggerHaptic('success');

    const nextUnlocked = isCosmetic
      ? Array.from(new Set([...(currentProfile.unlockedItemIds || []), item.id]))
      : currentProfile.unlockedItemIds || [];

    const updatedProfile: PlayerScore = {
      ...currentProfile,
      gems: Math.max(0, currentProfile.gems - costGems),
      unlockedItemIds: nextUnlocked,
      equippedFrameId: item.frameId || currentProfile.equippedFrameId || 'frame-default',
      equippedTitle: item.titleLabel || currentProfile.equippedTitle,
    };

    setPlayerScores((prev) =>
      prev.map((p) => (p.userId === currentUser.id ? updatedProfile : p))
    );
    upsertArcadePlayerProfile(activeSchool.id, updatedProfile).catch(() => {});

    if (!isCosmetic) {
      // Decrease available stock and submit a real approval request for teachers/admins
      setRewardItems((prev) =>
        prev.map((r) => (r.id === item.id && r.stock > 0 ? { ...r, stock: r.stock - 1 } : r))
      );
      const matchedStudent = students.find(
        (s) => s.id === currentUser.studentRecordId || s.studentIdNumber === currentUser.studentIdNumber
      );
      const request: RewardRedemptionRequest = {
        id: requestId,
        schoolId: activeSchool.id,
        userId: currentUser.id,
        studentName: currentUser.fullNameTh || currentUser.fullNameEn || 'นักเรียน',
        gradeRoom: matchedStudent
          ? `${matchedStudent.gradeLevel} ${matchedStudent.room}`.trim()
          : currentUser.gradeLevel
            ? `${currentUser.gradeLevel} ${currentUser.room || ''}`.trim()
            : undefined,
        itemId: item.id,
        itemTitleTh: item.titleTh,
        costGems,
        category: item.category,
        status: item.requiresApproval === false ? 'approved' : 'pending',
        requestedAt: new Date().toISOString(),
      };
      setRewardRedemptions((prev) => [request, ...prev]);
      createRewardRedemptionRequest(activeSchool.id, request).catch(() => {});
    }
  };

  const handleEquipCosmetic = (payload: { frameId?: string; title?: string }) => {
    if (!currentUser || !activeSchool.id) return;
    triggerHaptic('light');
    setPlayerScores((prev) => {
      const existing = prev.find((p) => p.userId === currentUser.id);
      if (!existing) return prev;
      const updated: PlayerScore = {
        ...existing,
        equippedFrameId:
          payload.frameId !== undefined ? payload.frameId : existing.equippedFrameId,
        equippedTitle:
          payload.title !== undefined ? payload.title : existing.equippedTitle,
      };
      upsertArcadePlayerProfile(activeSchool.id, updated).catch(() => {});
      return prev.map((p) => (p.userId === currentUser.id ? updated : p));
    });
  };

  const handleReviewRedemption = (
    requestId: string,
    status: 'approved' | 'rejected',
    teacherNote?: string
  ) => {
    if (!currentUser || !activeSchool.id) return;
    const target = rewardRedemptions.find((r) => r.id === requestId);
    if (!target || target.status !== 'pending') return;

    const reviewerName = currentUser.fullNameTh || currentUser.fullNameEn || 'ครูผู้ดูแล';
    triggerHaptic(status === 'approved' ? 'success' : 'light');

    updateRewardRedemptionStatus(
      activeSchool.id,
      requestId,
      status,
      reviewerName,
      teacherNote
    ).then((updatedProfile) => {
      setRewardRedemptions((prev) => prev.map((request) => request.id === requestId
        ? { ...request, status, reviewedBy: reviewerName, reviewedAt: new Date().toISOString(), teacherNote }
        : request));
      if (updatedProfile) {
        setPlayerScores((prev) => [updatedProfile, ...prev.filter((profile) => profile.userId !== updatedProfile.userId)]);
      }
    }).catch((error) => {
      console.warn('Arcade reward review was not accepted by the server:', error);
    });
  };

  const handleCreateCustomReward = (item: RewardItem) => {
    if (!activeSchool.id) return;
    const scopedItem: RewardItem = {
      ...item,
      schoolId: activeSchool.id,
    };
    setRewardItems((prev) => [scopedItem, ...prev]);
    saveSchoolCustomReward(activeSchool.id, scopedItem).catch(() => {});
    triggerHaptic('success');
  };

  const handleAddPortfolioItem = (item: PortfolioItem) => {
    const taggedItem = { ...item, schoolId: activeSchool.id };
    setPortfolioItems((prev) => {
      const next = [taggedItem, ...prev];
      try {
        if (activeSchool.id) {
          localStorage.setItem(
            `eduverse_portfolio_items_${activeSchool.id}`,
            JSON.stringify(next.filter((p) => !p.schoolId || p.schoolId === activeSchool.id))
          );
        }
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
    if (activeSchool.id && !isDemoMode) {
      const student = item.ownerRole === 'student'
        ? schoolStudents.find((candidate) => candidate.id === item.ownerId)
          || (currentUser && item.ownerId === currentUser.id && currentUser.studentRecordId
            ? schoolStudents.find((candidate) => candidate.id === currentUser.studentRecordId)
            : undefined)
        : undefined;
      void saveSchoolStudentRecord({
        schoolId: activeSchool.id,
        recordKind: 'portfolio',
        recordId: item.id,
        studentId: student?.id,
        ownerUserId: currentUser && item.ownerId === currentUser.id ? currentUser.id : undefined,
        record: taggedItem,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      });
    }
  };

  const handleDeletePortfolioItem = (itemId: string) => {
    setPortfolioItems((prev) => {
      const next = prev.filter((p) => p.id !== itemId);
      try {
        if (activeSchool.id) {
          localStorage.setItem(
            `eduverse_portfolio_items_${activeSchool.id}`,
            JSON.stringify(next.filter((p) => !p.schoolId || p.schoolId === activeSchool.id))
          );
        }
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
    if (activeSchool.id && !isDemoMode) {
      void deleteSchoolStudentRecord(activeSchool.id, 'portfolio', itemId).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      });
    }
  };

  const handleUpdateUserProfile = async (updatedUser: AuthUser) => {
    if (!currentUser) return;
    const user = {
      ...currentUser,
      fullNameTh: updatedUser.fullNameTh,
      fullNameEn: updatedUser.fullNameEn,
      avatarUrl: updatedUser.avatarUrl,
      phone: updatedUser.phone,
      role: currentUser?.role || 'student',
      schoolId: activeSchool.id,
    };
    if (isDemoMode) {
      setCurrentUser(user);
      return;
    }
    try {
      await updateUserProfileInSupabase(user);
      setCurrentUser(user);
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      return;
    }
  };

  const handleAddTimetableSlot = async (slot: TimetableSlot) => {
    const fullSlot: TimetableSlot = {
      ...slot,
      schoolId: activeSchool.id,
      academicYear: slot.academicYear || activeSchool.academicYear || systemConfig.academicYear,
      semester: slot.semester || activeSchool.currentSemester || systemConfig.currentSemester,
    };
    const next = [fullSlot, ...timetableSlots];
    await saveTimetableSlotsToDb(activeSchool.id, next);
    setTimetableSlots(next);
  };

  const handleUpdateTimetableSlot = async (slot: TimetableSlot) => {
    const updatedSlot: TimetableSlot = {
      ...slot,
      schoolId: activeSchool.id,
      academicYear: slot.academicYear || activeSchool.academicYear || systemConfig.academicYear,
      semester: slot.semester || activeSchool.currentSemester || systemConfig.currentSemester,
    };
    let updated = false;
    const next = timetableSlots.map((currentSlot) => {
      if (currentSlot.id !== slot.id || (currentSlot.schoolId && currentSlot.schoolId !== activeSchool.id)) {
        return currentSlot;
      }
      updated = true;
      return updatedSlot;
    });
    if (!updated) throw new Error('ไม่พบคาบเรียนที่ต้องการแก้ไข กรุณารีเฟรชหน้าแล้วลองอีกครั้ง');
    await saveTimetableSlotsToDb(activeSchool.id, next);
    setTimetableSlots(next);
  };

  const handleDeleteTimetableSlot = async (slotId: string) => {
    const next = timetableSlots.filter((slot) => slot.id !== slotId);
    await deleteTimetableSlotFromDb(activeSchool.id, slotId);
    await saveTimetableSlotsToDb(activeSchool.id, next);
    setTimetableSlots(next);
  };

  const handleImportTimetableSlots = async (importedSlots: TimetableSlot[]) => {
    if (importedSlots.length === 0) return;
    const normalized = importedSlots.map((slot) => ({
      ...slot,
      schoolId: activeSchool.id,
      academicYear: slot.academicYear || timetableAcademicYear,
      semester: slot.semester || timetableSemester,
    }));
    const next = [...normalized, ...timetableSlots];
    if (!isDemoMode) {
      await saveTimetableSlotsToDb(activeSchool.id, next);
    }
    setTimetableSlots(next);
    setDataSyncError(null);
  };

  const handleSaveSchoolPeriods = async (periods: SchoolPeriodTime[]) => {
    if (!currentUser) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกเวลาเรียน');
    const retainedPeriodNumbers = new Set(periods.map((period) => period.periodNumber));
    const removedPeriodNumbers = new Set(
      schoolPeriods
        .filter((period) => !retainedPeriodNumbers.has(period.periodNumber))
        .map((period) => period.periodNumber)
    );
    const activeTermSlots = timetableSlots.filter((slot) => (
      (!slot.schoolId || slot.schoolId === activeSchool.id) &&
      (slot.academicYear || timetableAcademicYear) === timetableAcademicYear &&
      (slot.semester || timetableSemester) === timetableSemester
    ));
    const scheduledSlotsInRemovedPeriods = activeTermSlots.filter((slot) => removedPeriodNumbers.has(slot.periodNumber));
    if (scheduledSlotsInRemovedPeriods.length > 0) {
      const periodNumbers = [...new Set(scheduledSlotsInRemovedPeriods.map((slot) => slot.periodNumber))].join(', ');
      throw new Error(`ลบคาบที่ ${periodNumbers} ไม่ได้ เพราะยังมีตารางสอนใช้อยู่ ${scheduledSlotsInRemovedPeriods.length} รายการ`);
    }
    const updatedActiveTermSlots = activeTermSlots.map((slot) => {
      const period = periods.find((item) => item.periodNumber === slot.periodNumber);
      return period
        ? {
          ...slot,
          schoolId: activeSchool.id,
          academicYear: slot.academicYear || timetableAcademicYear,
          semester: slot.semester || timetableSemester,
          startTime: period.startTime,
          endTime: period.endTime,
        }
        : slot;
    });
    if (!isDemoMode) {
      await saveSchoolPeriodTimes(activeSchool.id, periods);
      if (updatedActiveTermSlots.length > 0) {
        await saveTimetableSlotsToDb(activeSchool.id, updatedActiveTermSlots);
      }
    }
    setSchoolPeriods(periods);
    const updatedSlotsById = new Map(updatedActiveTermSlots.map((slot) => [slot.id, slot]));
    setTimetableSlots((prev) => prev.map((slot) => updatedSlotsById.get(slot.id) || slot));
    setDataSyncError(null);
  };

  const handleAddBehaviorRecord = (record: BehaviorRecord) => {
    const taggedRecord = { ...record, schoolId: activeSchool.id };
    setBehaviorRecords((prev) => [taggedRecord, ...prev]);
    if (activeSchool.id && !isDemoMode) {
      void saveSchoolStudentRecord({
        schoolId: activeSchool.id,
        recordKind: 'behavior',
        recordId: record.id,
        studentId: record.studentId,
        record: taggedRecord,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      });
    }
  };

  const handleAddSdqAssessment = (sdq: SdqAssessment) => {
    const taggedAssessment = { ...sdq, schoolId: activeSchool.id };
    setSdqAssessments((prev) => [taggedAssessment, ...prev]);
    if (activeSchool.id && !isDemoMode) {
      void saveSchoolStudentRecord({
        schoolId: activeSchool.id,
        recordKind: 'sdq',
        recordId: sdq.id,
        studentId: sdq.studentId,
        ownerUserId: currentUser?.id,
        record: taggedAssessment,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      });
    }
  };

  const handleAddInfirmaryVisit = (visit: InfirmaryVisit) => {
    const taggedVisit = { ...visit, schoolId: activeSchool.id };
    setInfirmaryVisits((prev) => [taggedVisit, ...prev]);
    if (activeSchool.id && !isDemoMode) {
      void saveSchoolStudentRecord({
        schoolId: activeSchool.id,
        recordKind: 'infirmary',
        recordId: visit.id,
        studentId: visit.studentId,
        record: taggedVisit,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
        enqueueOfflineAction({
          actionType: 'health_visit',
          userId: currentUser?.id || '',
          schoolId: activeSchool.id,
          description: `ห้องพยาบาลรอซิงค์: ${taggedVisit.studentName}`,
          payload: taggedVisit,
        });
      });
    }
  };

  const handleAddHomeworkAssignment = async (assignment: Assignment) => {
    if (!['teacher', 'admin', 'super_admin'].includes(currentRole)) {
      throw new Error('You do not have permission to create assignments.');
    }
    if (currentRole === 'teacher' && schoolPermissions.teacher_homework === false) {
      throw new Error('Homework management is disabled for teachers by the school.');
    }
    const course = schoolCourses.find((item) => item.id === assignment.courseId);
    if (!course) throw new Error('Select a course from this school before creating an assignment.');
    const taggedAssignment: Assignment = {
      ...assignment,
      schoolId: activeSchool.id,
      courseCode: course.code,
    };
    if (!isDemoMode) {
      await saveSchoolAssignmentToDb(activeSchool.id, taggedAssignment, currentUser?.id);
    }
    setAssignments((prev) => [taggedAssignment, ...prev.filter((item) => item.id !== taggedAssignment.id)]);
  };

  const handleAddHomeworkSubmission = async (sub: HomeworkSubmission) => {
    if (currentUser?.role !== 'student') throw new Error('Only students can submit an assignment.');
    if (schoolPermissions.student_submit_homework === false) {
      throw new Error('Online homework submission is disabled by the school.');
    }
    const linkedStudentIds = resolveLinkedStudentsForUser(currentUser, schoolStudents).map((student) => student.id);
    if (!linkedStudentIds.includes(sub.studentId) && currentUser.studentRecordId !== sub.studentId) {
      throw new Error('You can only submit work for your own student account.');
    }
    const assignment = schoolAssignments.find((item) => item.id === sub.assignmentId);
    const student = schoolStudents.find((item) => item.id === sub.studentId);
    if (!assignment || assignment.status !== 'active') throw new Error('The selected assignment is no longer available.');
    const enrolledCourseIds = new Set(
      filterCoursesForPersonalRole(schoolCourses, currentUser, schoolStudents).map((course) => course.id)
    );
    if (!enrolledCourseIds.has(assignment.courseId)) {
      throw new Error('This assignment is not available for your enrolled courses.');
    }
    if (!student) throw new Error('The selected student is not in this school roster.');
    const taggedSubmission: HomeworkSubmission = {
      ...sub,
      schoolId: activeSchool.id,
      assignmentTitle: assignment.titleTh,
      courseCode: assignment.courseCode || '',
      dueDate: assignment.dueDate,
      maxScore: assignment.maxScore ?? assignment.points,
    };
    if (!isDemoMode) {
      await saveHomeworkSubmissionToDb(activeSchool.id, taggedSubmission);
    }
    setHomeworkSubmissions((prev) => [taggedSubmission, ...prev]);
    setAssignments((prev) => prev.map((item) => (
      item.id === assignment.id
        ? { ...item, submittedStudentIds: Array.from(new Set([...(item.submittedStudentIds || []), student.id])) }
        : item
    )));
  };

  const handleGradeHomeworkSubmission = async (id: string, score: number, feedback: string) => {
    if (!['teacher', 'admin', 'super_admin'].includes(currentRole)) {
      throw new Error('You do not have permission to grade assignments.');
    }
    if (currentRole === 'teacher' && schoolPermissions.teacher_homework === false) {
      throw new Error('Homework grading is disabled for teachers by the school.');
    }
    const submission = schoolHomeworkSubmissions.find((item) => item.id === id);
    if (!submission) throw new Error('Homework submission not found.');
    if (!Number.isFinite(score) || score < 0 || score > submission.maxScore) {
      throw new Error(`Score must be between 0 and ${submission.maxScore}.`);
    }
    const gradedBy = currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email || 'ครูผู้สอน';
    if (!isDemoMode) {
      await saveHomeworkGradeToDb(activeSchool.id, id, score, feedback, gradedBy);
    }
    setHomeworkSubmissions((prev) =>
      prev.map((item) => item.id === id
        ? { ...item, score, teacherFeedback: feedback, gradedAt: new Date().toISOString(), gradedBy, status: 'graded' }
        : item)
    );
  };

  const handleNotifyGradeChange = async (grade: GradeRecord, isNewRecord = false) => {
    const student = schoolStudents.find((s) => s.id === grade.studentId);
    if (!student) return;
    const course = schoolCourses.find((c) => c.id === grade.courseId);
    return dispatchGradeAlert({
      student,
      course,
      grade,
      systemConfig,
      schoolId: activeSchool.id,
      isNewRecord,
      isDemoMode,
      actorName: currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email,
    });
  };

  const handleAddGrade = (newGrade: GradeRecord, options?: { notify?: boolean }) => {
    const created: GradeRecord = {
      ...newGrade,
      id: newGrade.id || `grd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      schoolId: activeSchool.id,
    };
    setGrades((prev) => {
      const existingIdx = prev.findIndex(
        (g) => (g.schoolId === activeSchool.id || !g.schoolId) && g.studentId === created.studentId && g.courseId === created.courseId
      );
      const next = existingIdx >= 0
        ? prev.map((g, idx) => (idx === existingIdx ? { ...g, ...created, id: g.id } : g))
        : [...prev, created];
      syncStudentGpaFromGrades(next, new Set([created.studentId]));
      return next;
    });
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'grade_update',
        targetLabel: created.studentId,
        details: `บันทึกคะแนนรายวิชาใหม่ (คะแนนรวม ${created.totalScore})`,
      });
    }
    if (options?.notify !== false) {
      void handleNotifyGradeChange(created, true);
    }
  };

  const handleUpdateGrade = (gradeId: string, updates: Partial<GradeRecord>) => {
    setGrades((prev) => {
      let affectedStudentId: string | undefined;
      const next = prev.map((g) => {
        if (g.id !== gradeId) return g;
        affectedStudentId = g.studentId;
        return { ...g, ...updates };
      });
      if (affectedStudentId) {
        syncStudentGpaFromGrades(next, new Set([affectedStudentId]));
      }
      return next;
    });
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'grade_update',
        targetLabel: gradeId,
        details: `แก้ไขคะแนน (คะแนนรวม ${updates.totalScore ?? '-'})`,
      });
    }
  };

  const handleDeleteGrade = async (gradeId: string) => {
    const target = grades.find((g) => g.id === gradeId);
    if (!isDemoMode) {
      await deleteStaleGradesFromDb(activeSchool.id, [gradeId]);
    }
    setGrades((prev) => {
      const next = prev.filter((g) => g.id !== gradeId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`eduverse_grades_${activeSchool.id}`, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
      }
      if (target?.studentId) {
        syncStudentGpaFromGrades(next, new Set([target.studentId]));
      }
      return next;
    });
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'grade_update',
        targetLabel: target?.studentId || gradeId,
        details: `ลบรายการคะแนนรายวิชา (${target?.courseId || gradeId})`,
      });
    }
  };

  const handleSyncQuizScoresToGradebook = (
    courseId: string,
    packTitle: string,
    entries: { studentId: string; quizScore: number }[]
  ) => {
    if (entries.length === 0) return;
    const syncedRecords: { grade: GradeRecord; isNewRecord: boolean }[] = [];
    setGrades((prev) => {
      const next = [...prev];
      const affectedIds = new Set<string>();
      for (const entry of entries) {
        affectedIds.add(entry.studentId);
        const idx = next.findIndex(
          (g) => (g.schoolId === activeSchool.id || !g.schoolId) && g.courseId === courseId && g.studentId === entry.studentId
        );
        if (idx >= 0) {
          const existing = next[idx];
          const totalScore = Math.min(
            100,
            (existing.midtermScore || 0) +
              (existing.finalScore || 0) +
              (existing.assignmentScore || 0) +
              entry.quizScore
          );
          const preserveSpecial = isSpecialMoeGrade(existing.letterGrade);
          const graded = calculateGrade(totalScore, systemConfig.gradingSystem);
          const updatedRecord: GradeRecord = {
            ...existing,
            quizScore: entry.quizScore,
            totalScore,
            letterGrade: preserveSpecial ? existing.letterGrade : graded.letter,
            gradePoint: preserveSpecial ? 0 : graded.point,
          };
          next[idx] = updatedRecord;
          syncedRecords.push({ grade: updatedRecord, isNewRecord: false });
        } else {
          const totalScore = Math.min(100, entry.quizScore);
          const graded = calculateGrade(totalScore, systemConfig.gradingSystem);
          const createdRecord: GradeRecord = {
            id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            schoolId: activeSchool.id,
            studentId: entry.studentId,
            courseId,
            academicYear: systemConfig.academicYear || activeSchool.academicYear || '2568',
            semester: systemConfig.currentSemester || activeSchool.currentSemester || '1',
            midtermScore: 0,
            finalScore: 0,
            assignmentScore: 0,
            quizScore: entry.quizScore,
            totalScore,
            letterGrade: graded.letter,
            gradePoint: graded.point,
          };
          next.push(createdRecord);
          syncedRecords.push({ grade: createdRecord, isNewRecord: true });
        }
      }
      syncStudentGpaFromGrades(next, affectedIds);
      return next;
    });
    if (currentUser) {
      appendAuditLog(activeSchool.id, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'quiz_grade_sync',
        targetLabel: courseId,
        details: `นำเข้าคะแนน Quiz จาก "${packTitle}" เข้าสมุดคะแนน ${entries.length} คน`,
      });
    }
    if (syncedRecords.length > 0) {
      if (syncedRecords.length <= 10) {
        syncedRecords.forEach(({ grade, isNewRecord }) => {
          void handleNotifyGradeChange(grade, isNewRecord);
        });
      } else {
        const course = schoolCourses.find((c) => c.id === courseId);
        void sendEduVerseNotification({
          title: `📊 ซิงค์คะแนน Quiz "${packTitle}" (${syncedRecords.length} คน)`,
          body: `อัปเดตคะแนนรายวิชา ${course?.code || courseId} ${course?.titleTh || ''} และแจ้งเตือนนักเรียนและผู้ปกครองแล้ว`,
          category: 'homework',
          priority: 'normal',
          tag: `quiz-sync-${courseId}-${Date.now()}`,
          schoolId: activeSchool.id,
          targetStudentIds: Array.from(new Set(syncedRecords.map((r) => r.grade.studentId))),
          targetRoles: ['student', 'parent', 'teacher', 'admin', 'super_admin'],
          metadata: {
            alertType: 'grade_update',
            courseId,
            count: syncedRecords.length,
            targetAudience: ['student', 'parent'],
          },
        });
      }
    }
  };

  const handleSyncOfflineItem = async (item: OfflineQueueItem): Promise<boolean> => {
    try {
      const payload = item.payload as Record<string, any> | null;
      if (!payload) {
        setDataSyncError('ไม่พบข้อมูลของรายการที่ค้างอยู่ในคิวออฟไลน์');
        return false;
      }
      if (item.actionType === 'attendance' && payload.studentId) {
        const extra = (payload.extra || {}) as Parameters<typeof handleRecordAttendance>[4];
        const createdAt = new Date(item.createdAt);
        const date = extra?.date || createdAt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
        const time = createdAt.toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });
        const status = (payload.status as AttendanceStatus) || 'present';
        const checkinMethod = (payload.method as AttendanceRecord['checkinMethod']) || 'qr_scanner';
        const remarks = String(payload.remarks || 'ซิงก์จากโหมดออฟไลน์');
        const recordType = extra?.recordType || 'check_in';
        const userName = extra?.userName || extra?.recordedBy || currentUser?.fullNameTh || '';
        await saveQueuedAttendanceToDb({
          id: item.id,
          schoolId: item.schoolId,
          studentId: String(payload.studentId),
          date,
          time,
          status,
          checkinMethod,
          remarks,
          recordType,
          userName,
        });
        // The queued row is already persisted. Avoid triggering the broad
        // school snapshot upsert effect just to reflect it in the UI.
        skipNextOfflineRowSyncRef.current = ['super_admin', 'admin', 'teacher'].includes(currentUser?.role || '');
        setAttendance((previous) => [
          {
            id: item.id,
            schoolId: item.schoolId,
            studentId: String(payload.studentId),
            date,
            time,
            status,
            checkinMethod,
            remarks,
            recordType,
            userName,
            lineNotificationSent: false,
          },
          ...previous.filter((record) => record.id !== item.id),
        ]);
        return true;
      }
      if (item.actionType === 'health_visit') {
        const visit = payload as unknown as InfirmaryVisit;
        await saveSchoolStudentRecord({
          schoolId: item.schoolId,
          recordKind: 'infirmary',
          recordId: visit.id,
          studentId: visit.studentId,
          ownerUserId: currentUser?.id,
          record: { ...visit, schoolId: item.schoolId },
        });
        setInfirmaryVisits((previous) => [
          { ...visit, schoolId: item.schoolId },
          ...previous.filter((record) => record.id !== visit.id),
        ]);
        void sendEduVerseNotification({
          title: 'ซิงค์ข้อมูลห้องพยาบาลแล้ว',
          body: 'นำเข้ารายการห้องพยาบาลจากโหมดออฟไลน์สำเร็จ',
          category: 'system',
          tag: `offline-health-${Date.now()}`,
          schoolId: activeSchool.id,
          targetRoles: ['teacher', 'admin', 'super_admin'],
        });
        return true;
      }
      setDataSyncError('ชนิดข้อมูลออฟไลน์นี้ยังไม่สามารถซิงค์อัตโนมัติได้');
      return false;
    } catch {
      setDataSyncError('เกิดข้อผิดพลาดระหว่างส่งข้อมูลคิวออฟไลน์ขึ้นระบบ');
      return false;
    }
  };

  // Application data is shown only after a real Supabase account is authenticated.
  if (!currentUser) {
    return (
      <AuthLayout
        onLogin={handleLogin}
        initialError={dataLoadError}
        isPasswordRecovery={isPasswordRecovery}
        onPasswordResetComplete={() => setIsPasswordRecovery(false)}
        lang={lang}
        setLang={setLang}
        themePalette={themePalette}
        setThemePalette={setThemePalette}
        activeSchools={schools}
      />
    );
  }

  if (isBiometricLocked) {
    const enrolledPk = getPasskeyForUser(currentUser.id);
    return (
      <main className="h-dvh overflow-hidden flex items-center justify-center bg-[var(--color-canvas)] p-5 text-[var(--color-text-body)]">
        <div className="max-w-sm w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-[var(--color-text-title)]">
              {lang === 'th' ? 'ล็อกหน้าจอด้วย FaceID / TouchID' : 'Biometric Lock Screen'}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {currentUser.fullNameTh || currentUser.fullNameEn} · {activeSchool.nameTh}
            </p>
          </div>

          {biometricLockError && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs text-left">
              {biometricLockError}
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={isUnlockingBiometrics || !enrolledPk}
              onClick={handleUnlockBiometricScreen}
              className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Fingerprint className="w-4.5 h-4.5" />
              <span>
                {isUnlockingBiometrics
                  ? (lang === 'th' ? 'กำลังสแกนไบโอเมตริกซ์...' : 'Verifying Biometrics...')
                  : (lang === 'th' ? `ปลดล็อกด้วย ${enrolledPk?.deviceLabel || 'FaceID / TouchID'}` : 'Unlock with FaceID / TouchID')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[var(--color-text-body)] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'ออกจากระบบ / สลับบัญชี' : 'Sign Out / Switch Account'}</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!isDataReady || loadedSchoolId !== activeSchool.id) {
    if (dataLoadError) {
      return (
        <main className="h-dvh overflow-hidden flex items-center justify-center bg-[var(--color-canvas)] p-6 text-[var(--color-text-body)]">
          <div className="max-w-lg space-y-4 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
            <h1 className="text-xl font-bold text-[var(--color-text-title)]">
              โหลดข้อมูลโรงเรียนไม่สำเร็จ
            </h1>
            <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 rounded-lg px-3 py-2">
              {dataLoadError}
            </p>
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 text-sm font-semibold transition cursor-pointer">
              ลองใหม่
            </button>
          </div>
        </main>
      );
    }
    return (
      <main className="h-dvh overflow-hidden bg-[var(--color-canvas)] p-4 sm:p-6 text-[var(--color-text-body)]">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="skeleton-shimmer h-8 w-44 rounded-lg" />
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
              <div className="skeleton-shimmer h-8 w-8 rounded-full" />
            </div>
          </div>
          <PageSkeleton rows={7} />
        </div>
      </main>
    );
  }

  // Strict Student & Parent Personal Scoping Boundary (uses earlier scoped boundary)
  const scopedStudentIdSet = new Set<string>(ownStudentIds);
  const viewStudents = isRestrictedViewer
    ? linkedStudentsForUser
    : currentRole === 'teacher' ? teacherScopedStudents : schoolStudents;
  const viewTeachers = isRestrictedViewer
    ? []
    : currentRole === 'teacher' ? (matchedTeacherForScope ? [matchedTeacherForScope] : []) : schoolTeachers;
  const viewCourses = currentRole === 'teacher'
    ? teacherScopedCourses
    : filterCoursesForPersonalRole(schoolCourses, currentUser, schoolStudents);
  const viewAssignments = currentRole === 'teacher'
    ? schoolAssignments.filter((assignment) => teacherCourseIds.has(assignment.courseId))
    : filterAssignmentsForPersonalRole(schoolAssignments, viewCourses, currentUser);
  const viewLessons = isRestrictedViewer
    ? schoolLessons.filter((lesson) => viewCourses.some((course) => course.id === lesson.courseId))
    : currentRole === 'teacher'
      ? schoolLessons.filter((lesson) => teacherCourseIds.has(lesson.courseId))
      : schoolLessons;
  const viewTimetableSlots = currentRole === 'teacher'
    ? teacherScopedTimetableSlots.filter((slot) => slot.academicYear === timetableAcademicYear && slot.semester === timetableSemester)
    : filterTimetableSlotsForPersonalRole(schoolTimetableSlots, currentUser, schoolStudents, schoolCourses);
  const viewTimetableSlotsAllTerms = currentRole === 'teacher'
    ? teacherScopedTimetableSlots
    : filterTimetableSlotsForPersonalRole(schoolTimetableSlotsAllTerms, currentUser, schoolStudents, schoolCourses);
  const viewAttendance = isRestrictedViewer
    ? filterAttendanceForUser(schoolAttendance, currentUser, schoolStudents)
    : currentRole === 'teacher'
      ? schoolAttendance.filter((record) => teacherStudentIds.has(record.studentId))
      : schoolAttendance;
  const viewPeriodAttendance = isRestrictedViewer
    ? filterPeriodAttendanceForUser(schoolPeriodAttendance, currentUser, schoolStudents)
    : currentRole === 'teacher'
      ? schoolPeriodAttendance.filter((record) => teacherStudentIds.has(record.studentId) && teacherCourseIds.has(record.courseId))
      : schoolPeriodAttendance;
  const viewLeaveRequests = isRestrictedViewer
    ? filterLeaveRequestsForUser(schoolLeaveRequests, currentUser, schoolStudents)
    : currentRole === 'teacher'
      ? schoolLeaveRequests.filter((request) => request.userRole === 'teacher' && request.userId === currentUser?.id)
      : schoolLeaveRequests;
  const viewGrades = isRestrictedViewer
    ? schoolGrades.filter((g) => scopedStudentIdSet.has(g.studentId))
    : currentRole === 'teacher'
      ? schoolGrades.filter((grade) => teacherStudentIds.has(grade.studentId) && teacherCourseIds.has(grade.courseId))
      : schoolGrades;
  const viewInvoices = isRestrictedViewer
    ? schoolInvoices.filter((inv) => scopedStudentIdSet.has(inv.studentId))
    : schoolInvoices;
  const viewHomeworkSubmissions = isRestrictedViewer
    ? schoolHomeworkSubmissions.filter((sub) => scopedStudentIdSet.has(sub.studentId))
    : currentRole === 'teacher'
      ? schoolHomeworkSubmissions.filter((sub) =>
          teacherStudentIds.has(sub.studentId) &&
          viewAssignments.some((assignment) => assignment.id === sub.assignmentId)
        )
      : schoolHomeworkSubmissions;
  const viewInfirmaryVisits = isRestrictedViewer
    ? schoolInfirmaryVisits.filter((v) => scopedStudentIdSet.has(v.studentId))
    : currentRole === 'teacher'
      ? schoolInfirmaryVisits.filter((visit) => teacherStudentIds.has(visit.studentId))
      : schoolInfirmaryVisits;
  const viewBehaviorRecords = isRestrictedViewer
    ? schoolBehaviorRecords.filter((b) => scopedStudentIdSet.has(b.studentId))
    : currentRole === 'teacher'
      ? schoolBehaviorRecords.filter((record) => teacherStudentIds.has(record.studentId))
      : schoolBehaviorRecords;
  const viewSdqAssessments = isRestrictedViewer
    ? schoolSdqAssessments.filter((s) => scopedStudentIdSet.has(s.studentId))
    : currentRole === 'teacher'
      ? schoolSdqAssessments.filter((assessment) => teacherStudentIds.has(assessment.studentId))
      : schoolSdqAssessments;
  const viewPortfolioItems = isRestrictedViewer
    ? schoolPortfolioItems.filter((p) => p.ownerId === currentUser?.id || scopedStudentIdSet.has(p.ownerId))
    : schoolPortfolioItems;
  const canEditGradesInSchool =
    ['super_admin', 'admin'].includes(currentRole) ||
    (currentRole === 'teacher' && schoolPermissions.teacher_grade_entry !== false);

  // Responsive: If on mobile screen (or user opted into mobile view), render the clean, uncluttered MobileAppShell
  if (shouldShowMobileView) {
    return (
      <div className="h-dvh overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-body)] font-sans">
        <ViewErrorBoundary resetKey={`mobile-shell:${activeSchool.id}`} lang={lang} viewName="MobileAppShell">
        <Suspense fallback={<div className="p-4"><PageSkeleton compact rows={5} /></div>}>
        <MobileAppShell
          currentUser={currentUser}
          activeSchool={activeSchool}
          currentRole={currentRole}
          lang={lang}
          setLang={setLang}
          themePalette={themePalette}
          setThemePalette={setThemePalette}
          onLogout={handleLogout}
          onSwitchToDesktopMode={() => setDeviceViewPreference('desktop')}
          onOpenProfileModal={() => setShowProfileModal(true)}
          onOpenOnboardingTutor={() => setShowOnboardingTutorModal(true)}
          unreadCount={unreadNotifCount}
          onOpenNotifications={() => setShowNotificationModal(true)}
          students={viewStudents}
          teachers={viewTeachers}
          courses={viewCourses}
          grades={viewGrades}
          invoices={viewInvoices}
          infirmaryVisits={viewInfirmaryVisits}
          behaviorRecords={viewBehaviorRecords}
          sdqAssessments={viewSdqAssessments}
          attendance={viewAttendance}
          periodAttendance={viewPeriodAttendance}
          leaveRequests={viewLeaveRequests}
          assignments={viewAssignments}
          homeworkSubmissions={viewHomeworkSubmissions}
          announcements={viewAnnouncements}
          questions={schoolQuestions}
          playerScores={playerScores}
          rewardItems={rewardItems}
          campusGates={campusGates}
          timetableSlots={viewTimetableSlots}
          schoolPeriods={schoolPeriods}
          gradingSystem={systemConfig.gradingSystem}
          schoolPermissions={schoolPermissions}
          featureFlags={activeFeatureFlags}
          onRecordAttendance={handleRecordAttendance}
          onRecordPeriodAttendance={handleRecordPeriodAttendance}
          onAddLeaveRequest={handleAddLeaveRequest}
          onUpdateLeaveStatus={handleUpdateLeaveStatus}
          onEarnRewards={handleEarnRewards}
          onRedeemReward={handleRedeemReward}
          onAddQuestion={handleAddQuestion}
          onImportQuestions={handleImportQuestions}
          onUpdateStudent={currentRole === 'teacher' ? undefined : handleUpdateStudent}
          onUpdateTeacher={currentRole === 'teacher' ? undefined : handleUpdateTeacher}
          onUpdateGrade={handleUpdateGrade}
          onAddGrade={handleAddGrade}
          schools={currentRole === 'super_admin' ? schools : (activeSchool.id ? [activeSchool] : [])}
          isDemoMode={isDemoMode}
          coordinationUnreadCount={coordinationUnreadCount}
          onOpenSchoolSwitcher={currentRole === 'super_admin' ? () => setShowSchoolSwitcher(true) : undefined}
          onUpdateSchool={currentRole === 'teacher' ? undefined : handleUpdateSchool}
          onAddAnnouncement={handleAddAnnouncement}
          onApproveInvoiceSlip={handleApproveInvoiceSlip}
          onRejectInvoiceSlip={handleRejectInvoiceSlip}
          onViewSchool={handleViewSchool}
          onToggleSchoolStatus={handleToggleSchoolStatus}
          onUpdateSchoolFeatureFlags={handleUpdateSchoolFeatureFlags}
          onJumpToDesktopTab={(tab) => {
            setDeviceViewPreference('desktop');
            setProgramMode('school_erp');
            navigateToAppTab(tab);
          }}
          initialMobileTab={(timetableCheckinTarget || deepLinkParams) ? 'checkin' : 'home'}
          initialAttendanceSubTab={timetableCheckinTarget ? 'period_checkin' : (deepLinkParams?.subTab || 'selfie_mobile')}
          initialPeriodCourseId={timetableCheckinTarget?.courseId ?? deepLinkParams?.courseId}
          initialPeriodNumber={timetableCheckinTarget?.periodNumber ?? deepLinkParams?.periodNumber}
          initialPeriodDate={timetableCheckinTarget?.date ?? deepLinkParams?.date}
          initialPeriodCode={timetableCheckinTarget?.courseCode ?? deepLinkParams?.code}
          initialPeriodCheckType={timetableCheckinTarget?.checkType ?? deepLinkParams?.checkType}
          onBiometricLock={handleLockWithBiometrics}
          portfolioItems={viewPortfolioItems}
          onAddPortfolioItem={handleAddPortfolioItem}
          onDeletePortfolioItem={handleDeletePortfolioItem}
          onUpdateCampusGates={['admin', 'super_admin'].includes(currentRole) ? handleUpdateCampusGates : undefined}
          onSaveCampusGates={['admin', 'super_admin'].includes(currentRole) ? handleSaveCampusGates : undefined}
          onUpdateSchoolCoordinates={['admin', 'super_admin'].includes(currentRole) ? handleUpdateSchoolCoordinates : undefined}
          rewardRedemptions={rewardRedemptions}
          onEquipCosmetic={handleEquipCosmetic}
          onReviewRedemption={handleReviewRedemption}
          onCreateCustomReward={handleCreateCustomReward}
        />

        {/* Modals for Mobile View */}
        {selectedStudentForReport && (
          <ReportCardModal
            student={selectedStudentForReport}
            courses={viewCourses}
            grades={viewGrades}
            systemConfig={systemConfig}
            onClose={() => setSelectedStudentForReport(null)}
          />
        )}

        {selectedStudentForProfile && (
          <StudentDetailModal
            student={selectedStudentForProfile}
            courses={viewCourses}
            grades={viewGrades}
            attendance={viewAttendance}
            onClose={() => setSelectedStudentForProfile(null)}
            onLoadAttendanceHistory={loadAttendanceHistory}
            onOpenReportCard={(stu) => {
              setSelectedStudentForProfile(null);
              setSelectedStudentForReport(stu);
            }}
            onToggleLineSync={currentRole === 'teacher' ? () => undefined : handleToggleLineSync}
            gradingSystem={systemConfig.gradingSystem}
            onUpdateStudent={currentRole === 'teacher' ? undefined : (updated) => {
              handleUpdateStudent(updated);
              setSelectedStudentForProfile(updated);
            }}
          />
        )}

        {showProfileModal && currentUser && (
          <UserProfileModal
            currentUser={currentUser}
            portfolioItems={viewPortfolioItems.filter(p => p.ownerId === currentUser.id || p.ownerRole === currentUser.role)}
            lang={lang}
            onSaveProfile={handleUpdateUserProfile}
            onAddPortfolioItem={handleAddPortfolioItem}
            onDeletePortfolioItem={handleDeletePortfolioItem}
            onClose={() => setShowProfileModal(false)}
          />
        )}

        {showSchoolSwitcher && currentRole === 'super_admin' && (
          <SchoolSwitcherModal
            schools={schools}
            activeSchool={activeSchool}
            onSelectSchool={(school) => {
              setActiveSchool(school);
              setSystemConfig((prev) => ({
                ...prev,
                schoolNameEn: school.nameEn,
                schoolNameTh: school.nameTh,
                academicYear: school.academicYear,
                currentSemester: school.currentSemester,
                semesterOptions: school.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
                gradingSystem: school.gradingSystem || 'thai',
                staffPositionOptions: school.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
              }));
            }}
            onClose={() => setShowSchoolSwitcher(false)}
            lang={lang}
          />
        )}

        {showNotificationModal && currentUser && (
          <NotificationCenterModal
            isOpen={showNotificationModal}
            currentUser={currentUser}
            schoolId={activeSchool.id}
            ownStudentIds={ownStudentIds}
            announcements={viewAnnouncements}
            onUnreadCountChange={setUnreadNotifCount}
            onClose={() => {
              setShowNotificationModal(false);
              if (currentUser.role !== 'parent') {
                setUnreadNotifCount(
                  getScopedUnreadCountForUser({
                    currentUser,
                    schoolId: activeSchool.id,
                    ownStudentIds,
                    announcements: viewAnnouncements,
                    lang,
                  })
                );
              }
            }}
            lang={lang}
          />
        )}

        {showOnboardingTutorModal && (
          <SchoolOnboardingTutorModal
            isOpen={showOnboardingTutorModal}
            onClose={() => setShowOnboardingTutorModal(false)}
            activeSchool={activeSchool}
            studentsCount={schoolStudents.length}
            teachersCount={schoolTeachers.length}
            coursesCount={viewCourses.length}
            lang={lang}
            onNavigateToTab={(tab) => {
              setShowOnboardingTutorModal(false);
              setDeviceViewPreference('desktop');
              navigateToAppTab(tab);
            }}
            onOpenImportExport={(tab) => {
              setShowOnboardingTutorModal(false);
              setDeviceViewPreference('desktop');
              setImportExportInitialTab(tab || 'students');
              setShowImportExportModal(true);
            }}
          />
        )}

        <ConfirmActionModal
          isOpen={Boolean(confirmModal)}
          title={confirmModal?.title || ''}
          description={confirmModal?.description || ''}
          detailNote={confirmModal?.detailNote}
          confirmLabel={confirmModal?.confirmLabel || 'ยืนยัน'}
          tone={confirmModal?.tone || 'danger'}
          isBusy={isConfirmModalBusy}
          onCancel={() => {
            if (!isConfirmModalBusy) setConfirmModal(null);
          }}
          onConfirm={async () => {
            if (!confirmModal) return;
            setIsConfirmModalBusy(true);
            try {
              await confirmModal.onConfirm();
              setConfirmModal(null);
            } catch (error) {
              setDataSyncError(error instanceof Error ? error.message : String(error));
              setConfirmModal(null);
            } finally {
              setIsConfirmModalBusy(false);
            }
          }}
        />

        {/* Offline Status Connectivity Banner */}
        <OfflineIndicator lang={lang} currentUserId={currentUser?.id} onSyncItem={handleSyncOfflineItem} isUsingCachedData={isUsingCachedSchoolData} />
        </Suspense>
        </ViewErrorBoundary>
      </div>
    );
  }

  return (
    <GuideTourProvider
      currentRole={currentRole}
      currentTab={programMode === 'lms_classroom' ? 'lms_classroom' : programMode === 'parent_portal' ? 'parent_portal' : currentTab}
      lang={lang}
      isGuideEnabled={isGuideTourEnabled}
      onSetGuideEnabled={(next) => handleToggleGuideTour(next)}
      onNavigateToTourTarget={({ moduleId, settingsTab }) => {
        if (moduleId === 'lms_classroom' || moduleId === 'lms') {
          handleChangeProgramMode('lms_classroom');
          return;
        }
        if (moduleId === 'parent_portal') {
          handleChangeProgramMode('parent_portal');
          return;
        }
        handleChangeProgramMode('school_erp');
        if (moduleId === 'system_settings' && settingsTab) {
          setSystemSettingsInitialTab(settingsTab as SystemSettingsTab);
        }
        navigateToAppTab(moduleId as NavTab);
      }}
    >
    <div className={`${useImmersiveGameLayout ? 'game-immersive-root' : ''} h-dvh max-h-dvh w-full overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-body)] flex flex-col font-sans transition-colors duration-200`}>
      {useImmersiveGameLayout && isPortraitScreen && (
        <div className="fixed top-3 left-1/2 z-[60] -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/85 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md">
            <RotateCw className="h-4 w-4 shrink-0 rotate-90 text-amber-300" />
            <span>{lang === 'th' ? 'หมุนจอแนวนอนเพื่อเห็นพื้นที่เกมมากขึ้น' : 'Rotate to landscape for a wider game view'}</span>
          </div>
        </div>
      )}
      {/* Single Sticky Top Banner when viewing Desktop View on Mobile Screen */}
      {isMobileInDesktopView && (
        <div className="sticky top-0 z-50 bg-[var(--color-primary)] text-white px-3 py-1.5 text-xs flex items-center justify-between gap-2 shrink-0">
            <span className="font-medium truncate">
            {lang === 'th' ? 'โหมดคอมพิวเตอร์ · ปรับตามความกว้างหน้าจอ' : 'Desktop View · Responsive layout'}
          </span>
          <button
            type="button"
            onClick={() => setDeviceViewPreference('mobile')}
            className="px-2.5 py-1 bg-white text-[var(--color-primary)] hover:bg-slate-100 font-semibold rounded-lg text-[11px] transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            {lang === 'th' ? 'กลับโหมดมือถือ' : 'Mobile View'}
          </button>
        </div>
      )}

      {/* Top Navbar */}
      {!useImmersiveGameLayout && <Navbar
        currentTab={currentTab}
        currentUser={currentUser}
        activeSchool={activeSchool}
        currentRole={currentRole}
        isSuperAdminSchoolView={isSuperAdminSchoolView}
        systemConfig={systemConfig}
        unreadCount={unreadNotifCount}
        onOpenNotifications={() => setShowNotificationModal(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        programMode={programMode}
        setProgramMode={handleChangeProgramMode}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        themePalette={themePalette}
        setThemePalette={setThemePalette}
        onOpenSchoolSwitcher={() => {
          if (currentRole === 'super_admin') setShowSchoolSwitcher(true);
        }}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenGuide={currentRole !== 'super_admin' || isSuperAdminSchoolView ? (roleTab) => {
          setGuideModalInitialRoleView(roleTab);
          setShowGuideModal(true);
        } : undefined}
        onOpenImportExport={(['super_admin', 'admin', 'teacher'].includes(currentRole) && (currentRole !== 'super_admin' || isSuperAdminSchoolView)) ? () => setShowImportExportModal(true) : undefined}
        onOpenOnboardingTutor={() => setShowOnboardingTutorModal(true)}
        onSwitchToMobileMode={() => setDeviceViewPreference('mobile')}
        coordinationUnreadCount={coordinationUnreadCount}
        onOpenCoordinationDesk={['admin', 'super_admin'].includes(currentRole) ? () => navigateToAppTab('admin_superadmin_desk') : undefined}
        onOpenExamPaymentSettings={currentRole === 'super_admin' ? handleOpenExamPaymentSettings : undefined}
        students={viewStudents}
        teachers={isRestrictedViewer ? [] : schoolTeachers}
        courses={viewCourses}
        grades={viewGrades}
        onOpenStudentProfile={setSelectedStudentForProfile}
        onOpenReportCard={setSelectedStudentForReport}
        onNavigateTab={(tab) => {
          handleChangeProgramMode('school_erp');
          navigateToAppTab(tab);
        }}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((prev) => !prev)}
        featureFlags={activeFeatureFlags}
      />}
      {!useImmersiveGameLayout && dataSyncError && (
        <div role="alert" className="ui-alert shrink-0 mx-4 sm:mx-6 mt-2 items-center justify-between" data-state="danger">
          <span className="truncate">{lang === 'th' ? 'ซิงก์ข้อมูลไม่สำเร็จ:' : 'Sync error:'} {dataSyncError}</span>
          <button type="button" onClick={() => setDataSyncError(null)} aria-label="Close error" className="font-bold ml-2 shrink-0 cursor-pointer">✕</button>
        </div>
      )}

      {/* Mobile Drawer Overlay and Sidebar */}
      {!useImmersiveGameLayout && !focusMode && isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative w-64 max-w-[85vw] bg-[var(--color-card)] text-[var(--color-text-body)] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-[var(--color-border)]">
            <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--color-text-title)]">เมนูระบบโรงเรียน (BaanPakKru · บ้านพักครู)</span>
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Sidebar
                currentTab={currentTab}
                setCurrentTab={(tab) => {
                  navigateToAppTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                currentRole={currentRole}
                isSuperAdminSchoolView={isSuperAdminSchoolView}
                activeSettingsSubTab={systemSettingsInitialTab}
                activeDashboardSubTab={dashboardInitialSubTab}
                studentsCount={viewStudents.length}
                teachersCount={schoolTeachers.length}
                coursesCount={viewCourses.length}
                coordinationUnreadCount={coordinationUnreadCount}
                unclaimedCentralPacksCount={unclaimedCentralPacks.length}
                lang={lang}
                featureFlags={activeFeatureFlags}
                schoolPermissions={schoolPermissions}
                adminSimplifiedView={adminSimplifiedView}
                onToggleAdminSimplifiedView={() => setAdminSimplifiedView((prev) => !prev)}
              />
            </div>
          </div>
        </div>
      )}

      <div 
        className={`flex-1 flex min-w-0 min-h-0 ${useImmersiveGameLayout ? 'fixed inset-0 z-50 bg-slate-950 overflow-hidden' : 'overflow-hidden'}`}
      >
        {/* Desktop Left Sidebar only shown in School ERP mode (collapsed completely in Focus Mode) */}
        {!useImmersiveGameLayout && !focusMode && programMode === 'school_erp' && (
          <div className={`${isMobileInDesktopView ? 'flex shrink-0' : 'hidden lg:flex shrink-0'}`}>
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={navigateToAppTab}
              currentRole={currentRole}
              isSuperAdminSchoolView={isSuperAdminSchoolView}
              activeSettingsSubTab={systemSettingsInitialTab}
              activeDashboardSubTab={dashboardInitialSubTab}
              studentsCount={viewStudents.length}
              teachersCount={schoolTeachers.length}
              coursesCount={viewCourses.length}
              coordinationUnreadCount={coordinationUnreadCount}
              unclaimedCentralPacksCount={unclaimedCentralPacks.length}
              lang={lang}
              featureFlags={activeFeatureFlags}
              schoolPermissions={schoolPermissions}
              desktopCollapsed={sidebarIsCollapsed}
              onToggleDesktopCollapse={() => {
                if (isSidebarCompactViewport && !isSidebarCollapsed) {
                  setIsSidebarExpandedForCompactViewport((prev) => !prev);
                } else {
                  setIsSidebarCollapsed((prev) => !prev);
                }
              }}
              adminSimplifiedView={adminSimplifiedView}
              onToggleAdminSimplifiedView={() => setAdminSimplifiedView((prev) => !prev)}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 w-full max-w-full min-w-0 min-h-0 flex flex-col ${useImmersiveGameLayout ? 'p-0 overflow-hidden' : `app-workspace ${getModuleTone(currentTab)} p-2.5 sm:p-3.5 lg:p-4 pb-20 md:pb-5 overflow-y-auto`}`}>
          <div className={`${useImmersiveGameLayout ? 'max-w-none h-full' : 'w-full'} min-w-0 flex-1 min-h-0 flex flex-col`}>
            {!useImmersiveGameLayout && focusMode && (
              <FocusToolbar
                currentTab={currentTab}
                programMode={programMode}
                currentRole={currentRole}
                lang={lang}
                featureFlags={activeFeatureFlags}
                schoolPermissions={schoolPermissions}
                onNavigateTab={navigateToAppTab}
                onChangeProgramMode={handleChangeProgramMode}
                onExitFocusMode={() => setFocusMode(false)}
                adminSimplifiedView={adminSimplifiedView}
              />
            )}
            {!useImmersiveGameLayout && !focusMode && currentRole === 'super_admin' && isSuperAdminSchoolView && (
              <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1">
                <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-100 truncate">
                  โหมดตรวจสอบรายโรงเรียน: <strong>{activeSchool.nameTh}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToAppTab('super_admin_console')}
                  className="shrink-0 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                >
                  กลับศูนย์ควบคุม
                </button>
              </div>
            )}
            <ViewErrorBoundary
              resetKey={`${programMode}:${currentTab}:${activeSchool.id}`}
              lang={lang}
              viewName={`${programMode}:${currentTab}`}
              onBackHome={() => {
                setProgramMode('school_erp');
                navigateToAppTab('dashboard');
              }}
            >
            <Suspense fallback={<PageSkeleton />}>
            <div key={`${programMode}:${currentTab}`} className="view-stage flex-1 min-h-0 flex flex-col">
            {/* Mode 1: School ERP / SIS */}
            {programMode === 'school_erp' && (
              <>
                {currentTab === 'super_admin_console' && currentRole === 'super_admin' && (
                  <SuperAdminConsoleView
                    schools={schools}
                    onUpdateSchools={setSchools}
                    rolePermissions={rolePermissions}
                    onUpdateRolePermissions={async (next) => {
                      await saveSuperAdminSetting('role_permissions', next);
                      setRolePermissions(next);
                      setSuperAdminConfigError(null);
                    }}
                    promotions={promotions}
                    onUpdatePromotions={async (next) => {
                      await saveSuperAdminSetting('promotions', next);
                      setPromotions(next);
                      setSuperAdminConfigError(null);
                    }}
                    subscriptionPlans={subscriptionPlans}
                    configError={superAdminConfigError}
                    onSavePromoAssignment={async (nextPromotions, nextPlans) => {
                      await saveSuperAdminSettings({
                        promotions: nextPromotions,
                        subscription_plans: nextPlans,
                      });
                      setPromotions(nextPromotions);
                      setSubscriptionPlans(nextPlans);
                      setSuperAdminConfigError(null);
                    }}
                    lang={lang}
                    isDemoMode={isDemoMode}
                    onViewSchool={handleViewSchool}
                    onToggleSchoolStatus={handleToggleSchoolStatus}
                    coordinationUnreadCount={coordinationUnreadCount}
                    onOpenCoordinationDesk={() => navigateToAppTab('admin_superadmin_desk')}
                    onOpenBackupCenter={() => setShowBackupCenterModal(true)}
                    initialSubTab={superAdminSubTab}
                    onUpdateSchoolFeatureFlags={handleUpdateSchoolFeatureFlags}
                  />
                )}

                {currentTab === 'admin_superadmin_desk' && ['admin', 'super_admin'].includes(currentRole) && (
                  <AdminSuperAdminDeskView
                    currentUser={currentUser}
                    activeSchool={activeSchool}
                    schools={schools}
                    currentRole={currentRole}
                    lang={lang}
                    onUnreadCountChange={setCoordinationUnreadCount}
                  />
                )}

                {/* School Admin Only: Unified Settings, GPS & Access Hub */}
                {currentTab === 'system_settings' && ['admin', 'super_admin'].includes(currentRole) && (
                  <SystemSettingsView
                    systemConfig={systemConfig}
                    activeSchool={activeSchool}
                    students={viewStudents}
                    teachers={viewTeachers}
                    courses={viewCourses}
                    grades={viewGrades}
                    attendance={schoolAttendance}
                    timetableSlots={schoolTimetableSlots}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    promotions={promotions}
                    lang={lang}
                    campusGates={campusGates}
                    onUpdateCampusGates={handleUpdateCampusGates}
                    onSaveCampusGates={handleSaveCampusGates}
                    onUpdateSchoolCoordinates={handleUpdateSchoolCoordinates}
                    onUpdateSchool={handleUpdateSchool}
                    onApplyAcademicRollover={handleApplyAcademicRollover}
                    onCopyCoursesToSchool={handleCopyCoursesToSchool}
                    onUpdateConfig={setSystemConfig}
                    featureFlags={activeFeatureFlags}
                    onUpdateFeatureFlags={(flags) => handleUpdateSchoolFeatureFlags(activeSchool.id, flags)}
                    initialTab={systemSettingsInitialTab}
                    onTabChange={setSystemSettingsInitialTab}
                  />
                )}

                {currentTab === 'dashboard' && (
                  <DashboardView
                    students={viewStudents}
                    teachers={viewTeachers}
                    courses={viewCourses}
                    attendance={viewAttendance}
                    grades={viewGrades}
                    playerScores={isRestrictedViewer ? playerScores.filter((p) => p.userId === currentUser?.id) : playerScores}
                    invoices={viewInvoices}
                    announcements={viewAnnouncements}
                    systemConfig={systemConfig}
                    school={activeSchool}
                    currentUser={currentUser}
                    lang={lang}
                    onNavigate={navigateToAppTab}
                    onLoadAttendanceRange={loadAttendanceHistory}
                    onQuickCheckIn={handleQuickCheckIn}
                    onRecordMilestoneActivity={handleRecordMilestoneActivity}
                    unclaimedCentralPacksCount={unclaimedCentralPacks.length}
                    onOpenCentralExamPopup={() => setShowCentralExamPopup(true)}
                    timetableSlots={viewTimetableSlots}
                    leaveRequests={viewLeaveRequests}
                    homeworkSubmissions={viewHomeworkSubmissions}
                    assignments={viewAssignments}
                    lessons={viewLessons}
                    onOpenLmsLesson={(courseId, lessonId) => {
                      setLmsLessonJumpTarget({ courseId, lessonId });
                      handleChangeProgramMode('lms_classroom');
                    }}
                    periodAttendance={viewPeriodAttendance}
                    schoolPeriods={schoolPeriods}
                    behaviorRecords={viewBehaviorRecords}
                    sdqAssessments={viewSdqAssessments}
                    infirmaryVisits={viewInfirmaryVisits}
                    schoolPermissions={schoolPermissions}
                    featureFlags={activeFeatureFlags}
                    campusGates={campusGates}
                    onOpenSystemSettingsTab={(subTab) => {
                      setSystemSettingsInitialTab(subTab);
                      setProgramMode('school_erp');
                      setCurrentTab('system_settings');
                    }}
                    initialSubTab={dashboardInitialSubTab}
                    onSelectStudent={setSelectedStudentForProfile}
                    onOpenGradebookCourse={(courseId) => {
                      setIsGamePlaying(false);
                      setGradebookJumpTarget({ courseId, tab: 'gradebook' });
                      setStudentsSubTab('gradebook');
                      setProgramMode('school_erp');
                      setCurrentTab('students');
                    }}
                    onOpenStudentDevBook={(studentId) => {
                      setIsGamePlaying(false);
                      setDevBookTargetStudentId(studentId);
                      setStudentsTargetStudentId(studentId);
                      setStudentsSubTab('dev_book');
                      setProgramMode('school_erp');
                      setCurrentTab('students');
                    }}
                    onOpenStudentPp6={(studentId) => {
                      setIsGamePlaying(false);
                      setStudentsTargetStudentId(studentId);
                      setStudentsMoeJumpTarget({ mode: 'docs', docView: 'pp6', nonce: Date.now() });
                      setStudentsSubTab('moe_registry');
                      setProgramMode('school_erp');
                      setCurrentTab('students');
                    }}
                    onOpenPp5Summary={() => {
                      setIsGamePlaying(false);
                      setGradebookJumpTarget({ tab: 'pp5_core_summary' });
                      setStudentsSubTab('gradebook');
                      setProgramMode('school_erp');
                      setCurrentTab('students');
                    }}
                    focusMode={focusMode}
                    onToggleFocusMode={() => setFocusMode((prev) => !prev)}
                    adminSimplifiedView={adminSimplifiedView}
                    onToggleAdminSimplifiedView={() => setAdminSimplifiedView((prev) => !prev)}
                  />
                )}

                {currentTab === 'students' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <StudentsView
                    students={viewStudents}
                    teachers={viewTeachers}
                    courses={viewCourses}
                    grades={viewGrades}
                    gradingSystem={systemConfig.gradingSystem}
                    systemConfig={systemConfig}
                    activeSchool={activeSchool}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    attendance={viewAttendance}
                    periodAttendance={viewPeriodAttendance}
                    timetableSlots={viewTimetableSlots}
                    behaviorRecords={viewBehaviorRecords}
                    sdqAssessments={viewSdqAssessments}
                    infirmaryVisits={viewInfirmaryVisits}
                    homeworkSubmissions={viewHomeworkSubmissions}
                    assignments={viewAssignments}
                    canEditGrades={canEditGradesInSchool}
                    lang={lang}
                    onSelectStudent={setSelectedStudentForProfile}
                    onOpenReportCard={setSelectedStudentForReport}
                    onToggleLineSync={currentRole === 'teacher' ? () => undefined : handleToggleLineSync}
                    onAddStudent={currentRole === 'teacher' ? () => undefined : handleAddStudent}
                    onAddStudents={currentRole === 'teacher' ? undefined : handleAddStudents}
                    onUpdateStudent={currentRole === 'teacher' ? undefined : handleUpdateStudent}
                    onUpdateRoomOptions={currentRole === 'teacher' ? undefined : (roomOptions) => handleUpdateSchool({ roomOptions })}
                    onDeleteStudent={currentRole === 'teacher' ? undefined : handleDeleteStudent}
                    onPurgeSampleStudents={currentRole === 'teacher' ? undefined : handlePurgeSampleStudents}
                    onBatchUpdateStudents={currentRole === 'teacher' ? undefined : (updatedList) => {
                      const updateMap = new Map(updatedList.map((s) => [s.id, s]));
                      setStudents((prev) => prev.map((s) => updateMap.get(s.id) || s));
                    }}
                    onOpenImportExport={currentRole === 'teacher' ? undefined : () => {
                      setImportExportInitialTab('students');
                      setShowImportExportModal(true);
                    }}
                    onOpenGradeImportExport={currentRole === 'teacher' ? undefined : () => {
                      setImportExportInitialTab('grades');
                      setShowImportExportModal(true);
                    }}
                    onOpenStudentAccountsSettings={currentRole === 'teacher' ? undefined : () => {
                      setSystemSettingsInitialTab('student_accounts');
                      setProgramMode('school_erp');
                      setCurrentTab('system_settings');
                    }}
                    onChangeGradingSystem={currentRole === 'teacher' ? undefined : (mode) => handleUpdateSchool({ gradingSystem: mode })}
                    onUpdateGrade={handleUpdateGrade}
                    onAddGrade={handleAddGrade}
                    onDeleteGrade={handleDeleteGrade}
                    onNotifyGradeChange={handleNotifyGradeChange}
                    onAddBehaviorRecord={handleAddBehaviorRecord}
                    onPracticeInAi={
                      isTabEnabledByFeatureFlags('socratic_tutor', activeFeatureFlags, currentRole)
                        ? (topic) => {
                            setAdaptivePracticeTopic(topic);
                            navigateToAppTab('socratic_tutor');
                          }
                        : undefined
                    }
                    onOpenBehaviorSdq={() => navigateToAppTab('behavior_sdq')}
                    externalSubTab={studentsSubTab}
                    onSubTabChange={setStudentsSubTab}
                    targetStudentId={studentsTargetStudentId}
                    onTargetStudentChange={setStudentsTargetStudentId}
                    gradebookJumpTarget={gradebookJumpTarget}
                    moeJumpTarget={studentsMoeJumpTarget}
                  />
                )}

                {currentTab === 'teachers' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <TeachersView
                    teachers={viewTeachers}
                    lang={lang}
                    currentRole={currentRole}
                    schoolId={activeSchool.id}
                    onAddTeacher={currentRole === 'teacher' ? () => undefined : handleAddTeacher}
                    onUpdateTeacher={currentRole === 'teacher' ? () => undefined : handleUpdateTeacher}
                    onDeleteTeacher={currentRole === 'teacher' ? () => undefined : handleDeleteTeacher}
                    onPurgeSampleTeachers={currentRole === 'teacher' ? undefined : handlePurgeSampleTeachers}
                    staffPositionOptions={systemConfig.staffPositionOptions}
                    onUpdateStaffPositionOptions={currentRole === 'teacher' ? undefined : (options) => handleUpdateSchool({ staffPositionOptions: options })}
                    academicYear={systemConfig.academicYear}
                    onOpenImportExport={currentRole === 'teacher' ? undefined : () => {
                      setImportExportInitialTab('teachers');
                      setShowImportExportModal(true);
                    }}
                  />
                )}

                {currentTab === 'courses' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <CoursesView
                    courses={viewCourses}
                    students={viewStudents}
                    teachers={viewTeachers}
                    grades={viewGrades}
                    gradingSystem={systemConfig.gradingSystem}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    schoolId={activeSchool.id}
                    onAddCourse={currentRole === 'teacher' ? () => undefined : handleAddCourse}
                    onUpdateCourse={currentRole === 'teacher' ? undefined : handleUpdateCourse}
                    onDeleteCourse={currentRole === 'teacher' ? undefined : handleDeleteCourse}
                    onDeleteCourses={currentRole === 'teacher' ? undefined : handleDeleteCourses}
                    onEnrollStudent={currentRole === 'teacher' ? () => undefined : handleEnrollStudent}
                    onEnrollStudentsBatch={currentRole === 'teacher' ? undefined : handleEnrollStudentsBatch}
                    onUnenrollStudent={currentRole === 'teacher' ? undefined : handleUnenrollStudent}
                    onUnenrollStudentsBatch={currentRole === 'teacher' ? undefined : handleUnenrollStudentsBatch}
                    semesterOptions={systemConfig.semesterOptions}
                    academicYear={systemConfig.academicYear}
                    currentSemester={systemConfig.currentSemester}
                    showPrimaryCourseCredits={activeSchool.showPrimaryCourseCredits ?? false}
                    onOpenImportExport={currentRole === 'teacher' ? undefined : (tab = 'courses') => {
                      setImportExportInitialTab(tab);
                      setShowImportExportModal(true);
                    }}
                  />
                )}

                {currentTab === 'games' && (
                  <EduBattleGameView
                    questions={schoolQuestions}
                    playerScores={playerScores}
                    rewardItems={rewardItems}
                    currentUser={currentUser}
                    lang={lang}
                    initialSubTab={eduBattleInitialSubTab}
                    isMobileMode={shouldShowMobileView}
                    onAddQuestion={handleAddQuestion}
                    onImportQuestions={handleImportQuestions}
                    onEarnRewards={handleEarnRewards}
                    onRedeemReward={handleRedeemReward}
                    rewardRedemptions={rewardRedemptions}
                    onEquipCosmetic={handleEquipCosmetic}
                    onReviewRedemption={handleReviewRedemption}
                    onCreateCustomReward={handleCreateCustomReward}
                    onGamePlayingChange={setIsGamePlaying}
                    onOpenCentralExamHub={() => navigateToAppTab('central_exam_hub')}
                    onOpenCareerQuest={
                      isTabEnabledByFeatureFlags('career_quest', activeFeatureFlags, currentRole)
                        ? () => navigateToAppTab('career_quest')
                        : undefined
                    }
                    onExit={() => {
                      setEduBattleInitialSubTab(undefined);
                      setCurrentTab('dashboard');
                    }}
                  />
                )}

                {currentTab === 'central_exam_hub' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <CentralExamHubView
                    schoolId={activeSchool.id}
                    schoolName={activeSchool.nameTh}
                    currentRole={currentRole}
                    packs={centralExamPacks}
                    entitlements={schoolExamEntitlements}
                    schoolQuestions={schoolQuestions}
                    onClaimFreePack={handleClaimFreeCentralPack}
                    onPurchasePack={handlePurchaseCentralPack}
                    onOpenQuestionBankInEduBattle={() => {
                      setEduBattleInitialSubTab('bank');
                      navigateToAppTab('games');
                    }}
                    onOpenCoordinationDesk={() => navigateToAppTab('admin_superadmin_desk')}
                    courses={viewCourses}
                    teachers={viewTeachers}
                    students={viewStudents}
                    grades={viewGrades}
                    onSyncQuizScoresToGradebook={currentRole === 'teacher' ? undefined : handleSyncQuizScoresToGradebook}
                  />
                )}

                {currentTab === 'study_streak' && (
                  <StudyStreakQuestPassView
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                  />
                )}

                {currentTab === 'boss_raid' && (
                  <CoopBossRaidView
                    questions={schoolQuestions}
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                    onExit={() => setCurrentTab('dashboard')}
                    schoolId={activeSchool.id}
                    currentUser={currentUser}
                    onAwardPortfolioItem={(item) => {
                      handleAddPortfolioItem(item);
                      navigateToAppTab('portfolio');
                    }}
                  />
                )}

                {currentTab === 'socratic_tutor' && (
                  <SocraticTutorView
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                    initialFocusTopic={adaptivePracticeTopic}
                    onClearFocusTopic={() => setAdaptivePracticeTopic(null)}
                  />
                )}

                {currentTab === 'realworld_quests' && (
                  <RealWorldSnapQuestView
                    lang={lang}
                    currentRole={currentRole}
                    schoolId={activeSchool.id}
                    currentUser={currentUser}
                    onAwardPortfolioItem={(item) => {
                      handleAddPortfolioItem(item);
                      navigateToAppTab('portfolio');
                    }}
                  />
                )}

                {currentTab === 'ai_diagnostic' && (
                  <AiDiagnosticLearningView
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                    initialFocusTopic={adaptivePracticeTopic}
                    onPracticeInSocraticTutor={(topic) => {
                      setAdaptivePracticeTopic(topic);
                      navigateToAppTab('socratic_tutor');
                    }}
                  />
                )}

                {currentTab === 'subject_labs' && (
                  <SubjectLabSimulationView
                    currentUserRole={currentUser?.role}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                    lang={lang}
                    onEarnRewards={handleEarnRewards}
                    onBackToGames={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'hall_of_fame' && (
                  <HallOfFame3DView
                    lang={lang}
                    school={activeSchool}
                    students={viewStudents}
                    portfolioItems={viewPortfolioItems}
                    playerScores={playerScores}
                    currentUser={currentUser}
                    onOpenPortfolio={() => setCurrentTab('portfolio')}
                    onExit={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'career_quest' && ['super_admin', 'admin', 'teacher', 'student'].includes(currentRole) && (
                  <CareerQuestView
                    currentUser={currentUser}
                    school={activeSchool}
                    students={viewStudents}
                    courses={viewCourses}
                    grades={viewGrades}
                    attendance={viewAttendance}
                    portfolioItems={viewPortfolioItems}
                    playerScores={playerScores}
                    gradingSystem={systemConfig.gradingSystem}
                    lang={lang}
                    onNavigate={navigateToAppTab}
                    onEarnRewards={handleEarnRewards}
                    onEquipCosmetic={handleEquipCosmetic}
                    onAddPortfolioItem={handleAddPortfolioItem}
                  />
                )}

                {currentTab === 'timetable' && (
                  <TimetableScheduleView
                    slots={viewTimetableSlotsAllTerms}
                    courses={viewCourses}
                    assignments={viewAssignments}
                    teachers={viewTeachers}
                    students={viewStudents}
                    onAddSlot={currentRole === 'teacher' ? async () => undefined : handleAddTimetableSlot}
                    onUpdateSlot={currentRole === 'teacher' ? undefined : handleUpdateTimetableSlot}
                    onDeleteSlot={currentRole === 'teacher' ? async () => undefined : handleDeleteTimetableSlot}
                    onImportSlots={currentRole === 'teacher' ? undefined : handleImportTimetableSlots}
                    schoolPeriods={schoolPeriods}
                    onSaveSchoolPeriods={currentRole === 'teacher' ? async () => undefined : handleSaveSchoolPeriods}
                    lang={lang}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    schoolId={activeSchool.id}
                    schoolName={activeSchool.nameTh}
                    academicYear={timetableAcademicYear}
                    currentSemester={timetableSemester}
                    semesterOptions={systemConfig.semesterOptions}
                    teachingLoadMinPeriods={activeSchool.teachingLoadMinPeriods}
                    teachingLoadMaxPeriods={activeSchool.teachingLoadMaxPeriods}
                    roomOptions={activeSchool.roomOptions}
                    showPrimaryCourseCredits={activeSchool.showPrimaryCourseCredits ?? false}
                    onUpdateRoomOptions={currentRole === 'teacher' ? undefined : (roomOptions) => handleUpdateSchool({ roomOptions })}
                    onUpdateTeachingLoadThresholds={currentRole === 'teacher' ? undefined : (minPeriods, maxPeriods) => handleUpdateSchool({
                      teachingLoadMinPeriods: minPeriods,
                      teachingLoadMaxPeriods: maxPeriods,
                    })}
                    onUpdateAcademicPeriod={currentRole === 'teacher' ? undefined : handleUpdateAcademicPeriod}
                    leaveRequests={viewLeaveRequests}
                    attendance={viewAttendance}
                    periodAttendance={viewPeriodAttendance}
                    onRecordPeriodAttendance={handleRecordPeriodAttendance}
                    canSelfCheckin={
                      currentRole === 'student'
                        ? schoolPermissions.student_self_checkin !== false
                        : currentRole === 'teacher'
                          ? schoolPermissions.teacher_attendance !== false
                          : false
                    }
                    onOpenPeriodCheckin={(params) => {
                      setTimetableCheckinTarget(params);
                      navigateToAppTab('mobile_checkin');
                    }}
                  />
                )}

                {currentTab === 'homework' && (
                  <HomeworkTrackerView
                    submissions={viewHomeworkSubmissions}
                    students={viewStudents}
                    teachers={isRestrictedViewer ? [] : schoolTeachers}
                    courses={viewCourses}
                    assignments={viewAssignments}
                    schoolId={activeSchool.id}
                    schoolName={activeSchool.nameTh}
                    schoolPermissions={schoolPermissions}
                    onCreateAssignment={handleAddHomeworkAssignment}
                    onAddSubmission={handleAddHomeworkSubmission}
                    onGradeSubmission={handleGradeHomeworkSubmission}
                    lang={lang}
                    currentRole={currentRole}
                  />
                )}

                {currentTab === 'attendance' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <AttendanceView
                    students={viewStudents}
                    teachers={viewTeachers}
                    attendance={viewAttendance}
                    leaveRequests={viewLeaveRequests}
                    campusGates={campusGates}
                    activeSchool={activeSchool}
                    currentUser={currentUser}
                    currentRole={currentRole}
                    lang={lang}
                    onRecordAttendance={handleRecordAttendance}
                    onBulkImportAttendance={currentRole === 'teacher' ? undefined : handleBulkImportAttendance}
                    onUpdateLeaveStatus={currentRole === 'teacher' ? undefined : handleUpdateLeaveStatus}
                    onUpdateCampusGates={currentRole === 'teacher' ? undefined : handleUpdateCampusGates}
                    onSaveCampusGates={currentRole === 'teacher' ? undefined : handleSaveCampusGates}
                    onUpdateSchoolCoordinates={currentRole === 'teacher' ? undefined : handleUpdateSchoolCoordinates}
                    courses={viewCourses}
                    schoolPeriods={schoolPeriods}
                    timetableSlots={viewTimetableSlots}
                    periodAttendance={viewPeriodAttendance}
                    onOpenGpsSettings={currentRole === 'teacher' ? undefined : () => {
                      setSystemSettingsInitialTab('school_gps');
                      setProgramMode('school_erp');
                      setCurrentTab('system_settings');
                    }}
                    onLoadAttendanceRange={loadAttendanceHistory}
                  />
                )}

                {currentTab === 'mobile_checkin' && (
                  <MobileAttendanceView
                    students={viewStudents}
                    teachers={viewTeachers}
                    courses={viewCourses}
                    attendance={viewAttendance}
                    periodAttendance={viewPeriodAttendance}
                    currentUser={currentUser}
                    currentRole={currentRole}
                    school={activeSchool}
                    campusGates={campusGates}
                    schoolPeriods={schoolPeriods}
                    leaveRequests={viewLeaveRequests}
                    lang={lang}
                    initialSubTab={timetableCheckinTarget ? 'period_checkin' : (deepLinkParams?.subTab || 'selfie_mobile')}
                    initialPeriodCourseId={timetableCheckinTarget?.courseId ?? deepLinkParams?.courseId}
                    initialPeriodNumber={timetableCheckinTarget?.periodNumber ?? deepLinkParams?.periodNumber}
                    initialPeriodDate={timetableCheckinTarget?.date ?? deepLinkParams?.date}
                    initialPeriodCode={timetableCheckinTarget?.courseCode ?? deepLinkParams?.code}
                    initialPeriodCheckType={timetableCheckinTarget?.checkType ?? deepLinkParams?.checkType}
                    initialPeriodExpiresAt={deepLinkParams?.expiresAt}
                    initialPeriodToken={deepLinkParams?.token}
                    onRecordAttendance={handleRecordAttendance}
                    onRecordPeriodAttendance={handleRecordPeriodAttendance}
                    onAddLeaveRequest={handleAddLeaveRequest}
                    onUpdateLeaveStatus={handleUpdateLeaveStatus}
                    onUpdateCampusGates={['admin', 'super_admin'].includes(currentRole) ? handleUpdateCampusGates : undefined}
                    onSaveCampusGates={['admin', 'super_admin'].includes(currentRole) ? handleSaveCampusGates : undefined}
                    onUpdateSchoolCoordinates={['admin', 'super_admin'].includes(currentRole) ? handleUpdateSchoolCoordinates : undefined}
                  />
                )}

                {currentTab === 'student_id_cards' && (
                  <DigitalIdCardView
                    students={viewStudents}
                    teachers={viewTeachers}
                    school={activeSchool}
                    lang={lang}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    onUpdateStudent={currentRole === 'teacher' ? undefined : handleUpdateStudent}
                    onUpdateTeacher={currentRole === 'teacher' ? undefined : handleUpdateTeacher}
                  />
                )}

                {currentTab === 'behavior_sdq' && hasGlobalRolePermission('manageSdq') && (
                  <BehaviorSdqView
                    students={viewStudents}
                    records={viewBehaviorRecords}
                    sdqList={viewSdqAssessments}
                    onAddBehaviorRecord={handleAddBehaviorRecord}
                    onAddSdqAssessment={handleAddSdqAssessment}
                    lang={lang}
                    currentRole={currentRole}
                    schoolId={activeSchool.id}
                    academicYear={systemConfig.academicYear}
                    currentSemester={systemConfig.currentSemester}
                  />
                )}

                {currentTab === 'infirmary' && hasGlobalRolePermission('viewInfirmary') && (
                  <InfirmaryHealthView
                    visits={viewInfirmaryVisits}
                    students={viewStudents}
                    onAddVisit={handleAddInfirmaryVisit}
                    currentUserId={currentUser?.id || ''}
                    lang={lang}
                    currentRole={currentRole}
                    schoolId={activeSchool.id}
                  />
                )}

                {currentTab === 'portfolio' && (
                  <PortfolioView
                    portfolioItems={viewPortfolioItems}
                    students={viewStudents}
                    teachers={isRestrictedViewer ? [] : schoolTeachers}
                    courses={viewCourses}
                    grades={viewGrades}
                    playerScores={playerScores}
                    school={activeSchool}
                    gradingSystem={systemConfig.gradingSystem}
                    currentUser={currentUser}
                    lang={lang}
                    onAddPortfolioItem={handleAddPortfolioItem}
                    onDeletePortfolioItem={handleDeletePortfolioItem}
                    onOpenProfile={() => setShowProfileModal(true)}
                    academicYear={systemConfig.academicYear}
                  />
                )}

                {currentTab === 'gradebook' && (
                  <GradebookView
                    students={viewStudents}
                    teachers={isRestrictedViewer ? [] : schoolTeachers}
                    courses={viewCourses}
                    grades={viewGrades}
                    systemConfig={systemConfig}
                    school={activeSchool}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    onChangeGradingSystem={currentRole === 'teacher' ? undefined : (mode) => handleUpdateSchool({ gradingSystem: mode })}
                    onUpdateGrade={handleUpdateGrade}
                    onAddGrade={handleAddGrade}
                    onNotifyGradeChange={handleNotifyGradeChange}
                    onOpenReportCard={setSelectedStudentForReport}
                    timetableSlots={viewTimetableSlots}
                    attendance={viewAttendance}
                    periodAttendance={viewPeriodAttendance}
                    behaviorRecords={viewBehaviorRecords}
                    sdqAssessments={viewSdqAssessments}
                    infirmaryVisits={viewInfirmaryVisits}
                    homeworkSubmissions={viewHomeworkSubmissions}
                    assignments={viewAssignments}
                    onUpdateStudent={currentRole === 'teacher' ? undefined : handleUpdateStudent}
                    onAddStudent={currentRole === 'teacher' ? () => undefined : handleAddStudent}
                    onDeleteStudent={currentRole === 'teacher' ? undefined : handleDeleteStudent}
                    onDeleteGrade={handleDeleteGrade}
                    onPracticeInAi={
                      isTabEnabledByFeatureFlags('socratic_tutor', activeFeatureFlags, currentRole)
                        ? (topic) => {
                            setAdaptivePracticeTopic(topic);
                            navigateToAppTab('socratic_tutor');
                          }
                        : undefined
                    }
                    canEditGrades={canEditGradesInSchool}
                    initialCourseId={gradebookJumpTarget?.courseId}
                    initialStudentId={gradebookJumpTarget?.studentId}
                    initialTab={gradebookJumpTarget?.tab}
                    onOpenStudentDevBook={(studentId) => {
                      setIsGamePlaying(false);
                      setDevBookTargetStudentId(studentId);
                      setProgramMode('school_erp');
                      setCurrentTab('student_development_book');
                    }}
                    lang={lang}
                    onOpenImportExport={['super_admin', 'admin', 'teacher'].includes(currentRole) ? () => {
                      setImportExportInitialTab('grades');
                      setShowImportExportModal(true);
                    } : undefined}
                  />
                )}

                {currentTab === 'student_development_book' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <StudentQualityDevelopmentBookView
                    students={viewStudents}
                    courses={viewCourses}
                    grades={viewGrades}
                    attendance={viewAttendance}
                    periodAttendance={viewPeriodAttendance}
                    timetableSlots={viewTimetableSlots}
                    behaviorRecords={viewBehaviorRecords}
                    sdqAssessments={viewSdqAssessments}
                    infirmaryVisits={viewInfirmaryVisits}
                    homeworkSubmissions={viewHomeworkSubmissions}
                    systemConfig={systemConfig}
                    school={activeSchool}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    initialStudentId={devBookTargetStudentId}
                    onAddBehaviorRecord={handleAddBehaviorRecord}
                    onOpenReportCard={setSelectedStudentForReport}
                    onOpenCoreReportCard={(studentId) => {
                      setIsGamePlaying(false);
                      setGradebookJumpTarget({ studentId, tab: 'core_report_card' });
                      setProgramMode('school_erp');
                      setCurrentTab('gradebook');
                    }}
                    onOpenQualitativeSummary={() => navigateToAppTab('qualitative_summary')}
                    onOpenCourseIndicators={(courseId) => {
                      setIsGamePlaying(false);
                      setGradebookJumpTarget({ courseId, tab: 'indicators' });
                      setProgramMode('school_erp');
                      setCurrentTab('gradebook');
                    }}
                    onOpenBehaviorSdq={() => navigateToAppTab('behavior_sdq')}
                    lang={lang}
                  />
                )}

                {currentTab === 'qualitative_summary' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <GradeLevelQualitativeSummaryView
                    students={viewStudents}
                    systemConfig={systemConfig}
                    school={activeSchool}
                    currentRole={currentRole}
                    currentUser={currentUser}
                    lang={lang}
                    onOpenStudentDevBook={(studentId) => {
                      setIsGamePlaying(false);
                      setDevBookTargetStudentId(studentId);
                      setProgramMode('school_erp');
                      setCurrentTab('student_development_book');
                    }}
                    onOpenStudentPp6={(studentId) => {
                      setIsGamePlaying(false);
                      setGradebookJumpTarget({ studentId, tab: 'pp6' });
                      setProgramMode('school_erp');
                      setCurrentTab('gradebook');
                    }}
                  />
                )}

                {currentTab === 'billing' && ['super_admin', 'admin'].includes(currentRole) && (
                  <BillingView
                    students={viewStudents}
                    invoices={schoolInvoices}
                    systemConfig={systemConfig}
                    schoolId={activeSchool.id}
                    onPayInvoice={handlePayInvoice}
                    onAddInvoice={handleAddInvoice}
                    onSendPrivateAppReminder={handleSendPrivateAppReminder}
                    currentRole={currentRole}
                    onOpenExamPaymentSettings={handleOpenExamPaymentSettings}
                    onApproveSlip={handleApproveInvoiceSlip}
                    onRejectSlip={handleRejectInvoiceSlip}
                  />
                )}

                {currentTab === 'announcements' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <AnnouncementsView
                    announcements={schoolAnnouncements}
                    systemConfig={systemConfig}
                    onAddAnnouncement={handleAddAnnouncement}
                    onBroadcastLine={handleBroadcastLine}
                    schoolId={activeSchool.id}
                    onConsentPublished={(title) => {
                      if (currentUser) {
                        appendAuditLog(activeSchool.id, {
                          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
                          actorRole: currentUser.role,
                          actionType: 'consent_created',
                          targetLabel: title,
                          details: 'เผยแพร่หนังสือขออนุญาตผู้ปกครอง',
                        });
                      }
                    }}
                  />
                )}
              </>
            )}

            {/* Mode 2: Virtual Classroom / LMS */}
            {programMode === 'lms_classroom' && (
              <LmsClassroomView
                schoolId={activeSchool.id}
                courses={viewCourses}
                students={viewStudents}
                teachers={isRestrictedViewer ? [] : schoolTeachers}
                lessons={viewLessons}
                assignments={viewAssignments}
                initialCourseId={lmsLessonJumpTarget?.courseId}
                initialLessonId={lmsLessonJumpTarget?.lessonId}
                lang={lang}
                currentUser={currentUser}
                schoolPermissions={schoolPermissions}
                onCompleteLesson={handleCompleteLesson}
                onSaveLesson={handleSaveSchoolLesson}
                onSubmitAssignment={handleSubmitAssignment}
              />
            )}

            {/* Mode 3: Parent & Student Portal */}
            {programMode === 'parent_portal' && (
              isProgramModeEnabledByFeatureFlags('parent_portal', activeFeatureFlags) ? (
                <ParentPortalView
                  students={viewStudents}
                  attendance={viewAttendance}
                  invoices={viewInvoices}
                  grades={viewGrades}
                  courses={viewCourses}
                  systemConfig={systemConfig}
                  leaveRequests={viewLeaveRequests}
                  lang={lang}
                  schoolPermissions={schoolPermissions}
                  onPayInvoice={handlePayInvoice}
                  onOpenReportCard={setSelectedStudentForReport}
                  onAddLeaveRequest={handleAddLeaveRequest}
                  schoolId={activeSchool.id}
                  onLoadAttendanceRange={loadAttendanceHistory}
                  periodAttendance={viewPeriodAttendance}
                  homeworkSubmissions={viewHomeworkSubmissions}
                  infirmaryVisits={viewInfirmaryVisits}
                  onSubmitInvoiceSlip={handleSubmitInvoiceSlip}
                />
              ) : (
                <div className="saas-card saas-card-body max-w-lg mx-auto my-8 text-center space-y-3">
                  <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                  <h3 className="type-section-title">
                    {lang === 'th' ? 'พอร์ทัลผู้ปกครองยังไม่เปิดใช้งานในแพ็กเกจของโรงเรียน' : 'Parent Portal is not included in the current school package'}
                  </h3>
                  <p className="type-meta">
                    {lang === 'th'
                      ? `กรุณาติดต่อผู้ดูแลโรงเรียนเพื่ออัปเกรดเป็น ${getPackageLevelLabel('level_2', lang)} ขึ้นไป`
                      : `Please contact your school admin to upgrade to ${getPackageLevelLabel('level_2', lang)}.`}
                  </p>
                </div>
              )
            )}
            </div>
            </Suspense>
            </ViewErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - Clean 4-item Apple-style bar */}
      {(currentRole !== 'super_admin' || isSuperAdminSchoolView) && currentRole !== 'parent' && !useImmersiveGameLayout && (
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-card)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-3 py-1.5 grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => {
            handleChangeProgramMode('school_erp');
            navigateToAppTab('dashboard');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            programMode === 'school_erp' && currentTab === 'dashboard'
              ? 'text-[var(--color-primary-text)] font-semibold'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>หน้าหลัก</span>
        </button>

        {(() => {
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
          return (
            <button
              type="button"
              onClick={() => {
                handleChangeProgramMode('school_erp');
                navigateToAppTab(slot2Target);
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                programMode === 'school_erp' && currentTab === slot2Target
                  ? 'text-[var(--color-primary-text)] font-semibold'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>{slot2Label}</span>
            </button>
          );
        })()}

        {(() => {
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
            <button
              type="button"
              onClick={() => {
                handleChangeProgramMode('school_erp');
                navigateToAppTab(slot3Target);
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                programMode === 'school_erp' && currentTab === slot3Target
                  ? 'text-[var(--color-primary-text)] font-semibold'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span>{slot3Label}</span>
            </button>
          );
        })()}

        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition text-[var(--color-text-muted)] cursor-pointer"
        >
          <User className="w-5 h-5" />
          <span>บัญชี</span>
        </button>
      </nav>
      )}

      {/* Multi-School Switcher Modal (Super Admin Only) */}
      <Suspense fallback={null}>
      {showSchoolSwitcher && currentRole === 'super_admin' && (
        <SchoolSwitcherModal
          schools={schools}
          activeSchool={activeSchool}
          onSelectSchool={(school) => {
            setActiveSchool(school);
            setSystemConfig((prev) => ({
              ...prev,
              schoolNameEn: school.nameEn,
              schoolNameTh: school.nameTh,
              academicYear: school.academicYear,
              currentSemester: school.currentSemester,
              semesterOptions: school.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
              gradingSystem: school.gradingSystem || 'thai',
              staffPositionOptions: school.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
            }));
          }}
          onClose={() => setShowSchoolSwitcher(false)}
          lang={lang}
        />
      )}

      {/* Official Bilingual Report Card Modal */}
      {selectedStudentForReport && (
        <ReportCardModal
          student={selectedStudentForReport}
          courses={viewCourses}
          grades={viewGrades}
          systemConfig={systemConfig}
          school={activeSchool}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}

      {/* Student Profile Detail Modal */}
      {selectedStudentForProfile && (
        <StudentDetailModal
          student={selectedStudentForProfile}
          courses={viewCourses}
          grades={viewGrades}
          attendance={viewAttendance}
          onClose={() => setSelectedStudentForProfile(null)}
          onLoadAttendanceHistory={loadAttendanceHistory}
          onOpenReportCard={(stu) => {
            setSelectedStudentForProfile(null);
            setSelectedStudentForReport(stu);
          }}
          onOpenMoeDocumentCenter={(stu) => {
            setSelectedStudentForProfile(null);
            handleOpenStudentMoeDocs(stu);
          }}
          onOpenDevelopmentBook={
            ['super_admin', 'admin', 'teacher'].includes(currentRole)
              ? (stu) => {
                  setSelectedStudentForProfile(null);
                  setDevBookTargetStudentId(stu.id);
                  setStudentsTargetStudentId(stu.id);
                  setStudentsSubTab('dev_book');
                  setProgramMode('school_erp');
                  setCurrentTab('students');
                }
              : undefined
          }
          onToggleLineSync={currentRole === 'teacher' ? () => undefined : handleToggleLineSync}
          gradingSystem={systemConfig.gradingSystem}
          onUpdateStudent={currentRole === 'teacher' ? undefined : (updated) => {
            handleUpdateStudent(updated);
            setSelectedStudentForProfile(updated);
          }}
        />
      )}

      {/* Comprehensive User Profile & Portfolio Modal */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          portfolioItems={viewPortfolioItems.filter(p => p.ownerId === currentUser.id || p.ownerRole === currentUser.role)}
          lang={lang}
          onSaveProfile={handleUpdateUserProfile}
          onAddPortfolioItem={handleAddPortfolioItem}
          onDeletePortfolioItem={handleDeletePortfolioItem}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Data Import / Export Modal (Bulk CSV/Excel for Courses, Enrollment, Grades, Students, Teachers, Questions) */}
      {showImportExportModal && ['super_admin', 'admin'].includes(currentRole) && (
        <DataImportExportModal
          students={viewStudents}
          teachers={viewTeachers}
          questions={schoolQuestions}
          courses={viewCourses}
          grades={viewGrades}
          attendance={viewAttendance}
          timetableSlots={viewTimetableSlotsAllTerms}
          schoolPeriods={schoolPeriods}
          activeSchoolId={activeSchool.id}
          academicYear={timetableAcademicYear}
          semester={timetableSemester}
          lang={lang}
          initialTab={importExportInitialTab}
          onOpenBackupCenter={currentRole === 'admin' || currentRole === 'super_admin' ? () => { setShowImportExportModal(false); setShowBackupCenterModal(true); } : undefined}
          onImportStudents={handleImportStudents}
          onImportTeachers={handleImportTeachers}
          onImportQuestions={handleImportQuestions}
          onImportCourses={handleImportCourses}
          onImportEnrollment={handleImportEnrollment}
          onImportGrades={handleImportGrades}
          onImportAttendance={handleBulkImportAttendance}
          onImportTimetableSlots={handleImportTimetableSlots}
          onClose={() => setShowImportExportModal(false)}
        />
      )}

      {showBackupCenterModal && (currentRole === 'admin' || currentRole === 'super_admin') && (
        <BackupCenterModal
          isSuperAdmin={currentRole === 'super_admin'}
          schools={schools}
          activeSchoolId={activeSchool.id}
          onClose={() => setShowBackupCenterModal(false)}
        />
      )}

      {/* Interactive System & Module Guide Modal */}
      {showGuideModal && (
        <ModuleGuideModal
          initialModule={guideModalInitialModule}
          initialRoleView={guideModalInitialRoleView}
          lang={lang}
          currentRole={currentRole}
          onClose={() => setShowGuideModal(false)}
          onNavigateToModule={(mod) => {
            setShowGuideModal(false);
            if (mod === 'lms') {
              handleChangeProgramMode('lms_classroom');
            } else if (mod === 'parent_portal') {
              handleChangeProgramMode('parent_portal');
            } else {
              handleChangeProgramMode('school_erp');
              navigateToAppTab(mod as NavTab);
            }
          }}
        />
      )}

      {/* School Onboarding Tutor Modal (DMC, School MIS, CCT, OBEC Care, ONET, HRMS, DPA, PP3 & Sandbox) */}
      {showOnboardingTutorModal && (
        <SchoolOnboardingTutorModal
          isOpen={showOnboardingTutorModal}
          onClose={() => setShowOnboardingTutorModal(false)}
          activeSchool={activeSchool}
          studentsCount={schoolStudents.length}
          teachersCount={schoolTeachers.length}
          coursesCount={schoolCourses.length}
          lang={lang}
          onNavigateToTab={(tab) => {
            setShowOnboardingTutorModal(false);
            navigateToAppTab(tab);
          }}
          onOpenImportExport={(tab) => {
            setShowOnboardingTutorModal(false);
            setImportExportInitialTab(tab || 'students');
            setShowImportExportModal(true);
          }}
        />
      )}

      {/* Direct School GPS & Gate Geofence Settings Modal */}
      {showGpsModal && (
        <SchoolGpsModal
          isOpen={showGpsModal}
          onClose={() => setShowGpsModal(false)}
          activeSchool={activeSchool}
          campusGates={campusGates}
          currentRole={currentRole}
          lang={lang}
          onUpdateCampusGates={handleUpdateCampusGates}
          onSaveCampusGates={handleSaveCampusGates}
          onUpdateSchoolCoordinates={handleUpdateSchoolCoordinates}
        />
      )}
      {/* Push Notification Center Modal */}
      {showNotificationModal && currentUser && (
        <NotificationCenterModal
          isOpen={showNotificationModal}
          currentUser={currentUser}
          schoolId={activeSchool.id}
          ownStudentIds={ownStudentIds}
          announcements={viewAnnouncements}
          onUnreadCountChange={setUnreadNotifCount}
          onClose={() => {
            setShowNotificationModal(false);
            if (currentUser.role !== 'parent') {
              setUnreadNotifCount(
                getScopedUnreadCountForUser({
                  currentUser,
                  schoolId: activeSchool.id,
                  ownStudentIds,
                  announcements: viewAnnouncements,
                  lang,
                })
              );
            }
          }}
          lang={lang}
        />
      )}

      {/* Supabase Schema Migration Patch Modal */}
      {showSchemaMigrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 bg-[var(--color-card-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    {lang === 'th'
                      ? 'อัปเดตโครงสร้างฐานข้อมูล Supabase (SQL Migration Patch)'
                      : 'Supabase Database Schema Migration Patch'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? 'รันครั้งเดียวเพื่อสร้างตาราง teachers, เพิ่มคอลัมน์ attendance.photo_url และรีเฟรช Schema Cache'
                      : 'Run once in Supabase SQL Editor to create teachers, add attendance.photo_url, and reload schema cache'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSchemaMigrationModal(false)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[var(--color-text-body)]">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  {lang === 'th' ? 'ขั้นตอนการแก้ไข (ใช้เวลา 30 วินาที):' : 'How to apply (takes 30 seconds):'}
                </div>
                <ol className="list-decimal list-inside space-y-1 text-amber-900/90 dark:text-amber-100/90">
                  <li>{lang === 'th' ? 'กดปุ่ม "คัดลอก SQL Migration ทั้งหมด" ด้านล่าง' : 'Click "Copy Full SQL Migration" below'}</li>
                  <li>{lang === 'th' ? 'เปิดหน้า Supabase Dashboard ของโปรเจกต์คุณ → เมนูซ้ายเลือก SQL Editor → กด New query' : 'Open your Supabase Dashboard → SQL Editor → New query'}</li>
                  <li>{lang === 'th' ? 'วางโค้ด SQL ลงไป แล้วกดปุ่ม Run (ด้านล่างขวา) จนขึ้น Success' : 'Paste the SQL and click Run until Success appears'}</li>
                  <li>{lang === 'th' ? 'กลับมาที่หน้าเว็บ BaanPakKru (บ้านพักครู) แล้วกดรีเฟรช (F5) ข้อมูลครูและรูปเช็คชื่อจะซิงก์ครบถ้วนทันที' : 'Return to BaanPakKru and refresh the page; teachers and attendance photos will sync immediately'}</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-muted)]">
                    supabase/migrations/20261111_patch_all_latest_migrations.sql + course classification migration
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMigrationSql}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedMigrationSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMigrationSql ? (lang === 'th' ? 'คัดลอกโค้ด SQL แล้ว!' : 'Copied SQL!') : (lang === 'th' ? 'คัดลอก SQL Migration ทั้งหมด' : 'Copy Full SQL Migration')}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] max-h-72 overflow-auto leading-relaxed border border-slate-800 select-all">
                  {patchMigrationSql || 'กำลังโหลด SQL Migration...'}
                </pre>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSchemaMigrationModal(false)}
                className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Pop-up Notification for School Admin when New Central Exam Packs (8 Strands) are Published */}
      {!focusMode && showCentralExamPopup && currentRole === 'admin' && programMode === 'school_erp' && (
        <CentralExamNotificationPopup
          isOpen={true}
          schoolName={activeSchool.nameTh}
          unclaimedPacks={unclaimedCentralPacks}
          onClaimFreePack={handleClaimFreeCentralPack}
          onClaimAllFreePacks={handleClaimAllFreeCentralPacks}
          onPurchasePack={handlePurchaseCentralPack}
          onOpenHub={() => {
            setShowCentralExamPopup(false);
            navigateToAppTab('central_exam_hub');
          }}
          onDismiss={() => {
            markCentralExamPopupSeen(activeSchool.id, buildCentralExamSignature(unclaimedCentralPacks));
            setShowCentralExamPopup(false);
          }}
        />
      )}
      </Suspense>

      <ConfirmActionModal
        isOpen={Boolean(confirmModal)}
        title={confirmModal?.title || ''}
        description={confirmModal?.description || ''}
        detailNote={confirmModal?.detailNote}
        confirmLabel={confirmModal?.confirmLabel || 'ยืนยัน'}
        tone={confirmModal?.tone || 'danger'}
        isBusy={isConfirmModalBusy}
        onCancel={() => {
          if (!isConfirmModalBusy) setConfirmModal(null);
        }}
        onConfirm={async () => {
          if (!confirmModal) return;
          setIsConfirmModalBusy(true);
          try {
            await confirmModal.onConfirm();
            setConfirmModal(null);
          } catch (error) {
            setDataSyncError(error instanceof Error ? error.message : String(error));
            setConfirmModal(null);
          } finally {
            setIsConfirmModalBusy(false);
          }
        }}
      />

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator lang={lang} currentUserId={currentUser?.id} onSyncItem={handleSyncOfflineItem} isUsingCachedData={isUsingCachedSchoolData} />
    </div>
    </GuideTourProvider>
  );
};

export default App;
