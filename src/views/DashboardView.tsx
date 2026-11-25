import React, { useState, useMemo, useEffect, useRef } from 'react';
import AttendancePhoto, { resolveAttendancePhotoUrl } from '../components/AttendancePhoto';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Receipt,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  Calendar,
  FileCheck2,
  Award,
  Camera,
  MapPin,
  Eye,
  X,
  Download,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  LogOut,
  LogIn,
  UserCheck,
  FlaskConical,
  BrainCircuit,
  Trophy,
  ShieldAlert,
  Flame,
  Swords,
  BarChart3,
  BellRing,
  Monitor,
  BookOpen,
  ClipboardList,
  Printer,
  ListChecks,
  TrendingUp,
  Activity,
  LayoutGrid,
  AlertTriangle,
  Compass,
  SlidersHorizontal,
  Focus,
} from 'lucide-react';
import { slotHasTeacher } from '../lib/timetableTeachers';
import { 
  UserRole,
  Student, 
  Teacher,
  Course, 
  AttendanceRecord, 
  TuitionInvoice, 
  Announcement, 
  SystemConfig,
  School,
  AuthUser,
  AppLanguage,
  GradeRecord,
  HomeworkSubmission,
  LeaveRequest,
  PlayerScore,
  SchoolPeriodTime,
  TimetableSlot,
  Assignment,
  Lesson,
  PeriodAttendanceRecord,
  BehaviorRecord,
  SdqAssessment,
  InfirmaryVisit,
  SchoolFeatureFlags,
  CampusGateGeofence,
} from '../types';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { emitAppToast } from '../components/common/ToastProvider';
import { NavTab } from '../components/layout/Sidebar';
import { getLocalDateString } from '../lib/date';
import { getHolidayForDate, getUpcomingHolidays, isWeekendDate } from '../lib/thaiHolidays';
import { filterAttendanceForUser, resolveLinkedStudentsForUser } from '../lib/attendanceScope';
import {
  filterAnnouncementsForRole,
  filterAssignmentsForPersonalRole,
  filterCoursesForPersonalRole,
  filterTimetableSlotsForPersonalRole,
} from '../lib/studentDataScope';
import { PagedList } from '../components/PagedList';
import { MilestoneAchievementsPanel } from '../components/MilestoneAchievementsPanel';
import { MonthlyAttendanceChart } from '../components/MonthlyAttendanceChart';
import { GradeLevelAnalyticsChart } from '../components/GradeLevelAnalyticsChart';
import { D3DailyAttendanceLineChart } from '../components/D3DailyAttendanceLineChart';
import { calculateStudentAcademicSummary, getRawScoreFeedback } from '../lib/moeGrading';
import { getModuleTone } from '../lib/moduleTheme';
import { SchoolPolicyId } from '../lib/schoolPermissions';
import { isProgramModeEnabledByFeatureFlags, isTabEnabledByFeatureFlags } from '../lib/schoolFeatureFlags';
import { ExecutiveMonitorView } from './ExecutiveMonitorView';
import { ExecutiveEarlyWarningView } from './ExecutiveEarlyWarningView';
import { ExecutiveRealtimeDailyPanel } from '../components/ExecutiveRealtimeDailyPanel';
import { StudentDesktopDashboard } from '../components/student/StudentDesktopDashboard';
import { AdminDashboardWorkspace } from '../components/admin/AdminDashboardWorkspace';
import { ObecLearningAreaExecutiveDashboard } from '../components/ObecLearningAreaExecutiveDashboard';
import { Pp6ExecutiveQualityDashboard } from '../components/Pp6ExecutiveQualityDashboard';
import type { SystemSettingsTab } from './SystemSettingsView';

export type DashboardSubTab =
  | 'overview'
  | 'realtime_daily'
  | 'insights'
  | 'live_attendance'
  | 'executive_monitor'
  | 'obec_learning_areas'
  | 'pp6_quality_overview'
  | 'early_warning'
  | 'innovative_hub'
  | 'announcements';

interface DashboardViewProps {
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  attendance: AttendanceRecord[];
  grades?: GradeRecord[];
  playerScores?: PlayerScore[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  systemConfig: SystemConfig;
  school?: School;
  currentUser?: AuthUser | null;
  lang?: AppLanguage;
  onNavigate: (tab: NavTab) => void;
  onQuickCheckIn: (studentId: string) => void;
  onRecordMilestoneActivity?: (
    userId: string,
    kind: 'library_visit' | 'attendance',
    studentId?: string
  ) => void;
  unclaimedCentralPacksCount?: number;
  onOpenCentralExamPopup?: () => void;
  timetableSlots?: TimetableSlot[];
  leaveRequests?: LeaveRequest[];
  homeworkSubmissions?: HomeworkSubmission[];
  assignments?: Assignment[];
  lessons?: Lesson[];
  onOpenLmsLesson?: (courseId: string, lessonId: string) => void;
  periodAttendance?: PeriodAttendanceRecord[];
  schoolPeriods?: SchoolPeriodTime[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  infirmaryVisits?: InfirmaryVisit[];
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  featureFlags?: SchoolFeatureFlags;
  campusGates?: CampusGateGeofence[];
  currentRole?: UserRole;
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  onOpenSystemSettingsTab?: (tab: SystemSettingsTab) => void;
  initialSubTab?: DashboardSubTab;
  onSelectStudent?: (student: Student) => void;
  onOpenGradebookCourse?: (courseId?: string) => void;
  onOpenStudentDevBook?: (studentId: string) => void;
  onOpenStudentPp6?: (studentId: string) => void;
  onOpenPp5Summary?: () => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  adminSimplifiedView?: boolean;
  onToggleAdminSimplifiedView?: () => void;
  onLoadAttendanceRange?: (startDate?: string | null, endDate?: string | null) => Promise<void> | void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  teachers = [],
  courses,
  attendance,
  grades = [],
  playerScores = [],
  invoices,
  announcements,
  systemConfig,
  school,
  currentUser,
  lang = 'th',
  onNavigate,
  onRecordMilestoneActivity,
  unclaimedCentralPacksCount = 0,
  onOpenCentralExamPopup,
  timetableSlots = [],
  leaveRequests = [],
  homeworkSubmissions = [],
  assignments = [],
  lessons = [],
  onOpenLmsLesson,
  periodAttendance = [],
  schoolPeriods = [],
  behaviorRecords = [],
  sdqAssessments = [],
  infirmaryVisits = [],
  schoolPermissions,
  featureFlags,
  campusGates = [],
  currentRole: propCurrentRole,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
  onOpenSystemSettingsTab,
  initialSubTab,
  onSelectStudent,
  onOpenGradebookCourse,
  onOpenStudentDevBook,
  onOpenStudentPp6,
  onOpenPp5Summary,
  focusMode: controlledFocusMode,
  onToggleFocusMode,
  adminSimplifiedView = false,
  onToggleAdminSimplifiedView,
  onLoadAttendanceRange,
}) => {
  const [localFocusMode, setLocalFocusMode] = useState(false);
  const welcomeToastShownRef = useRef<string | null>(null);
  const isFocusMode = typeof controlledFocusMode === 'boolean' ? controlledFocusMode : localFocusMode;
  const handleToggleFocus = () => {
    if (onToggleFocusMode) {
      onToggleFocusMode();
    } else {
      setLocalFocusMode((prev) => !prev);
    }
  };
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 2 * 86400000));

  const currentRole = propCurrentRole || currentUser?.role || 'admin';
  const isAdminSimplified = currentRole === 'admin' && adminSimplifiedView;
  const adminTeachersCount = useMemo(
    () => teachers.filter((t) => Boolean(t.isSchoolAdmin)).length,
    [teachers]
  );
  const isModuleEnabled = (tab: NavTab) => isTabEnabledByFeatureFlags(tab, featureFlags, currentRole);
  const canViewExecutiveMonitor = !isAdminSimplified && ['super_admin', 'admin', 'teacher'].includes(currentRole);
  const canViewEarlyWarning = !isAdminSimplified && ['super_admin', 'admin'].includes(currentRole) && isModuleEnabled('executive_warning');
  const canViewFinancials =
    isModuleEnabled('billing') &&
    (currentRole === 'super_admin' ||
      currentRole === 'admin' ||
      currentRole === 'parent' ||
      (currentRole === 'teacher' && (schoolPermissions?.teacher_view_financials ?? true)));

  const isStaffRole = !currentRole || currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin';
  const resolveAllowedSubTab = (candidate?: DashboardSubTab): DashboardSubTab => {
    if (!candidate) return 'overview';
    if (candidate === 'realtime_daily' && !isStaffRole) return 'overview';
    if (candidate === 'executive_monitor' && !canViewExecutiveMonitor) return 'overview';
    if (candidate === 'obec_learning_areas' && !canViewExecutiveMonitor) return 'overview';
    if (candidate === 'pp6_quality_overview' && !canViewExecutiveMonitor) return 'overview';
    if (candidate === 'early_warning' && !canViewEarlyWarning) return 'overview';
    return candidate;
  };

  const isLineEnabled = featureFlags?.lineEnabled !== false && systemConfig.lineMessagingConfigured !== false;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    if (onLoadAttendanceRange && selectedDate) void onLoadAttendanceRange(selectedDate, selectedDate);
  }, [selectedDate, onLoadAttendanceRange]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'check_in' | 'check_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardTab, setDashboardTab] = useState<DashboardSubTab>(() => resolveAllowedSubTab(initialSubTab));
  const [lastExecReportTab, setLastExecReportTab] = useState<'executive_monitor' | 'obec_learning_areas' | 'pp6_quality_overview'>(() =>
    initialSubTab === 'obec_learning_areas' || initialSubTab === 'pp6_quality_overview'
      ? initialSubTab
      : 'executive_monitor'
  );
  const [teacherDeskTab, setTeacherDeskTab] = useState<'actions' | 'checkins'>('actions');
  const [innovationPage, setInnovationPage] = useState(0);
  const [attendanceStep, setAttendanceStep] = useState<'summary' | 'analytics' | 'records' | 'live_feed'>('summary');
  const [drawerMode, setDrawerMode] = useState<null | 'onboarding' | 'guardian_line'>(null);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`eduverse_onboarding_dismissed_${school?.id || 'default'}`) === '1';
  });

  useEffect(() => {
    if (initialSubTab) {
      const resolved = resolveAllowedSubTab(initialSubTab);
      setDashboardTab(resolved);
      if (resolved === 'executive_monitor' || resolved === 'obec_learning_areas' || resolved === 'pp6_quality_overview') {
        setLastExecReportTab(resolved);
      }
    }
  }, [initialSubTab, canViewExecutiveMonitor, canViewEarlyWarning]);

  useEffect(() => {
    if (dashboardTab === 'executive_monitor' || dashboardTab === 'obec_learning_areas' || dashboardTab === 'pp6_quality_overview') {
      setLastExecReportTab(dashboardTab);
    }
  }, [dashboardTab]);

  useEffect(() => {
    if (isAdminSimplified) {
      setDashboardTab((prev) => resolveAllowedSubTab(prev));
    }
  }, [isAdminSimplified]);

  // Slide-over Drawer for viewing captured selfie photo & GPS metadata
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  const openPhotoRecord = (record: AttendanceRecord) => {
    setSelectedPhotoRecord(record);
  };

  // Enforce strict Student / Parent ownership scoping
  const isRestrictedPersonalRole = currentRole === 'student' || currentRole === 'parent';
  const scopedStudents = useMemo(
    () => (isRestrictedPersonalRole ? resolveLinkedStudentsForUser(currentUser, students) : students),
    [currentUser, isRestrictedPersonalRole, students]
  );
  const scopedStudentIdSet = useMemo(() => new Set(scopedStudents.map((s) => s.id)), [scopedStudents]);
  const scopedGrades = useMemo(
    () => (isRestrictedPersonalRole ? grades.filter((g) => scopedStudentIdSet.has(g.studentId)) : grades),
    [grades, isRestrictedPersonalRole, scopedStudentIdSet]
  );
  const scopedInvoices = useMemo(
    () => (isRestrictedPersonalRole ? invoices.filter((inv) => scopedStudentIdSet.has(inv.studentId)) : invoices),
    [invoices, isRestrictedPersonalRole, scopedStudentIdSet]
  );
  const scopedLeaves = useMemo(
    () =>
      isRestrictedPersonalRole
        ? leaveRequests.filter((l) => scopedStudentIdSet.has(l.userId) || (Boolean(currentUser?.id) && l.userId === currentUser?.id))
        : leaveRequests,
    [currentUser?.id, isRestrictedPersonalRole, leaveRequests, scopedStudentIdSet]
  );
  const scopedHomework = useMemo(
    () =>
      isRestrictedPersonalRole
        ? homeworkSubmissions.filter((h) => scopedStudentIdSet.has(h.studentId))
        : homeworkSubmissions,
    [homeworkSubmissions, isRestrictedPersonalRole, scopedStudentIdSet]
  );
  const scopedCourses = useMemo(
    () => filterCoursesForPersonalRole(courses, currentUser, students),
    [courses, currentUser, students]
  );
  const scopedAssignments = useMemo(
    () => filterAssignmentsForPersonalRole(assignments, scopedCourses, currentUser),
    [assignments, currentUser, scopedCourses]
  );
  const scopedLessons = useMemo(
    () => lessons.filter((lesson) => scopedCourses.some((course) => course.id === lesson.courseId)),
    [lessons, scopedCourses]
  );
  const scopedTimetableSlots = useMemo(
    () => filterTimetableSlotsForPersonalRole(timetableSlots, currentUser, students, scopedCourses),
    [currentUser, scopedCourses, students, timetableSlots]
  );
  const scopedAnnouncements = useMemo(
    () => filterAnnouncementsForRole(announcements, currentUser),
    [announcements, currentUser]
  );
  const todayHoliday = useMemo(
    () => getHolidayForDate(todayStr, school?.id),
    [todayStr, school?.id]
  );
  const upcomingHoliday = useMemo(
    () => getUpcomingHolidays(todayStr, 30, school?.id)[0] || null,
    [todayStr, school?.id]
  );
  const isTodayWeekend = useMemo(() => isWeekendDate(todayStr), [todayStr]);

  // Teacher / Admin Today's Desk computations
  const todayDayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getDay()];
  const todayScheduledSlots = useMemo(() => {
    const daySlots = scopedTimetableSlots.filter((s) => s.dayOfWeek === todayDayKey);
    if (currentRole === 'teacher') {
      const teacherName = currentUser?.fullNameTh || '';
      const mine = daySlots.filter((s) => slotHasTeacher(s, teacherName));
      return (mine.length > 0 ? mine : daySlots).slice().sort((a, b) => a.periodNumber - b.periodNumber);
    }
    return daySlots.slice().sort((a, b) => a.periodNumber - b.periodNumber);
  }, [scopedTimetableSlots, todayDayKey, currentRole, currentUser]);
  const pendingLeaveCount = scopedLeaves.filter((l) => l.status === 'pending').length;
  const ungradedHomeworkCount = scopedHomework.filter((h) => h.status === 'submitted' || h.status === 'late').length;
  const isStaffUser = !currentRole || currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin';
  const checkedInStudentIdsToday = useMemo(() => {
    const ids = new Set<string>();
    attendance.forEach((rec) => {
      if (rec.date === todayStr && rec.userType !== 'teacher' && rec.studentId) {
        ids.add(rec.studentId);
      }
    });
    return ids;
  }, [attendance, todayStr]);
  const uncheckedTodayCount = Math.max(0, scopedStudents.filter((s) => s.status === 'active').length - checkedInStudentIdsToday.size);
  const uncheckedPeriodsTodayCount = useMemo(() => {
    if (todayHoliday || isTodayWeekend || todayScheduledSlots.length === 0) return 0;
    const todayPeriodRecords = periodAttendance.filter(
      (rec) => rec.date === todayStr && (rec.recordType || 'check_in') === 'check_in'
    );
    return todayScheduledSlots.filter((slot) => {
      const resolvedCourseId = slot.courseId || slot.courseCode;
      const hasLogs = todayPeriodRecords.some(
        (rec) =>
          rec.periodNumber === slot.periodNumber &&
          (rec.courseId === resolvedCourseId ||
            Boolean(slot.courseCode && rec.courseCode?.trim().toLowerCase() === slot.courseCode.trim().toLowerCase()))
      );
      return !hasLogs;
    }).length;
  }, [isTodayWeekend, periodAttendance, todayHoliday, todayScheduledSlots, todayStr]);
  const teacherLeavesTodayCount = useMemo(
    () =>
      leaveRequests.filter(
        (req) =>
          req.userRole === 'teacher' &&
          req.status !== 'rejected' &&
          req.startDate <= todayStr &&
          req.endDate >= todayStr
      ).length,
    [leaveRequests, todayStr]
  );

  // 3-Step Onboarding Checklist state
  const step1Done = students.length > 0 && courses.length > 0;
  const step2Done = Boolean(school?.latitude && school?.longitude) || schoolPeriods.length >= 6;
  const step3Done = timetableSlots.length > 0;
  const completedOnboardingCount = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const showOnboardingCard = !onboardingDismissed && (currentRole === 'admin' || currentRole === 'super_admin') && completedOnboardingCount < 3;

  // Compute key overall stats (scoped strictly for student/parent)
  const totalStudents = scopedStudents.length;
  const activeStudents = scopedStudents.filter(s => s.status === 'active').length;
  const lineConnectedCount = scopedStudents.filter(s => s.lineLinked).length;
  const linePercent = totalStudents > 0 ? Math.round((lineConnectedCount / totalStudents) * 100) : 0;

  // Scope attendance so students/parents only see their own check-in records & photos
  const scopedAttendance = useMemo(
    () => filterAttendanceForUser(attendance, currentUser, students),
    [attendance, currentUser, students]
  );

  // Filter attendance for the selected date
  const filteredAttendanceByDate = useMemo(() => {
    return scopedAttendance.filter(a => a.date === selectedDate);
  }, [scopedAttendance, selectedDate]);

  // Filtered by role and type
  const displayRecords = useMemo(() => {
    return filteredAttendanceByDate.filter(rec => {
      // Role filter
      if (selectedRoleFilter === 'student' && rec.userType === 'teacher') return false;
      if (selectedRoleFilter === 'teacher' && rec.userType !== 'teacher') return false;

      // Type filter
      if (selectedTypeFilter === 'check_in' && rec.recordType === 'check_out') return false;
      if (selectedTypeFilter === 'check_out' && rec.recordType !== 'check_out') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const name = (rec.userName || '').toLowerCase();
        const role = (rec.userRole || '').toLowerCase();
        const room = (rec.userDepartmentOrRoom || '').toLowerCase();
        const remarks = (rec.remarks || '').toLowerCase();
        return name.includes(query) || role.includes(query) || room.includes(query) || remarks.includes(query);
      }

      return true;
    });
  }, [filteredAttendanceByDate, selectedRoleFilter, selectedTypeFilter, searchQuery]);

  // Analytics for the selected date
  const totalForDate = filteredAttendanceByDate.length;
  const checkInsCount = filteredAttendanceByDate.filter(a => a.recordType !== 'check_out').length;
  const checkOutsCount = filteredAttendanceByDate.filter(a => a.recordType === 'check_out').length;
  const presentCount = filteredAttendanceByDate.filter(a => a.status === 'present').length;
  const lateCount = filteredAttendanceByDate.filter(a => a.status === 'late').length;
  const selfieCount = filteredAttendanceByDate.filter(a => !!a.photoUrl).length;
  const studentCheckIns = filteredAttendanceByDate.filter(a => a.userType !== 'teacher').length;
  const teacherCheckIns = filteredAttendanceByDate.filter(a => a.userType === 'teacher').length;

  const onTimePercent = totalForDate > 0 ? Math.round((presentCount / totalForDate) * 100) : 0;
  const latePercent = totalForDate > 0 ? Math.round((lateCount / totalForDate) * 100) : 0;

  // Hourly distribution
  const hourlyBuckets = useMemo(() => {
    const buckets = [
      { label: lang === 'th' ? 'ก่อน 07:00' : 'Before 07:00', range: '< 07:00', count: 0, color: 'bg-indigo-600' },
      { label: lang === 'th' ? 'ช่วง 07:00 - 07:30' : '07:00 - 07:30', range: '07:00-07:30', count: 0, color: 'bg-blue-600' },
      { label: lang === 'th' ? 'ช่วง 07:31 - 08:00' : '07:31 - 08:00', range: '07:31-08:00', count: 0, color: 'bg-emerald-600' },
      { label: lang === 'th' ? 'ช่วง 08:01 - 08:30 (สาย)' : '08:01 - 08:30 (Late)', range: '08:01-08:30', count: 0, color: 'bg-amber-500' },
      { label: lang === 'th' ? 'ช่วง 08:31 - 15:00' : '08:31 - 15:00', range: '08:31-15:00', count: 0, color: 'bg-rose-500' },
      { label: lang === 'th' ? 'หลัง 15:00 (เลิกเรียน)' : 'After 15:00 (Dismissal)', range: '> 15:00', count: 0, color: 'bg-purple-600' },
    ];

    filteredAttendanceByDate.forEach(rec => {
      if (!rec.time) return;
      const [h, m] = rec.time.split(':').map(Number);
      const minutes = (h || 0) * 60 + (m || 0);

      if (minutes < 7 * 60) {
        buckets[0].count++;
      } else if (minutes <= 7 * 60 + 30) {
        buckets[1].count++;
      } else if (minutes <= 8 * 60) {
        buckets[2].count++;
      } else if (minutes <= 8 * 60 + 30) {
        buckets[3].count++;
      } else if (minutes <= 15 * 60) {
        buckets[4].count++;
      } else {
        buckets[5].count++;
      }
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      ...b,
      percent: totalForDate > 0 ? Math.round((b.count / totalForDate) * 100) : 0,
      barPercent: Math.round((b.count / maxCount) * 100)
    }));
  }, [filteredAttendanceByDate, totalForDate, lang]);

  // Tuition stats (respecting role/financial permissions)
  const totalInvoiced = canViewFinancials ? scopedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) : 0;
  const totalCollected = canViewFinancials ? scopedInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0) : 0;
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Top honor students (scoped for student/parent)
  const topStudents = [...scopedStudents]
    .sort((a, b) => {
      const sumA = calculateStudentAcademicSummary({ student: a, courses: scopedCourses, grades: scopedGrades, gradingSystem: systemConfig.gradingSystem });
      const sumB = calculateStudentAcademicSummary({ student: b, courses: scopedCourses, grades: scopedGrades, gradingSystem: systemConfig.gradingSystem });
      const scoreA = sumA.hideGpaCalculations ? (sumA.averageRawScore ?? 0) / 25 : (sumA.hasRecordedGrades && sumA.gpax !== null ? sumA.gpax : 0);
      const scoreB = sumB.hideGpaCalculations ? (sumB.averageRawScore ?? 0) / 25 : (sumB.hasRecordedGrades && sumB.gpax !== null ? sumB.gpax : 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  // Export selected date attendance to Excel CSV
  const handleExportSelectedDateCsv = () => {
    if (filteredAttendanceByDate.length === 0) {
      setExportFeedback({
        type: 'warning',
        message: lang === 'th'
          ? `ยังไม่มีบันทึกการมาเรียนในวันที่ ${selectedDate} สำหรับส่งออก CSV`
          : `No attendance records found on ${selectedDate} to export.`,
      });
      return;
    }

    const headers = lang === 'th' ? [
      'วันที่',
      'เวลา',
      'รหัสประจำตัว',
      'ชื่อ-นามสกุล',
      'บทบาท',
      'ชั้นหรือห้อง',
      'ประเภทการบันทึก',
      'สถานะ',
      'จุดตรวจหรือประตู',
      'ระยะห่าง GPS (เมตร)',
      'มีรูปถ่ายเซลฟี่',
      'หมายเหตุ'
    ] : [
      'Date',
      'Time',
      'ID',
      'Full Name',
      'Role',
      'Grade / Room',
      'Record Type',
      'Status',
      'Gate Zone',
      'GPS Distance (m)',
      'Has Selfie',
      'Remarks'
    ];

    const rows = filteredAttendanceByDate.map(log => [
      log.date,
      log.time,
      log.studentId,
      `"${log.userName || (students.find(s => s.id === log.studentId)?.firstNameTh + ' ' + students.find(s => s.id === log.studentId)?.lastNameTh) || 'User'}"`,
      log.userType === 'teacher' ? (lang === 'th' ? 'ครู' : 'Teacher') : (lang === 'th' ? 'นักเรียน' : 'Student'),
      log.userDepartmentOrRoom || (students.find(s => s.id === log.studentId)?.room) || '-',
      log.recordType === 'check_out' ? (lang === 'th' ? 'ออกโรงเรียน' : 'Check-out') : (lang === 'th' ? 'เข้าโรงเรียน' : 'Check-in'),
      log.status === 'present' ? (lang === 'th' ? 'ตรงเวลา' : 'Present') : log.status === 'late' ? (lang === 'th' ? 'มาสาย' : 'Late') : log.status === 'sick' ? (lang === 'th' ? 'ลาป่วย' : 'Sick') : (lang === 'th' ? 'ขาด' : 'Absent'),
      log.location?.geofenceZoneName || (lang === 'th' ? 'ประตูโรงเรียน' : 'Main Gate'),
      log.location?.distanceMeters !== undefined ? `${log.location.distanceMeters}` : '-',
      log.photoUrl ? (lang === 'th' ? 'ใช่' : 'Yes') : (lang === 'th' ? 'ไม่ใช่' : 'No'),
      `"${log.remarks || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportFeedback({
      type: 'success',
      message: lang === 'th'
        ? `ส่งออกข้อมูลการมาเรียน ${filteredAttendanceByDate.length} รายการเป็นไฟล์ CSV เรียบร้อยแล้ว`
        : `Exported ${filteredAttendanceByDate.length} attendance records to CSV.`,
    });
  };

  const fallbackAvatarSvg = (name?: string) => {
    const letter = encodeURIComponent(((name || 'U').trim().charAt(0) || 'U').toUpperCase());
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="%23e2e8f0"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="%23334155">${letter}</text></svg>`;
  };

  const printedAtLabel = new Date().toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Role-aware Morning Brief & Scoped Personal Summary
  const primaryScopedStudent = scopedStudents[0] || null;
  const ownAcademicSummary = useMemo(() => {
    if (!primaryScopedStudent) return null;
    return calculateStudentAcademicSummary({
      student: primaryScopedStudent,
      courses: scopedCourses,
      grades: scopedGrades,
      gradingSystem: systemConfig.gradingSystem,
    });
  }, [primaryScopedStudent, scopedCourses, scopedGrades, systemConfig.gradingSystem]);

  const scopedAttendancePresentTotal = scopedAttendance.filter((a) => a.status === 'present').length;
  const scopedAttendanceRate =
    totalForDate > 0
      ? onTimePercent
      : scopedAttendance.length > 0
        ? Math.round((scopedAttendancePresentTotal / scopedAttendance.length) * 100)
        : 100;

  const pendingInvoices = canViewFinancials
    ? scopedInvoices.filter((inv) => inv.status !== 'paid')
    : [];
  const pendingSlipCount = canViewFinancials
    ? scopedInvoices.filter((inv) => inv.slipStatus === 'pending_review').length
    : 0;

  const currentHour = new Date().getHours();
  const timeGreeting =
    lang === 'th'
      ? currentHour < 12
        ? 'สวัสดีตอนเช้า'
        : currentHour < 17
          ? 'สวัสดีตอนบ่าย'
          : 'สวัสดีตอนเย็น'
      : currentHour < 12
        ? 'Good morning'
        : currentHour < 17
          ? 'Good afternoon'
          : 'Good evening';

  const userDisplayName =
    lang === 'th'
      ? currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email || 'ผู้ใช้งาน'
      : currentUser?.fullNameEn || currentUser?.fullNameTh || currentUser?.email || 'User';

  const roleBadgeLabel =
    currentRole === 'super_admin' || currentRole === 'admin'
      ? lang === 'th' ? 'ผู้บริหารสถานศึกษา' : 'School Administrator'
      : currentRole === 'teacher'
        ? lang === 'th' ? 'คุณครูผู้สอน' : 'Teacher'
        : currentRole === 'student'
          ? lang === 'th' ? 'นักเรียน' : 'Student'
          : lang === 'th' ? 'ผู้ปกครอง' : 'Parent';

  const formattedTodayDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const teacherNextSlot = todayScheduledSlots[0] || null;
  const dailyBriefText = todayHoliday
    ? lang === 'th'
      ? `วันนี้เป็นวันหยุด: ${todayHoliday.nameTh} · สามารถเช็กปฏิทินโรงเรียนและงานค้างได้`
      : `Holiday today: ${todayHoliday.nameEn} · Check the school calendar and pending work`
    : isTodayWeekend
      ? lang === 'th'
        ? 'วันหยุดสุดสัปดาห์ · ไม่มีคาบเรียนปกติ ตรวจสอบปฏิทินวันหยุดราชการได้ในตารางเรียน'
        : 'Weekend · Check upcoming holidays and assignments in your calendar'
      : currentRole === 'teacher'
        ? teacherNextSlot
          ? lang === 'th'
            ? `วันนี้คุณมีสอน ${todayScheduledSlots.length} คาบ · คาบแรก ${teacherNextSlot.courseTitleTh || teacherNextSlot.courseCode} (${teacherNextSlot.room || 'ห้องเรียน'})`
            : `You have ${todayScheduledSlots.length} classes today · First: ${teacherNextSlot.courseTitleEn || teacherNextSlot.courseCode}`
          : lang === 'th'
            ? 'วันนี้ยังไม่มีคาบสอนในตาราง · พร้อมตรวจงานและบันทึกคะแนน ปพ.5'
            : 'No classes scheduled today · Ready for grading and student support'
        : currentRole === 'admin' || currentRole === 'super_admin'
          ? [
              lang === 'th'
                ? `ภาพรวมสถานศึกษาประจำวัน · นักเรียนในระบบ ${totalStudents} คน · ครู ${teachers.length} คน · ${courses.length} รายวิชา`
                : `Daily campus summary · ${totalStudents} students · ${teachers.length} staff · ${courses.length} courses`,
              upcomingHoliday
                ? lang === 'th'
                  ? `วันหยุดถัดไป (${upcomingHoliday.date}): ${upcomingHoliday.nameTh}`
                  : `Upcoming holiday (${upcomingHoliday.date}): ${upcomingHoliday.nameEn}`
                : null,
            ].filter(Boolean).join('\n')
          : currentRole === 'parent'
          ? primaryScopedStudent
            ? lang === 'th'
              ? `ข้อมูลผู้เรียนในความดูแล: ${primaryScopedStudent.firstNameTh} ${primaryScopedStudent.lastNameTh} (ชั้น ${primaryScopedStudent.gradeLevel} ${primaryScopedStudent.room})`
              : `Linked student: ${primaryScopedStudent.firstNameEn} ${primaryScopedStudent.lastNameEn} (${primaryScopedStudent.gradeLevel} ${primaryScopedStudent.room})`
            : lang === 'th'
              ? 'ติดตามการเข้าเรียน ผลการเรียน และประกาศของบุตรหลาน'
              : 'Track your child’s attendance, grades, and school updates'
          : lang === 'th'
            ? `ภาพรวมสถานศึกษาประจำวัน · นักเรียนในระบบ ${totalStudents} คน · พร้อมใช้งานทุกโมดูล`
            : `Daily campus summary · ${totalStudents} active students`;
  const academicPeriodGreeting = lang === 'th'
    ? `ปีการศึกษา ${systemConfig.academicYear} (${formatSemesterLabel(systemConfig.currentSemester)})`
    : `AY ${systemConfig.academicYear} · ${systemConfig.currentSemester}`;

  useEffect(() => {
    if (!currentUser) return;

    const welcomeKey = `eduverse_dashboard_welcome_v2_${school?.id || 'default'}_${currentUser.id}_${currentRole}_${todayStr}`;
    try {
      if (window.sessionStorage.getItem(welcomeKey)) return;
      window.sessionStorage.setItem(welcomeKey, '1');
    } catch {
      if (welcomeToastShownRef.current === welcomeKey) return;
      welcomeToastShownRef.current = welcomeKey;
    }

    emitAppToast({
      id: welcomeKey,
      title: `${roleBadgeLabel} · ${formattedTodayDate} · ${academicPeriodGreeting}`,
      message: `${timeGreeting}, ${userDisplayName}\n${dailyBriefText}`,
      tone: 'info',
      durationMs: 9000,
    });
  }, [
    academicPeriodGreeting,
    currentRole,
    currentUser,
    dailyBriefText,
    formattedTodayDate,
    roleBadgeLabel,
    school?.id,
    timeGreeting,
    todayStr,
    userDisplayName,
  ]);

  const teacherAttendanceTab: NavTab | null =
    schoolPermissions?.teacher_attendance !== false && isModuleEnabled('attendance')
      ? 'attendance'
      : isModuleEnabled('mobile_checkin')
        ? 'mobile_checkin'
        : null;
  const teacherLeaveTab: NavTab | null = isModuleEnabled('mobile_checkin')
    ? 'mobile_checkin'
    : isModuleEnabled('attendance')
      ? 'attendance'
      : null;
  const teacherPendingActionTab: NavTab | null = pendingLeaveCount > 0 && teacherLeaveTab
    ? teacherLeaveTab
    : ungradedHomeworkCount > 0 && isModuleEnabled('homework')
      ? 'homework'
      : null;
  const studentCanSelfCheckin = schoolPermissions?.student_self_checkin !== false && isModuleEnabled('mobile_checkin');
  const studentCanViewGrades = schoolPermissions?.student_view_grades !== false && isModuleEnabled('gradebook');
  const parentCanViewGrades = schoolPermissions?.student_view_grades !== false && isModuleEnabled('gradebook');
  const parentCanPayTuition = schoolPermissions?.parent_promptpay_tuition !== false && isModuleEnabled('billing');

  const morningQuickActions: Array<{
    id: string;
    label: string;
    tab: NavTab;
    icon?: React.ComponentType<{ className?: string }>;
    primary?: boolean;
  }> = [];
  if (currentRole === 'admin' || currentRole === 'super_admin') {
    if (isModuleEnabled('timetable')) {
      morningQuickActions.push({
        id: 'tt',
        label: lang === 'th' ? 'ตารางสอนวันนี้' : 'Timetable',
        tab: 'timetable',
        icon: Calendar,
        primary: true,
      });
    }
    if (isModuleEnabled('attendance')) {
      morningQuickActions.push({
        id: 'att',
        label: lang === 'th' ? 'เช็คชื่อโรงเรียน' : 'Attendance',
        tab: 'attendance',
        icon: UserCheck,
        primary: morningQuickActions.length === 0,
      });
    }
  } else if (currentRole === 'teacher') {
    if (isModuleEnabled('timetable')) {
      morningQuickActions.push({
        id: 'tt',
        label: lang === 'th' ? 'ตารางสอนวันนี้' : 'Timetable',
        tab: 'timetable',
        icon: Calendar,
        primary: true,
      });
    }
    if (teacherAttendanceTab) {
      morningQuickActions.push({
        id: 'att',
        label: lang === 'th' ? 'เช็คชื่อประจำวัน/คาบ' : 'Take Attendance',
        tab: teacherAttendanceTab,
        icon: UserCheck,
        primary: morningQuickActions.length === 0,
      });
    }
    if (isModuleEnabled('gradebook')) {
      morningQuickActions.push({
        id: 'gb',
        label: lang === 'th' ? 'บันทึกคะแนน' : 'Record Grades',
        tab: 'gradebook',
        icon: Award,
        primary: morningQuickActions.length === 0,
      });
    }
  } else if (currentRole === 'student') {
    if (studentCanSelfCheckin) {
      morningQuickActions.push({
        id: 'checkin',
        label: lang === 'th' ? 'เช็คชื่อเข้าเรียน' : 'Check-in Now',
        tab: 'mobile_checkin',
        icon: UserCheck,
        primary: true,
      });
    }
    if (isModuleEnabled('timetable')) {
      morningQuickActions.push({
        id: 'tt',
        label: lang === 'th' ? 'ตารางเรียนวันนี้' : 'My Timetable',
        tab: 'timetable',
        icon: Calendar,
        primary: !studentCanSelfCheckin,
      });
    }
    if (studentCanViewGrades && morningQuickActions.length < 2) {
      morningQuickActions.push({
        id: 'gb',
        label: lang === 'th' ? 'ผลการเรียน' : 'My Grades',
        tab: 'gradebook',
        icon: Award,
      });
    }
  } else if (currentRole === 'parent') {
    if (parentCanViewGrades) {
      morningQuickActions.push({
        id: 'gb',
        label: lang === 'th' ? 'ผลการเรียนบุตรหลาน' : 'Child Grades',
        tab: 'gradebook',
        icon: Award,
        primary: true,
      });
    } else if (isModuleEnabled('timetable')) {
      morningQuickActions.push({
        id: 'gb',
        label: lang === 'th' ? 'ตารางเรียนบุตรหลาน' : 'Class Schedule',
        tab: 'timetable',
        icon: Calendar,
        primary: true,
      });
    }
    if (parentCanPayTuition) {
      morningQuickActions.push({
        id: 'bill',
        label: lang === 'th' ? 'ค่าเล่าเรียน & ใบเสร็จ' : 'Tuition & Receipts',
        tab: 'billing',
        icon: Receipt,
      });
    } else if (isModuleEnabled('announcements')) {
      morningQuickActions.push({
        id: 'ann',
        label: lang === 'th' ? 'ประกาศโรงเรียน' : 'Announcements',
        tab: 'announcements',
        icon: BellRing,
      });
    }
  }

  return (
    <div className={`dashboard-print-area flex flex-col min-w-0 max-w-full dash-shell rounded-2xl ${getModuleTone('dashboard')}`}>
      {/* Print-Only Administrative Report Header */}
      <div className="hidden print:flex items-center justify-between gap-4 pb-3 mb-2 border-b-2 border-slate-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#0f172a] truncate">
              {lang === 'th' ? systemConfig.schoolNameTh : systemConfig.schoolNameEn}
            </h1>
            <p className="text-xs text-[#475569] font-medium">
              {lang === 'th'
                ? `รายงานสรุปผู้บริหารและสถิติประจำวัน · ปีการศึกษา ${systemConfig.academicYear} (${formatSemesterLabel(systemConfig.currentSemester)})`
                : `Administrative Dashboard Report · AY ${systemConfig.academicYear} (${systemConfig.currentSemester})`}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-[#475569] shrink-0 tabular-nums space-y-0.5">
          <div className="font-bold text-[#0f172a]">
            {lang === 'th' ? `ข้อมูลวันที่: ${selectedDate}` : `Report Date: ${selectedDate}`}
          </div>
          <div>
            {lang === 'th' ? `พิมพ์เมื่อ: ${printedAtLabel}` : `Printed: ${printedAtLabel}`}
          </div>
          {currentUser && (
            <div>
              {lang === 'th' ? `ผู้จัดทำ: ${currentUser.fullNameTh || currentUser.email}` : `Prepared by: ${currentUser.fullNameEn || currentUser.email}`}
            </div>
          )}
        </div>
      </div>

      {/* Clean Editorial Header: View Title + Context + Unified Sub-Lenses + Direct Print/Focus Actions */}
      <div className="no-print shrink-0 pb-3.5 border-b border-[var(--color-border)] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-title)] truncate">
            {currentRole === 'teacher'
              ? (lang === 'th' ? 'โต๊ะทำงานครูวันนี้' : "Teacher's Desk")
              : (currentRole === 'admin' || currentRole === 'super_admin')
                ? (lang === 'th' ? 'ภาพรวมโรงเรียน' : 'School Overview')
                : currentRole === 'parent'
                  ? (lang === 'th' ? 'ภาพรวมบุตรหลาน' : 'Parent Overview')
                  : currentRole === 'student'
                    ? (lang === 'th' ? 'ภาพรวมการเรียนของฉัน' : 'My Learning Overview')
                    : (lang === 'th' ? systemConfig.schoolNameTh : systemConfig.schoolNameEn)}
          </h1>
          {isStaffUser && (
            <span className="text-xs text-[var(--color-text-muted)] truncate tabular-nums">
              {lang === 'th' ? systemConfig.schoolNameTh : systemConfig.schoolNameEn} · {selectedDate}
            </span>
          )}
          {dashboardTab !== 'overview' && dashboardTab !== 'realtime_daily' && dashboardTab !== 'insights' && dashboardTab !== 'executive_monitor' && dashboardTab !== 'obec_learning_areas' && dashboardTab !== 'pp6_quality_overview' && dashboardTab !== 'early_warning' && (
            <button
              type="button"
              onClick={() => setDashboardTab('overview')}
              className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
            >
              ← {(currentRole === 'admin' || currentRole === 'super_admin')
                ? (lang === 'th' ? 'กลับหน้าหลัก' : 'Back to Hub')
                : (lang === 'th' ? 'กลับภาพรวมวันนี้' : 'Back to Today')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto min-w-0 justify-between xl:justify-end">
          <div data-guide-id="dashboard-subtabs" className="seg-tab-group overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              data-active={dashboardTab === 'overview'}
              onClick={() => setDashboardTab('overview')}
              className="seg-tab-btn"
            >
              {(currentRole === 'admin' || currentRole === 'super_admin')
                ? (lang === 'th' ? 'ภาพรวม' : 'Overview')
                : (lang === 'th' ? 'วันนี้' : 'Today')}
            </button>

            {isStaffUser && (
              <button
                type="button"
                data-active={dashboardTab === 'realtime_daily'}
                onClick={() => setDashboardTab('realtime_daily')}
                className="seg-tab-btn"
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'เรียลไทม์วันนี้' : 'Live Daily'}</span>
              </button>
            )}

            <button
              type="button"
              data-guide-id={dashboardTab !== 'insights' ? 'dashboard-charts' : undefined}
              data-active={dashboardTab === 'insights'}
              onClick={() => setDashboardTab('insights')}
              className="seg-tab-btn whitespace-nowrap shrink-0"
            >
              {currentRole === 'student'
                ? (lang === 'th' ? 'พัฒนาการของฉัน' : 'My Progress')
                : (lang === 'th' ? 'สถิติและแนวโน้ม' : 'Insights')}
            </button>

            {canViewExecutiveMonitor && (
              <button
                type="button"
                data-active={
                  dashboardTab === 'executive_monitor' ||
                  dashboardTab === 'obec_learning_areas' ||
                  dashboardTab === 'pp6_quality_overview'
                }
                onClick={() => {
                  if (
                    dashboardTab !== 'executive_monitor' &&
                    dashboardTab !== 'obec_learning_areas' &&
                    dashboardTab !== 'pp6_quality_overview'
                  ) {
                    setDashboardTab(lastExecReportTab);
                  }
                }}
                className="seg-tab-btn whitespace-nowrap shrink-0"
              >
                {lang === 'th' ? 'รายงานผู้บริหาร' : 'Executive Reports'}
              </button>
            )}

            {canViewEarlyWarning && (
              <button
                type="button"
                data-active={dashboardTab === 'early_warning'}
                onClick={() => setDashboardTab('early_warning')}
                className="seg-tab-btn whitespace-nowrap shrink-0"
              >
                {lang === 'th' ? 'ติดตามกลุ่มเสี่ยง' : 'At-Risk Students'}
              </button>
            )}

            {!isStaffUser && isModuleEnabled('announcements') && (
              <button
                type="button"
                data-active={dashboardTab === 'announcements'}
                onClick={() => setDashboardTab('announcements')}
                className="seg-tab-btn whitespace-nowrap shrink-0"
              >
                {lang === 'th' ? 'ประกาศ' : 'Announcements'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canViewExecutiveMonitor && (() => {
              const isExecReportTab =
                dashboardTab === 'executive_monitor' ||
                dashboardTab === 'obec_learning_areas' ||
                dashboardTab === 'pp6_quality_overview';
              return (
                <select
                  aria-label={lang === 'th' ? 'เลือกประเภทรายงานผู้บริหาร' : 'Select executive report type'}
                  value={isExecReportTab ? dashboardTab : ''}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (
                      next === 'executive_monitor' ||
                      next === 'obec_learning_areas' ||
                      next === 'pp6_quality_overview'
                    ) {
                      setDashboardTab(next);
                    }
                  }}
                  className={`h-9 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer focus:outline-hidden transition ${
                    isExecReportTab
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                      : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {!isExecReportTab && (
                    <option value="" disabled>
                      {lang === 'th' ? 'เลือกรายงานผู้บริหาร...' : 'Executive Reports...'}
                    </option>
                  )}
                  <option value="executive_monitor">
                    {lang === 'th' ? 'รายงาน: จอมอนิเตอร์ (MIS)' : 'Report: Executive MIS'}
                  </option>
                  <option value="obec_learning_areas">
                    {lang === 'th' ? 'รายงาน: 8 กลุ่มสาระฯ สพฐ.' : 'Report: OBEC 8 Areas'}
                  </option>
                  <option value="pp6_quality_overview">
                    {lang === 'th' ? 'รายงาน: คุณภาพ ปพ.6' : 'Report: OBEC Pp.6'}
                  </option>
                </select>
              );
            })()}
            {isStaffUser && (
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-icon-tool h-9 w-9 cursor-pointer"
                title={lang === 'th' ? 'พิมพ์รายงาน PDF' : 'Print PDF Report'}
                aria-label={lang === 'th' ? 'พิมพ์รายงาน PDF' : 'Print PDF Report'}
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              data-guide-id="dashboard-focus-toggle"
              aria-pressed={isFocusMode}
              onClick={handleToggleFocus}
              title={
                isFocusMode
                  ? (lang === 'th' ? 'ออกจากโหมดโฟกัส (Ctrl+Shift+F)' : 'Exit Focus Mode (Ctrl+Shift+F)')
                  : (lang === 'th' ? 'เปิดโหมดการทำงานแบบโฟกัส (Ctrl+Shift+F)' : 'Focus Mode (Ctrl+Shift+F)')
              }
              aria-label={
                isFocusMode
                  ? (lang === 'th' ? 'ออกจากโหมดโฟกัส' : 'Exit Focus Mode')
                  : (lang === 'th' ? 'โหมดโฟกัส' : 'Focus Mode')
              }
              className={
                isFocusMode
                  ? 'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] type-label transition cursor-pointer whitespace-nowrap shrink-0'
                  : 'btn-icon-tool h-9 w-9 cursor-pointer'
              }
            >
              <Focus className={isFocusMode ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4'} />
              {isFocusMode && <span>{lang === 'th' ? 'ออกจากโฟกัส' : 'Exit Focus'}</span>}
            </button>
          </div>
        </div>
      </div>

      {exportFeedback && (
        <div
          role="status"
          className={`no-print px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            exportFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
          }`}
        >
          <span className="flex items-center gap-2 font-semibold">
            {exportFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{exportFeedback.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tab Panels Container */}
      <div className="dashboard-print-scroll flex-1 dash-scroll-stack pb-12">
        {/* TAB 1: DAILY OVERVIEW (Dedicated 60-30-10 Card Progress Dashboard for Students; Morning Brief for Staff/Parents) */}
        {dashboardTab === 'overview' && (
          currentRole === 'student' ? (
            <StudentDesktopDashboard
              currentUser={currentUser}
              student={primaryScopedStudent}
              school={school}
              systemConfig={systemConfig}
              lang={lang}
              timeGreeting={timeGreeting}
              userDisplayName={userDisplayName}
              formattedTodayDate={formattedTodayDate}
              todayStr={todayStr}
              todayHoliday={todayHoliday}
              upcomingHoliday={upcomingHoliday}
              isTodayWeekend={isTodayWeekend}
              scopedAttendance={scopedAttendance}
              scopedCourses={scopedCourses}
              scopedGrades={scopedGrades}
              scopedAssignments={scopedAssignments}
              scopedLessons={scopedLessons}
              scopedHomework={scopedHomework}
              todayScheduledSlots={todayScheduledSlots}
              schoolPeriods={schoolPeriods}
              scopedAnnouncements={scopedAnnouncements}
              studentCanSelfCheckin={studentCanSelfCheckin}
              studentCanViewGrades={studentCanViewGrades}
              studentCanUploadPortfolio={schoolPermissions?.student_upload_portfolio !== false && isModuleEnabled('portfolio')}
              canOpenCareerQuest={isModuleEnabled('career_quest')}
              canViewTimetable={isModuleEnabled('timetable')}
              canAccessHomework={schoolPermissions?.student_submit_homework !== false && isModuleEnabled('homework')}
              canAccessLessons={isProgramModeEnabledByFeatureFlags('lms_classroom', featureFlags)}
              canViewDigitalId={isModuleEnabled('student_id_cards')}
              onNavigate={onNavigate}
              onOpenLesson={(courseId, lessonId) => onOpenLmsLesson?.(courseId, lessonId)}
              onOpenAnnouncementsTab={() => setDashboardTab('announcements')}
              onOpenPhotoRecord={openPhotoRecord}
            />
          ) : (currentRole === 'admin' || currentRole === 'super_admin') ? (
            <AdminDashboardWorkspace
              lang={lang}
              systemConfig={systemConfig}
              school={school}
              currentUser={currentUser}
              todayStr={todayStr}
              yesterdayStr={yesterdayStr}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              todayHoliday={todayHoliday}
              isTodayWeekend={isTodayWeekend}
              totalStudents={totalStudents}
              activeStudents={activeStudents}
              teachersCount={teachers.length}
              coursesCount={courses.length}
              gradesCount={grades.length}
              todayScheduledSlots={todayScheduledSlots}
              teacherLeavesTodayCount={teacherLeavesTodayCount}
              totalForDate={totalForDate}
              presentCount={presentCount}
              lateCount={lateCount}
              onTimePercent={onTimePercent}
              uncheckedTodayCount={uncheckedTodayCount}
              uncheckedPeriodsTodayCount={uncheckedPeriodsTodayCount}
              selfieCount={selfieCount}
              pendingLeaveCount={pendingLeaveCount}
              ungradedHomeworkCount={ungradedHomeworkCount}
              pendingSlipCount={pendingSlipCount}
              pendingInvoicesCount={pendingInvoices.length}
              collectionRate={collectionRate}
              lineConnectedCount={lineConnectedCount}
              linePercent={linePercent}
              sdqCount={sdqAssessments.length}
              behaviorCount={behaviorRecords.length}
              infirmaryCount={infirmaryVisits.length}
              announcementsCount={scopedAnnouncements.length}
              unclaimedCentralPacksCount={unclaimedCentralPacksCount}
              completedOnboardingCount={completedOnboardingCount}
              showOnboardingCard={showOnboardingCard}
              canViewFinancials={canViewFinancials}
              canViewExecutiveMonitor={canViewExecutiveMonitor}
              canViewEarlyWarning={canViewEarlyWarning}
              isModuleEnabled={isModuleEnabled}
              canSwitchAdminTeacherMode={canSwitchAdminTeacherMode}
              onSwitchOperationalRole={onSwitchOperationalRole}
              campusGates={campusGates}
              schoolPermissions={schoolPermissions}
              featureFlags={featureFlags}
              adminTeachersCount={adminTeachersCount}
              onOpenSystemSettingsTab={onOpenSystemSettingsTab}
              displayRecords={displayRecords}
              fallbackAvatarSvg={fallbackAvatarSvg}
              onNavigate={onNavigate}
              onSelectSubTab={setDashboardTab}
              onOpenPhotoRecord={openPhotoRecord}
              onOpenDrawer={setDrawerMode}
              onExportCsv={handleExportSelectedDateCsv}
              onOpenCentralExamPopup={onOpenCentralExamPopup}
              simplifiedView={adminSimplifiedView}
              onToggleSimplifiedView={onToggleAdminSimplifiedView}
            />
          ) : (
          <div className="dash-scroll-stack animate-in fade-in duration-150">
            {morningQuickActions.length > 0 && (
              <nav aria-label={lang === 'th' ? 'ทางลัดประจำวัน' : 'Daily shortcuts'} className="no-print flex flex-wrap items-center justify-end gap-2">
                {morningQuickActions.slice(0, 2).map((act) => {
                  const ActionIcon = act.icon;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => onNavigate(act.tab)}
                      className={act.primary ? 'btn-action-primary px-3.5 py-2' : 'btn-tool-neutral px-3.5 py-2'}
                    >
                      {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* STRICTLY 3 ROLE-ADAPTED LARGE KPI CELLS */}
            <section
              data-guide-id="dashboard-kpis"
              aria-label={lang === 'th' ? 'สรุปตัวชี้วัดสำคัญประจำวัน' : 'Daily Executive KPIs'}
              className="saas-kpi-strip print-avoid-break"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
                {currentRole === 'teacher' ? (
                  <>
                    {/* Teacher KPI 1: My Classes Today */}
                    <button
                      type="button"
                      onClick={() => onNavigate('timetable')}
                      className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-meta">{lang === 'th' ? 'คาบสอนวันนี้ของฉัน' : 'My Classes Today'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="type-kpi tabular-nums">{todayScheduledSlots.length}</span>
                        <span className="type-meta truncate">
                          {teacherNextSlot
                            ? `${lang === 'th' ? 'คาบ' : 'P'}${teacherNextSlot.periodNumber} · ${teacherNextSlot.courseCode || teacherNextSlot.courseTitleTh}`
                            : (lang === 'th' ? 'ไม่มีคาบสอนวันนี้' : 'No periods today')}
                        </span>
                      </div>
                    </button>

                    {/* Teacher KPI 2: Today Attendance */}
                    <button
                      type="button"
                      onClick={() => teacherAttendanceTab && onNavigate(teacherAttendanceTab)}
                      disabled={!teacherAttendanceTab}
                      className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-meta">{lang === 'th' ? 'มาตรงเวลาวันนี้' : 'On-Time Today'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="type-kpi tabular-nums">{onTimePercent}%</span>
                        <span className="type-meta tabular-nums">
                          {presentCount}/{totalForDate} {lang === 'th' ? 'คน' : 'checked'}
                        </span>
                      </div>
                    </button>

                    {/* Teacher KPI 3: Homework & Leaves */}
                    <button
                      type="button"
                      onClick={() => teacherPendingActionTab && onNavigate(teacherPendingActionTab)}
                      disabled={!teacherPendingActionTab}
                      className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-meta">{lang === 'th' ? 'งานรอตรวจ & ใบลา' : 'Pending Review'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className={`type-kpi tabular-nums ${(pendingLeaveCount + ungradedHomeworkCount) > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                          {pendingLeaveCount + ungradedHomeworkCount}
                        </span>
                        <span className="type-meta tabular-nums">
                          {lang === 'th'
                            ? `การบ้าน ${ungradedHomeworkCount} · ใบลา ${pendingLeaveCount}`
                            : `${ungradedHomeworkCount} hw · ${pendingLeaveCount} leaves`}
                        </span>
                      </div>
                    </button>
                  </>
                ) : currentRole === 'parent' ? (
                  <>
                    {/* Parent KPI 1: Child Attendance */}
                    <button
                      type="button"
                      onClick={() => setDashboardTab('live_attendance')}
                      className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-meta">{lang === 'th' ? 'การมาเรียนบุตรหลาน' : 'Child Attendance'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="type-kpi tabular-nums">{scopedAttendanceRate}%</span>
                        <span className="type-meta truncate">
                          {primaryScopedStudent
                            ? `${primaryScopedStudent.firstNameTh} · ${totalForDate > 0 ? `${presentCount}/${totalForDate}` : `${scopedAttendance.length} ${lang === 'th' ? 'ครั้ง' : 'logs'}`}`
                            : (lang === 'th' ? 'ดูเวลาเข้า-ออก' : 'View arrival logs')}
                        </span>
                      </div>
                    </button>

                    {/* Parent KPI 2: Child Grades (gated) or Timetable */}
                    {parentCanViewGrades ? (
                      <button
                        type="button"
                        onClick={() => onNavigate('gradebook')}
                        className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-meta">{lang === 'th' ? 'ผลการเรียนเฉลี่ย' : 'Academic Standing'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                        </div>
                        <div className="flex items-baseline gap-2.5">
                          <span className="type-kpi tabular-nums">
                            {ownAcademicSummary?.hideGpaCalculations
                              ? (ownAcademicSummary.averageRawScore !== null ? `${ownAcademicSummary.averageRawScore}%` : '—')
                              : (ownAcademicSummary?.hasRecordedGrades && ownAcademicSummary.gpax !== null ? ownAcademicSummary.gpax.toFixed(2) : '—')}
                          </span>
                          <span className="type-meta">{lang === 'th' ? 'สมุดพกและรายวิชา' : 'View gradebook'}</span>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate('timetable')}
                        className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-meta">{lang === 'th' ? 'ตารางเรียนวันนี้' : 'Today’s Schedule'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                        </div>
                        <div className="flex items-baseline gap-2.5">
                          <span className="type-kpi tabular-nums">{todayScheduledSlots.length}</span>
                          <span className="type-meta">{lang === 'th' ? 'คาบเรียน' : 'periods'}</span>
                        </div>
                      </button>
                    )}

                    {/* Parent KPI 3: Tuition (gated) or Announcements */}
                    {parentCanPayTuition ? (
                      <button
                        type="button"
                        onClick={() => onNavigate('billing')}
                        className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-meta">{lang === 'th' ? 'ค่าเล่าเรียนรอดำเนินการ' : 'Tuition Invoices'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                        </div>
                        <div className="flex items-baseline gap-2.5">
                          <span className={`type-kpi tabular-nums ${pendingInvoices.length > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                            {pendingInvoices.length}
                          </span>
                          <span className="type-meta">
                            {pendingInvoices.length > 0
                              ? (lang === 'th' ? 'รายการรอชำระ / ตรวจสอบ' : 'pending payment')
                              : (lang === 'th' ? 'ชำระครบถ้วนแล้ว' : 'All settled')}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDashboardTab('announcements')}
                        className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-meta">{lang === 'th' ? 'ประกาศจากโรงเรียน' : 'Announcements'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                        </div>
                        <div className="flex items-baseline gap-2.5">
                          <span className="type-kpi tabular-nums">{scopedAnnouncements.length}</span>
                          <span className="type-meta">{lang === 'th' ? 'ข่าวสารล่าสุด' : 'school updates'}</span>
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Admin KPI 1: On-Time Rate */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isModuleEnabled('attendance')) onNavigate('attendance');
                      }}
                      className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-meta">
                          {lang === 'th' ? 'มาตรงเวลาวันนี้' : 'On-Time Today'}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="type-kpi tabular-nums">{onTimePercent}%</span>
                        <span className="type-meta tabular-nums">
                          {presentCount}/{totalForDate} {lang === 'th' ? 'คน' : 'checked'}
                        </span>
                      </div>
                    </button>

                    {/* Admin KPI 2: Actionable Pending Items */}
                    <button
                      type="button"
                      onClick={() => {
                        const target = pendingLeaveCount > 0 ? 'attendance' : 'homework';
                        if (isModuleEnabled(target)) onNavigate(target);
                        else if (isModuleEnabled('gradebook')) onNavigate('gradebook');
                      }}
                      className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-meta">
                          {lang === 'th' ? 'รอดำเนินการ' : 'Pending Actions'}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className={`type-kpi tabular-nums ${(pendingLeaveCount + ungradedHomeworkCount) > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                          {pendingLeaveCount + ungradedHomeworkCount}
                        </span>
                        <span className="type-meta tabular-nums">
                          {lang === 'th'
                            ? `ใบลา ${pendingLeaveCount} · การบ้าน ${ungradedHomeworkCount}`
                            : `${pendingLeaveCount} leaves · ${ungradedHomeworkCount} hw`}
                        </span>
                      </div>
                    </button>

                    {/* Admin KPI 3: Guardian LINE Coverage */}
                    <button
                      type="button"
                      onClick={() => setDrawerMode('guardian_line')}
                      className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-meta">
                          {isLineEnabled
                            ? (lang === 'th' ? 'LINE ผู้ปกครอง' : 'Guardian LINE')
                            : (lang === 'th' ? 'การแจ้งเตือนผู้ปกครอง' : 'Parent Alerts')}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="type-kpi tabular-nums">
                          {isLineEnabled ? `${linePercent}%` : (lang === 'th' ? 'ในแอป' : 'In-App')}
                        </span>
                        <span className="type-meta tabular-nums">
                          {isLineEnabled
                            ? `${lineConnectedCount}/${totalStudents} ${lang === 'th' ? 'ครอบครัว' : 'families'}`
                            : (lang === 'th' ? 'ปิด LINE OA ชั่วคราว' : 'LINE OA off')}
                        </span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* MAIN 2-PANE ACTION WORKSPACE */}
            {currentRole === 'teacher' ? (
              <div className="dashboard-print-grid relative dash-grid grid-cols-1 lg:grid-cols-2 items-start">
                {/* LEFT PANE: Teacher Today's Teaching Schedule */}
                <section
                  data-guide-id="dashboard-today-desk"
                  aria-label={lang === 'th' ? 'ตารางสอนวันนี้ของฉัน' : "Today's Teaching Schedule"}
                  className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
                >
                  <div>
                    <div className="saas-card-header">
                      <h2 className="type-section-title truncate">
                        {lang === 'th' ? 'ตารางสอนวันนี้ของฉัน' : "Today's Teaching Schedule"}
                      </h2>
                      <button
                        type="button"
                        onClick={() => onNavigate('timetable')}
                        className="no-print type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                      >
                        {lang === 'th' ? 'ตารางทั้งหมด →' : 'Full timetable →'}
                      </button>
                    </div>

                    <div className="saas-card-body">
                      {todayHoliday || isTodayWeekend || todayScheduledSlots.length === 0 ? (
                        <div className="py-8 text-center space-y-3">
                          <p className="type-meta">
                            {todayHoliday
                              ? (lang === 'th' ? `วันหยุดราชการ: ${todayHoliday.nameTh}` : `Holiday: ${todayHoliday.nameEn}`)
                              : isTodayWeekend
                                ? (lang === 'th' ? 'วันหยุดสุดสัปดาห์ · ไม่มีคาบสอนปกติ' : 'Weekend · No classes scheduled')
                                : (lang === 'th' ? 'วันนี้ยังไม่มีคาบสอนในตารางของคุณ' : 'No classes scheduled today')}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {isModuleEnabled('timetable') && (
                              <button
                                type="button"
                                onClick={() => onNavigate('timetable')}
                                className="btn-tool-neutral px-3.5 py-2"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{lang === 'th' ? 'ดูตารางสอนรายสัปดาห์' : 'Weekly Timetable'}</span>
                              </button>
                            )}
                            {isModuleEnabled('gradebook') && (
                              <button
                                type="button"
                                onClick={() => onNavigate('gradebook')}
                                className="btn-action-primary px-3.5 py-2"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>{lang === 'th' ? 'สมุดคะแนน ปพ.5' : 'Gradebook ปพ.5'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                          {todayScheduledSlots.slice(0, 6).map((slot) => {
                            const periodMeta = schoolPeriods.find((p) => p.periodNumber === slot.periodNumber);
                            const startTime = slot.startTime || periodMeta?.startTime || '';
                            const endTime = slot.endTime || periodMeta?.endTime || '';
                            const timeLabel = startTime && endTime ? `${startTime}–${endTime}` : '';
                            const roomLabel = slot.classRoom || slot.room || '';
                            return (
                              <div
                                key={slot.id}
                                className="print-keep py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex flex-col items-center justify-center shrink-0 tabular-nums">
                                    <span className="text-[10px] font-medium text-[var(--color-text-muted)] leading-none">
                                      {lang === 'th' ? 'คาบ' : 'P'}
                                    </span>
                                    <span className="text-sm font-bold text-[var(--color-text-title)] leading-tight">
                                      {slot.periodNumber}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="type-card-title truncate">
                                      {lang === 'th' ? (slot.courseTitleTh || slot.courseCode) : (slot.courseTitleEn || slot.courseCode)}
                                    </p>
                                    <p className="type-meta truncate tabular-nums">
                                      {[slot.courseCode, roomLabel, timeLabel].filter(Boolean).join(' · ')}
                                    </p>
                                  </div>
                                </div>

                                <div className="no-print flex items-center gap-1.5 shrink-0">
                                  {slot.courseId && isModuleEnabled('gradebook') && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenGradebookCourse ? onOpenGradebookCourse(slot.courseId) : onNavigate('gradebook')}
                                      className="btn-tool-neutral px-2.5 py-1.5 text-[11px]"
                                    >
                                      <Award className="w-3.5 h-3.5" />
                                      <span>{lang === 'th' ? 'บันทึกคะแนน' : 'Record Grades'}</span>
                                    </button>
                                  )}
                                  {teacherAttendanceTab && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigate(teacherAttendanceTab)}
                                      className="btn-tool-tone px-2.5 py-1.5 text-[11px]"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>
                                        {teacherAttendanceTab === 'attendance'
                                          ? (lang === 'th' ? 'เช็คชื่อ' : 'Take Attendance')
                                          : (lang === 'th' ? 'เช็คชื่อมือถือ' : 'Mobile Check-in')}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* RIGHT PANE: Teacher Action Queue + Recent Check-ins (Segmented Switcher) */}
                <section
                  aria-label={lang === 'th' ? 'งานค้างและเช็คชื่อล่าสุด' : 'Tasks & Recent Check-ins'}
                  className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
                >
                  <div>
                    <div className="saas-card-header">
                      <div className="min-w-0">
                        <div className="seg-tab-group">
                          <button
                            type="button"
                            data-active={teacherDeskTab === 'actions'}
                            onClick={() => setTeacherDeskTab('actions')}
                            className="seg-tab-btn text-xs py-1 px-2.5"
                          >
                            {lang === 'th' ? 'งานที่ต้องจัดการ' : 'Action Items'}
                          </button>
                          <button
                            type="button"
                            data-active={teacherDeskTab === 'checkins'}
                            onClick={() => setTeacherDeskTab('checkins')}
                            className="seg-tab-btn text-xs py-1 px-2.5"
                          >
                            {lang === 'th' ? 'เช็คชื่อล่าสุด' : 'Recent Check-ins'}
                          </button>
                        </div>
                      </div>

                      {teacherDeskTab === 'actions' ? (
                        isModuleEnabled('gradebook') && (
                          <button
                            type="button"
                            onClick={() => onNavigate('gradebook')}
                            className="no-print type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                          >
                            {lang === 'th' ? 'บันทึกคะแนน →' : 'Gradebook →'}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDashboardTab('live_attendance')}
                          className="no-print type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                        >
                          {lang === 'th' ? 'ดูทั้งหมด →' : 'View all →'}
                        </button>
                      )}
                    </div>

                    <div className="saas-card-body">
                      {teacherDeskTab === 'actions' ? (
                        (() => {
                          const actionRows: Array<{
                            id: string;
                            label: string;
                            value: string;
                            icon: React.ComponentType<{ className?: string }>;
                            urgent?: boolean;
                            onClick: () => void;
                          }> = [];

                          if (uncheckedTodayCount > 0 && !todayHoliday && !isTodayWeekend && teacherAttendanceTab === 'attendance') {
                            actionRows.push({
                              id: 'unchecked',
                              label: lang === 'th' ? 'นักเรียนยังไม่เช็คชื่อวันนี้' : 'Unchecked Students Today',
                              value: `${uncheckedTodayCount} ${lang === 'th' ? 'คน' : 'students'}`,
                              icon: UserCheck,
                              urgent: true,
                              onClick: () => onNavigate('attendance'),
                            });
                          }
                          if (pendingLeaveCount > 0 && teacherLeaveTab) {
                            actionRows.push({
                              id: 'leaves',
                              label: lang === 'th' ? 'ใบลารอรับทราบ / อนุมัติ' : 'Pending Leaves',
                              value: `${pendingLeaveCount} ${lang === 'th' ? 'รายการ' : 'items'}`,
                              icon: FileCheck2,
                              urgent: true,
                              onClick: () => onNavigate(teacherLeaveTab),
                            });
                          }
                          if (ungradedHomeworkCount > 0 && isModuleEnabled('homework')) {
                            actionRows.push({
                              id: 'homework',
                              label: lang === 'th' ? 'การบ้านรอตรวจให้คะแนน' : 'Homework to Grade',
                              value: `${ungradedHomeworkCount} ${lang === 'th' ? 'ชิ้น' : 'items'}`,
                              icon: FileCheck2,
                              urgent: true,
                              onClick: () => onNavigate('homework'),
                            });
                          }
                          return actionRows.length === 0 ? (
                            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                              {lang === 'th' ? 'ไม่มีรายการค้างดำเนินการในขณะนี้' : 'No pending tasks right now'}
                            </div>
                          ) : (
                            <div className="divide-y divide-[var(--color-border)]">
                              {actionRows.slice(0, 5).map((row) => {
                                const RowIcon = row.icon;
                                return (
                                  <button
                                    key={row.id}
                                    type="button"
                                    onClick={row.onClick}
                                    className="print-keep w-full py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-2 text-left hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 cursor-pointer transition"
                                  >
                                    <span className="type-card-title min-w-0 truncate inline-flex items-center gap-2">
                                      <RowIcon className="w-4 h-4 shrink-0 text-[var(--color-primary-text)]" />
                                      <span className="truncate">{row.label}</span>
                                    </span>
                                    <span className={`type-meta font-semibold tabular-nums shrink-0 inline-flex items-center gap-1.5 ${row.urgent ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                                      {row.value}
                                      <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : (
                        <>
                          <div className="no-print flex items-center justify-end gap-1 mb-2">
                            <div className="saas-control-group type-meta">
                              <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                                  selectedDate === todayStr
                                    ? 'bg-[var(--color-primary)] text-white'
                                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                                }`}
                              >
                                {lang === 'th' ? 'วันนี้' : 'Today'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDate(yesterdayStr)}
                                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                                  selectedDate === yesterdayStr
                                    ? 'bg-[var(--color-primary)] text-white'
                                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                                }`}
                              >
                                {lang === 'th' ? 'เมื่อวาน' : 'Yesterday'}
                              </button>
                            </div>
                          </div>
                          {displayRecords.length === 0 ? (
                            <div className="py-8 text-center space-y-3">
                              <p className="type-meta">
                                {lang === 'th' ? `ยังไม่มีรายการวันที่ ${selectedDate}` : `No check-ins for ${selectedDate}`}
                              </p>
                              <button
                                type="button"
                                onClick={() => onNavigate('mobile_checkin')}
                                className="btn-action-primary px-4 py-2 mx-auto"
                              >
                                <span>{lang === 'th' ? 'เปิดเช็คชื่อมือถือ' : 'Open Check-in'}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="divide-y divide-[var(--color-border)]">
                              {displayRecords.slice(0, 5).map((rec) => (
                                <button
                                  key={rec.id}
                                  type="button"
                                  onClick={() => openPhotoRecord(rec)}
                                  className="print-keep w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 transition"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <AttendancePhoto
                                      src={rec.photoUrl || rec.userAvatar || fallbackAvatarSvg(rec.userName)}
                                      alt={rec.userName || 'User'}
                                      referrerPolicy="no-referrer"
                                      className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                                    />
                                    <span className="type-card-title truncate">{rec.userName}</span>
                                    <span className="type-meta truncate hidden sm:inline tabular-nums">
                                      · {rec.userDepartmentOrRoom || rec.userRole} · {rec.time}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={`type-meta font-semibold ${
                                        rec.status === 'present'
                                          ? 'text-emerald-700 dark:text-emerald-300'
                                          : 'text-amber-700 dark:text-amber-300'
                                      }`}
                                    >
                                      {rec.status === 'present'
                                        ? (lang === 'th' ? 'ตรงเวลา' : 'On-time')
                                        : (lang === 'th' ? 'มาสาย' : 'Late')}
                                    </span>
                                    <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
            <div className="dashboard-print-grid relative dash-grid grid-cols-1 lg:grid-cols-2 items-stretch">
              {/* LEFT PANE: Recent Check-ins (Parent / Fallback) */}
              <section
                aria-label={lang === 'th' ? 'เช็คชื่อล่าสุด' : 'Recent Check-ins'}
                className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
              >
                <div>
                  <div className="saas-card-header">
                    <h2 className="type-section-title truncate">
                      {currentRole === 'parent'
                        ? (lang === 'th' ? 'การมาเรียนของบุตรหลาน' : 'Child Check-in History')
                        : (lang === 'th' ? 'เช็คชื่อล่าสุด' : 'Recent Check-ins')}
                    </h2>

                    <div className="no-print flex items-center gap-3 shrink-0">
                      <div className="saas-control-group type-meta">
                        <button
                          type="button"
                          onClick={() => setSelectedDate(todayStr)}
                          className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                            selectedDate === todayStr
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                          }`}
                        >
                          {lang === 'th' ? 'วันนี้' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDate(yesterdayStr)}
                          className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                            selectedDate === yesterdayStr
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                          }`}
                        >
                          {lang === 'th' ? 'เมื่อวาน' : 'Yesterday'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDashboardTab('live_attendance')}
                        className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        {lang === 'th' ? 'ดูทั้งหมด →' : 'View all →'}
                      </button>
                    </div>
                  </div>

                  <div className="saas-card-body">
                    {displayRecords.length === 0 ? (
                      <div className="py-10 text-center space-y-3">
                        <p className="type-meta">
                          {lang === 'th' ? `ยังไม่มีรายการวันที่ ${selectedDate}` : `No check-ins for ${selectedDate}`}
                        </p>
                        {currentRole === 'parent' ? (
                          <button
                            type="button"
                            onClick={() => onNavigate('timetable')}
                            className="btn-tool-neutral px-4 py-2 mx-auto"
                          >
                            <span>{lang === 'th' ? 'ดูตารางเรียนบุตรหลาน' : 'View Child Timetable'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate('mobile_checkin')}
                            className="btn-action-primary px-4 py-2 mx-auto"
                          >
                            <span>{lang === 'th' ? 'เปิดเช็คชื่อมือถือ' : 'Open Check-in'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--color-border)]">
                        {displayRecords.slice(0, 5).map((rec) => (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => openPhotoRecord(rec)}
                            className="print-keep w-full py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <AttendancePhoto
                                src={rec.photoUrl || rec.userAvatar || fallbackAvatarSvg(rec.userName)}
                                alt={rec.userName || 'User'}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                              />
                              <span className="type-card-title truncate">{rec.userName}</span>
                              <span className="type-meta truncate hidden sm:inline tabular-nums">
                                · {rec.userDepartmentOrRoom || rec.userRole} · {rec.time}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`type-meta font-semibold ${
                                  rec.status === 'present'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {rec.status === 'present'
                                  ? (lang === 'th' ? 'ตรงเวลา' : 'On-time')
                                  : (lang === 'th' ? 'มาสาย' : 'Late')}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* RIGHT PANE: Role-Tailored Actionable Items (Parent) */}
              <section
                data-guide-id="dashboard-today-desk"
                aria-label={lang === 'th' ? 'รายการที่ต้องจัดการ' : 'Action Items'}
                className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
              >
                <div>
                  <div className="saas-card-header">
                    <h2 className="type-section-title truncate">
                      {lang === 'th' ? 'รายการสำคัญสำหรับผู้ปกครอง' : 'Family Action Items'}
                    </h2>
                    {(() => {
                      const headerTarget: { tab: NavTab; label: string } | null =
                        parentCanViewGrades
                          ? { tab: 'gradebook', label: lang === 'th' ? 'ผลการเรียน →' : 'Grades →' }
                          : isModuleEnabled('timetable')
                            ? { tab: 'timetable', label: lang === 'th' ? 'ตารางเรียน →' : 'Timetable →' }
                            : null;

                      if (!headerTarget) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => onNavigate(headerTarget.tab)}
                          className="no-print type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                        >
                          {headerTarget.label}
                        </button>
                      );
                    })()}
                  </div>

                  <div className="saas-card-body">
                    {(() => {
                      const actionRows: Array<{
                        id: string;
                        label: string;
                        value: string;
                        urgent?: boolean;
                        onClick: () => void;
                      }> = [];

                      if (parentCanPayTuition && pendingInvoices.length > 0) {
                        actionRows.push({
                          id: 'parent-invoices',
                          label: lang === 'th' ? 'ค่าเล่าเรียนรอชำระ' : 'Pending Tuition Invoices',
                          value: `${pendingInvoices.length} ${lang === 'th' ? 'รายการ' : 'items'}`,
                          urgent: true,
                          onClick: () => onNavigate('billing'),
                        });
                      }
                      if (pendingLeaveCount > 0) {
                        actionRows.push({
                          id: 'parent-leaves',
                          label: lang === 'th' ? 'คำขอลาที่อยู่ระหว่างพิจารณา' : 'Pending Leave Requests',
                          value: `${pendingLeaveCount} ${lang === 'th' ? 'รายการ' : 'items'}`,
                          onClick: () => setDashboardTab('live_attendance'),
                        });
                      }
                      if (isModuleEnabled('timetable')) {
                        actionRows.push({
                          id: 'parent-timetable',
                          label: lang === 'th' ? 'ตารางเรียนวันนี้ของบุตรหลาน' : 'Child’s Classes Today',
                          value: `${todayScheduledSlots.length} ${lang === 'th' ? 'คาบ' : 'slots'}`,
                          onClick: () => onNavigate('timetable'),
                        });
                      }
                      if (parentCanViewGrades) {
                        actionRows.push({
                          id: 'parent-grades',
                          label: lang === 'th' ? 'ตรวจสอบผลการเรียน' : 'Inspect Grades',
                          value: `${scopedCourses.length} ${lang === 'th' ? 'วิชา' : 'courses'}`,
                          onClick: () => onNavigate('gradebook'),
                        });
                      }
                      if (isModuleEnabled('announcements') && actionRows.length < 5) {
                        actionRows.push({
                          id: 'parent-announcements',
                          label: lang === 'th' ? 'ข่าวสารและประกาศโรงเรียน' : 'School Announcements',
                          value: `${scopedAnnouncements.length} ${lang === 'th' ? 'ประกาศ' : 'posts'}`,
                          onClick: () => setDashboardTab('announcements'),
                        });
                      }

                      return actionRows.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                          {lang === 'th' ? 'ไม่มีรายการที่เปิดใช้งานในแพ็กเกจปัจจุบัน' : 'No active module tasks in current package'}
                        </div>
                      ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                          {actionRows.slice(0, 5).map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={row.onClick}
                              className="print-keep w-full py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 cursor-pointer transition"
                            >
                              <span className="type-card-title truncate">{row.label}</span>
                              <span className={`type-meta font-semibold tabular-nums shrink-0 inline-flex items-center gap-1.5 ${row.urgent ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                                {row.value}
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </section>
            </div>
            )}

            {/* Print-Only Administrative Footer */}
            <div className="hidden print:flex items-center justify-between gap-4 pt-3 mt-4 border-t border-slate-300 text-[11px] text-[#475569]">
              <span>
                {lang === 'th' ? systemConfig.schoolNameTh : systemConfig.schoolNameEn} · {lang === 'th' ? 'ระบบบริหารจัดการสถานศึกษา' : 'School Administration System'}
              </span>
              <span className="tabular-nums">
                {lang === 'th' ? `เอกสารรายงานอัตโนมัติ · ${printedAtLabel}` : `Generated Report · ${printedAtLabel}`}
              </span>
            </div>
          </div>
          )
        )}

        {/* TAB 2 (NEW): ANALYTICS & INSIGHTS (Separated from Daily Action Mode) */}
        {dashboardTab === 'insights' && (
          <div data-guide-id="dashboard-charts" className="dash-scroll-stack animate-in fade-in duration-150">
            <div className="no-print saas-alert-bar">
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span className="type-card-title truncate">
                  {lang === 'th' ? 'วิเคราะห์สถิติการมาเรียน ผลการเรียน และความก้าวหน้า' : 'Attendance Trends, Grade Analytics & Milestones'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canViewExecutiveMonitor && (
                  <button
                    type="button"
                    onClick={() => setDashboardTab('obec_learning_areas')}
                    className="btn-tool-tone px-2.5 py-1 whitespace-nowrap"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ประเมิน 8 กลุ่มสาระฯ สพฐ.' : 'OBEC 8-Area Eval'}</span>
                  </button>
                )}
                {canViewFinancials && (
                  <button
                    type="button"
                    onClick={() => setDrawerMode('guardian_line')}
                    className="btn-tool-neutral px-2.5 py-1 whitespace-nowrap"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>
                      {isLineEnabled
                        ? (lang === 'th' ? `ค่าเทอม & LINE (${linePercent}%)` : `Tuition & LINE (${linePercent}%)`)
                        : (lang === 'th' ? `ค่าเทอม (${collectionRate}%)` : `Tuition (${collectionRate}%)`)}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {!isRestrictedPersonalRole && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <GradeLevelAnalyticsChart
                  students={scopedStudents}
                  attendance={scopedAttendance}
                  courses={scopedCourses}
                  grades={scopedGrades}
                  systemConfig={systemConfig}
                  lang={lang}
                />
                <D3DailyAttendanceLineChart
                  students={scopedStudents}
                  attendance={scopedAttendance}
                  lang={lang}
                  onLoadAttendanceRange={onLoadAttendanceRange}
                />
              </div>
            )}

            <MonthlyAttendanceChart
              attendance={scopedAttendance}
              students={scopedStudents}
              lang={lang}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
              onLoadAttendanceRange={onLoadAttendanceRange}
            />

            {playerScores.length > 0 && (
              <MilestoneAchievementsPanel
                playerScores={playerScores}
                students={scopedStudents}
                attendance={scopedAttendance}
                grades={scopedGrades}
                currentUser={currentUser}
                lang={lang}
                onLogLibraryVisit={(userId) =>
                  onRecordMilestoneActivity?.(userId, 'library_visit')
                }
                onQuickAttendanceForMilestone={(studentId, userId) =>
                  onRecordMilestoneActivity?.(userId, 'attendance', studentId)
                }
              />
            )}
          </div>
        )}

        {/* Executive reports (MIS / OBEC 8 Areas / Pp.6) are switched from the unified top bar */}

        {/* UNIFIED LENS: REAL-TIME DAILY OPERATIONS RADAR (08:00-09:00 Check-ins & Period Readiness) */}
        {dashboardTab === 'realtime_daily' && isStaffUser && (
          <div className="dash-scroll-stack animate-in fade-in duration-150">
            <ExecutiveRealtimeDailyPanel
              school={school}
              systemConfig={systemConfig}
              students={students}
              teachers={teachers}
              courses={courses}
              attendance={attendance}
              periodAttendance={periodAttendance}
              timetableSlots={timetableSlots}
              schoolPeriods={schoolPeriods}
              leaveRequests={leaveRequests}
              infirmaryVisits={infirmaryVisits}
              invoices={canViewFinancials ? invoices : []}
              canViewFinancials={canViewFinancials}
              lang={lang}
              onNavigate={(tab) => {
                if (tab === 'executive_monitor' && canViewExecutiveMonitor) {
                  setDashboardTab('executive_monitor');
                } else if (tab === 'executive_warning' && canViewEarlyWarning) {
                  setDashboardTab('early_warning');
                } else {
                  onNavigate(tab);
                }
              }}
              onOpenPhotoRecord={openPhotoRecord}
            />
            <div className="no-print flex items-center justify-end gap-3 text-xs text-[var(--color-text-muted)]">
              <button
                type="button"
                onClick={() => setDashboardTab('live_attendance')}
                className="font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                {lang === 'th'
                  ? 'เปิดคลังภาพถ่ายเซลฟี่ & แผนที่พิกัดย้อนหลังหลายวัน →'
                  : 'Open Multi-Day Selfie & GPS Audit Archive →'}
              </button>
            </div>
          </div>
        )}

        {/* UNIFIED LENS: EXECUTIVE MONITOR */}
        {dashboardTab === 'executive_monitor' && canViewExecutiveMonitor && school && (
          <div className="animate-in fade-in duration-150">
            <ExecutiveMonitorView
              activeSchool={school}
              systemConfig={systemConfig}
              students={students}
              teachers={teachers}
              courses={courses}
              grades={grades}
              attendance={attendance}
              periodAttendance={periodAttendance}
              timetableSlots={timetableSlots}
              schoolPeriods={schoolPeriods}
              invoices={canViewFinancials ? invoices : []}
              canViewFinancials={canViewFinancials}
              announcements={announcements}
              infirmaryVisits={infirmaryVisits}
              behaviorRecords={behaviorRecords}
              sdqAssessments={sdqAssessments}
              homeworkSubmissions={homeworkSubmissions}
              leaveRequests={leaveRequests}
              lang={lang}
              onOpenGradebookCourse={onOpenGradebookCourse}
              onLoadAttendanceRange={onLoadAttendanceRange}
              onNavigate={(tab) => {
                if (tab === 'realtime_daily' && isStaffUser) {
                  setDashboardTab('realtime_daily');
                } else if (tab === 'executive_warning' && canViewEarlyWarning) {
                  setDashboardTab('early_warning');
                } else {
                  onNavigate(tab);
                }
              }}
            />
          </div>
        )}

        {/* UNIFIED LENS: OBEC 8 LEARNING AREAS EXECUTIVE EVALUATION */}
        {dashboardTab === 'obec_learning_areas' && canViewExecutiveMonitor && (
          <div className="animate-in fade-in duration-150">
            <ObecLearningAreaExecutiveDashboard
              students={students}
              teachers={teachers}
              courses={courses}
              grades={grades}
              attendance={attendance}
              periodAttendance={periodAttendance}
              timetableSlots={timetableSlots}
              systemConfig={systemConfig}
              school={school}
              lang={lang}
              onNavigateToGradebook={(courseId) => {
                if (onOpenGradebookCourse) {
                  onOpenGradebookCourse(courseId);
                } else {
                  onNavigate('gradebook');
                }
              }}
            />
          </div>
        )}

        {/* UNIFIED LENS: EXECUTIVE PP.6 STUDENT QUALITY OVERVIEW */}
        {dashboardTab === 'pp6_quality_overview' && canViewExecutiveMonitor && (
          <div className="animate-in fade-in duration-150">
            <Pp6ExecutiveQualityDashboard
              students={students}
              courses={courses}
              grades={grades}
              attendance={attendance}
              periodAttendance={periodAttendance}
              timetableSlots={timetableSlots}
              systemConfig={systemConfig}
              school={school}
              lang={lang}
              onOpenStudentDevBook={onOpenStudentDevBook}
              onOpenStudentPp6={onOpenStudentPp6}
              onOpenPp5Summary={onOpenPp5Summary}
            />
          </div>
        )}

        {/* UNIFIED LENS: EARLY WARNING ANALYTICS */}
        {dashboardTab === 'early_warning' && canViewEarlyWarning && (
          <div className="animate-in fade-in duration-150">
            <ExecutiveEarlyWarningView
              schoolId={school?.id}
              students={students}
              attendance={attendance}
              grades={grades}
              courses={courses}
              sdqAssessments={sdqAssessments}
              behaviorRecords={behaviorRecords}
              infirmaryVisits={infirmaryVisits}
              homeworkSubmissions={homeworkSubmissions}
              lang={lang}
              currentRole={currentRole}
              currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn}
              gradingSystem={systemConfig.gradingSystem}
              onNavigateToTab={(tab) => onNavigate(tab as NavTab)}
            />
          </div>
        )}

        {/* TAB 2: LIVE ATTENDANCE & GPS CAMERA AUDIT */}
        {dashboardTab === 'live_attendance' && (
          <div className="dash-scroll-stack animate-in fade-in duration-150">
            <div className="saas-card overflow-hidden">
              {/* Unified Header + Action & Date Filter Toolbar */}
              <div className="saas-card-header bg-[var(--color-card-subtle)]">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="seg-tab-group">
                    <button type="button" data-active={attendanceStep === 'summary'} onClick={() => setAttendanceStep('summary')} className="seg-tab-btn inline-flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'th' ? 'สรุป' : 'Summary'}</span>
                    </button>
                    <button type="button" data-active={attendanceStep === 'analytics'} onClick={() => setAttendanceStep('analytics')} className="seg-tab-btn inline-flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'th' ? 'กราฟ' : 'Charts'}</span>
                    </button>
                    <button type="button" data-active={attendanceStep === 'records'} onClick={() => setAttendanceStep('records')} className="seg-tab-btn inline-flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'th' ? 'ภาพถ่าย' : 'Photos'}</span>
                      <span className="font-mono text-[11px] opacity-80">({displayRecords.length})</span>
                    </button>
                    <button type="button" data-active={attendanceStep === 'live_feed'} onClick={() => setAttendanceStep('live_feed')} className="seg-tab-btn inline-flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'th' ? 'รายการสด' : 'Feed'}</span>
                    </button>
                  </div>

                  <div className="saas-control-group type-meta">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                        selectedDate === todayStr
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                      }`}
                    >
                      {lang === 'th' ? 'วันนี้' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(yesterdayStr)}
                      className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                        selectedDate === yesterdayStr
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                      }`}
                    >
                      {lang === 'th' ? 'เมื่อวาน' : 'Yesterday'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(twoDaysAgoStr)}
                      className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                        selectedDate === twoDaysAgoStr
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                      }`}
                    >
                      {lang === 'th' ? '2 วันก่อน' : '2d Ago'}
                    </button>
                    <input
                      type="date"
                      aria-label={lang === 'th' ? 'เลือกวันที่' : 'Select date'}
                      value={selectedDate}
                      onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                      className="px-2 py-1 type-meta rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] max-w-full min-w-0 focus:outline-hidden"
                    />
                    {!isRestrictedPersonalRole && (
                      <select
                        aria-label={lang === 'th' ? 'กรองตามบทบาท' : 'Filter by role'}
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value as 'all' | 'student' | 'teacher')}
                        className="px-2 py-1 type-meta rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] max-w-full min-w-0 focus:outline-hidden"
                      >
                        <option value="all">{lang === 'th' ? 'ทุกบทบาท' : 'All Roles'}</option>
                        <option value="student">{lang === 'th' ? 'นักเรียน' : 'Students'}</option>
                        <option value="teacher">{lang === 'th' ? 'ครู' : 'Teachers'}</option>
                      </select>
                    )}
                    <select
                      aria-label={lang === 'th' ? 'กรองตามประเภท' : 'Filter by check type'}
                      value={selectedTypeFilter}
                      onChange={(e) => setSelectedTypeFilter(e.target.value as 'all' | 'check_in' | 'check_out')}
                      className="px-2 py-1 type-meta rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] max-w-full min-w-0 focus:outline-hidden"
                    >
                      <option value="all">{lang === 'th' ? 'เข้า & ออก' : 'All'}</option>
                      <option value="check_in">{lang === 'th' ? 'เข้าเรียน' : 'Check-in'}</option>
                      <option value="check_out">{lang === 'th' ? 'ออกโรงเรียน' : 'Check-out'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isRestrictedPersonalRole && (
                    <button
                      type="button"
                      onClick={handleExportSelectedDateCsv}
                      className="btn-icon-tool"
                      title={lang === 'th' ? `ส่งออก CSV วันที่ ${selectedDate}` : `Export CSV for ${selectedDate}`}
                      aria-label={lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'}
                    >
                      <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                    </button>
                  )}
                  {(isStaffUser || studentCanSelfCheckin) && (
                    <button
                      type="button"
                      onClick={() => onNavigate('mobile_checkin')}
                      className="btn-action-primary px-3 py-1.5"
                      title={lang === 'th' ? 'เปิดหน้ากล้องเช็คชื่อมือถือและสแกน NFC' : 'Open Mobile Camera & NFC Check-in'}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'เช็คชื่อมือถือ' : 'Check-in'}</span>
                    </button>
                  )}
                </div>
              </div>

        {(attendanceStep === 'summary' || attendanceStep === 'analytics') && <>
        {/* Detailed Visual Analytics & Graphs Section */}
        <div className="saas-card-body space-y-5">
          {/* Summary Metric Counters (Single-elevation hairline divided grid) */}
          {attendanceStep === 'summary' && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
            <div className="p-3 text-center">
              <p className="type-meta flex items-center justify-center gap-1">
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'บันทึกทั้งหมด' : 'Total Logs'}</span>
              </p>
              <p className="type-kpi-sm mt-1 tabular-nums">{totalForDate}</p>
              <p className="type-meta mt-0.5 tabular-nums">
                {!isRestrictedPersonalRole
                  ? (lang === 'th' ? `นร. ${studentCheckIns} · ครู ${teacherCheckIns}` : `S: ${studentCheckIns} · T: ${teacherCheckIns}`)
                  : (lang === 'th' ? 'รายการวันนี้' : 'records')}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เข้าเรียน (ตรงเวลา)' : 'Check-ins'}</span>
              </p>
              <p className="type-kpi-sm text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">{checkInsCount}</p>
              <p className="type-meta text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">{lang === 'th' ? `ตรงเวลา ${presentCount} คน` : `On-time: ${presentCount}`}</p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'มาสาย / ออกแล้ว' : 'Late / Out'}</span>
              </p>
              <p className="type-kpi-sm text-amber-700 dark:text-amber-300 mt-1 tabular-nums">{lateCount}</p>
              <p className="type-meta text-[var(--color-text-muted)] mt-0.5 tabular-nums">{lang === 'th' ? `สาย ${latePercent}% · ออก ${checkOutsCount}` : `${latePercent}% late · ${checkOutsCount} out`}</p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ภาพถ่ายเซลฟี่' : 'Selfie Verified'}</span>
              </p>
              <p className="type-kpi-sm text-blue-700 dark:text-blue-300 mt-1 tabular-nums">{selfieCount}</p>
              <p className="type-meta text-blue-700 dark:text-blue-400 mt-0.5">{lang === 'th' ? 'ยืนยันตัวตนแล้ว' : 'Verified'}</p>
            </div>
          </div>
          )}

          {/* Interactive Graph 1: Hourly Arrival & Departure Curve */}
          {attendanceStep === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Hourly Distribution Bar Chart */}
              <div className="lg:col-span-2 saas-card saas-card-body space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="type-card-title flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                      <span>{lang === 'th' ? 'การเข้า-ออกโรงเรียนรายช่วงเวลา' : 'Traffic Distribution by Time Window'}</span>
                    </h3>
                    <p className="type-meta">
                      {lang === 'th'
                        ? `ความหนาแน่นหน้าประตู · ${selectedDate}`
                        : `Hourly gate traffic · ${selectedDate}`}
                    </p>
                  </div>
                  <span className="type-label">
                    {lang === 'th' ? `รวม ${totalForDate} รายการ` : `Total ${totalForDate}`}
                  </span>
                </div>

                {/* Bar visualization */}
                <div className="space-y-2.5 pt-1">
                  {hourlyBuckets.map((bucket, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--color-text-body)] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-text-muted)] inline-block" />
                          <span>{bucket.label}</span>
                        </span>
                        <span className="font-mono font-bold text-[var(--color-text-title)]">
                          {bucket.count} {lang === 'th' ? 'คน' : 'people'} ({bucket.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bucket.color} transition-all duration-500`}
                          style={{ width: `${bucket.barPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Analytics Card: Roles & Quality Index */}
              <div className="saas-card saas-card-body space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="type-card-title flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>{lang === 'th' ? 'ความตรงเวลา & GPS' : 'Punctuality & GPS'}</span>
                  </h3>
                  <p className="type-meta mt-0.5">
                    {lang === 'th' ? 'ตรวจสอบระยะห่างจากสถานศึกษา' : 'Geofence proximity verification'}
                  </p>
                </div>

                {/* Quality Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between type-label">
                    <span>{lang === 'th' ? 'ตรงเวลา' : 'On-Time Rate'}</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300">{onTimePercent}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-600 transition-all"
                      style={{ width: `${onTimePercent}%` }}
                      title={`ตรงเวลา ${presentCount} คน`}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${latePercent}%` }}
                      title={`มาสาย ${lateCount} คน`}
                    />
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                      <span>{lang === 'th' ? `ตรงเวลา ${presentCount}` : `On-time ${presentCount}`}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      <span>{lang === 'th' ? `มาสาย ${lateCount}` : `Late ${lateCount}`}</span>
                    </span>
                  </div>
                </div>

                {/* Geofence verification summary (hairline divider, no nested card) */}
                <div className="pt-3 border-t border-[var(--color-border)] space-y-1">
                  <div className="flex items-center gap-1.5 type-label text-sky-800 dark:text-sky-300">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{lang === 'th' ? 'รั้วเสมือน GPS Geofence (300 ม.)' : 'GPS Geofence (300m)'}</span>
                  </div>
                  <p className="type-meta leading-relaxed">
                    {lang === 'th'
                      ? 'บันทึกภาพถ่ายเซลฟี่ พร้อมพิกัดและเวลาที่ตรวจสอบย้อนหลังได้'
                      : 'Selfies verified with timestamp and proximity coordinates.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Trend Analytics (Scoped) */}
            <MonthlyAttendanceChart
              attendance={scopedAttendance}
              students={scopedStudents}
              lang={lang}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
              onLoadAttendanceRange={onLoadAttendanceRange}
            />

            {/* Grade-Level Attendance & Academic Comparison (Staff only) */}
            {!isRestrictedPersonalRole && (
              <GradeLevelAnalyticsChart
                students={scopedStudents}
                attendance={scopedAttendance}
                courses={scopedCourses}
                grades={scopedGrades}
                systemConfig={systemConfig}
                lang={lang}
              />
            )}
          </div>
          )}
        </div>
        </>}

        {attendanceStep === 'records' && <>
        {/* Gallery / Cards of Recent Selfie Check-ins with Click-to-View Modal */}
        <div className="saas-card-body space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="type-section-title flex flex-wrap items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span>{lang === 'th' ? `ภาพถ่ายเช็คชื่อ · ${selectedDate}` : `Selfie Logs · ${selectedDate}`}</span>
                <span className="type-meta font-semibold">
                  · {displayRecords.length} {lang === 'th' ? 'รายการ' : 'records'}
                </span>
              </h3>
              <p className="type-meta mt-0.5">
                {lang === 'th'
                  ? 'คลิกการ์ดเพื่อดูภาพถ่ายและพิกัด'
                  : 'Click a card to inspect selfie proof & GPS.'}
              </p>
            </div>

            {/* Simple Text Search inside table */}
            <input
              type="text"
              placeholder={lang === 'th' ? 'ค้นหาชื่อ, รหัส, ห้อง...' : 'Search name, ID, room...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] type-label text-[var(--color-text-title)] bg-[var(--color-card-subtle)] placeholder-[var(--color-text-muted)] w-full sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {displayRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2">
              <Camera className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
              <p className="type-section-title">
                {lang === 'th' ? `ไม่พบบันทึกวันที่ ${selectedDate}` : `No records for ${selectedDate}`}
              </p>
              <p className="type-meta">
                {lang === 'th'
                  ? 'เลือกวันที่อื่น หรือเปิดกล้องเช็คชื่อเพื่อบันทึกข้อมูลใหม่'
                  : 'Select another date or capture a new record.'}
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white type-label cursor-pointer"
              >
                {lang === 'th' ? 'ดูวันนี้' : 'Back to Today'}
              </button>
            </div>
          ) : (
            <div>
              <PagedList
                items={displayRecords}
                pageSize={4}
                renderItem={(rec) => {
                const isCheckOut = rec.recordType === 'check_out';
                const isTeacher = rec.userType === 'teacher';
                const photoSrc = rec.photoUrl || rec.userAvatar || fallbackAvatarSvg(rec.userName);

                return (
                  <div
                    key={rec.id}
                    onClick={() => openPhotoRecord(rec)}
                    className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 hover:border-[var(--color-primary)] transition cursor-pointer flex flex-col justify-between gap-3"
                  >
                    {/* Top Row: Clean Unboxed Type & Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 type-meta">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          isCheckOut ? 'text-purple-700 dark:text-purple-300' : 'text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {isCheckOut ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
                          <span>{isCheckOut ? (lang === 'th' ? 'ออก' : 'Exit') : (lang === 'th' ? 'เข้า' : 'Entry')}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{isTeacher ? (lang === 'th' ? 'ครู' : 'Staff') : (lang === 'th' ? 'นักเรียน' : 'Student')}</span>
                      </div>

                      <div className="flex items-center gap-1 font-mono font-semibold text-[var(--color-text-body)]">
                        <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                        <span>{rec.time} {lang === 'th' ? 'น.' : ''}</span>
                      </div>
                    </div>

                    {/* Middle: Photo & Person Info */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[var(--color-card)] border border-[var(--color-border)] shrink-0 group-hover:ring-2 group-hover:ring-[var(--color-primary)] transition">
                        <AttendancePhoto
                          src={photoSrc}
                          alt={rec.userName || 'Check-in photo'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="type-card-title truncate">
                          {rec.userName || (lang === 'th' ? 'ผู้ใช้งานระบบ' : 'System User')}
                        </p>
                        <p className="type-meta truncate">
                          {rec.userDepartmentOrRoom || rec.userRole || (lang === 'th' ? 'โรงเรียน' : 'School')}
                        </p>
                        <div className="pt-0.5">
                          {rec.status === 'present' ? (
                            <span className="type-meta font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{lang === 'th' ? 'ตรงเวลา' : 'On-time'}</span>
                            </span>
                          ) : (
                            <span className="type-meta font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{lang === 'th' ? 'มาสาย' : 'Late'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata: GPS & Action Prompt */}
                    <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-1.5 type-meta">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                        <span className="truncate">
                          {rec.location?.distanceMeters !== undefined 
                            ? (lang === 'th' ? `ห่าง ${rec.location.distanceMeters} ม.` : `${rec.location.distanceMeters}m away`)
                            : (lang === 'th' ? 'ในเขตพื้นที่' : 'On campus')}
                        </span>
                      </div>

                      <span className="text-[var(--color-primary-text)] font-semibold group-hover:underline inline-flex items-center gap-0.5 shrink-0">
                        <span>{lang === 'th' ? 'ดูภาพ' : 'Inspect'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              }}
              />
            </div>
          )}
        </div>
        </>}
      </div>

            {/* Live Gate Check-in Feed inside Tab 2 */}
            {attendanceStep === 'live_feed' && (
            <div className="saas-card saas-card-body space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h2 className="type-section-title">
                    {lang === 'th' ? 'บันทึกเข้า-ออกประตูวันนี้' : 'Live Gate Check-in Feed'}
                  </h2>
                  <span className="type-meta font-semibold text-emerald-700 dark:text-emerald-300">
                    · {lang === 'th' ? 'อัปเดตล่าสุด' : 'Live'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                  title={lang === 'th' ? 'เปิดหน้าบันทึกเช็กชื่อทั้งหมด' : 'Open full attendance records'}
                >
                  <span>{lang === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                <PagedList items={displayRecords.slice(0, 8)} pageSize={4} renderItem={(rec) => (
                  <div
                    key={rec.id}
                    onClick={() => openPhotoRecord(rec)}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 cursor-pointer hover:bg-[var(--color-card-subtle)] rounded-lg px-2 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AttendancePhoto
                        src={rec.photoUrl || rec.userAvatar || fallbackAvatarSvg(rec.userName)}
                        alt={rec.userName}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="type-card-title truncate">
                            {rec.userName}
                          </span>
                          <span className="type-meta font-mono">
                            · {rec.studentId}
                          </span>
                        </div>
                        <div className="type-meta truncate">
                          {rec.userDepartmentOrRoom || rec.userRole} · {rec.time} {lang === 'th' ? 'น.' : ''} · {rec.recordType === 'check_out' ? (lang === 'th' ? 'ออก' : 'Exit') : (lang === 'th' ? 'เข้า' : 'Entry')}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-auto">
                      {rec.status === 'present' ? (
                        <span className="inline-flex items-center gap-1 type-meta font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'ตรงเวลา' : 'On-time'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 type-meta font-semibold text-amber-700 dark:text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'มาสาย' : 'Late'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )} />
              </div>
            </div>
            )}
          </div>
        )}

        {/* TAB 3: INNOVATIVE CLASSROOM HUB */}
        {dashboardTab === 'innovative_hub' && (() => {
          const hubItems = [
            {
              id: 'games',
              title: 'EduBattle Royale 3D',
              desc: lang === 'th' ? 'สมรภูมิประลองปัญญา 3D แข่งตอบคำถามชิงตำแหน่งแชมป์' : '3D interactive academic quiz battle arena with live avatars',
              icon: Swords,
              color: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
              badge: '3D Realtime',
              actionLabel: lang === 'th' ? 'เข้าสู่สนาม 3D' : 'Enter 3D Arena',
            },
            {
              id: 'socratic_tutor',
              title: 'Socratic AI Tutor',
              desc: lang === 'th' ? 'ผู้ช่วยติวอัจฉริยะที่ใช้หลักตั้งคำถามกระตุ้นกระบวนการคิด' : 'Inquiry-based AI learning mentor guiding critical thinking',
              icon: BrainCircuit,
              color: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700',
              badge: 'AI Powered',
              actionLabel: lang === 'th' ? 'เริ่มติว' : 'Start Tutoring',
            },
            {
              id: 'study_streak',
              title: 'Study Streak & Quest Pass',
              desc: lang === 'th' ? 'สะสมแต้มการเข้าเรียนต่อเนื่อง ปลดล็อกสกินการ์ดและเหรียญรางวัล' : 'Daily streak challenges, avatar card borders, and rewards',
              icon: Flame,
              color: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
              badge: 'Gamified',
              actionLabel: lang === 'th' ? 'ดูเควสต์' : 'View Quests',
            },
            {
              id: 'boss_raid',
              title: 'Co-op Boss Raid',
              desc: lang === 'th' ? 'รวมพลังตอบโจทย์ความยากระดับบอส ประสานงานพิชิตด่านร่วมกัน' : 'Collaborative classroom quiz raid with team boss battles',
              icon: ShieldAlert,
              color: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
              badge: 'Multiplayer',
              actionLabel: lang === 'th' ? 'เข้าร่วมเรดบอส' : 'Join Boss Raid',
            },
            {
              id: 'realworld_quests',
              title: 'Real-World Snap Quest',
              desc: lang === 'th' ? 'ถ่ายภาพปรากฏการณ์รอบตัวส่งตรวจด้วยการวิเคราะห์เชิงวิทยาศาสตร์' : 'Camera quest assignments linking real life to coursework',
              icon: Camera,
              color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
              badge: 'Hands-on',
              actionLabel: lang === 'th' ? 'ส่งเควสต์ภาพ' : 'Snap Quests',
            },
            {
              id: 'subject_labs',
              title: 'Subject Lab Simulation',
              desc: lang === 'th' ? 'ห้องทดลองวิทยาศาสตร์และฟิสิกส์เสมือนจริง ทดลองผสมสารได้อย่างปลอดภัย' : 'Interactive STEM lab simulator with chemistry & optics modules',
              icon: FlaskConical,
              color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
              badge: 'Interactive Lab',
              actionLabel: lang === 'th' ? 'เปิดห้องแล็บ' : 'Launch Lab',
            },
            {
              id: 'ai_diagnostic',
              title: 'AI Diagnostic Learning',
              desc: lang === 'th' ? 'ระบบตรวจวินิจฉัยจุดอ่อนรายบุคคล แนะนำเนื้อหาเสริมเฉพาะจุดอย่างแม่นยำ' : 'Personalized diagnostic learning paths detecting knowledge gaps',
              icon: BarChart3,
              color: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
              badge: 'Adaptive',
              actionLabel: lang === 'th' ? 'ดูผลวินิจฉัย' : 'View Diagnostics',
            },
            {
              id: 'hall_of_fame',
              title: '3D Hall of Fame',
              desc: lang === 'th' ? 'หอเกียรติยศ 3 มิติ จัดแสดงผลงานยอดเยี่ยมและถ้วยรางวัลโรงเรียน' : 'Immersive 3D gallery honoring top academic and sports achievers',
              icon: Trophy,
              color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
              badge: '3D Gallery',
              actionLabel: lang === 'th' ? 'ชมหอเกียรติยศ' : 'Visit Hall of Fame',
            },
            ...(canViewEarlyWarning
              ? [{
                  id: 'executive_warning',
                  title: 'Executive Early Warning',
                  desc: lang === 'th' ? 'ระบบเตือนภัยล่วงหน้าตรวจจับนักเรียนเสี่ยงตกหล่นหรือขาดเรียนบ่อย' : 'Early warning intelligence identifying attendance & academic drop risks',
                  icon: ShieldAlert,
                  color: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
                  badge: 'Executive',
                  actionLabel: lang === 'th' ? 'วิเคราะห์ความเสี่ยง' : 'View Risk Alerts',
                }]
              : []),
          ].filter((item) => item.id === 'executive_warning' ? canViewEarlyWarning : isModuleEnabled(item.id as NavTab));

          const totalHubPages = Math.max(1, Math.ceil(hubItems.length / 3));
          const safeHubPage = Math.min(innovationPage, totalHubPages - 1);

          return (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-primary-text)]" />
                <h2 className="type-section-title">
                  {lang === 'th' ? 'นวัตกรรมการเรียนรู้ดิจิทัล' : 'Digital Learning Hub'}
                </h2>
              </div>
              {totalHubPages > 1 && (
                <div className="saas-control-group">
                  {Array.from({ length: totalHubPages }, (_, page) => (
                    <button key={page} type="button" onClick={() => setInnovationPage(page)} className={`px-2.5 py-1 rounded-md type-meta font-semibold cursor-pointer ${safeHubPage === page ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'}`}>
                      {page + 1} / {totalHubPages}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {hubItems.length === 0 ? (
              <div className="saas-card saas-card-body py-10 text-center text-xs text-[var(--color-text-muted)]">
                {lang === 'th' ? 'โมดูลนวัตกรรมและ AI ยังไม่ได้เปิดใช้งานสำหรับแพ็กเกจหรือสิทธิ์ของคุณ' : 'No innovation or AI modules enabled for your role/package'}
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {hubItems.filter((_, index) => Math.floor(index / 3) === safeHubPage).map((item) => (
                <div
                  key={item.id}
                  className="saas-card saas-card-body hover:border-[var(--color-primary)] transition flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`p-2 rounded-xl border ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="type-meta font-semibold">
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="type-section-title group-hover:text-[var(--color-primary-text)] transition">
                        {item.title}
                      </h3>
                      <p className="type-body text-[var(--color-text-muted)] mt-1 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="type-meta">
                      {lang === 'th' ? 'พร้อมใช้งาน' : 'Ready'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.id === 'executive_warning') {
                          setDashboardTab('early_warning');
                          return;
                        }
                        onNavigate(item.id as NavTab);
                      }}
                      className="btn-tool-tone px-3 py-1.5"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
          );
        })()}

        {/* TAB 4: OFFICIAL ANNOUNCEMENTS & HONOR ROLL */}
        {dashboardTab === 'announcements' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Announcements Section (2 cols) */}
              <div className="lg:col-span-2 saas-card min-w-0 overflow-hidden">
                <div className="saas-card-header">
                  <div className="flex items-center gap-2 min-w-0">
                    <BellRing className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    <h2 className="type-section-title">
                      {lang === 'th' ? 'ข่าวสารและประกาศโรงเรียน' : 'Official School Announcements'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('announcements')}
                    className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    <span>{lang === 'th' ? 'ทั้งหมด' : 'All'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="saas-card-body divide-y divide-[var(--color-border)]">
                  <PagedList items={scopedAnnouncements} pageSize={3} renderItem={(item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="type-card-title">{item.title}</span>
                        <span className="type-meta">{item.publishedAt}</span>
                      </div>
                      <p className="type-body text-[var(--color-text-body)] line-clamp-2">
                        {item.content}
                      </p>
                      <div className="type-meta flex flex-wrap items-center gap-1.5">
                        <span>{item.author}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[var(--color-primary-text)]">
                          {item.authorRole}
                        </span>
                      </div>
                    </div>
                  )} />
                </div>
              </div>

              {/* Honor Students Card (Staff & Parent only, never student peers/gradebook shortcut) */}
              {currentRole !== 'student' && (
              <div className="saas-card min-w-0 overflow-hidden">
                <div className="saas-card-header">
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h2 className="type-section-title">
                      {lang === 'th' ? 'ผลการเรียนดีเด่น' : 'Honor Roll'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('gradebook')}
                    className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    <span>{lang === 'th' ? 'สมุดคะแนน' : 'Gradebook'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="saas-card-body divide-y divide-[var(--color-border)]">
                  <PagedList items={topStudents} pageSize={3} renderItem={(st, idx) => (
                    <div
                      key={st.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 text-center type-meta font-bold shrink-0">
                          #{idx + 1}
                        </div>
                        <img
                          src={st.avatarUrl}
                          alt={st.firstNameEn}
                          className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="type-card-title truncate">
                            {lang === 'th' ? `${st.firstNameTh} ${st.lastNameTh}` : `${st.firstNameEn} ${st.lastNameEn}`}
                          </div>
                          <div className="type-meta truncate">
                            {lang === 'th' ? `ชั้น ${st.gradeLevel} ${st.room}` : `Grade ${st.gradeLevel} / ${st.room}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {(() => {
                          const summary = calculateStudentAcademicSummary({
                            student: st,
                            courses: scopedCourses,
                            grades: scopedGrades,
                            gradingSystem: systemConfig.gradingSystem,
                          });
                          if (summary.hideGpaCalculations) {
                            const feedback = getRawScoreFeedback(summary.averageRawScore);
                            return (
                              <>
                                <div className="type-label font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                                  {summary.averageRawScore !== null ? `${summary.averageRawScore}%` : 'รายปี'}
                                </div>
                                <div className="type-meta">
                                  {summary.averageRawScore !== null ? feedback.labelTh : 'ประเมินรายปี'}
                                </div>
                              </>
                            );
                          }
                          const hasRealGpa = summary.hasRecordedGrades && summary.gpax !== null;
                          const effectiveGpa = hasRealGpa && summary.gpax !== null ? summary.gpax : 0;
                          return (
                            <>
                              <div className="type-label font-bold text-[var(--color-primary-text)] font-mono tabular-nums">
                                {hasRealGpa ? effectiveGpa.toFixed(2) : '—'}
                              </div>
                              <div className="type-meta">
                                {hasRealGpa ? 'GPAX ปพ.5' : 'ยังไม่ตัดเกรด'}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )} />
                </div>
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slide-Over Drawer: Photo & GPS Inspection */}
      {selectedPhotoRecord && (
        <div
          className="saas-drawer-backdrop animate-in fade-in duration-150"
          onClick={() => setSelectedPhotoRecord(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'th' ? 'หลักฐานเช็คชื่อและพิกัด GPS' : 'Check-in Proof & GPS'}
            onClick={(e) => e.stopPropagation()}
            className="saas-drawer-panel animate-in slide-in-from-right duration-200"
          >
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between gap-2 bg-[var(--color-card-subtle)]">
              <div className="min-w-0">
                <h3 className="type-section-title truncate">
                  {selectedPhotoRecord.userName || (lang === 'th' ? 'หลักฐานการเช็คชื่อ' : 'Check-in Proof')}
                </h3>
                <p className="type-meta tabular-nums truncate">
                  {selectedPhotoRecord.date} · {selectedPhotoRecord.time} {lang === 'th' ? 'น.' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoRecord(null)}
                className="btn-icon-tool"
                aria-label={lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-4/3 max-h-64 border border-[var(--color-border)] flex items-center justify-center">
                <AttendancePhoto
                  src={selectedPhotoRecord.photoUrl || selectedPhotoRecord.userAvatar || fallbackAvatarSvg(selectedPhotoRecord.userName)}
                  alt={selectedPhotoRecord.userName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-sm text-white text-[11px] flex items-center justify-between gap-2">
                  <span className="font-semibold flex items-center gap-1 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{selectedPhotoRecord.location?.geofenceZoneName || (lang === 'th' ? 'ประตูโรงเรียน' : 'Main Gate')}</span>
                  </span>
                  <span className="font-mono shrink-0">{selectedPhotoRecord.location?.distanceMeters ?? 18} ม.</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] divide-y divide-[var(--color-border)]">
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="type-meta">{lang === 'th' ? 'บทบาท / ห้อง' : 'Role / Room'}</span>
                  <span className="type-card-title text-right">{selectedPhotoRecord.userDepartmentOrRoom || selectedPhotoRecord.userRole}</span>
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="type-meta">{lang === 'th' ? 'ประเภท / สถานะ' : 'Type / Status'}</span>
                  <span className="type-label text-right">
                    {selectedPhotoRecord.recordType === 'check_out' ? (lang === 'th' ? 'ออก' : 'Out') : (lang === 'th' ? 'เข้า' : 'In')} ·{' '}
                    <span className={selectedPhotoRecord.status === 'present' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                      {selectedPhotoRecord.status === 'present' ? (lang === 'th' ? 'ตรงเวลา' : 'On-time') : (lang === 'th' ? 'มาสาย' : 'Late')}
                    </span>
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-meta">{lang === 'th' ? 'พิกัด GPS' : 'GPS Coordinates'}</span>
                    <span className="type-meta font-mono tabular-nums">
                      {selectedPhotoRecord.location?.lat || 13.7367}, {selectedPhotoRecord.location?.lng || 100.5231}
                    </span>
                  </div>
                  <p className="type-meta">
                    {selectedPhotoRecord.remarks || (lang === 'th' ? 'ลงชื่อผ่านมือถือพร้อมภาพถ่ายและพิกัด Geofence' : 'Verified with selfie and geofence')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2">
              <span className="type-meta font-mono truncate">ID: {selectedPhotoRecord.id}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const photoUrl = selectedPhotoRecord.photoUrl
                      ? await resolveAttendancePhotoUrl(selectedPhotoRecord.photoUrl)
                      : selectedPhotoRecord.userAvatar;
                    if (!photoUrl) return;
                    const link = document.createElement('a');
                    link.href = photoUrl;
                    link.download = `selfie_${selectedPhotoRecord.userName}_${selectedPhotoRecord.date}.jpg`;
                    link.click();
                  }}
                  className="btn-tool-neutral px-3 py-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'บันทึกรูป' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoRecord(null)}
                  className="btn-action-primary px-4 py-1.5"
                >
                  {lang === 'th' ? 'ปิด' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer: 3-Step Onboarding OR Guardian LINE & Tuition Details */}
      {drawerMode && (
        <div
          className="saas-drawer-backdrop animate-in fade-in duration-150"
          onClick={() => setDrawerMode(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="saas-drawer-panel animate-in slide-in-from-right duration-200"
          >
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between gap-2 bg-[var(--color-card-subtle)]">
              <div className="min-w-0">
                <h3 className="type-section-title truncate">
                  {drawerMode === 'onboarding'
                    ? (lang === 'th' ? `ตั้งค่าโรงเรียน (${completedOnboardingCount}/3)` : `School Setup (${completedOnboardingCount}/3)`)
                    : (lang === 'th' ? 'LINE ผู้ปกครอง & การเงินค่าเทอม' : 'Guardian LINE & Tuition')}
                </h3>
                <p className="type-meta truncate">
                  {drawerMode === 'onboarding'
                    ? (lang === 'th' ? 'เตรียมความพร้อมก่อนเปิดภาคเรียน' : 'Essential system configuration')
                    : (lang === 'th' ? 'รายละเอียดการเชื่อมต่อและจัดเก็บค่าเล่าเรียน' : 'Connection & collection summary')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerMode(null)}
                className="btn-icon-tool"
                aria-label={lang === 'th' ? 'ปิด' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              {drawerMode === 'onboarding' ? (
                <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  {isModuleEnabled('students') && (
                    <button
                      type="button"
                      onClick={() => { setDrawerMode(null); onNavigate('students'); }}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-2 hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <div className="min-w-0">
                        <div className="type-card-title">1. {lang === 'th' ? 'นำเข้าข้อมูลนักเรียน & รายวิชา' : 'Import Students & Courses'}</div>
                        <div className="type-meta mt-0.5">{students.length} {lang === 'th' ? 'นักเรียน' : 'students'} · {courses.length} {lang === 'th' ? 'วิชา' : 'courses'}</div>
                      </div>
                      <span className={`type-meta font-bold shrink-0 ${step1Done ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {step1Done ? (lang === 'th' ? 'พร้อมแล้ว' : 'Done') : (lang === 'th' ? 'ดำเนินการ' : 'Setup')}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setDrawerMode(null); onNavigate('system_settings'); }}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-2 hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                  >
                    <div className="min-w-0">
                      <div className="type-card-title">2. {lang === 'th' ? 'ตั้งค่าคาบเรียน & พิกัด GPS' : 'Periods & GPS Geofence'}</div>
                      <div className="type-meta mt-0.5">{school?.latitude ? `GPS ${school.geofenceRadiusMeters || 200} ม.` : (lang === 'th' ? 'ยังไม่ได้ปักหมุด' : 'Not pinned')}</div>
                    </div>
                    <span className={`type-meta font-bold shrink-0 ${step2Done ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      {step2Done ? (lang === 'th' ? 'พร้อมแล้ว' : 'Done') : (lang === 'th' ? 'ตั้งค่า' : 'Setup')}
                    </span>
                  </button>
                  {isModuleEnabled('timetable') && (
                    <button
                      type="button"
                      onClick={() => { setDrawerMode(null); onNavigate('timetable'); }}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-2 hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <div className="min-w-0">
                        <div className="type-card-title">3. {lang === 'th' ? 'จัดตารางเรียน & ภาคเรียน' : 'Timetable & Semester'}</div>
                        <div className="type-meta mt-0.5">{timetableSlots.length} {lang === 'th' ? 'คาบในระบบ' : 'slots'}</div>
                      </div>
                      <span className={`type-meta font-bold shrink-0 ${step3Done ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {step3Done ? (lang === 'th' ? 'พร้อมแล้ว' : 'Done') : (lang === 'th' ? 'จัดตาราง' : 'Setup')}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="type-card-title flex items-center gap-1.5">
                        <MessageSquare className={`w-4 h-4 ${isLineEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--color-text-muted)]'}`} />
                        <span>{lang === 'th' ? 'การเชื่อมต่อ LINE ผู้ปกครอง' : 'Guardian LINE Sync'}</span>
                      </span>
                      {isLineEnabled ? (
                        <span className="type-kpi-sm text-emerald-700 dark:text-emerald-300">{linePercent}%</span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {lang === 'th' ? 'ปิดใช้งาน' : 'Disabled'}
                        </span>
                      )}
                    </div>
                    {isLineEnabled ? (
                      <>
                        <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${linePercent}%` }} />
                        </div>
                        <div className="flex items-center justify-between type-meta tabular-nums">
                          <span>{lang === 'th' ? `เชื่อมต่อแล้ว ${lineConnectedCount}/${totalStudents} ครอบครัว` : `${lineConnectedCount}/${totalStudents} connected`}</span>
                          <span>{lang === 'th' ? `ยังไม่ผูก ${Math.max(0, totalStudents - lineConnectedCount)}` : `${Math.max(0, totalStudents - lineConnectedCount)} pending`}</span>
                        </div>
                      </>
                    ) : (
                      <p className="type-meta">
                        {lang === 'th'
                          ? 'ปิดใช้งาน LINE OA ทั้งโรงเรียนอยู่ (เปิด/ปิดได้ในหน้าตั้งค่าระบบ)'
                          : 'LINE OA is disabled school-wide (toggle in System Settings).'}
                      </p>
                    )}
                  </div>

                  {canViewFinancials && (
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="type-card-title flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-[var(--color-primary-text)]" />
                          <span>{lang === 'th' ? 'การจัดเก็บค่าเล่าเรียน' : 'Tuition Collection'}</span>
                        </span>
                        <span className="type-kpi-sm">{collectionRate}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${collectionRate}%` }} />
                      </div>
                      <div className="flex items-center justify-between type-meta tabular-nums">
                        <span>{lang === 'th' ? `รับชำระแล้ว ฿${totalCollected.toLocaleString()}` : `Collected ฿${totalCollected.toLocaleString()}`}</span>
                        <span>{lang === 'th' ? `ยอดรวม ฿${totalInvoiced.toLocaleString()}` : `Total ฿${totalInvoiced.toLocaleString()}`}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {isStaffUser && (
                      <button
                        type="button"
                        onClick={() => { setDrawerMode(null); onNavigate('students'); }}
                        className="btn-tool-neutral px-3 py-2 justify-center"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'จัดการผู้ปกครอง' : 'Guardians'}</span>
                      </button>
                    )}
                    {canViewFinancials && (
                      <button
                        type="button"
                        onClick={() => { setDrawerMode(null); onNavigate('billing'); }}
                        className="btn-action-primary px-3 py-2 justify-center"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'เปิดหน้าการเงิน' : 'Open Billing'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
