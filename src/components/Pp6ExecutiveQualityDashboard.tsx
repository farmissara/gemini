import React, { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Printer,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  Course,
  GradeRecord,
  PeriodAttendanceRecord,
  School,
  Student,
  SystemConfig,
  TimetableSlot,
} from '../types';
import {
  calculateStudentAcademicSummary,
  detectEducationStage,
  isPrimaryStage,
} from '../lib/moeGrading';
import {
  calculateDetailedCourseAttendance,
  getStudentQualitativeRecord,
  loadQualitativeAssessments,
  summarizeStudentQualitative,
} from '../lib/moeQualitativeStore';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';

interface Pp6ExecutiveQualityDashboardProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  systemConfig: SystemConfig;
  school?: School;
  lang?: AppLanguage;
  onOpenStudentDevBook?: (studentId: string) => void;
  onOpenStudentPp6?: (studentId: string) => void;
  onOpenPp5Summary?: () => void;
}

type StageScope = 'all' | 'primary' | 'lower_secondary' | 'upper_secondary';
type GroupByMode = 'gradeLevel' | 'room';

interface GroupQualityRow {
  groupKey: string;
  label: string;
  subLabel: string;
  studentCount: number;
  gradedStudents: number;
  avgGpa: number;
  avgRawScore: number;
  attendanceRate: number;
  attrPassPct: number;
  attrExcellentPct: number;
  readingPassPct: number;
  readingExcellentPct: number;
  compPassPct: number;
  activityPassPct: number;
  msRiskCount: number;
  academicRiskCount: number;
  pp6CompleteReadyPct: number;
}

function getLevelOrder(level: string): number {
  const s = level.trim().toLowerCase().replace(/\s+/g, '');
  const k = s.match(/(?:อ\.?|อนุบาล)([1-3])/);
  if (k) return Number(k[1]);
  const p = s.match(/(?:ป\.?|ประถม(?:ศึกษาปีที่)?)([1-6])/);
  if (p) return 10 + Number(p[1]);
  const m = s.match(/(?:ม\.?|มัธยม(?:ศึกษาปีที่)?)([1-6])/);
  if (m) return 20 + Number(m[1]);
  const g = s.match(/grade([0-9]+)/);
  if (g) return 30 + Number(g[1]);
  return 99;
}

function matchesStageScope(student: Student, scope: StageScope): boolean {
  if (scope === 'all') return true;
  const stage = detectEducationStage(student.gradeLevel);
  if (scope === 'primary') return isPrimaryStage(stage);
  return stage === scope;
}

export const Pp6ExecutiveQualityDashboard: React.FC<Pp6ExecutiveQualityDashboardProps> = ({
  students,
  courses,
  grades,
  attendance,
  periodAttendance = [],
  timetableSlots = [],
  systemConfig,
  school,
  lang = 'th',
  onOpenStudentDevBook,
  onOpenStudentPp6,
  onOpenPp5Summary,
}) => {
  const schoolId = school?.id || students[0]?.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';

  const [stageScope, setStageScope] = useState<StageScope>('all');
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('gradeLevel');
  const [chartView, setChartView] = useState<'gpa_attendance' | 'obec_pillars'>('gpa_attendance');
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  const qualitativeMap = useMemo(
    () => loadQualitativeAssessments(schoolId, academicYear, semester),
    [schoolId, academicYear, semester]
  );

  const gradeLevelOptions = useMemo(() => {
    const base = students.filter((s) => matchesStageScope(s, stageScope));
    return Array.from(new Set(base.map((s) => (s.gradeLevel || '').trim()).filter(Boolean))).sort(
      (a, b) => getLevelOrder(a) - getLevelOrder(b) || a.localeCompare(b, 'th')
    );
  }, [students, stageScope]);

  const scopedStudents = useMemo(() => {
    return students.filter((s) => {
      if (!matchesStageScope(s, stageScope)) return false;
      if (gradeLevelFilter !== 'all' && (s.gradeLevel || '').trim() !== gradeLevelFilter) return false;
      return true;
    });
  }, [students, stageScope, gradeLevelFilter]);

  const studentMetrics = useMemo(() => {
    return scopedStudents.map((stu) => {
      const academic = calculateStudentAcademicSummary({
        student: stu,
        courses,
        grades,
        gradingSystem: systemConfig.gradingSystem,
      });

      const stuCourseIds = new Set(grades.filter((g) => g.studentId === stu.id).map((g) => g.courseId));
      const matchedCourses = courses.filter(
        (c) =>
          stuCourseIds.has(c.id) ||
          (!c.room && !stuCourseIds.size) ||
          (c.room && c.room === stu.room)
      );

      let attendanceRate = 95;
      let hasMsRisk = false;

      if (matchedCourses.length > 0) {
        const attDetails = matchedCourses.slice(0, 10).map((course) =>
          calculateDetailedCourseAttendance({
            student: stu,
            course,
            attendance,
            periodAttendance,
            timetableSlots,
          })
        );
        const totalPct = attDetails.reduce((acc, d) => acc + d.attendancePercent, 0);
        attendanceRate = Math.round((totalPct / attDetails.length) * 10) / 10;
        hasMsRisk = attDetails.some((d) => d.isAtRiskMs);
      } else {
        const stuDaily = attendance.filter((r) => r.studentId === stu.id);
        if (stuDaily.length > 0) {
          const present = stuDaily.filter(
            (r) => r.status === 'present' || r.status === 'late' || r.status === 'leave' || r.status === 'sick'
          ).length;
          attendanceRate = Math.round((present / stuDaily.length) * 1000) / 10;
          hasMsRisk = attendanceRate < 80;
        }
      }

      const qualRecord = getStudentQualitativeRecord(qualitativeMap, stu.id);
      const qualSummary = summarizeStudentQualitative(qualRecord);

      const stuGrades = grades.filter((g) => g.studentId === stu.id);
      const incompleteCount = stuGrades.filter(
        (g) => g.letterGrade === 'ร' || g.letterGrade === 'มส.' || g.letterGrade === '0' || Number(g.totalScore) < 50
      ).length;

      const gpaVal = academic.gpax ?? academic.annualGradeAverage ?? 0;
      const rawVal = academic.averageRawScore ?? 0;
      const hasAcademicRisk =
        academic.hasRecordedGrades &&
        (incompleteCount > 0 || (academic.hideGpaCalculations ? rawVal < 50 : gpaVal < 1.5));

      const isPp6Ready =
        !hasMsRisk &&
        !hasAcademicRisk &&
        qualSummary.attrLevel >= 1 &&
        qualSummary.readingLevel >= 1 &&
        qualSummary.compLevel >= 1 &&
        qualSummary.activityResult.startsWith('ผ');

      return {
        student: stu,
        academic,
        gpaVal,
        rawVal,
        attendanceRate,
        hasMsRisk,
        hasAcademicRisk,
        qualSummary,
        isPp6Ready,
      };
    });
  }, [scopedStudents, courses, grades, attendance, periodAttendance, timetableSlots, qualitativeMap, systemConfig.gradingSystem]);

  const groupRows = useMemo<GroupQualityRow[]>(() => {
    const map = new Map<string, typeof studentMetrics>();
    studentMetrics.forEach((m) => {
      const key =
        groupByMode === 'gradeLevel'
          ? (m.student.gradeLevel || 'ไม่ระบุระดับชั้น').trim()
          : (m.student.room || m.student.gradeLevel || 'ไม่ระบุห้อง').trim();
      const arr = map.get(key) || [];
      arr.push(m);
      map.set(key, arr);
    });

    const rows: GroupQualityRow[] = [];
    map.forEach((list, key) => {
      const count = list.length;
      const gradedList = list.filter((x) => x.academic.hasRecordedGrades);
      const avgGpa =
        gradedList.length > 0
          ? Math.round((gradedList.reduce((acc, x) => acc + x.gpaVal, 0) / gradedList.length) * 100) / 100
          : 0;
      const avgRawScore =
        gradedList.length > 0
          ? Math.round((gradedList.reduce((acc, x) => acc + x.rawVal, 0) / gradedList.length) * 10) / 10
          : 0;
      const attendanceRate =
        count > 0
          ? Math.round((list.reduce((acc, x) => acc + x.attendanceRate, 0) / count) * 10) / 10
          : 0;

      const attrPassCount = list.filter((x) => x.qualSummary.attrLevel >= 1).length;
      const attrExcCount = list.filter((x) => x.qualSummary.attrLevel >= 2).length;
      const readingPassCount = list.filter((x) => x.qualSummary.readingLevel >= 1).length;
      const readingExcCount = list.filter((x) => x.qualSummary.readingLevel >= 2).length;
      const compPassCount = list.filter((x) => x.qualSummary.compLevel >= 1).length;
      const actPassCount = list.filter((x) => x.qualSummary.activityResult.startsWith('ผ')).length;
      const readyCount = list.filter((x) => x.isPp6Ready).length;

      rows.push({
        groupKey: key,
        label: key,
        subLabel:
          groupByMode === 'gradeLevel'
            ? `${new Set(list.map((x) => x.student.room).filter(Boolean)).size} ห้องเรียน`
            : list[0]?.student.gradeLevel || '',
        studentCount: count,
        gradedStudents: gradedList.length,
        avgGpa,
        avgRawScore,
        attendanceRate,
        attrPassPct: count > 0 ? Math.round((attrPassCount / count) * 100) : 0,
        attrExcellentPct: count > 0 ? Math.round((attrExcCount / count) * 100) : 0,
        readingPassPct: count > 0 ? Math.round((readingPassCount / count) * 100) : 0,
        readingExcellentPct: count > 0 ? Math.round((readingExcCount / count) * 100) : 0,
        compPassPct: count > 0 ? Math.round((compPassCount / count) * 100) : 0,
        activityPassPct: count > 0 ? Math.round((actPassCount / count) * 100) : 0,
        msRiskCount: list.filter((x) => x.hasMsRisk).length,
        academicRiskCount: list.filter((x) => x.hasAcademicRisk).length,
        pp6CompleteReadyPct: count > 0 ? Math.round((readyCount / count) * 100) : 0,
      });
    });

    return rows.sort((a, b) => {
      if (groupByMode === 'gradeLevel') {
        return getLevelOrder(a.label) - getLevelOrder(b.label) || a.label.localeCompare(b.label, 'th');
      }
      return a.label.localeCompare(b.label, 'th');
    });
  }, [studentMetrics, groupByMode]);

  const schoolKpis = useMemo(() => {
    const total = studentMetrics.length;
    if (total === 0) {
      return {
        total: 0,
        avgGpa: 0,
        avgRawScore: 0,
        avgAttendance: 0,
        attrGoodPct: 0,
        readingGoodPct: 0,
        compPassPct: 0,
        activityPassPct: 0,
        msRiskTotal: 0,
        academicRiskTotal: 0,
        pp6ReadyPct: 0,
      };
    }
    const graded = studentMetrics.filter((x) => x.academic.hasRecordedGrades);
    const avgGpa =
      graded.length > 0
        ? Math.round((graded.reduce((acc, x) => acc + x.gpaVal, 0) / graded.length) * 100) / 100
        : 0;
    const avgRawScore =
      graded.length > 0
        ? Math.round((graded.reduce((acc, x) => acc + x.rawVal, 0) / graded.length) * 10) / 10
        : 0;
    const avgAttendance =
      Math.round((studentMetrics.reduce((acc, x) => acc + x.attendanceRate, 0) / total) * 10) / 10;

    return {
      total,
      avgGpa,
      avgRawScore,
      avgAttendance,
      attrGoodPct: Math.round((studentMetrics.filter((x) => x.qualSummary.attrLevel >= 2).length / total) * 100),
      readingGoodPct: Math.round((studentMetrics.filter((x) => x.qualSummary.readingLevel >= 2).length / total) * 100),
      compPassPct: Math.round((studentMetrics.filter((x) => x.qualSummary.compLevel >= 1).length / total) * 100),
      activityPassPct: Math.round(
        (studentMetrics.filter((x) => x.qualSummary.activityResult.startsWith('ผ')).length / total) * 100
      ),
      msRiskTotal: studentMetrics.filter((x) => x.hasMsRisk).length,
      academicRiskTotal: studentMetrics.filter((x) => x.hasAcademicRisk).length,
      pp6ReadyPct: Math.round((studentMetrics.filter((x) => x.isPp6Ready).length / total) * 100),
    };
  }, [studentMetrics]);

  const drilldownStudents = useMemo(() => {
    if (!selectedGroupKey) {
      return studentMetrics
        .filter((x) => x.hasMsRisk || x.hasAcademicRisk || x.qualSummary.attrLevel === 0 || x.qualSummary.readingLevel === 0)
        .slice(0, 12);
    }
    return studentMetrics.filter((m) => {
      const key =
        groupByMode === 'gradeLevel'
          ? (m.student.gradeLevel || 'ไม่ระบุระดับชั้น').trim()
          : (m.student.room || m.student.gradeLevel || 'ไม่ระบุห้อง').trim();
      return key === selectedGroupKey;
    });
  }, [studentMetrics, selectedGroupKey, groupByMode]);

  const handlePrint = () => {
    if (!printSheetRef.current) return;
    printHtmlElementInIsolatedFrame(
      printSheetRef.current.innerHTML,
      `สรุปภาพรวมคุณภาพผู้เรียน ปพ.6 สำหรับผู้บริหาร - ${school?.nameTh || systemConfig.schoolNameTh}`
    );
  };

  const handleExportCsv = () => {
    const headers = [
      groupByMode === 'gradeLevel' ? 'ระดับชั้น' : 'ห้องเรียน',
      'จำนวนนักเรียน',
      'GPA เฉลี่ย',
      'คะแนนเฉลี่ย (%)',
      'สถิติการมาเรียน (%)',
      'คุณลักษณะฯ ผ่าน (%)',
      'คุณลักษณะฯ ดี-ดีเยี่ยม (%)',
      'อ่านคิดวิเคราะห์ฯ ผ่าน (%)',
      'อ่านคิดวิเคราะห์ฯ ดี-ดีเยี่ยม (%)',
      'สมรรถนะฯ ผ่าน (%)',
      'กิจกรรมฯ ผ่าน (%)',
      'เสี่ยงเวลาเรียน (<80%)',
      'เสี่ยงวิชาการ (0/ร/มส.)',
      'ผ่านเกณฑ์ ปพ.6 ครบทุกมิติ (%)',
    ];
    const lines = groupRows.map((r) =>
      [
        `"${r.label}"`,
        r.studentCount,
        r.avgGpa.toFixed(2),
        r.avgRawScore.toFixed(1),
        r.attendanceRate.toFixed(1),
        r.attrPassPct,
        r.attrExcellentPct,
        r.readingPassPct,
        r.readingExcellentPct,
        r.compPassPct,
        r.activityPassPct,
        r.msRiskCount,
        r.academicRiskCount,
        r.pp6CompleteReadyPct,
      ].join(',')
    );
    const bom = '\uFEFF';
    const blob = new Blob([bom + [headers.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `executive_pp6_quality_${academicYear}_${semester}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header & Action Controls */}
      <div className="saas-card saas-card-body flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
            <h2 className="text-base font-bold text-[var(--color-text-title)] truncate">
              {lang === 'th'
                ? 'แดชบอร์ดผู้บริหาร · ภาพรวมคุณภาพผู้เรียน ปพ.6 ตามตัวชี้วัด สพฐ.'
                : 'Executive OBEC Pp.6 Student Quality Dashboard'}
            </h2>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {school?.nameTh || systemConfig.schoolNameTh} · {formatSemesterLabel(semester)} ปีการศึกษา {academicYear} · เปรียบเทียบผลสัมฤทธิ์ เวลาเรียน และคุณภาพ 4 ด้านตาม ปพ.6
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenPp5Summary && (
            <button
              type="button"
              onClick={onOpenPp5Summary}
              className="btn-tool-neutral px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>สรุป ปพ.5 วิชาพื้นฐานรายห้อง</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-tool-neutral px-3 py-1.5 text-xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-action-primary px-3 py-1.5 text-xs whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงานผู้บริหาร (A4)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="saas-card saas-card-body flex flex-wrap items-center justify-between gap-2.5 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">ช่วงชั้น:</span>
          <div className="seg-tab-group inline-flex flex-wrap">
            {([
              { id: 'all', label: 'ทั้งโรงเรียน' },
              { id: 'primary', label: 'ประถมศึกษา' },
              { id: 'lower_secondary', label: 'ม.ต้น' },
              { id: 'upper_secondary', label: 'ม.ปลาย' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-active={stageScope === opt.id}
                onClick={() => {
                  setStageScope(opt.id);
                  setGradeLevelFilter('all');
                  setSelectedGroupKey(null);
                }}
                className="seg-tab-btn whitespace-nowrap shrink-0"
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={gradeLevelFilter}
            onChange={(e) => {
              setGradeLevelFilter(e.target.value);
              setSelectedGroupKey(null);
            }}
            aria-label="กรองระดับชั้น"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
          >
            <option value="all">ทุกระดับชั้น</option>
            {gradeLevelOptions.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="seg-tab-group inline-flex">
            <button
              type="button"
              data-active={groupByMode === 'gradeLevel'}
              onClick={() => {
                setGroupByMode('gradeLevel');
                setSelectedGroupKey(null);
              }}
              className="seg-tab-btn whitespace-nowrap shrink-0"
            >
              เทียบรายระดับชั้น
            </button>
            <button
              type="button"
              data-active={groupByMode === 'room'}
              onClick={() => {
                setGroupByMode('room');
                setSelectedGroupKey(null);
              }}
              className="seg-tab-btn whitespace-nowrap shrink-0"
            >
              เทียบรายห้องเรียน
            </button>
          </div>

          <div className="seg-tab-group inline-flex">
            <button
              type="button"
              data-active={chartView === 'gpa_attendance'}
              onClick={() => setChartView('gpa_attendance')}
              className="seg-tab-btn whitespace-nowrap shrink-0"
            >
              ผลการเรียน vs เวลาเรียน
            </button>
            <button
              type="button"
              data-active={chartView === 'obec_pillars'}
              onClick={() => setChartView('obec_pillars')}
              className="seg-tab-btn whitespace-nowrap shrink-0"
            >
              4 ตัวชี้วัดคุณภาพ ปพ.6
            </button>
          </div>
        </div>
      </div>

      {/* Printable & Main Executive Body */}
      <div ref={printSheetRef} className="space-y-4 print:bg-white print:text-slate-900">
        {/* Official Print Header */}
        <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3">
          <h2 className="text-base font-extrabold">
            รายงานสรุปภาพรวมคุณภาพผู้เรียนตามแบบ ปพ.๖ (สำหรับผู้บริหารสถานศึกษา)
          </h2>
          <p className="text-xs">
            โรงเรียน{school?.nameTh || systemConfig.schoolNameTh} · {formatSemesterLabel(semester)} ปีการศึกษา {academicYear}
          </p>
        </div>

        {/* 4 KPI Summary Strip (Unified Single-Elevation Hairline Grid) */}
        <div className="saas-kpi-strip overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
            <div className="saas-kpi-cell space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>ผลสัมฤทธิ์เฉลี่ย ปพ.6</span>
                <Award className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-mono tabular-nums text-[var(--color-text-title)]">
                  {schoolKpis.avgGpa.toFixed(2)}
                </span>
                <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                  ({schoolKpis.avgRawScore.toFixed(1)}%)
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
                นักเรียน {schoolKpis.total} คน · เสี่ยงวิชาการ {schoolKpis.academicRiskTotal} คน
              </p>
            </div>

            <div className="saas-kpi-cell space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>สถิติการมาเรียนเฉลี่ย</span>
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                  {schoolKpis.avgAttendance.toFixed(1)}%
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">เกณฑ์ สพฐ. ≥ 80%</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
                เสี่ยงเวลาเรียน (&lt;80% / มส.) {schoolKpis.msRiskTotal} คน
              </p>
            </div>

            <div className="saas-kpi-cell space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>คุณลักษณะฯ &amp; อ่านเขียน (ระดับดี+)</span>
                <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-extrabold font-mono tabular-nums text-sky-700 dark:text-sky-300">
                  {schoolKpis.attrGoodPct}%
                </span>
                <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                  อ่านเขียนดี+ {schoolKpis.readingGoodPct}%
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
                สมรรถนะ 5 ประการ ผ่าน {schoolKpis.compPassPct}% · กิจกรรม ผ่าน {schoolKpis.activityPassPct}%
              </p>
            </div>

            <div className="saas-kpi-cell space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>ผ่านเกณฑ์ ปพ.6 ครบทุกองค์ประกอบ</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-mono tabular-nums text-[var(--color-text-title)]">
                  {schoolKpis.pp6ReadyPct}%
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">เป้าหมาย สพฐ. 80%+</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                ไม่ติด ร / มส. และผ่านคุณลักษณะฯ + กิจกรรม
              </p>
            </div>
          </div>
        </div>

        {/* Executive Readiness Summary Strip */}
        <div className="saas-alert-bar text-xs">
          <span className="font-semibold text-[var(--color-text-title)]">
            สรุปความพร้อมคุณภาพผู้เรียน ({groupRows.length} {groupByMode === 'gradeLevel' ? 'ระดับชั้น' : 'ห้องเรียน'}): ผ่านครบองค์ประกอบ ปพ.6 {schoolKpis.pp6ReadyPct}%
          </span>
          <span className="type-meta tabular-nums">
            กลุ่มเสี่ยงวิชาการ {schoolKpis.academicRiskTotal} คน · เสี่ยง มส. {schoolKpis.msRiskTotal} คน
          </span>
        </div>

        {/* Main Comparative Chart */}
        <div className="saas-card saas-card-body space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                {chartView === 'gpa_attendance'
                  ? 'กราฟเปรียบเทียบผลการเรียนเฉลี่ย (GPA / %) กับสถิติการมาเรียน (%) ตามเกณฑ์ สพฐ.'
                  : 'กราฟเปรียบเทียบร้อยละผู้เรียนระดับ "ดี–ดีเยี่ยม" และผ่านเกณฑ์ 4 มิติ ปพ.6 สพฐ.'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {chartView === 'gpa_attendance'
                  ? 'เส้นประสีแดงแสดงเกณฑ์ขั้นต่ำเวลาเรียน 80% ตามระเบียบวัดผล สพฐ. (คลิกแถวตารางด้านล่างเพื่อเจาะลึกรายคน)'
                  : 'แสดงสัดส่วนนักเรียนระดับดีขึ้นไปในด้านคุณลักษณะฯ 8 ประการ, การอ่าน คิดวิเคราะห์ เขียน, และอัตราผ่านเกณฑ์ ปพ.6 ครบด้าน'}
              </p>
            </div>
            <div className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
              {groupRows.length} {groupByMode === 'gradeLevel' ? 'ระดับชั้น' : 'ห้องเรียน'}
            </div>
          </div>

          {groupRows.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
              ไม่พบข้อมูลนักเรียนในขอบเขตระดับชั้นที่เลือก
            </div>
          ) : chartView === 'gpa_attendance' ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={groupRows} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 4]}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    label={{ value: 'GPA (0–4)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--color-text-muted)' } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    label={{ value: 'ร้อยละ (%)', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: 'var(--color-text-muted)' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => {
                      const num = Number(value ?? 0);
                      const labelStr = String(name ?? '');
                      if (labelStr.includes('GPA')) return [num.toFixed(2), labelStr];
                      return [`${num.toFixed(1)}%`, labelStr];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine
                    yAxisId="right"
                    y={80}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    label={{ value: 'เกณฑ์เวลาเรียน สพฐ. 80%', position: 'insideTopRight', fill: '#dc2626', fontSize: 10 }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={2.5}
                    stroke="#0284c7"
                    strokeDasharray="3 3"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="avgGpa"
                    name="GPA เฉลี่ย"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="avgRawScore"
                    name="คะแนนรวมเฉลี่ย (%)"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="attendanceRate"
                    name="สถิติการมาเรียน (%)"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#059669' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupRows} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => [`${Number(value ?? 0)}%`, String(name ?? '')]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine
                    y={75}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    label={{ value: 'เป้าหมาย สพฐ. 75%', position: 'insideTopRight', fill: '#059669', fontSize: 10 }}
                  />
                  <Bar dataKey="attrExcellentPct" name="คุณลักษณะฯ (ดี–ดีเยี่ยม %)" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="readingExcellentPct" name="อ่าน คิดวิเคราะห์ฯ (ดี–ดีเยี่ยม %)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pp6CompleteReadyPct" name="ผ่านเกณฑ์ ปพ.6 ครบทุกมิติ (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* OBEC Group Comparison Table */}
        <div className="saas-card overflow-hidden">
          <div className="saas-card-header flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="type-section-title">
                ตารางเปรียบเทียบตัวชี้วัด ปพ.6 ราย{groupByMode === 'gradeLevel' ? 'ระดับชั้น' : 'ห้องเรียน'}
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                คลิกที่แถวเพื่อดูรายชื่อนักเรียนในกลุ่มนั้น หรือตรวจนักเรียนกลุ่มเสี่ยงด้านล่าง
              </p>
            </div>
            {selectedGroupKey && (
              <button
                type="button"
                onClick={() => setSelectedGroupKey(null)}
                className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden"
              >
                แสดงเฉพาะกลุ่มเสี่ยง ({groupRows.length} กลุ่ม)
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="table-comfortable w-full text-xs text-left">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                <tr>
                  <th className="py-2.5 px-3">{groupByMode === 'gradeLevel' ? 'ระดับชั้น' : 'ห้องเรียน'}</th>
                  <th className="py-2.5 px-3 text-right">นักเรียน</th>
                  <th className="py-2.5 px-3 text-right">GPA เฉลี่ย</th>
                  <th className="py-2.5 px-3 text-right">คะแนนเฉลี่ย</th>
                  <th className="py-2.5 px-3 text-right">มาเรียนเฉลี่ย</th>
                  <th className="py-2.5 px-3 text-right">คุณลักษณะฯ ดี+</th>
                  <th className="py-2.5 px-3 text-right">อ่านเขียน ดี+</th>
                  <th className="py-2.5 px-3 text-right">สมรรถนะ/กิจกรรม ผ่าน</th>
                  <th className="py-2.5 px-3 text-right">เสี่ยง (ร/มส./&lt;80%)</th>
                  <th className="py-2.5 px-3 text-right">ผ่านครบ ปพ.6</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] font-mono tabular-nums">
                {groupRows.map((row) => {
                  const isSelected = selectedGroupKey === row.label;
                  const totalRisk = row.msRiskCount + row.academicRiskCount;
                  return (
                    <tr
                      key={row.groupKey}
                      onClick={() => setSelectedGroupKey((prev) => (prev === row.label ? null : row.label))}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-[var(--color-primary-light)]'
                          : 'hover:bg-[var(--color-card-subtle)]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-[var(--color-text-title)]">{row.label}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{row.subLabel}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">{row.studentCount}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[var(--color-primary-text)]">
                        {row.avgGpa.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">{row.avgRawScore.toFixed(1)}%</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          row.attendanceRate < 80
                            ? 'text-rose-600 dark:text-rose-400'
                            : row.attendanceRate >= 90
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {row.attendanceRate.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right">{row.attrExcellentPct}%</td>
                      <td className="py-2.5 px-3 text-right">{row.readingExcellentPct}%</td>
                      <td className="py-2.5 px-3 text-right">
                        {row.compPassPct}% / {row.activityPassPct}%
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          totalRisk > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {totalRisk > 0 ? `${row.academicRiskCount} / ${row.msRiskCount}` : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[var(--color-text-title)]">
                        {row.pp6CompleteReadyPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drilldown Students Panel */}
        <div className="saas-card overflow-hidden print:hidden">
          <div className="saas-card-header flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedGroupKey ? (
                <Users className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <h3 className="type-section-title">
                {selectedGroupKey
                  ? `รายชื่อนักเรียน ปพ.6 · ${selectedGroupKey} (${drilldownStudents.length} คน)`
                  : `นักเรียนกลุ่มติดตามเร่งด่วนตามตัวชี้วัด ปพ.6 (${drilldownStudents.length} คน)`}
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              คลิกเปิดดูสมุดพัฒนาคุณภาพฯ หรือ ปพ.6 รายบุคคล
            </span>
          </div>

          {drilldownStudents.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
              ไม่มีนักเรียนกลุ่มเสี่ยงในขอบเขตนี้ (ผ่านเกณฑ์ ปพ.6 สพฐ. ทุกคน)
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-comfortable w-full text-xs text-left">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                  <tr>
                    <th className="py-2 px-3">รหัส · ชื่อ-นามสกุล</th>
                    <th className="py-2 px-3">ระดับชั้น / ห้อง</th>
                    <th className="py-2 px-3 text-right">GPA / เฉลี่ย</th>
                    <th className="py-2 px-3 text-right">เวลาเรียน</th>
                    <th className="py-2 px-3">คุณลักษณะฯ</th>
                    <th className="py-2 px-3">อ่าน คิดวิเคราะห์ฯ</th>
                    <th className="py-2 px-3 text-right">เครื่องมือ ปพ.6</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {drilldownStudents.slice(0, 25).map((item) => (
                    <tr key={item.student.id} className="hover:bg-[var(--color-card-subtle)]">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-[var(--color-text-title)]">
                          {item.student.firstNameTh} {item.student.lastNameTh}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                          {item.student.studentIdNumber}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[var(--color-text-body)]">
                        {item.student.gradeLevel} · {item.student.room}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                        {item.academic.hideGpaCalculations
                          ? `${item.rawVal.toFixed(1)}%`
                          : item.gpaVal.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                          item.hasMsRisk ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {item.attendanceRate.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-[var(--color-text-body)]">{item.qualSummary.attrLabel}</td>
                      <td className="py-2 px-3 text-[var(--color-text-body)]">{item.qualSummary.readingLabel}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {onOpenStudentDevBook && (
                            <button
                              type="button"
                              onClick={() => onOpenStudentDevBook(item.student.id)}
                              className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[11px] font-semibold cursor-pointer"
                            >
                              สมุดพัฒนาฯ
                            </button>
                          )}
                          {onOpenStudentPp6 && (
                            <button
                              type="button"
                              onClick={() => onOpenStudentPp6(item.student.id)}
                              className="px-2 py-1 rounded border border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>ปพ.6</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
