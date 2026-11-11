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
  CampusGateGeofence
} from './types';
import { 
  INITIAL_SCHOOLS,
  INITIAL_STUDENTS, 
  INITIAL_TEACHERS,
  INITIAL_COURSES, 
  INITIAL_GRADES, 
  INITIAL_ATTENDANCE, 
  INITIAL_INVOICES, 
  INITIAL_ANNOUNCEMENTS, 
  INITIAL_SYSTEM_CONFIG,
  INITIAL_LESSONS,
  INITIAL_ASSIGNMENTS,
  INITIAL_QUESTIONS,
  INITIAL_PLAYER_SCORES,
  INITIAL_REWARD_ITEMS,
  INITIAL_PERIOD_ATTENDANCE,
  INITIAL_PORTFOLIO_ITEMS,
  INITIAL_TIMETABLE_SLOTS,
  INITIAL_BEHAVIOR_RECORDS,
  INITIAL_SDQ_ASSESSMENTS,
  INITIAL_INFIRMARY_VISITS,
  INITIAL_HOMEWORK_SUBMISSIONS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_PROMOTIONS,
  INITIAL_SUBSCRIPTION_PLANS,
  DEFAULT_CAMPUS_GATES,
  INITIAL_LEAVE_REQUESTS,
  DEMO_USERS,
} from './data/mockData';
import {
  restoreSupabaseSession,
  signOutFromSupabase,
  updateSchoolStatusInSupabase,
  updateUserProfileInSupabase,
} from './lib/authDb';
import type { AuthContext } from './lib/authDb';
import { loadSchoolData, saveSchoolCampusGates, saveSchoolPeriodTimes, syncDataToSupabase } from './lib/supabase';
import { DEFAULT_SCHOOL_PERIODS } from './lib/schoolPeriods';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { AuthLayout } from './components/AuthLayout';
import { SchoolSwitcherModal } from './components/SchoolSwitcherModal';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { TeachersView } from './components/TeachersView';
import { CoursesView } from './components/CoursesView';
import { AttendanceView } from './components/AttendanceView';
import { MobileAttendanceView } from './components/MobileAttendanceView';
import { EduBattleGameView } from './components/EduBattleGameView';
import { PortfolioView } from './components/PortfolioView';
import { GradebookView } from './components/GradebookView';
import { BillingView } from './components/BillingView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { LmsClassroomView } from './components/LmsClassroomView';
import { ParentPortalView } from './components/ParentPortalView';
import { ReportCardModal } from './components/ReportCardModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { TimetableScheduleView } from './components/TimetableScheduleView';
import { BehaviorSdqView } from './components/BehaviorSdqView';
import { DigitalIdCardView } from './components/DigitalIdCardView';
import { InfirmaryHealthView } from './components/InfirmaryHealthView';
import { HomeworkTrackerView } from './components/HomeworkTrackerView';
import { SuperAdminConsoleView } from './components/SuperAdminConsoleView';
import { SchoolPermissionSettingsView } from './components/SchoolPermissionSettingsView';
import { EduBattleRoyale3DView } from './components/EduBattleRoyale3DView';
import { SubjectLabSimulationView } from './components/SubjectLabSimulationView';
import { UserProfileModal } from './components/UserProfileModal';
import { SystemSettingsView } from './components/SystemSettingsView';
import { SchoolGpsSettingsCard } from './components/SchoolGpsSettingsCard';
import { SchoolGpsModal } from './components/SchoolGpsModal';
import { DataImportExportModal } from './components/DataImportExportModal';
import { ModuleGuideModal } from './components/ModuleGuideModal';
import { SchoolOnboardingTutorModal } from './components/SchoolOnboardingTutorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AiDiagnosticLearningView } from './components/AiDiagnosticLearningView';
import { HallOfFame3DView } from './components/HallOfFame3DView';
import { ExecutiveEarlyWarningView } from './components/ExecutiveEarlyWarningView';
import { StudyStreakQuestPassView } from './components/StudyStreakQuestPassView';
import { CoopBossRaidView } from './components/CoopBossRaidView';
import { SocraticTutorView } from './components/SocraticTutorView';
import { RealWorldSnapQuestView } from './components/RealWorldSnapQuestView';
import { MobileAppShell } from './components/MobileAppShell';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { getStoredNotifications, sendEduVerseNotification } from './lib/pushNotifications';
import { getLocalDateString } from './lib/date';
import { LayoutDashboard, QrCode, Gamepad2, Briefcase, Users, X, User, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Multi-School & Auth State
  const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);
  const [activeSchool, setActiveSchool] = useState<School>(INITIAL_SCHOOLS[0]);
  const [demoUsers] = useState<AuthUser[]>(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSuperAdminSchoolView, setIsSuperAdminSchoolView] = useState(false);
  const demoModeRef = useRef(false);
  const skipNextSuperAdminSyncRef = useRef(false);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [loadedSchoolId, setLoadedSchoolId] = useState<string | null>(null);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [dataSyncError, setDataSyncError] = useState<string | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Super Admin Management State (RBAC, Promotions, Subscription Plans)
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>(INITIAL_ROLE_PERMISSIONS);
  const [promotions, setPromotions] = useState<PromotionCampaign[]>(INITIAL_PROMOTIONS);
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
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [programMode, setProgramMode] = useState<AppProgramMode>('school_erp');
  const [lang, setLang] = useState<AppLanguage>('th');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [themePalette, setThemePalette] = useState<ThemePalette>('light_warm');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [grades, setGrades] = useState<GradeRecord[]>(INITIAL_GRADES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [invoices, setInvoices] = useState<TuitionInvoice[]>(INITIAL_INVOICES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [questions, setQuestions] = useState<QuizQuestion[]>(INITIAL_QUESTIONS);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>(INITIAL_PLAYER_SCORES);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>(INITIAL_REWARD_ITEMS);
  const [periodAttendance, setPeriodAttendance] = useState<PeriodAttendanceRecord[]>(INITIAL_PERIOD_ATTENDANCE);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(INITIAL_PORTFOLIO_ITEMS);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(INITIAL_TIMETABLE_SLOTS);
  const [schoolPeriods, setSchoolPeriods] = useState<SchoolPeriodTime[]>(DEFAULT_SCHOOL_PERIODS);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>(INITIAL_BEHAVIOR_RECORDS);
  const [sdqAssessments, setSdqAssessments] = useState<SdqAssessment[]>(INITIAL_SDQ_ASSESSMENTS);
  const [infirmaryVisits, setInfirmaryVisits] = useState<InfirmaryVisit[]>(INITIAL_INFIRMARY_VISITS);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>(INITIAL_HOMEWORK_SUBMISSIONS);
  const [campusGates, setCampusGates] = useState<CampusGateGeofence[]>(DEFAULT_CAMPUS_GATES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);

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
        setCampusGates(DEFAULT_CAMPUS_GATES);
      }
    } catch {
      setCampusGates(DEFAULT_CAMPUS_GATES);
    }
  }, [activeSchool.id, activeSchool.nameTh, activeSchool.nameEn, activeSchool.latitude, activeSchool.longitude, activeSchool.geofenceRadiusMeters]);

  // Modals
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showOnboardingTutorModal, setShowOnboardingTutorModal] = useState<boolean>(false);
  const [hasSandboxData, setHasSandboxData] = useState<boolean>(false);
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);
  const [importExportInitialTab, setImportExportInitialTab] = useState<string>('students');
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  useEffect(() => {
    const updateUnread = () => {
      const items = getStoredNotifications();
      setUnreadNotifCount(items.filter(n => !n.read).length);
    };
    updateUnread();
    window.addEventListener('eduverse:notification', updateUnread);
    return () => {
      window.removeEventListener('eduverse:notification', updateUnread);
    };
  }, []);

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

  // Keep the live Supabase account flow separate from the local demo session.
  const handleLogin = (context: AuthContext) => {
    const school = context.school;
    demoModeRef.current = false;
    setIsDemoMode(false);
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
    setHasSandboxData(false);

    if (context.user.role === 'super_admin') {
      setProgramMode('school_erp');
      setCurrentTab('super_admin_console');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLoadSandboxData = () => {
    setStudents(INITIAL_STUDENTS.map(s => ({ ...s, schoolId: activeSchool.id })));
    setTeachers(INITIAL_TEACHERS.map(t => ({ ...t, schoolId: activeSchool.id })));
    setCourses(INITIAL_COURSES.map(c => ({ ...c, schoolId: activeSchool.id })));
    setGrades(INITIAL_GRADES.map(g => ({ ...g, schoolId: activeSchool.id })));
    setAttendance(INITIAL_ATTENDANCE.map(a => ({ ...a, schoolId: activeSchool.id })));
    setInvoices(INITIAL_INVOICES.map(i => ({ ...i, schoolId: activeSchool.id })));
    setAnnouncements(INITIAL_ANNOUNCEMENTS.map(an => ({ ...an, schoolId: activeSchool.id })));
    setLessons(INITIAL_LESSONS.map(l => ({ ...l, schoolId: activeSchool.id })));
    setAssignments(INITIAL_ASSIGNMENTS.map(a => ({ ...a, schoolId: activeSchool.id })));
    setQuestions(INITIAL_QUESTIONS.map(q => ({ ...q, schoolId: activeSchool.id })));
    setTimetableSlots(INITIAL_TIMETABLE_SLOTS.map(t => ({ ...t, schoolId: activeSchool.id })));
    setSchoolPeriods(DEFAULT_SCHOOL_PERIODS);
    setBehaviorRecords(INITIAL_BEHAVIOR_RECORDS.map(b => ({ ...b, schoolId: activeSchool.id })));
    setSdqAssessments(INITIAL_SDQ_ASSESSMENTS.map(s => ({ ...s, schoolId: activeSchool.id })));
    setInfirmaryVisits(INITIAL_INFIRMARY_VISITS.map(i => ({ ...i, schoolId: activeSchool.id })));
    setHomeworkSubmissions(INITIAL_HOMEWORK_SUBMISSIONS.map(h => ({ ...h, schoolId: activeSchool.id })));
    setHasSandboxData(true);
  };

  const handleClearSandboxData = () => {
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
    setBehaviorRecords([]);
    setSdqAssessments([]);
    setInfirmaryVisits([]);
    setHomeworkSubmissions([]);
    setLeaveRequests([]);
    setHasSandboxData(false);
  };

  const handleStartDemo = (targetRole: UserRole = 'admin') => {
    const school = INITIAL_SCHOOLS[0];
    const demoUser = DEMO_USERS.find((user) => user.role === targetRole) || DEMO_USERS[0];
    if (!demoUser) {
      setDataLoadError('Demo user is not configured.');
      return;
    }

    demoModeRef.current = true;
    setIsDemoMode(true);
    setIsSuperAdminSchoolView(false);
    setSchools(INITIAL_SCHOOLS);
    setActiveSchool(school);
    setCurrentUser(demoUser);
    setCurrentRole(demoUser.role);
    if (demoUser.role === 'parent') {
      setProgramMode('parent_portal');
    } else {
      setProgramMode('school_erp');
    }
    if (demoUser.role === 'super_admin') {
      setProgramMode('school_erp');
      setCurrentTab('super_admin_console');
    } else {
      setCurrentTab('dashboard');
    }
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setCourses(INITIAL_COURSES);
    setGrades(INITIAL_GRADES);
    setAttendance(INITIAL_ATTENDANCE);
    setInvoices(INITIAL_INVOICES);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setSystemConfig(INITIAL_SYSTEM_CONFIG);
    setLessons(INITIAL_LESSONS);
    setAssignments(INITIAL_ASSIGNMENTS);
    setQuestions(INITIAL_QUESTIONS);
    setPlayerScores(INITIAL_PLAYER_SCORES);
    setRewardItems(INITIAL_REWARD_ITEMS);
    setPeriodAttendance(INITIAL_PERIOD_ATTENDANCE);
    setPortfolioItems(INITIAL_PORTFOLIO_ITEMS);
    setTimetableSlots(INITIAL_TIMETABLE_SLOTS);
    setSchoolPeriods(DEFAULT_SCHOOL_PERIODS);
    setBehaviorRecords(INITIAL_BEHAVIOR_RECORDS);
    setSdqAssessments(INITIAL_SDQ_ASSESSMENTS);
    setInfirmaryVisits(INITIAL_INFIRMARY_VISITS);
    setHomeworkSubmissions(INITIAL_HOMEWORK_SUBMISSIONS);
    setRolePermissions(INITIAL_ROLE_PERMISSIONS);
    setPromotions(INITIAL_PROMOTIONS);
    setSubscriptionPlans(INITIAL_SUBSCRIPTION_PLANS);
    setIsDataReady(true);
    setLoadedSchoolId(school.id);
    setDataLoadError(null);
    setDataSyncError(null);
  };

  const handleLogout = async () => {
    try {
      if (!isDemoMode) await signOutFromSupabase();
      demoModeRef.current = false;
      setIsDemoMode(false);
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

  const handleViewSchool = (school: School) => {
    if (currentRole !== 'super_admin') return;
    setActiveSchool(school);
    setSystemConfig((prev) => ({
      ...prev,
      schoolNameEn: school.nameEn,
      schoolNameTh: school.nameTh,
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
    if (!isDemoMode) await updateSchoolStatusInSupabase(schoolId, nextStatus);
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
        if (active && context && !demoModeRef.current) handleLogin(context);
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
        setStudents(data.students);
        setTeachers(data.teachers);
        setCourses(data.courses);
        setGrades(data.grades);
        setAttendance(data.attendance);
        setInvoices(data.invoices);
        setAnnouncements(data.announcements);
        setSchoolPeriods(data.schoolPeriods);
        if (data.campusGates.length > 0) {
          setCampusGates(data.campusGates);
          try {
            localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(data.campusGates));
          } catch (error) {
            console.warn('Could not cache school check-in points locally:', error);
          }
        }
        // Real schools only keep school-scoped module items; do NOT force mock demo data
        setLessons(prev => prev.filter(l => l.schoolId === activeSchool.id));
        setAssignments(prev => prev.filter(a => a.schoolId === activeSchool.id));
        setQuestions(prev => prev.filter(q => q.schoolId === activeSchool.id));
        setPeriodAttendance(prev => prev.filter(p => p.schoolId === activeSchool.id));
        setPortfolioItems(prev => prev.filter(p => p.schoolId === activeSchool.id));
        setTimetableSlots(prev => prev.filter(t => t.schoolId === activeSchool.id));
        setBehaviorRecords(prev => prev.filter(b => b.schoolId === activeSchool.id));
        setSdqAssessments(prev => prev.filter(s => s.schoolId === activeSchool.id));
        setInfirmaryVisits(prev => prev.filter(i => i.schoolId === activeSchool.id));
        setHomeworkSubmissions(prev => prev.filter(h => h.schoolId === activeSchool.id));
        setIsDataReady(true);
        setLoadedSchoolId(activeSchool.id);

        // If new or clean real school, offer onboarding tutor
        if (data.students.length === 0 && data.teachers.length === 0) {
          setShowOnboardingTutorModal(true);
        }
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

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
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
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setStudents((prev) => [
      ...newStudents.map((s) => ({ ...s, schoolId: activeSchool.id })),
      ...prev,
    ]);
  };

  const handleImportTeachers = (newTeachers: Teacher[]) => {
    setTeachers((prev) => [
      ...newTeachers.map((t) => ({ ...t, schoolId: activeSchool.id })),
      ...prev,
    ]);
  };

  const handleAddCourse = (newCourse: Course) => {
    setCourses((prev) => [{ ...newCourse, schoolId: activeSchool.id }, ...prev]);
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
    );
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
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
    setCourses((prev) => [
      ...newCourses.map((c) => ({ ...c, schoolId: activeSchool.id })),
      ...prev.filter((existing) => !newCourses.some((n) => n.code.toLowerCase() === existing.code.toLowerCase())),
    ]);
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
    }
  ) => {
    const todayStr = extra?.date || getLocalDateString();
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setAttendance((prev) => {
      const isCheckOut = extra?.recordType === 'check_out';
      const st = schoolStudents.find(s => s.id === studentId);
      const tc = schoolTeachers.find(t => t.id === studentId || t.id === extra?.teacherId);

      const resolvedUserType: AttendanceUserType = extra?.userType || (tc ? 'teacher' : 'student');
      const resolvedName = extra?.userName || (st ? `${st.firstNameTh} ${st.lastNameTh}` : (tc ? tc.fullNameTh : 'ผู้ใช้งาน'));
      const resolvedRole = extra?.userRole || (st ? `นักเรียน (${st.gradeLevel})` : (tc ? tc.academicStanding : 'ครู/บุคลากร'));
      const resolvedAvatar = extra?.photoUrl || extra?.userAvatar || (st ? st.avatarUrl : (tc ? tc.avatarUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'));
      const resolvedDeptOrRoom = extra?.userDepartmentOrRoom || (st ? st.room : (tc ? tc.department : ''));

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
        location: extra?.location,
        lineNotificationSent: true
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

  const handlePayInvoice = (invoiceId: string, method?: TuitionInvoice['paymentMethod']) => {
    const paidTime = new Date().toISOString();
    const receiptNum = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'paid',
              paymentMethod: method || 'promptpay',
              paidAt: paidTime,
              receiptNumber: receiptNum,
            }
          : inv
      )
    );
    setDataSyncError(null);
  };

  const handleSendLineReminder = (_invoice: TuitionInvoice) => {
    setDataSyncError(null);
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
    setQuestions((prev) => [{ ...question, schoolId: activeSchool.id }, ...prev]);
  };

  const handleImportQuestions = (newQuestions: QuizQuestion[]) => {
    setQuestions((prev) => [...newQuestions.map(q => ({ ...q, schoolId: activeSchool.id })), ...prev]);
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

  const handleAddTimetableSlot = (slot: TimetableSlot) => {
    setTimetableSlots((prev) => [{ ...slot, schoolId: activeSchool.id }, ...prev]);
  };

  const handleDeleteTimetableSlot = (slotId: string) => {
    setTimetableSlots((prev) => prev.filter(s => s.id !== slotId));
  };

  const handleSaveSchoolPeriods = async (periods: SchoolPeriodTime[]) => {
    if (!currentUser) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกเวลาเรียน');
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
  };

  // Live accounts must load their school data; demo sessions use local fixtures.
  if (!currentUser) {
    return (
      <AuthLayout
        onLogin={handleLogin}
        onStartDemo={handleStartDemo}
        initialError={dataLoadError}
        lang={lang}
        setLang={setLang}
        themePalette={themePalette}
        setThemePalette={setThemePalette}
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
              }));
            }}
            onClose={() => setShowSchoolSwitcher(false)}
            lang={lang}
          />
        )}

        {showNotificationModal && (
          <NotificationCenterModal
            isOpen={showNotificationModal}
            onClose={() => {
              setShowNotificationModal(false);
              setUnreadNotifCount(getStoredNotifications().filter(n => !n.read).length);
            }}
            lang={lang}
          />
        )}

        {/* Offline Status Connectivity Banner */}
        <OfflineIndicator lang={lang} />
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
        onOpenGpsSettings={() => navigateToAppTab('school_gps')}
        onOpenGuide={currentRole !== 'super_admin' || isSuperAdminSchoolView ? () => setShowGuideModal(true) : undefined}
        onOpenImportExport={currentRole !== 'super_admin' || isSuperAdminSchoolView ? () => setShowImportExportModal(true) : undefined}
        onOpenOnboardingTutor={() => setShowOnboardingTutorModal(true)}
        onSwitchToMobileMode={() => setDeviceViewPreference('mobile')}
      />}
      {!useImmersiveGameLayout && isDemoMode && (
        <div role="status" className="shrink-0 mx-3 mt-1.5 px-3 py-1 rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/60 text-[11px] text-violet-900 dark:text-violet-100 flex items-center justify-between">
          <span>{lang === 'th' ? 'โหมดทดลองใช้งาน (Demo) — บันทึกในเซสชันเบราว์เซอร์' : 'Demo mode — browser session only.'}</span>
          <span className="font-bold uppercase text-[9px] px-1.5 py-0.5 bg-violet-200 dark:border-violet-800 text-violet-950 dark:text-violet-100 rounded">DEMO</span>
        </div>
      )}
      {!useImmersiveGameLayout && dataSyncError && (
        <div role="alert" className="shrink-0 mx-3 mt-1 px-3 py-1 rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-[11px] text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>ระบบยังไม่พร้อมดำเนินการ: {dataSyncError}</span>
          <button type="button" onClick={() => setDataSyncError(null)} className="font-bold ml-2">✕</button>
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
            {/* Quick Link to Onboarding Tutor in Drawer */}
            <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowOnboardingTutorModal(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 text-xs font-bold hover:bg-amber-100 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>ติวเตอร์ระบบ & ข้อมูลกระทรวง</span>
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
                lang={lang}
                onOpenProfile={() => {
                  setShowProfileModal(true);
                  setIsMobileMenuOpen(false);
                }}
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
              lang={lang}
              onOpenProfile={() => setShowProfileModal(true)}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 w-full max-w-full min-w-0 min-h-0 flex flex-col ${useImmersiveGameLayout ? 'p-0 overflow-hidden' : (isMobileInDesktopView ? 'p-3 overflow-visible' : 'p-2 sm:p-3 lg:p-4 overflow-y-auto')}`}>
          <div className={`${useImmersiveGameLayout ? 'max-w-none h-full' : (isMobileInDesktopView ? 'w-full' : 'max-w-7xl mx-auto')} w-full min-w-0 flex-1 min-h-0 flex flex-col`}>
            {!useImmersiveGameLayout && currentRole === 'super_admin' && isSuperAdminSchoolView && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    กำลังดูข้อมูลโรงเรียน: {activeSchool.nameTh}
                  </div>
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    โหมดตรวจสอบรายโรงเรียน — ข้อมูลและเมนูปฏิบัติงานของโรงเรียนจะแสดงตามบริบทนี้
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToAppTab('super_admin_console')}
                  className="shrink-0 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-slate-700"
                >
                  กลับศูนย์ควบคุม
                </button>
              </div>
            )}
            {/* Mode 1: School ERP / SIS */}
            {programMode === 'school_erp' && (
              <>
                {/* Top Horizontal Module Category Strip: 1-Click Access To Avoid Menu Scrolling */}
                {currentTab !== 'super_admin_console' && !useImmersiveGameLayout && (
                  <div className="shrink-0 mb-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-0.5">
                    <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] min-w-0 max-w-full shadow-2xs">
                      {[
                        { id: 'academics', labelTh: '🎓 วิชาการ & ทะเบียน', labelEn: 'Academics', defaultTab: 'dashboard' as NavTab, tabs: ['dashboard', 'students', 'teachers', 'courses', 'timetable', 'gradebook'] },
                        { id: 'student_care', labelTh: '🏥 กิจการ & ดูแล', labelEn: 'Student Care', defaultTab: 'attendance' as NavTab, tabs: ['attendance', 'mobile_checkin', 'student_id_cards', 'behavior_sdq', 'infirmary'] },
                        { id: 'innovation', labelTh: '🚀 นวัตกรรม & AI', labelEn: 'Labs & AI', defaultTab: 'homework' as NavTab, tabs: ['homework', 'portfolio', 'study_streak', 'socratic_tutor', 'realworld_quests', 'boss_raid', 'ai_diagnostic', 'subject_labs', 'games', 'hall_of_fame'] },
                        { id: 'administration', labelTh: '⚙️ บริหาร & GPS', labelEn: 'Admin & GPS', defaultTab: 'school_gps' as NavTab, tabs: ['school_gps', 'executive_warning', 'school_permissions', 'system_settings'] },
                        { id: 'finance', labelTh: '💰 การเงิน & ข่าว', labelEn: 'Finance', defaultTab: 'billing' as NavTab, tabs: ['billing', 'announcements'] },
                      ].map((cat) => {
                        const isCatActive = cat.tabs.includes(currentTab);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (!isCatActive) {
                                navigateToAppTab(cat.defaultTab);
                              }
                            }}
                            className={`min-w-0 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                              isCatActive
                                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                            }`}
                          >
                            <span>{lang === 'th' ? cat.labelTh : cat.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Direct School GPS Coordinates Button for School Admin */}
                    {(currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'teacher') && (
                      <button
                        type="button"
                        onClick={() => navigateToAppTab('school_gps')}
                        className={`self-start sm:self-auto px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          currentTab === 'school_gps'
                            ? 'bg-amber-400 text-slate-950 border-amber-600 shadow-xs'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900'
                        }`}
                        title="กำหนดพิกัด GPS ละติจูด ลองจิจูด รัศมี และประตูโรงเรียน"
                      >
                        <span className="text-amber-700 dark:text-amber-300">📍</span>
                        <span className="hidden sm:inline font-bold">
                          {lang === 'th' ? 'ตั้งค่าพิกัด GPS โรงเรียน' : 'School GPS'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

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
                    allUsers={demoUsers}
                    lang={lang}
                    isDemoMode={isDemoMode}
                    onViewSchool={handleViewSchool}
                    onToggleSchoolStatus={handleToggleSchoolStatus}
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
                    onUpdateConfig={setSystemConfig}
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
                    sdqAssessments={schoolSdqAssessments}
                    behaviorRecords={schoolBehaviorRecords}
                    onNavigateToTab={(tab: string) => navigateToAppTab(tab as NavTab)}
                  />
                )}

                {currentTab === 'dashboard' && (
                  <DashboardView
                    students={schoolStudents}
                    teachers={schoolTeachers}
                    courses={schoolCourses}
                    attendance={schoolAttendance}
                    invoices={schoolInvoices}
                    announcements={schoolAnnouncements}
                    systemConfig={systemConfig}
                    school={activeSchool}
                    currentUser={currentUser}
                    lang={lang}
                    onNavigate={setCurrentTab}
                    onQuickCheckIn={handleQuickCheckIn}
                  />
                )}

                {currentTab === 'students' && (
                  <StudentsView
                    students={schoolStudents}
                    onSelectStudent={setSelectedStudentForProfile}
                    onOpenReportCard={setSelectedStudentForReport}
                    onToggleLineSync={handleToggleLineSync}
                    onAddStudent={handleAddStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
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
                    onOpenImportExport={() => setShowImportExportModal(true)}
                  />
                )}

                {currentTab === 'courses' && (
                  <CoursesView
                    courses={schoolCourses}
                    students={schoolStudents}
                    onAddCourse={handleAddCourse}
                    onUpdateCourse={handleUpdateCourse}
                    onDeleteCourse={handleDeleteCourse}
                    onEnrollStudent={handleEnrollStudent}
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
                    isMobileMode={shouldShowMobileView}
                    onAddQuestion={handleAddQuestion}
                    onImportQuestions={handleImportQuestions}
                    onEarnRewards={handleEarnRewards}
                    onRedeemReward={handleRedeemReward}
                    onGamePlayingChange={setIsGamePlaying}
                    onExit={() => setCurrentTab('dashboard')}
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
                  />
                )}

                {currentTab === 'socratic_tutor' && (
                  <SocraticTutorView
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                  />
                )}

                {currentTab === 'realworld_quests' && (
                  <RealWorldSnapQuestView
                    lang={lang}
                    currentRole={currentRole}
                  />
                )}

                {currentTab === 'ai_diagnostic' && (
                  <AiDiagnosticLearningView
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
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
                  />
                )}

                {currentTab === 'billing' && (
                  <BillingView
                    students={schoolStudents}
                    invoices={schoolInvoices}
                    systemConfig={systemConfig}
                    onPayInvoice={handlePayInvoice}
                    onSendLineReminder={handleSendLineReminder}
                  />
                )}

                {currentTab === 'announcements' && (
                  <AnnouncementsView
                    announcements={schoolAnnouncements}
                    systemConfig={systemConfig}
                    onAddAnnouncement={handleAddAnnouncement}
                    onBroadcastLine={handleBroadcastLine}
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
          onLoadSandboxData={handleLoadSandboxData}
          onClearSandboxData={handleClearSandboxData}
          hasSandboxData={hasSandboxData}
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
      {showNotificationModal && (
        <NotificationCenterModal
          isOpen={showNotificationModal}
          onClose={() => {
            setShowNotificationModal(false);
            setUnreadNotifCount(getStoredNotifications().filter(n => !n.read).length);
          }}
          lang={lang}
        />
      )}

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator lang={lang} />
    </div>
  );
};

export default App;
