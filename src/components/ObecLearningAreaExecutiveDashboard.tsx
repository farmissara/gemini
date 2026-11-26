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
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  Printer,
  TrendingUp,
  UserCheck,
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
  Teacher,
  TimetableSlot,
} from '../types';
import { MOE_LEARNING_AREAS, resolveMoeLearningArea } from '../data/moeCurriculumStandards';
import { StatusBadge, type StatusBadgeStatus } from './common/StatusBadge';
import {
  detectEducationStage,
  isActivityCourse,
  isPrimaryStage,
  resolveEffectiveGrade,
} from '../lib/moeGrading';
import { calculateDetailedCourseAttendance } from '../lib/moeQualitativeStore';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';

interface ObecLearningAreaExecutiveDashboardProps {
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  systemConfig: SystemConfig;
  school?: School;
  lang?: AppLanguage;
  onNavigateToGradebook?: (courseId?: string) => void;
}

type LevelScope = 'all' | 'primary' | 'lower_secondary' | 'upper_secondary' | string;
type ChartMode = 'gpa_attendance' | 'quality_tiers';

interface CourseAreaStats {
  course: Course;
  gradedCount: number;
  avgRawScore: number;
  avgGpa: number;
  attendanceRate: number;
  atRiskMsCount: number;
  passPct: number;
  goodOrAbovePct: number;
  failCount: number;
}

interface LearningAreaSummary {
  areaId: string;
  codePrefix: string;
  nameTh: string;
  shortTh: string;
  nameEn: string;
  isActivityArea: boolean;
  courseCount: number;
  teacherCount: number;
  gradedCount: number;
  avgRawScore: number;
  avgGpa: number;
  attendanceRate: number;
  atRiskMsCount: number;
  passPct: number;
  goodOrAbovePct: number;
  distinctionPct: number;
  failRiskPct: number;
  failRiskCount: number;
  qualityTier: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'no_data';
  qualityLabelTh: string;
  qualityNoteTh: string;
  courseBreakdown: CourseAreaStats[];
}

function getLevelOrder(level: string): number {
  const s = level.trim().toLowerCase().replace(/\s+/g, '');
  const primary = s.match(/(?:ป\.?|ประถม(?:ศึกษาปีที่)?)([1-6])/);
  if (primary) return 10 + Number(primary[1]);
  const sec = s.match(/(?:ม\.?|มัธยม(?:ศึกษาปีที่)?)([1-6])/);
  if (sec) return 20 + Number(sec[1]);
  const grade = s.match(/grade([0-9]+)/);
  if (grade) return 30 + Number(grade[1]);
  return 99;
}

function matchesLevelScope(student: Student, scope: LevelScope): boolean {
  if (scope === 'all') return true;
  const stage = detectEducationStage(student.gradeLevel);
  if (scope === 'primary') return isPrimaryStage(stage);
  if (scope === 'lower_secondary') return stage === 'lower_secondary';
  if (scope === 'upper_secondary') return stage === 'upper_secondary';
  return (student.gradeLevel || '').trim() === scope;
}

export const ObecLearningAreaExecutiveDashboard: React.FC<ObecLearningAreaExecutiveDashboardProps> = ({
  students,
  teachers = [],
  courses,
  grades,
  attendance,
  periodAttendance = [],
  timetableSlots = [],
  systemConfig,
  school,
  lang = 'th',
  onNavigateToGradebook,
}) => {
  const [levelScope, setLevelScope] = useState<LevelScope>('all');
  const [chartMode, setChartMode] = useState<ChartMode>('gpa_attendance');
  const [includeActivities, setIncludeActivities] = useState(false);
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  const distinctGradeLevels = useMemo(() => {
    const levels = Array.from(
      new Set(students.map((s) => (s.gradeLevel || '').trim()).filter(Boolean))
    );
    return levels.sort((a, b) => getLevelOrder(a) - getLevelOrder(b) || a.localeCompare(b, 'th'));
  }, [students]);

  const scopedStudents = useMemo(
    () => students.filter((s) => matchesLevelScope(s, levelScope)),
    [students, levelScope]
  );

  const scopedStudentById = useMemo(
    () => new Map(scopedStudents.map((s) => [s.id, s])),
    [scopedStudents]
  );

  const gradingSystem = systemConfig.gradingSystem || 'thai';
  const schoolNameTh = school?.nameTh || systemConfig.schoolNameTh || 'สถานศึกษา';

  const { areaSummaries, overallStats, chartData } = useMemo(() => {
    const areaMetaList = includeActivities
      ? MOE_LEARNING_AREAS
      : MOE_LEARNING_AREAS.filter((area) => area.id !== 'activities');

    const coursesByArea = new Map<string, Course[]>();
    areaMetaList.forEach((area) => coursesByArea.set(area.id, []));

    courses.forEach((course) => {
      const area = resolveMoeLearningArea(course);
      if (!includeActivities && area.id === 'activities') return;
      const list = coursesByArea.get(area.id) || [];
      list.push(course);
      coursesByArea.set(area.id, list);
    });

    const summaries: LearningAreaSummary[] = areaMetaList.map((area) => {
      const areaCourses = coursesByArea.get(area.id) || [];
      const teacherSet = new Set<string>();

      let totalScoreSum = 0;
      let gpaPointSum = 0;
      let gpaCount = 0;
      let attendancePctSum = 0;
      let attendanceCount = 0;
      let atRiskMsCount = 0;
      let passCount = 0;
      let goodOrAboveCount = 0;
      let distinctionCount = 0;
      let failRiskCount = 0;
      let totalGradesCount = 0;

      const courseBreakdown: CourseAreaStats[] = [];

      areaCourses.forEach((course) => {
        if (course.teacherName) teacherSet.add(course.teacherName.trim());

        const matchedGrades = grades.filter(
          (g) => g.courseId === course.id && scopedStudentById.has(g.studentId)
        );
        const courseIsAct = isActivityCourse(course);

        let cScoreSum = 0;
        let cGpaSum = 0;
        let cGpaCount = 0;
        let cAttSum = 0;
        let cAttCount = 0;
        let cAtRiskMs = 0;
        let cPass = 0;
        let cGood = 0;
        let cFail = 0;

        const targetStudentIds =
          matchedGrades.length > 0
            ? matchedGrades.map((g) => g.studentId)
            : (course.enrolledStudentIds || []).filter((id) => scopedStudentById.has(id));

        const seenAttStudent = new Set<string>();
        targetStudentIds.forEach((stuId) => {
          if (seenAttStudent.has(stuId)) return;
          seenAttStudent.add(stuId);
          const stu = scopedStudentById.get(stuId);
          if (!stu) return;
          const att = calculateDetailedCourseAttendance({
            student: stu,
            course,
            timetableSlots,
            attendance,
            periodAttendance,
          });
          cAttSum += att.attendancePercent;
          cAttCount += 1;
          attendancePctSum += att.attendancePercent;
          attendanceCount += 1;
          if (att.isAtRiskMs) {
            cAtRiskMs += 1;
            atRiskMsCount += 1;
          }
        });

        matchedGrades.forEach((g) => {
          const stu = scopedStudentById.get(g.studentId);
          const attInfo = stu
            ? calculateDetailedCourseAttendance({
                student: stu,
                course,
                timetableSlots,
                attendance,
                periodAttendance,
              })
            : null;
          const isMs = attInfo?.isAtRiskMs || g.letterGrade === 'มส.';
          const resolved = resolveEffectiveGrade(g, course, gradingSystem, isMs);
          const rawScore = Number(g.totalScore) || 0;

          totalGradesCount += 1;
          totalScoreSum += rawScore;
          cScoreSum += rawScore;

          if (!courseIsAct && !resolved.isSpecial) {
            gpaPointSum += resolved.point;
            gpaCount += 1;
            cGpaSum += resolved.point;
            cGpaCount += 1;
          }

          const isFailOrIncomplete =
            resolved.letter === '0' ||
            resolved.letter === 'F' ||
            resolved.letter === 'ร' ||
            resolved.letter === 'มส.' ||
            resolved.letter === 'มผ' ||
            rawScore < 50;

          if (isFailOrIncomplete) {
            failRiskCount += 1;
            cFail += 1;
          } else {
            passCount += 1;
            cPass += 1;
          }

          if (!isFailOrIncomplete && (resolved.point >= 3.0 || rawScore >= 70 || resolved.letter === 'ผ')) {
            goodOrAboveCount += 1;
            cGood += 1;
          }
          if (!isFailOrIncomplete && (resolved.point >= 3.5 || rawScore >= 75)) {
            distinctionCount += 1;
          }
        });

        if (matchedGrades.length > 0 || targetStudentIds.length > 0) {
          const count = matchedGrades.length;
          courseBreakdown.push({
            course,
            gradedCount: count,
            avgRawScore: count > 0 ? Number((cScoreSum / count).toFixed(1)) : 0,
            avgGpa: cGpaCount > 0 ? Number((cGpaSum / cGpaCount).toFixed(2)) : 0,
            attendanceRate: cAttCount > 0 ? Number((cAttSum / cAttCount).toFixed(1)) : 0,
            atRiskMsCount: cAtRiskMs,
            passPct: count > 0 ? Number(((cPass / count) * 100).toFixed(1)) : 0,
            goodOrAbovePct: count > 0 ? Number(((cGood / count) * 100).toFixed(1)) : 0,
            failCount: cFail,
          });
        }
      });

      const avgRawScore =
        totalGradesCount > 0 ? Number((totalScoreSum / totalGradesCount).toFixed(1)) : 0;
      const avgGpa = gpaCount > 0 ? Number((gpaPointSum / gpaCount).toFixed(2)) : 0;
      const attendanceRate =
        attendanceCount > 0 ? Number((attendancePctSum / attendanceCount).toFixed(1)) : 0;
      const passPct =
        totalGradesCount > 0 ? Number(((passCount / totalGradesCount) * 100).toFixed(1)) : 0;
      const goodOrAbovePct =
        totalGradesCount > 0 ? Number(((goodOrAboveCount / totalGradesCount) * 100).toFixed(1)) : 0;
      const distinctionPct =
        totalGradesCount > 0 ? Number(((distinctionCount / totalGradesCount) * 100).toFixed(1)) : 0;
      const failRiskPct =
        totalGradesCount > 0 ? Number(((failRiskCount / totalGradesCount) * 100).toFixed(1)) : 0;

      let qualityTier: LearningAreaSummary['qualityTier'] = 'no_data';
      let qualityLabelTh = 'ยังไม่มีข้อมูลประเมิน';
      let qualityNoteTh = 'รอการบันทึกรายวิชาและคะแนนในกลุ่มสาระฯ นี้';

      if (totalGradesCount > 0) {
        if (area.id === 'activities') {
          if (passPct >= 95 && attendanceRate >= 85) {
            qualityTier = 'excellent';
            qualityLabelTh = 'ดีเยี่ยม (ผ่านเกณฑ์ สพฐ.)';
            qualityNoteTh = 'ผู้เรียนเข้าร่วมกิจกรรมสม่ำเสมอและผ่านเกณฑ์เกือบทั้งหมด';
          } else if (attendanceRate >= 80 && passPct >= 80) {
            qualityTier = 'good';
            qualityLabelTh = 'ดี (ผ่านเกณฑ์มาตรฐาน)';
            qualityNoteTh = 'ผ่านเกณฑ์เวลาเรียน 80% และผลประเมินกิจกรรม';
          } else {
            qualityTier = 'needs_improvement';
            qualityLabelTh = 'ต้องติดตามเพิ่มเติม';
            qualityNoteTh = 'มีผู้เรียนขาดเข้าร่วมกิจกรรมหรือเวลาเรียนต่ำกว่า 80%';
          }
        } else if (avgGpa >= 3.25 && attendanceRate >= 90 && passPct >= 95) {
          qualityTier = 'excellent';
          qualityLabelTh = 'ดีเยี่ยม (เกินเกณฑ์ สพฐ.)';
          qualityNoteTh = 'GPA ≥ 3.25 และเวลาเรียน ≥ 90% คุณภาพการสอนโดดเด่น';
        } else if (avgGpa >= 2.50 && attendanceRate >= 85 && passPct >= 85) {
          qualityTier = 'good';
          qualityLabelTh = 'ดี (ผ่านเกณฑ์ สพฐ.)';
          qualityNoteTh = 'บรรลุเป้าหมาย GPA ≥ 2.50 และเวลาเรียน ≥ 85%';
        } else if (avgGpa >= 2.00 && attendanceRate >= 80) {
          qualityTier = 'fair';
          qualityLabelTh = 'พอใช้ (เฝ้าระวังคุณภาพ)';
          qualityNoteTh = 'ผ่านเกณฑ์ขั้นต่ำ ควรยกระดับผู้เรียนระดับดีขึ้นไป';
        } else {
          qualityTier = 'needs_improvement';
          qualityLabelTh = 'ต้องเร่งพัฒนา / ต่ำกว่าเกณฑ์';
          qualityNoteTh =
            attendanceRate < 80
              ? 'เวลาเรียนเฉลี่ยต่ำกว่าเกณฑ์ สพฐ. 80% ควรนิเทศติดตามการเข้าเรียน'
              : 'GPA เฉลี่ยต่ำกว่าเกณฑ์เป้าหมาย ควรวางแผนซ่อมเสริมและนิเทศการสอน';
        }
      }

      return {
        areaId: area.id,
        codePrefix: area.codePrefix,
        nameTh: area.nameTh,
        shortTh: area.shortTh,
        nameEn: area.nameEn,
        isActivityArea: area.id === 'activities',
        courseCount: areaCourses.length,
        teacherCount: teacherSet.size,
        gradedCount: totalGradesCount,
        avgRawScore,
        avgGpa,
        attendanceRate,
        atRiskMsCount,
        passPct,
        goodOrAbovePct,
        distinctionPct,
        failRiskPct,
        failRiskCount,
        qualityTier,
        qualityLabelTh,
        qualityNoteTh,
        courseBreakdown: courseBreakdown.sort((a, b) => a.course.code.localeCompare(b.course.code, 'th')),
      };
    });

    const activeAcademicAreas = summaries.filter((a) => !a.isActivityArea && a.gradedCount > 0);
    const totalGradedRecords = activeAcademicAreas.reduce((s, a) => s + a.gradedCount, 0);
    const weightedGpa =
      totalGradedRecords > 0
        ? Number(
            (
              activeAcademicAreas.reduce((s, a) => s + a.avgGpa * a.gradedCount, 0) /
              totalGradedRecords
            ).toFixed(2)
          )
        : 0;
    const weightedRaw =
      totalGradedRecords > 0
        ? Number(
            (
              activeAcademicAreas.reduce((s, a) => s + a.avgRawScore * a.gradedCount, 0) /
              totalGradedRecords
            ).toFixed(1)
          )
        : 0;
    const weightedAttendance =
      totalGradedRecords > 0
        ? Number(
            (
              activeAcademicAreas.reduce((s, a) => s + a.attendanceRate * a.gradedCount, 0) /
              totalGradedRecords
            ).toFixed(1)
          )
        : 0;
    const weightedGoodPct =
      totalGradedRecords > 0
        ? Number(
            (
              activeAcademicAreas.reduce((s, a) => s + a.goodOrAbovePct * a.gradedCount, 0) /
              totalGradedRecords
            ).toFixed(1)
          )
        : 0;
    const totalMsRisk = summaries.reduce((s, a) => s + a.atRiskMsCount, 0);
    const totalFailRisk = activeAcademicAreas.reduce((s, a) => s + a.failRiskCount, 0);
    const areasMeetingObecStandard = activeAcademicAreas.filter(
      (a) => a.qualityTier === 'excellent' || a.qualityTier === 'good'
    ).length;

    const sortedByGpa = [...activeAcademicAreas].sort((a, b) => b.avgGpa - a.avgGpa);
    const topArea = sortedByGpa[0] || null;
    const priorityArea = sortedByGpa.length > 1 ? sortedByGpa[sortedByGpa.length - 1] : null;

    const chartRows = summaries
      .filter((a) => a.gradedCount > 0 || a.courseCount > 0)
      .map((a) => ({
        name: a.shortTh,
        fullName: a.nameTh,
        gpa: a.avgGpa,
        attendance: a.attendanceRate,
        rawScore: a.avgRawScore,
        goodOrAbovePct: a.goodOrAbovePct,
        passOnlyPct: Number(Math.max(0, a.passPct - a.goodOrAbovePct).toFixed(1)),
        failRiskPct: a.failRiskPct,
      }));

    return {
      areaSummaries: summaries,
      overallStats: {
        activeAreaCount: activeAcademicAreas.length,
        areasMeetingObecStandard,
        totalGradedRecords,
        weightedGpa,
        weightedRaw,
        weightedAttendance,
        weightedGoodPct,
        totalMsRisk,
        totalFailRisk,
        topArea,
        priorityArea,
      },
      chartData: chartRows,
    };
  }, [
    attendance,
    courses,
    grades,
    gradingSystem,
    includeActivities,
    periodAttendance,
    scopedStudentById,
    timetableSlots,
  ]);

  const handleExportCsv = () => {
    const headers = [
      'กลุ่มสาระการเรียนรู้ (สพฐ.)',
      'จำนวนรายวิชา',
      'จำนวนครูผู้สอน',
      'จำนวนรายการประเมิน',
      'เวลาเรียนเฉลี่ย (%)',
      'กลุ่มเสี่ยง มส. (<80%)',
      'คะแนนเฉลี่ย (%)',
      'เกรดเฉลี่ย (GPA)',
      'ระดับดีขึ้นไป (3.0-4.0 %)',
      'ร้อยละผ่านเกณฑ์ (%)',
      'กลุ่มเสี่ยงไม่ผ่าน (คน)',
      'ผลประเมินตามเกณฑ์ สพฐ.',
    ];

    const rows = areaSummaries.map((a) => [
      `"${a.nameTh}"`,
      a.courseCount,
      a.teacherCount,
      a.gradedCount,
      a.attendanceRate,
      a.atRiskMsCount,
      a.avgRawScore,
      a.avgGpa.toFixed(2),
      a.goodOrAbovePct,
      a.passPct,
      a.failRiskCount,
      `"${a.qualityLabelTh}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `OBEC_Learning_Area_Report_AY${systemConfig.academicYear || '2569'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportNotice('ส่งออกไฟล์ CSV รายงานเปรียบเทียบ 8 กลุ่มสาระฯ ตามเกณฑ์ สพฐ. เรียบร้อยแล้ว');
  };

  const handlePrint = () => {
    if (!printSheetRef.current) return;
    printHtmlElementInIsolatedFrame(
      printSheetRef.current.innerHTML,
      `รายงานประเมินคุณภาพ_8_กลุ่มสาระ_สพฐ_${systemConfig.academicYear || '2569'}`
    );
  };

  const getQualityStatus = (tier: LearningAreaSummary['qualityTier']): StatusBadgeStatus => {
    switch (tier) {
      case 'excellent':
        return 'complete';
      case 'good':
        return 'info';
      case 'fair':
        return 'pending';
      case 'needs_improvement':
        return 'delayed';
      default:
        return 'neutral';
    }
  };

  const selectedScopeLabel =
    levelScope === 'all'
      ? 'ทุกระดับชั้น'
      : levelScope === 'primary'
      ? 'ประถมศึกษา (ป.1–ป.6)'
      : levelScope === 'lower_secondary'
      ? 'มัธยมศึกษาตอนต้น (ม.1–ม.3)'
      : levelScope === 'upper_secondary'
      ? 'มัธยมศึกษาตอนปลาย (ม.4–ม.6)'
      : levelScope;

  return (
    <div className="space-y-3">
      {/* Compact Unboxed Title + Inline Filters & Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] truncate">
            {lang === 'th' ? 'ผลสัมฤทธิ์ & เวลาเรียน 8 กลุ่มสาระฯ (สพฐ.)' : 'OBEC 8 Learning Areas'}
          </h2>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums truncate">
            {schoolNameTh} · {formatSemesterLabel(systemConfig.currentSemester)}/{systemConfig.academicYear || '2569'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <select
            aria-label="เลือกระดับชั้นที่ประเมิน"
            value={levelScope}
            onChange={(e) => setLevelScope(e.target.value)}
            className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-medium text-[var(--color-text-title)]"
          >
            <option value="all">ทุกระดับชั้น ({students.length} คน)</option>
            <option value="primary">ระดับประถมศึกษา (ป.1–ป.6)</option>
            <option value="lower_secondary">ระดับมัธยมศึกษาตอนต้น (ม.1–ม.3)</option>
            <option value="upper_secondary">ระดับมัธยมศึกษาตอนปลาย (ม.4–ม.6)</option>
            {distinctGradeLevels.map((lvl) => (
              <option key={lvl} value={lvl}>
                เฉพาะชั้น {lvl}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIncludeActivities((prev) => !prev)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
              includeActivities
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
            }`}
          >
            {includeActivities ? 'รวมกิจกรรมพัฒนาฯ' : 'เฉพาะ 8 กลุ่มสาระฯ'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-tool-neutral h-8 px-2.5 text-xs whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-action-primary h-8 px-2.5 text-xs whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 print:hidden">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="underline cursor-pointer whitespace-nowrap"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Printable & Main Executive Body */}
      <div ref={printSheetRef} className="space-y-4">
        {/* Print-only formal header */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4 text-center">
          <p className="text-xs font-bold">รายงานสรุปผลสัมฤทธิ์ทางการเรียนและเวลาเรียนรายกลุ่มสาระการเรียนรู้ (เกณฑ์ สพฐ.)</p>
          <h1 className="text-lg font-extrabold">โรงเรียน{schoolNameTh}</h1>
          <p className="text-xs">
            ขอบเขตข้อมูล: {selectedScopeLabel} · {formatSemesterLabel(systemConfig.currentSemester)} ปีการศึกษา {systemConfig.academicYear || '2569'} · นักเรียน {scopedStudents.length} คน
          </p>
        </div>

        {/* 4 Executive KPI Metrics (Unified Single-Elevation Hairline Strip) */}
        <div className="saas-kpi-strip overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
            <div className="saas-kpi-cell space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                <span>เกรดเฉลี่ยรวมโรงเรียน (8 กลุ่มสาระฯ)</span>
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-extrabold font-mono text-[var(--color-text-title)]">
                  {overallStats.weightedGpa.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-[var(--color-text-muted)]">
                  ({overallStats.weightedRaw}%)
                </span>
              </div>
              <div className="text-[11px] flex items-center gap-1.5">
                {overallStats.weightedGpa >= 2.5 ? (
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                    สูงกว่าเกณฑ์มาตรฐาน สพฐ. (2.50)
                  </span>
                ) : overallStats.totalGradedRecords > 0 ? (
                  <span className="text-amber-700 dark:text-amber-300 font-medium">
                    ต่ำกว่าเป้าหมาย สพฐ. 2.50 อยู่ {(2.5 - overallStats.weightedGpa).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">รอข้อมูลบันทึกเกรด</span>
                )}
              </div>
            </div>

            <div className="saas-kpi-cell space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                <span>สถิติเวลาเรียนเฉลี่ยรายวิชา</span>
                <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-extrabold font-mono text-[var(--color-text-title)]">
                  {overallStats.weightedAttendance.toFixed(1)}%
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  (เกณฑ์ ≥ 80%)
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-body)] tabular-nums">
                กลุ่มเสี่ยง มส. (&lt;80%):{' '}
                <span className={overallStats.totalMsRisk > 0 ? 'font-bold text-rose-600 dark:text-rose-400' : 'font-semibold text-emerald-700 dark:text-emerald-300'}>
                  {overallStats.totalMsRisk} รายการ
                </span>
              </div>
            </div>

            <div className="saas-kpi-cell space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                <span>คุณภาพมาตรฐาน สพฐ. (กลุ่มสาระฯ)</span>
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                  {overallStats.areasMeetingObecStandard}/{overallStats.activeAreaCount || 8}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  กลุ่มสาระฯ ผ่านเกณฑ์ดี–ดีเยี่ยม
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-body)] truncate">
                {overallStats.topArea
                  ? `โดดเด่นสุด: ${overallStats.topArea.shortTh} (GPA ${overallStats.topArea.avgGpa.toFixed(2)})`
                  : 'ยังไม่มีข้อมูลกลุ่มสาระฯ'}
              </div>
            </div>

            <div className="saas-kpi-cell space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                <span>ผู้เรียนระดับดีขึ้นไป vs กลุ่มเสี่ยง</span>
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-extrabold font-mono text-[var(--color-text-title)]">
                  {overallStats.weightedGoodPct.toFixed(1)}%
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  ได้ระดับ 3.0–4.0
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-body)] truncate tabular-nums">
                {overallStats.priorityArea
                  ? `ควรนิเทศ: ${overallStats.priorityArea.shortTh} (เสี่ยง ${overallStats.totalFailRisk} รายการ)`
                  : `กลุ่มเสี่ยง (0/ร/มส.): ${overallStats.totalFailRisk} รายการ`}
              </div>
            </div>
          </div>
        </div>

        {/* Concise Executive Insight Strip */}
        {(overallStats.topArea || overallStats.priorityArea) && (
          <div className="saas-alert-bar text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
              {overallStats.topArea && (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>จุดแข็ง: {overallStats.topArea.shortTh} (GPA {overallStats.topArea.avgGpa.toFixed(2)})</span>
                </span>
              )}
              {overallStats.priorityArea && (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span>ควรนิเทศเสริม: {overallStats.priorityArea.shortTh} (GPA {overallStats.priorityArea.avgGpa.toFixed(2)})</span>
                </span>
              )}
            </div>
            <span className="type-meta tabular-nums shrink-0">
              บันทึกเกรดรวม {overallStats.totalGradedRecords.toLocaleString()} รายการ
            </span>
          </div>
        )}

        {/* Comparative Charts Section */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span>กราฟเปรียบเทียบผลสัมฤทธิ์และเวลาเรียนรายกลุ่มสาระการเรียนรู้</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                เส้นอ้างอิง สพฐ.: เกรดเฉลี่ยเป้าหมาย 2.50 · เกณฑ์เวลาเรียนมีสิทธิ์สอบ 80% · กลุ่มเป้าหมาย: {selectedScopeLabel}
              </p>
            </div>

            <div className="seg-tab-group shrink-0 print:hidden">
              <button
                type="button"
                data-active={chartMode === 'gpa_attendance'}
                onClick={() => setChartMode('gpa_attendance')}
                className="seg-tab-btn text-xs"
              >
                GPA &amp; เวลาเรียน (%)
              </button>
              <button
                type="button"
                data-active={chartMode === 'quality_tiers'}
                onClick={() => setChartMode('quality_tiers')}
                className="seg-tab-btn text-xs"
              >
                สัดส่วนระดับคุณภาพ (%)
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-xl">
              ยังไม่มีข้อมูลรายวิชาหรือคะแนนในระดับชั้นที่เลือก ({selectedScopeLabel})
            </div>
          ) : chartMode === 'gpa_attendance' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Chart A: GPA by Learning Area */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[var(--color-text-body)] flex items-center justify-between">
                  <span>1. เกรดเฉลี่ย (GPA 0.00–4.00) รายกลุ่มสาระฯ</span>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">เกณฑ์ สพฐ. ≥ 2.50</span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: -12, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        formatter={(value, name, item) => {
                          const num = Number(value ?? 0);
                          const isGpa = item?.dataKey === 'gpa' || String(name ?? '').includes('GPA');
                          return isGpa ? [num.toFixed(2), 'GPA เฉลี่ย'] : [`${num}%`, 'คะแนนเฉลี่ย'];
                        }}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <ReferenceLine
                        y={2.5}
                        stroke="#059669"
                        strokeDasharray="4 4"
                        label={{ value: 'เกณฑ์ สพฐ. 2.50', position: 'insideTopRight', fill: '#059669', fontSize: 10 }}
                      />
                      <Bar dataKey="gpa" name="เกรดเฉลี่ย (GPA)" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={38} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: Attendance % & Mean Score % */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[var(--color-text-body)] flex items-center justify-between">
                  <span>2. สถิติเวลาเรียน (%) เทียบคะแนนเฉลี่ย (%) รายกลุ่มสาระฯ</span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">เกณฑ์สิทธิ์สอบ ≥ 80%</span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: -12, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        formatter={(value, name) => [`${Number(value ?? 0)}%`, String(name ?? '')]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <ReferenceLine
                        y={80}
                        stroke="#dc2626"
                        strokeDasharray="4 4"
                        label={{ value: 'เกณฑ์ 80%', position: 'insideTopRight', fill: '#dc2626', fontSize: 10 }}
                      />
                      <Bar dataKey="attendance" name="เวลาเรียนเฉลี่ย (%)" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={30} />
                      <Line type="monotone" dataKey="rawScore" name="คะแนนเฉลี่ย (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 16, left: -12, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value ?? 0)}%`, String(name ?? '')]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="goodOrAbovePct" stackId="q" name="ระดับดี–ดีเยี่ยม (3.0–4.0)" fill="#10b981" maxBarSize={42} />
                  <Bar dataKey="passOnlyPct" stackId="q" name="ระดับผ่านเกณฑ์ (1.0–2.5)" fill="#38bdf8" maxBarSize={42} />
                  <Bar dataKey="failRiskPct" stackId="q" name="กลุ่มเสี่ยง (0 / ร / มส.)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* OBEC Standard Evaluation Matrix Table */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                ตารางประเมินคุณภาพการจัดการเรียนการสอนรายกลุ่มสาระการเรียนรู้ (เกณฑ์มาตรฐาน สพฐ.)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                คลิกที่กลุ่มสาระฯ เพื่อตรวจสอบรายวิชาและครูผู้สอนรายตัวสำหรับการนิเทศภายใน (Internal Supervision)
              </p>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
              แสดง {areaSummaries.length} กลุ่มสาระฯ · ครูในระบบ {teachers.length} คน
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">กลุ่มสาระการเรียนรู้</th>
                  <th className="py-2.5 px-2 text-center">วิชา / ครู</th>
                  <th className="py-2.5 px-2 text-right">ผู้เรียนประเมิน</th>
                  <th className="py-2.5 px-2 text-right">เวลาเรียนเฉลี่ย</th>
                  <th className="py-2.5 px-2 text-right">เสี่ยง มส.</th>
                  <th className="py-2.5 px-2 text-right">คะแนนเฉลี่ย</th>
                  <th className="py-2.5 px-2 text-right">เกรดเฉลี่ย (GPA)</th>
                  <th className="py-2.5 px-2 text-right">ดี–ดีเยี่ยม (3–4)</th>
                  <th className="py-2.5 px-2 text-right">ผ่านเกณฑ์</th>
                  <th className="py-2.5 px-3">ผลประเมินเกณฑ์ สพฐ.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] tabular-nums">
                {areaSummaries.map((area) => {
                  const isExpanded = expandedAreaId === area.areaId;
                  const qualityStatus = getQualityStatus(area.qualityTier);
                  return (
                    <React.Fragment key={area.areaId}>
                      <tr
                        onClick={() =>
                          setExpandedAreaId((prev) => (prev === area.areaId ? null : area.areaId))
                        }
                        className="hover:bg-[var(--color-card-subtle)] transition cursor-pointer"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-text-muted)] print:hidden">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <div>
                              <div className="font-semibold text-[var(--color-text-title)]">
                                {area.codePrefix} · {area.nameTh}
                              </div>
                              <div className="text-[11px] text-[var(--color-text-muted)]">
                                {area.qualityNoteTh}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[var(--color-text-body)]">
                          {area.courseCount} / {area.teacherCount}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {area.gradedCount}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold">
                          {area.gradedCount > 0 || area.courseBreakdown.length > 0 ? (
                            <span
                              className={
                                area.attendanceRate < 80
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-sky-700 dark:text-sky-300'
                              }
                            >
                              {area.attendanceRate.toFixed(1)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {area.atRiskMsCount > 0 ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {area.atRiskMsCount}
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-muted)]">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {area.gradedCount > 0 ? `${area.avgRawScore.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-[var(--color-text-title)]">
                          {area.isActivityArea
                            ? 'ผ/มผ'
                            : area.gradedCount > 0
                            ? area.avgGpa.toFixed(2)
                            : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {area.gradedCount > 0 ? `${area.goodOrAbovePct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {area.gradedCount > 0 ? `${area.passPct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge
                            size="xs"
                            status={qualityStatus}
                            label={area.qualityLabelTh}
                            title={area.qualityNoteTh}
                          />
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[var(--color-card-subtle)]/70">
                          <td colSpan={10} className="p-3">
                            {area.courseBreakdown.length === 0 ? (
                              <p className="text-xs text-[var(--color-text-muted)] px-2 py-2">
                                ยังไม่มีรายวิชาที่เปิดสอนหรือบันทึกคะแนนใน{area.nameTh}สำหรับขอบเขตนี้
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-2">
                                  <BookOpen className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                  <span>รายวิชาใน{area.nameTh} ({area.courseBreakdown.length} วิชา)</span>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
                                  <table className="w-full text-[11px] text-left">
                                    <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                                      <tr>
                                        <th className="py-1.5 px-2.5">รหัสวิชา</th>
                                        <th className="py-1.5 px-2.5">ชื่อรายวิชา</th>
                                        <th className="py-1.5 px-2.5">ครูผู้สอน</th>
                                        <th className="py-1.5 px-2 text-right">นักเรียน</th>
                                        <th className="py-1.5 px-2 text-right">เวลาเรียน %</th>
                                        <th className="py-1.5 px-2 text-right">เสี่ยง มส.</th>
                                        <th className="py-1.5 px-2 text-right">คะแนน %</th>
                                        <th className="py-1.5 px-2 text-right">GPA</th>
                                        <th className="py-1.5 px-2 text-right">ผ่านเกณฑ์ %</th>
                                        {onNavigateToGradebook && (
                                          <th className="py-1.5 px-2.5 text-right print:hidden">จัดการ</th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)] tabular-nums">
                                      {area.courseBreakdown.map((item) => (
                                        <tr key={item.course.id}>
                                          <td className="py-1.5 px-2.5 font-mono font-bold text-[var(--color-primary-text)]">
                                            {item.course.code}
                                          </td>
                                          <td className="py-1.5 px-2.5 font-medium text-[var(--color-text-title)]">
                                            {item.course.titleTh}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-[var(--color-text-body)]">
                                            {item.course.teacherName || '—'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono">
                                            {item.gradedCount}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono">
                                            <span className={item.attendanceRate < 80 ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                                              {item.attendanceRate.toFixed(1)}%
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono">
                                            {item.atRiskMsCount}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono">
                                            {item.avgRawScore.toFixed(1)}%
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono font-bold">
                                            {area.isActivityArea ? 'ผ/มผ' : item.avgGpa.toFixed(2)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono">
                                            {item.passPct.toFixed(1)}%
                                          </td>
                                          {onNavigateToGradebook && (
                                            <td className="py-1.5 px-2.5 text-right print:hidden">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onNavigateToGradebook(item.course.id);
                                                }}
                                                className="text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer whitespace-nowrap"
                                              >
                                                เปิด ปพ.5 / คะแนน
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* OBEC Benchmark Reference Legend */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 text-xs text-[var(--color-text-body)] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-[var(--color-text-title)]">
              เกณฑ์อ้างอิงการประเมินคุณภาพตามมาตรฐาน สพฐ.:
            </span>
            <span className="ml-2">
              ดีเยี่ยม (GPA ≥ 3.25 · เวลาเรียน ≥ 90% · ผ่าน ≥ 95%) · ดี (GPA ≥ 2.50 · เวลาเรียน ≥ 85% · ผ่าน ≥ 85%) · พอใช้ (GPA ≥ 2.00 · เวลาเรียน ≥ 80%) · ต่ำกว่า 80% เสี่ยง มส.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
