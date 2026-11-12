import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BellRing,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
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
  School,
  SdqAssessment,
  Student,
  Teacher,
  TuitionInvoice,
} from '../types';
import { NavTab } from '../components/layout/Sidebar';
import { getLocalDateString } from '../lib/date';

interface ExecutiveMonitorViewProps {
  activeSchool: School;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  infirmaryVisits: InfirmaryVisit[];
  behaviorRecords: BehaviorRecord[];
  sdqAssessments: SdqAssessment[];
  homeworkSubmissions: HomeworkSubmission[];
  leaveRequests: LeaveRequest[];
  lang: AppLanguage;
  onNavigate: (tab: NavTab) => void;
}

export const ExecutiveMonitorView: React.FC<ExecutiveMonitorViewProps> = ({
  activeSchool,
  students,
  teachers,
  courses,
  grades,
  attendance,
  invoices,
  announcements,
  infirmaryVisits,
  behaviorRecords,
  sdqAssessments,
  homeworkSubmissions,
  leaveRequests,
  onNavigate,
}) => {
  const [displayMode, setDisplayMode] = useState<'director' | 'tv'>('director');
  const [tvSlide, setTvSlide] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = getLocalDateString();

  // Live digital clock
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-rotate slides in TV Mode every 15 seconds
  useEffect(() => {
    if (displayMode !== 'tv' || !autoRotate) return;
    const id = window.setInterval(() => {
      setTvSlide((prev) => (prev + 1) % 4);
    }, 15000);
    return () => window.clearInterval(id);
  }, [displayMode, autoRotate]);

  // Listen to browser fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Safe fallback inside sandboxed iframes where fullscreen permission is restricted
    }
  };

  // Compute live executive metrics across all modules
  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === 'active').length;
    const totalTeachers = teachers.length;
    const lineLinkedStudents = students.filter((s) => s.lineLinked).length;

    // Attendance today (fallback to all attendance if today has 0 for cleaner preview, clearly labeled)
    const todayAttendance = attendance.filter((a) => a.date === todayStr);
    const activeAttendanceSet = todayAttendance.length > 0 ? todayAttendance : attendance;
    const isUsingTodayData = todayAttendance.length > 0;

    const studentAtt = activeAttendanceSet.filter((a) => a.userType !== 'teacher');
    const teacherAtt = activeAttendanceSet.filter((a) => a.userType === 'teacher');

    const presentStudents = studentAtt.filter((a) => a.status === 'present').length;
    const lateStudents = studentAtt.filter((a) => a.status === 'late').length;
    const absentOrLeaveStudents = studentAtt.filter((a) => a.status === 'absent' || a.status === 'leave').length;
    const studentCheckinRate = totalStudents > 0
      ? Math.min(100, Math.round(((presentStudents + lateStudents) / totalStudents) * 100))
      : 0;
    const teacherCheckinRate = totalTeachers > 0
      ? Math.min(100, Math.round((teacherAtt.length / totalTeachers) * 100))
      : 0;

    const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending').length;

    // Academic & Homework
    const avgGpa = totalStudents > 0
      ? Number((students.reduce((sum, s) => sum + (Number(s.gpa) || 0), 0) / totalStudents).toFixed(2))
      : 0;
    const gpaBands = [
      { label: '3.50 – 4.00 (ดีเยี่ยม)', count: students.filter((s) => s.gpa >= 3.5).length, color: 'bg-emerald-500' },
      { label: '3.00 – 3.49 (ดี)', count: students.filter((s) => s.gpa >= 3.0 && s.gpa < 3.5).length, color: 'bg-blue-500' },
      { label: '2.00 – 2.99 (ปานกลาง)', count: students.filter((s) => s.gpa >= 2.0 && s.gpa < 3.0).length, color: 'bg-amber-500' },
      { label: 'ต่ำกว่า 2.00 (ต้องดูแล)', count: students.filter((s) => s.gpa < 2.0).length, color: 'bg-rose-500' },
    ];
    const hwTotal = homeworkSubmissions.length;
    const hwCompleted = homeworkSubmissions.filter((h) => h.status === 'submitted' || h.status === 'graded').length;
    const hwCompletionRate = hwTotal > 0 ? Math.round((hwCompleted / hwTotal) * 100) : 0;

    // Student Care, Infirmary, Behavior & SDQ
    const infirmaryToday = infirmaryVisits.filter((v) => v.visitDate === todayStr).length;
    const currentlyResting = infirmaryVisits.filter((v) => v.status === 'resting').length;
    const meritCount = behaviorRecords.filter((b) => b.type === 'merit').length;
    const demeritCount = behaviorRecords.filter((b) => b.type === 'demerit').length;
    const sdqNormal = sdqAssessments.filter((s) => s.overallStatus === 'normal').length;
    const sdqRisk = sdqAssessments.filter((s) => s.overallStatus === 'risk').length;
    const sdqProblem = sdqAssessments.filter((s) => s.overallStatus === 'problem').length;
    const lowGpaWatchlist = students.filter((s) => s.gpa < 2.25).slice(0, 5);

    // Finance & Tuition
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingAmount = invoices.filter((inv) => inv.status === 'pending').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueAmount = invoices.filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

    const recentScans = [...attendance].slice(0, 6);
    const pinnedAnnouncements = announcements.filter((a) => a.pinned || a.category === 'urgent');
    const displayAnnouncements = pinnedAnnouncements.length > 0 ? pinnedAnnouncements : announcements.slice(0, 4);

    return {
      totalStudents,
      activeStudents,
      totalTeachers,
      lineLinkedStudents,
      isUsingTodayData,
      presentStudents,
      lateStudents,
      absentOrLeaveStudents,
      studentCheckinRate,
      teacherAttCount: teacherAtt.length,
      teacherCheckinRate,
      pendingLeaves,
      avgGpa,
      gpaBands,
      gradesCount: grades.length,
      hwTotal,
      hwCompleted,
      hwCompletionRate,
      coursesCount: courses.length,
      infirmaryTotal: infirmaryVisits.length,
      infirmaryToday,
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
    };
  }, [
    announcements,
    attendance,
    behaviorRecords,
    courses.length,
    grades.length,
    homeworkSubmissions,
    infirmaryVisits,
    invoices,
    leaveRequests,
    sdqAssessments,
    students,
    teachers.length,
    todayStr,
  ]);

  const handleExportExecutiveCsv = () => {
    const rows = [
      ['หมวดรายงาน', 'ตัวชี้วัด', 'ค่าที่วัดได้', 'หน่วย/หมายเหตุ'],
      ['ข้อมูลพื้นฐาน', 'จำนวนนักเรียนทั้งหมด', String(metrics.totalStudents), 'คน'],
      ['ข้อมูลพื้นฐาน', 'จำนวนครูและบุคลากร', String(metrics.totalTeachers), 'ท่าน'],
      ['ข้อมูลพื้นฐาน', 'จำนวนรายวิชาที่เปิดสอน', String(metrics.coursesCount), 'วิชา'],
      ['การมาเรียน', 'อัตราเช็กชื่อนักเรียน', `${metrics.studentCheckinRate}%`, `มาตรงเวลา ${metrics.presentStudents} / สาย ${metrics.lateStudents}`],
      ['การมาเรียน', 'อัตราเช็กชื่อครู', `${metrics.teacherCheckinRate}%`, `${metrics.teacherAttCount} ท่าน`],
      ['การมาเรียน', 'ใบลาที่รออนุมัติ', String(metrics.pendingLeaves), 'รายการ'],
      ['วิชาการ', 'GPAX เฉลี่ยทั้งโรงเรียน', metrics.avgGpa.toFixed(2), 'คะแนนเฉลี่ย'],
      ['วิชาการ', 'อัตราการส่งการบ้าน', `${metrics.hwCompletionRate}%`, `${metrics.hwCompleted}/${metrics.hwTotal} งาน`],
      ['ดูแลช่วยเหลือนักเรียน', 'ผู้ใช้บริการห้องพยาบาลวันนี้ / นอนพัก', `${metrics.infirmaryToday} / ${metrics.currentlyResting}`, 'ครั้ง / คน'],
      ['ดูแลช่วยเหลือนักเรียน', 'ผลคัดกรอง SDQ (ปกติ / เสี่ยง / มีปัญหา)', `${metrics.sdqNormal} / ${metrics.sdqRisk} / ${metrics.sdqProblem}`, 'คน'],
      ['ดูแลช่วยเหลือนักเรียน', 'บันทึกความดี / ตัดคะแนน', `${metrics.meritCount} / ${metrics.demeritCount}`, 'รายการ'],
      ['การเงิน', 'ยอดเรียกเก็บค่าเทอมทั้งหมด', String(metrics.totalBilled), 'บาท'],
      ['การเงิน', 'ยอดชำระแล้ว (อัตราจัดเก็บ)', `${metrics.totalPaid} (${metrics.collectionRate}%)`, 'บาท'],
      ['การเงิน', 'ยอดค้างชำระ / เกินกำหนด', `${metrics.pendingAmount + metrics.overdueAmount}`, 'บาท'],
    ];
    const csvContent = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive_report_${activeSchool.code || activeSchool.id}_${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintDirectorReport = () => {
    window.print();
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
    { id: 0, title: '1. การมาเรียน & ประตูโรงเรียน', icon: QrCode },
    { id: 1, title: '2. ผลสัมฤทธิ์ทางวิชาการ & หลักสูตร', icon: GraduationCap },
    { id: 2, title: '3. กิจการนักเรียน ห้องพยาบาล & SDQ', icon: HeartPulse },
    { id: 3, title: '4. สถานะการเงิน & ประกาศโรงเรียน', icon: Receipt },
  ];

  return (
    <div
      ref={containerRef}
      className={`space-y-4 pb-8 ${
        displayMode === 'tv'
          ? 'min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-800'
          : 'print-area'
      }`}
    >
      {/* Top Control Bar */}
      <div
        className={`rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border ${
          displayMode === 'tv'
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-[var(--color-card)] border-[var(--color-border)]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                displayMode === 'tv'
                  ? 'bg-sky-950 text-sky-300 border-sky-800'
                  : 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{displayMode === 'tv' ? 'TV MONITOR • BROADCAST MODE' : 'DIRECTOR EXECUTIVE OVERVIEW'}</span>
            </span>
            <span className={`text-xs font-semibold ${displayMode === 'tv' ? 'text-slate-300' : 'text-[var(--color-text-muted)]'}`}>
              {activeSchool.nameTh} · ปีการศึกษา {activeSchool.academicYear}/{activeSchool.currentSemester}
            </span>
          </div>
          <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
            {displayMode === 'tv'
              ? 'ศูนย์แสดงผลรายงานภาพรวมโรงเรียนแบบเรียลไทม์ (TV / Digital Signage)'
              : 'แดชบอร์ดภาพรวมผู้บริหาร & ผู้อำนวยการโรงเรียน (Executive Monitor)'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Live Digital Clock */}
          <div
            className={`px-3 py-1.5 rounded-lg border text-right tabular-nums ${
              displayMode === 'tv'
                ? 'bg-slate-950 border-slate-700 text-white'
                : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)]'
            }`}
          >
            <div className="text-base font-extrabold leading-tight flex items-center gap-1.5 justify-end">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>{formattedClock}</span>
            </div>
            <div className={`text-[10px] ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
              {formattedThaiDate}
            </div>
          </div>

          {/* Mode Toggle */}
          <div
            className={`inline-flex p-0.5 rounded-lg border ${
              displayMode === 'tv'
                ? 'bg-slate-950 border-slate-700'
                : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
            }`}
          >
            <button
              type="button"
              onClick={() => setDisplayMode('director')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                displayMode === 'director'
                  ? 'bg-[var(--color-primary)] text-white'
                  : displayMode === 'tv'
                  ? 'text-slate-300 hover:text-white'
                  : 'text-[var(--color-text-body)]'
              }`}
            >
              โหมดผู้อำนวยการ
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('tv')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                displayMode === 'tv'
                  ? 'bg-sky-600 text-white'
                  : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>โหมดจอทีวี (TV)</span>
            </button>
          </div>

          {displayMode === 'director' ? (
            <div className="flex items-center gap-1.5 print:hidden">
              <button
                type="button"
                onClick={handleExportExecutiveCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-text-title)] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrintDirectorReport}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์รายงาน (A4)</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 cursor-pointer"
              >
                {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{autoRotate ? 'หยุดหมุนอัตโนมัติ' : 'เล่นสไลด์อัตโนมัติ'}</span>
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'ย่อหน้าจอ' : 'เต็มจอ TV'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Executive KPI Strip (Always visible in both modes) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            label: 'นักเรียนทั้งหมด',
            value: `${metrics.totalStudents}`,
            sub: `ปกติ ${metrics.activeStudents} · LINE ${metrics.lineLinkedStudents}`,
            icon: Users,
            accent: displayMode === 'tv' ? 'text-sky-400' : 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'เช็กชื่อมาเรียน',
            value: `${metrics.studentCheckinRate}%`,
            sub: `ตรงเวลา ${metrics.presentStudents} · สาย ${metrics.lateStudents}`,
            icon: UserCheck,
            accent: displayMode === 'tv' ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'GPAX เฉลี่ยโรงเรียน',
            value: metrics.avgGpa.toFixed(2),
            sub: `จาก ${metrics.coursesCount} รายวิชา / ${metrics.totalTeachers} ครู`,
            icon: Award,
            accent: displayMode === 'tv' ? 'text-amber-400' : 'text-amber-600 dark:text-amber-400',
          },
          {
            label: 'ส่งการบ้านเฉลี่ย',
            value: `${metrics.hwCompletionRate}%`,
            sub: `ส่งแล้ว ${metrics.hwCompleted}/${metrics.hwTotal} งาน`,
            icon: BookOpen,
            accent: displayMode === 'tv' ? 'text-violet-400' : 'text-violet-600 dark:text-violet-400',
          },
          {
            label: 'ห้องพยาบาล & SDQ',
            value: `${metrics.currentlyResting} คน`,
            sub: `กำลังพัก · SDQ เสี่ยง/ปัญหา ${metrics.sdqRisk + metrics.sdqProblem}`,
            icon: HeartPulse,
            accent: displayMode === 'tv' ? 'text-rose-400' : 'text-rose-600 dark:text-rose-400',
          },
          {
            label: 'จัดเก็บค่าเทอม',
            value: `${metrics.collectionRate}%`,
            sub: `รับแล้ว ฿${metrics.totalPaid.toLocaleString()}`,
            icon: Receipt,
            accent: displayMode === 'tv' ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400',
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`rounded-xl border p-3.5 space-y-1 ${
                displayMode === 'tv'
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-[var(--color-card)] border-[var(--color-border)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                  {kpi.label}
                </span>
                <Icon className={`w-4 h-4 ${kpi.accent}`} />
              </div>
              <div className={`text-2xl font-extrabold tabular-nums ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                {kpi.value}
              </div>
              <div className={`text-[10px] tabular-nums truncate ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* TV Mode Slide Controls */}
      {displayMode === 'tv' && (
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
      )}

      {/* Report Grid: All 4 sections in Director Mode, or active slide in TV Mode */}
      <div className={`grid gap-4 ${displayMode === 'director' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* PANEL 1: Attendance & Gate Security */}
        {(displayMode === 'director' || tvSlide === 0) && (
          <section
            className={`rounded-xl border p-4 sm:p-5 space-y-4 ${
              displayMode === 'tv'
                ? 'bg-slate-900 border-slate-800'
                : 'bg-[var(--color-card)] border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
              <div>
                <h2 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span>รายงานการมาเรียน &amp; ประตูโรงเรียน</span>
                </h2>
                <p className={`text-[11px] ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                  {metrics.isUsingTodayData ? `ข้อมูลประจำวันที่ ${todayStr}` : 'ข้อมูลสถิติสะสมล่าสุดในระบบ'} · ใบลารออนุมัติ {metrics.pendingLeaves} รายการ
                </p>
              </div>
              {displayMode === 'director' && (
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                >
                  ดูรายการสแกน →
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'มาตรงเวลา', value: metrics.presentStudents, cls: displayMode === 'tv' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' },
                { label: 'มาสาย', value: metrics.lateStudents, cls: displayMode === 'tv' ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' },
                { label: 'ขาด / ลา', value: metrics.absentOrLeaveStudents, cls: displayMode === 'tv' ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200' },
                { label: 'ครูลงเวลา', value: `${metrics.teacherAttCount}/${metrics.totalTeachers}`, cls: displayMode === 'tv' ? 'bg-sky-950/60 border-sky-800 text-sky-300' : 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-lg border p-2.5 text-center ${stat.cls}`}>
                  <div className="text-[11px] font-semibold">{stat.label}</div>
                  <div className="text-xl font-extrabold tabular-nums mt-0.5">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className={`text-xs font-bold ${displayMode === 'tv' ? 'text-slate-300' : 'text-[var(--color-text-body)]'}`}>
                บันทึกการสแกนเข้า-ออกล่าสุด
              </div>
              {metrics.recentScans.length === 0 ? (
                <p className={`text-xs ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                  ยังไม่มีข้อมูลการสแกนเข้า-ออก
                </p>
              ) : (
                <div className="divide-y divide-current/10">
                  {metrics.recentScans.map((rec) => (
                    <div key={rec.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className={`font-bold ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                          {rec.userName || 'นักเรียน/บุคลากร'}
                        </span>
                        <span className={`ml-2 text-[11px] ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                          {rec.userDepartmentOrRoom || ''} · {rec.remarks}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === 'present'
                              ? 'bg-emerald-600 text-white'
                              : rec.status === 'late'
                              ? 'bg-amber-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {rec.status === 'present' ? 'ตรงเวลา' : rec.status === 'late' ? 'มาสาย' : rec.status}
                        </span>
                        <span className={`font-mono text-[11px] ${displayMode === 'tv' ? 'text-slate-300' : 'text-[var(--color-text-muted)]'}`}>
                          {rec.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* PANEL 2: Academic Performance */}
        {(displayMode === 'director' || tvSlide === 1) && (
          <section
            className={`rounded-xl border p-4 sm:p-5 space-y-4 ${
              displayMode === 'tv'
                ? 'bg-slate-900 border-slate-800'
                : 'bg-[var(--color-card)] border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
              <div>
                <h2 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>รายงานผลสัมฤทธิ์ทางวิชาการ &amp; หลักสูตร</span>
                </h2>
                <p className={`text-[11px] ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                  GPAX เฉลี่ย {metrics.avgGpa.toFixed(2)} · รายวิชา {metrics.coursesCount} วิชา · ส่งการบ้าน {metrics.hwCompletionRate}%
                </p>
              </div>
              {displayMode === 'director' && (
                <button
                  type="button"
                  onClick={() => onNavigate('gradebook')}
                  className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                >
                  เปิดสมุดวัดผล ปพ.5 →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {metrics.gpaBands.map((band) => {
                const pct = metrics.totalStudents > 0 ? Math.round((band.count / metrics.totalStudents) * 100) : 0;
                return (
                  <div key={band.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className={`font-semibold ${displayMode === 'tv' ? 'text-slate-200' : 'text-[var(--color-text-body)]'}`}>
                        {band.label}
                      </span>
                      <span className={`font-bold ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                        {band.count} คน ({pct}%)
                      </span>
                    </div>
                    <div className={`w-full h-2.5 rounded-full overflow-hidden ${displayMode === 'tv' ? 'bg-slate-800' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      <div className={`h-full rounded-full ${band.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-slate-950 border-slate-800' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'}`}>
                <div className={`text-[10px] font-semibold ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>อัตราส่วนครู:นักเรียน</div>
                <div className="text-base font-extrabold tabular-nums mt-0.5">
                  1 : {metrics.totalTeachers > 0 ? Math.round(metrics.totalStudents / metrics.totalTeachers) : metrics.totalStudents}
                </div>
              </div>
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-slate-950 border-slate-800' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'}`}>
                <div className={`text-[10px] font-semibold ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>รายการเกรดในระบบ</div>
                <div className="text-base font-extrabold tabular-nums mt-0.5">{metrics.gradesCount} รายการ</div>
              </div>
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-slate-950 border-slate-800' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'}`}>
                <div className={`text-[10px] font-semibold ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>นักเรียน GPA &lt; 2.25</div>
                <div className="text-base font-extrabold text-rose-500 tabular-nums mt-0.5">{metrics.lowGpaWatchlist.length} คน</div>
              </div>
            </div>
          </section>
        )}

        {/* PANEL 3: Student Care, Infirmary, Behavior & SDQ */}
        {(displayMode === 'director' || tvSlide === 2) && (
          <section
            className={`rounded-xl border p-4 sm:p-5 space-y-4 ${
              displayMode === 'tv'
                ? 'bg-slate-900 border-slate-800'
                : 'bg-[var(--color-card)] border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
              <div>
                <h2 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>รายงานกิจการนักเรียน ห้องพยาบาล &amp; SDQ</span>
                </h2>
                <p className={`text-[11px] ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                  ระบบดูแลช่วยเหลือนักเรียน OBEC Care &amp; เฝ้าระวังความเสี่ยงผู้บริหาร
                </p>
              </div>
              {displayMode === 'director' && (
                <button
                  type="button"
                  onClick={() => onNavigate('executive_warning')}
                  className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                >
                  ดูพยากรณ์ความเสี่ยง →
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-slate-950 border-slate-800' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'}`}>
                <div className="text-[10px] opacity-75">ห้องพยาบาลสะสม</div>
                <div className="text-lg font-extrabold tabular-nums">{metrics.infirmaryTotal} ครั้ง</div>
              </div>
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-rose-950/60 border-rose-800 text-rose-200' : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'}`}>
                <div className="text-[10px] font-semibold">พักรักษาตัวขณะนี้</div>
                <div className="text-lg font-extrabold tabular-nums">{metrics.currentlyResting} คน</div>
              </div>
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'}`}>
                <div className="text-[10px] font-semibold">บันทึกความดี</div>
                <div className="text-lg font-extrabold tabular-nums">+{metrics.meritCount} ครั้ง</div>
              </div>
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-amber-950/60 border-amber-800 text-amber-200' : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'}`}>
                <div className="text-[10px] font-semibold">ตักเตือน/ตัดคะแนน</div>
                <div className="text-lg font-extrabold tabular-nums">{metrics.demeritCount} ครั้ง</div>
              </div>
            </div>

            <div className={`rounded-lg border p-3 space-y-2 ${displayMode === 'tv' ? 'bg-slate-950 border-slate-800' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'}`}>
              <div className="text-xs font-bold flex items-center justify-between">
                <span>ผลการคัดกรองพฤติกรรม SDQ</span>
                <span className="tabular-nums text-[11px] opacity-80">
                  รวม {metrics.sdqNormal + metrics.sdqRisk + metrics.sdqProblem} คน
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
                <div className="rounded-md bg-emerald-600/15 border border-emerald-500/30 py-1.5">
                  <div className="text-[10px]">ปกติ</div>
                  <div className="font-extrabold text-emerald-500">{metrics.sdqNormal}</div>
                </div>
                <div className="rounded-md bg-amber-600/15 border border-amber-500/30 py-1.5">
                  <div className="text-[10px]">กลุ่มเสี่ยง</div>
                  <div className="font-extrabold text-amber-500">{metrics.sdqRisk}</div>
                </div>
                <div className="rounded-md bg-rose-600/15 border border-rose-500/30 py-1.5">
                  <div className="text-[10px]">มีปัญหา (เร่งดูแล)</div>
                  <div className="font-extrabold text-rose-500">{metrics.sdqProblem}</div>
                </div>
              </div>
            </div>

            {metrics.lowGpaWatchlist.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold flex items-center gap-1.5 text-rose-500">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>รายชื่อเฝ้าระวังผลการเรียน (GPA &lt; 2.25)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.lowGpaWatchlist.map((s) => (
                    <span
                      key={s.id}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold border tabular-nums ${
                        displayMode === 'tv'
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}
                    >
                      {s.firstNameTh} {s.lastNameTh} ({s.room}) · GPA {s.gpa.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* PANEL 4: Finance & School Bulletins */}
        {(displayMode === 'director' || tvSlide === 3) && (
          <section
            className={`rounded-xl border p-4 sm:p-5 space-y-4 ${
              displayMode === 'tv'
                ? 'bg-slate-900 border-slate-800'
                : 'bg-[var(--color-card)] border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
              <div>
                <h2 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                  <Building2 className="w-4 h-4 text-teal-500" />
                  <span>สถานะการเงินค่าเทอม &amp; ประกาศสำคัญโรงเรียน</span>
                </h2>
                <p className={`text-[11px] ${displayMode === 'tv' ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
                  ยอดเรียกเก็บรวม ฿{metrics.totalBilled.toLocaleString()} · จัดเก็บแล้ว {metrics.collectionRate}%
                </p>
              </div>
              {displayMode === 'director' && (
                <button
                  type="button"
                  onClick={() => onNavigate('billing')}
                  className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
                >
                  จัดการการเงิน →
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5 tabular-nums">
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'}`}>
                <div className="text-[10px] font-semibold">ชำระแล้ว</div>
                <div className="text-sm sm:text-base font-extrabold mt-0.5">฿{metrics.totalPaid.toLocaleString()}</div>
              </div>
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-amber-950/60 border-amber-800 text-amber-200' : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'}`}>
                <div className="text-[10px] font-semibold">รอชำระ</div>
                <div className="text-sm sm:text-base font-extrabold mt-0.5">฿{metrics.pendingAmount.toLocaleString()}</div>
              </div>
              <div className={`rounded-lg border p-2.5 ${displayMode === 'tv' ? 'bg-rose-950/60 border-rose-800 text-rose-200' : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'}`}>
                <div className="text-[10px] font-semibold">เกินกำหนด</div>
                <div className="text-sm sm:text-base font-extrabold mt-0.5">฿{metrics.overdueAmount.toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-amber-500" />
                <span>ประกาศสำคัญสำหรับผู้บริหาร / จอประชาสัมพันธ์</span>
              </div>
              {metrics.displayAnnouncements.length === 0 ? (
                <p className="text-xs opacity-70">ยังไม่มีประกาศในขณะนี้</p>
              ) : (
                <div className="space-y-2">
                  {metrics.displayAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`rounded-lg border p-2.5 ${
                        displayMode === 'tv'
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${displayMode === 'tv' ? 'text-white' : 'text-[var(--color-text-title)]'}`}>
                          {ann.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                            ann.category === 'urgent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          {ann.category === 'urgent' ? 'ด่วน' : 'ประกาศ'}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 line-clamp-2 ${displayMode === 'tv' ? 'text-slate-300' : 'text-[var(--color-text-body)]'}`}>
                        {ann.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* TV Bottom Ticker */}
      {displayMode === 'tv' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 flex items-center gap-3 text-xs">
          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>LIVE REPORT</span>
          </span>
          <div className="flex-1 truncate text-slate-200 font-medium tabular-nums">
            {activeSchool.nameTh} · นักเรียนเช็กชื่อ {metrics.studentCheckinRate}% · GPAX เฉลี่ย {metrics.avgGpa.toFixed(2)} · ใบลารออนุมัติ {metrics.pendingLeaves} รายการ ·{' '}
            {metrics.displayAnnouncements[0]?.title || 'ระบบทำงานปกติ'}
          </div>
        </div>
      )}
    </div>
  );
};
