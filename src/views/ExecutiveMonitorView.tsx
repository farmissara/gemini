import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  HeartPulse,
  Maximize2,
  Minimize2,
  Monitor,
  Pause,
  Play,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Announcement,
  AppLanguage,
  AttendanceRecord,
  BehaviorRecord,
  Course,
  GradeRecord,
  HomeworkSubmission,
  InfirmaryVisit,
  LeaveRequest,
  PeriodAttendanceRecord,
  School,
  SchoolPeriodTime,
  SdqAssessment,
  Student,
  Teacher,
  TimetableSlot,
  TuitionInvoice,
} from '../types';
import { NavTab } from '../components/layout/Sidebar';
import { getLocalDateString } from '../lib/date';
import { calculateGrade } from '../lib/schoolSettings';
import { calculateStudentAcademicSummary } from '../lib/moeGrading';
import { getModuleTone } from '../lib/moduleTheme';
import { getBangkokClockSnapshot } from '../lib/timetableCalendar';

type MonitorLens = 'overview' | 'rooms' | 'academics' | 'tv';
type TimeframeScope = 'today' | '7d' | '30d' | 'term';
type RoomSortKey = 'room' | 'attendance_asc' | 'gpa_asc' | 'homework_desc';
type RoomStatusFilter = 'all' | 'watch' | 'normal';
type PeriodAuditFilter = 'all' | 'pending' | 'submitted';

interface ExecutiveMonitorViewProps {
  activeSchool: School;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  schoolPeriods?: SchoolPeriodTime[];
  invoices: TuitionInvoice[];
  canViewFinancials?: boolean;
  announcements: Announcement[];
  infirmaryVisits: InfirmaryVisit[];
  behaviorRecords: BehaviorRecord[];
  sdqAssessments: SdqAssessment[];
  homeworkSubmissions: HomeworkSubmission[];
  leaveRequests: LeaveRequest[];
  lang: AppLanguage;
  onOpenGradebookCourse?: (courseId?: string) => void;
  onNavigate: (tab: NavTab) => void;
  onLoadAttendanceRange?: (startDate?: string | null, endDate?: string | null) => Promise<void> | void;
}

const DAY_KEY_LABELS_TH: Record<string, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
  sat: 'เสาร์',
  sun: 'อาทิตย์',
};

export const ExecutiveMonitorView: React.FC<ExecutiveMonitorViewProps> = ({
  activeSchool,
  students,
  teachers,
  courses,
  grades,
  attendance,
  periodAttendance = [],
  timetableSlots = [],
  schoolPeriods = [],
  invoices,
  canViewFinancials = true,
  announcements,
  infirmaryVisits,
  behaviorRecords,
  sdqAssessments,
  homeworkSubmissions,
  leaveRequests,
  onOpenGradebookCourse,
  onNavigate,
  onLoadAttendanceRange,
}) => {
  const [lens, setLens] = useState<MonitorLens>('overview');
  const [timeframe, setTimeframe] = useState<TimeframeScope>('today');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('all');
  const [autoRefreshSec, setAutoRefreshSec] = useState<0 | 30 | 60 | 300>(60);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(() => new Date());
  const [copiedBrief, setCopiedBrief] = useState(false);

  // Room Matrix controls
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatusFilter>('all');
  const [roomSort, setRoomSort] = useState<RoomSortKey>('attendance_asc');

  // Academic & Period audit controls
  const [periodAuditFilter, setPeriodAuditFilter] = useState<PeriodAuditFilter>('all');
  const [courseSearch, setCourseSearch] = useState('');

  // TV Wallboard controls
  const [tvSlide, setTvSlide] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = getLocalDateString();
  const bangkokNow = useMemo(() => getBangkokClockSnapshot(now), [now]);
  const isTvMode = lens === 'tv';

  // Live digital clock
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Optional auto-refresh pulse for executives keeping monitor open all day
  useEffect(() => {
    if (autoRefreshSec === 0) return;
    const id = window.setInterval(() => {
      setRefreshTick((t) => t + 1);
      setLastRefreshedAt(new Date());
    }, autoRefreshSec * 1000);
    return () => window.clearInterval(id);
  }, [autoRefreshSec]);

  // Auto-rotate slides in TV Mode every 15 seconds
  useEffect(() => {
    if (!isTvMode || !autoRotate) return;
    const id = window.setInterval(() => {
      setTvSlide((prev) => (prev + 1) % 4);
    }, 15000);
    return () => window.clearInterval(id);
  }, [isTvMode, autoRotate]);

  // Listen to browser fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
    setLastRefreshedAt(new Date());
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Safe fallback inside sandboxed iframes
    }
  };

  // Distinct sorted grade levels from students
  const gradeLevelOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.gradeLevel) set.add(s.gradeLevel);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [students]);

  // Students filtered by selectedGradeLevel
  const scopedStudents = useMemo(() => {
    if (selectedGradeLevel === 'all') return students;
    return students.filter((s) => s.gradeLevel === selectedGradeLevel);
  }, [students, selectedGradeLevel]);

  const scopedStudentIds = useMemo(() => new Set(scopedStudents.map((s) => s.id)), [scopedStudents]);

  // Date window boundary string (YYYY-MM-DD) for timeframe filter
  const dateFloorStr = useMemo(() => {
    if (timeframe === 'today') return todayStr;
    if (timeframe === '7d') return getLocalDateString(new Date(Date.now() - 6 * 86400000));
    if (timeframe === '30d') return getLocalDateString(new Date(Date.now() - 29 * 86400000));
    return '';
  }, [timeframe, todayStr]);

  useEffect(() => {
    if (!onLoadAttendanceRange) return;
    const currentYear = new Date().getFullYear();
    const start = dateFloorStr || (timeframe === 'term'
      ? `${new Date().getMonth() >= 4 ? currentYear : currentYear - 1}-05-01`
      : todayStr);
    void onLoadAttendanceRange(start, todayStr);
  }, [dateFloorStr, onLoadAttendanceRange, timeframe, todayStr]);

  // Scoped attendance records (gate)
  const scopedAttendance = useMemo(() => {
    return attendance.filter((a) => {
      if (a.userType !== 'teacher' && selectedGradeLevel !== 'all' && !scopedStudentIds.has(a.studentId)) {
        return false;
      }
      if (timeframe === 'today') return a.date === todayStr;
      if (dateFloorStr) return a.date >= dateFloorStr && a.date <= todayStr;
      return true;
    });
  }, [attendance, selectedGradeLevel, scopedStudentIds, timeframe, todayStr, dateFloorStr]);

  // Scoped period attendance
  const scopedPeriodAttendance = useMemo(() => {
    return periodAttendance.filter((p) => {
      if (selectedGradeLevel !== 'all' && !scopedStudentIds.has(p.studentId)) return false;
      if (timeframe === 'today') return p.date === todayStr;
      if (dateFloorStr) return p.date >= dateFloorStr && p.date <= todayStr;
      return true;
    });
  }, [periodAttendance, selectedGradeLevel, scopedStudentIds, timeframe, todayStr, dateFloorStr]);

  // Compute student GPAX map once
  const studentAcademicMap = useMemo(() => {
    const map = new Map<string, { hasGrades: boolean; gpax: number | null }>();
    scopedStudents.forEach((student) => {
      const sum = calculateStudentAcademicSummary({
        student,
        courses,
        grades,
        gradingSystem: activeSchool.gradingSystem || 'thai',
        currentAcademicYear: activeSchool.academicYear,
        currentSemester: activeSchool.currentSemester,
      });
      map.set(student.id, {
        hasGrades: sum.hasRecordedGrades && sum.gpax !== null && !sum.hideGpaCalculations,
        gpax: sum.hasRecordedGrades && sum.gpax !== null ? sum.gpax : null,
      });
    });
    return map;
  }, [scopedStudents, courses, grades, activeSchool.gradingSystem, activeSchool.academicYear, activeSchool.currentSemester]);

  // Period-by-Period Compliance Audit for today's day-of-week
  const todayPeriodAudit = useMemo(() => {
    const dayKey = bangkokNow.dayKey;
    const isWeekday = ['mon', 'tue', 'wed', 'thu', 'fri'].includes(dayKey);
    const todaySlots = isWeekday
      ? timetableSlots.filter((slot) => slot.dayOfWeek === dayKey)
      : [];

    const sortedSlots = [...todaySlots].sort(
      (a, b) => a.periodNumber - b.periodNumber || a.classRoom.localeCompare(b.classRoom, 'th')
    );

    const periodAttToday = periodAttendance.filter((p) => p.date === todayStr);

    return sortedSlots.map((slot) => {
      const matchingLogs = periodAttToday.filter(
        (rec) =>
          rec.periodNumber === slot.periodNumber &&
          (rec.courseId === slot.courseId || rec.courseCode === slot.courseCode)
      );
      const uniqueStudents = new Set(matchingLogs.map((r) => r.studentId));
      const presentOrLate = matchingLogs.filter((r) => r.status === 'present' || r.status === 'late').length;
      const periodTime = schoolPeriods.find((p) => p.periodNumber === slot.periodNumber);
      const timeLabel = periodTime
        ? `${periodTime.startTime}–${periodTime.endTime}`
        : `${slot.startTime}–${slot.endTime}`;

      return {
        slot,
        timeLabel,
        submittedCount: uniqueStudents.size,
        presentOrLate,
        isSubmitted: uniqueStudents.size > 0,
      };
    });
  }, [bangkokNow.dayKey, timetableSlots, periodAttendance, todayStr, schoolPeriods]);

  // Room-by-Room Matrix (Grade + Room Executive Breakdown)
  const roomMatrix = useMemo(() => {
    const groups = new Map<string, { gradeLevel: string; room: string; students: Student[] }>();
    scopedStudents.forEach((s) => {
      const key = `${s.gradeLevel || 'ไม่ระบุ'}|${s.room || 'รวม'}`;
      const existing = groups.get(key);
      if (existing) {
        existing.students.push(s);
      } else {
        groups.set(key, {
          gradeLevel: s.gradeLevel || 'ไม่ระบุ',
          room: s.room || 'รวม',
          students: [s],
        });
      }
    });

    const todayPeriodIds = new Set(
      periodAttendance
        .filter((p) => p.date === todayStr)
        .map((p) => p.studentId)
    );

    return Array.from(groups.values()).map((g) => {
      const ids = new Set(g.students.map((s) => s.id));
      const roomLabel = `${g.gradeLevel} / ${g.room}`;

      // Gate attendance in selected timeframe (count latest status per student-date)
      const byStuDate = new Map<string, AttendanceRecord>();
      scopedAttendance.forEach((rec) => {
        if (rec.userType === 'teacher' || !ids.has(rec.studentId)) return;
        const k = `${rec.studentId}_${rec.date}`;
        const prev = byStuDate.get(k);
        if (!prev || rec.recordType === 'check_in') {
          byStuDate.set(k, rec);
        }
      });

      const attRecords = Array.from(byStuDate.values());
      const present = attRecords.filter((r) => r.status === 'present').length;
      const late = attRecords.filter((r) => r.status === 'late').length;
      const absentLeave = attRecords.filter((r) => r.status === 'absent' || r.status === 'leave').length;

      // Denominator: for 'today' use total room size if attendance logged or total room size; for multi-day use recorded days or total
      const attRate =
        timeframe === 'today'
          ? g.students.length > 0
            ? Math.min(100, Math.round(((present + late) / g.students.length) * 100))
            : 0
          : attRecords.length > 0
            ? Math.min(100, Math.round(((present + late) / attRecords.length) * 100))
            : 0;

      // Period check-in coverage today
      const periodCheckedCount = g.students.filter((s) => todayPeriodIds.has(s.id)).length;
      const periodCoverage =
        g.students.length > 0 ? Math.round((periodCheckedCount / g.students.length) * 100) : 0;

      // GPA average
      const roomGpas = g.students
        .map((s) => studentAcademicMap.get(s.id)?.gpax ?? null)
        .filter((v): v is number => v !== null);
      const avgGpa =
        roomGpas.length > 0
          ? Number((roomGpas.reduce((sum, v) => sum + v, 0) / roomGpas.length).toFixed(2))
          : null;

      // Homework completion
      const roomHw = homeworkSubmissions.filter((h) => ids.has(h.studentId));
      const hwDone = roomHw.filter((h) => h.status === 'submitted' || h.status === 'graded').length;
      const hwPending = roomHw.filter((h) => h.status === 'pending').length;
      const hwRate = roomHw.length > 0 ? Math.round((hwDone / roomHw.length) * 100) : null;

      // Infirmary & SDQ Risk
      const infCount = infirmaryVisits.filter(
        (v) => ids.has(v.studentId) && (!dateFloorStr || v.visitDate >= dateFloorStr)
      ).length;
      const sdqWatch = sdqAssessments.filter(
        (s) => ids.has(s.studentId) && (s.overallStatus === 'risk' || s.overallStatus === 'problem')
      ).length;

      // Health status flag
      const needsAttention =
        (attRecords.length > 0 && attRate < 85) ||
        (avgGpa !== null && avgGpa < 2.25) ||
        sdqWatch > 0;
      const criticalAlert =
        (attRecords.length > 0 && attRate < 75) ||
        (avgGpa !== null && avgGpa < 2.0);

      const statusTier: 'critical' | 'watch' | 'normal' = criticalAlert
        ? 'critical'
        : needsAttention
          ? 'watch'
          : 'normal';

      return {
        key: `${g.gradeLevel}|${g.room}`,
        roomLabel,
        gradeLevel: g.gradeLevel,
        room: g.room,
        studentCount: g.students.length,
        hasAttendanceRecords: attRecords.length > 0,
        present,
        late,
        absentLeave,
        attRate,
        periodCheckedCount,
        periodCoverage,
        avgGpa,
        hwDone,
        hwTotal: roomHw.length,
        hwPending,
        hwRate,
        infCount,
        sdqWatch,
        statusTier,
      };
    });
  }, [
    scopedStudents,
    periodAttendance,
    todayStr,
    scopedAttendance,
    timeframe,
    studentAcademicMap,
    homeworkSubmissions,
    infirmaryVisits,
    dateFloorStr,
    sdqAssessments,
  ]);

  // Course & Teacher Academic Audit Table
  const courseAuditRows = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return courses
      .filter((c) => {
        if (!q) return true;
        return (
          c.code.toLowerCase().includes(q) ||
          c.titleTh.toLowerCase().includes(q) ||
          c.teacherName.toLowerCase().includes(q)
        );
      })
      .map((course) => {
        const enrolledIds = new Set(
          course.enrolledStudentIds.filter((id) =>
            selectedGradeLevel === 'all' ? true : scopedStudentIds.has(id)
          )
        );
        const enrolledCount =
          enrolledIds.size > 0
            ? enrolledIds.size
            : scopedStudents.length > 0 && course.enrolledStudentIds.length === 0
              ? scopedStudents.length
              : enrolledIds.size;

        const courseGrades = grades.filter(
          (g) =>
            g.courseId === course.id &&
            (selectedGradeLevel === 'all' || scopedStudentIds.has(g.studentId))
        );
        const gradedStudents = new Set(courseGrades.map((g) => g.studentId)).size;
        const gradeCompletionPct =
          enrolledCount > 0 ? Math.min(100, Math.round((gradedStudents / enrolledCount) * 100)) : 0;

        const avgScore =
          courseGrades.length > 0
            ? Math.round(courseGrades.reduce((sum, g) => sum + g.totalScore, 0) / courseGrades.length)
            : null;
        const passingCount = courseGrades.filter(
          (g) => calculateGrade(g.totalScore, activeSchool.gradingSystem || 'thai').point > 0
        ).length;
        const passRate =
          courseGrades.length > 0 ? Math.round((passingCount / courseGrades.length) * 100) : null;

        const courseHw = homeworkSubmissions.filter(
          (h) =>
            h.courseCode === course.code &&
            (selectedGradeLevel === 'all' || scopedStudentIds.has(h.studentId))
        );
        const toGradeHw = courseHw.filter((h) => h.status === 'submitted' || h.status === 'late').length;

        const todayLogs = periodAttendance.filter(
          (p) => p.date === todayStr && (p.courseId === course.id || p.courseCode === course.code)
        );

        return {
          course,
          enrolledCount,
          gradedStudents,
          gradeCompletionPct,
          avgScore,
          passRate,
          toGradeHw,
          periodCheckedToday: todayLogs.length > 0,
        };
      });
  }, [
    courses,
    courseSearch,
    selectedGradeLevel,
    scopedStudentIds,
    scopedStudents.length,
    grades,
    activeSchool.gradingSystem,
    homeworkSubmissions,
    periodAttendance,
    todayStr,
  ]);

  // Multi-Day Attendance Bar Trend (last 7 distinct dates or last 7 days)
  const dailyTrend = useMemo(() => {
    const days: Array<{
      date: string;
      label: string;
      present: number;
      late: number;
      absentLeave: number;
      total: number;
    }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = getLocalDateString(d);
      const dayRecords = attendance.filter(
        (a) =>
          a.date === dateStr &&
          a.userType !== 'teacher' &&
          (selectedGradeLevel === 'all' || scopedStudentIds.has(a.studentId))
      );
      const dedup = new Map<string, AttendanceRecord>();
      dayRecords.forEach((rec) => {
        const prev = dedup.get(rec.studentId);
        if (!prev || rec.recordType === 'check_in') dedup.set(rec.studentId, rec);
      });
      const list = Array.from(dedup.values());
      const present = list.filter((r) => r.status === 'present').length;
      const late = list.filter((r) => r.status === 'late').length;
      const absentLeave = list.filter((r) => r.status === 'absent' || r.status === 'leave').length;
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        present,
        late,
        absentLeave,
        total: present + late + absentLeave,
      });
    }
    const maxTotal = Math.max(1, ...days.map((x) => x.total));
    return { days, maxTotal };
  }, [attendance, selectedGradeLevel, scopedStudentIds]);

  // Unified Executive KPIs
  const metrics = useMemo(() => {
    const totalStudents = scopedStudents.length;
    const activeStudents = scopedStudents.filter((s) => s.status === 'active').length;
    const totalTeachers = teachers.length;
    const lineLinkedStudents = scopedStudents.filter((s) => s.lineLinked).length;

    const studentAtt = scopedAttendance.filter((a) => a.userType !== 'teacher');
    const teacherAtt = scopedAttendance.filter((a) => a.userType === 'teacher');

    // Deduplicate per student-date for clean percentage calculation
    const stuDateMap = new Map<string, AttendanceRecord>();
    studentAtt.forEach((rec) => {
      const k = `${rec.studentId}_${rec.date}`;
      const prev = stuDateMap.get(k);
      if (!prev || rec.recordType === 'check_in') stuDateMap.set(k, rec);
    });
    const dedupStudentAtt = Array.from(stuDateMap.values());

    const presentStudents = dedupStudentAtt.filter((a) => a.status === 'present').length;
    const lateStudents = dedupStudentAtt.filter((a) => a.status === 'late').length;
    const absentOrLeaveStudents = dedupStudentAtt.filter(
      (a) => a.status === 'absent' || a.status === 'leave'
    ).length;

    const studentCheckinRate =
      timeframe === 'today'
        ? totalStudents > 0
          ? Math.min(100, Math.round(((presentStudents + lateStudents) / totalStudents) * 100))
          : 0
        : dedupStudentAtt.length > 0
          ? Math.min(100, Math.round(((presentStudents + lateStudents) / dedupStudentAtt.length) * 100))
          : 0;

    const teacherUniqueIds = new Set(teacherAtt.map((t) => t.teacherId || t.studentId));
    const teacherCheckinRate =
      totalTeachers > 0 ? Math.min(100, Math.round((teacherUniqueIds.size / totalTeachers) * 100)) : 0;

    // Period check-in compliance
    const scheduledTodayCount = todayPeriodAudit.length;
    const submittedTodayPeriodsCount = todayPeriodAudit.filter((p) => p.isSubmitted).length;
    const periodComplianceRate =
      scheduledTodayCount > 0 ? Math.round((submittedTodayPeriodsCount / scheduledTodayCount) * 100) : 0;

    // Pending action queues
    const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending').length;
    const pendingSlips = invoices.filter((inv) => inv.slipStatus === 'pending_review').length;

    // Academic & Homework
    const gradedGpaStudents = scopedStudents
      .map((s) => ({ student: s, realGpa: studentAcademicMap.get(s.id)?.gpax ?? null }))
      .filter((item): item is { student: Student; realGpa: number } => item.realGpa !== null);

    const avgGpa =
      gradedGpaStudents.length > 0
        ? Number(
            (
              gradedGpaStudents.reduce((sum, item) => sum + item.realGpa, 0) /
              gradedGpaStudents.length
            ).toFixed(2)
          )
        : 0;

    const gpaBands = [
      {
        label: '3.50 – 4.00 (ดีเยี่ยม)',
        count: gradedGpaStudents.filter((s) => s.realGpa >= 3.5).length,
        color: 'bg-emerald-500',
      },
      {
        label: '3.00 – 3.49 (ดี)',
        count: gradedGpaStudents.filter((s) => s.realGpa >= 3.0 && s.realGpa < 3.5).length,
        color: 'bg-blue-500',
      },
      {
        label: '2.00 – 2.99 (ปานกลาง)',
        count: gradedGpaStudents.filter((s) => s.realGpa >= 2.0 && s.realGpa < 3.0).length,
        color: 'bg-amber-500',
      },
      {
        label: 'ต่ำกว่า 2.00 (ต้องดูแล)',
        count: gradedGpaStudents.filter((s) => s.realGpa < 2.0).length,
        color: 'bg-rose-500',
      },
    ];

    const scopedHw = homeworkSubmissions.filter(
      (h) => selectedGradeLevel === 'all' || scopedStudentIds.has(h.studentId)
    );
    const hwTotal = scopedHw.length;
    const hwCompleted = scopedHw.filter((h) => h.status === 'submitted' || h.status === 'graded').length;
    const hwUngraded = scopedHw.filter((h) => h.status === 'submitted' || h.status === 'late').length;
    const hwCompletionRate = hwTotal > 0 ? Math.round((hwCompleted / hwTotal) * 100) : 0;

    // Student care
    const scopedInfirmary = infirmaryVisits.filter(
      (v) =>
        (selectedGradeLevel === 'all' || scopedStudentIds.has(v.studentId)) &&
        (!dateFloorStr || v.visitDate >= dateFloorStr)
    );
    const currentlyResting = infirmaryVisits.filter(
      (v) => v.status === 'resting' && (selectedGradeLevel === 'all' || scopedStudentIds.has(v.studentId))
    ).length;
    const scopedBehavior = behaviorRecords.filter(
      (b) =>
        (selectedGradeLevel === 'all' || scopedStudentIds.has(b.studentId)) &&
        (!dateFloorStr || b.date >= dateFloorStr)
    );
    const meritCount = scopedBehavior.filter((b) => b.type === 'merit').length;
    const demeritCount = scopedBehavior.filter((b) => b.type === 'demerit').length;

    const scopedSdq = sdqAssessments.filter(
      (s) => selectedGradeLevel === 'all' || scopedStudentIds.has(s.studentId)
    );
    const sdqNormal = scopedSdq.filter((s) => s.overallStatus === 'normal').length;
    const sdqRisk = scopedSdq.filter((s) => s.overallStatus === 'risk').length;
    const sdqProblem = scopedSdq.filter((s) => s.overallStatus === 'problem').length;

    const lowGpaWatchlist = gradedGpaStudents
      .filter((s) => s.realGpa < 2.25)
      .slice(0, 6)
      .map((s) => ({ ...s.student, gpa: s.realGpa }));

    // Finance
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingAmount = invoices
      .filter((inv) => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueAmount = invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

    const recentScans = [...scopedAttendance].slice(0, 7);
    const pinnedAnnouncements = announcements.filter((a) => a.pinned || a.category === 'urgent');
    const displayAnnouncements =
      pinnedAnnouncements.length > 0 ? pinnedAnnouncements.slice(0, 4) : announcements.slice(0, 4);

    const watchRoomsCount = roomMatrix.filter((r) => r.statusTier !== 'normal').length;

    return {
      totalStudents,
      activeStudents,
      totalTeachers,
      lineLinkedStudents,
      presentStudents,
      lateStudents,
      absentOrLeaveStudents,
      studentCheckinRate,
      teacherAttCount: teacherUniqueIds.size,
      teacherCheckinRate,
      scheduledTodayCount,
      submittedTodayPeriodsCount,
      periodComplianceRate,
      pendingLeaves,
      pendingSlips,
      avgGpa,
      gradedCount: gradedGpaStudents.length,
      gpaBands,
      gradesCount: grades.length,
      hwTotal,
      hwCompleted,
      hwUngraded,
      hwCompletionRate,
      coursesCount: courses.length,
      infirmaryCount: scopedInfirmary.length,
      currentlyResting,
      meritCount,
      demeritCount,
      sdqNormal,
      sdqRisk,
      sdqProblem,
      lowGpaWatchlist,
      totalBilled,
      totalPaid,
      pendingAmount,
      overdueAmount,
      collectionRate,
      recentScans,
      displayAnnouncements,
      watchRoomsCount,
      periodLogsCount: scopedPeriodAttendance.length,
    };
  }, [
    scopedStudents,
    teachers.length,
    scopedAttendance,
    timeframe,
    todayPeriodAudit,
    leaveRequests,
    invoices,
    studentAcademicMap,
    homeworkSubmissions,
    selectedGradeLevel,
    scopedStudentIds,
    infirmaryVisits,
    dateFloorStr,
    behaviorRecords,
    sdqAssessments,
    grades.length,
    courses.length,
    announcements,
    roomMatrix,
    scopedPeriodAttendance.length,
  ]);

  // Executive Exception Radar items (only actionable exceptions!)
  const exceptionAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      detail: string;
      actionLabel: string;
      onAction: () => void;
    }> = [];

    const pendingPeriodCount = metrics.scheduledTodayCount - metrics.submittedTodayPeriodsCount;
    if (pendingPeriodCount > 0) {
      list.push({
        id: 'pending-periods',
        severity: 'warning',
        title: `คาบเรียนวันนี้ยังไม่มีการเช็กชื่อ ${pendingPeriodCount} จาก ${metrics.scheduledTodayCount} คาบ`,
        detail: 'ติดตามรายวิชาที่ครูยังไม่ได้กดรับเช็กชื่อเข้าห้องเรียน',
        actionLabel: 'ตรวจสอบรายคาบ',
        onAction: () => {
          setLens('academics');
          setPeriodAuditFilter('pending');
        },
      });
    }

    if (metrics.pendingLeaves > 0) {
      list.push({
        id: 'pending-leaves',
        severity: 'warning',
        title: `ใบลาออนไลน์รออนุมัติ ${metrics.pendingLeaves} รายการ`,
        detail: 'รอครูประจำชั้น / ผู้บริหารอนุมัติเพื่ออัปเดตสถิติการมาเรียน',
        actionLabel: 'เปิดกล่องอนุมัติใบลา',
        onAction: () => onNavigate('mobile_checkin'),
      });
    }

    if (canViewFinancials && (metrics.pendingSlips > 0 || metrics.overdueAmount > 0)) {
      list.push({
        id: 'finance-watch',
        severity: metrics.overdueAmount > 0 ? 'critical' : 'warning',
        title:
          metrics.pendingSlips > 0
            ? `มีสลิปค่าเทอมรอตรวจ ${metrics.pendingSlips} รายการ`
            : `ยอดค่าเทอมเกินกำหนดชำระ ฿${metrics.overdueAmount.toLocaleString()}`,
        detail: `จัดเก็บแล้ว ${metrics.collectionRate}% · ยอดรอชำระรวม ฿${(metrics.pendingAmount + metrics.overdueAmount).toLocaleString()}`,
        actionLabel: 'จัดการการเงิน',
        onAction: () => onNavigate('billing'),
      });
    }

    if (metrics.watchRoomsCount > 0) {
      list.push({
        id: 'watch-rooms',
        severity: 'critical',
        title: `พบห้องเรียนต้องเฝ้าระวัง ${metrics.watchRoomsCount} ห้อง`,
        detail: 'อัตราเข้าเรียนต่ำกว่า 85%, GPA เฉลี่ยต่ำกว่า 2.25 หรือมีผลคัดกรอง SDQ กลุ่มเสี่ยง',
        actionLabel: 'ดูตารางรายห้อง',
        onAction: () => {
          setLens('rooms');
          setRoomStatusFilter('watch');
        },
      });
    }

    if (metrics.currentlyResting > 0 || metrics.sdqProblem > 0) {
      list.push({
        id: 'student-care',
        severity: 'info',
        title: `นักเรียนพักห้องพยาบาล ${metrics.currentlyResting} คน · SDQ เร่งดูแล ${metrics.sdqProblem} คน`,
        detail: 'ตรวจสอบการดูแลช่วยเหลือและแจ้งผู้ปกครอง',
        actionLabel: 'ดูระบบดูแลช่วยเหลือ',
        onAction: () => onNavigate('behavior_sdq'),
      });
    }

    return list;
  }, [metrics, canViewFinancials, onNavigate]);

  // Filtered + Sorted Room Matrix
  const displayedRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    const filtered = roomMatrix.filter((r) => {
      if (roomStatusFilter === 'watch' && r.statusTier === 'normal') return false;
      if (roomStatusFilter === 'normal' && r.statusTier !== 'normal') return false;
      if (!q) return true;
      return r.roomLabel.toLowerCase().includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (roomSort === 'attendance_asc') return a.attRate - b.attRate;
      if (roomSort === 'gpa_asc') return (a.avgGpa ?? 99) - (b.avgGpa ?? 99);
      if (roomSort === 'homework_desc') return b.hwPending - a.hwPending;
      return a.roomLabel.localeCompare(b.roomLabel, 'th');
    });
  }, [roomMatrix, roomSearch, roomStatusFilter, roomSort]);

  // Filtered Period Audit
  const displayedPeriodAudit = useMemo(() => {
    return todayPeriodAudit.filter((item) => {
      if (periodAuditFilter === 'pending') return !item.isSubmitted;
      if (periodAuditFilter === 'submitted') return item.isSubmitted;
      return true;
    });
  }, [todayPeriodAudit, periodAuditFilter]);

  const timeframeLabel =
    timeframe === 'today'
      ? `วันนี้ (${todayStr})`
      : timeframe === '7d'
        ? '7 วันล่าสุด'
        : timeframe === '30d'
          ? '30 วันล่าสุด'
          : 'ทั้งภาคเรียน';

  // Copy clean executive brief for LINE / Board meetings
  const handleCopyExecutiveBrief = async () => {
    const lines = [
      `📊 สรุปรายงานผู้บริหาร — ${activeSchool.nameTh}`,
      `ช่วงข้อมูล: ${timeframeLabel}${selectedGradeLevel === 'all' ? ' · ทุกระดับชั้น' : ` · ระดับ ${selectedGradeLevel}`}`,
      `เวลาอัปเดต: ${lastRefreshedAt.toLocaleTimeString('th-TH')} น.`,
      `• นักเรียน: ${metrics.totalStudents} คน (เช็กชื่อ ${metrics.studentCheckinRate}% · ตรงเวลา ${metrics.presentStudents} / สาย ${metrics.lateStudents} / ขาด-ลา ${metrics.absentOrLeaveStudents})`,
      `• วินัยคาบสอนวันนี้: เช็กแล้ว ${metrics.submittedTodayPeriodsCount}/${metrics.scheduledTodayCount} คาบ (${metrics.periodComplianceRate}%)`,
      `• วิชาการ: GPAX เฉลี่ย ${metrics.avgGpa.toFixed(2)} · ส่งการบ้าน ${metrics.hwCompletionRate}% (รอตรวจ ${metrics.hwUngraded} ชิ้น)`,
      `• กิจการ & สุขภาพ: พักห้องพยาบาล ${metrics.currentlyResting} คน · SDQ เสี่ยง/ปัญหา ${metrics.sdqRisk + metrics.sdqProblem} คน · ใบลารออนุมัติ ${metrics.pendingLeaves} ใบ`,
      canViewFinancials
        ? `• การเงิน: จัดเก็บค่าเทอม ${metrics.collectionRate}% (รับแล้ว ฿${metrics.totalPaid.toLocaleString()} / ค้าง+เกินกำหนด ฿${(metrics.pendingAmount + metrics.overdueAmount).toLocaleString()})`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedBrief(true);
      window.setTimeout(() => setCopiedBrief(false), 2500);
    } catch {
      // Fallback if clipboard blocked
    }
  };

  // Multi-lens CSV Exporter
  const handleExportCsv = () => {
    let filename = `executive_report_${activeSchool.code || activeSchool.id}_${todayStr}.csv`;
    let rows: string[][];

    if (lens === 'rooms') {
      filename = `executive_room_matrix_${activeSchool.code || activeSchool.id}_${todayStr}.csv`;
      rows = [
        [
          'ห้องเรียน',
          'จำนวนนักเรียน',
          'มาตรงเวลา',
          'มาสาย',
          'ขาด/ลา',
          'อัตราเข้าเรียน (%)',
          'เช็กชื่อรายคาบวันนี้ (คน)',
          'GPA เฉลี่ย',
          'ส่งการบ้าน (%)',
          'งานค้างส่ง',
          'ห้องพยาบาล',
          'SDQ เฝ้าระวัง',
          'สถานะ',
        ],
        ...displayedRooms.map((r) => [
          r.roomLabel,
          String(r.studentCount),
          String(r.present),
          String(r.late),
          String(r.absentLeave),
          `${r.attRate}%`,
          `${r.periodCheckedCount}/${r.studentCount}`,
          r.avgGpa !== null ? r.avgGpa.toFixed(2) : '-',
          r.hwRate !== null ? `${r.hwRate}%` : '-',
          String(r.hwPending),
          String(r.infCount),
          String(r.sdqWatch),
          r.statusTier === 'critical' ? 'เร่งดูแล' : r.statusTier === 'watch' ? 'เฝ้าระวัง' : 'ปกติ',
        ]),
      ];
    } else if (lens === 'academics') {
      filename = `executive_academic_audit_${activeSchool.code || activeSchool.id}_${todayStr}.csv`;
      rows = [
        [
          'รหัสวิชา',
          'ชื่อวิชา',
          'ครูผู้สอน',
          'นักเรียนลงทะเบียน',
          'บันทึกเกรดแล้ว (%)',
          'คะแนนเฉลี่ย',
          'อัตราผ่าน (%)',
          'งานรอตรวจ (ชิ้น)',
          'เช็กชื่อรายคาบวันนี้',
        ],
        ...courseAuditRows.map((c) => [
          c.course.code,
          c.course.titleTh,
          c.course.teacherName,
          String(c.enrolledCount),
          `${c.gradeCompletionPct}%`,
          c.avgScore !== null ? String(c.avgScore) : '-',
          c.passRate !== null ? `${c.passRate}%` : '-',
          String(c.toGradeHw),
          c.periodCheckedToday ? 'เช็กแล้ว' : 'ยังไม่เช็ก',
        ]),
      ];
    } else {
      rows = [
        ['หมวดรายงาน', 'ตัวชี้วัด', 'ค่าที่วัดได้', 'รายละเอียด'],
        ['ขอบเขต', 'ช่วงเวลา / ระดับชั้น', timeframeLabel, selectedGradeLevel === 'all' ? 'ทุกระดับชั้น' : selectedGradeLevel],
        ['พื้นฐาน', 'จำนวนนักเรียน / ครู', `${metrics.totalStudents} คน / ${metrics.totalTeachers} ท่าน`, `เปิดสอน ${metrics.coursesCount} วิชา`],
        ['การมาเรียน', 'อัตราเช็กชื่อนักเรียน', `${metrics.studentCheckinRate}%`, `ตรงเวลา ${metrics.presentStudents} · สาย ${metrics.lateStudents} · ขาด/ลา ${metrics.absentOrLeaveStudents}`],
        ['การมาเรียน', 'วินัยเช็กชื่อรายคาบวันนี้', `${metrics.periodComplianceRate}%`, `บันทึกแล้ว ${metrics.submittedTodayPeriodsCount}/${metrics.scheduledTodayCount} คาบ`],
        ['การมาเรียน', 'อัตราลงเวลาครู / ใบลารออนุมัติ', `${metrics.teacherCheckinRate}%`, `${metrics.teacherAttCount} ท่าน · ใบลารออนุมัติ ${metrics.pendingLeaves} ใบ`],
        ['วิชาการ', 'GPAX เฉลี่ย', metrics.avgGpa.toFixed(2), `คิดจาก ${metrics.gradedCount} คน (${metrics.gradesCount} รายการคะแนน)`],
        ['วิชาการ', 'การส่งการบ้าน', `${metrics.hwCompletionRate}%`, `ส่งแล้ว ${metrics.hwCompleted}/${metrics.hwTotal} · รอครูตรวจ ${metrics.hwUngraded}`],
        ['กิจการนักเรียน', 'ห้องพยาบาล / SDQ เสี่ยง', `${metrics.currentlyResting} พักอยู่`, `ใช้บริการ ${metrics.infirmaryCount} ครั้ง · SDQ เสี่ยง/ปัญหา ${metrics.sdqRisk + metrics.sdqProblem} คน`],
        ['การเงิน', 'อัตราจัดเก็บค่าเทอม', `${metrics.collectionRate}%`, `รับแล้ว ฿${metrics.totalPaid.toLocaleString()} · ค้าง/เกินกำหนด ฿${(metrics.pendingAmount + metrics.overdueAmount).toLocaleString()}`],
      ];
    }

    const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formattedClock = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const formattedThaiDate = now.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const tvSlidesMeta = [
    { id: 0, title: '1. การมาเรียน & วินัยคาบสอน', icon: QrCode },
    { id: 1, title: '2. ผลสัมฤทธิ์ทางวิชาการ & หลักสูตร', icon: GraduationCap },
    { id: 2, title: '3. กิจการนักเรียน ห้องพยาบาล & SDQ', icon: HeartPulse },
    { id: 3, title: '4. สถานะการเงิน & ประกาศผู้บริหาร', icon: Receipt },
  ];

  // Quiet status style helpers
  const cardSurface = isTvMode
    ? 'bg-slate-900 border border-slate-800 text-slate-100'
    : 'bg-[var(--color-card)] border border-[var(--color-border)]';
  const subtleSurface = isTvMode
    ? 'bg-slate-950 border border-slate-800'
    : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)]';
  const mutedText = isTvMode ? 'text-slate-400' : 'text-[var(--color-text-muted)]';
  const titleText = isTvMode ? 'text-white' : 'text-[var(--color-text-title)]';

  return (
    <div
      ref={containerRef}
      data-refresh-tick={refreshTick}
      className={`space-y-3 pb-6 ${getModuleTone('executive_monitor')} ${
        isTvMode
          ? 'min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-800'
          : 'print-area'
      }`}
    >
      {/* Top Executive Command Header */}
      <div
        className={`rounded-xl p-3 sm:p-3.5 space-y-2 ${
          isTvMode ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'app-page-header'
        }`}
      >
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            {!isTvMode && (
              <div className="w-8 h-8 rounded-lg tone-chip shrink-0 mt-0.5">
                <Monitor className="w-4 h-4" />
              </div>
            )}
            <div className="space-y-0.5 min-w-0">
              <div className={`text-xs font-medium flex flex-wrap items-center gap-2 ${mutedText}`}>
                <span className="font-bold text-[var(--tone)]">
                  {isTvMode ? 'โหมดจอทีวีผู้บริหาร' : 'ศูนย์ติดตามรายงานผู้บริหาร'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{activeSchool.nameTh}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  ปีการศึกษา {activeSchool.academicYear || '2569'}/{activeSchool.currentSemester || '1'}
                </span>
              </div>
              <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${titleText}`}>
                {isTvMode
                  ? 'ศูนย์แสดงผลรายงานภาพรวมโรงเรียนแบบเรียลไทม์'
                  : 'แดชบอร์ดติดตามรายงานผู้บริหาร (Executive Report Monitor)'}
              </h1>
            </div>
          </div>

          {/* Right: Live Clock + Export & TV Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className={`px-3 py-1.5 rounded-lg border text-right tabular-nums ${subtleSurface}`}>
              <div className={`text-sm font-extrabold leading-tight flex items-center gap-1.5 justify-end ${titleText}`}>
                <Clock className="w-3.5 h-3.5 text-[var(--tone)]" />
                <span>{formattedClock}</span>
              </div>
              <div className={`text-[10px] ${mutedText}`}>{formattedThaiDate}</div>
            </div>

            {!isTvMode ? (
              <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                <button
                  type="button"
                  onClick={() => void handleCopyExecutiveBrief()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-xs font-bold text-[var(--color-text-title)] transition cursor-pointer whitespace-nowrap"
                >
                  {copiedBrief ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  )}
                  <span>{copiedBrief ? 'คัดลอกสรุปแล้ว' : 'คัดลอกสรุปส่ง LINE'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="btn-action-success whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออก CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-action-primary whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ A4</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoRotate((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 cursor-pointer whitespace-nowrap"
                >
                  {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{autoRotate ? 'หยุดหมุน' : 'เล่นสไลด์'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'ย่อหน้าจอ' : 'เต็มจอ TV'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Second Toolbar Row: Monitor Lenses + Scope Filters + Auto-Refresh */}
        <div className="pt-2 border-t border-current/10 flex flex-col lg:flex-row lg:items-center justify-between gap-2 print:hidden">
          {/* Lens Switcher */}
          <div
            className={`inline-flex p-0.5 rounded-lg border overflow-x-auto max-w-full ${
              isTvMode
                ? 'bg-slate-950 border-slate-800'
                : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
            }`}
          >
            {[
              { id: 'overview' as const, label: 'ภาพรวม & เรดาร์สด', icon: ActivityIcon },
              { id: 'rooms' as const, label: `เทียบรายห้อง (${roomMatrix.length})`, icon: FileSpreadsheet },
              { id: 'academics' as const, label: 'วินัยคาบสอน & รายวิชา', icon: BookOpen },
              { id: 'tv' as const, label: 'โหมดจอทีวี (TV)', icon: Monitor },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = lens === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLens(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? isTvMode
                        ? 'bg-sky-600 text-white'
                        : 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                      : isTvMode
                        ? 'text-slate-300 hover:text-white'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scope Filters & Live Refresh Control */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs min-w-0">
            {/* Timeframe */}
            <div
              className={`inline-flex p-0.5 rounded-lg border ${
                isTvMode
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-[var(--color-card)] border-[var(--color-border)]'
              }`}
            >
              {(
                [
                  { id: 'today', label: 'วันนี้' },
                  { id: '7d', label: '7 วัน' },
                  { id: '30d', label: '30 วัน' },
                  { id: 'term', label: 'ภาคเรียน' },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    timeframe === tf.id
                      ? 'bg-[var(--color-primary)] text-white'
                      : `${mutedText} hover:opacity-100`
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Grade Level Scope */}
            <select
              aria-label="กรองตามระดับชั้น"
              value={selectedGradeLevel}
              onChange={(e) => setSelectedGradeLevel(e.target.value)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                isTvMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-title)]'
              }`}
            >
              <option value="all">ทุกระดับชั้น ({students.length} คน)</option>
              {gradeLevelOptions.map((g) => (
                <option key={g} value={g}>
                  ระดับชั้น {g}
                </option>
              ))}
            </select>

            {/* Auto-Refresh Monitor Timer */}
            <div className="flex items-center gap-1">
              <select
                aria-label="รอบอัปเดตรายงานอัตโนมัติ"
                value={autoRefreshSec}
                onChange={(e) => setAutoRefreshSec(Number(e.target.value) as 0 | 30 | 60 | 300)}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold tabular-nums ${
                  isTvMode
                    ? 'bg-slate-950 border-slate-700 text-slate-200'
                    : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)]'
                }`}
              >
                <option value={0}>อัปเดตอัตโนมัติ: ปิด</option>
                <option value={30}>รีเฟรชทุก 30 วิ</option>
                <option value={60}>รีเฟรชทุก 1 นาที</option>
                <option value={300}>รีเฟรชทุก 5 นาที</option>
              </select>
              <button
                type="button"
                onClick={handleManualRefresh}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition whitespace-nowrap ${
                  isTvMode
                    ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
                    : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)]'
                }`}
                title="อัปเดตตัวเลขรายงานล่าสุด"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="tabular-nums">{lastRefreshedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Top 6-KPI Strip (Clickable drill-downs, tabular-nums) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            label: `เช็กชื่อ (${timeframe === 'today' ? 'วันนี้' : timeframeLabel})`,
            value: `${metrics.studentCheckinRate}%`,
            sub: `ตรงเวลา ${metrics.presentStudents} · สาย ${metrics.lateStudents} · ขาด ${metrics.absentOrLeaveStudents}`,
            icon: UserCheck,
            accent: isTvMode ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400',
            onClick: () => onNavigate('attendance'),
          },
          {
            label: 'เช็กชื่อรายคาบวันนี้',
            value: metrics.scheduledTodayCount > 0 ? `${metrics.periodComplianceRate}%` : `${metrics.periodLogsCount}`,
            sub:
              metrics.scheduledTodayCount > 0
                ? `บันทึกแล้ว ${metrics.submittedTodayPeriodsCount}/${metrics.scheduledTodayCount} คาบ`
                : 'รายการเช็กชื่อรายคาบในระบบ',
            icon: Calendar,
            accent: isTvMode ? 'text-sky-400' : 'text-blue-600 dark:text-blue-400',
            onClick: () => setLens('academics'),
          },
          {
            label: 'GPAX เฉลี่ย & ห้องเฝ้าระวัง',
            value: metrics.avgGpa.toFixed(2),
            sub: `เฝ้าระวัง ${metrics.watchRoomsCount} ห้อง · ${metrics.coursesCount} วิชา`,
            icon: Award,
            accent: isTvMode ? 'text-amber-400' : 'text-amber-600 dark:text-amber-400',
            onClick: () => setLens('rooms'),
          },
          {
            label: 'ภาระงาน & รอตรวจ',
            value: `${metrics.hwCompletionRate}%`,
            sub: `ส่งแล้ว ${metrics.hwCompleted}/${metrics.hwTotal} · รอตรวจ ${metrics.hwUngraded}`,
            icon: BookOpen,
            accent: isTvMode ? 'text-violet-400' : 'text-violet-600 dark:text-violet-400',
            onClick: () => onNavigate('homework'),
          },
          {
            label: 'คิวอนุมัติ & ดูแลนักเรียน',
            value: `${metrics.pendingLeaves + metrics.pendingSlips}`,
            sub: `ใบลา ${metrics.pendingLeaves} · พยาบาล ${metrics.currentlyResting} · SDQ เสี่ยง ${metrics.sdqRisk + metrics.sdqProblem}`,
            icon: HeartPulse,
            accent: isTvMode ? 'text-rose-400' : 'text-rose-600 dark:text-rose-400',
            onClick: () => onNavigate('executive_warning'),
          },
          canViewFinancials
            ? {
                label: 'จัดเก็บค่าเทอม',
                value: `${metrics.collectionRate}%`,
                sub: `รับแล้ว ฿${metrics.totalPaid.toLocaleString()} · ค้าง ฿${(metrics.pendingAmount + metrics.overdueAmount).toLocaleString()}`,
                icon: Receipt,
                accent: isTvMode ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400',
                onClick: () => onNavigate('billing'),
              }
            : {
                label: 'บุคลากร & LINE ผู้ปกครอง',
                value: `${metrics.teacherAttCount}/${metrics.totalTeachers}`,
                sub: `ครูลงเวลา · LINE ${metrics.lineLinkedStudents}/${metrics.totalStudents}`,
                icon: Users,
                accent: isTvMode ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400',
                onClick: () => onNavigate('teachers'),
              },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={kpi.onClick}
              className={`text-left rounded-xl p-3.5 space-y-1 transition cursor-pointer hover:border-[var(--color-primary)] ${cardSurface}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className={`text-[11px] font-bold truncate ${mutedText}`}>{kpi.label}</span>
                <Icon className={`w-4 h-4 shrink-0 ${kpi.accent}`} />
              </div>
              <div className={`text-2xl font-extrabold tabular-nums ${titleText}`}>{kpi.value}</div>
              <div className={`text-[10px] tabular-nums truncate ${mutedText}`}>{kpi.sub}</div>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* LENS 1: EXECUTIVE LIVE COMMAND & EXCEPTION RADAR                      */}
      {/* ===================================================================== */}
      {lens === 'overview' && (
        <div className="space-y-4">
          {/* Action & Exception Radar */}
          <section className={`rounded-xl p-3 sm:p-4 space-y-3 ${cardSurface}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-current/10">
              <div>
                <h2 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${titleText}`}>
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>เรดาร์ติดตามประเด็นสำคัญผู้บริหาร (Action &amp; Exception Radar)</span>
                </h2>
                <p className={`text-[11px] ${mutedText}`}>
                  สรุปเฉพาะรายการที่รอการตัดสินใจ คาบเรียนที่ยังไม่เช็กชื่อ และห้องเรียนต่ำกว่าเกณฑ์
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('executive_warning')}
                className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
              >
                เปิดระบบเตือนภัย Early Warning →
              </button>
            </div>

            {exceptionAlerts.length === 0 ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>ไม่พบรายการผิดปกติหรือคิวงานค้างเร่งด่วนในขอบเขตที่เลือก</span>
              </div>
            ) : (
              <div className="divide-y divide-current/10">
                {exceptionAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          alert.severity === 'critical'
                            ? 'text-rose-600 dark:text-rose-400'
                            : alert.severity === 'warning'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-sky-600 dark:text-sky-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className={`text-xs sm:text-sm font-bold ${titleText}`}>{alert.title}</div>
                        <div className={`text-[11px] ${mutedText}`}>{alert.detail}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={alert.onAction}
                      className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary-text)] transition cursor-pointer whitespace-nowrap shrink-0 print:hidden"
                    >
                      {alert.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 7-Day Attendance & Room Quick Comparison Grid */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* 7-Day Trend Bar Chart */}
            <section className={`rounded-xl p-3 sm:p-4 space-y-3 lg:col-span-7 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
                <div>
                  <h2 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${titleText}`}>
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span>แนวโน้มการมาเรียน 7 วันล่าสุด</span>
                  </h2>
                  <p className={`text-[11px] ${mutedText}`}>
                    เปรียบเทียบจำนวนมาตรงเวลา · มาสาย · ขาด/ลา รายวัน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                >
                  ดูรายงานเช็กชื่อ →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4">
                {dailyTrend.days.map((day) => {
                  const pPct = Math.round((day.present / dailyTrend.maxTotal) * 100);
                  const lPct = Math.round((day.late / dailyTrend.maxTotal) * 100);
                  const aPct = Math.round((day.absentLeave / dailyTrend.maxTotal) * 100);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className={`text-[10px] font-bold tabular-nums ${mutedText}`}>
                        {day.total}
                      </div>
                      <div className="w-full max-w-[36px] flex-1 flex flex-col justify-end rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800/70">
                        {day.absentLeave > 0 && (
                          <div
                            className="w-full bg-rose-500"
                            style={{ height: `${aPct}%` }}
                            title={`ขาด/ลา ${day.absentLeave}`}
                          />
                        )}
                        {day.late > 0 && (
                          <div
                            className="w-full bg-amber-500"
                            style={{ height: `${lPct}%` }}
                            title={`มาสาย ${day.late}`}
                          />
                        )}
                        {day.present > 0 && (
                          <div
                            className="w-full bg-emerald-500"
                            style={{ height: `${pPct}%` }}
                            title={`ตรงเวลา ${day.present}`}
                          />
                        )}
                      </div>
                      <div className={`text-[10px] font-medium tabular-nums ${mutedText}`}>
                        {day.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`flex flex-wrap items-center gap-4 text-[11px] pt-1 border-t border-current/10 ${mutedText}`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" aria-hidden="true" />
                  <span>มาตรงเวลา</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" aria-hidden="true" />
                  <span>มาสาย</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" aria-hidden="true" />
                  <span>ขาด / ลา</span>
                </span>
              </div>
            </section>

            {/* Recent Gate Activity */}
            <section className={`rounded-xl p-3 sm:p-4 space-y-3 lg:col-span-5 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
                <div>
                  <h2 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${titleText}`}>
                    <QrCode className="w-4 h-4 text-emerald-500" />
                    <span>รายการสแกนเข้า-ออกล่าสุด</span>
                  </h2>
                  <p className={`text-[11px] ${mutedText}`}>
                    {timeframeLabel} · ครูลงเวลา {metrics.teacherAttCount}/{metrics.totalTeachers} ท่าน
                  </p>
                </div>
              </div>

              {metrics.recentScans.length === 0 ? (
                <p className={`text-xs py-8 text-center ${mutedText}`}>
                  ยังไม่มีข้อมูลการสแกนเข้า-ออกในช่วงเวลาที่เลือก
                </p>
              ) : (
                <div className="divide-y divide-current/10">
                  {metrics.recentScans.map((rec) => (
                    <div key={rec.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className={`font-bold truncate ${titleText}`}>
                          {rec.userName || 'นักเรียน/บุคลากร'}
                        </div>
                        <div className={`text-[11px] truncate ${mutedText}`}>
                          {rec.userDepartmentOrRoom || '-'} · {rec.remarks || rec.checkinMethod}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span
                          className={`text-[11px] font-bold ${
                            rec.status === 'present'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : rec.status === 'late'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {rec.status === 'present' ? 'ตรงเวลา' : rec.status === 'late' ? 'มาสาย' : rec.status}
                        </span>
                        <span className={`font-mono text-[11px] ${mutedText}`}>{rec.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Bottom 3 Executive Summary Panels: Academics | Student Care | Finance & Bulletins */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Academic Bands */}
            <section className={`rounded-xl p-3 sm:p-4 space-y-3 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
                <h2 className={`text-sm font-extrabold flex items-center gap-2 ${titleText}`}>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>การกระจายผลการเรียน (GPAX)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('gradebook')}
                  className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                >
                  เปิด ปพ.5 →
                </button>
              </div>
              <div className="space-y-2.5">
                {metrics.gpaBands.map((band) => {
                  const pct = metrics.gradedCount > 0 ? Math.round((band.count / metrics.gradedCount) * 100) : 0;
                  return (
                    <div key={band.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className={`font-medium ${mutedText}`}>{band.label}</span>
                        <span className={`font-bold ${titleText}`}>
                          {band.count} คน ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${band.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {metrics.lowGpaWatchlist.length > 0 && (
                <div className="pt-2 border-t border-current/10 space-y-1">
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    รายชื่อเฝ้าระวัง GPA &lt; 2.25
                  </div>
                  <div className={`text-[11px] leading-relaxed tabular-nums ${mutedText}`}>
                    {metrics.lowGpaWatchlist
                      .map((s) => `${s.firstNameTh} ${s.lastNameTh} (${s.room}: ${s.gpa.toFixed(2)})`)
                      .join(' · ')}
                  </div>
                </div>
              )}
            </section>

            {/* Student Care, Infirmary & SDQ */}
            <section className={`rounded-xl p-3 sm:p-4 space-y-3 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
                <h2 className={`text-sm font-extrabold flex items-center gap-2 ${titleText}`}>
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>กิจการนักเรียน ห้องพยาบาล &amp; SDQ</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('behavior_sdq')}
                  className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                >
                  ดูรายละเอียด →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <div className={`rounded-lg p-2.5 ${subtleSurface}`}>
                  <div className={`text-[11px] ${mutedText}`}>ห้องพยาบาล</div>
                  <div className={`text-lg font-extrabold ${titleText}`}>{metrics.infirmaryCount} ครั้ง</div>
                  <div className={`text-[10px] ${mutedText}`}>พักอยู่ขณะนี้ {metrics.currentlyResting} คน</div>
                </div>
                <div className={`rounded-lg p-2.5 ${subtleSurface}`}>
                  <div className={`text-[11px] ${mutedText}`}>พฤติกรรม (+ / -)</div>
                  <div className={`text-lg font-extrabold ${titleText}`}>
                    +{metrics.meritCount} / -{metrics.demeritCount}
                  </div>
                  <div className={`text-[10px] ${mutedText}`}>บันทึกความดี / ตัดคะแนน</div>
                </div>
              </div>
              <div className={`rounded-lg p-3 space-y-1.5 ${subtleSurface}`}>
                <div className="text-xs font-bold flex items-center justify-between">
                  <span className={titleText}>ผลคัดกรอง SDQ</span>
                  <span className={`tabular-nums text-[11px] ${mutedText}`}>
                    รวม {metrics.sdqNormal + metrics.sdqRisk + metrics.sdqProblem} คน
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums pt-1">
                  <div>
                    <div className={`text-[10px] ${mutedText}`}>ปกติ</div>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.sdqNormal}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] ${mutedText}`}>กลุ่มเสี่ยง</div>
                    <div className="font-extrabold text-amber-600 dark:text-amber-400">{metrics.sdqRisk}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] ${mutedText}`}>มีปัญหา</div>
                    <div className="font-extrabold text-rose-600 dark:text-rose-400">{metrics.sdqProblem}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Finance & School Bulletins */}
            <section className={`rounded-xl p-3 sm:p-4 space-y-3 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
                <h2 className={`text-sm font-extrabold flex items-center gap-2 ${titleText}`}>
                  <Building2 className="w-4 h-4 text-teal-500" />
                  <span>{canViewFinancials ? 'การเงินค่าเทอม & ประกาศ' : 'ประกาศสำคัญโรงเรียน'}</span>
                </h2>
                {canViewFinancials && (
                  <button
                    type="button"
                    onClick={() => onNavigate('billing')}
                    className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                  >
                    จัดการค่าเทอม →
                  </button>
                )}
              </div>

              {canViewFinancials && (
                <div className="grid grid-cols-3 gap-2 tabular-nums text-center">
                  <div className={`rounded-lg p-2 ${subtleSurface}`}>
                    <div className={`text-[10px] ${mutedText}`}>รับแล้ว</div>
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ฿{metrics.totalPaid.toLocaleString()}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 ${subtleSurface}`}>
                    <div className={`text-[10px] ${mutedText}`}>รอชำระ</div>
                    <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                      ฿{metrics.pendingAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 ${subtleSurface}`}>
                    <div className={`text-[10px] ${mutedText}`}>เกินกำหนด</div>
                    <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                      ฿{metrics.overdueAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="divide-y divide-current/10">
                {metrics.displayAnnouncements.length === 0 ? (
                  <p className={`text-xs py-3 ${mutedText}`}>ยังไม่มีประกาศสำคัญในระบบ</p>
                ) : (
                  metrics.displayAnnouncements.map((ann) => (
                    <div key={ann.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold truncate ${titleText}`}>{ann.title}</span>
                        <span
                          className={`text-[10px] font-bold shrink-0 ${
                            ann.category === 'urgent' ? 'text-rose-600 dark:text-rose-400' : mutedText
                          }`}
                        >
                          {ann.category === 'urgent' ? 'ด่วน' : 'ประกาศ'}
                        </span>
                      </div>
                      <p className={`text-[11px] line-clamp-1 mt-0.5 ${mutedText}`}>{ann.content}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LENS 2: GRADE & ROOM EXECUTIVE MATRIX                                 */}
      {/* ===================================================================== */}
      {lens === 'rooms' && (
        <section className={`rounded-xl p-3 sm:p-4 space-y-3 ${cardSurface}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-current/10">
            <div>
              <h2 className={`text-base font-extrabold flex items-center gap-2 ${titleText}`}>
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>ตารางเปรียบเทียบสถานะรายระดับชั้น &amp; ห้องเรียน</span>
              </h2>
              <p className={`text-xs ${mutedText}`}>
                ช่วงข้อมูล {timeframeLabel} · แสดงครบทุกมิติ (มาเรียน รายคาบ เกรด การบ้าน สุขภาพ) เพื่อเรียงลำดับห้องที่ต้องเข้าดูแล
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="ค้นหาห้องเรียน..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] w-44"
                />
              </div>

              <div className="inline-flex p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs">
                {(
                  [
                    { id: 'all', label: `ทุกห้อง (${roomMatrix.length})` },
                    { id: 'watch', label: `เฝ้าระวัง (${metrics.watchRoomsCount})` },
                    { id: 'normal', label: 'ปกติ' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRoomStatusFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      roomStatusFilter === f.id
                        ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                        : mutedText
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <select
                aria-label="เรียงลำดับตารางห้องเรียน"
                value={roomSort}
                onChange={(e) => setRoomSort(e.target.value as RoomSortKey)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)]"
              >
                <option value="attendance_asc">เรียง: เข้าเรียนต่ำสุดขึ้นก่อน</option>
                <option value="gpa_asc">เรียง: GPA เฉลี่ยต่ำสุดขึ้นก่อน</option>
                <option value="homework_desc">เรียง: ค้างการบ้านมากสุด</option>
                <option value="room">เรียง: ชื่อห้องเรียน (ก-ฮ)</option>
              </select>
            </div>
          </div>

          {displayedRooms.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className={`text-sm font-bold ${titleText}`}>ไม่พบข้อมูลห้องเรียนที่ตรงกับตัวกรอง</p>
              <button
                type="button"
                onClick={() => {
                  setRoomSearch('');
                  setRoomStatusFilter('all');
                }}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-bold text-[var(--color-primary-text)] cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="table-comfortable w-full text-left border-collapse text-xs tabular-nums">
                <thead>
                  <tr className={`border-b border-current/15 text-[11px] font-bold ${mutedText}`}>
                    <th className="py-2.5 px-3 whitespace-nowrap">ห้องเรียน</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">นักเรียน</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">เข้าเรียน (%)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">มา / สาย / ขาด</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">เช็กรายคาบวันนี้</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">GPA เฉลี่ย</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">ส่งงาน (%)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">พยาบาล / SDQ เสี่ยง</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">ประเมินสถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/10">
                  {displayedRooms.map((row) => (
                    <tr
                      key={row.key}
                      className="h-10 hover:bg-[var(--color-card-subtle)] transition-colors"
                    >
                      <td className={`py-2 px-3 font-bold whitespace-nowrap ${titleText}`}>
                        {row.roomLabel}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{row.studentCount}</td>
                      <td
                        className={`py-2 px-3 text-right font-extrabold ${
                          !row.hasAttendanceRecords
                            ? mutedText
                            : row.attRate >= 90
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.attRate >= 80
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.hasAttendanceRecords ? `${row.attRate}%` : '-'}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${mutedText}`}>
                        {row.present} / {row.late} / {row.absentLeave}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {row.periodCheckedCount}/{row.studentCount} ({row.periodCoverage}%)
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-extrabold ${
                          row.avgGpa === null
                            ? mutedText
                            : row.avgGpa >= 3.0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.avgGpa >= 2.25
                                ? titleText
                                : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.avgGpa !== null ? row.avgGpa.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {row.hwRate !== null ? `${row.hwRate}%` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {row.infCount} /{' '}
                        <span className={row.sdqWatch > 0 ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                          {row.sdqWatch}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap font-bold">
                        {row.statusTier === 'critical' ? (
                          <span className="text-rose-600 dark:text-rose-400">เร่งดูแล</span>
                        ) : row.statusTier === 'watch' ? (
                          <span className="text-amber-600 dark:text-amber-400">เฝ้าระวัง</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">ปกติ</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* LENS 3: TEACHER PERIOD CHECK-IN COMPLIANCE & COURSE GRADEBOOK AUDIT   */}
      {/* ===================================================================== */}
      {lens === 'academics' && (
        <div className="space-y-4">
          {/* Today Period-by-Period Check-in Compliance */}
          <section className={`rounded-xl p-3 sm:p-4 space-y-3 ${cardSurface}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-current/10">
              <div>
                <h2 className={`text-base font-extrabold flex items-center gap-2 ${titleText}`}>
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>
                    ติดตามการเช็กชื่อเข้าสอนรายคาบวันนี้ (วัน{DAY_KEY_LABELS_TH[bangkokNow.dayKey] || bangkokNow.dayKey})
                  </span>
                </h2>
                <p className={`text-xs ${mutedText}`}>
                  บันทึกเช็กชื่อแล้ว {metrics.submittedTodayPeriodsCount} จาก {metrics.scheduledTodayCount} คาบ ({metrics.periodComplianceRate}%)
                </p>
              </div>

              <div className="inline-flex p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs print:hidden">
                {(
                  [
                    { id: 'all', label: `ทุกคาบ (${todayPeriodAudit.length})` },
                    {
                      id: 'pending',
                      label: `ยังไม่เช็ก (${todayPeriodAudit.filter((p) => !p.isSubmitted).length})`,
                    },
                    {
                      id: 'submitted',
                      label: `เช็กแล้ว (${todayPeriodAudit.filter((p) => p.isSubmitted).length})`,
                    },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPeriodAuditFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      periodAuditFilter === f.id
                        ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                        : mutedText
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {displayedPeriodAudit.length === 0 ? (
              <div className={`py-8 text-center text-xs ${mutedText}`}>
                {todayPeriodAudit.length === 0
                  ? 'ไม่มีคาบสอนในตารางเรียนสำหรับวันนี้ (หรือตรงกับวันหยุดเสาร์-อาทิตย์)'
                  : 'ไม่พบคาบเรียนตามตัวกรองที่เลือก'}
              </div>
            ) : (
              <div className="overflow-x-auto">
            <table className="table-comfortable w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className={`border-b border-current/15 text-[11px] font-bold ${mutedText}`}>
                      <th className="py-2 px-3">คาบ / เวลา</th>
                      <th className="py-2 px-3">รหัสวิชา &amp; รายวิชา</th>
                      <th className="py-2 px-3">ห้องเรียน</th>
                      <th className="py-2 px-3">ครูผู้สอน</th>
                      <th className="py-2 px-3 text-right">จำนวนเช็กชื่อ</th>
                      <th className="py-2 px-3 text-right">สถานะคาบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-current/10">
                    {displayedPeriodAudit.map((row) => (
                      <tr key={row.slot.id} className="h-10 hover:bg-[var(--color-card-subtle)]">
                        <td className="py-2 px-3 font-mono whitespace-nowrap">
                          คาบ {row.slot.periodNumber} · {row.timeLabel}
                        </td>
                        <td className={`py-2 px-3 font-bold ${titleText}`}>
                          {row.slot.courseCode} — {row.slot.courseTitleTh}
                        </td>
                        <td className={`py-2 px-3 ${mutedText}`}>{row.slot.classRoom}</td>
                        <td className={`py-2 px-3 ${mutedText}`}>{row.slot.teacherName}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.isSubmitted ? `${row.presentOrLate}/${row.submittedCount} คน` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                          {row.isSubmitted ? (
                            <span className="text-emerald-600 dark:text-emerald-400">บันทึกแล้ว</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">ยังไม่เช็กชื่อ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Course & Gradebook Completion Audit */}
          <section className={`rounded-xl p-3 sm:p-4 space-y-3 ${cardSurface}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-current/10">
              <div>
                <h2 className={`text-base font-extrabold flex items-center gap-2 ${titleText}`}>
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>ติดตามความคืบหน้าการกรอกคะแนน ปพ.5 &amp; ตรวจการบ้านรายวิชา</span>
                </h2>
                <p className={`text-xs ${mutedText}`}>
                  แสดงครบ {courseAuditRows.length} รายวิชา — กดเปิดสมุดคะแนนเพื่อตรวจรายละเอียดได้ทันที
                </p>
              </div>
              <div className="relative print:hidden">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="ค้นหารายวิชาหรือครู..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] w-56"
                />
              </div>
            </div>

            {courseAuditRows.length === 0 ? (
              <p className={`py-8 text-center text-xs ${mutedText}`}>ไม่พบรายวิชาที่ตรงกับการค้นหา</p>
            ) : (
              <div className="overflow-x-auto">
            <table className="table-comfortable w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className={`border-b border-current/15 text-[11px] font-bold ${mutedText}`}>
                      <th className="py-2 px-3">รายวิชา</th>
                      <th className="py-2 px-3">ครูผู้สอน</th>
                      <th className="py-2 px-3 text-right">ผู้เรียน</th>
                      <th className="py-2 px-3 text-right">กรอกคะแนน (%)</th>
                      <th className="py-2 px-3 text-right">คะแนนเฉลี่ย</th>
                      <th className="py-2 px-3 text-right">อัตราผ่าน</th>
                      <th className="py-2 px-3 text-right">งานรอตรวจ</th>
                      <th className="py-2 px-3 text-right print:hidden">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-current/10">
                    {courseAuditRows.map((row) => (
                      <tr key={row.course.id} className="h-10 hover:bg-[var(--color-card-subtle)]">
                        <td className={`py-2 px-3 font-bold ${titleText}`}>
                          {row.course.code} · {row.course.titleTh}
                        </td>
                        <td className={`py-2 px-3 ${mutedText}`}>{row.course.teacherName}</td>
                        <td className="py-2 px-3 text-right font-mono">{row.enrolledCount}</td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            row.gradeCompletionPct >= 90
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.gradeCompletionPct > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : mutedText
                          }`}
                        >
                          {row.gradedStudents}/{row.enrolledCount} ({row.gradeCompletionPct}%)
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.avgScore !== null ? `${row.avgScore}/100` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.passRate !== null ? `${row.passRate}%` : '-'}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono ${
                            row.toGradeHw > 0 ? 'font-bold text-amber-600 dark:text-amber-400' : mutedText
                          }`}
                        >
                          {row.toGradeHw}
                        </td>
                        <td className="py-2 px-3 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenGradebookCourse) {
                                onOpenGradebookCourse(row.course.id);
                              } else {
                                onNavigate('gradebook');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                          >
                            <span>เปิด ปพ.5</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LENS 4: TV / MEETING WALLBOARD BROADCAST MODE                         */}
      {/* ===================================================================== */}
      {isTvMode && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {tvSlidesMeta.map((s) => {
                const Icon = s.icon;
                const active = tvSlide === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTvSlide(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      active ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTvSlide((prev) => (prev + 3) % 4)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="สไลด์ก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTvSlide((prev) => (prev + 1) % 4)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="สไลด์ถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {tvSlide === 0 && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span>สไลด์ 1: สถานะการมาเรียน &amp; วินัยเช็กชื่อรายคาบ ({timeframeLabel})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-emerald-200">
                  <div className="text-xs">มาตรงเวลา</div>
                  <div className="text-2xl font-extrabold">{metrics.presentStudents} คน</div>
                </div>
                <div className="rounded-lg border border-amber-800 bg-amber-950/60 p-3 text-amber-200">
                  <div className="text-xs">มาสาย</div>
                  <div className="text-2xl font-extrabold">{metrics.lateStudents} คน</div>
                </div>
                <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-rose-200">
                  <div className="text-xs">ขาด / ลา</div>
                  <div className="text-2xl font-extrabold">{metrics.absentOrLeaveStudents} คน</div>
                </div>
                <div className="rounded-lg border border-sky-800 bg-sky-950/60 p-3 text-sky-200">
                  <div className="text-xs">เช็กชื่อรายคาบวันนี้</div>
                  <div className="text-2xl font-extrabold">
                    {metrics.submittedTodayPeriodsCount}/{metrics.scheduledTodayCount} คาบ
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-800">
                {metrics.recentScans.map((rec) => (
                  <div key={rec.id} className="py-2 flex items-center justify-between text-xs tabular-nums">
                    <div>
                      <span className="font-bold text-white">{rec.userName || 'นักเรียน'}</span>
                      <span className="ml-2 text-slate-400">{rec.userDepartmentOrRoom || '-'}</span>
                    </div>
                    <span className="font-mono text-slate-300">{rec.time}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tvSlide === 1 && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <span>สไลด์ 2: ผลสัมฤทธิ์ทางวิชาการ (GPAX เฉลี่ย {metrics.avgGpa.toFixed(2)})</span>
              </h2>
              <div className="space-y-3">
                {metrics.gpaBands.map((band) => {
                  const pct = metrics.gradedCount > 0 ? Math.round((band.count / metrics.gradedCount) * 100) : 0;
                  return (
                    <div key={band.label} className="space-y-1">
                      <div className="flex justify-between text-xs tabular-nums">
                        <span className="text-slate-200 font-semibold">{band.label}</span>
                        <span className="text-white font-bold">
                          {band.count} คน ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${band.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {tvSlide === 2 && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                <span>สไลด์ 3: ห้องพยาบาล พฤติกรรม และคัดกรอง SDQ</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">ห้องพยาบาลสะสม</div>
                  <div className="text-2xl font-extrabold text-white">{metrics.infirmaryCount} ครั้ง</div>
                </div>
                <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-rose-200">
                  <div className="text-xs">พักรักษาตัวขณะนี้</div>
                  <div className="text-2xl font-extrabold">{metrics.currentlyResting} คน</div>
                </div>
                <div className="rounded-lg border border-amber-800 bg-amber-950/60 p-3 text-amber-200">
                  <div className="text-xs">SDQ กลุ่มเสี่ยง</div>
                  <div className="text-2xl font-extrabold">{metrics.sdqRisk} คน</div>
                </div>
                <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-rose-200">
                  <div className="text-xs">SDQ มีปัญหาเร่งดูแล</div>
                  <div className="text-2xl font-extrabold">{metrics.sdqProblem} คน</div>
                </div>
              </div>
            </section>
          )}

          {tvSlide === 3 && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-400" />
                <span>สไลด์ 4: การเงินค่าเทอม &amp; ประกาศสำคัญโรงเรียน</span>
              </h2>
              {canViewFinancials && (
                <div className="grid grid-cols-3 gap-3 tabular-nums">
                  <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-emerald-200">
                    <div className="text-xs">ชำระแล้ว ({metrics.collectionRate}%)</div>
                    <div className="text-xl font-extrabold">฿{metrics.totalPaid.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg border border-amber-800 bg-amber-950/60 p-3 text-amber-200">
                    <div className="text-xs">รอชำระ</div>
                    <div className="text-xl font-extrabold">฿{metrics.pendingAmount.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-rose-200">
                    <div className="text-xs">เกินกำหนด</div>
                    <div className="text-xl font-extrabold">฿{metrics.overdueAmount.toLocaleString()}</div>
                  </div>
                </div>
              )}
              <div className="divide-y divide-slate-800">
                {metrics.displayAnnouncements.map((ann) => (
                  <div key={ann.id} className="py-2.5">
                    <div className="text-sm font-bold text-white">{ann.title}</div>
                    <div className="text-xs text-slate-300 mt-0.5">{ann.content}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

// Local clean icon alias for executive monitor lens
function ActivityIcon({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}
