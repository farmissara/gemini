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
  GradingSystem
} from '../../types';
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
  getBangkokDateInputValue,
  getCalendarWeekStart,
} from '../../lib/timetableCalendar';
import {
  getHolidayForDate,
  getHolidaysForDate,
  getHolidaysInMonth,
  getUpcomingHolidays,
  isWeekendDate,
  syncPublicHolidaysFromApi,
} from '../../lib/thaiHolidays';
import { GoogleCalendarSyncModal } from '../GoogleCalendarSyncModal';
import { MobileAttendanceView } from '../../views/MobileAttendanceView';
import { EduBattleGameView } from '../../views/EduBattleGameView';
import { EduBattleRoyale3DView } from '../../views/EduBattleRoyale3DView';
import { CoopBossRaidView } from '../../views/CoopBossRaidView';
import { SubjectLabSimulationView } from '../../views/SubjectLabSimulationView';
import { HallOfFame3DView } from '../../views/HallOfFame3DView';
import { DigitalIdCardView } from '../../views/DigitalIdCardView';
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
  const [gameHubPage, setGameHubPage] = useState(0);
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
  const todayBangkokStr = getBangkokDateInputValue();
  const todayDayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[
    new Date(`${todayBangkokStr}T00:00:00+07:00`).getDay()
  ] || 'mon';
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
    setMobileAttendanceInitialSubTab(initialAttendanceSubTab);
    setMobilePeriodCourseId(initialPeriodCourseId);
    setMobilePeriodNumber(initialPeriodNumber);
    setMobilePeriodDate(initialPeriodDate);
    setMobilePeriodCheckType(initialPeriodCheckType);
  }, [initialAttendanceSubTab, initialPeriodCourseId, initialPeriodNumber, initialPeriodDate, initialPeriodCheckType]);

  useEffect(() => {
    void syncPublicHolidaysFromApi(mobileCalendarMonthCursor.year).then(() => {
      setHolidaySyncTick((v) => v + 1);
    });
  }, [mobileCalendarMonthCursor.year]);

  useEffect(() => {
    const onHolidaysUpdated = () => setHolidaySyncTick((v) => v + 1);
    window.addEventListener('eduverse:holidays-updated', onHolidaysUpdated);
    return () => window.removeEventListener('eduverse:holidays-updated', onHolidaysUpdated);
  }, []);

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
    exp: 1450,
    gems: 45,
    rankTitle: 'Silver Scholar',
    battleWins: 12,
    streak: 3
  };

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
            ) : (
              <>
                {/* Crisp Personal Greeting + Class/Department Context */}
                <div className="pt-1 space-y-1">
                  <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-title)] truncate">
                    {lang === 'th' ? 'สวัสดี' : 'Hello'} {currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ใช้งาน'}
                  </h1>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] truncate tabular-nums">
                    {currentRole === 'student' && ownStudent
                      ? `${ownStudent.gradeLevel} ${ownStudent.room} · รหัส ${ownStudent.studentIdNumber}`
                      : currentRole === 'parent' && linkedStudents.length > 0
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

                {/* Quick Today Next Period Card (with direct Check-in/Check-out) */}
                {(currentRole === 'student' || currentRole === 'teacher') &&
                  !todayHoliday &&
                  !isWeekendDate(todayBangkokStr) &&
                  todayMySlots.length > 0 && (() => {
                    const nextSlot = todayMySlots[0];
                    const status = getSlotTodayCheckStatus(nextSlot, todayBangkokStr);
                    return (
                      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--color-primary-text)] tabular-nums">
                            {lang === 'th'
                              ? `คาบเรียนวันนี้ · คาบ ${nextSlot.periodNumber} (${nextSlot.startTime}–${nextSlot.endTime})`
                              : `Period ${nextSlot.periodNumber} · ${nextSlot.startTime}–${nextSlot.endTime}`}
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
                            {nextSlot.courseCode} · {nextSlot.courseTitleTh || nextSlot.courseTitleEn}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                            {nextSlot.classRoom} {nextSlot.room ? `· ห้อง ${nextSlot.room}` : ''} · {nextSlot.teacherName}
                          </p>
                        </div>
                        {canSelfCheckin && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => openPeriodCheckinFromSlot(nextSlot, todayBangkokStr, 'check_in')}
                              className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                            >
                              <LogIn className="w-4 h-4" />
                              <span>{status.hasCheckIn ? 'เช็คอินแล้ว' : 'เช็คอินคาบนี้'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openPeriodCheckinFromSlot(nextSlot, todayBangkokStr, 'check_out')}
                              className="min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>{status.hasCheckOut ? 'เช็คเอาท์แล้ว' : 'เช็คเอาท์คาบ'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                {/* Single-line Clean List Rows */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                  {(currentRole === 'teacher' || currentRole === 'student') && (
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
                          {currentRole === 'teacher'
                            ? lang === 'th'
                              ? 'ตารางสอนวันนี้'
                              : 'Today Teaching Schedule'
                            : lang === 'th'
                              ? 'ตารางเรียนวันนี้'
                              : 'Today Timetable'}
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

                  {(currentRole === 'teacher' || currentRole === 'student' || currentRole === 'parent') && (
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

                  {currentRole === 'student' && canAccessHomework && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('homework')}
                      className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>{lang === 'th' ? 'การบ้านและงานค้าง' : 'Homework'}</span>
                      </span>
                      <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
                        {pendingHomeworkCount > 0 ? `${pendingHomeworkCount} งาน` : 'ครบแล้ว'}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  )}

                  {(currentRole === 'teacher' || (currentRole === 'student' && canPlayGames)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('games');
                        setActiveGameView('hub');
                        setGameHubPage(0);
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
                <div className="flex items-center gap-1.5">
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
                          const periodDef = schoolPeriods.find((p) => p.periodNumber === slot.periodNumber);
                          const course = scopedCourses.find((c) => c.id === slot.courseId || c.code === slot.courseCode);
                          const status = getSlotTodayCheckStatus(slot, todayBangkokStr);
                          return (
                            <div
                              key={slot.id}
                              className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums">
                                    <span>{lang === 'th' ? `คาบที่ ${slot.periodNumber}` : `Period ${slot.periodNumber}`}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      {slot.startTime || periodDef?.startTime || '--:--'} - {slot.endTime || periodDef?.endTime || '--:--'}
                                    </span>
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
                                {(status.hasCheckIn || status.hasCheckOut) && (
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                    {status.hasCheckOut ? 'เข้า+ออกแล้ว' : 'เช็คอินแล้ว'}
                                  </span>
                                )}
                              </div>

                              {(currentRole === 'teacher' || currentRole === 'student') && canSelfCheckin && (
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)]">
                                  <button
                                    type="button"
                                    onClick={() => openPeriodCheckinFromSlot(slot, todayBangkokStr, 'check_in')}
                                    className="min-h-[42px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                                  >
                                    <LogIn className="w-4 h-4" />
                                    <span>{status.hasCheckIn ? 'เช็คอินซ้ำ' : 'เช็คอินเข้าคาบ'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPeriodCheckinFromSlot(slot, todayBangkokStr, 'check_out')}
                                    className="min-h-[42px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                                  >
                                    <LogOut className="w-4 h-4" />
                                    <span>{status.hasCheckOut ? 'เช็คเอาท์ซ้ำ' : 'เช็คเอาท์คาบ'}</span>
                                  </button>
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
                        <p className="text-[11px] text-rose-600 dark:text-rose-300">{h.nameEn}</p>
                      </div>
                    ))}

                    {selectedCalDaySlots.map((slot) => (
                      <div key={slot.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2">
                        <div>
                          <p className="text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums">
                            คาบ {slot.periodNumber} · {slot.startTime}–{slot.endTime}
                          </p>
                          <p className="text-xs font-bold text-[var(--color-text-title)]">
                            {slot.courseCode} · {slot.courseTitleTh}
                          </p>
                        </div>
                        {(currentRole === 'teacher' || currentRole === 'student') && canSelfCheckin && selectedDateHolidays.length === 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => openPeriodCheckinFromSlot(slot, mobileSelectedCalendarDate, 'check_in')}
                              className="min-h-[38px] rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                            >
                              เช็คอินเข้าคาบ
                            </button>
                            <button
                              type="button"
                              onClick={() => openPeriodCheckinFromSlot(slot, mobileSelectedCalendarDate, 'check_out')}
                              className="min-h-[38px] rounded-lg bg-indigo-600 text-white text-[11px] font-bold cursor-pointer"
                            >
                              เช็คเอาท์คาบ
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {monthHolidays.length > 0 && (
                      <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
                        <p className="text-xs font-bold text-[var(--color-text-title)]">วันหยุดประจำเดือน ({monthHolidays.length})</p>
                        {monthHolidays.map((h) => (
                          <p key={h.id} className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">{h.date}</span> · {h.nameTh}
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
        {activeTab === 'games' && (
          <div className="animate-in fade-in duration-200 space-y-4">
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--color-primary-text)] tabular-nums">
                <span>ศูนย์รวมเกมส์ & สนามประลอง</span>
                <span>EXP: {currentScore.exp}</span>
              </div>
              <h2 className="text-base font-bold text-[var(--color-text-title)]">เลือกเกมเพื่อเริ่มเล่น (โหมดอาร์เคดเต็มจอ)</h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">สนามประลองปัญญาและแล็บจำลอง โหมดเกมตอบสด หน้าจออาร์เคดกระชับ</p>
            </div>

            <div className="space-y-2.5">
              {gameHubPage === 0 && (
                <>
                  {/* Game 0: EduArcade 7-Genre Studio */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('arcade_studio')}
                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-bold shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-[var(--color-text-title)]">EduArcade ศูนย์เกม 7 สไตล์</h3>
                          <span className="text-[11px] font-bold text-[var(--color-primary-text)]">· 8 สาระ</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">ยิงอุกกาบาตสมการ จับคู่ 8 สาระ ต่อคำศัพท์ ChronoSort &amp; ภารกิจรายวัน</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
                  </button>

                  {/* Game 1: 3D EduArena Battle Royale */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('battle_royale_3d')}
                    className="w-full p-4 rounded-2xl border border-amber-400/60 bg-[var(--color-card)] hover:border-amber-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">3D EduArena Battle Royale</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-slate-950 font-black">3D</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">วิ่งล่าหีบสมบัติ ตอบคำถามชิงคะแนน มีปุ่มซูม 3D</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>

                  {/* Game 2: 1v1 Battle Arena */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('1v1_arena')}
                    className="w-full p-4 rounded-2xl border border-rose-400/60 bg-[var(--color-card)] hover:border-rose-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold shrink-0">
                        <Swords className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">1v1 แบทเทิลดวลความเร็ว</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-700 text-white font-bold">1v1</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">สู้กับบอทหรือเพื่อน ตอบโจทย์ไว ชิง HP หน้าเดียวกระชับ</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                </>
              )}

              {gameHubPage === 1 && (
                <>
                  {/* Game 3: Co-op Boss Raid */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('boss_raid')}
                    className="w-full p-4 rounded-2xl border border-red-400/60 bg-[var(--color-card)] hover:border-red-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 flex items-center justify-center font-bold shrink-0">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">Co-op Boss Raid (ตีบอส)</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-700 text-white font-bold">CO-OP</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">รวมพลังตีบอสประจำวิชา มีปุ่มซูมตัวบอส ไม่ต้องเลื่อนหน้า</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>

                  {/* Game 4: Subject Labs & Chemistry */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('subject_labs')}
                    className="w-full p-4 rounded-2xl border border-blue-400/60 bg-[var(--color-card)] hover:border-blue-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shrink-0">
                        <FlaskConical className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">เวิร์กช็อปจำลอง 6 สาระ</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-700 text-white font-bold">SIM</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">จำลองการทดลองเคมี จรวดฟิสิกส์ ครัวไวยากรณ์ โค้ดดิ้ง และแผนที่โลก</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                </>
              )}

              {gameHubPage === 2 && (
                <>
                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      รางวัลและผลงาน • ไม่ใช่โหมดเกม
                    </h3>
                  </div>

                  {/* Achievement gallery is kept separate from playable modes. */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('hall_of_fame')}
                    className="w-full p-4 rounded-2xl border border-indigo-400/60 bg-[var(--color-card)] hover:border-indigo-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">ถ้วยรางวัลและเกียรติบัตร</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-700 text-white font-bold">รางวัล</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">ดูถ้วยรางวัล 3 มิติและเกียรติบัตรที่ได้รับ</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                    </>
                  )}
                    </div>

                <nav aria-label="เลือกหมวดเกม" className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setGameHubPage((page) => Math.max(0, page - 1))}
                    disabled={gameHubPage === 0}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <span aria-live="polite" className="text-[11px] font-semibold text-[var(--color-text-muted)]">{gameHubPage + 1} / 3</span>
                  <button
                    type="button"
                    onClick={() => setGameHubPage((page) => Math.min(2, page + 1))}
                    disabled={gameHubPage === 2}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </nav>
              </div>
        )}

        {/* TAB E: PROFILE & DIGITAL VIRTUAL ID CARD */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">การตั้งค่าและบัญชีผู้ใช้</h3>
              
              <div className="space-y-2 text-xs">
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

                {/* Onboarding Tutor & Thai Systems Guide */}
                {onOpenOnboardingTutor && (
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

            <nav aria-label="โปรไฟล์" className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setProfilePage(0)}
                disabled={profilePage === 0}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
              >
                บัตรดิจิทัล
              </button>
              <span aria-live="polite" className="text-[11px] font-semibold text-[var(--color-text-muted)]">{profilePage + 1} / 2</span>
              <button
                type="button"
                onClick={() => setProfilePage(1)}
                disabled={profilePage === 1}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
              >
                ตั้งค่า
              </button>
            </nav>
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
              activeTab === 'home'
                ? 'text-[var(--color-primary-text)] font-bold'
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
                ? 'text-[var(--color-primary-text)] font-bold'
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
                  ? 'text-[var(--color-primary-text)] font-bold'
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
                ? 'text-[var(--color-primary-text)] font-bold'
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
        <div className="fixed inset-0 z-50 bg-slate-950 w-full h-dvh flex flex-col overflow-hidden animate-in fade-in duration-200">
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
            <div className="h-full w-full overflow-y-auto flex flex-col bg-slate-950 p-1 sm:p-3">
              <HallOfFame3DView
                lang={lang}
                school={activeSchool}
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
