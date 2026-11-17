import React, { useState, useMemo } from 'react';
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
  Maximize2,
  Minimize2,
  ListChecks,
  TrendingUp,
  Activity,
  LayoutGrid
} from 'lucide-react';
import { slotHasTeacher } from '../lib/timetableTeachers';
import { emitMascotDashboardEvent } from '../components/guide/InteractiveMascotGuide';
import { BaanPakKruPlayyard } from '../components/guide/BaanPakKruPlayyard';
import { 
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
  PeriodAttendanceRecord
} from '../types';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { NavTab } from '../components/layout/Sidebar';
import { getLocalDateString } from '../lib/date';
import { filterAttendanceForUser } from '../lib/attendanceScope';
import { PagedList } from '../components/PagedList';
import { MilestoneAchievementsPanel } from '../components/MilestoneAchievementsPanel';
import { MonthlyAttendanceChart } from '../components/MonthlyAttendanceChart';
import { GradeLevelAnalyticsChart } from '../components/GradeLevelAnalyticsChart';
import { D3DailyAttendanceLineChart } from '../components/D3DailyAttendanceLineChart';
import { PriorityActionWidget } from '../components/PriorityActionWidget';
import { calculateStudentAcademicSummary, getRawScoreFeedback } from '../lib/moeGrading';
import { getModuleTone } from '../lib/moduleTheme';

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
  periodAttendance?: PeriodAttendanceRecord[];
  schoolPeriods?: SchoolPeriodTime[];
  onSelectStudent?: (student: Student) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
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
  periodAttendance = [],
  schoolPeriods = [],
  onSelectStudent,
  focusMode: controlledFocusMode,
  onToggleFocusMode,
}) => {
  const [localFocusMode, setLocalFocusMode] = useState(false);
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

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'check_in' | 'check_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'insights' | 'live_attendance' | 'innovative_hub' | 'announcements'>('overview');
  const [innovationPage, setInnovationPage] = useState(0);
  const [attendanceStep, setAttendanceStep] = useState<'summary' | 'analytics' | 'records' | 'live_feed'>('summary');
  const [drawerMode, setDrawerMode] = useState<null | 'onboarding' | 'guardian_line'>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`eduverse_onboarding_dismissed_${school?.id || 'default'}`) === '1';
  });
  const [playyardCollapsed, setPlayyardCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('baanpakkru_playyard_collapsed') !== '0';
  });
  
  // Slide-over Drawer for viewing captured selfie photo & GPS metadata
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  const openPhotoRecord = (record: AttendanceRecord) => {
    setSelectedPhotoRecord(record);
  };

  // Teacher / Admin Today's Desk computations
  const todayDayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getDay()];
  const todayScheduledSlots = useMemo(() => {
    const daySlots = timetableSlots.filter((s) => s.dayOfWeek === todayDayKey);
    if (currentUser?.role === 'teacher') {
      const teacherName = currentUser.fullNameTh || '';
      const mine = daySlots.filter((s) => slotHasTeacher(s, teacherName));
      return (mine.length > 0 ? mine : daySlots).slice().sort((a, b) => a.periodNumber - b.periodNumber);
    }
    return daySlots.slice().sort((a, b) => a.periodNumber - b.periodNumber);
  }, [timetableSlots, todayDayKey, currentUser]);
  const pendingLeaveCount = leaveRequests.filter((l) => l.status === 'pending').length;
  const ungradedHomeworkCount = homeworkSubmissions.filter((h) => h.status === 'submitted' || h.status === 'late').length;
  const isStaffUser = !currentUser?.role || currentUser.role === 'teacher' || currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const checkedInStudentIdsToday = useMemo(() => {
    const ids = new Set<string>();
    attendance.forEach((rec) => {
      if (rec.date === todayStr && rec.userType !== 'teacher' && rec.studentId) {
        ids.add(rec.studentId);
      }
    });
    return ids;
  }, [attendance, todayStr]);
  const uncheckedTodayCount = Math.max(0, students.filter((s) => s.status === 'active').length - checkedInStudentIdsToday.size);
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
  const showOnboardingCard = !onboardingDismissed && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && completedOnboardingCount < 3;

  // Compute key overall stats
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const lineConnectedCount = students.filter(s => s.lineLinked).length;
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

  // Tuition stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCollected = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Top honor students (sorted by percentage for primary or GPA for secondary)
  const topStudents = [...students]
    .sort((a, b) => {
      const sumA = calculateStudentAcademicSummary({ student: a, courses, grades, gradingSystem: systemConfig.gradingSystem });
      const sumB = calculateStudentAcademicSummary({ student: b, courses, grades, gradingSystem: systemConfig.gradingSystem });
      const scoreA = sumA.hideGpaCalculations ? (sumA.averageRawScore ?? 0) / 25 : (sumA.hasRecordedGrades && sumA.gpax !== null ? sumA.gpax : 0);
      const scoreB = sumB.hideGpaCalculations ? (sumB.averageRawScore ?? 0) / 25 : (sumB.hasRecordedGrades && sumB.gpax !== null ? sumB.gpax : 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  // Export selected date attendance to Excel CSV
  const handleExportSelectedDateCsv = () => {
    if (filteredAttendanceByDate.length === 0) {
      emitMascotDashboardEvent({
        type: 'warning',
        titleTh: 'ไม่พบข้อมูลการมาเรียน',
        titleEn: 'No Attendance Records',
        messageTh: `ยังไม่มีบันทึกการมาเรียนในวันที่ ${selectedDate} สำหรับส่งออก CSV`,
        messageEn: `No attendance records found on ${selectedDate} to export.`,
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
    emitMascotDashboardEvent({
      type: 'success',
      titleTh: 'ส่งออก CSV สำเร็จ',
      titleEn: 'CSV Export Ready',
      messageTh: `ดาวน์โหลดข้อมูลการมาเรียน ${filteredAttendanceByDate.length} รายการเรียบร้อยแล้ว`,
      messageEn: `Exported ${filteredAttendanceByDate.length} attendance records to CSV.`,
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

  return (
    <div className={`dashboard-print-area h-full flex flex-col min-h-0 min-w-0 max-w-full overflow-hidden dash-shell rounded-2xl ${getModuleTone('dashboard')}`}>
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

      {/* Clean Monochrome Top Bar & Mode Switcher */}
      <div className="no-print shrink-0 saas-card px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <BarChart3 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
          <div className="min-w-0">
            <h1 className="type-page-title truncate">
              {lang === 'th' ? systemConfig.schoolNameTh : systemConfig.schoolNameEn}
            </h1>
            <p className="type-meta truncate">
              {lang === 'th'
                ? `ปีการศึกษา ${systemConfig.academicYear} · ${formatSemesterLabel(systemConfig.currentSemester)}`
                : `AY ${systemConfig.academicYear} · ${systemConfig.currentSemester}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0 flex-wrap justify-between sm:justify-end">
          <div data-guide-id="dashboard-subtabs" className="seg-tab-group w-full sm:w-auto max-w-full flex! flex-wrap! sm:inline-flex! gap-0.5">
            <button
              type="button"
              data-active={dashboardTab === 'overview'}
              onClick={() => setDashboardTab('overview')}
              className="seg-tab-btn inline-flex items-center gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'วันนี้' : 'Today'}</span>
            </button>

            <button
              type="button"
              data-guide-id={dashboardTab !== 'insights' ? 'dashboard-charts' : undefined}
              data-active={dashboardTab === 'insights'}
              onClick={() => setDashboardTab('insights')}
              className="seg-tab-btn inline-flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'วิเคราะห์' : 'Insights'}</span>
            </button>

            <button
              type="button"
              data-active={dashboardTab === 'live_attendance'}
              onClick={() => setDashboardTab('live_attendance')}
              className="seg-tab-btn inline-flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'เช็คชื่อสด' : 'Live GPS'}</span>
              <span className={`font-mono text-[11px] tabular-nums ${
                dashboardTab === 'live_attendance'
                  ? 'text-white/90'
                  : 'text-[var(--color-text-muted)]'
              }`}>
                ({displayRecords.length})
              </span>
            </button>

            <button
              type="button"
              data-active={dashboardTab === 'innovative_hub'}
              onClick={() => setDashboardTab('innovative_hub')}
              className="seg-tab-btn inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'นวัตกรรม' : 'Innovations'}</span>
            </button>

            <button
              type="button"
              data-active={dashboardTab === 'announcements'}
              onClick={() => setDashboardTab('announcements')}
              className="seg-tab-btn inline-flex items-center gap-1.5"
            >
              <BellRing className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'ประกาศ' : 'News'}</span>
            </button>
          </div>

          {isFocusMode ? (
            <button
              type="button"
              data-guide-id="dashboard-focus-toggle"
              aria-pressed={isFocusMode}
              onClick={handleToggleFocus}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] type-label transition cursor-pointer whitespace-nowrap shrink-0"
              title={lang === 'th' ? 'ออกจากโหมดโฟกัส' : 'Exit Focus Mode'}
              aria-label={lang === 'th' ? 'ออกจากโหมดโฟกัส' : 'Exit Focus Mode'}
            >
              <Minimize2 className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'ออกจากโฟกัส' : 'Exit Focus'}</span>
            </button>
          ) : (
            <div className="saas-control-group shrink-0">
              <button
                type="button"
                onClick={handleToggleFocus}
                data-guide-id="dashboard-focus-toggle"
                className="btn-icon-tool"
                title={lang === 'th' ? 'โหมดโฟกัส (ขยายพื้นที่งาน)' : 'Focus Mode'}
                aria-label={lang === 'th' ? 'โหมดโฟกัส' : 'Focus Mode'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  emitMascotDashboardEvent({
                    type: 'success',
                    titleTh: 'เตรียมพิมพ์แดชบอร์ดพร้อมแล้ว',
                    titleEn: 'Dashboard Print Ready',
                    messageTh: 'จัดหน้าสำหรับพิมพ์รายงาน PDF เรียบร้อย — ชาร์โคล & หมีเอาใจช่วย!',
                    messageEn: 'Print layout prepared for administrative PDF export.',
                  });
                  window.print();
                }}
                className="btn-icon-tool"
                title={lang === 'th' ? 'พิมพ์แดชบอร์ดเป็น PDF' : 'Print Dashboard to PDF'}
                aria-label={lang === 'th' ? 'พิมพ์แดชบอร์ดเป็น PDF' : 'Print Dashboard to PDF'}
              >
                <Printer className="w-4 h-4" />
              </button>

              {['admin', 'super_admin', 'teacher'].includes(currentUser?.role || 'admin') && (
                <button
                  type="button"
                  onClick={() => onNavigate('executive_monitor')}
                  className="hidden md:inline-flex btn-icon-tool"
                  title={lang === 'th' ? 'เปิดโหมดจอทีวี / ผู้อำนวยการ' : 'Open Director / TV Monitor'}
                  aria-label={lang === 'th' ? 'เปิดโหมดจอทีวี / ผู้อำนวยการ' : 'Open Director / TV Monitor'}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Panels Container */}
      <div className="dashboard-print-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 pb-16 dash-scroll-stack">
        {/* TAB 1: DAILY ACTION WORKSPACE (Executive Strip + 50/50 Neutral Workspace) */}
        {dashboardTab === 'overview' && (
          <div className="dash-scroll-stack animate-in fade-in duration-150">
            {/* Slim 1-Line Contextual Alert Bar (Exam Pack or Setup Drawer trigger) */}
            {!isFocusMode && (
              (unclaimedCentralPacksCount > 0 && (!currentUser?.role || currentUser.role === 'admin' || currentUser.role === 'teacher')) || showOnboardingCard
            ) && (
              <div className="no-print saas-alert-bar text-xs">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                  {unclaimedCentralPacksCount > 0 && (!currentUser?.role || currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-semibold text-[var(--color-text-title)] truncate">
                        {lang === 'th'
                          ? `มีข้อสอบกลาง ${unclaimedCentralPacksCount} ชุดรอรับ`
                          : `${unclaimedCentralPacksCount} central exam packs waiting`}
                      </span>
                      {currentUser?.role === 'admin' && onOpenCentralExamPopup && (
                        <button
                          type="button"
                          onClick={onOpenCentralExamPopup}
                          className="text-[var(--color-primary-text)] font-bold hover:underline cursor-pointer whitespace-nowrap"
                        >
                          {lang === 'th' ? 'รับข้อสอบ' : 'Claim'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigate('central_exam_hub')}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {lang === 'th' ? 'คลังข้อสอบ' : 'Exam Hub'} →
                      </button>
                    </div>
                  )}

                  {showOnboardingCard && (
                    <button
                      type="button"
                      onClick={() => setDrawerMode('onboarding')}
                      className="inline-flex items-center gap-1.5 text-[var(--color-text-body)] hover:text-[var(--color-text-title)] font-semibold cursor-pointer"
                    >
                      <ListChecks className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                      <span>
                        {lang === 'th'
                          ? `ตั้งค่าโรงเรียน (${completedOnboardingCount}/3 ขั้นตอน)`
                          : `School setup (${completedOnboardingCount}/3)`}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showOnboardingCard && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingDismissed(true);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem(`eduverse_onboarding_dismissed_${school?.id || 'default'}`, '1');
                      }
                    }}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] p-1 rounded-md cursor-pointer"
                    title={lang === 'th' ? 'ซ่อนแถบตั้งค่า' : 'Dismiss'}
                    aria-label={lang === 'th' ? 'ซ่อนแถบตั้งค่า' : 'Dismiss'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* 1-ROW EXECUTIVE KPI STRIP (Single-elevation, hairline divided, neutral monochrome) */}
            <section
              data-guide-id="dashboard-kpis"
              aria-label={lang === 'th' ? 'สรุปตัวชี้วัดสำคัญประจำวัน' : 'Daily Executive KPIs'}
              className="saas-kpi-strip print-avoid-break"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]">
                {/* KPI 1: On-Time & Students */}
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-1"
                  title={lang === 'th' ? 'เปิดระบบเช็คชื่อประจำวัน' : 'Open Attendance'}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-meta truncate flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{lang === 'th' ? 'มาตรงเวลา' : 'On-Time'} · {selectedDate === todayStr ? (lang === 'th' ? 'วันนี้' : 'Today') : selectedDate}</span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="type-kpi tabular-nums">{onTimePercent}%</span>
                    <span className="type-meta tabular-nums">
                      ({presentCount}/{totalForDate}) · {totalStudents} {lang === 'th' ? 'นร.' : 'stu'}
                    </span>
                  </div>
                </button>

                {/* KPI 2: Pending Leaves & Today Periods */}
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-1"
                  title={lang === 'th' ? 'ตรวจสอบและอนุมัติใบลา' : 'Review Pending Leaves'}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-meta truncate flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{lang === 'th' ? 'ใบลารออนุมัติ / คาบ' : 'Leaves & Slots'}</span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`type-kpi tabular-nums ${pendingLeaveCount > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                      {pendingLeaveCount}
                    </span>
                    <span className="type-meta tabular-nums">
                      {lang === 'th'
                        ? `รอตรวจ · ${todayScheduledSlots.length} คาบ${teacherLeavesTodayCount > 0 ? ` · ครูลา ${teacherLeavesTodayCount}` : ''}`
                        : `pending · ${todayScheduledSlots.length} slots${teacherLeavesTodayCount > 0 ? ` · ${teacherLeavesTodayCount} staff leave` : ''}`}
                    </span>
                  </div>
                </button>

                {/* KPI 3: Homework & Unchecked */}
                <button
                  type="button"
                  onClick={() => onNavigate('homework')}
                  className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-1"
                  title={lang === 'th' ? 'ไปยังหน้าตรวจการบ้าน' : 'Open Homework Grading'}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-meta truncate flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      <span>{lang === 'th' ? 'การบ้าน / รอเช็ค' : 'Homework / Pending'}</span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="type-kpi tabular-nums">{ungradedHomeworkCount}</span>
                    <span className="type-meta tabular-nums">
                      {lang === 'th'
                        ? `รอตรวจ · รอเช็ค ${uncheckedTodayCount} คน`
                        : `to grade · ${uncheckedTodayCount} unchecked`}
                    </span>
                  </div>
                </button>

                {/* KPI 4: Guardian LINE & Tuition (Opens Slide-Over Drawer) */}
                <button
                  type="button"
                  onClick={() => setDrawerMode('guardian_line')}
                  className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-1"
                  title={lang === 'th' ? 'เปิดดูรายละเอียด LINE ผู้ปกครองและค่าเทอม' : 'Inspect Guardian LINE & Tuition'}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-meta truncate flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{lang === 'th' ? 'LINE & ค่าเทอม' : 'LINE & Tuition'}</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="type-kpi tabular-nums">{linePercent}%</span>
                    <span className="type-meta tabular-nums">
                      LINE · {lang === 'th' ? `ค่าเทอม ${collectionRate}%` : `Tuition ${collectionRate}%`}
                    </span>
                  </div>
                </button>
              </div>
            </section>

            {/* MAIN 2-PANE ACTION WORKSPACE (50% / 50%, strictly 1 unified saas-card per column) */}
            <div className={`dashboard-print-grid relative dash-grid grid-cols-1 ${isFocusMode ? 'lg:grid-cols-[0.9fr_1.1fr]' : 'lg:grid-cols-2'} items-stretch`}>
              {/* LEFT PANE: Gate Check-ins & Live Status */}
              <section
                aria-label={lang === 'th' ? 'รายการเช็คชื่อเข้า-ออกล่าสุด' : 'Recent Gate Check-ins'}
                className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
              >
                <div>
                  <div className="saas-card-header">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                      <h2 className="type-section-title truncate">
                        {lang === 'th' ? 'เช็คชื่อล่าสุด & ประตูโรงเรียน' : 'Recent Gate Check-ins'}
                      </h2>
                    </div>

                    <div className="no-print flex items-center gap-2 shrink-0">
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
                  </div>

                  {/* Punctuality Thin Progress Strip */}
                  <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 type-meta">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {lang === 'th' ? `ตรงเวลา ${presentCount} (${onTimePercent}%)` : `On-time ${presentCount} (${onTimePercent}%)`}
                        </span>
                        <span className="font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                          {lang === 'th' ? `มาสาย ${lateCount} (${latePercent}%)` : `Late ${lateCount} (${latePercent}%)`}
                        </span>
                      </div>
                      <span className="tabular-nums">
                        {lang === 'th' ? `เข้า ${checkInsCount} · ออก ${checkOutsCount}` : `In ${checkInsCount} · Out ${checkOutsCount}`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden flex">
                      <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${onTimePercent}%` }} />
                      <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${latePercent}%` }} />
                    </div>
                  </div>

                  {/* Clean Hairline List */}
                  <div className="saas-card-body">
                    {displayRecords.length === 0 ? (
                      <div className="py-8 text-center space-y-2.5">
                        <p className="type-meta">
                          {lang === 'th' ? `ยังไม่มีบันทึกเช็คชื่อวันที่ ${selectedDate}` : `No check-in logs for ${selectedDate}`}
                        </p>
                        <button
                          type="button"
                          onClick={() => onNavigate('mobile_checkin')}
                          className="btn-action-primary px-3 py-1.5 mx-auto"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'เปิดเช็คชื่อมือถือ' : 'Open Mobile Check-in'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--color-border)]">
                        {displayRecords.slice(0, isFocusMode ? 8 : 6).map((rec) => (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => openPhotoRecord(rec)}
                            className="print-keep w-full py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-[var(--color-card-subtle)] rounded-lg px-1.5 -mx-1.5 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={rec.photoUrl || rec.userAvatar || fallbackAvatarSvg(rec.userName)}
                                alt={rec.userName || 'User'}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="type-card-title truncate">
                                  {rec.userName}
                                </div>
                                <div className="type-meta truncate tabular-nums">
                                  {rec.userDepartmentOrRoom || rec.userRole} · {rec.time} {lang === 'th' ? 'น.' : ''}
                                  {rec.location?.distanceMeters !== undefined ? ` · ${rec.location.distanceMeters} ม.` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
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

                {/* Clean Card Footer */}
                <div className="no-print px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-2 type-meta">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDashboardTab('live_attendance')}
                      className="font-semibold text-[var(--color-primary-text)] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{lang === 'th' ? `เช็คชื่อสด (${displayRecords.length})` : `Live Feed (${displayRecords.length})`}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerMode('guardian_line')}
                      className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-text-title)] cursor-pointer"
                    >
                      {lang === 'th' ? `LINE ${linePercent}% · ค่าเทอม` : `LINE ${linePercent}% · Billing`}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDashboardTab('insights')}
                    className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-primary-text)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ดูกราฟวิเคราะห์' : 'View Insights'}</span>
                  </button>
                </div>
              </section>

              {/* RIGHT PANE: Unified Today's Desk + Priority Actions */}
              <section
                data-guide-id="dashboard-today-desk"
                aria-label={lang === 'th' ? 'โต๊ะงานวันนี้และรายการเร่งด่วน' : 'Today’s Desk & Priority Actions'}
                className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
              >
                <div>
                  <div className="saas-card-header">
                    <div className="flex items-center gap-2 min-w-0">
                      <ClipboardList className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                      <h2 className="type-section-title truncate">
                        {isStaffUser
                          ? (lang === 'th' ? 'โต๊ะงานวันนี้ & รายการเร่งด่วน' : "Today's Desk & Actions")
                          : (lang === 'th' ? 'ตารางเรียน & งานวันนี้' : 'My Academic Desk')}
                      </h2>
                    </div>
                    <span className="type-meta tabular-nums shrink-0">{todayStr}</span>
                  </div>

                  {/* 3 Clean Action Rows */}
                  <div className="px-4 py-2 divide-y divide-[var(--color-border)] border-b border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => onNavigate('timetable')}
                      className="print-keep w-full py-2 flex items-center justify-between gap-2.5 text-left hover:bg-[var(--color-card-subtle)] rounded-lg px-1.5 -mx-1.5 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Calendar className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                        <div className="min-w-0">
                          <div className="type-card-title">{lang === 'th' ? 'ตารางสอนวันนี้' : 'Today’s Timetable'}</div>
                          <div className="type-meta truncate">
                            {todayScheduledSlots.length > 0
                              ? todayScheduledSlots.slice(0, 2).map((s) => `${s.courseCode} (${s.classRoom})`).join(' · ')
                              : (lang === 'th' ? 'ไม่มีคาบสอนวันนี้' : 'No classes scheduled')}
                          </div>
                        </div>
                      </div>
                      <span className="type-label font-bold tabular-nums shrink-0 inline-flex items-center gap-1">
                        {todayScheduledSlots.length} {lang === 'th' ? 'คาบ' : 'slots'}
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('attendance')}
                      className="print-keep w-full py-2 flex items-center justify-between gap-2.5 text-left hover:bg-[var(--color-card-subtle)] rounded-lg px-1.5 -mx-1.5 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCheck2 className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                        <div className="min-w-0">
                          <div className="type-card-title">{lang === 'th' ? 'ใบลารออนุมัติ' : 'Pending Leaves'}</div>
                          <div className="type-meta truncate">
                            {pendingLeaveCount > 0
                              ? (lang === 'th' ? 'รอการตรวจสอบ' : 'Requires review')
                              : (lang === 'th' ? 'ครบถ้วนแล้ว' : 'All reviewed')}
                          </div>
                        </div>
                      </div>
                      <span className={`type-label font-bold tabular-nums shrink-0 inline-flex items-center gap-1 ${pendingLeaveCount > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                        {pendingLeaveCount} {lang === 'th' ? 'รายการ' : 'items'}
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('homework')}
                      className="print-keep w-full py-2 flex items-center justify-between gap-2.5 text-left hover:bg-[var(--color-card-subtle)] rounded-lg px-1.5 -mx-1.5 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                        <div className="min-w-0">
                          <div className="type-card-title">{lang === 'th' ? 'การบ้านรอตรวจ' : 'Homework to Grade'}</div>
                          <div className="type-meta truncate">
                            {ungradedHomeworkCount > 0
                              ? (lang === 'th' ? 'รอให้คะแนน' : 'Awaiting score')
                              : (lang === 'th' ? 'ตรวจครบแล้ว' : 'All caught up')}
                          </div>
                        </div>
                      </div>
                      <span className="type-label font-bold tabular-nums shrink-0 inline-flex items-center gap-1">
                        {ungradedHomeworkCount} {lang === 'th' ? 'ชิ้น' : 'items'}
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </span>
                    </button>
                  </div>

                  {/* Embedded Priority Action List (zero nested border) */}
                  {isStaffUser && (
                    <PriorityActionWidget
                      embedded
                      students={students}
                      courses={courses}
                      attendance={attendance}
                      periodAttendance={periodAttendance}
                      leaveRequests={leaveRequests}
                      homeworkSubmissions={homeworkSubmissions}
                      assignments={assignments}
                      schoolId={school?.id || currentUser?.schoolId}
                      lang={lang}
                      onNavigate={onNavigate}
                      onSelectStudent={onSelectStudent}
                      compact={!isFocusMode}
                    />
                  )}
                </div>

                {/* Staff Quick Links Footer */}
                <div className="no-print px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-2 type-meta">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onNavigate('attendance')}
                      className="font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                    >
                      {lang === 'th' ? 'เช็คชื่อโฮมรูม' : 'Quick Roll Call'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('timetable')}
                      className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-text-title)] cursor-pointer"
                    >
                      {lang === 'th' ? 'หาครูสอนแทน' : 'Substitute Finder'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('gradebook')}
                      className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-text-title)] cursor-pointer"
                    >
                      {lang === 'th' ? 'สมุดคะแนน' : 'Gradebook'}
                    </button>
                  </div>
                  <span className="tabular-nums">
                    {courses.length} {lang === 'th' ? 'วิชา' : 'courses'} · {teachers.length} {lang === 'th' ? 'ครู' : 'staff'}
                  </span>
                </div>
              </section>
            </div>

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
        )}

        {/* TAB 2 (NEW): ANALYTICS & INSIGHTS (Separated from Daily Action Mode) */}
        {dashboardTab === 'insights' && (
          <div data-guide-id="dashboard-charts" className="dash-scroll-stack animate-in fade-in duration-150">
            {/* Insights Top Bar + Playyard Trigger */}
            <div className="no-print saas-alert-bar">
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span className="type-card-title truncate">
                  {lang === 'th' ? 'วิเคราะห์สถิติการมาเรียน ผลการเรียน และความก้าวหน้า' : 'Attendance Trends, Grade Analytics & Milestones'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = !playyardCollapsed;
                    setPlayyardCollapsed(next);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('baanpakkru_playyard_collapsed', next ? '1' : '0');
                    }
                  }}
                  className="btn-tool-neutral px-2.5 py-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>{playyardCollapsed ? (lang === 'th' ? 'มุมพักใจบ้านพักครู' : 'Show Playyard') : (lang === 'th' ? 'พับมุมพักใจ' : 'Hide Playyard')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerMode('guardian_line')}
                  className="btn-tool-neutral px-2.5 py-1"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? `ค่าเทอม & LINE (${linePercent}%)` : `Tuition & LINE (${linePercent}%)`}</span>
                </button>
              </div>
            </div>

            {!playyardCollapsed && (
              <BaanPakKruPlayyard
                variant="dashboard"
                compact
                lang={lang}
                initialMode={
                  isStaffUser && pendingLeaveCount === 0 && ungradedHomeworkCount === 0
                    ? 'cheer'
                    : 'chase'
                }
                statusNote={
                  isStaffUser && pendingLeaveCount === 0 && ungradedHomeworkCount === 0
                    ? lang === 'th'
                      ? 'งานค้างวันนี้เรียบร้อย! ชาร์โคล หมี และจิ๊ดริ๊ดมาฉลองให้คุณครูพักผ่อนครับ'
                      : 'All caught up! Charcoal, Mee & JidRid chicks are cheering.'
                    : undefined
                }
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <GradeLevelAnalyticsChart
                students={students}
                attendance={scopedAttendance}
                courses={courses}
                grades={grades}
                systemConfig={systemConfig}
                lang={lang}
              />
              <D3DailyAttendanceLineChart
                students={students}
                attendance={scopedAttendance}
                lang={lang}
              />
            </div>

            <MonthlyAttendanceChart
              attendance={scopedAttendance}
              students={students}
              lang={lang}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />

            {playerScores.length > 0 && (
              <MilestoneAchievementsPanel
                playerScores={playerScores}
                students={students}
                attendance={scopedAttendance}
                grades={grades}
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
                  <button
                    type="button"
                    onClick={handleExportSelectedDateCsv}
                    className="btn-icon-tool"
                    title={lang === 'th' ? `ส่งออก CSV วันที่ ${selectedDate}` : `Export CSV for ${selectedDate}`}
                    aria-label={lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'}
                  >
                    <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('mobile_checkin')}
                    className="btn-action-primary px-3 py-1.5"
                    title={lang === 'th' ? 'เปิดหน้ากล้องเช็คชื่อมือถือและสแกน NFC' : 'Open Mobile Camera & NFC Check-in'}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'เช็คชื่อมือถือ' : 'Check-in'}</span>
                  </button>
                </div>
              </div>

        {(attendanceStep === 'summary' || attendanceStep === 'analytics') && <>
        {/* Detailed Visual Analytics & Graphs Section */}
        <div className="saas-card-body space-y-5">
          {/* Summary Metric Counters (Single-elevation hairline divided grid) */}
          {attendanceStep === 'summary' && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
            <div className="p-3 text-center">
              <p className="type-meta flex items-center justify-center gap-1">
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'ทั้งหมด' : 'Total Logs'}</span>
              </p>
              <p className="type-kpi-sm mt-1">{totalForDate}</p>
              <p className="type-meta mt-0.5">{lang === 'th' ? 'รายการ' : 'records'}</p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เข้าเรียน' : 'Check-ins'}</span>
              </p>
              <p className="type-kpi-sm text-emerald-700 dark:text-emerald-300 mt-1">{checkInsCount}</p>
              <p className="type-meta text-emerald-700 dark:text-emerald-400 mt-0.5">{lang === 'th' ? `ตรงเวลา ${presentCount}` : `On-time: ${presentCount}`}</p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'มาสาย' : 'Late'}</span>
              </p>
              <p className="type-kpi-sm text-amber-700 dark:text-amber-300 mt-1">{lateCount}</p>
              <p className="type-meta text-amber-700 dark:text-amber-400 mt-0.5">{latePercent}%</p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1">
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ออกโรงเรียน' : 'Check-outs'}</span>
              </p>
              <p className="type-kpi-sm text-purple-700 dark:text-purple-300 mt-1">{checkOutsCount}</p>
              <p className="type-meta text-purple-700 dark:text-purple-400 mt-0.5">{lang === 'th' ? 'ช่วงเย็น' : 'Departures'}</p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ภาพถ่ายเซลฟี่' : 'Selfie'}</span>
              </p>
              <p className="type-kpi-sm text-blue-700 dark:text-blue-300 mt-1">{selfieCount}</p>
              <p className="type-meta text-blue-700 dark:text-blue-400 mt-0.5">{lang === 'th' ? 'ยืนยันตัวตน' : 'Verified'}</p>
            </div>
            <div className="p-3 text-center">
              <p className="type-meta flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'นร. / ครู' : 'Student / Staff'}</span>
              </p>
              <p className="type-kpi-sm mt-1">{studentCheckIns}/{teacherCheckIns}</p>
              <p className="type-meta mt-0.5">{lang === 'th' ? `นร. ${studentCheckIns} · ครู ${teacherCheckIns}` : `S: ${studentCheckIns} · T: ${teacherCheckIns}`}</p>
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

            {/* Monthly Trend Analytics */}
            <MonthlyAttendanceChart
              attendance={scopedAttendance}
              students={students}
              lang={lang}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />

            {/* Grade-Level Attendance & Academic Comparison */}
            <GradeLevelAnalyticsChart
              students={students}
              attendance={scopedAttendance}
              courses={courses}
              grades={grades}
              systemConfig={systemConfig}
              lang={lang}
            />
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
                        <img
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
                      <img
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
        {dashboardTab === 'innovative_hub' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-primary-text)]" />
                <h2 className="type-section-title">
                  {lang === 'th' ? 'นวัตกรรมการเรียนรู้ดิจิทัล' : 'Digital Learning Hub'}
                </h2>
              </div>
              <div className="saas-control-group">
                {[0, 1, 2].map((page) => (
                  <button key={page} type="button" onClick={() => setInnovationPage(page)} className={`px-2.5 py-1 rounded-md type-meta font-semibold cursor-pointer ${innovationPage === page ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'}`}>
                    {page + 1} / 3
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {[
                {
                  id: 'edu_battle_royale_3d',
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
                  id: 'study_streak_pass',
                  title: 'Study Streak & Quest Pass',
                  desc: lang === 'th' ? 'สะสมแต้มการเข้าเรียนต่อเนื่อง ปลดล็อกสกินการ์ดและเหรียญรางวัล' : 'Daily streak challenges, avatar card borders, and rewards',
                  icon: Flame,
                  color: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
                  badge: 'Gamified',
                  actionLabel: lang === 'th' ? 'ดูเควสต์' : 'View Quests',
                },
                {
                  id: 'coop_boss_raid',
                  title: 'Co-op Boss Raid',
                  desc: lang === 'th' ? 'รวมพลังตอบโจทย์ความยากระดับบอส ประสานงานพิชิตด่านร่วมกัน' : 'Collaborative classroom quiz raid with team boss battles',
                  icon: ShieldAlert,
                  color: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
                  badge: 'Multiplayer',
                  actionLabel: lang === 'th' ? 'เข้าร่วมเรดบอส' : 'Join Boss Raid',
                },
                {
                  id: 'real_world_snap_quest',
                  title: 'Real-World Snap Quest',
                  desc: lang === 'th' ? 'ถ่ายภาพปรากฏการณ์รอบตัวส่งตรวจด้วยการวิเคราะห์เชิงวิทยาศาสตร์' : 'Camera quest assignments linking real life to coursework',
                  icon: Camera,
                  color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
                  badge: 'Hands-on',
                  actionLabel: lang === 'th' ? 'ส่งเควสต์ภาพ' : 'Snap Quests',
                },
                {
                  id: 'subject_lab_simulation',
                  title: 'Subject Lab Simulation',
                  desc: lang === 'th' ? 'ห้องทดลองวิทยาศาสตร์และฟิสิกส์เสมือนจริง ทดลองผสมสารได้อย่างปลอดภัย' : 'Interactive STEM lab simulator with chemistry & optics modules',
                  icon: FlaskConical,
                  color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
                  badge: 'Interactive Lab',
                  actionLabel: lang === 'th' ? 'เปิดห้องแล็บ' : 'Launch Lab',
                },
                {
                  id: 'ai_diagnostic_learning',
                  title: 'AI Diagnostic Learning',
                  desc: lang === 'th' ? 'ระบบตรวจวินิจฉัยจุดอ่อนรายบุคคล แนะนำเนื้อหาเสริมเฉพาะจุดอย่างแม่นยำ' : 'Personalized diagnostic learning paths detecting knowledge gaps',
                  icon: BarChart3,
                  color: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
                  badge: 'Adaptive',
                  actionLabel: lang === 'th' ? 'ดูผลวินิจฉัย' : 'View Diagnostics',
                },
                {
                  id: 'hall_of_fame_3d',
                  title: '3D Hall of Fame',
                  desc: lang === 'th' ? 'หอเกียรติยศ 3 มิติ จัดแสดงผลงานยอดเยี่ยมและถ้วยรางวัลโรงเรียน' : 'Immersive 3D gallery honoring top academic and sports achievers',
                  icon: Trophy,
                  color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
                  badge: '3D Gallery',
                  actionLabel: lang === 'th' ? 'ชมหอเกียรติยศ' : 'Visit Hall of Fame',
                },
                {
                  id: 'executive_early_warning',
                  title: 'Executive Early Warning',
                  desc: lang === 'th' ? 'ระบบเตือนภัยล่วงหน้าตรวจจับนักเรียนเสี่ยงตกหล่นหรือขาดเรียนบ่อย' : 'Early warning intelligence identifying attendance & academic drop risks',
                  icon: ShieldAlert,
                  color: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
                  badge: 'Executive',
                  actionLabel: lang === 'th' ? 'วิเคราะห์ความเสี่ยง' : 'View Risk Alerts',
                },
              ].filter((_, index) => Math.floor(index / 3) === innovationPage).map((item) => (
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
                      onClick={() => onNavigate(item.id as any)}
                      className="btn-tool-tone px-3 py-1.5"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <PagedList items={announcements} pageSize={3} renderItem={(item) => (
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

              {/* Honor Students Card (1 col) */}
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
                            courses,
                            grades,
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
                <img
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
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedPhotoRecord.photoUrl || selectedPhotoRecord.userAvatar || '';
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
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="type-card-title flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{lang === 'th' ? 'การเชื่อมต่อ LINE ผู้ปกครอง' : 'Guardian LINE Sync'}</span>
                      </span>
                      <span className="type-kpi-sm text-emerald-700 dark:text-emerald-300">{linePercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${linePercent}%` }} />
                    </div>
                    <div className="flex items-center justify-between type-meta tabular-nums">
                      <span>{lang === 'th' ? `เชื่อมต่อแล้ว ${lineConnectedCount}/${totalStudents} ครอบครัว` : `${lineConnectedCount}/${totalStudents} connected`}</span>
                      <span>{lang === 'th' ? `ยังไม่ผูก ${Math.max(0, totalStudents - lineConnectedCount)}` : `${Math.max(0, totalStudents - lineConnectedCount)} pending`}</span>
                    </div>
                  </div>

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

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setDrawerMode(null); onNavigate('students'); }}
                      className="btn-tool-neutral px-3 py-2 justify-center"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'จัดการผู้ปกครอง' : 'Guardians'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDrawerMode(null); onNavigate('billing'); }}
                      className="btn-action-primary px-3 py-2 justify-center"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'เปิดหน้าการเงิน' : 'Open Billing'}</span>
                    </button>
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
