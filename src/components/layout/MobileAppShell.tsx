import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Home, 
  Clock, 
  FileText, 
  Gamepad2, 
  User, 
  Laptop, 
  Bell, 
  GraduationCap, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Award,
  Sparkles,
  ChevronRight, 
  BookOpen, 
  ArrowLeft, 
  LogOut, 
  CreditCard, 
  Swords, 
  FlaskConical, 
  Trophy, 
  Flame, 
  Calendar,
  Globe,
  Sun,
  Moon,
  Send,
  HelpCircle,
  Monitor,
  TrendingUp,
  HeartPulse,
  Receipt,
  ShieldCheck,
  BarChart3,
  BellRing,
  Edit3,
  Megaphone,
  SlidersHorizontal,
  Users,
  Fingerprint,
  Lock,
  KeyRound,
  Trash2,
  MoreHorizontal,
  ClipboardCheck,
  Search,
  CalendarDays,
  LogIn,
  RefreshCw,
  Maximize2,
  Minimize2,
  Smartphone,
} from 'lucide-react';
import { 
  AuthUser, 
  School, 
  UserRole, 
  AppLanguage, 
  ThemePalette, 
  Student, 
  Teacher, 
  Course, 
  AttendanceRecord, 
  PeriodAttendanceRecord, 
  LeaveRequest, 
  LeaveStatus, 
  Assignment, 
  HomeworkSubmission, 
  Announcement, 
  QuizQuestion, 
  PlayerScore, 
  RewardItem, 
  CampusGateGeofence,
  AttendanceStatus,
  AttendanceCheckType,
  AttendanceUserType,
  GradeRecord,
  TuitionInvoice,
  InfirmaryVisit,
  BehaviorRecord,
  SdqAssessment,
  SchoolFeatureFlags,
  TimetableSlot,
  SchoolPeriodTime,
  GradingSystem,
  PortfolioItem
} from '../../types';
import { calculateStudentAcademicSummary } from '../../lib/moeGrading';
import arcadeBannerImg from '../../assets/images/student_arcade_banner_1794996857506.jpg';
import { getLocalDateString } from '../../lib/date';
import { calculateGrade } from '../../lib/schoolSettings';
import { DEFAULT_SCHOOL_PERIODS } from '../../lib/schoolPeriods';
import { slotHasTeacher } from '../../lib/timetableTeachers';
import { SchoolPolicyId } from '../../lib/schoolPermissions';
import {
  filterAttendanceForUser,
  filterLeaveRequestsForUser,
  isRestrictedAttendanceViewer,
  resolveLinkedStudentsForUser,
  resolveOwnStudent,
} from '../../lib/attendanceScope';
import {
  filterAnnouncementsForRole,
  filterAssignmentsForPersonalRole,
  filterCoursesForPersonalRole,
  filterTimetableSlotsForPersonalRole,
} from '../../lib/studentDataScope';
import {
  addCalendarDays,
  getBangkokClockSnapshot,
  getBangkokDateInputValue,
  getCalendarWeekStart,
  getTimetableSlotActivityStatus,
} from '../../lib/timetableCalendar';
import {
  HolidaySyncStatus,
  getHolidayForDate,
  getHolidaysForDate,
  getHolidaysForYear,
  getHolidaysInMonth,
  getPublicHolidaySyncStatus,
  getThaiHolidayCategoryLabel,
  getUpcomingHolidays,
  isWeekendDate,
  syncPublicHolidaysFromApi,
} from '../../lib/thaiHolidays';
import { GoogleCalendarSyncModal } from '../GoogleCalendarSyncModal';
import { PeriodTimeMissionsCard } from '../PeriodTimeMissionsCard';
import {
  enterLandscapeGameMode,
  exitLandscapeGameMode,
  isLandscapeViewport,
} from '../../lib/screenOrientation';
import { MobileAttendanceView } from '../../views/MobileAttendanceView';
import { EduBattleGameView } from '../../views/EduBattleGameView';
import { EduBattleRoyale3DView } from '../../views/EduBattleRoyale3DView';
import { CoopBossRaidView } from '../../views/CoopBossRaidView';
import { SubjectLabSimulationView } from '../../views/SubjectLabSimulationView';
import { HallOfFame3DView } from '../../views/HallOfFame3DView';
import { DigitalIdCardView } from '../../views/DigitalIdCardView';
import { PortfolioView } from '../../views/PortfolioView';
import { StudentMobileHome } from '../student/StudentMobileHome';
import { PagedList } from '../PagedList';
import { PWAInstallButton } from '../PWAInstallButton';
import { BaanPakKruLogo } from '../common/BaanPakKruLogo';
import { ViewErrorBoundary } from '../common/ViewErrorBoundary';
import { MobileAdminQuickHub, MobileSuperAdminHub } from './MobileRoleWorkspace';
import { AdminDailyDashboardView } from '../../views/AdminDailyDashboardView';
import {
  enrollBiometricPasskey,
  getPasskeyForUser,
  getWebAuthnSupportInfo,
  removeEnrolledPasskey,
  updatePasskeyPreferences,
  verifyBiometricPasskey,
  type EnrolledBiometricPasskey,
  type WebAuthnSupportInfo,
} from '../../lib/webAuthn';
import type { NavTab } from './Sidebar';

export type MobileTab =
  | 'home'
  | 'admin_quick'
  | 'super_schools'
  | 'executive'
  | 'checkin'
  | 'leave'
  | 'gradebook'
  | 'student_grades'
  | 'portfolio'
  | 'timetable'
  | 'games'
  | 'profile'
  | 'homework'
  | 'announcements';

const splitAnnouncementIntoPages = (content: string, pageLength = 420) => {
  const characters = Array.from(content);
  const pages: string[] = [];

  for (let start = 0; start < characters.length; start += pageLength) {
    pages.push(characters.slice(start, start + pageLength).join(''));
  }

  return pages.length > 0 ? pages : [''];
};

interface MobileAppShellProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette: ThemePalette;
  setThemePalette: (palette: ThemePalette) => void;
  onLogout: () => void;
  onSwitchToDesktopMode: () => void;
  onOpenProfileModal: () => void;
  onOpenOnboardingTutor?: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  
  // Data props
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  grades?: GradeRecord[];
  invoices?: TuitionInvoice[];
  infirmaryVisits?: InfirmaryVisit[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  assignments: Assignment[];
  homeworkSubmissions: HomeworkSubmission[];
  announcements: Announcement[];
  questions: QuizQuestion[];
  playerScores: PlayerScore[];
  rewardItems: RewardItem[];
  campusGates: CampusGateGeofence[];

  // Action Handlers
  onRecordAttendance: (
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
  ) => void;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveStatus: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (itemId: string, costGems: number) => void;
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (imported: QuizQuestion[]) => void;
  onUpdateStudent?: (student: Student) => void;
  timetableSlots?: TimetableSlot[];
  schoolPeriods?: SchoolPeriodTime[];
  gradingSystem?: GradingSystem;
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  onUpdateGrade?: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onAddGrade?: (grade: GradeRecord, options?: { notify?: boolean }) => void;
  // Role-first Mobile & Desktop Continuity Props
  schools?: School[];
  isDemoMode?: boolean;
  coordinationUnreadCount?: number;
  onOpenSchoolSwitcher?: () => void;
  onUpdateSchool?: (updates: Partial<School>) => Promise<void>;
  onAddAnnouncement?: (announcement: Announcement) => void;
  onApproveInvoiceSlip?: (invoiceId: string) => void;
  onRejectInvoiceSlip?: (invoiceId: string, reason: string) => void;
  onViewSchool?: (school: School) => void;
  onToggleSchoolStatus?: (schoolId: string, status: School['status']) => Promise<void>;
  onUpdateSchoolFeatureFlags?: (schoolId: string, flags: SchoolFeatureFlags) => void;
  onJumpToDesktopTab?: (tab: NavTab) => void;
  initialMobileTab?: MobileTab;
  initialAttendanceSubTab?: 'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin';
  initialPeriodCourseId?: string;
  initialPeriodNumber?: number;
  initialPeriodDate?: string;
  initialPeriodCode?: string;
  initialPeriodCheckType?: 'check_in' | 'check_out';
  onBiometricLock?: () => void;
  portfolioItems?: PortfolioItem[];
  onAddPortfolioItem?: (item: PortfolioItem) => void;
  onDeletePortfolioItem?: (itemId: string) => void;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  currentUser,
  activeSchool,
  currentRole,
  lang,
  setLang,
  themePalette,
  setThemePalette,
  onLogout,
  onSwitchToDesktopMode,
  onOpenProfileModal,
  onOpenOnboardingTutor,
  unreadCount = 0,
  onOpenNotifications,
  students,
  teachers = [],
  courses,
  grades = [],
  invoices = [],
  infirmaryVisits = [],
  behaviorRecords = [],
  sdqAssessments = [],
  attendance,
  periodAttendance,
  leaveRequests,
  assignments,
  homeworkSubmissions,
  announcements,
  questions,
  playerScores,
  rewardItems,
  campusGates,
  onRecordAttendance,
  onRecordPeriodAttendance,
  onAddLeaveRequest,
  onUpdateLeaveStatus,
  onEarnRewards,
  onRedeemReward,
  onAddQuestion,
  onImportQuestions,
  onUpdateStudent,
  timetableSlots = [],
  schoolPeriods = DEFAULT_SCHOOL_PERIODS,
  gradingSystem = activeSchool.gradingSystem || 'thai',
  schoolPermissions,
  onUpdateGrade,
  onAddGrade,
  schools = [],
  isDemoMode = false,
  coordinationUnreadCount = 0,
  onOpenSchoolSwitcher,
  onUpdateSchool,
  onAddAnnouncement,
  onApproveInvoiceSlip,
  onRejectInvoiceSlip,
  onViewSchool,
  onToggleSchoolStatus,
  onUpdateSchoolFeatureFlags,
  onJumpToDesktopTab,
  initialMobileTab = 'home',
  initialAttendanceSubTab = 'selfie_mobile',
  initialPeriodCourseId,
  initialPeriodNumber,
  initialPeriodDate,
  initialPeriodCode,
  initialPeriodCheckType,
  onBiometricLock,
  portfolioItems = [],
  onAddPortfolioItem,
  onDeletePortfolioItem,
}) => {
  const [passkey, setPasskey] = useState<EnrolledBiometricPasskey | null>(() =>
    getPasskeyForUser(currentUser?.id)
  );
  const [webAuthnInfo, setWebAuthnInfo] = useState<WebAuthnSupportInfo | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMsg, setBioMsg] = useState<string | null>(null);
  const [bioErr, setBioErr] = useState<string | null>(null);

  React.useEffect(() => {
    setPasskey(getPasskeyForUser(currentUser?.id));
  }, [currentUser?.id]);

  React.useEffect(() => {
    getWebAuthnSupportInfo().then(setWebAuthnInfo).catch(() => {});
  }, []);

  const handleEnrollPasskey = async () => {
    if (!currentUser) return;
    setBioBusy(true);
    setBioErr(null);
    setBioMsg(null);
    try {
      const enrolled = await enrollBiometricPasskey({
        userId: currentUser.id,
        email: currentUser.email,
        fullNameTh: currentUser.fullNameTh,
        fullNameEn: currentUser.fullNameEn,
        role: currentUser.role,
        schoolId: activeSchool.id,
        protectQuickAttendance:
          currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'teacher',
      });
      setPasskey(enrolled);
      setBioMsg(
        lang === 'th'
          ? `ลงทะเบียน ${enrolled.deviceLabel} สำเร็จ`
          : `Enrolled ${enrolled.deviceLabel}`
      );
    } catch (err) {
      setBioErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBioBusy(false);
    }
  };

  const handleTestPasskey = async () => {
    if (!currentUser) return;
    setBioBusy(true);
    setBioErr(null);
    setBioMsg(null);
    try {
      const res = await verifyBiometricPasskey({ userId: currentUser.id });
      setPasskey(res.passkey);
      setBioMsg(
        lang === 'th'
          ? 'ยืนยัน FaceID / TouchID สำเร็จ ✓'
          : 'Biometric verification passed'
      );
    } catch (err) {
      setBioErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBioBusy(false);
    }
  };
  const [activeTab, setActiveTab] = useState<MobileTab>(initialMobileTab);
  const [activeGameView, setActiveGameView] = useState<'hub' | 'arcade_studio' | 'battle_royale_3d' | '1v1_arena' | 'boss_raid' | 'subject_labs' | 'hall_of_fame'>('hub');
  const [isLandscapeScreen, setIsLandscapeScreen] = useState<boolean>(() => isLandscapeViewport());
  const [gameOrientationNotice, setGameOrientationNotice] = useState<string | null>(null);

  useEffect(() => {
    const syncOrientation = () => setIsLandscapeScreen(isLandscapeViewport());
    window.addEventListener('resize', syncOrientation);
    window.addEventListener('orientationchange', syncOrientation);
    return () => {
      window.removeEventListener('resize', syncOrientation);
      window.removeEventListener('orientationchange', syncOrientation);
    };
  }, []);

  useEffect(() => {
    if (activeGameView === 'hub') {
      void exitLandscapeGameMode();
      setGameOrientationNotice(null);
    }
  }, [activeGameView]);
  const [profilePage, setProfilePage] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Mobile Teacher Quick Gradebook state
  const [mobileGradeCourseId, setMobileGradeCourseId] = useState<string>(courses[0]?.id || '');
  const [mobileGradeSearch, setMobileGradeSearch] = useState('');
  const [mobileGradeRoom, setMobileGradeRoom] = useState('all');
  const [mobileGradeToast, setMobileGradeToast] = useState<string | null>(null);

  // Mobile Timetable & Calendar state
  const [bangkokClock, setBangkokClock] = useState(() => getBangkokClockSnapshot());
  const todayBangkokStr = bangkokClock.dateStr;
  const currentBangkokYear = Number(todayBangkokStr.slice(0, 4));
  const todayDayKey = bangkokClock.dayKey;
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>(todayDayKey);
  const [timetableOnlyMine, setTimetableOnlyMine] = useState<boolean>(currentRole === 'teacher');
  const [mobileTimetableMode, setMobileTimetableMode] = useState<'day' | 'calendar'>('day');
  const [mobileCalendarMonthCursor, setMobileCalendarMonthCursor] = useState<{ year: number; month: number }>(() => ({
    year: Number(todayBangkokStr.slice(0, 4)),
    month: Number(todayBangkokStr.slice(5, 7)) - 1,
  }));
  const [mobileSelectedCalendarDate, setMobileSelectedCalendarDate] = useState<string>(todayBangkokStr);
  const [showMobileCalendarSync, setShowMobileCalendarSync] = useState(false);
  const [holidaySyncTick, setHolidaySyncTick] = useState(0);
  const [holidaySyncStatus, setHolidaySyncStatus] = useState<HolidaySyncStatus | null>(() =>
    getPublicHolidaySyncStatus(currentBangkokYear)
  );
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);

  // Dynamic Check-in deep-link state so tapping any timetable slot jumps cleanly into Period Check-in/Check-out
  const [mobileAttendanceInitialSubTab, setMobileAttendanceInitialSubTab] = useState<
    'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin'
  >(initialAttendanceSubTab);
  const [mobilePeriodCourseId, setMobilePeriodCourseId] = useState<string | undefined>(initialPeriodCourseId);
  const [mobilePeriodNumber, setMobilePeriodNumber] = useState<number | undefined>(initialPeriodNumber);
  const [mobilePeriodDate, setMobilePeriodDate] = useState<string | undefined>(initialPeriodDate);
  const [mobilePeriodCheckType, setMobilePeriodCheckType] = useState<'check_in' | 'check_out' | undefined>(
    initialPeriodCheckType
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBangkokClock(getBangkokClockSnapshot());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileAttendanceInitialSubTab(initialAttendanceSubTab);
    setMobilePeriodCourseId(initialPeriodCourseId);
    setMobilePeriodNumber(initialPeriodNumber);
    setMobilePeriodDate(initialPeriodDate);
    setMobilePeriodCheckType(initialPeriodCheckType);
  }, [initialAttendanceSubTab, initialPeriodCourseId, initialPeriodNumber, initialPeriodDate, initialPeriodCheckType]);

  useEffect(() => {
    let cancelled = false;
    const yearsToSync = Array.from(
      new Set([
        mobileCalendarMonthCursor.year,
        currentBangkokYear,
        ...(Number(todayBangkokStr.slice(5, 7)) >= 10 ? [currentBangkokYear + 1] : []),
      ])
    );
    void Promise.all(yearsToSync.map((yr) => syncPublicHolidaysFromApi(yr))).then((results) => {
      if (cancelled) return;
      const primary =
        results.find((r) => r.year === mobileCalendarMonthCursor.year) ||
        results.find((r) => r.year === currentBangkokYear) ||
        results[0];
      if (primary) setHolidaySyncStatus(primary);
      setHolidaySyncTick((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [mobileCalendarMonthCursor.year, currentBangkokYear, todayBangkokStr]);

  useEffect(() => {
    const onHolidaysUpdated = () => {
      setHolidaySyncStatus(
        getPublicHolidaySyncStatus(mobileCalendarMonthCursor.year) || getPublicHolidaySyncStatus(currentBangkokYear)
      );
      setHolidaySyncTick((v) => v + 1);
    };
    window.addEventListener('eduverse:holidays-updated', onHolidaysUpdated);
    return () => window.removeEventListener('eduverse:holidays-updated', onHolidaysUpdated);
  }, [mobileCalendarMonthCursor.year, currentBangkokYear]);

  const handleManualMobileHolidaySync = async (targetYear = currentBangkokYear) => {
    setIsSyncingHolidays(true);
    try {
      const result = await syncPublicHolidaysFromApi(targetYear, { force: true });
      if (targetYear !== currentBangkokYear + 1 && Number(todayBangkokStr.slice(5, 7)) >= 10) {
        await syncPublicHolidaysFromApi(currentBangkokYear + 1, { force: true });
      }
      setHolidaySyncStatus(result);
      setHolidaySyncTick((v) => v + 1);
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  useEffect(() => {
    if (!mobileGradeCourseId && courses.length > 0) {
      setMobileGradeCourseId(courses[0].id);
    }
  }, [courses, mobileGradeCourseId]);

  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isHeaderMenuOpen]);

  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';
  const todayStr = getLocalDateString();

  const isRestrictedViewer = isRestrictedAttendanceViewer(currentUser);
  const linkedStudents = useMemo(
    () => (isRestrictedViewer ? resolveLinkedStudentsForUser(currentUser, students) : students),
    [currentUser, isRestrictedViewer, students]
  );
  const ownStudent = resolveOwnStudent(currentUser, students);
  const currentPersonId = ownStudent?.id || currentUser?.id;
  const scopedAttendance = filterAttendanceForUser(attendance, currentUser, students);
  const todayCheckin = scopedAttendance.find(a => a.date === todayStr);

  // Enforce school-level role policies at runtime on mobile
  const canSelfCheckin =
    currentRole === 'student'
      ? schoolPermissions?.student_self_checkin !== false
      : currentRole === 'teacher'
      ? schoolPermissions?.teacher_attendance !== false
      : true;
  const canPlayGames =
    currentRole === 'student' ? schoolPermissions?.student_treasure_game !== false : true;
  const canEditGradesMobile =
    currentRole === 'admin' ||
    currentRole === 'super_admin' ||
    (currentRole === 'teacher' && schoolPermissions?.teacher_grade_entry !== false);
  const canAccessHomework =
    currentRole === 'student'
      ? schoolPermissions?.student_submit_homework !== false
      : currentRole === 'teacher'
      ? schoolPermissions?.teacher_homework !== false
      : true;
  const canViewFinancialsMobile =
    currentRole === 'admin' ||
    currentRole === 'super_admin' ||
    currentRole === 'parent' ||
    (currentRole === 'teacher' && schoolPermissions?.teacher_view_financials !== false);

  // Scoped leave requests (students/parents see ONLY their own leave counts)
  const myLeaves = isRestrictedViewer
    ? filterLeaveRequestsForUser(leaveRequests, currentUser, students)
    : leaveRequests;
  const pendingLeavesCount = myLeaves.filter(l => l.status === 'pending').length;

  // Role-scoped courses, timetable slots, assignments, and announcements (strict student/parent isolation)
  const scopedCourses = useMemo(
    () => (isRestrictedViewer ? filterCoursesForPersonalRole(courses, currentUser, students) : courses),
    [courses, currentUser, isRestrictedViewer, students]
  );
  const scopedTimetableSlots = useMemo(
    () =>
      isRestrictedViewer
        ? filterTimetableSlotsForPersonalRole(timetableSlots, currentUser, students, scopedCourses)
        : timetableSlots,
    [timetableSlots, currentUser, isRestrictedViewer, students, scopedCourses]
  );
  const scopedAssignments = useMemo(
    () =>
      isRestrictedViewer
        ? filterAssignmentsForPersonalRole(assignments, scopedCourses, currentUser)
        : assignments,
    [assignments, scopedCourses, currentUser, isRestrictedViewer]
  );
  const scopedAnnouncements = useMemo(
    () => filterAnnouncementsForRole(announcements, currentUser),
    [announcements, currentUser]
  );

  const teacherFullName = currentUser?.fullNameTh || currentUser?.fullNameEn || '';
  const todayMySlots = useMemo(() => {
    return scopedTimetableSlots
      .filter((s) => s.dayOfWeek === todayDayKey)
      .filter((s) => {
        if (currentRole === 'teacher' && timetableOnlyMine && teacherFullName) {
          return slotHasTeacher(s, teacherFullName);
        }
        return true;
      })
      .slice()
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }, [scopedTimetableSlots, todayDayKey, currentRole, timetableOnlyMine, teacherFullName]);

  const todayHoliday = useMemo(
    () => (holidaySyncTick >= 0 ? getHolidayForDate(todayBangkokStr, activeSchool.id) : null),
    [holidaySyncTick, todayBangkokStr, activeSchool.id]
  );
  const upcomingHoliday = useMemo(
    () =>
      holidaySyncTick >= 0
        ? getUpcomingHolidays(todayBangkokStr, 10, activeSchool.id).find((h) => h.date !== todayBangkokStr) || null
        : null,
    [holidaySyncTick, todayBangkokStr, activeSchool.id]
  );

  const openPeriodCheckinFromSlot = (
    slot: TimetableSlot,
    dateValue: string,
    checkType: 'check_in' | 'check_out'
  ) => {
    const resolvedCourseId =
      slot.courseId || scopedCourses.find((c) => c.code === slot.courseCode)?.id;
    setMobileAttendanceInitialSubTab('period_checkin');
    setMobilePeriodCourseId(resolvedCourseId);
    setMobilePeriodNumber(slot.periodNumber);
    setMobilePeriodDate(dateValue);
    setMobilePeriodCheckType(checkType);
    setActiveTab('checkin');
  };

  const getSlotTodayCheckStatus = (slot: TimetableSlot, dateValue: string) => {
    const resolvedCourseId =
      slot.courseId || scopedCourses.find((c) => c.code === slot.courseCode)?.id || slot.courseCode;
    const matches = periodAttendance.filter(
      (rec) =>
        rec.date === dateValue &&
        rec.periodNumber === slot.periodNumber &&
        (rec.courseId === resolvedCourseId || rec.courseCode === slot.courseCode)
    );
    return {
      hasCheckIn: matches.some((m) => (m.recordType || 'check_in') === 'check_in'),
      hasCheckOut: matches.some((m) => m.recordType === 'check_out'),
    };
  };

  // Pending homework (excluding closed and submitted)
  const myCompletedSubmissions = new Set(
    homeworkSubmissions.filter((h) => currentPersonId && h.studentId === currentPersonId).map((h) => h.assignmentId)
  );
  const pendingHomeworkCount = scopedAssignments.filter(
    (a) =>
      a.status !== 'closed' &&
      !myCompletedSubmissions.has(a.id) &&
      !(currentPersonId && a.submittedStudentIds?.includes(currentPersonId))
  ).length;

  const currentScore = playerScores.find(p => p.userId === currentUser?.id) || {
    exp: 0,
    gems: 0,
    rankTitle: lang === 'th' ? 'ผู้เริ่มต้น' : 'Beginner',
    battleWins: 0,
    streak: 0
  };

  const myOwnPortfolioCount = useMemo(() => {
    if (!currentUser) return 0;
    return portfolioItems.filter(
      (item) =>
        item.ownerId === currentUser.id ||
        (ownStudent && item.ownerId === ownStudent.id)
    ).length;
  }, [portfolioItems, currentUser, ownStudent]);

  const canViewGradesStudent =
    currentRole === 'student' ? schoolPermissions?.student_view_grades !== false : true;

  // Executive Dashboard Metrics (Mobile Optimized)
  const execMetrics = useMemo(() => {
    const today = getLocalDateString();
    const todayRecords = attendance.filter((a) => a.date === today);
    const totalStudents = students.length || 1;
    const presentCount = todayRecords.filter((a) => a.status === 'present').length;
    const lateCount = todayRecords.filter((a) => a.status === 'late').length;
    const absentCount = todayRecords.filter((a) => a.status === 'absent').length;
    const leaveCount = todayRecords.filter((a) => a.status === 'leave').length;
    const attendanceRate = Math.min(100, Math.round(((presentCount + lateCount) / totalStudents) * 100));

    // Academic GPAX
    const validGpas = students.map((s) => s.gpa).filter((g) => g > 0);
    const avgGpa = validGpas.length > 0 ? (validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2) : '3.45';
    const honorCount = students.filter((s) => s.gpa >= 3.5).length;

    // Infirmary
    const todayInfirmary = infirmaryVisits.filter((v) => v.visitDate === today || !v.visitDate).length;

    // Billing / Tuition
    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const totalCollected = paidInvoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');

    // Risk / SDQ
    const riskCount = sdqAssessments.filter((s) => s.overallStatus === 'risk' || s.overallStatus === 'problem' || (s.totalDifficultiesScore ?? 0) >= 16).length;

    return {
      attendanceRate,
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      avgGpa,
      honorCount,
      todayInfirmary,
      totalCollected,
      pendingCount: pendingInvoices.length,
      riskCount,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
    };
  }, [attendance, students, teachers, courses, invoices, infirmaryVisits, sdqAssessments]);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden app-workspace text-[var(--color-text-body)] pb-16 select-none">
      {/* 1. CLEAN SINGLE-ROW APPLE/LINEAR MOBILE HEADER */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md transition-colors">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BaanPakKruLogo size={24} />
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

          <div className="flex items-center gap-1.5 shrink-0">
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

            <div ref={headerMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                aria-expanded={isHeaderMenuOpen}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                aria-label={lang === 'th' ? 'เมนูเพิ่มเติม' : 'Menu'}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {isHeaderMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg p-1.5 space-y-0.5 text-[13px]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onSwitchToDesktopMode();
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <Laptop className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span>{lang === 'th' ? 'สลับมุมมองคอมพิวเตอร์' : 'Desktop View'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setLang(lang === 'th' ? 'en' : 'th');
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left flex items-center justify-between text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-[var(--color-text-muted)]" />{lang === 'th' ? 'ภาษา' : 'Language'}</span>
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">{lang.toUpperCase()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setThemePalette(isLight ? 'sapphire' : 'light_warm');
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    {isLight ? <Moon className="w-4 h-4 text-[var(--color-text-muted)]" /> : <Sun className="w-4 h-4 text-[var(--color-text-muted)]" />}
                    <span>{isLight ? (lang === 'th' ? 'โหมดกลางคืน' : 'Dark Mode') : (lang === 'th' ? 'โหมดสว่าง' : 'Light Mode')}</span>
                  </button>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-[var(--color-card-subtle)] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN ACTIVE VIEW CONTAINER (Generous spacing, 1 task per screen) */}
      <main className="flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto p-5 sm:p-6 overflow-y-auto">
        <ViewErrorBoundary
          resetKey={`${activeTab}:${activeGameView}:${profilePage}`}
          lang={lang}
          viewName={`mobile:${activeTab}`}
          onBackHome={() => {
            setActiveGameView('hub');
            setActiveTab('home');
          }}
        >
        {/* TAB A: ROLE-FIRST HOME (Clean, Zero Subtitle Clutter, Large Primary CTA) */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-5 py-1 animate-in fade-in duration-150">
            {currentRole === 'super_admin' ? (
              <MobileSuperAdminHub
                schools={schools}
                activeSchool={activeSchool}
                isDemoMode={isDemoMode}
                lang={lang}
                coordinationUnreadCount={coordinationUnreadCount}
                onViewSchool={onViewSchool}
                onToggleSchoolStatus={onToggleSchoolStatus}
                onUpdateSchoolFeatureFlags={onUpdateSchoolFeatureFlags}
                onJumpToDesktopTab={onJumpToDesktopTab}
              />
            ) : currentRole === 'admin' ? (
              <AdminDailyDashboardView
                activeSchool={activeSchool}
                currentUser={currentUser}
                lang={lang}
                students={students}
                attendance={attendance}
                leaveRequests={leaveRequests}
                invoices={invoices}
                isDemoMode={isDemoMode}
                coordinationUnreadCount={coordinationUnreadCount}
                onRecordAttendance={onRecordAttendance}
                onUpdateLeaveStatus={onUpdateLeaveStatus}
                onApproveInvoiceSlip={onApproveInvoiceSlip}
                onRejectInvoiceSlip={onRejectInvoiceSlip}
                onOpenQuickHub={() => setActiveTab('admin_quick')}
                onOpenCheckin={() => setActiveTab('checkin')}
                onOpenExecutive={() => setActiveTab('executive')}
                onJumpToDesktopTab={onJumpToDesktopTab}
              />
            ) : currentRole === 'student' ? (
              <StudentMobileHome
                currentUser={currentUser}
                activeSchool={activeSchool}
                ownStudent={ownStudent}
                lang={lang}
                todayCheckin={todayCheckin}
                scopedAttendance={scopedAttendance}
                scopedCourses={scopedCourses}
                grades={grades}
                gradingSystem={gradingSystem}
                todayMySlots={todayMySlots}
                schoolPeriods={schoolPeriods}
                bangkokClock={bangkokClock}
                todayBangkokStr={todayBangkokStr}
                todayHoliday={todayHoliday}
                upcomingHoliday={upcomingHoliday}
                pendingHomeworkCount={pendingHomeworkCount}
                pendingLeavesCount={pendingLeavesCount}
                myPortfolioCount={myOwnPortfolioCount}
                scopedAnnouncements={scopedAnnouncements}
                canSelfCheckin={canSelfCheckin}
                canAccessHomework={canAccessHomework}
                canPlayGames={canPlayGames}
                canViewGrades={canViewGradesStudent}
                getSlotTodayCheckStatus={(s, d) => getSlotTodayCheckStatus(s, d)}
                onOpenCheckin={() => {
                  setMobileAttendanceInitialSubTab('selfie_mobile');
                  setActiveTab('checkin');
                }}
                onTriggerPeriodCheckin={openPeriodCheckinFromSlot}
                onOpenTimetable={(mode) => {
                  setMobileTimetableMode(mode);
                  setActiveTab('timetable');
                }}
                onOpenHomework={() => setActiveTab('homework')}
                onOpenGrades={() => setActiveTab('student_grades')}
                onOpenPortfolio={() => setActiveTab('portfolio')}
                onOpenLeave={() => setActiveTab('leave')}
                onOpenAnnouncements={(ann) => {
                  if (ann) setSelectedAnnouncement(ann);
                  setActiveTab('announcements');
                }}
                onOpenGames={() => {
                  setActiveTab('games');
                  setActiveGameView('hub');
                }}
              />
            ) : (
              <>
                {/* Crisp Personal Greeting + Class/Department Context */}
                <div className="pt-1 space-y-1">
                  <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-title)] truncate">
                    {lang === 'th' ? 'สวัสดี' : 'Hello'} {currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ใช้งาน'}
                  </h1>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] truncate tabular-nums">
                    {currentRole === 'parent' && linkedStudents.length > 0
                      ? `${lang === 'th' ? 'ผู้ปกครองของ' : 'Parent of'} ${linkedStudents[0].firstNameTh} (${linkedStudents[0].gradeLevel} ${linkedStudents[0].room})`
                      : currentRole === 'teacher'
                        ? `${currentUser?.department || (lang === 'th' ? 'ครูผู้สอน' : 'Teacher')} · ${lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}`
                        : lang === 'th'
                          ? activeSchool.nameTh
                          : activeSchool.nameEn}
                  </p>
                </div>

                {/* Today / Upcoming Holiday Alert */}
                {todayHoliday ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileTimetableMode('calendar');
                      setActiveTab('timetable');
                    }}
                    className="w-full rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/50 p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 shrink-0" />
                        <span>{todayHoliday.type === 'school' ? 'วันหยุดพิเศษโรงเรียน' : 'วันหยุดราชการวันนี้'}</span>
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                        {todayHoliday.nameTh}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        งดการเรียนการสอนปกติ · แตะเพื่อดูปฏิทินวันหยุด
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-500 shrink-0" />
                  </button>
                ) : upcomingHoliday ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileTimetableMode('calendar');
                      setActiveTab('timetable');
                    }}
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-left flex items-center justify-between gap-3 cursor-pointer hover:border-rose-300 transition"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <CalendarDays className="w-4 h-4 text-rose-500 shrink-0" />
                      <p className="text-xs text-[var(--color-text-body)] truncate tabular-nums">
                        วันหยุดถัดไป: <strong className="text-[var(--color-text-title)]">{upcomingHoliday.nameTh}</strong> ({upcomingHoliday.date})
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                ) : null}

                {/* 1 Large Primary Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileAttendanceInitialSubTab('selfie_mobile');
                    setActiveTab(canSelfCheckin ? 'checkin' : 'timetable');
                  }}
                  className="w-full min-h-[56px] px-5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-base flex items-center justify-between transition active:scale-[0.99] cursor-pointer shadow-xs"
                >
                  <div className="text-left">
                    <span className="block">
                      {!canSelfCheckin
                        ? lang === 'th'
                          ? 'ตารางเรียนวันนี้'
                          : 'Today Timetable'
                        : currentRole === 'teacher'
                          ? lang === 'th'
                            ? 'เช็คชื่อเข้าสอน'
                            : 'Class Check-in'
                          : currentRole === 'parent'
                            ? lang === 'th'
                              ? 'ดูเวลาเข้า-ออกบุตรหลาน'
                              : 'Child Attendance'
                            : lang === 'th'
                              ? 'เช็คชื่อเข้า-ออก'
                              : 'Check-in & Out'}
                    </span>
                    {todayCheckin && currentRole !== 'parent' && (
                      <span className="block text-[11px] font-normal text-white/85 tabular-nums">
                        {lang === 'th' ? `เช็คชื่อเข้า รร. แล้ว เวลา ${todayCheckin.time} น.` : `Checked in at ${todayCheckin.time}`}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0" />
                </button>

                {/* Timed Period Check-in/Out Missions + Active Period Red Highlight */}
                {currentRole === 'teacher' &&
                  !todayHoliday &&
                  !isWeekendDate(todayBangkokStr) &&
                  todayMySlots.length > 0 && (() => {
                    const activeNowSlot = todayMySlots.find(
                      (s) =>
                        getTimetableSlotActivityStatus({
                          slot: s,
                          schoolPeriods,
                          now: bangkokClock,
                          schoolId: activeSchool.id,
                        }).isActive
                    );
                    const nextUpcomingSlot = todayMySlots.find((s) => {
                      const st = getTimetableSlotActivityStatus({
                        slot: s,
                        schoolPeriods,
                        now: bangkokClock,
                        schoolId: activeSchool.id,
                      });
                      return st.endMinutes !== null && st.endMinutes >= bangkokClock.minutes;
                    });
                    const featuredSlot = activeNowSlot || nextUpcomingSlot || todayMySlots[0];
                    const featuredActivity = getTimetableSlotActivityStatus({
                      slot: featuredSlot,
                      schoolPeriods,
                      now: bangkokClock,
                      schoolId: activeSchool.id,
                    });
                    const status = getSlotTodayCheckStatus(featuredSlot, todayBangkokStr);
                    const nextCheckType: 'check_in' | 'check_out' =
                      status.hasCheckIn && !status.hasCheckOut ? 'check_out' : 'check_in';
                    return (
                      <div className="space-y-3">
                        <PeriodTimeMissionsCard
                          compact={true}
                          slots={todayMySlots}
                          schoolPeriods={schoolPeriods}
                          bangkokClock={bangkokClock}
                          schoolId={activeSchool.id}
                          targetDateStr={todayBangkokStr}
                          currentRole={currentRole}
                          lang={lang}
                          canSelfCheckin={canSelfCheckin}
                          getSlotCheckStatus={(s, d) => getSlotTodayCheckStatus(s, d)}
                          onTriggerCheckin={openPeriodCheckinFromSlot}
                          onOpenSchedule={() => {
                            setMobileTimetableMode('day');
                            setActiveTab('timetable');
                          }}
                          periodAttendance={periodAttendance}
                        />

                        <div
                          className={`rounded-2xl border p-4 space-y-3 ${
                            featuredActivity.isActive
                              ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/75 dark:bg-rose-950/35'
                              : 'border-[var(--color-border)] bg-[var(--color-card)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[var(--color-primary-text)] tabular-nums flex items-center gap-1.5 flex-wrap">
                              {featuredActivity.isActive && (
                                <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                  ถึงคาบเรียน{featuredActivity.remainingMinutes !== null ? ` · เหลือ ${featuredActivity.remainingMinutes} น.` : ''}
                                </span>
                              )}
                              <span>
                                {lang === 'th'
                                  ? `คาบ ${featuredSlot.periodNumber} (${featuredActivity.startTime}–${featuredActivity.endTime})`
                                  : `Period ${featuredSlot.periodNumber} · ${featuredActivity.startTime}–${featuredActivity.endTime}`}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileTimetableMode('day');
                                setActiveTab('timetable');
                              }}
                              className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer tabular-nums"
                            >
                              ทั้งหมด {todayMySlots.length} คาบ
                            </button>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                              {featuredSlot.courseCode} · {featuredSlot.courseTitleTh || featuredSlot.courseTitleEn}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                              {featuredSlot.classRoom} {featuredSlot.room ? `· ห้อง ${featuredSlot.room}` : ''} · {featuredSlot.teacherName}
                            </p>
                          </div>
                          {canSelfCheckin && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => openPeriodCheckinFromSlot(featuredSlot, todayBangkokStr, nextCheckType)}
                                className={`flex-1 min-h-[44px] rounded-xl px-3 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm ${
                                  featuredActivity.isActive
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : nextCheckType === 'check_out'
                                      ? 'bg-slate-800 hover:bg-slate-900'
                                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                                }`}
                              >
                                {nextCheckType === 'check_out' ? (
                                  <LogOut className="w-4 h-4" />
                                ) : (
                                  <LogIn className="w-4 h-4" />
                                )}
                                <span>
                                  {status.hasCheckIn && status.hasCheckOut
                                    ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
                                    : nextCheckType === 'check_out'
                                      ? 'เช็คเอาท์คาบนี้'
                                      : featuredActivity.isActive
                                        ? 'เช็คอินเข้าคาบตอนนี้'
                                        : 'เช็คอิน/เอาท์รายคาบ'}
                                </span>
                              </button>
                              {!status.hasCheckIn && (
                                <button
                                  type="button"
                                  onClick={() => openPeriodCheckinFromSlot(featuredSlot, todayBangkokStr, 'check_out')}
                                  className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                                    featuredActivity.isActive
                                      ? 'border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-200'
                                      : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                                  }`}
                                >
                                  <LogOut className="w-4 h-4" />
                                  <span>เช็คเอาท์</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                {/* Single-line Clean List Rows */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                  {currentRole === 'teacher' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileTimetableMode('day');
                        setActiveTab('timetable');
                      }}
                      className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[var(--color-primary-text)]" />
                        <span>
                          {lang === 'th' ? 'ตารางสอนวันนี้' : 'Today Teaching Schedule'}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
                        {todayHoliday
                          ? lang === 'th'
                            ? 'วันหยุด'
                            : 'Holiday'
                          : `${todayMySlots.length} ${lang === 'th' ? 'คาบ' : 'slots'}`}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  )}

                  {(currentRole === 'teacher' || currentRole === 'parent') && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileTimetableMode('calendar');
                        setActiveTab('timetable');
                      }}
                      className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-rose-500" />
                        <span>{lang === 'th' ? 'ปฏิทินเรียน & วันหยุดราชการ' : 'Calendar & Public Holidays'}</span>
                      </span>
                      <span className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-2 shrink-0">
                        <span>.ics</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  )}

                  {currentRole === 'teacher' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('gradebook')}
                      className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                        <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'th' ? 'กรอกคะแนน ปพ.5 ด่วน' : 'Quick Gradebook (PP.5)'}</span>
                      </span>
                      <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
                        {scopedCourses.length} {lang === 'th' ? 'วิชา' : 'courses'}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  )}

                  {currentRole === 'teacher' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('executive')}
                      className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        <span>{lang === 'th' ? 'ภาพรวมโรงเรียน' : 'School Overview'}</span>
                      </span>
                      <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
                        {execMetrics.attendanceRate}%
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  )}

                  {currentRole === 'parent' && (
                    <div className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--color-text-title)]">
                        {lang === 'th' ? 'เช็คอินวันนี้' : 'Today'}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">
                        {todayCheckin ? `${todayCheckin.time} น.` : lang === 'th' ? 'ยังไม่เช็คอิน' : 'Pending'}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('leave')}
                    className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                  >
                    <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>{lang === 'th' ? 'ยื่นใบลาออนไลน์' : 'Leave Requests'}</span>
                    </span>
                    <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
                      {pendingLeavesCount > 0 ? `${pendingLeavesCount}` : ''}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>

                  {currentRole === 'teacher' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('games');
                        setActiveGameView('hub');
                      }}
                      className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                        <Gamepad2 className="w-4 h-4 text-purple-600" />
                        <span>{lang === 'th' ? 'เกมส์ความรู้ & แล็บจำลอง' : 'Learning Games & Labs'}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('announcements')}
                    className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                  >
                    <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                      <Megaphone className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'th' ? 'ประกาศจากโรงเรียน' : 'School Announcements'}</span>
                    </span>
                    <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
                      {scopedAnnouncements.length}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                  >
                    <span className="text-sm font-semibold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'บัตรดิจิทัล & ตั้งค่า' : 'Digital ID & Settings'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: ADMIN QUICK WORKSPACE */}
        {activeTab === 'admin_quick' && (
          <MobileAdminQuickHub
            activeSchool={activeSchool}
            students={students}
            teachers={teachers}
            courses={courses}
            leaveRequests={leaveRequests}
            invoices={invoices}
            announcements={announcements}
            lang={lang}
            currentUser={currentUser}
            onUpdateStudent={onUpdateStudent}
            onUpdateSchool={onUpdateSchool}
            onAddAnnouncement={onAddAnnouncement}
            onUpdateLeaveStatus={onUpdateLeaveStatus}
            onApproveInvoiceSlip={onApproveInvoiceSlip}
            onRejectInvoiceSlip={onRejectInvoiceSlip}
            onJumpToDesktopTab={onJumpToDesktopTab}
            onOpenCheckin={() => setActiveTab('checkin')}
          />
        )}

        {/* TAB: SUPER ADMIN SCHOOLS & APPROVALS */}
        {activeTab === 'super_schools' && (
          <MobileSuperAdminHub
            schools={schools}
            activeSchool={activeSchool}
            isDemoMode={isDemoMode}
            lang={lang}
            coordinationUnreadCount={coordinationUnreadCount}
            onViewSchool={onViewSchool}
            onToggleSchoolStatus={onToggleSchoolStatus}
            onUpdateSchoolFeatureFlags={onUpdateSchoolFeatureFlags}
            onJumpToDesktopTab={onJumpToDesktopTab}
          />
        )}

        {/* TAB EXECUTIVE: CLEAN, MOBILE-FIRST DIRECTOR DASHBOARD */}
        {activeTab === 'executive' && (
          <div className="flex flex-col gap-3 py-1 animate-in fade-in duration-200">
            {/* Header Card (Clean semantic token surface) */}
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] flex items-center justify-center font-bold shrink-0">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'แดชบอร์ดสรุปผู้บริหาร · ผอ. / MIS' : 'Executive Summary · MIS'}
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">{activeSchool.nameTh || activeSchool.nameEn}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToDesktopMode}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                  title="สลับไปมุมมองคอมพิวเตอร์"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'จอใหญ่' : 'Desktop'}</span>
                </button>
              </div>
            </div>

            {/* 4 Core Executive Metric Cards (Vertical, Clean, Space-optimized) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Attendance */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">การมาเรียนวันนี้</span>
                  <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    {execMetrics.attendanceRate}%
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    มา {execMetrics.presentCount} • สาย {execMetrics.lateCount} • ขาด {execMetrics.absentCount}
                  </p>
                </div>
              </div>

              {/* Card 2: Academic GPAX */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">เกรดเฉลี่ย (GPAX)</span>
                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
                    {execMetrics.avgGpa}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    เกียรตินิยม (&ge;3.5) {execMetrics.honorCount} คน
                  </p>
                </div>
              </div>

              {/* Card 3: Infirmary & Care */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">ห้องพยาบาล &amp; SDQ</span>
                  <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                    <HeartPulse className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
                    {execMetrics.todayInfirmary} <span className="text-xs font-normal">เคส</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    กลุ่มเสี่ยง SDQ {execMetrics.riskCount} คน
                  </p>
                </div>
              </div>

              {/* Card 4: Finance (Respects teacher_view_financials) */}
              {canViewFinancialsMobile && (
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">ยอดจัดเก็บค่าเทอม</span>
                  <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono tabular-nums">
                    ฿{execMetrics.totalCollected.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                    ค้างชำระ {execMetrics.pendingCount} ใบเสร็จ
                  </p>
                </div>
              </div>
              )}
            </div>

            {/* School Composition Summary */}
            <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2.5">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex flex-wrap items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  <span>อัตราส่วนทรัพยากรโรงเรียน</span>
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">MIS ข้อมูลล่าสุด</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>นักเรียน</span>
                  </div>
                  <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">{execMetrics.totalStudents} คน</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>ครู &amp; บุคลากร</span>
                  </div>
                  <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">{execMetrics.totalTeachers} ท่าน</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>รายวิชา</span>
                  </div>
                  <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">{execMetrics.totalCourses} วิชา</div>
                </div>
              </div>
            </div>

            {/* Director Quick Links */}
            <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                <span>ทางลัดการบริหาร</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('checkin')}
                  className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
                >
                  <span>มอนิเตอร์การเช็คชื่อ</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leave')}
                  className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
                >
                  <span>อนุมัติใบลา ({pendingLeavesCount})</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB B: CHECK-IN (เช็คชื่อ) */}
        {activeTab === 'checkin' && (
          <div className="h-full min-h-0 animate-in fade-in duration-200">
            <MobileAttendanceView
              embeddedMobile
              initialSubTab={mobileAttendanceInitialSubTab}
              initialPeriodCourseId={mobilePeriodCourseId}
              initialPeriodNumber={mobilePeriodNumber}
              initialPeriodDate={mobilePeriodDate}
              initialPeriodCode={initialPeriodCode}
              initialPeriodCheckType={mobilePeriodCheckType}
              students={students}
              teachers={isRestrictedViewer ? [] : teachers}
              courses={scopedCourses}
              attendance={attendance}
              periodAttendance={periodAttendance}
              currentUser={currentUser}
              school={activeSchool}
              campusGates={campusGates}
              leaveRequests={leaveRequests}
              lang={lang}
              onRecordAttendance={onRecordAttendance}
              onRecordPeriodAttendance={onRecordPeriodAttendance}
              onAddLeaveRequest={onAddLeaveRequest}
              onUpdateLeaveStatus={onUpdateLeaveStatus}
            />
          </div>
        )}

        {/* TAB C: LEAVE REQUESTS (ใบลา) */}
        {activeTab === 'leave' && (
          <div className="h-full min-h-0 animate-in fade-in duration-200">
            <MobileAttendanceView
              embeddedMobile
              initialSubTab="leave_request"
              students={students}
              teachers={isRestrictedViewer ? [] : teachers}
              courses={scopedCourses}
              attendance={attendance}
              periodAttendance={periodAttendance}
              currentUser={currentUser}
              school={activeSchool}
              campusGates={campusGates}
              leaveRequests={leaveRequests}
              lang={lang}
              onRecordAttendance={onRecordAttendance}
              onRecordPeriodAttendance={onRecordPeriodAttendance}
              onAddLeaveRequest={onAddLeaveRequest}
              onUpdateLeaveStatus={onUpdateLeaveStatus}
            />
          </div>
        )}

        {/* TAB: TEACHER QUICK GRADEBOOK (ปพ.5 มือถือ) */}
        {activeTab === 'gradebook' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="min-h-[40px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
              </button>
              <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'กรอกคะแนน ปพ.5 ด่วน' : 'Quick Gradebook'}
              </h2>
            </div>

            {!canEditGradesMobile && (
              <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200">
                {lang === 'th'
                  ? 'สิทธิ์การแก้ไขคะแนนถูกจำกัดโดยผู้บริหารโรงเรียน (แสดงผลแบบอ่านอย่างเดียว)'
                  : 'Grade editing is restricted by school policy (read-only mode).'}
              </div>
            )}

            {mobileGradeToast && (
              <div role="status" className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{mobileGradeToast}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'เลือกรายวิชา' : 'Select Course'}
                </label>
                <select
                  value={mobileGradeCourseId}
                  onChange={(e) => setMobileGradeCourseId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {lang === 'th' ? c.titleTh : c.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mobileGradeSearch}
                    onChange={(e) => setMobileGradeSearch(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหาชื่อ / รหัสนักเรียน' : 'Search student...'}
                    className="w-full min-h-[44px] pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] focus:outline-hidden"
                  />
                </div>
                <select
                  value={mobileGradeRoom}
                  onChange={(e) => setMobileGradeRoom(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] focus:outline-hidden"
                >
                  <option value="all">{lang === 'th' ? 'ทุกห้องเรียน' : 'All Rooms'}</option>
                  {[...new Set(students.map((s) => `${s.gradeLevel} ${s.room}`.trim()).filter(Boolean))].map((roomLabel) => (
                    <option key={roomLabel} value={roomLabel}>{roomLabel}</option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const selectedCourse = courses.find((c) => c.id === mobileGradeCourseId) || courses[0];
              if (!selectedCourse) {
                return (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ยังไม่มีรายวิชาในโรงเรียน' : 'No courses available'}
                  </div>
                );
              }
              const enrolledSet = new Set(selectedCourse.enrolledStudentIds || []);
              const baseStudents =
                enrolledSet.size > 0
                  ? students.filter((s) => enrolledSet.has(s.id))
                  : students;
              const filteredStudents = baseStudents.filter((s) => {
                const roomLabel = `${s.gradeLevel} ${s.room}`.trim();
                if (mobileGradeRoom !== 'all' && roomLabel !== mobileGradeRoom) return false;
                if (mobileGradeSearch.trim()) {
                  const q = mobileGradeSearch.toLowerCase();
                  const hay = `${s.firstNameTh} ${s.lastNameTh} ${s.studentIdNumber} ${s.room}`.toLowerCase();
                  return hay.includes(q);
                }
                return true;
              });

              const updateStudentCourseScore = (
                student: Student,
                existingGrade: GradeRecord | undefined,
                field: 'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore',
                rawValue: number
              ) => {
                if (!canEditGradesMobile) return;
                const maxMap = { midtermScore: 30, finalScore: 40, assignmentScore: 20, quizScore: 10 } as const;
                const clamped = Math.max(0, Math.min(maxMap[field], Number.isFinite(rawValue) ? Math.round(rawValue) : 0));
                const nextMidterm = field === 'midtermScore' ? clamped : existingGrade?.midtermScore ?? 0;
                const nextFinal = field === 'finalScore' ? clamped : existingGrade?.finalScore ?? 0;
                const nextAssignment = field === 'assignmentScore' ? clamped : existingGrade?.assignmentScore ?? 0;
                const nextQuiz = field === 'quizScore' ? clamped : existingGrade?.quizScore ?? 0;
                const totalScore = Math.min(100, nextMidterm + nextFinal + nextAssignment + nextQuiz);
                const graded = calculateGrade(totalScore, gradingSystem);

                if (existingGrade && onUpdateGrade) {
                  onUpdateGrade(existingGrade.id, {
                    [field]: clamped,
                    totalScore,
                    letterGrade: graded.letter,
                    gradePoint: graded.point,
                  });
                } else if (onAddGrade) {
                  onAddGrade({
                    id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    schoolId: activeSchool.id,
                    studentId: student.id,
                    courseId: selectedCourse.id,
                    academicYear: activeSchool.academicYear || '2568',
                    semester: activeSchool.currentSemester || '1',
                    midtermScore: nextMidterm,
                    finalScore: nextFinal,
                    assignmentScore: nextAssignment,
                    quizScore: nextQuiz,
                    totalScore,
                    letterGrade: graded.letter,
                    gradePoint: graded.point,
                  });
                }
                setMobileGradeToast(
                  lang === 'th'
                    ? `บันทึก ${student.firstNameTh} · รวม ${totalScore} (${graded.letter})`
                    : `Saved ${student.firstNameEn} · ${totalScore} (${graded.letter})`
                );
                window.setTimeout(() => setMobileGradeToast(null), 2200);
              };

              return (
                <PagedList
                  items={filteredStudents}
                  pageSize={5}
                  previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
                  nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
                  paginationLabel={lang === 'th' ? 'หน้าคะแนนนักเรียน' : 'Gradebook pages'}
                  emptyState={
                    <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'ไม่พบนักเรียนที่ตรงกับตัวกรอง' : 'No matching students'}
                    </div>
                  }
                  renderItem={(stu) => {
                    const grade = grades.find((g) => g.courseId === selectedCourse.id && g.studentId === stu.id);
                    const midterm = grade?.midtermScore ?? 0;
                    const finalScore = grade?.finalScore ?? 0;
                    const assignment = grade?.assignmentScore ?? 0;
                    const quiz = grade?.quizScore ?? 0;
                    const total = grade?.totalScore ?? 0;
                    const letter = grade?.letterGrade ?? '-';
                    return (
                      <div key={stu.id} className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                              {stu.firstNameTh} {stu.lastNameTh}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                              {stu.studentIdNumber} · {stu.gradeLevel} {stu.room}
                            </p>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <span className="text-base font-extrabold font-mono text-[var(--color-primary-text)]">{total}</span>
                            <span className="text-xs font-bold text-[var(--color-text-muted)] ml-1.5">({letter})</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {(
                            [
                              { field: 'midtermScore', label: 'กลาง/30', max: 30, value: midterm },
                              { field: 'finalScore', label: 'ปลาย/40', max: 40, value: finalScore },
                              { field: 'assignmentScore', label: 'งาน/20', max: 20, value: assignment },
                              { field: 'quizScore', label: 'สอบ/10', max: 10, value: quiz },
                            ] as const
                          ).map((cell) => (
                            <label key={cell.field} className="p-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-center block">
                              <span className="block text-[10px] text-[var(--color-text-muted)] font-medium">{cell.label}</span>
                              <input
                                type="number"
                                min={0}
                                max={cell.max}
                                disabled={!canEditGradesMobile}
                                value={cell.value}
                                onChange={(e) => updateStudentCourseScore(stu, grade, cell.field, Number(e.target.value))}
                                className="w-full min-h-[36px] text-center text-sm font-mono font-bold tabular-nums text-[var(--color-text-title)] bg-transparent disabled:opacity-60 focus:outline-hidden"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
              );
            })()}
          </div>
        )}

        {/* TAB: MOBILE TIMETABLE + CALENDAR + PUBLIC HOLIDAYS */}
        {activeTab === 'timetable' && (() => {
          const monthHolidays = getHolidaysInMonth(
            mobileCalendarMonthCursor.year,
            mobileCalendarMonthCursor.month,
            activeSchool.id
          );
          const firstDayOfMonth = new Date(
            Date.UTC(mobileCalendarMonthCursor.year, mobileCalendarMonthCursor.month, 1)
          );
          const daysInMonth = new Date(
            Date.UTC(mobileCalendarMonthCursor.year, mobileCalendarMonthCursor.month + 1, 0)
          ).getUTCDate();
          const leadingBlanks = (firstDayOfMonth.getUTCDay() + 6) % 7;
          const monthCells: Array<{ dateStr: string; dayNum: number } | null> = [
            ...Array.from({ length: leadingBlanks }, () => null),
            ...Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1;
              const dateStr = `${mobileCalendarMonthCursor.year}-${String(mobileCalendarMonthCursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              return { dateStr, dayNum: d };
            }),
          ];
          const monthTitleTh = firstDayOfMonth.toLocaleDateString('th-TH', {
            timeZone: 'UTC',
            month: 'long',
            year: 'numeric',
          });
          const selectedCalDateObj = new Date(`${mobileSelectedCalendarDate}T00:00:00Z`);
          const calDayKey = ([null, 'mon', 'tue', 'wed', 'thu', 'fri', null] as const)[
            selectedCalDateObj.getUTCDay()
          ] || null;
          const selectedDateHolidays = getHolidaysForDate(mobileSelectedCalendarDate, activeSchool.id);
          const selectedCalDaySlots = calDayKey
            ? scopedTimetableSlots
                .filter((s) => s.dayOfWeek === calDayKey)
                .filter((s) => !(currentRole === 'teacher' && timetableOnlyMine && teacherFullName) || slotHasTeacher(s, teacherFullName))
                .slice()
                .sort((a, b) => a.periodNumber - b.periodNumber)
            : [];

          return (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="min-h-[40px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
                </button>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {canSelfCheckin && (currentRole === 'student' || currentRole === 'teacher') && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileAttendanceInitialSubTab('period_checkin');
                        setActiveTab('checkin');
                      }}
                      className="min-h-[36px] px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>เช็คอินรายคาบ</span>
                    </button>
                  )}
                  {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin') && (
                    <button
                      type="button"
                      disabled={isSyncingHolidays}
                      onClick={() => void handleManualMobileHolidaySync(mobileCalendarMonthCursor.year)}
                      className="min-h-[36px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-text-title)] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-card-subtle)] disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-rose-500 ${isSyncingHolidays ? 'animate-spin' : ''}`} />
                      <span>{isSyncingHolidays ? 'กำลังซิงค์...' : 'ซิงค์วันหยุด'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMobileCalendarSync(true)}
                    className="min-h-[36px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-primary-text)] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-card-subtle)]"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'เชื่อมต่อ Calendar' : 'Sync .ics'}</span>
                  </button>
                </div>
              </div>

              {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin') && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-[var(--color-text-title)]">
                      วันหยุดราชการไทย ({currentBangkokYear + 543})
                    </span>
                    <span className="text-[var(--color-text-muted)] ml-1.5 tabular-nums">
                      · {getHolidaysForYear(currentBangkokYear, activeSchool.id).length} วัน
                      {holidaySyncStatus && !holidaySyncStatus.usedFallback ? ' (ซิงค์ API แล้ว)' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileTimetableMode('calendar')}
                    className="text-[11px] font-bold text-[var(--color-primary-text)] shrink-0 cursor-pointer"
                  >
                    ดูปฏิทินวันหยุด
                  </button>
                </div>
              )}

              {/* Mode Switch: Day vs Month Calendar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                  <button
                    type="button"
                    onClick={() => setMobileTimetableMode('day')}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer transition ${
                      mobileTimetableMode === 'day'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-body)]'
                    }`}
                  >
                    {currentRole === 'teacher' ? 'รายวัน (สอน)' : 'ตารางเรียนรายวัน'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileTimetableMode('calendar')}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer transition ${
                      mobileTimetableMode === 'calendar'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-body)]'
                    }`}
                  >
                    ปฏิทิน + วันหยุด
                  </button>
                </div>

                {currentRole === 'teacher' && (
                  <button
                    type="button"
                    onClick={() => setTimetableOnlyMine((prev) => !prev)}
                    className={`min-h-[36px] px-3 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      timetableOnlyMine
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)]'
                    }`}
                  >
                    {timetableOnlyMine ? (lang === 'th' ? 'คาบฉัน' : 'Mine') : (lang === 'th' ? 'ทั้งหมด' : 'All')}
                  </button>
                )}
              </div>

              {mobileTimetableMode === 'day' ? (
                <>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                    {(
                      [
                        { id: 'mon', th: 'จ.', en: 'Mon' },
                        { id: 'tue', th: 'อ.', en: 'Tue' },
                        { id: 'wed', th: 'พ.', en: 'Wed' },
                        { id: 'thu', th: 'พฤ.', en: 'Thu' },
                        { id: 'fri', th: 'ศ.', en: 'Fri' },
                        { id: 'sat', th: 'ส.', en: 'Sat' },
                        { id: 'sun', th: 'อา.', en: 'Sun' },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedTimetableDay(d.id)}
                        className={`min-h-[36px] flex-1 px-3 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
                          selectedTimetableDay === d.id
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                      >
                        {lang === 'th' ? d.th : d.en}
                      </button>
                    ))}
                  </div>

                  {selectedTimetableDay === todayDayKey && todayHoliday && (
                    <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-3.5 text-xs space-y-1">
                      <p className="font-bold text-rose-700 dark:text-rose-200 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 shrink-0" />
                        <span>วันนี้หยุด: {todayHoliday.nameTh}</span>
                      </p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-300">
                        งดการเรียนการสอนปกติตามปฏิทินวันหยุดราชการ/โรงเรียน
                      </p>
                    </div>
                  )}

                  {selectedTimetableDay === todayDayKey &&
                    !todayHoliday &&
                    !isWeekendDate(todayBangkokStr) &&
                    canSelfCheckin &&
                    (currentRole === 'student' || currentRole === 'teacher') &&
                    todayMySlots.length > 0 && (
                      <PeriodTimeMissionsCard
                        compact={true}
                        slots={todayMySlots}
                        schoolPeriods={schoolPeriods}
                        bangkokClock={bangkokClock}
                        schoolId={activeSchool.id}
                        targetDateStr={todayBangkokStr}
                        currentRole={currentRole}
                        lang={lang}
                        canSelfCheckin={canSelfCheckin}
                        getSlotCheckStatus={(s, d) => getSlotTodayCheckStatus(s, d)}
                        onTriggerCheckin={openPeriodCheckinFromSlot}
                        periodAttendance={periodAttendance}
                      />
                    )}

                  {(() => {
                    const daySlots = scopedTimetableSlots
                      .filter((s) => s.dayOfWeek === selectedTimetableDay)
                      .filter((s) => {
                        if (currentRole === 'teacher' && timetableOnlyMine && teacherFullName) {
                          return slotHasTeacher(s, teacherFullName);
                        }
                        return true;
                      })
                      .slice()
                      .sort((a, b) => a.periodNumber - b.periodNumber);

                    if (daySlots.length === 0) {
                      return (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-muted)] space-y-2">
                          <Calendar className="w-8 h-8 mx-auto opacity-60" />
                          <p>{lang === 'th' ? 'ไม่มีคาบเรียนในวันที่เลือก' : 'No scheduled periods for this day'}</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {daySlots.map((slot) => {
                          const course = scopedCourses.find((c) => c.id === slot.courseId || c.code === slot.courseCode);
                          const status = getSlotTodayCheckStatus(slot, todayBangkokStr);
                          const slotActivity = getTimetableSlotActivityStatus({
                            slot,
                            schoolPeriods,
                            now: bangkokClock,
                            schoolId: activeSchool.id,
                          });
                          const nextCheckType: 'check_in' | 'check_out' =
                            status.hasCheckIn && !status.hasCheckOut ? 'check_out' : 'check_in';
                          const canShowMobileDayCheckin =
                            (currentRole === 'teacher' || currentRole === 'student') &&
                            canSelfCheckin &&
                            (slotActivity.isActive ||
                              (selectedTimetableDay === todayDayKey &&
                                slotActivity.isTodayWeekday &&
                                !slotActivity.isHolidayOff));
                          return (
                            <div
                              key={slot.id}
                              className={`p-4 rounded-2xl border space-y-2.5 ${
                                slotActivity.isActive
                                  ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/75 dark:bg-rose-950/35 shadow-sm'
                                  : 'border-[var(--color-border)] bg-[var(--color-card)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums">
                                    <span>{lang === 'th' ? `คาบที่ ${slot.periodNumber}` : `Period ${slot.periodNumber}`}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      {slotActivity.startTime || '--:--'} - {slotActivity.endTime || '--:--'}
                                    </span>
                                    {slotActivity.isActive && (
                                      <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                        ถึงคาบเรียน{slotActivity.remainingMinutes !== null ? ` · เหลือ ${slotActivity.remainingMinutes} น.` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                                    {slot.courseCode} ·{' '}
                                    {lang === 'th'
                                      ? course?.titleTh || slot.courseTitleTh || slot.courseCode || 'รายวิชา'
                                      : course?.titleEn || slot.courseTitleEn || slot.courseCode || 'Course'}
                                  </h3>
                                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                                    {slot.classRoom || ''}
                                    {slot.room ? ` · ห้อง ${slot.room}` : ''}
                                    {slot.teacherName ? ` · ${slot.teacherName}` : ''}
                                  </p>
                                </div>
                                {(status.hasCheckIn || status.hasCheckOut) && slot.dayOfWeek === todayDayKey && (
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                    {status.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                                  </span>
                                )}
                              </div>

                              {canShowMobileDayCheckin && (
                                <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
                                  <button
                                    type="button"
                                    onClick={() => openPeriodCheckinFromSlot(slot, todayBangkokStr, nextCheckType)}
                                    className={`flex-1 min-h-[44px] px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm ${
                                      slotActivity.isActive
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : nextCheckType === 'check_out'
                                          ? 'bg-slate-800 hover:bg-slate-900'
                                          : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                                    }`}
                                  >
                                    {nextCheckType === 'check_out' ? (
                                      <LogOut className="w-4 h-4" />
                                    ) : (
                                      <LogIn className="w-4 h-4" />
                                    )}
                                    <span>
                                      {status.hasCheckIn && status.hasCheckOut
                                        ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
                                        : nextCheckType === 'check_out'
                                          ? 'เช็คเอาท์คาบเรียน'
                                          : slotActivity.isActive
                                            ? 'เช็คอินเข้าคาบตอนนี้'
                                            : 'เช็คอินเข้าคาบเรียน'}
                                    </span>
                                  </button>
                                  {!status.hasCheckIn && (
                                    <button
                                      type="button"
                                      onClick={() => openPeriodCheckinFromSlot(slot, todayBangkokStr, 'check_out')}
                                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                                        slotActivity.isActive
                                          ? 'border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-200'
                                          : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                                      }`}
                                    >
                                      <LogOut className="w-4 h-4" />
                                      <span>เช็คเอาท์</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="space-y-3">
                  {/* Month Selector Header */}
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileCalendarMonthCursor((prev) =>
                          prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl border border-[var(--color-border)] text-xs font-bold cursor-pointer"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileCalendarMonthCursor({
                          year: Number(todayBangkokStr.slice(0, 4)),
                          month: Number(todayBangkokStr.slice(5, 7)) - 1,
                        });
                        setMobileSelectedCalendarDate(todayBangkokStr);
                      }}
                      className="text-sm font-bold text-[var(--color-text-title)] cursor-pointer"
                    >
                      {monthTitleTh}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMobileCalendarMonthCursor((prev) =>
                          prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl border border-[var(--color-border)] text-xs font-bold cursor-pointer"
                    >
                      ถัดไป
                    </button>
                  </div>

                  {/* Mobile 7-col Calendar */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-2">
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--color-text-muted)]">
                      {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((d, i) => (
                        <div key={d} className={i >= 5 ? 'text-rose-500' : ''}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {monthCells.map((cell, idx) => {
                        if (!cell) return <div key={`mblank-${idx}`} className="h-12" />;
                        const cellHol = monthHolidays.find((h) => h.date === cell.dateStr);
                        const isToday = cell.dateStr === todayBangkokStr;
                        const isSel = cell.dateStr === mobileSelectedCalendarDate;
                        const isWknd = isWeekendDate(cell.dateStr);
                        return (
                          <button
                            key={cell.dateStr}
                            type="button"
                            onClick={() => setMobileSelectedCalendarDate(cell.dateStr)}
                            className={`h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs font-bold tabular-nums cursor-pointer transition ${
                              isSel
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                                : cellHol
                                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                                  : isWknd
                                    ? 'border-transparent text-[var(--color-text-muted)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-title)]'
                            }`}
                          >
                            <span className={isToday ? 'underline decoration-2' : ''}>{cell.dayNum}</span>
                            {cellHol && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Calendar Day Details */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                        วันที่ {mobileSelectedCalendarDate}
                      </h3>
                      <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        {selectedDateHolidays.length > 0 ? 'วันหยุด' : `${selectedCalDaySlots.length} คาบ`}
                      </span>
                    </div>

                    {selectedDateHolidays.map((h) => (
                      <div key={h.id} className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs space-y-0.5">
                        <p className="font-bold text-rose-700 dark:text-rose-200">{h.nameTh}</p>
                        <p className="text-[11px] text-rose-600 dark:text-rose-300">
                          {h.nameEn} · {getThaiHolidayCategoryLabel(h, lang)}
                        </p>
                      </div>
                    ))}

                    {selectedCalDaySlots.map((slot) => {
                      const slotActivity = getTimetableSlotActivityStatus({
                        slot,
                        schoolPeriods,
                        now: bangkokClock,
                        schoolId: activeSchool.id,
                        targetDateStr: mobileSelectedCalendarDate,
                      });
                      const calStatus = getSlotTodayCheckStatus(slot, mobileSelectedCalendarDate);
                      const nextCheckType: 'check_in' | 'check_out' =
                        calStatus.hasCheckIn && !calStatus.hasCheckOut ? 'check_out' : 'check_in';
                      const canShowMobileCalCheckin =
                        (currentRole === 'teacher' || currentRole === 'student') &&
                        canSelfCheckin &&
                        (slotActivity.isActive ||
                          (mobileSelectedCalendarDate === todayBangkokStr &&
                            slotActivity.isTodayWeekday &&
                            !slotActivity.isHolidayOff));
                      return (
                        <div
                          key={slot.id}
                          className={`rounded-xl border p-3 space-y-2 ${
                            slotActivity.isActive
                              ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/75 dark:bg-rose-950/35'
                              : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums flex flex-wrap items-center gap-1.5">
                                <span>คาบ {slot.periodNumber} · {slotActivity.startTime}–{slotActivity.endTime}</span>
                                {slotActivity.isActive && (
                                  <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                    ถึงคาบเรียน{slotActivity.remainingMinutes !== null ? ` · เหลือ ${slotActivity.remainingMinutes} น.` : ''}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs font-bold text-[var(--color-text-title)]">
                                {slot.courseCode} · {slot.courseTitleTh}
                              </p>
                            </div>
                            {(calStatus.hasCheckIn || calStatus.hasCheckOut) && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                {calStatus.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                              </span>
                            )}
                          </div>
                          {canShowMobileCalCheckin && (
                              <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
                                <button
                                  type="button"
                                  onClick={() => openPeriodCheckinFromSlot(slot, mobileSelectedCalendarDate, nextCheckType)}
                                  className={`flex-1 min-h-[42px] rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                                    slotActivity.isActive
                                      ? 'bg-rose-600 hover:bg-rose-700'
                                      : nextCheckType === 'check_out'
                                        ? 'bg-slate-800 hover:bg-slate-900'
                                        : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                                  }`}
                                >
                                  {nextCheckType === 'check_out' ? (
                                    <LogOut className="w-4 h-4" />
                                  ) : (
                                    <LogIn className="w-4 h-4" />
                                  )}
                                  <span>
                                    {calStatus.hasCheckIn && calStatus.hasCheckOut
                                      ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
                                      : nextCheckType === 'check_out'
                                        ? 'เช็คเอาท์คาบเรียน'
                                        : slotActivity.isActive
                                          ? 'เช็คอินเข้าคาบตอนนี้'
                                          : 'เช็คอินเข้าคาบเรียน'}
                                  </span>
                                </button>
                                {!calStatus.hasCheckIn && (
                                  <button
                                    type="button"
                                    onClick={() => openPeriodCheckinFromSlot(slot, mobileSelectedCalendarDate, 'check_out')}
                                    className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                                      slotActivity.isActive
                                        ? 'border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-200'
                                        : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                                    }`}
                                  >
                                    เช็คเอาท์
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}

                    {monthHolidays.length > 0 && (
                      <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
                        <p className="text-xs font-bold text-[var(--color-text-title)]">วันหยุดประจำเดือน ({monthHolidays.length})</p>
                        {monthHolidays.map((h) => (
                          <p key={h.id} className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">{h.date}</span> · {h.nameTh} ({getThaiHolidayCategoryLabel(h, lang)})
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB D: GAMES HUB (เมนูรวมเกมส์) */}
        {/* TAB: STUDENT PORTFOLIO (100% Real Data) */}
        {activeTab === 'portfolio' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
              </button>
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'แฟ้มผลงานของฉัน' : 'My Portfolio'}
              </span>
            </div>
            <PortfolioView
              portfolioItems={portfolioItems}
              students={linkedStudents}
              teachers={teachers}
              courses={scopedCourses}
              grades={grades}
              playerScores={playerScores}
              school={activeSchool}
              gradingSystem={gradingSystem}
              currentUser={currentUser}
              lang={lang}
              onAddPortfolioItem={(item) => onAddPortfolioItem?.(item)}
              onDeletePortfolioItem={onDeletePortfolioItem}
              onOpenProfile={onOpenProfileModal}
              academicYear={activeSchool.academicYear}
            />
          </div>
        )}

        {/* TAB: STUDENT GRADES SUMMARY (Real Data, Clean Visual Layout) */}
        {activeTab === 'student_grades' && (() => {
          const myGrades = ownStudent
            ? grades.filter((g) => g.studentId === ownStudent.id)
            : [];
          const summary = ownStudent
            ? calculateStudentAcademicSummary({
                student: ownStudent,
                courses: scopedCourses,
                grades: myGrades,
                gradingSystem,
              })
            : null;
          const gpaxVal: number =
            summary?.gpax != null && summary.gpax > 0
              ? summary.gpax
              : ownStudent?.gpa ?? 0;

          return (
            <div className="space-y-4 pb-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
                </button>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums">
                  {lang === 'th'
                    ? `ปีการศึกษา ${activeSchool.academicYear || '2569'}`
                    : `AY ${activeSchool.academicYear || '2569'}`}
                </span>
              </div>

              {/* Real GPAX Summary Card */}
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 shadow-md flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-sky-200">
                    {lang === 'th' ? 'ผลการเรียนเฉลี่ยสะสม (GPAX)' : 'Cumulative GPAX'}
                  </p>
                  <div className="text-3xl font-extrabold tracking-tight tabular-nums">
                    {gpaxVal > 0 ? gpaxVal.toFixed(2) : '—'}
                  </div>
                  <p className="text-xs text-slate-300 truncate tabular-nums">
                    {ownStudent
                      ? `${ownStudent.gradeLevel} ${ownStudent.room} · ${myGrades.length} รายวิชาที่มีผลคะแนน`
                      : `${myGrades.length} รายวิชา`}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-7 h-7 text-amber-300" />
                </div>
              </div>

              {/* Course-by-course grades */}
              {myGrades.length === 0 ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center space-y-2">
                  <GraduationCap className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
                  <p className="text-sm font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ยังไม่มีข้อมูลผลการเรียนในภาคเรียนนี้' : 'No grade records yet'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? 'เมื่อคุณครูบันทึกคะแนนรายวิชาแล้ว ระบบจะแสดงผลการเรียนที่นี่อัตโนมัติ'
                      : 'Grades will appear here automatically once recorded by your teachers.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                  {myGrades.map((g) => {
                    const course = scopedCourses.find((c) => c.id === g.courseId);
                    const gradeDisplay = g.letterGrade || calculateGrade(g.totalScore, gradingSystem).letter;
                    return (
                      <div key={g.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                            {course?.titleTh || course?.titleEn || g.courseId}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] tabular-nums truncate">
                            {course?.code || 'รายวิชา'} · คะแนนรวม {g.totalScore}/100
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-extrabold text-[var(--color-primary-text)] tabular-nums">
                            {gradeDisplay}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'games' && (
          <div className="animate-in fade-in duration-200 space-y-5 pb-4">
            {/* Illustrated Arcade & Labs Hero Card */}
            <section className="relative rounded-3xl overflow-hidden bg-slate-950 shadow-md min-h-[168px] flex flex-col justify-end">
              <img
                src={arcadeBannerImg}
                alt={lang === 'th' ? 'ศูนย์เกมความรู้และแล็บจำลอง' : 'Learning Games and Labs'}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/55 to-slate-950/20"
              />
              <div className="relative z-10 p-5 space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-amber-300 tabular-nums">
                  <span>{lang === 'th' ? 'ศูนย์เกมความรู้และแล็บจำลอง' : 'Games & Interactive Labs'}</span>
                  <span>
                    {currentScore.exp.toLocaleString()} EXP · {currentScore.gems} 💎
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {lang === 'th' ? 'เลือกโหมดการเรียนรู้ที่อยากเล่น' : 'Choose Your Learning Mode'}
                </h2>
                <p className="text-xs text-slate-200/90">
                  {lang === 'th'
                    ? 'เล่นสนุกพร้อมเก็บคะแนนฝึกทักษะทุกกลุ่มสาระในโหมดเต็มจอ'
                    : 'Practice every subject through interactive arcade and lab challenges.'}
                </p>
              </div>
            </section>

            {/* Featured Primary Game Mode */}
            <button
              type="button"
              onClick={() => setActiveGameView('arcade_studio')}
              className="w-full p-4 rounded-2xl border border-blue-400/50 bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-3 transition active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--color-primary-text)]">
                    {lang === 'th' ? 'แนะนำ · ครบ 8 กลุ่มสาระ' : 'Featured · All Subjects'}
                  </p>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)] truncate">
                    EduArcade ศูนย์เกม 7 สไตล์
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-1 mt-0.5">
                    ยิงอุกกาบาตสมการ จับคู่ ต่อคำศัพท์ ChronoSort
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
            </button>

            {/* Clean 2-Column Visual Grid — No Clunky 1/3 Pagination */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveGameView('battle_royale_3d')}
                className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-amber-400 text-left flex flex-col justify-between gap-3 transition active:scale-[0.98] cursor-pointer min-h-[124px]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)] leading-snug">
                    3D Battle Royale
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                    วิ่งล่าหีบสมบัติ ตอบคำถาม 3 มิติ
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveGameView('1v1_arena')}
                className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-rose-400 text-left flex flex-col justify-between gap-3 transition active:scale-[0.98] cursor-pointer min-h-[124px]"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)] leading-snug">
                    1v1 ดวลความเร็ว
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                    แข่งตอบโจทย์ไวกับบอทหรือเพื่อน
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveGameView('boss_raid')}
                className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-orange-400 text-left flex flex-col justify-between gap-3 transition active:scale-[0.98] cursor-pointer min-h-[124px]"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)] leading-snug">
                    Co-op Boss Raid
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                    รวมพลังตีบอสประจำวิชา
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveGameView('subject_labs')}
                className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-sky-400 text-left flex flex-col justify-between gap-3 transition active:scale-[0.98] cursor-pointer min-h-[124px]"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)] leading-snug">
                    แล็บจำลอง 6 สาระ
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                    เคมี ฟิสิกส์ ไวยากรณ์ โค้ดดิ้ง
                  </p>
                </div>
              </button>
            </div>

            {/* Separate Real Achievements Showcase Row */}
            <div className="pt-1 space-y-2">
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] px-1">
                {lang === 'th' ? 'เกียรติยศและผลงานจริง' : 'Achievements & Awards'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveGameView('hall_of_fame')}
                className="w-full p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-amber-400 text-left flex items-center justify-between gap-3 transition active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'ถ้วยรางวัลและเกียรติบัตรของฉัน' : 'My Trophies & Certificates'}
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                      {lang === 'th'
                        ? 'แสดงผลจากแฟ้มผลงานจริงและคะแนนสะสม'
                        : 'Generated from real portfolio items and honors'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* TAB E: PROFILE & DIGITAL VIRTUAL ID CARD */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200 pb-4">
            {/* Clean Top Segmented Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setProfilePage(0)}
                className={`min-h-[40px] rounded-xl text-xs font-bold transition cursor-pointer ${
                  profilePage === 0
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {lang === 'th' ? 'บัตรดิจิทัล' : 'Digital ID'}
              </button>
              <button
                type="button"
                onClick={() => setProfilePage(1)}
                className={`min-h-[40px] rounded-xl text-xs font-bold transition cursor-pointer ${
                  profilePage === 1
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {lang === 'th' ? 'ตั้งค่าบัญชี' : 'Account Settings'}
              </button>
            </div>

            {profilePage === 0 && (
              <DigitalIdCardView
                students={isRestrictedViewer ? linkedStudents : students}
                school={activeSchool}
                lang={lang}
                currentRole={currentRole}
                onUpdateStudent={onUpdateStudent}
              />
            )}

            {/* Quick Profile Actions & Settings */}
            {profilePage === 1 && <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'บัญชีและการตั้งค่า' : 'Account & Preferences'}
              </h3>

              <div className="space-y-2 text-xs">
                {currentRole === 'student' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('portfolio')}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="font-bold">
                        {lang === 'th' ? `แฟ้มผลงานของฉัน (${myOwnPortfolioCount})` : `My Portfolio (${myOwnPortfolioCount})`}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </button>
                )}

                {/* Full Profile & Portfolio Modal trigger */}
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span className="font-bold">แก้ไขข้อมูลส่วนตัว &amp; พอร์ตฟอลิโอ</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>

                {/* Theme Palette Switcher */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text-title)]">โหมดสีถนอมสายตา</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setThemePalette('light_warm')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${isLight ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      {lang === 'th' ? 'สว่าง' : 'Light'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePalette('sapphire')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${!isLight ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      {lang === 'th' ? 'มืดคราม' : 'Dark'}
                    </button>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text-title)]">ภาษาของระบบ</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLang('th')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${lang === 'th' ? 'bg-[var(--color-primary)] text-white font-black' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      ไทย (TH)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${lang === 'en' ? 'bg-[var(--color-primary)] text-white font-black' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      English (EN)
                    </button>
                  </div>
                </div>

                {/* Onboarding Tutor & Thai Systems Guide (Staff/Admin only — hidden for students to reduce clutter) */}
                {onOpenOnboardingTutor && currentRole !== 'student' && (
                  <button
                    type="button"
                    onClick={onOpenOnboardingTutor}
                    className="w-full p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-bold flex items-center justify-between text-left cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <div className="text-xs font-bold">ติวเตอร์ระบบ & คู่มือการศึกษาไทย</div>
                        <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-normal">DMC, MIS, CCT, OBEC Care, O-NET, HRMS, DPA, ปพ.3</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-600" />
                  </button>
                )}

                {/* Mobile App Install Button */}
                <PWAInstallButton lang={lang} variant="sidebar" />

                {/* Biometric Security & Passkey Card (WebAuthn FaceID / TouchID) */}
                <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-bold text-[var(--color-text-title)] truncate">
                        {lang === 'th' ? 'สแกน FaceID / TouchID' : 'Biometric Security'}
                      </span>
                    </div>
                    {passkey && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                        {lang === 'th' ? 'เปิดใช้งาน' : 'Active'}
                      </span>
                    )}
                  </div>

                  {bioMsg && (
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{bioMsg}</p>
                  )}
                  {bioErr && (
                    <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{bioErr}</p>
                  )}

                  {!passkey ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {webAuthnInfo
                          ? (lang === 'th' ? webAuthnInfo.reasonTh : webAuthnInfo.reasonEn)
                          : (lang === 'th' ? 'ใช้สแกนใบหน้าหรือลายนิ้วมือเพื่อยืนยันตัวตนและล็อกเช็คชื่อด่วน' : 'Use FaceID/TouchID for fast login and quick attendance lock')}
                      </p>
                      <button
                        type="button"
                        disabled={bioBusy || webAuthnInfo?.supported === false}
                        onClick={handleEnrollPasskey}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>
                          {bioBusy
                            ? (lang === 'th' ? 'กำลังลงทะเบียน...' : 'Enrolling...')
                            : (lang === 'th' ? 'ผูก FaceID / TouchID' : 'Enroll FaceID / TouchID')}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {passkey.deviceLabel}
                      </p>

                      {['admin', 'super_admin', 'teacher'].includes(currentRole) && (
                        <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                          <span className="text-[11px] font-semibold text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ล็อกเมนูเช็คชื่อด่วน' : 'Lock Quick Attendance'}
                          </span>
                          <input
                            type="checkbox"
                            checked={passkey.protectQuickAttendance}
                            onChange={(e) => {
                              if (!currentUser) return;
                              const updated = updatePasskeyPreferences(currentUser.id, {
                                protectQuickAttendance: e.target.checked,
                              });
                              setPasskey(updated);
                            }}
                            className="w-4 h-4 accent-[var(--color-primary)]"
                          />
                        </label>
                      )}

                      <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                        <span className="text-[11px] font-semibold text-[var(--color-text-title)]">
                          {lang === 'th' ? 'ยืนยันตัวตนหน้าเข้าสู่ระบบ' : 'Enable Sign-In Biometrics'}
                        </span>
                        <input
                          type="checkbox"
                          checked={passkey.biometricLoginEnabled}
                          onChange={(e) => {
                            if (!currentUser) return;
                            const updated = updatePasskeyPreferences(currentUser.id, {
                              biometricLoginEnabled: e.target.checked,
                            });
                            setPasskey(updated);
                          }}
                          className="w-4 h-4 accent-[var(--color-primary)]"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={bioBusy}
                          onClick={handleTestPasskey}
                          className="flex-1 min-h-[40px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Fingerprint className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{bioBusy ? '...' : (lang === 'th' ? 'ทดสอบสแกน' : 'Test')}</span>
                        </button>

                        {onBiometricLock && (
                          <button
                            type="button"
                            onClick={onBiometricLock}
                            className="flex-1 min-h-[40px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'ล็อกหน้าจอด่วน' : 'Lock Screen'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) return;
                            removeEnrolledPasskey(currentUser.id);
                            setPasskey(null);
                            setBioMsg(lang === 'th' ? 'ลบ Passkey แล้ว' : 'Passkey removed');
                          }}
                          className="min-h-[40px] px-3 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs flex items-center justify-center cursor-pointer"
                          title={lang === 'th' ? 'ลบ Passkey ออกจากเครื่องนี้' : 'Remove Passkey'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Switch to Full Desktop View */}
                <button
                  type="button"
                  onClick={onSwitchToDesktopMode}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold flex items-center justify-between text-left cursor-pointer hover:opacity-90"
                >
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-4 h-4" />
                    <span>{lang === 'th' ? 'สลับเป็นมุมมองคอมพิวเตอร์' : 'Switch to Desktop View'}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full p-3 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold flex items-center justify-center gap-2 transition hover:bg-rose-100 dark:hover:bg-rose-900 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>}
          </div>
        )}

        {/* TAB F: HOMEWORK (การบ้านและภารกิจ) */}
        {activeTab === 'homework' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้าหลัก</span>
              </button>
              <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">รายการการบ้านและงานค้าง</h2>
            </div>

            <PagedList
              items={scopedAssignments}
              pageSize={2}
              previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
              nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
              paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าการบ้าน' : 'Homework pages'}
              emptyState={<div className="text-center py-12 text-[var(--color-text-muted)] text-xs">ไม่มีการบ้านในระบบ</div>}
              renderItem={(asg) => {
                const isDone = myCompletedSubmissions.has(asg.id) || Boolean(currentPersonId && asg.submittedStudentIds?.includes(currentPersonId));
                return (
                  <div
                    key={asg.id}
                    className={`p-3.5 rounded-2xl border ${
                      isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                        : 'bg-[var(--color-card)] border-[var(--color-border)]'
                    } shadow-xs space-y-2 text-xs`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[var(--color-text-muted)]">
                        {scopedCourses.find(c => c.id === asg.courseId)?.code || scopedCourses.find(c => c.id === asg.courseId)?.titleTh || 'วิชาเรียน'}
                      </span>
                      <span className={`font-bold ${
                        isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {isDone ? 'ส่งแล้ว' : 'รอส่ง'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[var(--color-text-title)]">
                      {lang === 'th' ? (asg.titleTh || asg.titleEn) : (asg.titleEn || asg.titleTh)}
                    </h4>

                    <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      <span>กำหนดส่ง: {asg.dueDate}</span>
                      <span className="font-semibold text-[var(--color-text-title)]">{asg.points} คะแนน</span>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}

        {/* TAB G: ANNOUNCEMENTS (ประกาศโรงเรียน) */}
        {activeTab === 'announcements' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {selectedAnnouncement ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(null)}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>กลับสู่รายการ</span>
                  </button>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{selectedAnnouncement.publishedAt}</span>
                </div>
                <article className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
                  <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">{selectedAnnouncement.title}</h2>
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    {selectedAnnouncement.author} ({selectedAnnouncement.authorRole})
                  </p>
                  <PagedList
                    items={splitAnnouncementIntoPages(selectedAnnouncement.content)}
                    pageSize={1}
                    previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
                    nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
                    paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าประกาศ' : 'Announcement pages'}
                    renderItem={(pageText, pageIndex) => (
                      <p key={pageIndex} className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--color-text-body)]">
                        {pageText}
                      </p>
                    )}
                  />
                </article>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>กลับหน้าหลัก</span>
                  </button>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">ประกาศและข่าวสารโรงเรียน</h2>
                </div>

                <PagedList
                  items={scopedAnnouncements}
                  pageSize={2}
                  previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
                  nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
                  paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าประกาศ' : 'Announcement pages'}
                  emptyState={<p className="py-8 text-center text-xs text-[var(--color-text-muted)]">ไม่มีประกาศ</p>}
                  renderItem={(a) => (
                <div 
                  key={a.id} 
                  className={`p-4 rounded-2xl border ${
                    a.pinned 
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40' 
                      : 'bg-[var(--color-card)] border-[var(--color-border)]'
                  } shadow-xs space-y-2 text-xs`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    <span className="font-semibold text-[var(--color-primary-text)]">{a.category}</span>
                    <span>{a.publishedAt}</span>
                  </div>

                  <h4 className="font-bold text-sm text-[var(--color-text-title)]">{a.title}</h4>
                  <p className="text-[var(--color-text-body)] leading-relaxed text-xs whitespace-pre-line line-clamp-2">{a.content}</p>

                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {a.author} · {a.authorRole}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAnnouncement(a)}
                      className="shrink-0 text-[11px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                    >
                      อ่านทั้งหมด
                    </button>
                  </div>
                </div>
                  )}
                />
              </>
            )}
          </div>
        )}
        </ViewErrorBoundary>
      </main>

      {/* 3. CLEAN APPLE/LINEAR 4-TAB BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md px-2 py-1 safe-area-bottom">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {/* SLOT 1: HOME */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'home' || activeTab === 'portfolio' || activeTab === 'student_grades' || (canSelfCheckin && activeTab === 'timetable') || (canPlayGames && activeTab === 'homework')
                ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {currentRole === 'super_admin' ? <ShieldCheck className="w-5 h-5 mb-0.5" /> : <Home className="w-5 h-5 mb-0.5" />}
            <span className="text-[11px] truncate max-w-full">
              {currentRole === 'super_admin'
                ? (lang === 'th' ? 'แม่ข่าย' : 'Master')
                : (lang === 'th' ? 'หน้าหลัก' : 'Home')}
            </span>
          </button>

          {/* SLOT 2: CHECK-IN (or Timetable for student when self check-in is disabled) */}
          <button
            type="button"
            onClick={() => {
              if (canSelfCheckin) {
                setMobileAttendanceInitialSubTab('selfie_mobile');
                setMobilePeriodCourseId(undefined);
                setMobilePeriodNumber(undefined);
                setMobilePeriodDate(undefined);
                setMobilePeriodCheckType(undefined);
                setActiveTab('checkin');
              } else {
                setActiveTab('timetable');
              }
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'checkin' || activeTab === 'leave' || (!canSelfCheckin && activeTab === 'timetable')
                ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {canSelfCheckin ? <Clock className="w-5 h-5 mb-0.5" /> : <Calendar className="w-5 h-5 mb-0.5" />}
            <span className="text-[11px] truncate max-w-full">
              {!canSelfCheckin
                ? (lang === 'th' ? 'ตารางเรียน' : 'Schedule')
                : currentRole === 'parent'
                ? (lang === 'th' ? 'มาเรียน' : 'Logs')
                : (lang === 'th' ? 'เช็คชื่อ' : 'Check-in')}
            </span>
          </button>

          {/* SLOT 3: ROLE PRIMARY ACTION */}
          {currentRole === 'admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('admin_quick')}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
                activeTab === 'admin_quick'
                  ? 'text-[var(--color-primary-text)] font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {(pendingLeavesCount + invoices.filter((i) => i.slipStatus === 'pending_review').length) > 0 && (
                <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-rose-600" />
              )}
              <Edit3 className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'จัดการด่วน' : 'Manage'}</span>
            </button>
          ) : currentRole === 'super_admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('super_schools')}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'super_schools'
                  ? 'text-[var(--color-primary-text)] font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Building2 className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'โรงเรียน' : 'Schools'}</span>
            </button>
          ) : currentRole === 'teacher' ? (
            <button
              type="button"
              onClick={() => setActiveTab('gradebook')}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'gradebook'
                  ? 'text-[var(--color-primary-text)] font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <ClipboardCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'คะแนน' : 'Grades'}</span>
            </button>
          ) : currentRole === 'parent' ? (
            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'announcements'
                  ? 'text-[var(--color-primary-text)] font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <BellRing className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] truncate max-w-full">{lang === 'th' ? 'ประกาศ' : 'News'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (canPlayGames) {
                  setActiveTab('games');
                  setActiveGameView('hub');
                } else {
                  setActiveTab('homework');
                }
              }}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                (canPlayGames ? activeTab === 'games' : activeTab === 'homework')
                  ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {canPlayGames ? <Gamepad2 className="w-5 h-5 mb-0.5" /> : <BookOpen className="w-5 h-5 mb-0.5" />}
              <span className="text-[11px] truncate max-w-full">
                {canPlayGames ? (lang === 'th' ? 'เกมส์' : 'Arcade') : (lang === 'th' ? 'การบ้าน' : 'Tasks')}
              </span>
            </button>
          )}

          {/* SLOT 4: ACCOUNT / SETTINGS */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[var(--color-primary-text)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] truncate max-w-full">
              {lang === 'th' ? 'บัญชี' : 'Account'}
            </span>
          </button>
        </div>
      </nav>

      {/* ======================================================== */}
      {/* IMMERSIVE FULLSCREEN GAME TAKEOVER (แสดงเต็มจอ ไม่มีเมนูรก) */}
      {/* ======================================================== */}
      {activeGameView !== 'hub' && (
        <div className="game-immersive-root fixed inset-0 z-50 bg-slate-950 w-full h-dvh flex flex-col overflow-hidden animate-in fade-in duration-200">
          {(activeGameView === 'boss_raid' ||
            activeGameView === 'subject_labs' ||
            activeGameView === 'hall_of_fame') && (
            <div className="fixed right-3 top-3 z-[60] flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  setGameOrientationNotice(null);
                  if (isLandscapeScreen) {
                    await exitLandscapeGameMode();
                    return;
                  }
                  const res = await enterLandscapeGameMode();
                  if (!res.ok && !isLandscapeViewport()) {
                    setGameOrientationNotice(
                      lang === 'th'
                        ? 'เอียงโทรศัพท์เป็นแนวนอนเพื่อเล่นเต็มจอได้เลย'
                        : 'Rotate phone sideways for landscape view'
                    );
                    window.setTimeout(() => setGameOrientationNotice(null), 4000);
                  }
                }}
                className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-lg backdrop-blur cursor-pointer hover:bg-slate-800"
                title={isLandscapeScreen ? 'ออกจากเต็มจอแนวนอน' : 'ขยายเต็มจอ / หมุนเป็นแนวนอน'}
              >
                {isLandscapeScreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 rotate-90 text-sky-300" />
                )}
                <span>{isLandscapeScreen ? 'ออกแนวนอน' : 'หมุนจอ / เต็มจอ'}</span>
              </button>
              {gameOrientationNotice && (
                <div className="rounded-lg bg-slate-900/95 border border-sky-500/40 px-2.5 py-1 text-[10px] text-sky-200 shadow-lg max-w-[210px]">
                  {gameOrientationNotice}
                </div>
              )}
            </div>
          )}
          <ViewErrorBoundary
            resetKey={`game:${activeGameView}`}
            lang={lang}
            viewName={`mobile-game:${activeGameView}`}
            onBackHome={() => setActiveGameView('hub')}
          >
          {activeGameView === 'battle_royale_3d' && (
            <div className="h-full w-full overflow-hidden">
              <EduBattleRoyale3DView
                questions={questions}
                currentUser={currentUser}
                lang={lang}
                rewardItems={rewardItems}
                onEarnRewards={onEarnRewards}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'arcade_studio' && (
            <div className="h-full w-full overflow-hidden flex flex-col bg-slate-950">
              <EduBattleGameView
                questions={questions}
                playerScores={playerScores}
                rewardItems={rewardItems}
                currentUser={currentUser}
                lang={lang}
                initialSubTab="hub"
                isMobileMode={true}
                onAddQuestion={onAddQuestion}
                onImportQuestions={onImportQuestions}
                onEarnRewards={onEarnRewards}
                onRedeemReward={onRedeemReward}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === '1v1_arena' && (
            <div className="h-full w-full overflow-hidden flex flex-col bg-slate-950">
              <EduBattleGameView
                questions={questions}
                playerScores={playerScores}
                rewardItems={rewardItems}
                currentUser={currentUser}
                lang={lang}
                initialSubTab="arena"
                isMobileMode={true}
                onAddQuestion={onAddQuestion}
                onImportQuestions={onImportQuestions}
                onEarnRewards={onEarnRewards}
                onRedeemReward={onRedeemReward}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'boss_raid' && (
            <div className="h-full w-full overflow-y-auto flex flex-col bg-slate-950 p-1 sm:p-3">
              <CoopBossRaidView
                questions={questions}
                lang={lang}
                currentRole={currentRole}
                currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'subject_labs' && (
            <div className="h-full w-full overflow-hidden flex flex-col">
              <SubjectLabSimulationView
                currentUserRole={currentRole}
                currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                lang={lang}
                onEarnRewards={onEarnRewards}
                onBackToGames={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'hall_of_fame' && (
            <div className="h-full w-full overflow-y-auto flex flex-col bg-slate-950 p-2 sm:p-4">
              <HallOfFame3DView
                lang={lang}
                school={activeSchool}
                students={linkedStudents}
                portfolioItems={portfolioItems}
                playerScores={playerScores}
                currentUser={currentUser}
                onOpenPortfolio={() => {
                  setActiveGameView('hub');
                  setActiveTab('portfolio');
                }}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}
          </ViewErrorBoundary>
        </div>
      )}

      {showMobileCalendarSync && (
        <GoogleCalendarSyncModal
          slots={scopedTimetableSlots}
          assignments={scopedAssignments}
          courses={scopedCourses}
          schoolId={activeSchool.id}
          schoolName={activeSchool.nameTh || activeSchool.nameEn}
          academicYear={activeSchool.academicYear || '2569'}
          semester={activeSchool.currentSemester || '1'}
          filterLabel={
            currentRole === 'student' && ownStudent
              ? `${ownStudent.gradeLevel} ${ownStudent.room}`
              : currentRole === 'teacher'
                ? teacherFullName || 'ตารางสอนของฉัน'
                : 'ตารางเรียนโรงเรียน'
          }
          defaultStartDate={todayBangkokStr}
          defaultEndDate={addCalendarDays(todayBangkokStr, 120)}
          calendarWeekStart={getCalendarWeekStart(todayBangkokStr)}
          onClose={() => setShowMobileCalendarSync(false)}
        />
      )}
    </div>
  );
};
