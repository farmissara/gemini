import React, { useEffect, useRef, useState } from 'react';
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
  Lesson,
  Assignment,
  QuizQuestion,
  PlayerScore,
  RewardItem,
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
  INITIAL_SYSTEM_CONFIG,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_SUBSCRIPTION_PLANS,
} from './data/mockData';
import {
  restoreSupabaseSession,
  signOutFromSupabase,
  updateSchoolSettingsInSupabase,
  updateSchoolStatusInSupabase,
  updateUserProfileInSupabase,
} from './lib/authDb';
import type { AuthContext } from './lib/authDb';
import { fetchCoordinationMessages } from './lib/coordinationDesk';
import { 
  loadSchoolData, 
  saveSchoolCampusGates, 
  saveSchoolGpsCoordinates, 
  saveSchoolPeriodTimes, 
  syncDataToSupabase, 
  SUPABASE_PATCH_MIGRATION_SQL,
  deleteStudentFromDb,
  deleteTeacherFromDb,
  deleteCoursesFromDb,
  saveTeachersToDb,
  saveTimetableSlotsToDb,
  deleteTimetableSlotFromDb
} from './lib/supabase';
import { DEFAULT_SCHOOL_PERIODS } from './lib/schoolPeriods';
import {
  calculateGrade,
  DEFAULT_SEMESTER_OPTIONS,
  DEFAULT_STAFF_POSITION_OPTIONS,
} from './lib/schoolSettings';
import {
  getDuplicateIdWarnings,
  getDuplicateRecordWarnings,
  getGradeDuplicateReasons,
} from './lib/duplicateRecords';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { AuthLayout } from './components/layout/AuthLayout';
import { SchoolSwitcherModal } from './components/modals/SchoolSwitcherModal';
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { TeachersView } from './views/TeachersView';
import { CoursesView } from './views/CoursesView';
import { AttendanceView } from './views/AttendanceView';
import { MobileAttendanceView } from './views/MobileAttendanceView';
import { EduBattleGameView } from './views/EduBattleGameView';
import { PortfolioView } from './views/PortfolioView';
import { GradebookView } from './views/GradebookView';
import { BillingView } from './views/BillingView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { LmsClassroomView } from './views/LmsClassroomView';
import { ParentPortalView } from './views/ParentPortalView';
import { ReportCardModal } from './components/modals/ReportCardModal';
import { StudentDetailModal } from './components/modals/StudentDetailModal';
import { TimetableScheduleView } from './views/TimetableScheduleView';
import { BehaviorSdqView } from './views/BehaviorSdqView';
import { DigitalIdCardView } from './views/DigitalIdCardView';
import { InfirmaryHealthView } from './views/InfirmaryHealthView';
import { HomeworkTrackerView } from './views/HomeworkTrackerView';
import { SuperAdminConsoleView } from './views/SuperAdminConsoleView';
import { SchoolPermissionSettingsView } from './views/SchoolPermissionSettingsView';
import { EduBattleRoyale3DView } from './views/EduBattleRoyale3DView';
import { SubjectLabSimulationView } from './views/SubjectLabSimulationView';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { SystemSettingsView } from './views/SystemSettingsView';
import { SchoolGpsSettingsCard } from './components/SchoolGpsSettingsCard';
import { SchoolGpsModal } from './components/modals/SchoolGpsModal';
import { DataImportExportModal } from './components/modals/DataImportExportModal';
import { ModuleGuideModal } from './components/modals/ModuleGuideModal';
import { SchoolOnboardingTutorModal } from './components/modals/SchoolOnboardingTutorModal';
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { AiDiagnosticLearningView } from './views/AiDiagnosticLearningView';
import { HallOfFame3DView } from './views/HallOfFame3DView';
import { ExecutiveEarlyWarningView } from './views/ExecutiveEarlyWarningView';
import { StudyStreakQuestPassView } from './views/StudyStreakQuestPassView';
import { CoopBossRaidView } from './views/CoopBossRaidView';
import { SocraticTutorView } from './views/SocraticTutorView';
import { RealWorldSnapQuestView } from './views/RealWorldSnapQuestView';
import { MobileAppShell } from './components/layout/MobileAppShell';
import { NotificationCenterModal } from './components/modals/NotificationCenterModal';
import { AdminSuperAdminDeskView } from './views/AdminSuperAdminDeskView';
import { ExecutiveMonitorView } from './views/ExecutiveMonitorView';
import { CentralExamHubView, CentralExamNotificationPopup } from './views/CentralExamHubView';
import {
  buildCentralExamSignature,
  CENTRAL_EXAMS_UPDATED_EVENT,
  claimCentralExamPack,
  fetchCentralExamPacks,
  fetchSchoolExamEntitlements,
  fetchSchoolPersistedQuestions,
  getUnclaimedPublishedPacks,
  hasSeenCentralExamPopup,
  markCentralExamPopupSeen,
  saveSchoolQuestionsBatch,
} from './lib/centralExamBank';
import { getStoredNotifications, sendEduVerseNotification } from './lib/pushNotifications';
import { getParentUnreadNotificationCount, sendPrivateParentNotification } from './lib/parentNotifications';
import { getLocalDateString } from './lib/date';
import type { OfflineQueueItem } from './lib/offlineSync';
import { appendAuditLog } from './lib/auditLog';
import { getSchoolFeatureFlags } from './lib/schoolFeatureFlags';
import { LayoutDashboard, QrCode, Gamepad2, Briefcase, Users, X, User, Sparkles, AlertTriangle, Check, Copy, Database } from 'lucide-react';

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
  const isDemoMode = false;
  const [isSuperAdminSchoolView, setIsSuperAdminSchoolView] = useState(false);
  const skipNextSuperAdminSyncRef = useRef(false);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [loadedSchoolId, setLoadedSchoolId] = useState<string | null>(null);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [dataSyncError, setDataSyncError] = useState<string | null>(null);
  const [dataSyncWarnings, setDataSyncWarnings] = useState<string[]>([]);
  const [dataSyncSummary, setDataSyncSummary] = useState<string | null>(null);
  const [showSchemaMigrationModal, setShowSchemaMigrationModal] = useState(false);
  const [copiedMigrationSql, setCopiedMigrationSql] = useState(false);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());

  const handleCopyMigrationSql = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(SUPABASE_PATCH_MIGRATION_SQL);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = SUPABASE_PATCH_MIGRATION_SQL;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedMigrationSql(true);
      window.setTimeout(() => setCopiedMigrationSql(false), 2500);
    } catch (err) {
      console.warn('Could not copy SQL migration:', err);
    }
  };

  // Super Admin Management State (RBAC, Promotions, Subscription Plans)
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>(INITIAL_ROLE_PERMISSIONS);
  const [promotions, setPromotions] = useState<PromotionCampaign[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SchoolSubscriptionPlan[]>(INITIAL_SUBSCRIPTION_PLANS);

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
      const periodNumber = periodStr && !Number.isNaN(Number(periodStr)) ? Number(periodStr) : undefined;
      const isPeriodDeepLink = tab === 'mobile_checkin' || subTab === 'period_checkin' || Boolean(courseId);
      if (!isPeriodDeepLink) return null;
      return {
        subTab: (subTab === 'leave_request' || subTab === 'period_checkin' || subTab === 'teacher_proxy'
          ? subTab
          : 'period_checkin') as 'selfie_mobile' | 'leave_request' | 'teacher_proxy' | 'period_checkin',
        courseId,
        periodNumber,
        date,
        code,
      };
    } catch {
      return null;
    }
  })();

  // Navigation, Mode, Theme, Language & Mobile Drawer State
  const [currentTab, setCurrentTab] = useState<NavTab>(deepLinkParams ? 'mobile_checkin' : 'dashboard');
  const [superAdminSubTab, setSuperAdminSubTab] = useState<'approvals' | 'permissions' | 'promotions' | 'schools' | 'central_exams' | 'exam_payment'>('approvals');
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [programMode, setProgramMode] = useState<AppProgramMode>('school_erp');
  const [lang, setLang] = useState<AppLanguage>('th');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [themePalette, setThemePalette] = useState<ThemePalette>('light_warm');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dismissedDuplicateWarning, setDismissedDuplicateWarning] = useState(false);
  const [adaptivePracticeTopic, setAdaptivePracticeTopic] = useState<AdaptivePracticeTopic | null>(null);
  const [featureFlagsBySchool, setFeatureFlagsBySchool] = useState<Record<string, SchoolFeatureFlags>>({});

  useEffect(() => {
    setDismissedDuplicateWarning(false);
  }, [activeSchool.id]);

  // Screen size detection and user view preference ('auto' | 'mobile' | 'desktop')
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [deviceViewPreference, setDeviceViewPreference] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
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

  // Load and synchronize school GPS campus gates per active school
  useEffect(() => {
    try {
      const savedGates = localStorage.getItem(`eduverse_campus_gates_${activeSchool.id}`);
      if (savedGates) {
        setCampusGates(JSON.parse(savedGates));
      } else if (activeSchool.latitude && activeSchool.longitude) {
        setCampusGates([
          {
            id: `gate_${activeSchool.id}_1`,
            schoolId: activeSchool.id,
            nameTh: `ประตูหน้า ${activeSchool.nameTh}`,
            nameEn: `Main Gate ${activeSchool.nameEn}`,
            lat: activeSchool.latitude,
            lng: activeSchool.longitude,
            latitude: activeSchool.latitude,
            longitude: activeSchool.longitude,
            radiusMeters: activeSchool.geofenceRadiusMeters || 120,
            isPrimary: true,
            isActive: true,
            type: 'main_gate',
          }
        ]);
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
  const [showOnboardingTutorModal, setShowOnboardingTutorModal] = useState<boolean>(false);
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);
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
    if (currentUser?.role === 'parent') {
      let active = true;
      const updateUnread = async () => {
        try {
          const count = await getParentUnreadNotificationCount();
          if (active) setUnreadNotifCount(count);
        } catch (error) {
          console.error('Could not refresh private child notification count:', error);
        }
      };
      void updateUnread();
      const interval = window.setInterval(updateUnread, 30000);
      return () => {
        active = false;
        window.clearInterval(interval);
      };
    }

    const updateUnread = () => {
      const items = getStoredNotifications();
      setUnreadNotifCount(items.filter(n => !n.read).length);
    };
    updateUnread();
    window.addEventListener('eduverse:notification', updateUnread);
    return () => {
      window.removeEventListener('eduverse:notification', updateUnread);
    };
  }, [currentUser?.id, currentUser?.role]);

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
        const [packs, entitlements, persistedSchoolQs] = await Promise.all([
          fetchCentralExamPacks(isDemoMode),
          fetchSchoolExamEntitlements(activeSchool.id, isDemoMode),
          fetchSchoolPersistedQuestions(activeSchool.id, isDemoMode),
        ]);
        if (!active) return;
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
  }, [currentUser?.id, activeSchool.id, isDemoMode]);

  const unclaimedCentralPacks = getUnclaimedPublishedPacks(centralExamPacks, schoolExamEntitlements);

  // Auto-open pop-up notification for School Admin whenever newly published central packs exist
  useEffect(() => {
    if (!currentUser || currentRole !== 'admin' || programMode !== 'school_erp') {
      return;
    }
    if (unclaimedCentralPacks.length === 0) {
      setShowCentralExamPopup(false);
      return;
    }
    const sig = buildCentralExamSignature(unclaimedCentralPacks);
    if (!hasSeenCentralExamPopup(activeSchool.id, sig)) {
      setShowCentralExamPopup(true);
    }
  }, [currentUser?.id, currentRole, programMode, activeSchool.id, centralExamPacks, schoolExamEntitlements]);

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
  const schoolTimetableSlots = timetableSlots.filter((t) => !t.schoolId || t.schoolId === activeSchool.id);
  const schoolBehaviorRecords = behaviorRecords.filter((b) => !b.schoolId || b.schoolId === activeSchool.id);
  const schoolSdqAssessments = sdqAssessments.filter((s) => !s.schoolId || s.schoolId === activeSchool.id);
  const schoolInfirmaryVisits = infirmaryVisits.filter((i) => !i.schoolId || i.schoolId === activeSchool.id);
  const schoolHomeworkSubmissions = homeworkSubmissions.filter((h) => !h.schoolId || h.schoolId === activeSchool.id);
  const activeFeatureFlags = activeSchool.id
    ? (featureFlagsBySchool[activeSchool.id] || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise'))
    : undefined;
  const duplicateWarnings = [
    ...getDuplicateIdWarnings({
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
    ...getDuplicateRecordWarnings({
    students: schoolStudents,
    teachers: schoolTeachers,
    courses: schoolCourses,
    grades: schoolGrades,
    invoices: schoolInvoices,
    timetableSlots: schoolTimetableSlots,
    }),
  ];

  // Keep the live Supabase account flow separate from the local demo session.
  const handleLogin = (context: AuthContext) => {
    const school = context.school;
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
    if (context.user.role === 'super_admin') {
      setProgramMode('school_erp');
      setCurrentTab('super_admin_console');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleUpdateSchool = async (updates: Partial<School>) => {
    try {
      if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
        throw new Error('เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่แก้ไขการตั้งค่าโรงเรียนได้');
      }
      if (!isDemoMode) await updateSchoolSettingsInSupabase(activeSchool.id, updates);
      if (updates.gradingSystem && updates.gradingSystem !== systemConfig.gradingSystem) {
        setGrades((current) => current.map((grade) => {
          if (grade.schoolId && grade.schoolId !== activeSchool.id) return grade;
          const nextGrade = calculateGrade(grade.totalScore, updates.gradingSystem || 'thai');
          return {
            ...grade,
            letterGrade: nextGrade.letter,
            gradePoint: nextGrade.point,
          };
        }));
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

  const handleUpdateAcademicPeriod = async (academicYear: string, currentSemester: string) => {
    await handleUpdateSchool({ academicYear, currentSemester });
  };

  const handleUpdateSchoolFeatureFlags = (schoolId: string, flags: SchoolFeatureFlags) => {
    setFeatureFlagsBySchool((prev) => ({ ...prev, [schoolId]: flags }));
    if (currentUser) {
      appendAuditLog(schoolId, {
        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
        actorRole: currentUser.role,
        actionType: 'feature_flags_update',
        targetLabel: flags.tier,
        details: `อัปเดตแพ็กเกจโมดูล (${flags.tier})`,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOutFromSupabase();
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

  const navigateToAppTab = (tab: NavTab) => {
    setIsGamePlaying(false);
    if (currentRole === 'super_admin' && tab === 'super_admin_console') {
      setIsSuperAdminSchoolView(false);
      setProgramMode('school_erp');
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
    let active = true;
    restoreSupabaseSession()
      .then((context) => {
        if (active && context) handleLogin(context);
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
    loadSchoolData(activeSchool.id)
      .then((data) => {
        if (!active) return;
        if (currentUser.role === 'super_admin') {
          skipNextSuperAdminSyncRef.current = true;
        }
        let resolvedStudents = data.students;
        let resolvedTeachers = data.teachers;
        if (typeof window !== 'undefined') {
          try {
            const deletedStudentIds: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_student_ids_${activeSchool.id}`) || '[]');
            const deletedTeacherIds: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`) || '[]');
            if (deletedStudentIds.length > 0) {
              resolvedStudents = resolvedStudents.filter(s => !deletedStudentIds.includes(s.id));
            }
            if (deletedTeacherIds.length > 0) {
              resolvedTeachers = resolvedTeachers.filter(t => !deletedTeacherIds.includes(t.id));
            }
          } catch (e) {
            console.warn('Could not parse deleted IDs from localStorage:', e);
          }
        }
        setStudents(resolvedStudents);
        setTeachers(resolvedTeachers);
        setCourses(data.courses);
        setGrades(data.grades.map((grade) => {
          const currentGrade = calculateGrade(grade.totalScore, systemConfig.gradingSystem);
          return {
            ...grade,
            letterGrade: currentGrade.letter,
            gradePoint: currentGrade.point,
          };
        }));
        setAttendance(data.attendance);
        let resolvedInvoices = data.invoices;
        if (typeof window !== 'undefined') {
          try {
            const rawSlips = localStorage.getItem(`eduverse_invoice_slips_v1_${activeSchool.id}`);
            if (rawSlips) {
              const slipMap = JSON.parse(rawSlips) as Record<string, Partial<TuitionInvoice>>;
              resolvedInvoices = resolvedInvoices.map((inv) =>
                slipMap[inv.id] ? { ...inv, ...slipMap[inv.id] } : inv
              );
            }
          } catch {
            // ignore corrupt local slip cache
          }
        }
        setInvoices(resolvedInvoices);
        setAnnouncements(data.announcements);
        setSchoolPeriods(data.schoolPeriods);
        setTimetableSlots(data.timetableSlots || []);
        if (data.campusGates.length > 0) {
          setCampusGates(data.campusGates);
          try {
            localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(data.campusGates));
          } catch (error) {
            console.warn('Could not cache school check-in points locally:', error);
          }
        }
        // Real schools keep only their own school-scoped items (no sample data)
        setLessons(prev => prev.length > 0 ? prev.filter(l => l.schoolId === activeSchool.id) : []);
        setAssignments(prev => prev.length > 0 ? prev.filter(a => a.schoolId === activeSchool.id) : []);
        setQuestions(prev => prev.length > 0 ? prev.filter(q => q.schoolId === activeSchool.id) : []);
        setPlayerScores(prev => prev);
        setRewardItems(prev => prev);
        setPeriodAttendance(prev => prev.length > 0 ? prev.filter(p => p.schoolId === activeSchool.id) : []);
        setPortfolioItems(prev => prev.length > 0 ? prev.filter(p => p.schoolId === activeSchool.id) : []);
        setBehaviorRecords(prev => prev.length > 0 ? prev.filter(b => b.schoolId === activeSchool.id) : []);
        setSdqAssessments(prev => prev.length > 0 ? prev.filter(s => s.schoolId === activeSchool.id) : []);
        setInfirmaryVisits(prev => prev.length > 0 ? prev.filter(i => i.schoolId === activeSchool.id) : []);
        setHomeworkSubmissions(prev => prev.length > 0 ? prev.filter(h => h.schoolId === activeSchool.id) : []);
        setLeaveRequests(prev => prev.length > 0 ? prev.filter(l => l.schoolId === activeSchool.id) : []);
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
    if (
      !currentUser ||
      isDemoMode ||
      (currentUser.role === 'super_admin' && !isSuperAdminSchoolView) ||
      !['super_admin', 'admin', 'teacher'].includes(currentUser.role) ||
      !isDataReady ||
      loadedSchoolId !== activeSchool.id
    ) return;
    if (currentUser.role === 'super_admin' && skipNextSuperAdminSyncRef.current) {
      skipNextSuperAdminSyncRef.current = false;
      return;
    }
    const timeoutId = window.setTimeout(() => {
      syncQueueRef.current = syncQueueRef.current.then(async () => {
        const result = await syncDataToSupabase({
          school: activeSchool,
          role: currentUser.role,
          students: students.filter((item) => item.schoolId === activeSchool.id),
          teachers: teachers.filter((item) => !item.schoolId || item.schoolId === activeSchool.id),
          courses: courses.filter((item) => item.schoolId === activeSchool.id),
          grades: grades.filter((item) => item.schoolId === activeSchool.id),
          attendance: attendance.filter((item) => item.schoolId === activeSchool.id),
          invoices: invoices.filter((item) => item.schoolId === activeSchool.id),
          announcements: announcements.filter((item) => item.schoolId === activeSchool.id),
        });
        setDataSyncError(result.success ? null : result.message);
        setDataSyncWarnings(result.warnings || []);
        setDataSyncSummary(result.warnings && result.warnings.length > 0 ? result.message : null);
      }).catch((error: unknown) => {
        setDataSyncError(error instanceof Error ? error.message : String(error));
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

  const handleDeleteStudent = (studentId: string) => {
    void (async () => {
      try {
        await deleteStudentFromDb(activeSchool.id, studentId);
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
        setDataSyncError(null);
      } catch (error) {
        setDataSyncError(error instanceof Error ? error.message : String(error));
      }
    })();
  };

  const handlePurgeSampleStudents = () => {
    if (!confirm('ยืนยันล้างข้อมูลนักเรียนตัวอย่างทั้งหมด (Sample Students) ออกจากโรงเรียนนี้หรือไม่? ข้อมูลจริงที่สร้างใหม่จะไม่ได้รับผลกระทบ')) return;
    void (async () => {
      const sampleIds = students
        .filter((student) => /^(std-0|std-demo|std-mock)/.test(student.id))
        .map((student) => student.id);
      const deletedIds: string[] = [];
      const errors: string[] = [];
      for (const studentId of sampleIds) {
        try {
          await deleteStudentFromDb(activeSchool.id, studentId);
          deletedIds.push(studentId);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (deletedIds.length > 0) {
        setStudents((prev) => prev.filter((student) => !deletedIds.includes(student.id)));
        if (typeof window !== 'undefined') {
          try {
            const remaining = students.filter((student) => !deletedIds.includes(student.id));
            localStorage.setItem(`eduverse_students_${activeSchool.id}`, JSON.stringify(remaining));
            const deleted: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_student_ids_${activeSchool.id}`) || '[]');
            localStorage.setItem(`eduverse_deleted_student_ids_${activeSchool.id}`, JSON.stringify([...new Set([...deleted, ...deletedIds])]));
          } catch (error) {
            console.warn('Could not cache purged student IDs:', error);
          }
        }
      }
      setDataSyncError(errors.length ? `Could not delete ${errors.length} sample student record(s): ${errors.join('; ')}` : null);
    })();
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
          const next = prev.filter((teacher) => teacher.id !== teacherId);
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
    if (!confirm('ยืนยันล้างข้อมูลครูตัวอย่างทั้งหมด (Sample Teachers) ออกจากโรงเรียนนี้หรือไม่? ข้อมูลจริงที่สร้างใหม่จะไม่ได้รับผลกระทบ')) return;
    void (async () => {
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
        setTeachers((prev) => prev.filter((teacher) => !deletedIds.includes(teacher.id)));
        if (typeof window !== 'undefined') {
          try {
            const remaining = teachers.filter((teacher) => !deletedIds.includes(teacher.id));
            localStorage.setItem(`eduverse_teachers_${activeSchool.id}`, JSON.stringify(remaining));
            const deleted: string[] = JSON.parse(localStorage.getItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`) || '[]');
            localStorage.setItem(`eduverse_deleted_teacher_ids_${activeSchool.id}`, JSON.stringify([...new Set([...deleted, ...deletedIds])]));
          } catch (error) {
            console.warn('Could not cache purged teacher IDs:', error);
          }
        }
      }
      setDataSyncError(errors.length ? `Could not delete ${errors.length} sample teacher record(s): ${errors.join('; ')}` : null);
    })();
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

  const confirmCourseDeletion = (courseIds: string[]) => {
    const courseIdSet = new Set(courseIds);
    const affectedGradeCount = schoolGrades.filter((grade) => courseIdSet.has(grade.courseId)).length;
    return affectedGradeCount === 0 || window.confirm(
      `รายวิชาที่เลือกมีผลการเรียน ${affectedGradeCount} รายการ การลบจะลบผลการเรียนเหล่านี้ถาวรด้วย ต้องการดำเนินการต่อหรือไม่?`
    );
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirmCourseDeletion([courseId])) return false;
    try {
      if (!isDemoMode) await deleteCoursesFromDb(activeSchool.id, [courseId]);
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
      setGrades((prev) => prev.filter((grade) => grade.courseId !== courseId));
      setTimetableSlots((prev) => prev.map((slot) => (
        slot.courseId === courseId ? { ...slot, courseId: undefined } : slot
      )));
      if (currentUser) {
        appendAuditLog(activeSchool.id, {
          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
          actorRole: currentUser.role,
          actionType: 'course_delete',
          targetLabel: courseId,
          details: `ลบรายวิชาออกจากโรงเรียน`,
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
    if (!confirmCourseDeletion(courseIds)) return false;
    try {
      if (!isDemoMode) await deleteCoursesFromDb(activeSchool.id, courseIds);
      const ids = new Set(courseIds);
      setCourses((prev) => prev.filter((course) => !ids.has(course.id)));
      setGrades((prev) => prev.filter((grade) => !ids.has(grade.courseId)));
      setTimetableSlots((prev) => prev.map((slot) => (
        slot.courseId && ids.has(slot.courseId) ? { ...slot, courseId: undefined } : slot
      )));
      setDataSyncError(null);
      return true;
    } catch (error) {
      setDataSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  const handleEnrollStudent = (courseId: string, studentId: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId && !c.enrolledStudentIds.includes(studentId)) {
          return {
            ...c,
            enrolledStudentIds: [...c.enrolledStudentIds, studentId],
          };
        }
        return c;
      })
    );
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

  const handleImportGrades = (newGrades: GradeRecord[]) => {
    const duplicateReasons = getGradeDuplicateReasons(newGrades, schoolGrades);
    if (duplicateReasons.length > 0 &&
      !confirm(`${duplicateReasons.join(' และ ')} ในรายการนำเข้าหรือทะเบียนเดิม ต้องการนำเข้าต่อหรือไม่?`)) return;
    setGrades((prev) => {
      const updated = [...prev];
      newGrades.forEach((ng) => {
        const idx = updated.findIndex((g) => (g.studentId === ng.studentId || g.id === ng.id) && g.courseId === ng.courseId);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], ...ng, schoolId: activeSchool.id };
        } else {
          updated.push({
            ...ng,
            id: ng.id || `grd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            schoolId: activeSchool.id,
          });
        }
      });
      return updated;
    });
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
    const statusLabel = status === 'present' ? 'มาเรียน (ตรงเวลา)' : status === 'late' ? 'มาสาย' : 'ลา';

    sendEduVerseNotification({
      title: isCheckOut ? '🔔 บันทึกสแกนเลิกเรียนสำเร็จ' : '🔔 บันทึกการเข้าเรียนสำเร็จ',
      body: `${personName} • สถานะ: ${statusLabel} เวลา ${nowTime}`,
      category: 'attendance',
      tag: `att-${studentId}-${todayStr}`,
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
          const isMatch =
            p.studentId === studentId ||
            p.userId === studentId ||
            (studentId === 'stu-1' && p.userId === 'usr-student');
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

  const handleRecordPeriodAttendance = (records: PeriodAttendanceRecord[]) => {
    setPeriodAttendance((prev) => {
      const updated = [...prev];
      for (const rec of records) {
        const idx = updated.findIndex(
          (p) => p.id === rec.id || (p.studentId === rec.studentId && p.courseId === rec.courseId && p.date === rec.date && p.periodNumber === rec.periodNumber)
        );
        if (idx >= 0) {
          updated[idx] = rec;
        } else {
          updated.push(rec);
        }
      }
      return updated;
    });

    if (records.length > 0) {
      const firstRec = records[0];
      const isCheckout = firstRec.recordType === 'check_out';
      const course = courses.find((c) => c.id === firstRec.courseId);
      const student = students.find((s) => s.id === firstRec.studentId);
      const studentName = student ? `${student.firstNameTh} ${student.lastNameTh}` : 'นักเรียน';

      if (records.length === 1) {
        sendEduVerseNotification({
          title: isCheckout ? '🔴 เช็กชื่อออกคาบเรียนสำเร็จ (Check-out)' : '🟢 เช็กชื่อเข้าคาบเรียนสำเร็จ (Check-in)',
          body: `${studentName} • วิชา ${firstRec.courseCode || course?.code} คาบที่ ${firstRec.periodNumber} (${firstRec.timeSlot})`,
          category: 'attendance',
          priority: 'normal',
        }).catch(() => {});
      } else {
        sendEduVerseNotification({
          title: '📋 บันทึกเช็กชื่อทั้งคาบเรียนสำเร็จ',
          body: `วิชา ${firstRec.courseCode || course?.code} คาบที่ ${firstRec.periodNumber} บันทึกรายชื่อแล้ว ${records.length} คน`,
          category: 'attendance',
          priority: 'normal',
        }).catch(() => {});
      }
    }
  };

  const handleAddLeaveRequest = (req: LeaveRequest) => {
    setLeaveRequests(prev => [req, ...prev]);
  };

  const handleUpdateLeaveStatus = (reqId: string, status: LeaveStatus, remarks?: string) => {
    setLeaveRequests(prev => prev.map(req => {
      if (req.id !== reqId) return req;
      return {
        ...req,
        status,
        approvalRemarks: remarks || req.approvalRemarks,
        approvedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ฝ่ายบริหารวิชาการ'
      };
    }));

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
    setCampusGates(gates);
    try {
      localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(gates));
    } catch (e) {
      console.warn('Failed to save campus gates to localStorage', e);
    }
    const primaryGate = gates.find((g) => g.isPrimary || g.isActive) || gates[0];
    if (primaryGate) {
      const gateLat = primaryGate.lat ?? primaryGate.latitude ?? 13.736717;
      const gateLng = primaryGate.lng ?? primaryGate.longitude ?? 100.523186;
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
    const firedAlerts = new Set<string>();

    const checkScheduleAndAttendance = () => {
      const now = new Date();
      const todayStr = getLocalDateString();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const totalMinutes = currentHours * 60 + currentMins;

      // 1. Morning School Arrival (07:30 - 08:00: reminder to check-in)
      const morningKey = `${todayStr}-morning-arrival`;
      if (totalMinutes >= 450 && totalMinutes <= 480 && !firedAlerts.has(morningKey)) {
        firedAlerts.add(morningKey);
        sendEduVerseNotification({
          title: '☀️ สวัสดีตอนเช้า: อย่าลืมสแกนเข้าโรงเรียน',
          body: 'ยินดีต้อนรับสู่โรงเรียน กรุณาถ่ายรูปหรือสแกนบัตรเช็กอินผ่านพิกัด GPS ประตูโรงเรียนก่อนเวลา 08:00 น.',
          category: 'attendance',
          priority: 'normal',
        }).catch(() => {});
      }

      // 2. Morning Late Alert (> 08:05: if not checked in yet)
      const lateKey = `${todayStr}-morning-late-alert`;
      if (totalMinutes >= 485 && totalMinutes <= 540 && !firedAlerts.has(lateKey)) {
        firedAlerts.add(lateKey);
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
            body: 'ขณะนี้เลยเวลา 08:00 น. แล้ว ระบบยังไม่พบบันทึกการเช็กอินเข้าโรงเรียนของคุณ กรุณาติดต่อครูเวรประจำวันหรือสแกนเช็กชื่อด่วน',
            category: 'attendance',
            priority: 'urgent',
          }).catch(() => {});
        }
      }

      // 3. Afternoon Departure Check-out (15:30 - 16:30)
      const departureKey = `${todayStr}-afternoon-departure`;
      if (totalMinutes >= 930 && totalMinutes <= 990 && !firedAlerts.has(departureKey)) {
        firedAlerts.add(departureKey);
        sendEduVerseNotification({
          title: '🏫 สิ้นสุดเวลาเรียนประจำวัน: อย่าลืมเช็กเอาท์',
          body: 'หมดเวลาเรียนตามตารางแล้ว กรุณาสแกนหรือถ่ายรูปเช็กเอาท์ (Check-out) ก่อนเดินทางกลับบ้านอย่างปลอดภัย',
          category: 'attendance',
          priority: 'normal',
        }).catch(() => {});
      }

      // 4. Period Timetable Notifications (Start, End, and Late/Missed alerts)
      const periodsToCheck = (schoolPeriods.length > 0 ? schoolPeriods : DEFAULT_SCHOOL_PERIODS).filter(
        (p) => !p.isBreak && p.periodNumber > 0
      );

      periodsToCheck.forEach((p) => {
        const [sH, sM] = p.startTime.split(':').map(Number);
        const [eH, eM] = p.endTime.split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;

        // 4.1. Period Start & Check-in Reminder (within 5 minutes before or at start)
        const pStartKey = `${todayStr}-p${p.periodNumber}-start`;
        if (totalMinutes >= startMin - 5 && totalMinutes <= startMin + 3 && !firedAlerts.has(pStartKey)) {
          firedAlerts.add(pStartKey);
          sendEduVerseNotification({
            title: `⏰ เริ่มคาบเรียนที่ ${p.periodNumber} (${p.startTime} - ${p.endTime})`,
            body: `ใกล้เริ่มคาบเรียนที่ ${p.periodNumber} แล้ว กรุณาเข้าห้องเรียนและสแกน Barcode/QR เพื่อเช็กชื่อเข้าเรียน (Check-in)`,
            category: 'attendance',
            priority: 'urgent',
          }).catch(() => {});
        }

        // 4.2. Mid-period Late / Missed Check-in Reminder (10 mins after start)
        const pLateKey = `${todayStr}-p${p.periodNumber}-missed`;
        if (totalMinutes >= startMin + 10 && totalMinutes <= startMin + 15 && !firedAlerts.has(pLateKey)) {
          firedAlerts.add(pLateKey);
          sendEduVerseNotification({
            title: `⚠️ แจ้งเตือนลืมเช็กชื่อคาบที่ ${p.periodNumber}`,
            body: `คาบที่ ${p.periodNumber} (${p.startTime} - ${p.endTime}) เริ่มไปแล้ว 10 นาที หากเข้าห้องเรียนแล้ว กรุณาสแกน Barcode/QR หรือแจ้งอาจารย์ผู้สอน`,
            category: 'attendance',
            priority: 'urgent',
          }).catch(() => {});
        }

        // 4.3. Period End & Check-out Reminder (within 3 mins of end)
        const pEndKey = `${todayStr}-p${p.periodNumber}-end`;
        if (totalMinutes >= endMin - 2 && totalMinutes <= endMin + 3 && !firedAlerts.has(pEndKey)) {
          firedAlerts.add(pEndKey);
          sendEduVerseNotification({
            title: `🔔 สิ้นสุดคาบเรียนที่ ${p.periodNumber} (${p.endTime} น.)`,
            body: `หมดเวลาคาบเรียนที่ ${p.periodNumber} แล้ว กรุณาเช็กชื่อออก (Check-out) และเตรียมตัวสำหรับคาบถัดไป`,
            category: 'attendance',
            priority: 'normal',
          }).catch(() => {});
        }
      });
    };

    checkScheduleAndAttendance();
    const interval = setInterval(checkScheduleAndAttendance, 30000);
    return () => clearInterval(interval);
  }, [schoolPeriods, attendance, currentUser]);

  const handleSaveCampusGates = async (gates: CampusGateGeofence[]) => {
    if (!currentUser || !['admin', 'super_admin', 'teacher'].includes(currentUser.role)) {
      throw new Error('ไม่มีสิทธิ์แก้ไขชื่อจุดเช็กชื่อ');
    }
    const savedToDatabase = isDemoMode ? false : await saveSchoolCampusGates(activeSchool.id, gates);
    handleUpdateCampusGates(gates);
    return savedToDatabase;
  };

  const handleUpdateSchoolCoordinates = (lat: number, lng: number, radiusMeters: number) => {
    setActiveSchool((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      geofenceRadiusMeters: radiusMeters,
    }));
    setSchools((prev) =>
      prev.map((s) =>
        s.id === activeSchool.id
          ? {
              ...s,
              latitude: lat,
              longitude: lng,
              geofenceRadiusMeters: radiusMeters,
            }
          : s
      )
    );
    setSystemConfig((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      geofenceRadiusMeters: radiusMeters,
    }));
    try {
      localStorage.setItem(`eduverse_school_gps_${activeSchool.id}`, JSON.stringify({ lat, lng, radiusMeters }));
    } catch (e) {
      console.warn('Failed to save school gps to localStorage', e);
    }
    if (!isDemoMode && activeSchool.id) {
      saveSchoolGpsCoordinates(activeSchool.id, lat, lng, radiusMeters).catch(err => {
        console.warn('Could not sync school coordinates to Supabase:', err);
      });
    }
    setCampusGates((prevGates) => {
      if (prevGates.length === 0) {
        const newGate: CampusGateGeofence = {
          id: `gate_${activeSchool.id}_1`,
          schoolId: activeSchool.id,
          nameTh: `จุดศูนย์กลาง / ประตูหลัก ${activeSchool.nameTh}`,
          nameEn: `Main Gate ${activeSchool.nameEn}`,
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          radiusMeters,
          isPrimary: true,
          isActive: true,
          type: 'main_gate',
        };
        try {
          localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify([newGate]));
        } catch { /* ignore */ }
        return [newGate];
      }
      const updated = prevGates.map((g, idx) => {
        if (g.isPrimary || idx === 0) {
          return {
            ...g,
            lat,
            lng,
            latitude: lat,
            longitude: lng,
            radiusMeters,
          };
        }
        return g;
      });
      try {
        localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
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

  const handleAddAnnouncement = (newAnn: Announcement) => {
    setAnnouncements((prev) => [{ ...newAnn, schoolId: activeSchool.id }, ...prev]);
  };

  const handleBroadcastLine = (announcementId: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, lineBroadcastSent: true } : a))
    );
    setDataSyncError(null);
  };

  const handleCompleteLesson = (lessonId: string) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l))
    );
  };

  const handleSubmitAssignment = (assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, submitted: true } : a))
    );
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
    });
  };

  const handleEarnRewards = (userId: string, exp: number, gems: number, isWin: boolean) => {
    setPlayerScores((prev) =>
      prev.map((p) =>
        p.userId === userId
          ? {
              ...p,
              exp: p.exp + exp,
              gems: p.gems + gems,
              battleWins: isWin ? p.battleWins + 1 : p.battleWins,
              streak: isWin ? p.streak + 1 : 0,
            }
          : p
      )
    );
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

  const handleRedeemReward = (rewardId: string, costGems: number) => {
    if (!currentUser) return;
    setPlayerScores((prev) =>
      prev.map((p) =>
        p.userId === currentUser.id && p.gems >= costGems
          ? { ...p, gems: p.gems - costGems }
          : p
      )
    );
  };

  const handleAddPortfolioItem = (item: PortfolioItem) => {
    setPortfolioItems((prev) => [{ ...item, schoolId: activeSchool.id }, ...prev]);
  };

  const handleDeletePortfolioItem = (itemId: string) => {
    setPortfolioItems((prev) => prev.filter((p) => p.id !== itemId));
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
    const fullSlot: TimetableSlot = { ...slot, schoolId: activeSchool.id };
    const next = [fullSlot, ...timetableSlots];
    await saveTimetableSlotsToDb(activeSchool.id, next);
    setTimetableSlots(next);
  };

  const handleDeleteTimetableSlot = async (slotId: string) => {
    const next = timetableSlots.filter((slot) => slot.id !== slotId);
    await deleteTimetableSlotFromDb(activeSchool.id, slotId);
    await saveTimetableSlotsToDb(activeSchool.id, next);
    setTimetableSlots(next);
  };

  const handleSaveSchoolPeriods = async (periods: SchoolPeriodTime[]) => {
    if (!currentUser) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกเวลาเรียน');
    const retainedPeriodNumbers = new Set(periods.map((period) => period.periodNumber));
    const removedPeriodNumbers = new Set(
      schoolPeriods
        .filter((period) => !retainedPeriodNumbers.has(period.periodNumber))
        .map((period) => period.periodNumber)
    );
    const scheduledSlotsInRemovedPeriods = timetableSlots.filter((slot) => (
      (!slot.schoolId || slot.schoolId === activeSchool.id) &&
      removedPeriodNumbers.has(slot.periodNumber)
    ));
    if (scheduledSlotsInRemovedPeriods.length > 0) {
      const periodNumbers = [...new Set(scheduledSlotsInRemovedPeriods.map((slot) => slot.periodNumber))].join(', ');
      throw new Error(`ลบคาบที่ ${periodNumbers} ไม่ได้ เพราะยังมีตารางสอนใช้อยู่ ${scheduledSlotsInRemovedPeriods.length} รายการ`);
    }
    if (!isDemoMode) {
      await saveSchoolPeriodTimes(activeSchool.id, periods);
    }
    setSchoolPeriods(periods);
    setTimetableSlots((prev) => prev.map((slot) => {
      if (slot.schoolId && slot.schoolId !== activeSchool.id) return slot;
      const period = periods.find((item) => item.periodNumber === slot.periodNumber);
      return period
        ? { ...slot, schoolId: activeSchool.id, startTime: period.startTime, endTime: period.endTime }
        : slot;
    }));
    setDataSyncError(null);
  };

  const handleAddBehaviorRecord = (record: BehaviorRecord) => {
    setBehaviorRecords((prev) => [{ ...record, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddSdqAssessment = (sdq: SdqAssessment) => {
    setSdqAssessments((prev) => [{ ...sdq, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddInfirmaryVisit = (visit: InfirmaryVisit) => {
    setInfirmaryVisits((prev) => [{ ...visit, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddHomeworkSubmission = (sub: HomeworkSubmission) => {
    setHomeworkSubmissions((prev) => [{ ...sub, schoolId: activeSchool.id }, ...prev]);
  };

  const handleGradeHomeworkSubmission = (id: string, score: number, feedback: string) => {
    setHomeworkSubmissions((prev) =>
      prev.map((s) => s.id === id ? { ...s, score, teacherFeedback: feedback, status: 'graded' } : s)
    );
  };

  const handleUpdateGrade = (gradeId: string, updates: Partial<GradeRecord>) => {
    setGrades((prev) =>
      prev.map((g) => (g.id === gradeId ? { ...g, ...updates } : g))
    );
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

  const handleSyncQuizScoresToGradebook = (
    courseId: string,
    packTitle: string,
    entries: { studentId: string; quizScore: number }[]
  ) => {
    if (entries.length === 0) return;
    setGrades((prev) => {
      const next = [...prev];
      for (const entry of entries) {
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
          const graded = calculateGrade(totalScore, systemConfig.gradingSystem);
          next[idx] = {
            ...existing,
            quizScore: entry.quizScore,
            totalScore,
            letterGrade: graded.letter,
            gradePoint: graded.point,
          };
        } else {
          const totalScore = Math.min(100, entry.quizScore);
          const graded = calculateGrade(totalScore, systemConfig.gradingSystem);
          next.push({
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
          });
        }
      }
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
  };

  const handleSyncOfflineItem = async (item: OfflineQueueItem): Promise<boolean> => {
    try {
      const payload = item.payload as Record<string, any> | null;
      if (!payload) return false;
      if (item.actionType === 'attendance' && payload.studentId) {
        handleRecordAttendance(
          String(payload.studentId),
          (payload.status as AttendanceStatus) || 'present',
          String(payload.remarks || 'ซิงก์จากโหมดออฟไลน์'),
          (payload.method as AttendanceRecord['checkinMethod']) || 'qr_scanner',
          payload.extra as Parameters<typeof handleRecordAttendance>[4]
        );
        return true;
      }
      if (item.actionType === 'health_visit') {
        handleAddInfirmaryVisit(payload as unknown as InfirmaryVisit);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Application data is shown only after a real Supabase account is authenticated.
  if (!currentUser) {
    return (
      <AuthLayout
        onLogin={handleLogin}
        initialError={dataLoadError}
        lang={lang}
        setLang={setLang}
        themePalette={themePalette}
        setThemePalette={setThemePalette}
        activeSchools={schools}
      />
    );
  }

  if (!isDataReady || loadedSchoolId !== activeSchool.id) {
    return (
      <main className="h-dvh overflow-hidden flex items-center justify-center bg-[var(--color-canvas)] p-6 text-[var(--color-text-body)]">
        <div className="max-w-lg space-y-4 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[var(--color-text-title)]">
            {dataLoadError ? 'โหลดข้อมูลโรงเรียนไม่สำเร็จ' : 'กำลังโหลดข้อมูลโรงเรียน...'}
          </h1>
          {dataLoadError && (
            <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 rounded-lg px-3 py-2">
              {dataLoadError}
            </p>
          )}
          {dataLoadError && (
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 text-sm font-semibold transition cursor-pointer">
              ลองใหม่
            </button>
          )}
        </div>
      </main>
    );
  }

  // Responsive: If on mobile screen (or user opted into mobile view), render the clean, uncluttered MobileAppShell
  if (shouldShowMobileView) {
    return (
      <div className="h-dvh overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-body)] font-sans">
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
          students={schoolStudents}
          teachers={schoolTeachers}
          courses={schoolCourses}
          grades={schoolGrades}
          invoices={schoolInvoices}
          infirmaryVisits={infirmaryVisits}
          behaviorRecords={behaviorRecords}
          sdqAssessments={sdqAssessments}
          attendance={schoolAttendance}
          periodAttendance={schoolPeriodAttendance}
          leaveRequests={leaveRequests}
          assignments={schoolAssignments}
          homeworkSubmissions={homeworkSubmissions}
          announcements={schoolAnnouncements}
          questions={schoolQuestions}
          playerScores={playerScores}
          rewardItems={rewardItems}
          campusGates={campusGates}
          onRecordAttendance={handleRecordAttendance}
          onRecordPeriodAttendance={handleRecordPeriodAttendance}
          onAddLeaveRequest={handleAddLeaveRequest}
          onUpdateLeaveStatus={handleUpdateLeaveStatus}
          onEarnRewards={handleEarnRewards}
          onRedeemReward={handleRedeemReward}
          onAddQuestion={handleAddQuestion}
          onImportQuestions={handleImportQuestions}
          onUpdateStudent={handleUpdateStudent}
          initialMobileTab={deepLinkParams ? 'checkin' : 'home'}
          initialAttendanceSubTab={deepLinkParams?.subTab || 'selfie_mobile'}
          initialPeriodCourseId={deepLinkParams?.courseId}
          initialPeriodNumber={deepLinkParams?.periodNumber}
          initialPeriodDate={deepLinkParams?.date}
          initialPeriodCode={deepLinkParams?.code}
        />

        {/* Modals for Mobile View */}
        {selectedStudentForReport && (
          <ReportCardModal
            student={selectedStudentForReport}
            courses={schoolCourses}
            grades={schoolGrades}
            systemConfig={systemConfig}
            onClose={() => setSelectedStudentForReport(null)}
          />
        )}

        {selectedStudentForProfile && (
          <StudentDetailModal
            student={selectedStudentForProfile}
            courses={schoolCourses}
            grades={schoolGrades}
            attendance={schoolAttendance}
            onClose={() => setSelectedStudentForProfile(null)}
            onOpenReportCard={(stu) => {
              setSelectedStudentForProfile(null);
              setSelectedStudentForReport(stu);
            }}
            onToggleLineSync={handleToggleLineSync}
            gradingSystem={systemConfig.gradingSystem}
            onUpdateStudent={(updated) => {
              handleUpdateStudent(updated);
              setSelectedStudentForProfile(updated);
            }}
          />
        )}

        {showProfileModal && currentUser && (
          <UserProfileModal
            currentUser={currentUser}
            portfolioItems={schoolPortfolioItems.filter(p => p.ownerId === currentUser.id || p.ownerRole === currentUser.role)}
            lang={lang}
            onSaveProfile={handleUpdateUserProfile}
            onAddPortfolioItem={handleAddPortfolioItem}
            onDeletePortfolioItem={handleDeletePortfolioItem}
            onClose={() => setShowProfileModal(false)}
          />
        )}

        {showSchoolSwitcher && (
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
            onUnreadCountChange={setUnreadNotifCount}
            onClose={() => {
              setShowNotificationModal(false);
              if (currentUser.role !== 'parent') {
                setUnreadNotifCount(getStoredNotifications().filter(n => !n.read).length);
              }
            }}
            lang={lang}
          />
        )}

        {/* Offline Status Connectivity Banner */}
        <OfflineIndicator lang={lang} onSyncItem={handleSyncOfflineItem} />
      </div>
    );
  }

  return (
    <div className={`${isMobileInDesktopView ? 'min-h-dvh w-full overflow-x-auto overflow-y-auto' : 'h-dvh max-h-dvh overflow-hidden'} bg-[var(--color-canvas)] text-[var(--color-text-body)] flex flex-col font-sans transition-colors duration-200`}>
      {/* Sticky Top Banner when viewing Desktop View on Mobile Screen */}
      {isMobileInDesktopView && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-3 py-1.5 text-xs flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <span>🖥️ <strong>โหมดคอมพิวเตอร์ (Desktop ERP)</strong></span>
            <span className="text-blue-100 text-[11px]">— เลื่อนซ้าย-ขวาเพื่อดูตารางและคอลัมน์ข้อมูลได้ครบถ้วน</span>
          </div>
          <button
            type="button"
            onClick={() => setDeviceViewPreference('mobile')}
            className="px-2.5 py-1 bg-white text-blue-800 hover:bg-blue-50 font-bold rounded-lg text-[11px] transition shadow-xs cursor-pointer shrink-0 ml-2"
          >
            กลับโหมดมือถือ
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
        setProgramMode={setProgramMode}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        themePalette={themePalette}
        setThemePalette={setThemePalette}
        onOpenSchoolSwitcher={() => setShowSchoolSwitcher(true)}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenGuide={currentRole !== 'super_admin' || isSuperAdminSchoolView ? () => setShowGuideModal(true) : undefined}
        onOpenImportExport={currentRole !== 'super_admin' || isSuperAdminSchoolView ? () => setShowImportExportModal(true) : undefined}
        onOpenOnboardingTutor={() => setShowOnboardingTutorModal(true)}
        onSwitchToMobileMode={() => setDeviceViewPreference('mobile')}
        coordinationUnreadCount={coordinationUnreadCount}
        onOpenCoordinationDesk={['admin', 'super_admin'].includes(currentRole) ? () => navigateToAppTab('admin_superadmin_desk') : undefined}
        onOpenExamPaymentSettings={currentRole === 'super_admin' ? handleOpenExamPaymentSettings : undefined}
      />}
      {!useImmersiveGameLayout && isDemoMode && (
        <div role="status" className="shrink-0 mx-3 mt-1.5 px-3 py-1 rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/60 text-[11px] text-violet-900 dark:text-violet-100 flex items-center justify-between">
          <span>{lang === 'th' ? 'โหมดทดลองใช้งาน (Demo) — บันทึกในเซสชันเบราว์เซอร์' : 'Demo mode — browser session only.'}</span>
          <span className="font-bold uppercase text-[9px] px-1.5 py-0.5 bg-violet-200 dark:border-violet-800 text-violet-950 dark:text-violet-100 rounded">DEMO</span>
        </div>
      )}
      {!useImmersiveGameLayout && dataSyncError && (
        <div role="alert" className="shrink-0 mx-3 mt-1 px-3 py-1.5 rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-[11px] text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2">
          <span>{lang === 'th' ? 'เกิดข้อผิดพลาดในการซิงก์ข้อมูล Supabase:' : 'Supabase sync error:'} {dataSyncError}</span>
          <button type="button" onClick={() => setDataSyncError(null)} className="font-bold ml-2 shrink-0 cursor-pointer">✕</button>
        </div>
      )}
      {!useImmersiveGameLayout && dataSyncWarnings.length > 0 && (
        <div role="status" className="shrink-0 mx-3 mt-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/50 text-[11px] text-amber-950 dark:text-amber-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate font-medium">
              <strong className="font-bold">
                {lang === 'th' ? 'ต้องอัปเดตโครงสร้าง DB (SQL Migration):' : 'DB schema migration needed:'}
              </strong>{' '}
              {dataSyncWarnings[0]}
              {dataSyncWarnings.length > 1 ? ` (+${dataSyncWarnings.length - 1})` : ''}
              {dataSyncSummary ? ` • ✓ ${dataSyncSummary}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyMigrationSql}
              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
            >
              {copiedMigrationSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedMigrationSql ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอก SQL' : 'Copy SQL')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSchemaMigrationModal(true)}
              className="px-2 py-0.5 rounded border border-amber-400 dark:border-amber-600 bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-amber-950 dark:text-amber-100 font-semibold text-[11px] inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
            >
              <Database className="w-3 h-3" />
              <span>{lang === 'th' ? 'วิธีรัน' : 'Steps'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDataSyncWarnings([])}
              aria-label="Close warning"
              className="p-0.5 font-bold text-amber-800 dark:text-amber-200 hover:text-amber-950 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {!useImmersiveGameLayout && isDataReady && !isDemoMode && !dismissedDuplicateWarning &&
        ['admin', 'super_admin'].includes(currentRole) && duplicateWarnings.length > 0 && (
        <div role="alert" className="shrink-0 mx-3 mt-1 px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-[11px] text-amber-950 dark:text-amber-100 flex items-center justify-between gap-2">
          <span className="truncate">
            <strong>ตรวจพบข้อมูลซ้ำ ({duplicateWarnings.length}):</strong>{' '}
            {duplicateWarnings.slice(0, 2).join(' • ')}
            {duplicateWarnings.length > 2 ? ` (+${duplicateWarnings.length - 2})` : ''}
          </span>
          <button
            type="button"
            onClick={() => setDismissedDuplicateWarning(true)}
            aria-label="Dismiss duplicate warning"
            className="p-0.5 font-bold text-amber-800 dark:text-amber-200 hover:text-amber-950 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile Drawer Overlay and Sidebar */}
      {!useImmersiveGameLayout && isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative w-72 max-w-[85vw] bg-[var(--color-card)] text-[var(--color-text-body)] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-[var(--color-border)]">
            <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--color-text-title)]">เมนูระบบโรงเรียน (EduVerse)</span>
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
                studentsCount={schoolStudents.length}
                teachersCount={schoolTeachers.length}
                coursesCount={schoolCourses.length}
                coordinationUnreadCount={coordinationUnreadCount}
                unclaimedCentralPacksCount={unclaimedCentralPacks.length}
                lang={lang}
                featureFlags={activeFeatureFlags}
              />
            </div>
          </div>
        </div>
      )}

      <div 
        className={`flex-1 flex min-w-0 min-h-0 ${useImmersiveGameLayout ? 'fixed inset-0 z-50 bg-slate-950 overflow-hidden' : (isMobileInDesktopView ? 'overflow-visible' : 'overflow-hidden')}`}
        style={isMobileInDesktopView ? { minWidth: '1120px' } : undefined}
      >
        {/* Desktop Left Sidebar only shown in School ERP mode */}
        {!useImmersiveGameLayout && programMode === 'school_erp' && (
          <div className={`${isMobileInDesktopView ? 'flex shrink-0' : 'hidden lg:flex shrink-0'}`}>
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={navigateToAppTab}
              currentRole={currentRole}
              isSuperAdminSchoolView={isSuperAdminSchoolView}
              studentsCount={schoolStudents.length}
              teachersCount={schoolTeachers.length}
              coursesCount={schoolCourses.length}
              coordinationUnreadCount={coordinationUnreadCount}
              unclaimedCentralPacksCount={unclaimedCentralPacks.length}
              lang={lang}
              featureFlags={activeFeatureFlags}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 w-full max-w-full min-w-0 min-h-0 flex flex-col ${useImmersiveGameLayout ? 'p-0 overflow-hidden' : (isMobileInDesktopView ? 'app-workspace p-2.5 overflow-visible' : 'app-workspace p-2.5 sm:p-3.5 overflow-y-auto')}`}>
          <div className={`${useImmersiveGameLayout ? 'max-w-none h-full' : (isMobileInDesktopView ? 'w-full' : 'max-w-[1600px] mx-auto')} w-full min-w-0 flex-1 min-h-0 flex flex-col`}>
            {!useImmersiveGameLayout && currentRole === 'super_admin' && isSuperAdminSchoolView && (
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5">
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate">
                  โหมดตรวจสอบรายโรงเรียน: <strong>{activeSchool.nameTh}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToAppTab('super_admin_console')}
                  className="shrink-0 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                >
                  กลับศูนย์ควบคุม
                </button>
              </div>
            )}
            {/* Mode 1: School ERP / SIS */}
            {programMode === 'school_erp' && (
              <>
                {currentTab === 'super_admin_console' && currentRole === 'super_admin' && (
                  <SuperAdminConsoleView
                    schools={schools}
                    onUpdateSchools={setSchools}
                    rolePermissions={rolePermissions}
                    onUpdateRolePermissions={setRolePermissions}
                    promotions={promotions}
                    onUpdatePromotions={setPromotions}
                    subscriptionPlans={subscriptionPlans}
                    onUpdateSubscriptionPlans={setSubscriptionPlans}
                    allUsers={currentUser ? [currentUser] : []}
                    lang={lang}
                    isDemoMode={isDemoMode}
                    onViewSchool={handleViewSchool}
                    onToggleSchoolStatus={handleToggleSchoolStatus}
                    coordinationUnreadCount={coordinationUnreadCount}
                    onOpenCoordinationDesk={() => navigateToAppTab('admin_superadmin_desk')}
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

                {currentTab === 'executive_monitor' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                  <ExecutiveMonitorView
                    activeSchool={activeSchool}
                    students={schoolStudents}
                    teachers={schoolTeachers}
                    courses={schoolCourses}
                    grades={schoolGrades}
                    attendance={schoolAttendance}
                    invoices={schoolInvoices}
                    announcements={schoolAnnouncements}
                    infirmaryVisits={schoolInfirmaryVisits}
                    behaviorRecords={schoolBehaviorRecords}
                    sdqAssessments={schoolSdqAssessments}
                    homeworkSubmissions={schoolHomeworkSubmissions}
                    leaveRequests={leaveRequests}
                    lang={lang}
                    onNavigate={navigateToAppTab}
                  />
                )}

                {/* Dedicated School GPS & Gate Geofence Settings Tab */}
                {currentTab === 'school_gps' && (
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <SchoolGpsSettingsCard
                      activeSchool={activeSchool}
                      campusGates={campusGates}
                      currentRole={currentRole}
                      lang={lang}
                      onUpdateCampusGates={handleUpdateCampusGates}
                      onSaveCampusGates={handleSaveCampusGates}
                      onUpdateSchoolCoordinates={handleUpdateSchoolCoordinates}
                    />
                  </div>
                )}

                {/* School Admin: Role Permissions Console for this specific school */}
                {currentTab === 'school_permissions' && (currentRole === 'admin' || currentRole === 'super_admin') && (
                  <SchoolPermissionSettingsView
                    activeSchool={activeSchool}
                    lang={lang}
                  />
                )}

                {/* School Admin & Teachers: System & LINE Notifications Settings */}
                {currentTab === 'system_settings' && (
                  <SystemSettingsView
                    systemConfig={systemConfig}
                    activeSchool={activeSchool}
                    students={schoolStudents}
                    currentRole={currentRole}
                    lang={lang}
                    campusGates={campusGates}
                    onUpdateCampusGates={handleUpdateCampusGates}
                    onSaveCampusGates={handleSaveCampusGates}
                    onUpdateSchoolCoordinates={handleUpdateSchoolCoordinates}
                    onUpdateSchool={handleUpdateSchool}
                    onUpdateConfig={setSystemConfig}
                    featureFlags={activeFeatureFlags}
                    onUpdateFeatureFlags={(flags) => handleUpdateSchoolFeatureFlags(activeSchool.id, flags)}
                  />
                )}

                {currentTab === 'executive_warning' && (
                  <ExecutiveEarlyWarningView
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้บริหารสถานศึกษา'}
                    students={schoolStudents}
                    attendance={schoolAttendance}
                    grades={schoolGrades}
                    courses={schoolCourses}
                    gradingSystem={systemConfig.gradingSystem}
                    sdqAssessments={schoolSdqAssessments}
                    behaviorRecords={schoolBehaviorRecords}
                    onNavigateToTab={(tab: string) => navigateToAppTab(tab as NavTab)}
                    schoolId={activeSchool.id}
                    infirmaryVisits={schoolInfirmaryVisits}
                    homeworkSubmissions={schoolHomeworkSubmissions}
                    onLogIntervention={(stuName, title) => {
                      if (currentUser) {
                        appendAuditLog(activeSchool.id, {
                          actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
                          actorRole: currentUser.role,
                          actionType: 'intervention_logged',
                          targetLabel: stuName,
                          details: title,
                        });
                      }
                    }}
                  />
                )}

                {currentTab === 'dashboard' && (
                  <DashboardView
                    students={schoolStudents}
                    teachers={schoolTeachers}
                    courses={schoolCourses}
                    attendance={schoolAttendance}
                    grades={schoolGrades}
                    playerScores={playerScores}
                    invoices={schoolInvoices}
                    announcements={schoolAnnouncements}
                    systemConfig={systemConfig}
                    school={activeSchool}
                    currentUser={currentUser}
                    lang={lang}
                    onNavigate={setCurrentTab}
                    onQuickCheckIn={handleQuickCheckIn}
                    onRecordMilestoneActivity={handleRecordMilestoneActivity}
                    unclaimedCentralPacksCount={unclaimedCentralPacks.length}
                    onOpenCentralExamPopup={() => setShowCentralExamPopup(true)}
                    timetableSlots={schoolTimetableSlots}
                    leaveRequests={leaveRequests}
                    homeworkSubmissions={schoolHomeworkSubmissions}
                    schoolPeriods={schoolPeriods}
                  />
                )}

                {currentTab === 'students' && (
                  <StudentsView
                    students={schoolStudents}
                    activeSchool={activeSchool}
                    currentRole={currentRole}
                    onSelectStudent={setSelectedStudentForProfile}
                    onOpenReportCard={setSelectedStudentForReport}
                    onToggleLineSync={handleToggleLineSync}
                    onAddStudent={handleAddStudent}
                    onAddStudents={handleAddStudents}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onPurgeSampleStudents={handlePurgeSampleStudents}
                    onBatchUpdateStudents={(updatedList) => {
                      const updateMap = new Map(updatedList.map((s) => [s.id, s]));
                      setStudents((prev) => prev.map((s) => updateMap.get(s.id) || s));
                    }}
                    onOpenImportExport={() => setShowImportExportModal(true)}
                  />
                )}

                {currentTab === 'teachers' && (
                  <TeachersView
                    teachers={schoolTeachers}
                    lang={lang}
                    currentRole={currentRole}
                    onAddTeacher={handleAddTeacher}
                    onUpdateTeacher={handleUpdateTeacher}
                    onDeleteTeacher={handleDeleteTeacher}
                    onPurgeSampleTeachers={handlePurgeSampleTeachers}
                    staffPositionOptions={systemConfig.staffPositionOptions}
                    academicYear={systemConfig.academicYear}
                    onOpenImportExport={() => setShowImportExportModal(true)}
                  />
                )}

                {currentTab === 'courses' && (
                  <CoursesView
                    courses={schoolCourses}
                    students={schoolStudents}
                    currentRole={currentRole}
                    onAddCourse={handleAddCourse}
                    onUpdateCourse={handleUpdateCourse}
                    onDeleteCourse={handleDeleteCourse}
                    onDeleteCourses={handleDeleteCourses}
                    onEnrollStudent={handleEnrollStudent}
                    semesterOptions={systemConfig.semesterOptions}
                    academicYear={systemConfig.academicYear}
                    currentSemester={systemConfig.currentSemester}
                    onOpenImportExport={(tab = 'courses') => {
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
                    onGamePlayingChange={setIsGamePlaying}
                    onOpenCentralExamHub={() => navigateToAppTab('central_exam_hub')}
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
                    courses={schoolCourses}
                    students={schoolStudents}
                    grades={schoolGrades}
                    onSyncQuizScoresToGradebook={handleSyncQuizScoresToGradebook}
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
                    onExit={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'timetable' && (
                  <TimetableScheduleView
                    slots={schoolTimetableSlots}
                    courses={schoolCourses}
                    teachers={schoolTeachers}
                    students={schoolStudents}
                    onAddSlot={handleAddTimetableSlot}
                    onDeleteSlot={handleDeleteTimetableSlot}
                    schoolPeriods={schoolPeriods}
                    onSaveSchoolPeriods={handleSaveSchoolPeriods}
                    lang={lang}
                    currentRole={currentRole}
                    schoolName={activeSchool.nameTh}
                    academicYear={systemConfig.academicYear}
                    currentSemester={systemConfig.currentSemester}
                    semesterOptions={systemConfig.semesterOptions}
                    onUpdateAcademicPeriod={handleUpdateAcademicPeriod}
                  />
                )}

                {currentTab === 'homework' && (
                  <HomeworkTrackerView
                    submissions={schoolHomeworkSubmissions}
                    students={schoolStudents}
                    courses={schoolCourses}
                    assignments={assignments}
                    onAddSubmission={handleAddHomeworkSubmission}
                    onGradeSubmission={handleGradeHomeworkSubmission}
                    lang={lang}
                    currentRole={currentRole}
                  />
                )}

                {currentTab === 'attendance' && (
                  <AttendanceView
                    students={schoolStudents}
                    teachers={schoolTeachers}
                    attendance={schoolAttendance}
                    leaveRequests={leaveRequests}
                    campusGates={campusGates}
                    activeSchool={activeSchool}
                    currentUser={currentUser}
                    currentRole={currentRole}
                    lang={lang}
                    onRecordAttendance={handleRecordAttendance}
                    onUpdateLeaveStatus={handleUpdateLeaveStatus}
                    onUpdateCampusGates={handleUpdateCampusGates}
                    onSaveCampusGates={handleSaveCampusGates}
                    onUpdateSchoolCoordinates={handleUpdateSchoolCoordinates}
                  />
                )}

                {currentTab === 'mobile_checkin' && (
                  <MobileAttendanceView
                    students={schoolStudents}
                    teachers={schoolTeachers}
                    courses={schoolCourses}
                    attendance={schoolAttendance}
                    periodAttendance={schoolPeriodAttendance}
                    currentUser={currentUser}
                    school={activeSchool}
                    campusGates={campusGates}
                    leaveRequests={leaveRequests}
                    lang={lang}
                    initialSubTab={deepLinkParams?.subTab || 'selfie_mobile'}
                    initialPeriodCourseId={deepLinkParams?.courseId}
                    initialPeriodNumber={deepLinkParams?.periodNumber}
                    initialPeriodDate={deepLinkParams?.date}
                    initialPeriodCode={deepLinkParams?.code}
                    onRecordAttendance={handleRecordAttendance}
                    onRecordPeriodAttendance={handleRecordPeriodAttendance}
                    onAddLeaveRequest={handleAddLeaveRequest}
                    onUpdateLeaveStatus={handleUpdateLeaveStatus}
                  />
                )}

                {currentTab === 'student_id_cards' && (
                  <DigitalIdCardView
                    students={schoolStudents}
                    school={activeSchool}
                    lang={lang}
                    currentRole={currentRole}
                    onUpdateStudent={handleUpdateStudent}
                  />
                )}

                {currentTab === 'behavior_sdq' && (
                  <BehaviorSdqView
                    students={schoolStudents}
                    records={schoolBehaviorRecords}
                    sdqList={schoolSdqAssessments}
                    onAddBehaviorRecord={handleAddBehaviorRecord}
                    onAddSdqAssessment={handleAddSdqAssessment}
                    lang={lang}
                    currentRole={currentRole}
                    academicYear={systemConfig.academicYear}
                    currentSemester={systemConfig.currentSemester}
                  />
                )}

                {currentTab === 'infirmary' && (
                  <InfirmaryHealthView
                    visits={schoolInfirmaryVisits}
                    students={schoolStudents}
                    onAddVisit={handleAddInfirmaryVisit}
                    lang={lang}
                    currentRole={currentRole}
                  />
                )}

                {currentTab === 'portfolio' && (
                  <PortfolioView
                    portfolioItems={schoolPortfolioItems}
                    students={schoolStudents}
                    currentUser={currentUser}
                    lang={lang}
                    onAddPortfolioItem={handleAddPortfolioItem}
                    onOpenProfile={() => setShowProfileModal(true)}
                    academicYear={systemConfig.academicYear}
                  />
                )}

                {currentTab === 'gradebook' && (
                  <GradebookView
                    students={schoolStudents}
                    courses={schoolCourses}
                    grades={schoolGrades}
                    systemConfig={systemConfig}
                    onUpdateGrade={handleUpdateGrade}
                    onOpenReportCard={setSelectedStudentForReport}
                    timetableSlots={schoolTimetableSlots}
                    attendance={schoolAttendance}
                    periodAttendance={schoolPeriodAttendance}
                    onPracticeInAi={(topic) => {
                      setAdaptivePracticeTopic(topic);
                      navigateToAppTab('socratic_tutor');
                    }}
                  />
                )}

                {currentTab === 'billing' && (
                  <BillingView
                    students={schoolStudents}
                    invoices={schoolInvoices}
                    systemConfig={systemConfig}
                    onPayInvoice={handlePayInvoice}
                    onSendPrivateAppReminder={handleSendPrivateAppReminder}
                    currentRole={currentRole}
                    onOpenExamPaymentSettings={handleOpenExamPaymentSettings}
                    onApproveSlip={handleApproveInvoiceSlip}
                    onRejectSlip={handleRejectInvoiceSlip}
                  />
                )}

                {currentTab === 'announcements' && (
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
                courses={schoolCourses}
                students={schoolStudents}
                lessons={schoolLessons}
                assignments={schoolAssignments}
                lang={lang}
                onCompleteLesson={handleCompleteLesson}
                onSubmitAssignment={handleSubmitAssignment}
              />
            )}

            {/* Mode 3: Parent & Student Portal */}
            {programMode === 'parent_portal' && (
              <ParentPortalView
                students={schoolStudents}
                attendance={schoolAttendance}
                invoices={schoolInvoices}
                grades={schoolGrades}
                courses={schoolCourses}
                systemConfig={systemConfig}
                leaveRequests={leaveRequests}
                lang={lang}
                onPayInvoice={handlePayInvoice}
                onOpenReportCard={setSelectedStudentForReport}
                onAddLeaveRequest={handleAddLeaveRequest}
                schoolId={activeSchool.id}
                periodAttendance={schoolPeriodAttendance}
                homeworkSubmissions={schoolHomeworkSubmissions}
                infirmaryVisits={schoolInfirmaryVisits}
                onSubmitInvoiceSlip={handleSubmitInvoiceSlip}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - Clean, Subtle & Ergonomic */}
      {(currentRole !== 'super_admin' || isSuperAdminSchoolView) && !useImmersiveGameLayout && (
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-card)] border-t border-[var(--color-border)] px-2 py-1.5 flex items-center justify-around shadow-sm">
        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('dashboard');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            programMode === 'school_erp' && currentTab === 'dashboard'
              ? 'text-[var(--color-primary-text)] font-bold bg-[var(--color-primary-light)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>แดชบอร์ด</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('attendance');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            programMode === 'school_erp' && currentTab === 'attendance'
              ? 'text-[var(--color-primary-text)] font-bold bg-[var(--color-primary-light)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span>เช็คชื่อ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('games');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            programMode === 'school_erp' && currentTab === 'games'
              ? 'text-[var(--color-primary-text)] font-bold bg-[var(--color-primary-light)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span>ล่าสมบัติ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('portfolio');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            programMode === 'school_erp' && currentTab === 'portfolio'
              ? 'text-[var(--color-primary-text)] font-bold bg-[var(--color-primary-light)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span>ผลงาน</span>
        </button>

        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
        >
          <User className="w-5 h-5 text-[var(--color-primary-text)]" />
          <span>โปรไฟล์</span>
        </button>
      </nav>
      )}

      {/* Multi-School Switcher Modal */}
      {showSchoolSwitcher && (
        <SchoolSwitcherModal
          schools={schools}
          activeSchool={activeSchool}
          onSelectSchool={(school) => {
            setActiveSchool(school);
            setSystemConfig((prev) => ({
              ...prev,
              schoolNameEn: school.nameEn,
              schoolNameTh: school.nameTh,
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
          courses={schoolCourses}
          grades={schoolGrades}
          systemConfig={systemConfig}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}

      {/* Student Profile Detail Modal */}
      {selectedStudentForProfile && (
        <StudentDetailModal
          student={selectedStudentForProfile}
          courses={schoolCourses}
          grades={schoolGrades}
          attendance={schoolAttendance}
          onClose={() => setSelectedStudentForProfile(null)}
          onOpenReportCard={(stu) => {
            setSelectedStudentForProfile(null);
            setSelectedStudentForReport(stu);
          }}
          onToggleLineSync={handleToggleLineSync}
          gradingSystem={systemConfig.gradingSystem}
          onUpdateStudent={(updated) => {
            handleUpdateStudent(updated);
            setSelectedStudentForProfile(updated);
          }}
        />
      )}

      {/* Comprehensive User Profile & Portfolio Modal */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          portfolioItems={schoolPortfolioItems.filter(p => p.ownerId === currentUser.id || p.ownerRole === currentUser.role)}
          lang={lang}
          onSaveProfile={handleUpdateUserProfile}
          onAddPortfolioItem={handleAddPortfolioItem}
          onDeletePortfolioItem={handleDeletePortfolioItem}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Data Import / Export Modal (Bulk CSV/Excel for Courses, Enrollment, Grades, Students, Teachers, Questions) */}
      {showImportExportModal && (
        <DataImportExportModal
          students={schoolStudents}
          teachers={schoolTeachers}
          questions={schoolQuestions}
          courses={schoolCourses}
          grades={schoolGrades}
          activeSchoolId={activeSchool.id}
          lang={lang}
          initialTab={importExportInitialTab}
          onImportStudents={handleImportStudents}
          onImportTeachers={handleImportTeachers}
          onImportQuestions={handleImportQuestions}
          onImportCourses={handleImportCourses}
          onImportEnrollment={handleImportEnrollment}
          onImportGrades={handleImportGrades}
          onClose={() => setShowImportExportModal(false)}
        />
      )}

      {/* Interactive System & Module Guide Modal */}
      {showGuideModal && (
        <ModuleGuideModal
          lang={lang}
          currentRole={currentRole}
          onClose={() => setShowGuideModal(false)}
          onNavigateToModule={(mod) => {
            setShowGuideModal(false);
            if (mod === 'lms') {
              setProgramMode('lms_classroom');
            } else if (mod === 'parent_portal') {
              setProgramMode('parent_portal');
            } else {
              setProgramMode('school_erp');
              setCurrentTab(mod as NavTab);
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
          onUnreadCountChange={setUnreadNotifCount}
          onClose={() => {
            setShowNotificationModal(false);
            if (currentUser.role !== 'parent') {
              setUnreadNotifCount(getStoredNotifications().filter(n => !n.read).length);
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
                  <li>{lang === 'th' ? 'กลับมาที่หน้าเว็บ EduVerse แล้วกดรีเฟรช (F5) ข้อมูลครูและรูปเช็กชื่อจะซิงก์ครบถ้วนทันที' : 'Return to EduVerse and refresh the page; teachers and attendance photos will sync immediately'}</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-muted)]">
                    supabase/migrations/20261111_patch_all_latest_migrations.sql
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
                  {SUPABASE_PATCH_MIGRATION_SQL}
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
      <CentralExamNotificationPopup
        isOpen={showCentralExamPopup && currentRole === 'admin' && programMode === 'school_erp'}
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

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator lang={lang} onSyncItem={handleSyncOfflineItem} />
    </div>
  );
};

export default App;
