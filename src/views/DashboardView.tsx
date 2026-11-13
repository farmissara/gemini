import React, { useState, useMemo } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Receipt,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  QrCode,
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
  HeartPulse,
  SlidersHorizontal,
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
  BookOpen
} from 'lucide-react';
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
  TimetableSlot
} from '../types';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { NavTab } from '../components/layout/Sidebar';
import { getLocalDateString } from '../lib/date';
import { filterAttendanceForUser } from '../lib/attendanceScope';
import { PagedList } from '../components/PagedList';
import { MilestoneAchievementsPanel } from '../components/MilestoneAchievementsPanel';
import { MonthlyAttendanceChart } from '../components/MonthlyAttendanceChart';

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
  schoolPeriods?: SchoolPeriodTime[];
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
  schoolPeriods = [],
}) => {
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 2 * 86400000));

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'check_in' | 'check_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'live_attendance' | 'innovative_hub' | 'announcements'>('overview');
  const [innovationPage, setInnovationPage] = useState(0);
  const [attendanceStep, setAttendanceStep] = useState<'summary' | 'analytics' | 'records' | 'live_feed'>('summary');
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`eduverse_onboarding_dismissed_${school?.id || 'default'}`) === '1';
  });
  
  // Lightbox Modal for viewing captured selfie photo
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);
  const [photoModalStep, setPhotoModalStep] = useState<0 | 1>(0);

  const openPhotoRecord = (record: AttendanceRecord) => {
    setPhotoModalStep(0);
    setSelectedPhotoRecord(record);
  };

  // Teacher / Admin Today's Desk computations
  const todayDayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getDay()];
  const todayScheduledSlots = useMemo(() => {
    const daySlots = timetableSlots.filter((s) => s.dayOfWeek === todayDayKey);
    if (currentUser?.role === 'teacher') {
      const teacherName = currentUser.fullNameTh || '';
      const mine = daySlots.filter((s) => s.teacherName === teacherName);
      return (mine.length > 0 ? mine : daySlots).slice().sort((a, b) => a.periodNumber - b.periodNumber);
    }
    return daySlots.slice().sort((a, b) => a.periodNumber - b.periodNumber);
  }, [timetableSlots, todayDayKey, currentUser]);
  const pendingLeaveCount = leaveRequests.filter((l) => l.status === 'pending').length;
  const ungradedHomeworkCount = homeworkSubmissions.filter((h) => h.status === 'submitted' || h.status === 'late').length;
  const isStaffUser = !currentUser?.role || currentUser.role === 'teacher' || currentUser.role === 'admin' || currentUser.role === 'super_admin';

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

  // Top honor students
  const topStudents = [...students].sort((a, b) => b.gpa - a.gpa).slice(0, 4);

  // Export selected date attendance to Excel CSV
  const handleExportSelectedDateCsv = () => {
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
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Compact Header & Subtabs Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-text-title)] truncate">
            {lang === 'th' ? systemConfig.schoolNameTh : systemConfig.schoolNameEn}
          </h1>
          <span className="hidden md:inline text-xs text-[var(--color-text-muted)] whitespace-nowrap">
            {lang === 'th'
              ? `ปีการศึกษา ${systemConfig.academicYear} • ${formatSemesterLabel(systemConfig.currentSemester)}`
              : `AY ${systemConfig.academicYear} • ${systemConfig.currentSemester}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setDashboardTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer whitespace-nowrap ${
              dashboardTab === 'overview'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ภาพรวม' : 'Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('live_attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer whitespace-nowrap ${
              dashboardTab === 'live_attendance'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'เช็กชื่อ & GPS สด' : 'Live GPS'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
              dashboardTab === 'live_attendance'
                ? 'bg-white/20 text-white'
                : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)]'
            }`}>
              {displayRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('innovative_hub')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer whitespace-nowrap ${
              dashboardTab === 'innovative_hub'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${dashboardTab === 'innovative_hub' ? 'text-amber-300' : 'text-amber-600 dark:text-amber-400'}`} />
            <span>{lang === 'th' ? 'นวัตกรรม & เควสต์' : 'Innovations'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('announcements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer whitespace-nowrap ${
              dashboardTab === 'announcements'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ประกาศ' : 'News'}</span>
          </button>

          {['admin', 'super_admin', 'teacher'].includes(currentUser?.role || 'admin') && (
            <button
              type="button"
              onClick={() => onNavigate('executive_monitor')}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              title={lang === 'th' ? 'โหมดจอทีวี / ผู้อำนวยการ' : 'Director / TV Monitor'}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'จอทีวี' : 'TV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Panels Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {dashboardTab === 'overview' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {unclaimedCentralPacksCount > 0 &&
              (!currentUser?.role || currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100 font-semibold">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>
                      มีข้อสอบกลางชุดใหม่ {unclaimedCentralPacksCount} ชุด รอรับเข้าคลังโรงเรียน
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {currentUser?.role === 'admin' && onOpenCentralExamPopup && (
                      <button
                        type="button"
                        onClick={onOpenCentralExamPopup}
                        className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer whitespace-nowrap"
                      >
                        รับข้อสอบ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate('central_exam_hub')}
                      className="px-2.5 py-1 rounded-md border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-semibold hover:bg-amber-100 cursor-pointer whitespace-nowrap"
                    >
                      คลังข้อสอบกลาง
                    </button>
                  </div>
                </div>
              )}

            {/* 4 Balanced High-level Overview KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total Students */}
              <div className="p-3.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'นักเรียนทั้งหมด' : 'Total Students'}
                  </p>
                  <h3 className="text-2xl font-bold text-[var(--color-text-title)] mt-0.5 tabular-nums">
                    {totalStudents} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
                  </h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 font-semibold tabular-nums">
                    {activeStudents} {lang === 'th' ? 'คน สถานะปกติ' : 'active'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg tone-chip tone-1 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Selected Date Attendance Rate */}
              <div className="p-3.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'เข้าเรียนตรงเวลา' : 'On-Time Rate'} ({selectedDate === todayStr ? (lang === 'th' ? 'วันนี้' : 'Today') : selectedDate})
                  </p>
                  <h3 className="text-2xl font-bold text-[var(--color-text-title)] mt-0.5 tabular-nums">
                    {onTimePercent}%
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 font-medium tabular-nums">
                    {lang === 'th' ? `ตรงเวลา ${presentCount} • สาย ${lateCount}` : `On-time: ${presentCount} • Late: ${lateCount}`}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg tone-chip tone-2 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Tuition Collection */}
              <div className="p-3.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'จัดเก็บค่าเล่าเรียน' : 'Tuition Collection'}
                  </p>
                  <h3 className="text-2xl font-bold text-[var(--color-text-title)] mt-0.5 tabular-nums">
                    {collectionRate}%
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 font-medium tabular-nums">
                    ฿{totalCollected.toLocaleString()} / ฿{totalInvoiced.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg tone-chip tone-3 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>

              {/* LINE Guardian Sync */}
              <div className="p-3.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ผูก LINE ผู้ปกครอง' : 'LINE Guardian Sync'}
                  </p>
                  <h3 className="text-2xl font-bold text-[var(--color-text-title)] mt-0.5 tabular-nums">
                    {linePercent}%
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 font-medium tabular-nums">
                    {lineConnectedCount} / {totalStudents} {lang === 'th' ? 'รายชื่อ' : 'guardians'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg tone-chip tone-6 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* 3-Step Onboarding Checklist (Visible for Admins when incomplete) */}
            {showOnboardingCard && (
              <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'เริ่มต้นใช้งานโรงเรียนใน 3 ขั้นตอน' : '3-Step School Setup Checklist'}
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      ตั้งค่าระบบหลักให้พร้อมเปิดภาคเรียน ({completedOnboardingCount}/3 สำเร็จ)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingDismissed(true);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem(`eduverse_onboarding_dismissed_${school?.id || 'default'}`, '1');
                      }
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] font-semibold cursor-pointer whitespace-nowrap"
                  >
                    ซ่อนรายการนี้
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onNavigate('students')}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                  >
                    <div>
                      <div className="font-bold text-[var(--color-text-title)]">1. นำเข้าข้อมูลนักเรียน &amp; รายวิชา</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                        {students.length} นักเรียน • {courses.length} วิชา
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] whitespace-nowrap ${step1Done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                      {step1Done ? 'พร้อมแล้ว' : 'ดำเนินการ'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('system_settings')}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                  >
                    <div>
                      <div className="font-bold text-[var(--color-text-title)]">2. ตั้งค่าคาบเรียน &amp; พิกัด GPS</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                        {school?.latitude ? `GPS ${school.geofenceRadiusMeters || 200} ม.` : 'ยังไม่ได้ปักหมุด'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] whitespace-nowrap ${step2Done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                      {step2Done ? 'พร้อมแล้ว' : 'ตั้งค่า'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('timetable')}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                  >
                    <div>
                      <div className="font-bold text-[var(--color-text-title)]">3. จัดตารางเรียน &amp; ภาคเรียน</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                        {timetableSlots.length} คาบในระบบ
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] whitespace-nowrap ${step3Done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                      {step3Done ? 'พร้อมแล้ว' : 'จัดตาราง'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Teacher / Staff Today's Desk (Zero-Friction Operations) */}
            {isStaffUser && (
              <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                    <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'งานวันนี้สำหรับครู (Today’s Desk)' : 'Today’s Teaching Desk'}
                    </h2>
                    <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      ({todayStr})
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {todayScheduledSlots.length > 0
                      ? `มีตารางสอนวันนี้ ${todayScheduledSlots.length} คาบ (${todayScheduledSlots.slice(0, 3).map((s) => `${s.courseCode} ${s.classRoom}`).join(' • ')}${todayScheduledSlots.length > 3 ? ' ...' : ''})`
                      : 'วันนี้ไม่มีคาบสอนที่กำหนดไว้ในตาราง'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => onNavigate('timetable')}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold cursor-pointer whitespace-nowrap tabular-nums"
                  >
                    คาบสอนวันนี้: {todayScheduledSlots.length} คาบ
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('attendance')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer whitespace-nowrap tabular-nums ${
                      pendingLeaveCount > 0
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                    }`}
                  >
                    ใบลารออนุมัติ: {pendingLeaveCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('homework')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer whitespace-nowrap tabular-nums ${
                      ungradedHomeworkCount > 0
                        ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200'
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                    }`}
                  >
                    การบ้านรอตรวจ: {ungradedHomeworkCount}
                  </button>
                </div>
              </div>
            )}

            {/* Daily Student Attendance Trends Chart + Recent Gate Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <div className="xl:col-span-2 min-w-0">
                <MonthlyAttendanceChart
                  attendance={scopedAttendance}
                  students={students}
                  lang={lang}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => setSelectedDate(date)}
                />
              </div>

              {/* Realtime Attendance Feed Card */}
              <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-2.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'สแกนประตู & เข้าเรียนล่าสุด' : 'Recent Check-ins'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDashboardTab('live_attendance')}
                    className="text-xs text-[var(--color-primary-text)] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                  >
                    {lang === 'th' ? 'ดูทั้งหมด' : 'View All'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {displayRecords.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-6 text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? `ยังไม่มีบันทึกวันที่ ${selectedDate}` : `No records for ${selectedDate}`}
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {displayRecords.slice(0, 6).map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => openPhotoRecord(rec)}
                        className="py-2 flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-[var(--color-card-subtle)] rounded px-1 -mx-1 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={rec.photoUrl || rec.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={rec.userName}
                            className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--color-text-title)] truncate">
                              {rec.userName}
                            </div>
                            <div className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                              {rec.userDepartmentOrRoom || rec.userRole} • {rec.time} {lang === 'th' ? 'น.' : ''}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold shrink-0 ${
                          rec.status === 'present'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}>
                          {rec.status === 'present' ? (lang === 'th' ? 'ตรงเวลา' : 'On-time') : (lang === 'th' ? 'มาสาย' : 'Late')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
              {/* Compact Action & Date Filter Toolbar */}
              <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      selectedDate === todayStr 
                        ? 'bg-[var(--color-primary)] text-white' 
                        : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {lang === 'th' ? 'วันนี้' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(yesterdayStr)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      selectedDate === yesterdayStr 
                        ? 'bg-[var(--color-primary)] text-white' 
                        : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {lang === 'th' ? 'เมื่อวาน' : 'Yesterday'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(twoDaysAgoStr)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      selectedDate === twoDaysAgoStr 
                        ? 'bg-[var(--color-primary)] text-white' 
                        : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {lang === 'th' ? '2 วันก่อน' : '2 Days Ago'}
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] focus:outline-hidden"
                  />
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value as 'all' | 'student' | 'teacher')}
                    className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] focus:outline-hidden"
                  >
                    <option value="all">{lang === 'th' ? 'ทุกบทบาท' : 'All Roles'}</option>
                    <option value="student">{lang === 'th' ? 'นักเรียน' : 'Students'}</option>
                    <option value="teacher">{lang === 'th' ? 'ครู' : 'Teachers'}</option>
                  </select>
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value as 'all' | 'check_in' | 'check_out')}
                    className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] focus:outline-hidden"
                  >
                    <option value="all">{lang === 'th' ? 'เข้า & ออก' : 'All'}</option>
                    <option value="check_in">{lang === 'th' ? 'เข้าโรงเรียน' : 'Check-in'}</option>
                    <option value="check_out">{lang === 'th' ? 'ออกโรงเรียน' : 'Check-out'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportSelectedDateCsv}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ส่งออก Excel' : 'Export CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('mobile_checkin')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'เปิดกล้องเช็กชื่อ' : 'Open Camera'}</span>
                  </button>
                </div>
              </div>



        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[var(--color-border)] bg-[var(--color-card)]">
          <button type="button" onClick={() => setAttendanceStep('summary')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${attendanceStep === 'summary' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
            {lang === 'th' ? 'สรุปสถิติ' : 'Summary'}
          </button>
          <button type="button" onClick={() => setAttendanceStep('analytics')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${attendanceStep === 'analytics' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
            {lang === 'th' ? 'กราฟ' : 'Charts'}
          </button>
          <button type="button" onClick={() => setAttendanceStep('records')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${attendanceStep === 'records' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
            {lang === 'th' ? `รายการภาพถ่าย (${displayRecords.length})` : `Photo Records (${displayRecords.length})`}
          </button>
          <button type="button" onClick={() => setAttendanceStep('live_feed')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${attendanceStep === 'live_feed' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
            {lang === 'th' ? 'รายการสด' : 'Live Feed'}
          </button>
        </div>

        {(attendanceStep === 'summary' || attendanceStep === 'analytics') && <>
        {/* Detailed Visual Analytics & Graphs Section */}
        <div className="p-5 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] space-y-5">
          {/* Summary Metric Counters */}
          {attendanceStep === 'summary' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs text-center">
              <p className="text-[11px] text-[var(--color-text-muted)] font-bold">{lang === 'th' ? 'บันทึกทั้งหมด' : 'Total Logs'}</p>
              <p className="text-xl font-bold text-[var(--color-text-title)] mt-0.5">{totalForDate}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{lang === 'th' ? 'รายการ' : 'records'}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs text-center">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center gap-1">
                <LogIn className="w-3 h-3" />
                <span>{lang === 'th' ? 'เข้าโรงเรียน' : 'Check-ins'}</span>
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{checkInsCount}</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">{lang === 'th' ? `ตรงเวลา ${presentCount}` : `On-time: ${presentCount}`}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs text-center">
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{lang === 'th' ? 'มาสาย' : 'Late'}</span>
              </p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{lateCount}</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">{latePercent}% {lang === 'th' ? 'ของทั้งหมด' : 'of total'}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs text-center">
              <p className="text-[11px] text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center gap-1">
                <LogOut className="w-3 h-3" />
                <span>{lang === 'th' ? 'ออกโรงเรียน' : 'Check-outs'}</span>
              </p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">{checkOutsCount}</p>
              <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-0.5">{lang === 'th' ? 'ออกช่วงเย็น' : 'Departures'}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs text-center">
              <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center gap-1">
                <Camera className="w-3 h-3" />
                <span>{lang === 'th' ? 'มีรูปภาพเซลฟี่' : 'Selfie Verified'}</span>
              </p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{selfieCount}</p>
              <p className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5">{lang === 'th' ? 'มีหลักฐานภาพถ่าย' : 'With photo proof'}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs text-center">
              <p className="text-[11px] text-[var(--color-text-muted)] font-bold">{lang === 'th' ? 'สัดส่วน นร./ครู' : 'Students / Teachers'}</p>
              <p className="text-xl font-bold text-[var(--color-text-title)] mt-0.5">{studentCheckIns}/{teacherCheckIns}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{lang === 'th' ? `นร. ${studentCheckIns} • ครู ${teacherCheckIns}` : `S: ${studentCheckIns} • T: ${teacherCheckIns}`}</p>
            </div>
          </div>
          )}

          {/* Interactive Graph 1: Hourly Arrival & Departure Curve */}
          {attendanceStep === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Hourly Distribution Bar Chart */}
              <div className="lg:col-span-2 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                      <span>{lang === 'th' ? 'กราฟแสดงการเดินทางเข้า-ออกโรงเรียนรายช่วงเวลา' : 'Traffic Distribution by Time Window'}</span>
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {lang === 'th'
                        ? `วิเคราะห์ความหนาแน่นของการผ่านเขตพื้นที่และประตูโรงเรียนในวันที่ ${selectedDate}`
                        : `Hourly traffic load at school perimeter on ${selectedDate}`}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-text-body)]">
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
              <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>{lang === 'th' ? 'ดัชนีความตรงเวลา & ความปลอดภัย GPS' : 'Punctuality & GPS Integrity'}</span>
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    {lang === 'th' ? 'ตรวจสอบระยะห่างจากใจกลางสถานศึกษา' : 'Geofence proximity index verification'}
                  </p>
                </div>

                {/* Quality Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-body)] font-bold">{lang === 'th' ? 'อัตราเข้าเรียนตรงเวลา:' : 'On-Time Rate:'}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">{onTimePercent}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] overflow-hidden flex">
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
                  <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                      <span>{lang === 'th' ? `ตรงเวลา (${presentCount})` : `On-time (${presentCount})`}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      <span>{lang === 'th' ? `มาสาย (${lateCount})` : `Late (${lateCount})`}</span>
                    </span>
                  </div>
                </div>

                {/* Geofence verification summary */}
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950 dark:text-blue-200">
                    <MapPin className="w-3.5 h-3.5 text-blue-800 dark:text-blue-300" />
                    <span>{lang === 'th' ? 'รั้วเสมือน GPS Geofence (รัศมี 300 ม.)' : 'GPS Geofence Perimeter (300m)'}</span>
                  </div>
                  <p className="text-blue-900 dark:text-blue-200 leading-relaxed text-[11px]">
                    {lang === 'th'
                      ? 'ทุกคนที่ลงชื่อผ่านมือถือในระบบนี้ ได้รับการบันทึกภาพถ่ายเซลฟี่จริง พร้อมประทับตราพิกัดระยะห่าง และเวลาที่ตรวจสอบย้อนหลังได้'
                      : 'All mobile check-ins capture facial selfies with verified timestamp and proximity coordinates.'}
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
          </div>
          )}
        </div>
        </>}

        {attendanceStep === 'records' && <>
        {/* Gallery / Cards of Recent Selfie Check-ins with Click-to-View Modal */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <span>{lang === 'th' ? `ภาพถ่ายเช็กชื่อล่าสุดในวันที่เลือก (${selectedDate})` : `Selfie Verification Logs (${selectedDate})`}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-bold text-xs">
                  {displayRecords.length} {lang === 'th' ? 'รายการ' : 'records'}
                </span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'คลิกที่รูปภาพหรือการ์ดเพื่อเปิดดูรูปถ่ายขนาดใหญ่พร้อมรายละเอียดวัน-เวลาและพิกัดย้อนหลัง'
                  : 'Click on any record card to inspect high-resolution selfie proof and metadata.'}
              </p>
            </div>

            {/* Simple Text Search inside table */}
            <input
              type="text"
              placeholder={lang === 'th' ? 'ค้นหาชื่อ, รหัสนักเรียน, หรือห้อง...' : 'Search student name, ID, or room...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-title)] bg-[var(--color-card-subtle)] placeholder-[var(--color-text-muted)] w-full sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {displayRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2">
              <Camera className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? `ไม่พบบันทึกเช็กชื่อในวันที่เลือก (${selectedDate})` : `No records found for ${selectedDate}`}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'ลองเลือกดูวันที่อื่น เช่น วันนี้ หรือเมื่อวาน หรือกด "ถ่ายรูปเช็กชื่อมือถือ" เพื่อบันทึกข้อมูลใหม่'
                  : 'Try selecting another date or use Mobile Check-in to capture a new record.'}
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer"
              >
                {lang === 'th' ? 'กลับมาดูวันนี้' : 'Back to Today'}
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
                const photoSrc = rec.photoUrl || rec.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';

                return (
                  <div
                    key={rec.id}
                    onClick={() => openPhotoRecord(rec)}
                    className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 shadow-2xs hover:shadow-md hover:border-[var(--color-primary)] transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    {/* Top Row: Type & Timestamp */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {isCheckOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 text-[11px] font-bold border border-purple-300 dark:border-purple-700">
                            <LogOut className="w-3 h-3" />
                            <span>{lang === 'th' ? 'ออกโรงเรียน' : 'Exit'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[11px] font-bold border border-emerald-300 dark:border-emerald-700">
                            <LogIn className="w-3 h-3" />
                            <span>{lang === 'th' ? 'เข้าโรงเรียน' : 'Entry'}</span>
                          </span>
                        )}
                        {isTeacher ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-300 dark:border-indigo-700">
                            {lang === 'th' ? 'ครู' : 'Teacher'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] font-bold">
                            {lang === 'th' ? 'นร.' : 'Student'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[var(--color-text-body)]">
                        <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                        <span>{rec.time} {lang === 'th' ? 'น.' : ''}</span>
                      </div>
                    </div>

                    {/* Middle: Photo & Person Info */}
                    <div className="flex items-center gap-3">
                      {/* Photo Thumbnail with Zoom Icon on Hover */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[var(--color-card)] border border-[var(--color-border)] shrink-0 group-hover:ring-2 group-hover:ring-[var(--color-primary)] transition">
                        <img
                          src={photoSrc}
                          alt={rec.userName || 'Check-in photo'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-5 h-5 drop-shadow" />
                        </div>
                        {rec.photoUrl && (
                          <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-[var(--color-primary)] text-white text-[9px] shadow-xs">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-bold text-xs text-[var(--color-text-title)] truncate">
                          {rec.userName || (lang === 'th' ? 'ผู้ใช้งานระบบ' : 'System User')}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                          {rec.userDepartmentOrRoom || rec.userRole || (lang === 'th' ? 'โรงเรียน' : 'School')}
                        </p>
                        <div className="pt-0.5">
                          {rec.status === 'present' ? (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{lang === 'th' ? 'ตรงเวลา' : 'On-time'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{lang === 'th' ? 'มาสาย' : 'Late'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata: GPS & Action Prompt */}
                    <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                      <div className="flex items-center gap-1 truncate font-medium">
                        <MapPin className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                        <span className="truncate">
                          {rec.location?.distanceMeters !== undefined 
                            ? (lang === 'th' ? `ห่าง ${rec.location.distanceMeters} ม.` : `${rec.location.distanceMeters}m away`)
                            : (lang === 'th' ? 'ในเขตพื้นที่โรงเรียน' : 'On campus')}
                        </span>
                      </div>

                      <span className="text-[var(--color-primary-text)] font-bold group-hover:underline flex items-center gap-0.5 shrink-0 text-[10px]">
                        <span>{lang === 'th' ? 'ดูรูปเต็ม' : 'View Full'}</span>
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
            <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                  <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'บันทึกการผ่านประตูและเข้าเรียนวันนี้' : 'Live Gate & Class Check-in Feed'}
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-700">
                    {lang === 'th' ? 'สด' : 'Live'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="text-xs text-[var(--color-primary-text)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  {lang === 'th' ? 'ดูบันทึกทั้งหมด' : 'View All'} <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                <PagedList items={displayRecords.slice(0, 8)} pageSize={4} renderItem={(rec) => (
                  <div
                    key={rec.id}
                    onClick={() => openPhotoRecord(rec)}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-[var(--color-card-subtle)] rounded-lg px-2 transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={rec.photoUrl || rec.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                        alt={rec.userName}
                        className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--color-text-title)]">
                            {rec.userName}
                          </span>
                          <span className="text-[var(--color-text-muted)] font-mono text-[11px]">
                            ({rec.studentId})
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          {rec.userDepartmentOrRoom || rec.userRole} • {lang === 'th' ? `เวลา ${rec.time} น.` : rec.time} • {rec.recordType === 'check_out' ? (lang === 'th' ? 'ออก' : 'Exit') : (lang === 'th' ? 'เข้า' : 'Entry')}
                        </div>
                      </div>
                    </div>

                    <div>
                      {rec.status === 'present' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold text-[11px] border border-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{lang === 'th' ? 'ตรงเวลา' : 'On-time'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold text-[11px] border border-amber-300 dark:border-amber-700">
                          <Clock className="w-3 h-3" />
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
                <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'นวัตกรรมการเรียนรู้ดิจิทัล & เกมมิฟิเคชัน' : 'Digital Learning & Gamification Hub'}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((page) => (
                  <button key={page} type="button" onClick={() => setInnovationPage(page)} className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${innovationPage === page ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
                    {page + 1} / 3
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {[
                {
                  id: 'edu_battle_royale_3d',
                  title: lang === 'th' ? 'EduBattle Royale 3D' : 'EduBattle Royale 3D',
                  desc: lang === 'th' ? 'สมรภูมิประลองปัญญา 3D แข่งตอบคำถามชิงตำแหน่งแชมป์' : '3D interactive academic quiz battle arena with live avatars',
                  icon: Swords,
                  color: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
                  badge: '3D Realtime',
                  badgeColor: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700',
                  actionLabel: lang === 'th' ? 'เข้าสู่สนาม 3D' : 'Enter 3D Arena',
                },
                {
                  id: 'socratic_tutor',
                  title: lang === 'th' ? 'Socratic AI Tutor' : 'Socratic AI Tutor',
                  desc: lang === 'th' ? 'ผู้ช่วยติวอัจฉริยะที่ใช้หลักตั้งคำถามกระตุ้นกระบวนการคิด' : 'Inquiry-based AI learning mentor guiding critical thinking',
                  icon: BrainCircuit,
                  color: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700',
                  badge: 'AI Powered',
                  badgeColor: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-700',
                  actionLabel: lang === 'th' ? 'เริ่มติวกับ AI' : 'Start Tutoring',
                },
                {
                  id: 'study_streak_pass',
                  title: lang === 'th' ? 'Study Streak & Quest Pass' : 'Study Streak & Quest Pass',
                  desc: lang === 'th' ? 'สะสมแต้มการเข้าเรียนต่อเนื่อง ปลดล็อกสกินการ์ดและเหรียญรางวัล' : 'Daily streak challenges, avatar card borders, and rewards',
                  icon: Flame,
                  color: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
                  badge: 'Gamified',
                  badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
                  actionLabel: lang === 'th' ? 'ดูเควสต์ประจำวัน' : 'View Quests',
                },
                {
                  id: 'coop_boss_raid',
                  title: lang === 'th' ? 'Co-op Boss Raid' : 'Co-op Boss Raid',
                  desc: lang === 'th' ? 'รวมพลังตอบโจทย์ความยากระดับบอส ประสานงานพิชิตด่านร่วมกัน' : 'Collaborative classroom quiz raid with team boss battles',
                  icon: ShieldAlert,
                  color: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
                  badge: 'Multiplayer',
                  badgeColor: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-700',
                  actionLabel: lang === 'th' ? 'เข้าร่วมเรดบอส' : 'Join Boss Raid',
                },
                {
                  id: 'real_world_snap_quest',
                  title: lang === 'th' ? 'Real-World Snap Quest' : 'Real-World Snap Quest',
                  desc: lang === 'th' ? 'ถ่ายภาพปรากฏการณ์รอบตัวส่งตรวจด้วยการวิเคราะห์เชิงวิทยาศาสตร์' : 'Camera quest assignments linking real life to coursework',
                  icon: Camera,
                  color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
                  badge: 'Hands-on',
                  badgeColor: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700',
                  actionLabel: lang === 'th' ? 'ส่งเควสต์ภาพถ่าย' : 'Snap Quests',
                },
                {
                  id: 'subject_lab_simulation',
                  title: lang === 'th' ? 'Subject Lab Simulation' : 'Subject Lab Simulation',
                  desc: lang === 'th' ? 'ห้องทดลองวิทยาศาสตร์และฟิสิกส์เสมือนจริง ทดลองผสมสารได้อย่างปลอดภัย' : 'Interactive STEM lab simulator with chemistry & optics modules',
                  icon: FlaskConical,
                  color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
                  badge: 'Interactive Lab',
                  badgeColor: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700',
                  actionLabel: lang === 'th' ? 'เปิดห้องแล็บ' : 'Launch Lab',
                },
                {
                  id: 'ai_diagnostic_learning',
                  title: lang === 'th' ? 'AI Diagnostic Learning' : 'AI Diagnostic Learning',
                  desc: lang === 'th' ? 'ระบบตรวจวินิจฉัยจุดอ่อนรายบุคคล แนะนำเนื้อหาเสริมเฉพาะจุดอย่างแม่นยำ' : 'Personalized diagnostic learning paths detecting knowledge gaps',
                  icon: BarChart3,
                  color: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
                  badge: 'Adaptive',
                  badgeColor: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
                  actionLabel: lang === 'th' ? 'ดูผลวินิจฉัย' : 'View Diagnostics',
                },
                {
                  id: 'hall_of_fame_3d',
                  title: lang === 'th' ? '3D Hall of Fame' : '3D Hall of Fame',
                  desc: lang === 'th' ? 'หอเกียรติยศ 3 มิติ จัดแสดงผลงานยอดเยี่ยมและถ้วยรางวัลโรงเรียน' : 'Immersive 3D gallery honoring top academic and sports achievers',
                  icon: Trophy,
                  color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
                  badge: '3D Gallery',
                  badgeColor: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700',
                  actionLabel: lang === 'th' ? 'ชมหอเกียรติยศ' : 'Visit Hall of Fame',
                },
                {
                  id: 'executive_early_warning',
                  title: lang === 'th' ? 'Executive Early Warning' : 'Executive Early Warning',
                  desc: lang === 'th' ? 'ระบบเตือนภัยล่วงหน้าตรวจจับนักเรียนเสี่ยงตกหล่นหรือขาดเรียนบ่อย' : 'Early warning intelligence identifying attendance & academic drop risks',
                  icon: ShieldAlert,
                  color: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
                  badge: 'Executive',
                  badgeColor: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-300 dark:border-red-700',
                  actionLabel: lang === 'th' ? 'ตรวจวิเคราะห์ความเสี่ยง' : 'View Risk Alerts',
                },
              ].filter((_, index) => Math.floor(index / 3) === innovationPage).map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs hover:border-[var(--color-primary)] transition flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl border ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-title)] group-hover:text-[var(--color-primary-text)] transition">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'พร้อมใช้งาน' : 'Ready'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.id as any)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:text-white border border-[var(--color-border)] text-xs font-bold transition cursor-pointer"
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
              <div className="lg:col-span-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-[var(--color-primary)]" />
                    <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ข่าวสารและประกาศสำคัญของโรงเรียน' : 'Official School Announcements'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('announcements')}
                    className="text-xs text-[var(--color-primary-text)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {lang === 'th' ? 'ดูประกาศทั้งหมด' : 'All Announcements'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <PagedList items={announcements} pageSize={2} renderItem={(item) => (
                    <div key={item.id} className="p-3.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--color-text-title)]">{item.title}</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">{item.publishedAt}</span>
                        </div>
                        <p className="text-[var(--color-text-body)] line-clamp-3 text-[11px] leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                        <span>{lang === 'th' ? `โดย: ${item.author}` : `By: ${item.author}`}</span>
                        <span className="text-[10px] font-semibold text-[var(--color-primary-text)]">
                          {item.authorRole}
                        </span>
                      </div>
                    </div>
                  )} />
                </div>
              </div>

              {/* Honor Students Card (1 col) */}
              <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'นักเรียนผลการเรียนดีเด่น' : 'Honor Students Roll'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('gradebook')}
                    className="text-xs text-[var(--color-primary-text)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {lang === 'th' ? 'สมุดคะแนน' : 'Gradebook'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <PagedList items={topStudents} pageSize={3} renderItem={(st, idx) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 text-center font-bold text-[var(--color-text-muted)] text-xs">
                          #{idx + 1}
                        </div>
                        <img
                          src={st.avatarUrl}
                          alt={st.firstNameEn}
                          className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]"
                        />
                        <div>
                          <div className="font-bold text-[var(--color-text-title)]">
                            {lang === 'th' ? `${st.firstNameTh} ${st.lastNameTh}` : `${st.firstNameEn} ${st.lastNameEn}`}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-muted)]">
                            {lang === 'th' ? `ชั้น ${st.gradeLevel} ห้อง ${st.room}` : `Grade ${st.gradeLevel} / ${st.room}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[var(--color-primary-text)] font-mono text-sm">
                          {st.gpa.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] font-medium">GPA</div>
                      </div>
                    </div>
                  )} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal: Captured Selfie Photo & Metadata */}
      {selectedPhotoRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-card-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'รูปถ่ายเช็กชื่อยืนยันตัวตน' : 'Selfie Verification Proof'}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th' ? `วันที่ ${selectedPhotoRecord.date} • เวลา ${selectedPhotoRecord.time} น.` : `${selectedPhotoRecord.date} at ${selectedPhotoRecord.time}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoRecord(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-hidden">
              {/* Captured Photo Container */}
              {photoModalStep === 0 && <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 max-h-56 mx-auto shadow-inner border border-slate-800 flex items-center justify-center">
                <img
                  src={selectedPhotoRecord.photoUrl || selectedPhotoRecord.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'}
                  alt={selectedPhotoRecord.userName}
                  className="w-full h-full object-contain"
                />

                {/* Live Watermark on Photo */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-xl bg-black/80 backdrop-blur-md text-white text-[10px] space-y-0.5 border border-white/25">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-cyan-300">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{systemConfig.schoolNameTh} • VERIFIED CHECK</span>
                    </span>
                    <span className="font-mono">{selectedPhotoRecord.time} {lang === 'th' ? 'น.' : ''}</span>
                  </div>
                  <div className="flex items-center justify-between text-white">
                    <span>{selectedPhotoRecord.userName} ({selectedPhotoRecord.userDepartmentOrRoom || selectedPhotoRecord.userRole})</span>
                    <span>{selectedPhotoRecord.recordType === 'check_out' ? (lang === 'th' ? 'ออกโรงเรียน' : 'Exit') : (lang === 'th' ? 'เข้าโรงเรียน' : 'Entry')}</span>
                  </div>
                  <div className="text-[9px] text-slate-200 font-mono truncate">
                    GPS: {selectedPhotoRecord.location?.lat || 13.7367}, {selectedPhotoRecord.location?.lng || 100.5231} • {lang === 'th' ? `ห่าง ${selectedPhotoRecord.location?.distanceMeters || 18} ม.` : `${selectedPhotoRecord.location?.distanceMeters || 18}m away`}
                  </div>
                </div>
              </div>}

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--color-text-muted)] font-semibold">{photoModalStep + 1} / 2</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPhotoModalStep(0)} disabled={photoModalStep === 0} className="px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-bold disabled:opacity-40 cursor-pointer">
                    {lang === 'th' ? 'ภาพถ่าย' : 'Photo'}
                  </button>
                  <button type="button" onClick={() => setPhotoModalStep(1)} disabled={photoModalStep === 1} className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold disabled:opacity-40 cursor-pointer">
                    {lang === 'th' ? 'รายละเอียด' : 'Details'}
                  </button>
                </div>
              </div>

              {/* Information Grid */}
              {photoModalStep === 1 && <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">{lang === 'th' ? 'ชื่อผู้ลงชื่อ' : 'Name'}</span>
                  <p className="font-bold text-[var(--color-text-title)]">{selectedPhotoRecord.userName}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {selectedPhotoRecord.userRole} • {selectedPhotoRecord.userDepartmentOrRoom}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">{lang === 'th' ? 'ประเภทและสถานะ' : 'Type & Status'}</span>
                  <div className="flex items-center gap-2">
                    {selectedPhotoRecord.recordType === 'check_out' ? (
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 font-bold text-[11px]">
                        {lang === 'th' ? 'เช็กชื่อออก' : 'Check-out'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold text-[11px]">
                        {lang === 'th' ? 'เช็กชื่อเข้า' : 'Check-in'}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      selectedPhotoRecord.status === 'present' ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700' : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                    }`}>
                      {selectedPhotoRecord.status === 'present' ? (lang === 'th' ? 'ตรงเวลา' : 'On-time') : (lang === 'th' ? 'มาสาย' : 'Late')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] font-mono">
                    {lang === 'th' ? `บันทึกเวลา: ${selectedPhotoRecord.time} น.` : `Time: ${selectedPhotoRecord.time}`}
                  </p>
                </div>

                <div className="col-span-2 p-3 rounded-xl bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 space-y-1">
                  <span className="text-[10px] text-blue-950 dark:text-blue-200 font-bold uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-800 dark:text-blue-300" />
                    <span>{lang === 'th' ? 'ข้อมูลตำแหน่ง GPS & รั้วเสมือน (Geofence)' : 'GPS & Geofence Coordinates'}</span>
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-blue-950 dark:text-blue-100">
                    <div>
                      <span className="font-bold">{lang === 'th' ? 'จุดตรวจ: ' : 'Gate Zone: '}</span>
                      <span>{selectedPhotoRecord.location?.geofenceZoneName || (lang === 'th' ? 'ประตูโรงเรียน' : 'Main Gate')}</span>
                    </div>
                    <div className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">
                      {lang === 'th' ? `ระยะห่าง: ${selectedPhotoRecord.location?.distanceMeters || 18} เมตร (อยู่ในเขต)` : `Distance: ${selectedPhotoRecord.location?.distanceMeters || 18}m (Verified)`}
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-900 dark:text-blue-200 italic pt-0.5">
                    {lang === 'th'
                      ? `หมายเหตุ: ${selectedPhotoRecord.remarks || 'ลงชื่อผ่านโทรศัพท์ด้วยการถ่ายภาพหน้าและตรวจสอบพิกัด Geofence'}`
                      : `Remarks: ${selectedPhotoRecord.remarks || 'Facial selfie verified with geofenced location'}`}
                  </p>
                </div>
              </div>}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                ID: {selectedPhotoRecord.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedPhotoRecord.photoUrl || selectedPhotoRecord.userAvatar || '';
                    link.download = `selfie_${selectedPhotoRecord.userName}_${selectedPhotoRecord.date}.jpg`;
                    link.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'บันทึกรูปภาพ' : 'Save Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoRecord(null)}
                  className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition cursor-pointer"
                >
                  {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
