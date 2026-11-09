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
import { loadSchoolData, syncDataToSupabase } from './lib/supabase';
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
import { OfflineIndicator } from './components/OfflineIndicator';
import { AiDiagnosticLearningView } from './components/AiDiagnosticLearningView';
import { HallOfFame3DView } from './components/HallOfFame3DView';
import { ExecutiveEarlyWarningView } from './components/ExecutiveEarlyWarningView';
import { StudyStreakQuestPassView } from './components/StudyStreakQuestPassView';
import { CoopBossRaidView } from './components/CoopBossRaidView';
import { SocraticTutorView } from './components/SocraticTutorView';
import { RealWorldSnapQuestView } from './components/RealWorldSnapQuestView';
import { MobileAppShell } from './components/MobileAppShell';
import { getLocalDateString } from './lib/date';
import { LayoutDashboard, QrCode, Gamepad2, Briefcase, Users, X, User } from 'lucide-react';

export const App: React.FC = () => {
  // Multi-School & Auth State
  const [schools, setSchools] = useState<School[]>([]);
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

  // Navigation, Mode, Theme, Language & Mobile Drawer State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
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
  const useImmersiveGameLayout = isGamePlaying || ['games', 'boss_raid', 'subject_labs'].includes(currentTab);

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
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);

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
    if (context.user.role === 'super_admin') {
      setProgramMode('school_erp');
      setCurrentTab('super_admin_console');
    } else {
      setCurrentTab('dashboard');
    }
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
        setCourses(data.courses);
        setGrades(data.grades);
        setAttendance(data.attendance);
        setInvoices(data.invoices);
        setAnnouncements(data.announcements);
        // Preserve module records so other school modules stay functional
        setLessons(prev => prev.length > 0 ? prev : INITIAL_LESSONS.map(l => ({ ...l, schoolId: activeSchool.id })));
        setAssignments(prev => prev.length > 0 ? prev : INITIAL_ASSIGNMENTS.map(a => ({ ...a, schoolId: activeSchool.id })));
        setQuestions(prev => prev.length > 0 ? prev : INITIAL_QUESTIONS.map(q => ({ ...q, schoolId: activeSchool.id })));
        setPlayerScores(prev => prev.length > 0 ? prev : INITIAL_PLAYER_SCORES);
        setRewardItems(prev => prev.length > 0 ? prev : INITIAL_REWARD_ITEMS);
        setPeriodAttendance(prev => prev.length > 0 ? prev : INITIAL_PERIOD_ATTENDANCE.map(p => ({ ...p, schoolId: activeSchool.id })));
        setPortfolioItems(prev => prev.length > 0 ? prev : INITIAL_PORTFOLIO_ITEMS.map(p => ({ ...p, schoolId: activeSchool.id })));
        setTimetableSlots(prev => prev.length > 0 ? prev : INITIAL_TIMETABLE_SLOTS.map(t => ({ ...t, schoolId: activeSchool.id })));
        setBehaviorRecords(prev => prev.length > 0 ? prev : INITIAL_BEHAVIOR_RECORDS.map(b => ({ ...b, schoolId: activeSchool.id })));
        setSdqAssessments(prev => prev.length > 0 ? prev : INITIAL_SDQ_ASSESSMENTS.map(s => ({ ...s, schoolId: activeSchool.id })));
        setInfirmaryVisits(prev => prev.length > 0 ? prev : INITIAL_INFIRMARY_VISITS.map(i => ({ ...i, schoolId: activeSchool.id })));
        setHomeworkSubmissions(prev => prev.length > 0 ? prev : INITIAL_HOMEWORK_SUBMISSIONS.map(h => ({ ...h, schoolId: activeSchool.id })));
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
    setTeachers((prev) => [{ ...newTeacher, schoolId: activeSchool.id }, ...prev]);
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
      <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="text-xl font-bold">
            {dataLoadError ? 'โหลดข้อมูลโรงเรียนไม่สำเร็จ' : 'กำลังโหลดข้อมูลโรงเรียน...'}
          </h1>
          {dataLoadError && <p role="alert" className="text-sm text-rose-300">{dataLoadError}</p>}
          {dataLoadError && (
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold">
              ลองใหม่
            </button>
          )}
        </div>
      </main>
    );
  }

  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';

  // Responsive: If on mobile screen (or user opted into mobile view), render the clean, uncluttered MobileAppShell
  if (shouldShowMobileView) {
    return (
      <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'} font-sans`}>
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

        {/* Offline Status Connectivity Banner */}
        <OfflineIndicator lang={lang} />
      </div>
    );
  }

  return (
    <div className={`h-dvh max-h-dvh overflow-hidden ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Navbar */}
      {!useImmersiveGameLayout && <Navbar
        currentUser={currentUser}
        activeSchool={activeSchool}
        currentRole={currentRole}
        isSuperAdminSchoolView={isSuperAdminSchoolView}
        systemConfig={systemConfig}
        unreadCount={schoolAnnouncements.length}
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
        onSwitchToMobileMode={() => setDeviceViewPreference('mobile')}
      />}
      {!useImmersiveGameLayout && isDemoMode && (
        <div role="status" className="shrink-0 mx-3 mt-1.5 px-3 py-1 rounded-md border border-violet-200 bg-violet-50 text-[11px] text-violet-900 flex items-center justify-between">
          <span>{lang === 'th' ? 'โหมดทดลองใช้งาน (Demo) — บันทึกในเซสชันเบราว์เซอร์' : 'Demo mode — browser session only.'}</span>
          <span className="font-bold uppercase text-[9px] px-1.5 py-0.2 bg-violet-200 rounded">DEMO</span>
        </div>
      )}
      {!useImmersiveGameLayout && dataSyncError && (
        <div role="alert" className="shrink-0 mx-3 mt-1 px-3 py-1 rounded-md border border-rose-300 bg-rose-50 text-[11px] text-rose-800 flex items-center justify-between">
          <span>ระบบยังไม่พร้อมดำเนินการ: {dataSyncError}</span>
          <button type="button" onClick={() => setDataSyncError(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Mobile Drawer Overlay and Sidebar */}
      {!useImmersiveGameLayout && isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">เมนูระบบโรงเรียน (EduVerse)</span>
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
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

      <div className={`flex-1 flex overflow-hidden min-w-0 min-h-0 ${useImmersiveGameLayout ? 'fixed inset-0 z-50 bg-slate-950' : ''}`}>
        {/* Desktop Left Sidebar only shown in School ERP mode */}
        {!useImmersiveGameLayout && programMode === 'school_erp' && (
          <div className="hidden md:flex shrink-0">
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
        <main className={`flex-1 w-full max-w-full min-w-0 min-h-0 flex flex-col overflow-hidden ${useImmersiveGameLayout ? 'p-0' : 'p-2 sm:p-3 lg:p-4'}`}>
          <div className={`${useImmersiveGameLayout ? 'max-w-none' : 'max-w-7xl mx-auto'} w-full min-w-0 flex-1 min-h-0 flex flex-col overflow-hidden`}>
            {!useImmersiveGameLayout && currentRole === 'super_admin' && isSuperAdminSchoolView && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-bold text-blue-900">
                    กำลังดูข้อมูลโรงเรียน: {activeSchool.nameTh}
                  </div>
                  <div className="text-xs text-blue-800">
                    โหมดตรวจสอบรายโรงเรียน — ข้อมูลและเมนูปฏิบัติงานของโรงเรียนจะแสดงตามบริบทนี้
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToAppTab('super_admin_console')}
                  className="shrink-0 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
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
                  <div className="shrink-0 mb-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700/80 shrink-0">
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
                            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                              isCatActive
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-slate-900'
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
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          currentTab === 'school_gps'
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                        }`}
                        title="กำหนดพิกัด GPS ละติจูด ลองจิจูด รัศมี และประตูโรงเรียน"
                      >
                        <span className="text-amber-600 dark:text-amber-400">📍</span>
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
                      lang={lang}
                      onUpdateCampusGates={handleUpdateCampusGates}
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
                    lang={lang}
                    campusGates={campusGates}
                    onUpdateCampusGates={handleUpdateCampusGates}
                    onUpdateSchoolCoordinates={handleUpdateSchoolCoordinates}
                    onUpdateConfig={setSystemConfig}
                  />
                )}

                {currentTab === 'executive_warning' && (
                  <ExecutiveEarlyWarningView
                    lang={lang}
                    currentRole={currentRole}
                    currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้บริหารสถานศึกษา'}
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
                    onAddSlot={handleAddTimetableSlot}
                    onDeleteSlot={handleDeleteTimetableSlot}
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
                    lang={lang}
                    onRecordAttendance={handleRecordAttendance}
                    onUpdateLeaveStatus={handleUpdateLeaveStatus}
                    onUpdateCampusGates={handleUpdateCampusGates}
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
                    onRecordAttendance={handleRecordAttendance}
                    onRecordPeriodAttendance={handleRecordPeriodAttendance}
                    onAddLeaveRequest={handleAddLeaveRequest}
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-sm">
        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('dashboard');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'dashboard'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
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
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'attendance'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
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
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'games'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
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
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'portfolio'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span>ผลงาน</span>
        </button>

        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition text-slate-500 hover:text-slate-800"
        >
          <User className="w-5 h-5 text-blue-600" />
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

      {/* Data Import / Export Modal (Bulk CSV/Excel for Students, Teachers, Questions) */}
      {showImportExportModal && (
        <DataImportExportModal
          students={schoolStudents}
          teachers={schoolTeachers}
          questions={schoolQuestions}
          lang={lang}
          onImportStudents={handleImportStudents}
          onImportTeachers={handleImportTeachers}
          onImportQuestions={handleImportQuestions}
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

      {/* Direct School GPS & Gate Geofence Settings Modal */}
      {showGpsModal && (
        <SchoolGpsModal
          isOpen={showGpsModal}
          onClose={() => setShowGpsModal(false)}
          activeSchool={activeSchool}
          campusGates={campusGates}
          lang={lang}
          onUpdateCampusGates={handleUpdateCampusGates}
          onUpdateSchoolCoordinates={handleUpdateSchoolCoordinates}
        />
      )}
      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator lang={lang} />
    </div>
  );
};

export default App;
