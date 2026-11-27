import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Announcement,
  AppProgramMode,
  Assignment,
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  AuthUser,
  BehaviorRecord,
  CampusGateGeofence,
  CentralExamPack,
  Course,
  GradeRecord,
  GradingSystem,
  HomeworkSubmission,
  InfirmaryVisit,
  LeaveRequest,
  LeaveStatus,
  Lesson,
  PeriodAttendanceRecord,
  PlayerScore,
  PortfolioItem,
  PromotionCampaign,
  QuizQuestion,
  RewardItem,
  RewardRedemptionRequest,
  RolePermissionConfig,
  School,
  SchoolExamEntitlement,
  SchoolFeatureFlags,
  SchoolPeriodTime,
  SchoolSubscriptionPlan,
  SdqAssessment,
  Student,
  SystemConfig,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../../types';
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
  redeemArcadeReward,
  saveSchoolCustomReward,
  triggerHaptic,
  updateRewardRedemptionStatus,
  upsertArcadePlayerProfile,
} from '../../lib/arcadeStore';
import { INITIAL_ROLE_PERMISSIONS, INITIAL_SYSTEM_CONFIG } from '../../data/defaultSchoolConfig';
import {
  fetchMyOperationalRole,
  fetchMyRolePermissionConfig,
  fetchSuperAdminSettings,
  setMyOperationalRole,
} from '../../lib/superAdminSettings';
import { getAvailableOperationalRoles } from '../../lib/operationalRoles';
import { clearSavedNavState, readSavedNavState } from '../navigation/navPersistence';
import { belongsToSchool } from '../../lib/schoolDataScope';
import {
  isPasswordRecoveryRedirect,
  restoreSupabaseSession,
  signOutFromSupabase,
  updateSchoolSettingsInSupabase,
  updateSchoolStatusInSupabase,
  updateUserProfileInSupabase,
} from '../../lib/authDb';
import type { AuthContext } from '../../lib/authDb';
import {
  deleteCoursesFromDb,
  deleteGradesForEnrollmentFromDb,
  deleteStaleGradesFromDb,
  deleteStudentFromDb,
  deleteTeacherFromDb,
  deleteTimetableSlotFromDb,
  loadAttendanceRangeFromSupabase,
  loadSchoolData,
  persistAvatarChangeToSupabase,
  saveHomeworkGradeToDb,
  saveHomeworkSubmissionToDb,
  saveLeaveRequestToDb,
  savePeriodAttendanceBatchToDb,
  saveQueuedAttendanceToDb,
  saveSchoolAssignmentToDb,
  saveSchoolCampusGates,
  saveSchoolGpsCoordinates,
  saveSchoolPeriodTimes,
  saveTeachersToDb,
  saveTimetableSlotsToDb,
  syncDataToSupabase,
  updateCourseEnrollmentInDb,
  updateLeaveRequestStatusInDb,
  uploadSchoolAttachment,
} from '../../lib/supabase';
import {
  cleanupStudentCampusData,
  hydrateCampusDataFromSupabase,
} from '../../lib/campusDataStore';
import { hydrateMoeQualitativeFromSupabase } from '../../lib/moeQualitativeStore';
import { clearSchoolSnapshotsForUser } from '../../lib/offlineSchoolCache';
import { hydrateSchoolRegistryFromSupabase } from '../../lib/studentRegistryStore';
import {
  deleteSchoolStudentRecord,
  loadSchoolStudentRecords,
  saveSchoolStudentRecord,
} from '../../lib/studentRecordsPersistence';
import { DEFAULT_SCHOOL_PERIODS } from '../../lib/schoolPeriods';
import {
  buildPrimaryGateFromSchool,
  isValidCoordinatePair,
  sanitizeSchoolCampusGates,
} from '../../lib/schoolGps';
import {
  calculateGrade,
  DEFAULT_SEMESTER_OPTIONS,
  DEFAULT_STAFF_POSITION_OPTIONS,
} from '../../lib/schoolSettings';
import { calculateStudentAcademicSummary, isSpecialMoeGrade } from '../../lib/moeGrading';
import { getGradeDuplicateReasons } from '../../lib/duplicateRecords';
import { emitAppToast } from '../../components/common/ToastProvider';
import {
  CENTRAL_EXAMS_UPDATED_EVENT,
  claimCentralExamPack,
  countMissingBuiltInPacks,
  fetchCentralExamPacks,
  fetchSchoolExamEntitlements,
  fetchSchoolPersistedQuestions,
  getUnclaimedPublishedPacks,
  hasBuiltInSeedCompleted,
  saveSchoolQuestionsBatch,
  syncMissingDefaultCentralExamPacksToSupabase,
} from '../../lib/centralExamBank';
import { sendEduVerseNotification } from '../../lib/pushNotifications';
import { sendPrivateParentNotification } from '../../lib/parentNotifications';
import { dispatchGradeAlert } from '../../lib/gradeNotifications';
import { getLocalDateString } from '../../lib/date';
import { syncPublicHolidaysFromApi } from '../../lib/thaiHolidays';
import { enqueueOfflineAction, isOnlineNow, type OfflineQueueItem } from '../../lib/offlineSync';
import { appendAuditLog } from '../../lib/auditLog';
import {
  loadPackageCatalog,
  loadSchoolFeatureFlagsFromDb,
  saveSchoolFeatureFlagsToDb,
} from '../../lib/schoolPackageStore';
import { getSchoolFeatureFlags } from '../../lib/schoolFeatureFlags';
import { normalizeSelfieRetentionMinutes } from '../../lib/selfieCleanupLogic';
import { cleanupDueAttendanceSelfiesOnServer } from '../../services/supabase/selfieCleanupClient';
import { useSchoolPermissions } from '../../lib/schoolPermissions';
import { loadSchoolLessons, saveSchoolLessonCompletionToDb, saveSchoolLessonToDb } from '../../lib/lmsPersistence';
import { teacherMatchesCourse } from '../../lib/courseTeacherFilter';
import { resolveLinkedStudentsForUser, resolveOwnStudent, resolveOwnTeacher } from '../../lib/attendanceScope';
import { filterCoursesForPersonalRole } from '../../lib/studentDataScope';
import {
  getBiometricSoftLock,
  getPasskeyForUser,
  setBiometricSoftLock,
  verifyBiometricPasskey,
} from '../../lib/webAuthn';
import {
  STORAGE_KEYS,
  appendDeletedIdsCache,
  readCampusGatesCache,
  readDeletedIdsCache,
  readPendingAvatarCache,
  readPortfolioItemsCache,
  safeReadJson,
  safeWriteJson,
  writeCampusGatesCache,
  writePendingAvatarCache,
  writePortfolioItemsCache,
} from '../../services/storage/localStorageService';
import { normalizeTimetableAcademicYear } from './useSchoolScope';

type CoreSyncRows = {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
};

export interface ConfirmModalConfig {
  title: string;
  description: string;
  detailNote?: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
}

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
  createdAt: '',
  status: 'pending',
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

export function getAcademicYearStartDate(label: string): string {
  const westernYear = label.match(/\b(20\d{2})\b/)?.[1];
  const thaiYear = label.match(/\b(25\d{2})\b/)?.[1];
  const year = westernYear ? Number(westernYear) : thaiYear ? Number(thaiYear) - 543 : new Date().getFullYear();
  return `${year}-05-01`;
}

export interface NavCallbacks {
  onLoginNavigate: (
    role: UserRole,
    hasDeepLink: boolean,
    userId: string,
    isSessionRestore?: boolean
  ) => void;
  onRoleSwitchNavigate: (nextRole: 'admin' | 'teacher') => void;
  onViewSchoolNavigate: () => void;
}

export interface UseSchoolDataManagerOptions {
  onConfirmModalRequested: (config: ConfirmModalConfig) => void;
  hasDeepLink: boolean;
  navCallbacksRef: React.MutableRefObject<NavCallbacks>;
}

export function useSchoolDataManager({
  onConfirmModalRequested,
  hasDeepLink,
  navCallbacksRef,
}: UseSchoolDataManagerOptions) {
  // Multi-School & Auth State
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSchool, setActiveSchool] = useState<School>(EMPTY_SCHOOL);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => isPasswordRecoveryRedirect());
  const [isSuperAdminSchoolView, setIsSuperAdminSchoolView] = useState(false);
  const skipNextSuperAdminSyncRef = useRef(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [loadedSchoolId, setLoadedSchoolId] = useState<string | null>(null);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [isUsingCachedSchoolData, setIsUsingCachedSchoolData] = useState(false);
  const [dataSyncError, setDataSyncError] = useState<string | null>(null);
  const [dataSyncWarnings, setDataSyncWarnings] = useState<string[]>([]);
  const [dataSyncSummary, setDataSyncSummary] = useState<string | null>(null);
  const [orphanedGrades, setOrphanedGrades] = useState<GradeRecord[]>([]);
  const [isCleaningOrphanedGrades, setIsCleaningOrphanedGrades] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [isUnlockingBiometrics, setIsUnlockingBiometrics] = useState(false);
  const [biometricLockError, setBiometricLockError] = useState<string | null>(null);

  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const skipNextOfflineRowSyncRef = useRef(false);
  const lastSyncedRowsBySchoolRef = useRef(new Map<string, CoreSyncRows>());
  const attendanceLoadedRangesRef = useRef(
    new Map<string, Array<{ start: string | null; end: string | null; studentId?: string }>>()
  );
  const attendanceRangeRequestsRef = useRef(new Map<string, Promise<void>>());

  // Super Admin Management State (RBAC, Promotions, Subscription Plans)
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>(INITIAL_ROLE_PERMISSIONS);
  const [promotions, setPromotions] = useState<PromotionCampaign[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SchoolSubscriptionPlan[]>([]);
  const [superAdminConfigError, setSuperAdminConfigError] = useState<string | null>(null);

  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [authenticatedRole, setAuthenticatedRole] = useState<UserRole | null>(null);
  const [operationalRoleReady, setOperationalRoleReady] = useState(false);
  const operationalRoleSwitchRef = useRef(false);

  // Domain State
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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
  const [centralExamPacks, setCentralExamPacks] = useState<CentralExamPack[]>([]);
  const [schoolExamEntitlements, setSchoolExamEntitlements] = useState<SchoolExamEntitlement[]>([]);
  const [featureFlagsBySchool, setFeatureFlagsBySchool] = useState<Record<string, SchoolFeatureFlags>>({});

  const schoolPermissions = useSchoolPermissions(activeSchool.id);

  // Toast notifications on sync feedback
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

  useEffect(() => {
    void syncPublicHolidaysFromApi(new Date().getFullYear());
  }, []);

  // Role Permission Config Loading
  useEffect(() => {
    if (!currentUser || currentRole === 'super_admin' || !operationalRoleReady) return;
    let active = true;
    setRolePermissions([]);
    fetchMyRolePermissionConfig(currentRole)
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
  }, [currentUser?.id, currentRole, operationalRoleReady]);

  // Operational Role Restore
  useEffect(() => {
    if (
      !currentUser ||
      (authenticatedRole !== 'admin' && authenticatedRole !== 'teacher')
    ) {
      setOperationalRoleReady(true);
      return;
    }

    let active = true;
    let roleRestored = false;
    setOperationalRoleReady(false);
    void fetchMyOperationalRole()
      .then((role) => {
        if (!active) return;
        const availableRoles = getAvailableOperationalRoles({
          accountRole: authenticatedRole,
          isSchoolAdminTeacher: Boolean(currentUser.isSchoolAdmin),
          hasTeacherProfile: Boolean(currentUser.teacherRecordId),
        });
        if (!availableRoles.includes(role)) {
          throw new Error('The saved role is no longer assigned to this account.');
        }
        setCurrentRole(role);
        setCurrentUser((user) =>
          user?.id === currentUser.id ? { ...user, role } : user
        );
        roleRestored = true;
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setDataLoadError(
          `ไม่สามารถยืนยันโหมดสิทธิ์กับฐานข้อมูลได้ กรุณาตรวจสอบและใช้ SQL migration ล่าสุด แล้วลองใหม่ (${message})`
        );
      })
      .finally(() => {
        if (active && roleRestored) setOperationalRoleReady(true);
      });

    return () => { active = false; };
  }, [currentUser?.id, authenticatedRole]);

  // Super Admin Settings
  useEffect(() => {
    if (currentUser?.role !== 'super_admin') return;
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
  }, [currentUser?.id, currentUser?.role]);

  // Central Exam State
  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    const loadCentralExamState = async () => {
      try {
        let [packs, entitlements, persistedSchoolQs] = await Promise.all([
          fetchCentralExamPacks(),
          fetchSchoolExamEntitlements(activeSchool.id),
          fetchSchoolPersistedQuestions(activeSchool.id),
        ]);
        if (!active) return;

        if (
          currentRole === 'super_admin' &&
          countMissingBuiltInPacks(packs) > 0 &&
          (packs.length === 0 || !hasBuiltInSeedCompleted())
        ) {
          try {
            const synced = await syncMissingDefaultCentralExamPacksToSupabase(packs, {
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
  }, [currentUser?.id, currentRole, activeSchool.id]);

  const getCurrentSchoolSyncRows = (): CoreSyncRows => ({
    students: students.filter((item) => item.schoolId === activeSchool.id),
    teachers: teachers.filter((item) => belongsToSchool(item, activeSchool.id)),
    courses: courses.filter((item) => item.schoolId === activeSchool.id),
    grades: grades.filter((item) => item.schoolId === activeSchool.id),
    attendance: attendance.filter((item) => item.schoolId === activeSchool.id),
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

  // Load and synchronize real school GPS campus gates per active school
  useEffect(() => {
    try {
      const parsed = readCampusGatesCache(activeSchool.id);
      if (parsed.length > 0) {
        const cleaned = sanitizeSchoolCampusGates(parsed, activeSchool.id);
        if (cleaned.length > 0) {
          if (cleaned.length !== parsed.length) {
            writeCampusGatesCache(activeSchool.id, cleaned);
          }
          setCampusGates(cleaned);
          return;
        }
        writeCampusGatesCache(activeSchool.id, []);
      }

      const primaryFromSchool = buildPrimaryGateFromSchool(activeSchool);
      setCampusGates(primaryFromSchool ? [primaryFromSchool] : []);
    } catch {
      setCampusGates([]);
    }
  }, [activeSchool.id, activeSchool.nameTh, activeSchool.nameEn, activeSchool.latitude, activeSchool.longitude, activeSchool.geofenceRadiusMeters]);

  const handleLogin = (
    context: AuthContext,
    options?: { isSessionRestore?: boolean }
  ) => {
    const isSessionRestore = Boolean(options?.isSessionRestore);
    const savedNav = isSessionRestore ? readSavedNavState(context.user.id) : null;
    const restoredSchool =
      isSessionRestore &&
      context.user.role === 'super_admin' &&
      savedNav?.isSuperAdminSchoolView &&
      savedNav.schoolId
        ? context.schools.find((s) => s.id === savedNav.schoolId) || context.school
        : context.school;
    const shouldRestoreSuperAdminSchoolView = Boolean(
      isSessionRestore &&
        context.user.role === 'super_admin' &&
        savedNav?.isSuperAdminSchoolView &&
        restoredSchool
    );

    const school = restoredSchool;
    setBiometricSoftLock(null);
    setIsBiometricLocked(false);
    setBiometricLockError(null);
    setIsSuperAdminSchoolView(shouldRestoreSuperAdminSchoolView);
    setOperationalRoleReady(false);
    setIsDataReady(false);
    setSchools(context.schools);
    setCurrentUser(context.user);
    setCurrentRole(context.user.role);
    setAuthenticatedRole(context.user.role);
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
    setStudents([]);
    setTeachers([]);
    setCourses([]);
    setGrades([]);
    setAttendance([]);
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
    navCallbacksRef.current.onLoginNavigate(
      context.user.role,
      hasDeepLink,
      context.user.id,
      isSessionRestore
    );
  };

  // Restore Supabase session on mount
  useEffect(() => {
    if (isPasswordRecovery) return;

    let active = true;
    restoreSupabaseSession()
      .then((context) => {
        if (active && context) {
          const softLock = getBiometricSoftLock();
          const shouldStayLocked =
            Boolean(softLock && softLock.userId === context.user.id && getPasskeyForUser(context.user.id));
          handleLogin(context, { isSessionRestore: true });
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

  // Load main school data
  useEffect(() => {
    if (!currentUser || !operationalRoleReady) return;
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
        let resolvedTimetableSlots = (data.timetableSlots || []).map((slot) => ({
          ...slot,
          academicYear: slot.academicYear || activeSchool.academicYear || systemConfig.academicYear,
          semester: slot.semester || activeSchool.currentSemester || systemConfig.currentSemester,
        }));

        const deletedStudentIds = readDeletedIdsCache('student', activeSchool.id);
        const deletedTeacherIds = readDeletedIdsCache('teacher', activeSchool.id);
        const deletedCourseIds = readDeletedIdsCache('course', activeSchool.id);
        const deletedStudentSet = new Set(deletedStudentIds);
        const deletedCourseSet = new Set(deletedCourseIds);
        if (deletedStudentSet.size > 0) {
          resolvedStudents = resolvedStudents.filter((s) => !deletedStudentSet.has(s.id));
          deletedStudentGrades = resolvedGrades.filter((g) => deletedStudentSet.has(g.studentId));
          resolvedGrades = resolvedGrades.filter((g) => !deletedStudentSet.has(g.studentId));
          resolvedAttendance = resolvedAttendance.filter((a) => !deletedStudentSet.has(a.studentId));
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
            return { ...grade, gradePoint: 0 };
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

        const pendingAvatars = readPendingAvatarCache(activeSchool.id, currentUser.id);
        let reconciledUserAvatar = pendingAvatars.self || currentUser.avatarUrl || '';
        let reconciledStudents = syncedStudents.map((stu) => {
          const pendingStuAvatar = pendingAvatars.students?.[stu.id];
          return pendingStuAvatar ? { ...stu, avatarUrl: pendingStuAvatar } : stu;
        });
        let reconciledTeachers = resolvedTeachers.map((tch) => {
          const pendingTchAvatar = pendingAvatars.teachers?.[tch.id];
          return pendingTchAvatar ? { ...tch, avatarUrl: pendingTchAvatar } : tch;
        });

        if (currentUser.role === 'student') {
          const ownStu = resolveOwnStudent(currentUser, reconciledStudents);
          if (ownStu) {
            if (reconciledUserAvatar) {
              if (ownStu.avatarUrl !== reconciledUserAvatar) {
                reconciledStudents = reconciledStudents.map((stu) =>
                  stu.id === ownStu.id ? { ...stu, avatarUrl: reconciledUserAvatar } : stu
                );
              }
            } else if (ownStu.avatarUrl) {
              reconciledUserAvatar = ownStu.avatarUrl;
            }
          }
        } else if (['teacher', 'admin', 'super_admin'].includes(currentUser.role)) {
          const ownTch = resolveOwnTeacher(currentUser, reconciledTeachers);
          if (ownTch) {
            if (reconciledUserAvatar) {
              if (ownTch.avatarUrl !== reconciledUserAvatar) {
                reconciledTeachers = reconciledTeachers.map((tch) =>
                  tch.id === ownTch.id ? { ...tch, avatarUrl: reconciledUserAvatar } : tch
                );
              }
            } else if (ownTch.avatarUrl) {
              reconciledUserAvatar = ownTch.avatarUrl;
            }
          }
        }

        if (reconciledUserAvatar && reconciledUserAvatar !== (currentUser.avatarUrl || '')) {
          setCurrentUser((prev) =>
            prev && prev.id === currentUser.id ? { ...prev, avatarUrl: reconciledUserAvatar } : prev
          );
        }

        setStudents(reconciledStudents);
        setTeachers(reconciledTeachers);
        setCourses(resolvedCourses);
        setGrades(normalizedGrades);
        setAttendance(resolvedAttendance);
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
          writeCampusGatesCache(activeSchool.id, realDbGates);
        } else {
          const fallbackSchoolGate = buildPrimaryGateFromSchool(activeSchool);
          const resolvedGates = fallbackSchoolGate ? [fallbackSchoolGate] : [];
          setCampusGates(resolvedGates);
          writeCampusGatesCache(activeSchool.id, resolvedGates);
        }

        setLessons((prev) => prev.length > 0 ? prev.filter((l) => l.schoolId === activeSchool.id) : []);
        setAssignments(data.assignments || []);
        setQuestions((prev) => prev.length > 0 ? prev.filter((q) => q.schoolId === activeSchool.id) : []);
        setPlayerScores((prev) => prev);
        setRewardItems((prev) => (prev.length > 0 ? prev : DEFAULT_ARCADE_REWARDS));
        setPeriodAttendance(data.periodAttendance || []);
        setPortfolioItems((prev) => {
          const cachedPortfolio = readPortfolioItemsCache(activeSchool.id);
          if (cachedPortfolio) return cachedPortfolio;
          return prev.length > 0 ? prev.filter((p) => p.schoolId === activeSchool.id) : [];
        });
        setBehaviorRecords((prev) => prev.length > 0 ? prev.filter((b) => b.schoolId === activeSchool.id) : []);
        setSdqAssessments((prev) => prev.length > 0 ? prev.filter((s) => s.schoolId === activeSchool.id) : []);
        setInfirmaryVisits((prev) => prev.length > 0 ? prev.filter((i) => i.schoolId === activeSchool.id) : []);
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
  }, [currentUser?.id, currentUser?.role, activeSchool.id, isSuperAdminSchoolView, operationalRoleReady]);

  // Load Student Records (portfolio, behavior, sdq, infirmary)
  useEffect(() => {
    if (!activeSchool.id || !currentUser || !isDataReady) return;
    let active = true;
    const schoolStudents = students.filter((s) => belongsToSchool(s, activeSchool.id));

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
        const cachedRaw = readPortfolioItemsCache(activeSchool.id) || [];
        const cachedItems = cachedRaw.filter((item) => belongsToSchool(item, activeSchool.id));
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
  }, [activeSchool.id, currentUser?.id, loadedSchoolId, isDataReady]);

  // Arcade Profiles, Rewards Catalog & Redemptions
  useEffect(() => {
    if (!activeSchool.id || !operationalRoleReady) return;
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
      .catch((error) => {
        console.warn('[Arcade] Could not load school arcade state:', error);
      });
    return () => {
      active = false;
    };
  }, [activeSchool.id, operationalRoleReady]);

  // Package Catalog & School Feature Flags
  useEffect(() => {
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
      .catch((error) => {
        console.warn('[FeatureFlags] Could not load school feature flags:', error);
      });
    return () => {
      active = false;
    };
  }, [activeSchool.id, activeSchool.schoolTier]);

  // Hydrate unified student OBEC/MOE registration, campus records & qualitative evaluations
  useEffect(() => {
    if (!isDataReady || !activeSchool.id || loadedSchoolId !== activeSchool.id) {
      return;
    }
    const year = systemConfig.academicYear || '2569';
    const sem = systemConfig.currentSemester || '1';
    void hydrateSchoolRegistryFromSupabase(activeSchool.id, year, sem);
    void hydrateCampusDataFromSupabase(activeSchool.id);
    void hydrateMoeQualitativeFromSupabase(activeSchool.id, year, sem);
  }, [
    isDataReady,
    activeSchool.id,
    loadedSchoolId,
    systemConfig.academicYear,
    systemConfig.currentSemester,
  ]);

  // Incremental Supabase sync queue
  useEffect(() => {
    if (
      !currentUser ||
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
    isSuperAdminSchoolView,
    isDataReady,
    loadedSchoolId,
    activeSchool,
    students,
    teachers,
    courses,
    grades,
    attendance,
    announcements,
  ]);

  // Helper slices for handlers
  const activeSchoolCourses = courses.filter((c) => belongsToSchool(c, activeSchool.id));
  const activeSchoolStudents = students.filter((s) => belongsToSchool(s, activeSchool.id));
  const activeSchoolTeachers = teachers.filter((t) => belongsToSchool(t, activeSchool.id));
  const activeSchoolAssignments = assignments.filter((a) => belongsToSchool(a, activeSchool.id));
  const activeSchoolLessons = lessons.filter((l) => belongsToSchool(l, activeSchool.id));
  const activeSchoolGrades = grades.filter((g) => belongsToSchool(g, activeSchool.id));
  const activeSchoolHomeworkSubmissions = homeworkSubmissions.filter((h) => belongsToSchool(h, activeSchool.id));
  const timetableAcademicYear = normalizeTimetableAcademicYear(activeSchool.academicYear || systemConfig.academicYear);
  const timetableSemester = activeSchool.currentSemester || systemConfig.currentSemester;

  const syncStudentGpaFromGrades = (
    nextGrades: GradeRecord[],
    targetStudentIds?: Set<string>,
    coursesOverride?: Course[],
    gradingSystemOverride?: GradingSystem
  ) => {
    setStudents((prevStudents) =>
      prevStudents.map((stu) => {
        if (!belongsToSchool(stu, activeSchool.id)) return stu;
        if (targetStudentIds && !targetStudentIds.has(stu.id)) return stu;
        const summary = calculateStudentAcademicSummary({
          student: stu,
          courses: coursesOverride ?? activeSchoolCourses,
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

  // School & Auth Actions
  const handleSelectActiveSchool = (school: School) => {
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
  };

  const handleViewSchool = (school: School) => {
    if (currentRole !== 'super_admin') return;
    handleSelectActiveSchool(school);
    setIsSuperAdminSchoolView(true);
    navCallbacksRef.current.onViewSchoolNavigate();
  };

  const handleToggleSchoolStatus = async (schoolId: string, nextStatus: School['status']) => {
    const school = schools.find((item) => item.id === schoolId);
    if (!school) throw new Error('School not found.');
    if (school.status === 'pending') {
      throw new Error('Pending registrations must be approved from the registration queue.');
    }
    await updateSchoolStatusInSupabase(schoolId, nextStatus);
    setSchools((current) => current.map((s) => (
      s.id === schoolId ? { ...s, status: nextStatus } : s
    )));
    setActiveSchool((current) => (
      current.id === schoolId ? { ...current, status: nextStatus } : current
    ));
  };

  const handleUpdateSchool = async (updates: Partial<School>) => {
    try {
      if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
        throw new Error('เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่แก้ไขการตั้งค่าโรงเรียนได้');
      }
      await updateSchoolSettingsInSupabase(activeSchool.id, updates);
      if (updates.gradingSystem && updates.gradingSystem !== systemConfig.gradingSystem) {
        const targetMode = updates.gradingSystem;
        const recalculatedGrades = grades.map((grade) => {
          if (!belongsToSchool(grade, activeSchool.id)) return grade;
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
        syncStudentGpaFromGrades(recalculatedGrades, undefined, activeSchoolCourses, targetMode);
      }
      setActiveSchool((prev) => {
        const next = { ...prev, ...updates };
        const settingsKey = `${STORAGE_KEYS.schoolCustomSettingsPrefix}${next.id}`;
        const existing = safeReadJson<Record<string, unknown>>(settingsKey, {});
        safeWriteJson(settingsKey, { ...existing, ...updates });
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
      await saveTimetableSlotsToDb(activeSchool.id, payload.newTimetableSlots).catch((err) => {
        console.warn('[Rollover] Failed to persist rolled-over timetable slots:', err);
        setDataSyncError('บันทึกตารางสอนภาคเรียนใหม่ไม่สำเร็จ กรุณาลองบันทึกอีกครั้ง');
      });
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
    void saveSchoolFeatureFlagsToDb(schoolId, flags);
    if (currentUser) {
      appendAuditLog(schoolId, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'feature_flags_update',
        targetLabel: flags.tier,
        details: `อัปเดตแพ็กเกจโมดูล (${flags.tier}) · สิทธิ์ AI นักเรียน: ${flags.allowStudentsAi ? 'เปิด' : 'ปิด'} · ลบรูปเซลฟี่อัตโนมัติ: ${flags.autoDeleteSelfiesAfterCheckout === false ? 'ปิด' : `เปิด (${normalizeSelfieRetentionMinutes(flags.selfieRetentionAfterCheckoutMinutes)} นาทีหลังเช็คเอาท์)`}`,
      });
    }
  };

  const handleCleanupDueSelfies = useCallback(async (options?: {
    silent?: boolean;
    retentionMinutes?: number;
  }) => {
    const targetSchoolId = activeSchool.id;
    if (!targetSchoolId) {
      return {
        deletedPhotosCount: 0,
        clearedRecordsCount: 0,
        matchedByCheckoutCount: 0,
        matchedPreviousDaysCount: 0,
      };
    }

    const schoolFlags = featureFlagsBySchool[targetSchoolId] || getSchoolFeatureFlags(targetSchoolId, activeSchool.schoolTier || 'enterprise');
    const retentionMinutes =
      options?.retentionMinutes !== undefined
        ? normalizeSelfieRetentionMinutes(options.retentionMinutes)
        : normalizeSelfieRetentionMinutes(schoolFlags.selfieRetentionAfterCheckoutMinutes);

    const serverResult = await cleanupDueAttendanceSelfiesOnServer({
      schoolId: targetSchoolId,
      retentionMinutes,
      includePreviousDays: true,
    });
    const clearedIds = serverResult.deletedRecordIds;
    const deletedPhotosCount = serverResult.deletedPhotosCount;
    const clearedRecordsCount = serverResult.clearedRecordsCount;
    const matchedByCheckoutCount = serverResult.matchedByCheckoutCount;
    const matchedPreviousDaysCount = serverResult.matchedPreviousDaysCount;

    if (clearedIds.length > 0) {
      const clearedIdSet = new Set(clearedIds);
      setAttendance((prev) =>
        prev.map((record) =>
          clearedIdSet.has(record.id)
            ? { ...record, photoUrl: undefined, photoStoragePath: undefined }
            : record
        )
      );

      const previousSnapshot = lastSyncedRowsBySchoolRef.current.get(targetSchoolId);
      if (previousSnapshot) {
        lastSyncedRowsBySchoolRef.current.set(targetSchoolId, {
          ...previousSnapshot,
          attendance: previousSnapshot.attendance.map((record) =>
            clearedIdSet.has(record.id)
              ? { ...record, photoUrl: undefined, photoStoragePath: undefined }
              : record
          ),
        });
      }
    }

    if (!options?.silent && currentUser && clearedRecordsCount > 0) {
      appendAuditLog(targetSchoolId, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'selfie_photo_cleanup',
        targetLabel: `${clearedRecordsCount} รายการ`,
        details: `ลบรูปเซลฟี่ที่ครบกำหนดแล้ว ${deletedPhotosCount} ไฟล์ (${clearedRecordsCount} รายการ · หลังเช็คเอาท์ ${retentionMinutes} นาที) โดยคงประวัติเวลาเช็คชื่อไว้ครบถ้วน`,
      });
    }

    return {
      deletedPhotosCount,
      clearedRecordsCount,
      matchedByCheckoutCount,
      matchedPreviousDaysCount,
    };
  }, [activeSchool.id, activeSchool.schoolTier, currentUser, featureFlagsBySchool]);

  useEffect(() => {
    if (
      !isDataReady ||
      !activeSchool.id ||
      loadedSchoolId !== activeSchool.id ||
      !currentUser ||
      !['admin', 'super_admin'].includes(currentUser.role)
    ) {
      return;
    }

    const schoolFlags = featureFlagsBySchool[activeSchool.id] || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise');
    if (schoolFlags.autoDeleteSelfiesAfterCheckout === false) {
      return;
    }

    const throttleKey = `eduverse_selfie_cleanup_last_${activeSchool.id}`;
    const now = Date.now();
    try {
      const lastRun = Number(window.sessionStorage.getItem(throttleKey) || '0');
      if (Number.isFinite(lastRun) && now - lastRun < 10 * 60 * 1000) {
        return;
      }
      window.sessionStorage.setItem(throttleKey, String(now));
    } catch {
      // ignore sessionStorage errors
    }

    const timerId = window.setTimeout(() => {
      void handleCleanupDueSelfies({ silent: true }).catch(() => {});
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [
    activeSchool.id,
    activeSchool.schoolTier,
    currentUser,
    featureFlagsBySchool,
    handleCleanupDueSelfies,
    isDataReady,
    loadedSchoolId,
  ]);

  const handleLogout = async () => {
    try {
      if (currentUser?.id) {
        try {
          await clearSchoolSnapshotsForUser(currentUser.id);
        } catch (cacheError) {
          console.warn("Could not clear this account's offline data cache:", cacheError);
        }
      }
      await signOutFromSupabase();
      clearSavedNavState();
      setBiometricSoftLock(null);
      setIsBiometricLocked(false);
      setBiometricLockError(null);
      setCurrentUser(null);
      setAuthenticatedRole(null);
      setOperationalRoleReady(false);
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

  const handleSwitchOperationalRole = async (
    nextRole: 'admin' | 'teacher',
    canUseAdminMode: boolean,
    canUseTeacherMode: boolean
  ) => {
    if (nextRole === currentRole) return;
    if (nextRole === 'admin' && !canUseAdminMode) return;
    if (nextRole === 'teacher' && !canUseTeacherMode) return;
    if (operationalRoleSwitchRef.current) return;
    operationalRoleSwitchRef.current = true;
    try {
      await setMyOperationalRole(nextRole);
    } catch (error) {
      emitAppToast({
        tone: 'error',
        title: 'เปลี่ยนโหมดไม่สำเร็จ',
        message: error instanceof Error ? error.message : String(error),
      });
      operationalRoleSwitchRef.current = false;
      return;
    }
    operationalRoleSwitchRef.current = false;
    setCurrentUser((user) => (user ? { ...user, role: nextRole } : user));
    setCurrentRole(nextRole);
    navCallbacksRef.current.onRoleSwitchNavigate(nextRole);
  };

  // Student & Avatar Handlers
  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [{ ...newStudent, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddStudents = (newStudents: Student[]) => {
    setStudents((prev) => [
      ...newStudents.map((student) => ({ ...student, schoolId: activeSchool.id })),
      ...prev,
    ]);
  };

  const syncOwnAvatarInDirectory = useCallback((avatarUrl: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'student') {
      setStudents((prev) => {
        const own = resolveOwnStudent(currentUser, prev);
        if (!own || own.avatarUrl === avatarUrl) return prev;
        const next = prev.map((s) => (s.id === own.id ? { ...s, avatarUrl } : s));
        if (activeSchool.id) {
          safeWriteJson(`${STORAGE_KEYS.studentsCachePrefix}${activeSchool.id}`, next);
        }
        return next;
      });
    } else if (['teacher', 'admin', 'super_admin'].includes(currentUser.role)) {
      setTeachers((prev) => {
        const own = resolveOwnTeacher(currentUser, prev);
        if (!own || own.avatarUrl === avatarUrl) return prev;
        const next = prev.map((t) => (t.id === own.id ? { ...t, avatarUrl } : t));
        if (activeSchool.id) {
          safeWriteJson(`${STORAGE_KEYS.teachersCachePrefix}${activeSchool.id}`, next);
        }
        return next;
      });
    }
  }, [currentUser, activeSchool.id]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    const previousStudent = students.find((s) => s.id === updatedStudent.id);
    const avatarChanged = Boolean(
      updatedStudent.avatarUrl && updatedStudent.avatarUrl !== (previousStudent?.avatarUrl || '')
    );
    const isOwnStudent = Boolean(
      currentUser &&
        currentUser.role === 'student' &&
        resolveOwnStudent(currentUser, [updatedStudent])
    );

    setStudents((prev) => {
      const next = prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
      if (activeSchool.id) {
        safeWriteJson(`${STORAGE_KEYS.studentsCachePrefix}${activeSchool.id}`, next);
      }
      return next;
    });

    if (isOwnStudent && avatarChanged) {
      setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: updatedStudent.avatarUrl } : prev));
    }

    if (avatarChanged && currentUser && activeSchool.id) {
      void persistAvatarChangeToSupabase({
        schoolId: activeSchool.id,
        userId: currentUser.id,
        userRole: currentUser.role,
        targetType: 'student',
        targetId: updatedStudent.id,
        avatarUrl: updatedStudent.avatarUrl,
        isSelf: isOwnStudent,
      })
        .then(({ resolvedUrl, persistedToDb }) => {
          if (resolvedUrl && resolvedUrl !== updatedStudent.avatarUrl) {
            setStudents((prev) =>
              prev.map((s) => (s.id === updatedStudent.id ? { ...s, avatarUrl: resolvedUrl } : s))
            );
            if (isOwnStudent) {
              setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: resolvedUrl } : prev));
            }
          }
          writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => {
            const nextStudents = { ...(prev.students || {}) };
            if (persistedToDb) {
              delete nextStudents[updatedStudent.id];
            } else if (resolvedUrl) {
              nextStudents[updatedStudent.id] = resolvedUrl;
            }
            return {
              ...prev,
              self: isOwnStudent ? (persistedToDb ? undefined : resolvedUrl) : prev.self,
              students: nextStudents,
            };
          });
        })
        .catch((error: unknown) => {
          console.warn('Could not persist student avatar:', error);
          writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => ({
            ...prev,
            self: isOwnStudent ? updatedStudent.avatarUrl : prev.self,
            students: { ...(prev.students || {}), [updatedStudent.id]: updatedStudent.avatarUrl },
          }));
        });
    }
  };

  const handleCleanupOrphanGrades = () => {
    if (!['admin', 'super_admin'].includes(currentRole)) {
      setDataSyncError('ต้องใช้สิทธิ์ผู้ดูแลโรงเรียนเพื่อลบผลการเรียนที่ไม่มีนักเรียนอ้างอิง');
      return;
    }
    const gradeIds = orphanedGrades.map((grade) => grade.id);
    if (gradeIds.length === 0) return;

    onConfirmModalRequested({
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
      await deleteStudentFromDb(activeSchool.id, studentId);

      setStudents((prev) => {
        const next = prev.filter((student) => student.id !== studentId);
        safeWriteJson(`${STORAGE_KEYS.studentsCachePrefix}${activeSchool.id}`, next);
        appendDeletedIdsCache('student', activeSchool.id, [studentId]);
        return next;
      });

      setCourses((prev) => {
        const next = prev.map((course) => ({
          ...course,
          enrolledStudentIds: (course.enrolledStudentIds || []).filter((id) => id !== studentId),
        }));
        safeWriteJson(`${STORAGE_KEYS.coursesCachePrefix}${activeSchool.id}`, next);
        return next;
      });

      setGrades((prev) => {
        const next = prev.filter((grade) => grade.studentId !== studentId);
        safeWriteJson(`${STORAGE_KEYS.gradesCachePrefix}${activeSchool.id}`, next);
        return next;
      });

      setAttendance((prev) => prev.filter((rec) => rec.studentId !== studentId));
      setPeriodAttendance((prev) => prev.filter((rec) => rec.studentId !== studentId));
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

  // Teacher Handlers
  const handleAddTeacher = (newTeacher: Teacher) => {
    const fullTeacher = { ...newTeacher, schoolId: activeSchool.id };
    setTeachers((prev) => [fullTeacher, ...prev]);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    const previousTeacher = teachers.find((t) => t.id === updatedTeacher.id);
    const avatarChanged = Boolean(
      updatedTeacher.avatarUrl && updatedTeacher.avatarUrl !== (previousTeacher?.avatarUrl || '')
    );
    const isOwnTeacher = Boolean(
      currentUser &&
        ['teacher', 'admin', 'super_admin'].includes(currentUser.role) &&
        resolveOwnTeacher(currentUser, [updatedTeacher])
    );

    setTeachers((prev) => {
      const next = prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t));
      if (activeSchool.id) {
        safeWriteJson(`${STORAGE_KEYS.teachersCachePrefix}${activeSchool.id}`, next);
      }
      return next;
    });

    if (isOwnTeacher && avatarChanged) {
      setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: updatedTeacher.avatarUrl } : prev));
    }

    if (avatarChanged && currentUser && activeSchool.id) {
      void persistAvatarChangeToSupabase({
        schoolId: activeSchool.id,
        userId: currentUser.id,
        userRole: currentUser.role,
        targetType: 'teacher',
        targetId: updatedTeacher.id,
        avatarUrl: updatedTeacher.avatarUrl,
        isSelf: isOwnTeacher,
      })
        .then(({ resolvedUrl, persistedToDb }) => {
          if (resolvedUrl && resolvedUrl !== updatedTeacher.avatarUrl) {
            setTeachers((prev) =>
              prev.map((t) => (t.id === updatedTeacher.id ? { ...t, avatarUrl: resolvedUrl } : t))
            );
            if (isOwnTeacher) {
              setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: resolvedUrl } : prev));
            }
          }
          writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => {
            const nextTeachers = { ...(prev.teachers || {}) };
            if (persistedToDb) {
              delete nextTeachers[updatedTeacher.id];
            } else if (resolvedUrl) {
              nextTeachers[updatedTeacher.id] = resolvedUrl;
            }
            return {
              ...prev,
              self: isOwnTeacher ? (persistedToDb ? undefined : resolvedUrl) : prev.self,
              teachers: nextTeachers,
            };
          });
        })
        .catch((error: unknown) => {
          console.warn('Could not persist teacher avatar:', error);
          writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => ({
            ...prev,
            self: isOwnTeacher ? updatedTeacher.avatarUrl : prev.self,
            teachers: { ...(prev.teachers || {}), [updatedTeacher.id]: updatedTeacher.avatarUrl },
          }));
        });
    }
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
          safeWriteJson(`${STORAGE_KEYS.teachersCachePrefix}${activeSchool.id}`, next);
          appendDeletedIdsCache('teacher', activeSchool.id, [teacherId]);
          return next;
        });
        setDataSyncError(null);
      } catch (error) {
        setDataSyncError(error instanceof Error ? error.message : String(error));
      }
    })();
  };

  const handlePurgeSampleTeachers = () => {
    onConfirmModalRequested({
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
          setTeachers((prev) => {
            const next = prev
              .filter((teacher) => !deletedIds.includes(teacher.id))
              .map((teacher) => deletedIds.includes(teacher.reportsToTeacherId || '')
                ? { ...teacher, reportsToTeacherId: undefined }
                : teacher);
            safeWriteJson(`${STORAGE_KEYS.teachersCachePrefix}${activeSchool.id}`, next);
            appendDeletedIdsCache('teacher', activeSchool.id, deletedIds);
            return next;
          });
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
      if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
        throw new Error('เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่นำเข้ารายชื่อครูได้');
      }
      await saveTeachersToDb(activeSchool.id, importedTeachers);
      setTeachers((prev) => [...importedTeachers, ...prev]);
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  // Courses & Enrollment
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
      safeWriteJson(`${STORAGE_KEYS.coursesCachePrefix}${activeSchool.id}`, next);
      appendDeletedIdsCache('course', activeSchool.id, courseIds);
      return next;
    });
    const remainingCourses = courses.filter((course) => !ids.has(course.id));
    setGrades((prev) => {
      const next = prev.filter((grade) => !ids.has(grade.courseId));
      safeWriteJson(`${STORAGE_KEYS.gradesCachePrefix}${activeSchool.id}`, next);
      syncStudentGpaFromGrades(next, undefined, remainingCourses);
      return next;
    });
    setTimetableSlots((prev) => {
      const next = prev.map((slot) => (
        slot.courseId && ids.has(slot.courseId) ? { ...slot, courseId: undefined } : slot
      ));
      safeWriteJson(`${STORAGE_KEYS.timetableSlotsCachePrefix}${activeSchool.id}`, next);
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
      await deleteCoursesFromDb(activeSchool.id, [courseId]);
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
      await deleteCoursesFromDb(activeSchool.id, courseIds);
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
          return { ...c, enrolledStudentIds: [...c.enrolledStudentIds, studentId] };
        }
        return c;
      });
      safeWriteJson(`${STORAGE_KEYS.coursesCachePrefix}${activeSchool.id}`, next);
      return next;
    });
  };

  const handleEnrollStudentsBatch = (courseId: string, studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setCourses((prev) => {
      const next = prev.map((c) => {
        if (c.id !== courseId) return c;
        const merged = Array.from(new Set([...(c.enrolledStudentIds || []), ...studentIds]));
        return { ...c, enrolledStudentIds: merged };
      });
      safeWriteJson(`${STORAGE_KEYS.coursesCachePrefix}${activeSchool.id}`, next);
      return next;
    });
  };

  const cleanupEnrollmentCancellation = async (courseId: string, studentIds: string[]) => {
    if (studentIds.length === 0) return;
    const removeSet = new Set(studentIds);
    const targetCourse = courses.find((c) => c.id === courseId);
    const nextEnrolledIds = (targetCourse?.enrolledStudentIds || []).filter((id) => !removeSet.has(id));

    try {
      await updateCourseEnrollmentInDb(activeSchool.id, courseId, nextEnrolledIds);
      await deleteGradesForEnrollmentFromDb(activeSchool.id, courseId, studentIds);

      setCourses((prev) => {
        const next = prev.map((c) => (
          c.id === courseId
            ? { ...c, enrolledStudentIds: (c.enrolledStudentIds || []).filter((id) => !removeSet.has(id)) }
            : c
        ));
        safeWriteJson(`${STORAGE_KEYS.coursesCachePrefix}${activeSchool.id}`, next);
        return next;
      });

      setGrades((prev) => {
        const next = prev.filter((g) => !(g.courseId === courseId && removeSet.has(g.studentId)));
        safeWriteJson(`${STORAGE_KEYS.gradesCachePrefix}${activeSchool.id}`, next);
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

  // Grades
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
          const student = activeSchoolStudents.find((s) => s.id === grade.studentId);
          const course = activeSchoolCourses.find((c) => c.id === grade.courseId);
          if (student) {
            void dispatchGradeAlert({
              student,
              course,
              grade,
              systemConfig,
              schoolId: activeSchool.id,
              isNewRecord,
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
    const duplicateReasons = getGradeDuplicateReasons(newGrades, activeSchoolGrades);
    if (duplicateReasons.length > 0) {
      onConfirmModalRequested({
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

  // Attendance, Leave & Campus Gates
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
      time?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
      confirmedByHomeroom?: boolean;
      confirmedByTeacherName?: string;
      correctionRequestId?: string;
    }
  ) => {
    const todayStr = extra?.date || getLocalDateString();
    const nowTime = extra?.time
      ? (extra.time.length === 5 ? `${extra.time}:00` : extra.time)
      : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const attendanceRecordId = extra?.recordId || `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    skipNextOfflineRowSyncRef.current = ['super_admin', 'admin', 'teacher'].includes(currentUser?.role || '');
    setAttendance((prev) => {
      const isCheckOut = extra?.recordType === 'check_out';
      const isCurrentUser = currentUser && (currentUser.id === studentId || currentUser.studentRecordId === studentId);
      const st = activeSchoolStudents.find((s) => s.id === studentId);
      const tc = activeSchoolTeachers.find((t) => t.id === studentId || t.id === extra?.teacherId);

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
        recordedBy: extra?.recordedBy,
        recordedByRole: extra?.recordedByRole,
        confirmedByHomeroom: extra?.confirmedByHomeroom,
        confirmedByTeacherName: extra?.confirmedByTeacherName,
        correctionRequestId: extra?.correctionRequestId,
      };

      if (isCheckOut) {
        const checkInIdx = prev.findIndex((a) => a.studentId === studentId && a.date === todayStr && a.recordType !== 'check_out');
        if (checkInIdx >= 0) {
          const updated = [...prev];
          updated[checkInIdx] = { ...updated[checkInIdx], checkOutTime: nowTime };
          return [newRecord, ...updated];
        }
      }

      return [newRecord, ...prev];
    });

    const isCheckOut = extra?.recordType === 'check_out';
    const st = activeSchoolStudents.find((s) => s.id === studentId);
    const tc = activeSchoolTeachers.find((t) => t.id === studentId || t.id === extra?.teacherId);
    const personName = extra?.userName || (st ? `${st.firstNameTh} ${st.lastNameTh}` : (tc ? tc.fullNameTh : 'นักเรียน/บุคลากร'));
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
      photoUrl: extra?.photoStoragePath || undefined,
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
      data: { studentId, status, date: todayStr },
    });

    if (
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

    if (activeSchool.id && taggedRecords.length > 0) {
      const firstRec = taggedRecords[0];
      const queuePeriodAttendance = () => {
        if (!currentUser?.id) return;
        enqueueOfflineAction({
          actionType: 'period_attendance',
          userId: currentUser.id,
          schoolId: activeSchool.id,
          description: `เช็คชื่อรายคาบรอซิงค์: ${firstRec.courseCode || firstRec.courseId} คาบ ${firstRec.periodNumber} (${taggedRecords.length} คน)`,
          payload: { records: taggedRecords },
        });
      };

      if (!isOnlineNow()) {
        queuePeriodAttendance();
      } else {
        void savePeriodAttendanceBatchToDb(activeSchool.id, taggedRecords).catch((error: unknown) => {
          queuePeriodAttendance();
          setDataSyncError(error instanceof Error ? error.message : String(error));
        });
      }
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
    setLeaveRequests((prev) => [taggedReq, ...prev]);

    if (activeSchool.id) {
      void (async () => {
        try {
          let finalAttachmentUrl = taggedReq.attachmentUrl;
          if (finalAttachmentUrl && finalAttachmentUrl.startsWith('data:')) {
            const uploadedUrl = await uploadSchoolAttachment(activeSchool.id, 'leave-attachments', finalAttachmentUrl);
            if (uploadedUrl) {
              finalAttachmentUrl = uploadedUrl;
              setLeaveRequests((prev) =>
                prev.map((item) => (item.id === taggedReq.id ? { ...item, attachmentUrl: uploadedUrl } : item))
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
    setLeaveRequests((prev) => prev.map((req) => {
      if (req.id !== reqId) return req;
      return {
        ...req,
        status,
        approvalRemarks: remarks || req.approvalRemarks,
        approvedBy: approverName,
      };
    }));

    if (activeSchool.id) {
      void updateLeaveRequestStatusInDb(activeSchool.id, reqId, status, approverName, remarks).catch((error: unknown) => {
        setDataSyncError(error instanceof Error ? error.message : String(error));
      });
    }

    if (status === 'approved') {
      const targetReq = leaveRequests.find((r) => r.id === reqId);
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
              userType: targetReq.userRole,
            }
          );
        }
      }
    }
  };

  const handleUpdateCampusGates = (gates: CampusGateGeofence[]) => {
    const cleaned = sanitizeSchoolCampusGates(gates, activeSchool.id);
    setCampusGates(cleaned);
    writeCampusGatesCache(activeSchool.id, cleaned);

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
            ? { ...s, latitude: gateLat, longitude: gateLng, geofenceRadiusMeters: primaryGate.radiusMeters }
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

  const handleSaveCampusGates = async (gates: CampusGateGeofence[]) => {
    if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
      throw new Error('เฉพาะผู้ดูแลระบบโรงเรียนเท่านั้นที่มีสิทธิ์แก้ไขพิกัดและจุดเช็คชื่อ');
    }
    const cleaned = sanitizeSchoolCampusGates(gates, activeSchool.id);
    const savedToDatabase = await saveSchoolCampusGates(activeSchool.id, cleaned);
    handleUpdateCampusGates(cleaned);
    return savedToDatabase;
  };

  const handleUpdateSchoolCoordinates = (lat: number, lng: number, radiusMeters: number) => {
    if (!isValidCoordinatePair(lat, lng)) return;
    const safeRadius = Number.isFinite(radiusMeters) && radiusMeters > 0 ? Math.round(radiusMeters) : 150;
    setActiveSchool((prev) => ({ ...prev, latitude: lat, longitude: lng, geofenceRadiusMeters: safeRadius }));
    setSchools((prev) =>
      prev.map((s) =>
        s.id === activeSchool.id
          ? { ...s, latitude: lat, longitude: lng, geofenceRadiusMeters: safeRadius }
          : s
      )
    );
    setSystemConfig((prev) => ({ ...prev, latitude: lat, longitude: lng, geofenceRadiusMeters: safeRadius }));
    safeWriteJson(`${STORAGE_KEYS.schoolGpsPrefix}${activeSchool.id}`, { lat, lng, radiusMeters: safeRadius });

    if (activeSchool.id) {
      saveSchoolGpsCoordinates(activeSchool.id, lat, lng, safeRadius).catch((err) => {
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
        nextGates = cleanedPrev.map((g, idx) =>
          g.isPrimary || idx === 0
            ? { ...g, lat, lng, latitude: lat, longitude: lng, radiusMeters: safeRadius }
            : g
        );
      }
      writeCampusGatesCache(activeSchool.id, nextGates);
      if (activeSchool.id) {
        saveSchoolCampusGates(activeSchool.id, nextGates).catch((err) => {
          console.warn('Could not sync updated primary gate to Supabase:', err);
        });
      }
      return nextGates;
    });
  };

  const handleQuickCheckIn = (studentId: string) => {
    handleRecordAttendance(studentId, 'present', 'สแกนบัตรผ่านประตูอัตโนมัติ (Gate Turnstile)');
  };

  // Announcements
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

  // LMS & Homework
  const handleCompleteLesson = async (lessonId: string) => {
    if (currentUser?.role !== 'student') throw new Error('Only students can complete lessons.');
    const lesson = activeSchoolLessons.find((item) => item.id === lessonId && item.schoolId === activeSchool.id);
    if (!lesson) throw new Error('The selected lesson is no longer available.');
    const enrolledCourseIds = new Set(
      filterCoursesForPersonalRole(activeSchoolCourses, currentUser, activeSchoolStudents).map((course) => course.id)
    );
    if (!enrolledCourseIds.has(lesson.courseId)) throw new Error('This lesson is not available for your enrolled courses.');
    const actorStudentId = resolveLinkedStudentsForUser(currentUser, activeSchoolStudents)[0]?.id || currentUser.studentRecordId;
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
    const course = activeSchoolCourses.find((item) => item.id === lesson.courseId);
    if (!course) throw new Error('Select a valid course in this school.');
    if (currentUser.role === 'teacher') {
      const teacher = activeSchoolTeachers.find((item) =>
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
    const assignment = activeSchoolAssignments.find((item) => item.id === assignmentId);
    if (!assignment || assignment.status !== 'active') throw new Error('The selected assignment is no longer available.');
    const enrolledCourseIds = new Set(
      filterCoursesForPersonalRole(activeSchoolCourses, currentUser, activeSchoolStudents).map((course) => course.id)
    );
    if (!enrolledCourseIds.has(assignment.courseId)) {
      throw new Error('This assignment is not available for your enrolled courses.');
    }
    const linkedStudent = resolveLinkedStudentsForUser(currentUser, activeSchoolStudents)[0];
    const student = activeSchoolStudents.find((item) => item.id === (linkedStudent?.id || currentUser.studentRecordId));
    if (!student) throw new Error('Your student record could not be found.');
    const alreadySubmitted = activeSchoolHomeworkSubmissions.some(
      (submission) =>
        submission.assignmentId === assignment.id &&
        submission.studentId === student.id &&
        submission.status !== 'pending'
    );
    if (alreadySubmitted) throw new Error('You have already submitted this assignment.');

    const course = activeSchoolCourses.find((item) => item.id === assignment.courseId);
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
    await saveHomeworkSubmissionToDb(activeSchool.id, submission);
    setHomeworkSubmissions((prev) => [submission, ...prev]);
    setAssignments((prev) => prev.map((item) => (
      item.id === assignment.id
        ? { ...item, submittedStudentIds: Array.from(new Set([...(item.submittedStudentIds || []), student.id])) }
        : item
    )));
  };

  // Questions & Central Exam Packs
  const handleAddQuestion = (question: QuizQuestion) => {
    const tagged = { ...question, schoolId: activeSchool.id };
    setQuestions((prev) => [tagged, ...prev.filter((q) => q.id !== tagged.id)]);
    void saveSchoolQuestionsBatch(activeSchool.id, [tagged]);
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
    void saveSchoolQuestionsBatch(activeSchool.id, tagged);
  };

  const handleClaimFreeCentralPack = async (pack: CentralExamPack) => {
    const res = await claimCentralExamPack({
      schoolId: activeSchool.id,
      pack,
      paymentMethod: 'free',
      claimedBy: currentUser?.fullNameTh || currentUser?.email || 'School Admin',
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
    const unclaimed = getUnclaimedPublishedPacks(centralExamPacks, schoolExamEntitlements);
    const freePacks = unclaimed.filter((p) => p.pricingType === 'free');
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
      slipUrl,
    });
    setSchoolExamEntitlements(res.allEntitlements);
    handleImportQuestions(res.addedQuestions);
    sendEduVerseNotification({
      title: `⚡ ปลดล็อกข้อสอบกลางทันที: ${pack.titleTh}`,
      body: `ปลดล็อก ${res.addedQuestions.length} ข้อเข้าคลังโรงเรียนแล้ว (แนบสลิป 100% รอตรวจสอบย้อนหลัง)`,
      category: 'system',
      schoolId: activeSchool.id,
      targetRoles: ['admin', 'super_admin'],
    });
  };

  // Arcade & Gamification
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
      upsertArcadePlayerProfile(activeSchool.id, updated).catch((err) => {
        console.warn('[Arcade] Failed to persist equipped cosmetic:', err);
      });
      return prev.map((p) => (p.userId === currentUser.id ? updated : p));
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
            .catch((reloadErr) => {
              console.warn('[Arcade] Failed to reload authoritative profile:', reloadErr);
            });
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
      handleEquipCosmetic({ frameId: item.frameId, title: item.titleLabel });
      return;
    }

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
    upsertArcadePlayerProfile(activeSchool.id, updatedProfile).catch((err) => {
      console.warn('[Arcade] Failed to sync profile after redeem:', err);
    });

    if (!isCosmetic) {
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
      createRewardRedemptionRequest(activeSchool.id, request).catch((err) => {
        console.warn('[Arcade] Failed to persist reward redemption request:', err);
      });
    }
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
    const scopedItem: RewardItem = { ...item, schoolId: activeSchool.id };
    setRewardItems((prev) => [scopedItem, ...prev]);
    saveSchoolCustomReward(activeSchool.id, scopedItem).catch((err) => {
      console.warn('[Arcade] Failed to save custom reward:', err);
    });
    triggerHaptic('success');
  };

  // Portfolio & Profile
  const handleAddPortfolioItem = (item: PortfolioItem) => {
    const taggedItem = { ...item, schoolId: activeSchool.id };
    setPortfolioItems((prev) => {
      const next = [taggedItem, ...prev];
      if (activeSchool.id) {
        writePortfolioItemsCache(
          activeSchool.id,
          next.filter((p) => belongsToSchool(p, activeSchool.id)),
        );
      }
      return next;
    });
    if (activeSchool.id) {
      const student = item.ownerRole === 'student'
        ? activeSchoolStudents.find((candidate) => candidate.id === item.ownerId)
          || (currentUser && item.ownerId === currentUser.id && currentUser.studentRecordId
            ? activeSchoolStudents.find((candidate) => candidate.id === currentUser.studentRecordId)
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
      if (activeSchool.id) {
        writePortfolioItemsCache(
          activeSchool.id,
          next.filter((p) => belongsToSchool(p, activeSchool.id)),
        );
      }
      return next;
    });
    if (activeSchool.id) {
      void deleteSchoolStudentRecord(activeSchool.id, 'portfolio', itemId).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setDataSyncError(message);
        setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      });
    }
  };

  const handleUpdateOwnAvatar = (avatarUrl: string) => {
    if (!currentUser) return;
    const cleanUrl = (avatarUrl || '').trim();
    if (!cleanUrl) return;

    setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: cleanUrl } : prev));
    syncOwnAvatarInDirectory(cleanUrl);

    if (activeSchool.id) {
      const ownStu = currentUser.role === 'student' ? resolveOwnStudent(currentUser, students) : undefined;
      const ownTch = ['teacher', 'admin', 'super_admin'].includes(currentUser.role)
        ? resolveOwnTeacher(currentUser, teachers)
        : undefined;
      const targetType = ownStu ? 'student' : ownTch ? 'teacher' : 'self';
      const targetId = ownStu?.id || ownTch?.id || currentUser.id;

      void persistAvatarChangeToSupabase({
        schoolId: activeSchool.id,
        userId: currentUser.id,
        userRole: currentUser.role,
        targetType,
        targetId,
        avatarUrl: cleanUrl,
        isSelf: true,
      })
        .then(({ resolvedUrl, persistedToDb }) => {
          const finalUrl = resolvedUrl || cleanUrl;
          if (finalUrl !== cleanUrl) {
            setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: finalUrl } : prev));
            syncOwnAvatarInDirectory(finalUrl);
          }
          writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => ({
            ...prev,
            self: persistedToDb ? undefined : finalUrl,
          }));
        })
        .catch((error: unknown) => {
          console.warn('Could not persist own avatar:', error);
          writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => ({
            ...prev,
            self: cleanUrl,
          }));
        });
    }
  };

  const handleUpdateUserProfile = async (updatedUser: AuthUser) => {
    if (!currentUser) return;
    let resolvedAvatarUrl = updatedUser.avatarUrl;
    const avatarChanged = Boolean(updatedUser.avatarUrl && updatedUser.avatarUrl !== currentUser.avatarUrl);

    const buildUser = (avatarUrl: string): AuthUser => ({
      ...currentUser,
      fullNameTh: updatedUser.fullNameTh,
      fullNameEn: updatedUser.fullNameEn,
      avatarUrl,
      phone: updatedUser.phone,
      role: currentUser?.role || 'student',
      schoolId: activeSchool.id,
    });

    try {
      if (avatarChanged && activeSchool.id) {
        const ownStu = currentUser.role === 'student' ? resolveOwnStudent(currentUser, students) : undefined;
        const ownTch = ['teacher', 'admin', 'super_admin'].includes(currentUser.role)
          ? resolveOwnTeacher(currentUser, teachers)
          : undefined;
        const avatarRes = await persistAvatarChangeToSupabase({
          schoolId: activeSchool.id,
          userId: currentUser.id,
          userRole: currentUser.role,
          targetType: ownStu ? 'student' : ownTch ? 'teacher' : 'self',
          targetId: ownStu?.id || ownTch?.id || currentUser.id,
          avatarUrl: updatedUser.avatarUrl,
          isSelf: true,
        });
        if (avatarRes.resolvedUrl) {
          resolvedAvatarUrl = avatarRes.resolvedUrl;
        }
        writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => ({
          ...prev,
          self: avatarRes.persistedToDb ? undefined : resolvedAvatarUrl,
        }));
      }

      const user = buildUser(resolvedAvatarUrl);
      await updateUserProfileInSupabase(user);
      setCurrentUser(user);
      syncOwnAvatarInDirectory(user.avatarUrl);
      setDataSyncError(null);
    } catch (error) {
      if (avatarChanged && activeSchool.id && resolvedAvatarUrl) {
        writePendingAvatarCache(activeSchool.id, currentUser.id, (prev) => ({
          ...prev,
          self: resolvedAvatarUrl,
        }));
      }
      setDataSyncError(error instanceof Error ? error.message : String(error));
      return;
    }
  };

  // Timetable & Periods
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
      if (currentSlot.id !== slot.id || !belongsToSchool(currentSlot, activeSchool.id)) {
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
    await saveTimetableSlotsToDb(activeSchool.id, next);
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
      belongsToSchool(slot, activeSchool.id) &&
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
    await saveSchoolPeriodTimes(activeSchool.id, periods);
    if (updatedActiveTermSlots.length > 0) {
      await saveTimetableSlotsToDb(activeSchool.id, updatedActiveTermSlots);
    }
    setSchoolPeriods(periods);
    const updatedSlotsById = new Map(updatedActiveTermSlots.map((slot) => [slot.id, slot]));
    setTimetableSlots((prev) => prev.map((slot) => updatedSlotsById.get(slot.id) || slot));
    setDataSyncError(null);
  };

  // Behavior, SDQ, Infirmary, Homework & Grade CRUD
  const handleAddBehaviorRecord = (record: BehaviorRecord) => {
    const taggedRecord = { ...record, schoolId: activeSchool.id };
    setBehaviorRecords((prev) => [taggedRecord, ...prev]);
    if (activeSchool.id) {
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
    if (activeSchool.id) {
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
    if (activeSchool.id) {
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
    const course = activeSchoolCourses.find((item) => item.id === assignment.courseId);
    if (!course) throw new Error('Select a course from this school before creating an assignment.');
    const taggedAssignment: Assignment = {
      ...assignment,
      schoolId: activeSchool.id,
      courseCode: course.code,
    };
    await saveSchoolAssignmentToDb(activeSchool.id, taggedAssignment, currentUser?.id);
    setAssignments((prev) => [taggedAssignment, ...prev.filter((item) => item.id !== taggedAssignment.id)]);
  };

  const handleAddHomeworkSubmission = async (sub: HomeworkSubmission) => {
    if (currentUser?.role !== 'student') throw new Error('Only students can submit an assignment.');
    if (schoolPermissions.student_submit_homework === false) {
      throw new Error('Online homework submission is disabled by the school.');
    }
    const linkedStudentIds = resolveLinkedStudentsForUser(currentUser, activeSchoolStudents).map((student) => student.id);
    if (!linkedStudentIds.includes(sub.studentId) && currentUser.studentRecordId !== sub.studentId) {
      throw new Error('You can only submit work for your own student account.');
    }
    const assignment = activeSchoolAssignments.find((item) => item.id === sub.assignmentId);
    const student = activeSchoolStudents.find((item) => item.id === sub.studentId);
    if (!assignment || assignment.status !== 'active') throw new Error('The selected assignment is no longer available.');
    const enrolledCourseIds = new Set(
      filterCoursesForPersonalRole(activeSchoolCourses, currentUser, activeSchoolStudents).map((course) => course.id)
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
    await saveHomeworkSubmissionToDb(activeSchool.id, taggedSubmission);
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
    const submission = activeSchoolHomeworkSubmissions.find((item) => item.id === id);
    if (!submission) throw new Error('Homework submission not found.');
    if (!Number.isFinite(score) || score < 0 || score > submission.maxScore) {
      throw new Error(`Score must be between 0 and ${submission.maxScore}.`);
    }
    const gradedBy = currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email || 'ครูผู้สอน';
    await saveHomeworkGradeToDb(activeSchool.id, id, score, feedback, gradedBy);
    setHomeworkSubmissions((prev) =>
      prev.map((item) => item.id === id
        ? { ...item, score, teacherFeedback: feedback, gradedAt: new Date().toISOString(), gradedBy, status: 'graded' }
        : item)
    );
  };

  const handleNotifyGradeChange = async (grade: GradeRecord, isNewRecord = false) => {
    const student = activeSchoolStudents.find((s) => s.id === grade.studentId);
    if (!student) return;
    const course = activeSchoolCourses.find((c) => c.id === grade.courseId);
    return dispatchGradeAlert({
      student,
      course,
      grade,
      systemConfig,
      schoolId: activeSchool.id,
      isNewRecord,
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
        (g) => belongsToSchool(g, activeSchool.id) && g.studentId === created.studentId && g.courseId === created.courseId
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
    await deleteStaleGradesFromDb(activeSchool.id, [gradeId]);
    setGrades((prev) => {
      const next = prev.filter((g) => g.id !== gradeId);
      safeWriteJson(`${STORAGE_KEYS.gradesCachePrefix}${activeSchool.id}`, next);
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
          (g) => belongsToSchool(g, activeSchool.id) && g.courseId === courseId && g.studentId === entry.studentId
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
        const course = activeSchoolCourses.find((c) => c.id === courseId);
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
          },
          ...previous.filter((record) => record.id !== item.id),
        ]);
        return true;
      }
      if (item.actionType === 'period_attendance' && Array.isArray(payload.records)) {
        const queuedRecords = (payload.records as PeriodAttendanceRecord[]).map((rec) => ({
          ...rec,
          schoolId: rec.schoolId || item.schoolId,
        }));
        if (queuedRecords.length > 0) {
          await savePeriodAttendanceBatchToDb(item.schoolId, queuedRecords);
          setPeriodAttendance((previous) => {
            const updated = [...previous];
            for (const rec of queuedRecords) {
              const idx = updated.findIndex(
                (p) =>
                  p.id === rec.id ||
                  (p.studentId === rec.studentId &&
                    p.courseId === rec.courseId &&
                    p.date === rec.date &&
                    p.periodNumber === rec.periodNumber &&
                    (p.recordType || 'check_in') === (rec.recordType || 'check_in'))
              );
              if (idx >= 0) updated[idx] = rec;
              else updated.push(rec);
            }
            return updated;
          });
        }
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

  return {
    schools,
    setSchools,
    activeSchool,
    setActiveSchool,
    currentUser,
    setCurrentUser,
    isPasswordRecovery,
    setIsPasswordRecovery,
    isSuperAdminSchoolView,
    setIsSuperAdminSchoolView,
    isDataReady,
    loadedSchoolId,
    dataLoadError,
    isUsingCachedSchoolData,
    dataSyncError,
    setDataSyncError,
    dataSyncWarnings,
    setDataSyncWarnings,
    dataSyncSummary,
    orphanedGrades,
    isCleaningOrphanedGrades,
    isBiometricLocked,
    isUnlockingBiometrics,
    biometricLockError,
    rolePermissions,
    setRolePermissions,
    promotions,
    setPromotions,
    subscriptionPlans,
    setSubscriptionPlans,
    superAdminConfigError,
    setSuperAdminConfigError,
    currentRole,
    authenticatedRole,
    operationalRoleReady,
    students,
    setStudents,
    teachers,
    courses,
    grades,
    attendance,
    announcements,
    systemConfig,
    setSystemConfig,
    lessons,
    setLessons,
    assignments,
    questions,
    playerScores,
    rewardItems,
    rewardRedemptions,
    periodAttendance,
    portfolioItems,
    timetableSlots,
    schoolPeriods,
    behaviorRecords,
    sdqAssessments,
    infirmaryVisits,
    homeworkSubmissions,
    campusGates,
    leaveRequests,
    centralExamPacks,
    schoolExamEntitlements,
    featureFlagsBySchool,
    schoolPermissions,
    loadAttendanceHistory,
    handleLogin,
    handleLogout,
    handleLockWithBiometrics,
    handleUnlockBiometricScreen,
    handleSelectActiveSchool,
    handleViewSchool,
    handleToggleSchoolStatus,
    handleUpdateSchool,
    handleUpdateAcademicPeriod,
    handleCopyCoursesToSchool,
    handleApplyAcademicRollover,
    handleUpdateSchoolFeatureFlags,
    handleCleanupDueSelfies,
    handleSwitchOperationalRole,
    handleAddStudent,
    handleAddStudents,
    handleUpdateStudent,
    handleCleanupOrphanGrades,
    handleDeleteStudent,
    handlePurgeSampleStudents,
    handleAddTeacher,
    handleUpdateTeacher,
    handleDeleteTeacher,
    handlePurgeSampleTeachers,
    handleImportStudents,
    handleImportTeachers,
    handleAddCourse,
    handleUpdateCourse,
    handleDeleteCourse,
    handleDeleteCourses,
    handleEnrollStudent,
    handleEnrollStudentsBatch,
    handleUnenrollStudent,
    handleUnenrollStudentsBatch,
    handleImportCourses,
    handleImportEnrollment,
    handleImportGrades,
    handleRecordAttendance,
    handleBulkImportAttendance,
    handleRecordPeriodAttendance,
    handleAddLeaveRequest,
    handleUpdateLeaveStatus,
    handleUpdateCampusGates,
    handleSaveCampusGates,
    handleUpdateSchoolCoordinates,
    handleQuickCheckIn,
    handleAddAnnouncement,
    handleCompleteLesson,
    handleSaveSchoolLesson,
    handleSubmitAssignment,
    handleAddQuestion,
    handleImportQuestions,
    handleClaimFreeCentralPack,
    handleClaimAllFreeCentralPacks,
    handlePurchaseCentralPack,
    handleEquipCosmetic,
    handleEarnRewards,
    handleRecordMilestoneActivity,
    handleRedeemReward,
    handleReviewRedemption,
    handleCreateCustomReward,
    handleAddPortfolioItem,
    handleDeletePortfolioItem,
    handleUpdateOwnAvatar,
    handleUpdateUserProfile,
    handleAddTimetableSlot,
    handleUpdateTimetableSlot,
    handleDeleteTimetableSlot,
    handleImportTimetableSlots,
    handleSaveSchoolPeriods,
    handleAddBehaviorRecord,
    handleAddSdqAssessment,
    handleAddInfirmaryVisit,
    handleAddHomeworkAssignment,
    handleAddHomeworkSubmission,
    handleGradeHomeworkSubmission,
    handleNotifyGradeChange,
    handleAddGrade,
    handleUpdateGrade,
    handleDeleteGrade,
    handleSyncQuizScoresToGradebook,
    handleSyncOfflineItem,
  };
}
