import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
  TrendingUp,
  Users,
  BookOpen,
  FileDown,
} from 'lucide-react';
import { AppLanguage, Course, GradeRecord, GradingSystem, Student, Teacher } from '../types';
import { resolveEffectiveGrade } from '../lib/moeGrading';
import { buildCourseTeacherOptions, courseMatchesTeacherFilter } from '../lib/courseTeacherFilter';

export type HistogramScope = 'course' | 'all_courses' | 'by_subject';
export type ChartViewMode = 'score_bins' | 'grade_tiers';

interface GradeDistributionHistogramProps {
  courses: Course[];
  teachers?: Teacher[];
  grades: GradeRecord[];
  filteredCourseGrades: GradeRecord[];
  students?: Student[];
  selectedCourse?: Course;
  gradingSystem: GradingSystem;
  lang?: AppLanguage;
  scope?: HistogramScope;
  onScopeChange?: (scope: HistogramScope) => void;
  chartMode?: ChartViewMode;
  onChartModeChange?: (mode: ChartViewMode) => void;
  departmentFilter?: string;
  onDepartmentFilterChange?: (dept: string) => void;
  teacherFilter?: string;
  onTeacherFilterChange?: (teacherKey: string) => void;
  onDownloadPdf?: () => void;
}

interface ScoreBinDatum {
  key: string;
  label: string;
  subLabel: string;
  equivalentGrade: string;
  count: number;
  totalInScope: number;
  percent: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  sampleStudents: string[];
  gradeBreakdown: Array<{ letter: string; count: number }>;
  color: string;
  isPass: boolean;
}

interface GradeTierDatum {
  tier: string;
  label: string;
  scoreRange: string;
  count: number;
  totalInScope: number;
  percent: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  sampleStudents: string[];
  color: string;
}

interface SubjectComparisonDatum {
  courseId: string;
  code: string;
  title: string;
  department: string;
  studentCount: number;
  avgScore: number;
  passRate: number;
  distinctionRate: number;
  atRiskCount: number;
  rangeCounts: Array<{ label: string; count: number; color: string }>;
  color: string;
}

const SCORE_BINS: Array<{
  key: string;
  label: string;
  subLabelTh: string;
  subLabelEn: string;
  gradeThai: string;
  gradeIntl: string;
  min: number;
  max: number;
  color: string;
  isPass: boolean;
}> = [
  { key: 'lt50', label: '0–49', subLabelTh: 'ต่ำกว่าเกณฑ์', subLabelEn: 'Below 50', gradeThai: 'เกรด 0 / ร / มส.', gradeIntl: 'Grade F', min: -1, max: 49.999, color: '#f43f5e', isPass: false },
  { key: '50_54', label: '50–54', subLabelTh: 'ผ่านขั้นต่ำ', subLabelEn: 'Marginal', gradeThai: 'เกรด 1', gradeIntl: 'Grade D', min: 50, max: 54.999, color: '#fb923c', isPass: true },
  { key: '55_59', label: '55–59', subLabelTh: 'พอใช้', subLabelEn: 'Fair', gradeThai: 'เกรด 1.5', gradeIntl: 'Grade D+', min: 55, max: 59.999, color: '#f59e0b', isPass: true },
  { key: '60_64', label: '60–64', subLabelTh: 'ปานกลาง', subLabelEn: 'Satisfactory', gradeThai: 'เกรด 2', gradeIntl: 'Grade C', min: 60, max: 64.999, color: '#eab308', isPass: true },
  { key: '65_69', label: '65–69', subLabelTh: 'ค่อนข้างดี', subLabelEn: 'Above Avg', gradeThai: 'เกรด 2.5', gradeIntl: 'Grade C+', min: 65, max: 69.999, color: '#84cc16', isPass: true },
  { key: '70_74', label: '70–74', subLabelTh: 'ดี', subLabelEn: 'Good', gradeThai: 'เกรด 3', gradeIntl: 'Grade B', min: 70, max: 74.999, color: '#14b8a6', isPass: true },
  { key: '75_79', label: '75–79', subLabelTh: 'ดีมาก', subLabelEn: 'Very Good', gradeThai: 'เกรด 3.5', gradeIntl: 'Grade B+', min: 75, max: 79.999, color: '#06b6d4', isPass: true },
  { key: '80_84', label: '80–84', subLabelTh: 'ดีเยี่ยม', subLabelEn: 'Excellent', gradeThai: 'เกรด 4', gradeIntl: 'Grade A', min: 80, max: 84.999, color: '#0ea5e9', isPass: true },
  { key: '85_89', label: '85–89', subLabelTh: 'ยอดเยี่ยม', subLabelEn: 'Superior', gradeThai: 'เกรด 4', gradeIntl: 'Grade A', min: 85, max: 89.999, color: '#6366f1', isPass: true },
  { key: '90_100', label: '90–100', subLabelTh: 'ดีเลิศ', subLabelEn: 'Distinction', gradeThai: 'เกรด 4', gradeIntl: 'Grade A', min: 90, max: 100.001, color: '#10b981', isPass: true },
];

const THAI_TIER_ORDER: Array<{ tier: string; rangeTh: string; rangeEn: string; color: string }> = [
  { tier: '4', rangeTh: '80–100 คะแนน', rangeEn: '80–100 pts', color: '#10b981' },
  { tier: '3.5', rangeTh: '75–79 คะแนน', rangeEn: '75–79 pts', color: '#0ea5e9' },
  { tier: '3', rangeTh: '70–74 คะแนน', rangeEn: '70–74 pts', color: '#06b6d4' },
  { tier: '2.5', rangeTh: '65–69 คะแนน', rangeEn: '65–69 pts', color: '#14b8a6' },
  { tier: '2', rangeTh: '60–64 คะแนน', rangeEn: '60–64 pts', color: '#84cc16' },
  { tier: '1.5', rangeTh: '55–59 คะแนน', rangeEn: '55–59 pts', color: '#eab308' },
  { tier: '1', rangeTh: '50–54 คะแนน', rangeEn: '50–54 pts', color: '#f59e0b' },
  { tier: '0', rangeTh: '0–49 คะแนน', rangeEn: '0–49 pts', color: '#f43f5e' },
  { tier: 'ผ', rangeTh: 'ผ่านเกณฑ์กิจกรรม', rangeEn: 'Activity Pass', color: '#059669' },
  { tier: 'มผ', rangeTh: 'ไม่ผ่านกิจกรรม', rangeEn: 'Activity Fail', color: '#e11d48' },
  { tier: 'ร', rangeTh: 'รอตัดสินผลการเรียน', rangeEn: 'Incomplete (ร)', color: '#fb7185' },
  { tier: 'มส.', rangeTh: 'เวลาเรียนไม่ถึงเกณฑ์', rangeEn: 'Ineligible (มส.)', color: '#be123c' },
];

const INTL_TIER_ORDER: Array<{ tier: string; rangeTh: string; rangeEn: string; color: string }> = [
  { tier: 'A', rangeTh: '80–100 คะแนน', rangeEn: '80–100 pts', color: '#10b981' },
  { tier: 'B+', rangeTh: '75–79 คะแนน', rangeEn: '75–79 pts', color: '#0ea5e9' },
  { tier: 'B', rangeTh: '70–74 คะแนน', rangeEn: '70–74 pts', color: '#06b6d4' },
  { tier: 'C+', rangeTh: '65–69 คะแนน', rangeEn: '65–69 pts', color: '#14b8a6' },
  { tier: 'C', rangeTh: '60–64 คะแนน', rangeEn: '60–64 pts', color: '#84cc16' },
  { tier: 'D+', rangeTh: '55–59 คะแนน', rangeEn: '55–59 pts', color: '#eab308' },
  { tier: 'D', rangeTh: '50–54 คะแนน', rangeEn: '50–54 pts', color: '#f59e0b' },
  { tier: 'F', rangeTh: '0–49 คะแนน', rangeEn: '0–49 pts', color: '#f43f5e' },
  { tier: 'ผ', rangeTh: 'ผ่านเกณฑ์กิจกรรม', rangeEn: 'Activity Pass', color: '#059669' },
  { tier: 'มผ', rangeTh: 'ไม่ผ่านกิจกรรม', rangeEn: 'Activity Fail', color: '#e11d48' },
  { tier: 'ร', rangeTh: 'รอตัดสินผลการเรียน', rangeEn: 'Incomplete (ร)', color: '#fb7185' },
  { tier: 'มส.', rangeTh: 'เวลาเรียนไม่ถึงเกณฑ์', rangeEn: 'Ineligible (มส.)', color: '#be123c' },
];

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export const GradeDistributionHistogram: React.FC<GradeDistributionHistogramProps> = ({
  courses,
  teachers = [],
  grades,
  filteredCourseGrades,
  students = [],
  selectedCourse,
  gradingSystem,
  lang = 'th',
  scope: controlledScope,
  onScopeChange,
  chartMode: controlledChartMode,
  onChartModeChange,
  departmentFilter: controlledDeptFilter,
  onDepartmentFilterChange,
  teacherFilter: controlledTeacherFilter,
  onTeacherFilterChange,
  onDownloadPdf,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalScope, setInternalScope] = useState<HistogramScope>('course');
  const [internalChartMode, setInternalChartMode] = useState<ChartViewMode>('score_bins');
  const [internalDepartmentFilter, setInternalDepartmentFilter] = useState<string>('all');
  const [internalTeacherFilter, setInternalTeacherFilter] = useState<string>('all');

  const scope = controlledScope ?? internalScope;
  const setScope = (next: HistogramScope) => {
    setInternalScope(next);
    onScopeChange?.(next);
  };

  const chartMode = controlledChartMode ?? internalChartMode;
  const setChartMode = (next: ChartViewMode) => {
    setInternalChartMode(next);
    onChartModeChange?.(next);
  };

  const departmentFilter = controlledDeptFilter ?? internalDepartmentFilter;
  const setDepartmentFilter = (next: string) => {
    setInternalDepartmentFilter(next);
    onDepartmentFilterChange?.(next);
  };

  const teacherFilter = controlledTeacherFilter ?? internalTeacherFilter;
  const setTeacherFilter = (next: string) => {
    setInternalTeacherFilter(next);
    onTeacherFilterChange?.(next);
  };

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const formatStudentPreviewName = (stu?: Student, score?: number): string => {
    if (!stu) return '';
    const displayName =
      lang === 'th'
        ? `${stu.firstNameTh} ${stu.lastNameTh}`.trim() || `${stu.firstNameEn} ${stu.lastNameEn}`.trim()
        : `${stu.firstNameEn} ${stu.lastNameEn}`.trim() || `${stu.firstNameTh} ${stu.lastNameTh}`.trim();
    return score !== undefined ? `${displayName} (${score}%)` : displayName;
  };

  const teacherFilterOptions = useMemo(
    () => buildCourseTeacherOptions(courses, teachers),
    [courses, teachers]
  );

  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    courses.forEach((c) => {
      if (c.department?.trim()) depts.add(c.department.trim());
    });
    return Array.from(depts).sort((a, b) => a.localeCompare(b, 'th'));
  }, [courses]);

  const scopedGrades = useMemo(() => {
    if (scope === 'course') {
      return filteredCourseGrades;
    }
    return grades.filter((g) => {
      const course = courseById.get(g.courseId);
      if (departmentFilter !== 'all' && course?.department?.trim() !== departmentFilter) {
        return false;
      }
      if (teacherFilter !== 'all') {
        if (!course || !courseMatchesTeacherFilter(course, teacherFilter, teacherFilterOptions)) {
          return false;
        }
      }
      return true;
    });
  }, [scope, filteredCourseGrades, grades, departmentFilter, teacherFilter, teacherFilterOptions, courseById]);

  const summaryStats = useMemo(() => {
    if (scopedGrades.length === 0) {
      return {
        totalCount: 0,
        meanScore: 0,
        medianScore: 0,
        passRate: 0,
        distinctionRate: 0,
        atRiskCount: 0,
      };
    }

    const scores = scopedGrades.map((g) => Number(g.totalScore) || 0);
    const totalCount = scores.length;
    const meanScore = Math.round((scores.reduce((sum, s) => sum + s, 0) / totalCount) * 10) / 10;
    const medianScore = Math.round(computeMedian(scores) * 10) / 10;

    let passCount = 0;
    let distinctionCount = 0;
    let atRiskCount = 0;

    for (const grade of scopedGrades) {
      const course = courseById.get(grade.courseId) || selectedCourse;
      const resolved = resolveEffectiveGrade(grade, course, gradingSystem);
      const isFailingSpecial = resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ';
      const score = Number(grade.totalScore) || 0;

      if (!isFailingSpecial && score >= 50 && resolved.letter !== '0' && resolved.letter !== 'F') {
        passCount += 1;
      } else {
        atRiskCount += 1;
      }

      if (!isFailingSpecial && score >= 80) {
        distinctionCount += 1;
      }
    }

    return {
      totalCount,
      meanScore,
      medianScore,
      passRate: Math.round((passCount / totalCount) * 1000) / 10,
      distinctionRate: Math.round((distinctionCount / totalCount) * 1000) / 10,
      atRiskCount,
    };
  }, [scopedGrades, courseById, selectedCourse, gradingSystem]);

  const scoreBinsData = useMemo<ScoreBinDatum[]>(() => {
    const total = scopedGrades.length;
    return SCORE_BINS.map((bin) => {
      const matches = scopedGrades.filter((g) => {
        const s = Math.max(0, Math.min(100, Number(g.totalScore) || 0));
        return s >= bin.min && s <= bin.max;
      });
      const count = matches.length;
      const numericScores = matches.map((g) => Number(g.totalScore) || 0);
      const avgScore =
        count > 0
          ? Math.round((numericScores.reduce((acc, s) => acc + s, 0) / count) * 10) / 10
          : null;
      const minScore = count > 0 ? Math.min(...numericScores) : null;
      const maxScore = count > 0 ? Math.max(...numericScores) : null;

      const gradeCounts = new Map<string, number>();
      const sampleStudents: string[] = [];
      matches.forEach((g) => {
        const course = courseById.get(g.courseId) || selectedCourse;
        const resolved = resolveEffectiveGrade(g, course, gradingSystem);
        gradeCounts.set(resolved.letter, (gradeCounts.get(resolved.letter) || 0) + 1);
        if (sampleStudents.length < 4) {
          const preview = formatStudentPreviewName(studentById.get(g.studentId), g.totalScore);
          if (preview) sampleStudents.push(preview);
        }
      });

      const gradeBreakdown = Array.from(gradeCounts.entries())
        .map(([letter, c]) => ({ letter, count: c }))
        .sort((a, b) => b.count - a.count);

      return {
        key: bin.key,
        label: bin.label,
        subLabel: lang === 'th' ? bin.subLabelTh : bin.subLabelEn,
        equivalentGrade: gradingSystem === 'international' ? bin.gradeIntl : bin.gradeThai,
        count,
        totalInScope: total,
        percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        avgScore,
        minScore,
        maxScore,
        sampleStudents,
        gradeBreakdown,
        color: bin.color,
        isPass: bin.isPass,
      };
    });
  }, [scopedGrades, lang, gradingSystem, courseById, selectedCourse, studentById]);

  const gradeTiersData = useMemo<GradeTierDatum[]>(() => {
    const baseOrder = gradingSystem === 'international' ? INTL_TIER_ORDER : THAI_TIER_ORDER;
    const total = scopedGrades.length;
    const buckets = new Map<string, GradeRecord[]>();

    for (const grade of scopedGrades) {
      const course = courseById.get(grade.courseId) || selectedCourse;
      const resolved = resolveEffectiveGrade(grade, course, gradingSystem);
      const list = buckets.get(resolved.letter) || [];
      list.push(grade);
      buckets.set(resolved.letter, list);
    }

    const coreSet = new Set(
      gradingSystem === 'international'
        ? ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']
        : ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0']
    );

    const rows: GradeTierDatum[] = [];
    for (const { tier, rangeTh, rangeEn, color } of baseOrder) {
      const items = buckets.get(tier) || [];
      if (!coreSet.has(tier) && items.length === 0) continue;
      const count = items.length;
      const numericScores = items.map((g) => Number(g.totalScore) || 0);
      const avgScore =
        count > 0
          ? Math.round((numericScores.reduce((acc, s) => acc + s, 0) / count) * 10) / 10
          : null;
      const minScore = count > 0 ? Math.min(...numericScores) : null;
      const maxScore = count > 0 ? Math.max(...numericScores) : null;

      const sampleStudents: string[] = [];
      items.slice(0, 4).forEach((g) => {
        const preview = formatStudentPreviewName(studentById.get(g.studentId), g.totalScore);
        if (preview) sampleStudents.push(preview);
      });

      rows.push({
        tier,
        label: tier,
        scoreRange: lang === 'th' ? rangeTh : rangeEn,
        count,
        totalInScope: total,
        percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        avgScore,
        minScore,
        maxScore,
        sampleStudents,
        color,
      });
    }

    return rows;
  }, [scopedGrades, gradingSystem, courseById, selectedCourse, studentById, lang]);

  const subjectComparisonData = useMemo<SubjectComparisonDatum[]>(() => {
    const grouped = new Map<string, GradeRecord[]>();
    for (const grade of grades) {
      const course = courseById.get(grade.courseId);
      if (!course) continue;
      if (departmentFilter !== 'all' && course.department?.trim() !== departmentFilter) continue;
      if (!courseMatchesTeacherFilter(course, teacherFilter, teacherFilterOptions)) continue;
      const list = grouped.get(course.id) || [];
      list.push(grade);
      grouped.set(course.id, list);
    }

    const items: SubjectComparisonDatum[] = [];
    for (const [courseId, courseGrades] of grouped.entries()) {
      const course = courseById.get(courseId);
      if (!course || courseGrades.length === 0) continue;
      const total = courseGrades.length;
      const avgScore =
        Math.round((courseGrades.reduce((sum, g) => sum + (Number(g.totalScore) || 0), 0) / total) * 10) / 10;

      let pass = 0;
      let distinction = 0;
      let atRisk = 0;
      let b80 = 0;
      let b70 = 0;
      let b60 = 0;
      let b50 = 0;
      let bFail = 0;

      for (const g of courseGrades) {
        const resolved = resolveEffectiveGrade(g, course, gradingSystem);
        const failSpecial = resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ';
        const s = Number(g.totalScore) || 0;
        if (!failSpecial && s >= 50 && resolved.letter !== '0' && resolved.letter !== 'F') {
          pass += 1;
          if (s >= 80) b80 += 1;
          else if (s >= 70) b70 += 1;
          else if (s >= 60) b60 += 1;
          else b50 += 1;
        } else {
          atRisk += 1;
          bFail += 1;
        }
        if (!failSpecial && s >= 80) distinction += 1;
      }

      const color =
        avgScore >= 80
          ? '#10b981'
          : avgScore >= 70
          ? '#0ea5e9'
          : avgScore >= 60
          ? '#6366f1'
          : avgScore >= 50
          ? '#f59e0b'
          : '#f43f5e';

      items.push({
        courseId,
        code: course.code,
        title: course.titleTh || course.titleEn,
        department: course.department || '',
        studentCount: total,
        avgScore,
        passRate: Math.round((pass / total) * 1000) / 10,
        distinctionRate: Math.round((distinction / total) * 1000) / 10,
        atRiskCount: atRisk,
        rangeCounts: [
          {
            label: gradingSystem === 'international' ? 'A (80–100)' : 'เกรด 4 (80–100)',
            count: b80,
            color: '#10b981',
          },
          {
            label: gradingSystem === 'international' ? 'B/B+ (70–79)' : 'เกรด 3–3.5 (70–79)',
            count: b70,
            color: '#0ea5e9',
          },
          {
            label: gradingSystem === 'international' ? 'C/C+ (60–69)' : 'เกรด 2–2.5 (60–69)',
            count: b60,
            color: '#eab308',
          },
          {
            label: gradingSystem === 'international' ? 'D/D+ (50–59)' : 'เกรด 1–1.5 (50–59)',
            count: b50,
            color: '#f59e0b',
          },
          {
            label: lang === 'th' ? 'ต่ำกว่าเกณฑ์ (<50/ร/มส.)' : 'Below 50 / Fail',
            count: bFail,
            color: '#f43f5e',
          },
        ],
        color,
      });
    }

    return items.sort((a, b) => a.code.localeCompare(b.code, 'th'));
  }, [grades, courseById, departmentFilter, teacherFilter, teacherFilterOptions, gradingSystem, lang]);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs overflow-hidden print:hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-base md:text-lg font-bold text-[var(--color-text-title)] group-hover:text-[var(--color-primary-text)] transition">
              {lang === 'th' ? 'สถิติ & ฮิสโตแกรมเกรด' : 'Grade Distribution'}
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 font-mono tabular-nums">
              {scope === 'course' && selectedCourse
                ? `${selectedCourse.code} · ${scopedGrades.length}`
                : scope === 'by_subject'
                ? `${subjectComparisonData.length} ${lang === 'th' ? 'วิชา' : 'subj'}`
                : `${scopedGrades.length}`}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums hidden sm:inline">
              {lang === 'th'
                ? `เฉลี่ย ${summaryStats.meanScore}% · ผ่าน ${summaryStats.passRate}% · เสี่ยง ${summaryStats.atRiskCount} คน`
                : `Mean ${summaryStats.meanScore}% · Pass ${summaryStats.passRate}% · Risk ${summaryStats.atRiskCount}`}
            </span>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          {isExpanded && (
            <>
              {/* Scope Selector */}
              <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setScope('course')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    scope === 'course'
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? 'วิชาที่เลือก' : 'Selected'}
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all_courses')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    scope === 'all_courses'
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? 'ทุกวิชารวม' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setScope('by_subject')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    scope === 'by_subject'
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? 'เทียบรายวิชา' : 'By Subject'}
                </button>
              </div>

              {/* Mode Toggle for Score Bins vs Grade Tiers */}
              {scope !== 'by_subject' && (
                <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setChartMode('score_bins')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      chartMode === 'score_bins'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {lang === 'th' ? 'ช่วงคะแนน' : 'Score Bins'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('grade_tiers')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      chartMode === 'grade_tiers'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {lang === 'th' ? 'ระดับเกรด' : 'Grade Tiers'}
                  </button>
                </div>
              )}

              {/* Department & Teacher Filters when viewing All Subjects / By Subject */}
              {scope !== 'course' && departmentOptions.length > 1 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-title)]"
                >
                  <option value="all">{lang === 'th' ? 'ทุกกลุ่มสาระฯ' : 'All Departments'}</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}

              {scope !== 'course' && teacherFilterOptions.length > 0 && (
                <select
                  aria-label="กรองวิชาตามรายชื่อครู"
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-title)] max-w-48"
                >
                  <option value="all">{lang === 'th' ? 'ครูผู้สอนทุกคน' : 'All Teachers'}</option>
                  {teacherFilterOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} ({opt.count})
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-sm font-bold shadow-2xs transition cursor-pointer whitespace-nowrap"
              title={
                lang === 'th'
                  ? 'ดาวน์โหลดรายงานสรุปการกระจายเกรดเป็น PDF สำหรับงานทะเบียน/ฝ่ายวิชาการ'
                  : 'Download current grade distribution report as A4 PDF'
              }
            >
              <FileDown className="w-3 h-3" />
              <span>PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            aria-label={isExpanded ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
          >
            <span>{isExpanded ? (lang === 'th' ? 'ย่อกราฟ' : 'Hide') : (lang === 'th' ? 'ดูกราฟ' : 'Chart')}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'จำนวนข้อมูลคะแนน' : 'Graded Records'}
                </p>
                <p className="text-lg font-black text-[var(--color-text-title)] font-mono tabular-nums">
                  {summaryStats.totalCount}
                </p>
              </div>
              <Users className="w-5 h-5 text-indigo-500 shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/35 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-sky-900 dark:text-sky-200">
                  {lang === 'th' ? 'คะแนนเฉลี่ย (Mean)' : 'Mean Score'}
                </p>
                <p className="text-lg font-black text-sky-800 dark:text-sky-100 font-mono tabular-nums">
                  {summaryStats.meanScore}%
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/35 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200">
                  {lang === 'th' ? 'ค่ามัธยฐาน (Median)' : 'Median Score'}
                </p>
                <p className="text-lg font-black text-indigo-800 dark:text-indigo-100 font-mono tabular-nums">
                  {summaryStats.medianScore}%
                </p>
              </div>
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-emerald-900 dark:text-emerald-200">
                  {lang === 'th' ? 'ผ่านเกณฑ์ / ดีเยี่ยม (80+)' : 'Pass / 80%+ Rate'}
                </p>
                <p className="text-base font-black text-emerald-800 dark:text-emerald-100 font-mono tabular-nums">
                  {summaryStats.passRate}%{' '}
                  <span className="text-[11px] font-semibold opacity-80">({summaryStats.distinctionRate}%)</span>
                </p>
              </div>
              <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-2 col-span-2 sm:col-span-1">
              <div>
                <p className="text-[10px] font-bold text-rose-900 dark:text-rose-200">
                  {lang === 'th' ? 'กลุ่มเสี่ยง (<50 / ร / มส.)' : 'At-Risk (<50 / Fail)'}
                </p>
                <p className="text-lg font-black text-rose-700 dark:text-rose-200 font-mono tabular-nums">
                  {summaryStats.atRiskCount} {lang === 'th' ? 'คน' : ''}
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            </div>
          </div>

          {/* Main Chart Container */}
          <div className="w-full h-[270px] min-w-0">
            {scope === 'by_subject' ? (
              subjectComparisonData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--color-text-muted)]">
                  <BarChart3 className="w-8 h-8 mb-1.5 opacity-40" />
                  <span>{lang === 'th' ? 'ยังไม่มีข้อมูลผลสัมฤทธิ์รายวิชา' : 'No subject grade data available'}</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectComparisonData}
                    margin={{ top: 14, right: 16, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                    <XAxis
                      dataKey="code"
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                      content={<SubjectTooltip lang={lang} />}
                    />
                    <ReferenceLine
                      y={summaryStats.meanScore}
                      stroke="#6366f1"
                      strokeDasharray="4 4"
                      label={{
                        value: `${lang === 'th' ? 'เฉลี่ยรวม' : 'Mean'} ${summaryStats.meanScore}%`,
                        position: 'insideTopRight',
                        fill: '#6366f1',
                        fontSize: 10,
                      }}
                    />
                    <Bar
                      dataKey="avgScore"
                      name={lang === 'th' ? 'คะแนนเฉลี่ย (%)' : 'Average Score (%)'}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    >
                      {subjectComparisonData.map((entry) => (
                        <Cell key={entry.courseId} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : scopedGrades.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--color-text-muted)]">
                <BarChart3 className="w-8 h-8 mb-1.5 opacity-40" />
                <span>{lang === 'th' ? 'ยังไม่มีข้อมูลคะแนนในช่วงที่เลือก' : 'No grade records matching selection'}</span>
              </div>
            ) : chartMode === 'score_bins' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={scoreBinsData}
                  margin={{ top: 12, right: 16, left: -16, bottom: 4 }}
                  barCategoryGap="10%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={<HistogramBinTooltip lang={lang} />}
                  />
                  <Bar
                    dataKey="count"
                    name={lang === 'th' ? 'จำนวนนักเรียน (คน)' : 'Student Count'}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {scoreBinsData.map((bin) => (
                      <Cell key={bin.key} fill={bin.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gradeTiersData}
                  margin={{ top: 12, right: 16, left: -16, bottom: 4 }}
                  barCategoryGap="16%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={<GradeTierTooltip lang={lang} />}
                  />
                  <Bar
                    dataKey="count"
                    name={lang === 'th' ? 'จำนวนนักเรียน (คน)' : 'Student Count'}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {gradeTiersData.map((tier) => (
                      <Cell key={tier.tier} fill={tier.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Distribution Legend Pills */}
          {scope !== 'by_subject' && scopedGrades.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-border)] text-[11px]">
              <span className="font-bold text-[var(--color-text-muted)] mr-1">
                {chartMode === 'score_bins'
                  ? lang === 'th'
                    ? 'สรุปช่วงคะแนน:'
                    : 'Score Distribution:'
                  : lang === 'th'
                  ? 'สรุประดับเกรด:'
                  : 'Grade Breakdown:'}
              </span>
              {(chartMode === 'score_bins'
                ? scoreBinsData.filter((b) => b.count > 0).map((b) => ({
                    key: b.key,
                    label: b.label,
                    count: b.count,
                    percent: b.percent,
                    color: b.color,
                  }))
                : gradeTiersData.filter((t) => t.count > 0).map((t) => ({
                    key: t.tier,
                    label: t.label,
                    count: t.count,
                    percent: t.percent,
                    color: t.color,
                  }))
              ).map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-[var(--color-text-title)]">{item.label}</span>
                  <span className="font-mono text-[var(--color-text-muted)]">
                    {item.count} {lang === 'th' ? 'คน' : ''} ({item.percent}%)
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HistogramBinTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ScoreBinDatum }>;
  lang: AppLanguage;
}> = ({ active, payload, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const bin = payload[0].payload;
  const remainingCount = Math.max(0, bin.count - bin.sampleStudents.length);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xl text-xs space-y-2 min-w-56 max-w-72">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] pb-1.5">
        <div>
          <p className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: bin.color }} />
            <span>{lang === 'th' ? `ช่วงคะแนน ${bin.label}%` : `Score ${bin.label}%`}</span>
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
            {bin.equivalentGrade} • {bin.subLabel}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-md font-mono font-black text-white text-[11px] shrink-0"
          style={{ backgroundColor: bin.color }}
        >
          {bin.count} {lang === 'th' ? 'คน' : 'stu'}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--color-text-muted)]">
            {lang === 'th' ? 'จำนวนนักเรียนที่แน่นอน:' : 'Exact Student Count:'}
          </span>
          <span className="font-mono font-extrabold text-[var(--color-text-title)]">
            {bin.count} / {bin.totalInScope} {lang === 'th' ? 'คน' : 'students'} ({bin.percent}%)
          </span>
        </div>

        {bin.avgScore !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--color-text-muted)]">
              {lang === 'th' ? 'คะแนนเฉลี่ย (ต่ำสุด–สูงสุด):' : 'Mean (Min–Max):'}
            </span>
            <span className="font-mono font-bold text-[var(--color-primary-text)]">
              {bin.avgScore}% ({bin.minScore}–{bin.maxScore})
            </span>
          </div>
        )}
      </div>

      {bin.gradeBreakdown.length > 0 && (
        <div className="pt-1 border-t border-[var(--color-border)] flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)] mr-0.5">
            {lang === 'th' ? 'ผลเกรด:' : 'Grades:'}
          </span>
          {bin.gradeBreakdown.map((g) => (
            <span
              key={g.letter}
              className="px-1.5 py-0.2 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-mono text-[10px] font-bold text-[var(--color-text-title)]"
            >
              {g.letter}: {g.count} {lang === 'th' ? 'คน' : ''}
            </span>
          ))}
        </div>
      )}

      {bin.sampleStudents.length > 0 && (
        <div className="pt-1 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] space-y-0.5">
          <p className="font-semibold text-[var(--color-text-body)]">
            {lang === 'th' ? 'รายชื่อในกลุ่มนี้:' : 'Students in range:'}
          </p>
          {bin.sampleStudents.map((name, i) => (
            <p key={i} className="truncate">• {name}</p>
          ))}
          {remainingCount > 0 && (
            <p className="font-semibold text-[var(--color-primary-text)]">
              {lang === 'th' ? `+ และอีก ${remainingCount} คน` : `+ ${remainingCount} more students`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const GradeTierTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: GradeTierDatum }>;
  lang: AppLanguage;
}> = ({ active, payload, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const tier = payload[0].payload;
  const remainingCount = Math.max(0, tier.count - tier.sampleStudents.length);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xl text-xs space-y-2 min-w-56 max-w-72">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] pb-1.5">
        <div>
          <p className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: tier.color }} />
            <span>{lang === 'th' ? `ระดับเกรด ${tier.label}` : `Grade ${tier.label}`}</span>
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{tier.scoreRange}</p>
        </div>
        <span
          className="px-2 py-0.5 rounded-md font-mono font-black text-white text-[11px] shrink-0"
          style={{ backgroundColor: tier.color }}
        >
          {tier.count} {lang === 'th' ? 'คน' : 'stu'}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--color-text-muted)]">
            {lang === 'th' ? 'จำนวนนักเรียนที่แน่นอน:' : 'Exact Student Count:'}
          </span>
          <span className="font-mono font-extrabold text-[var(--color-text-title)]">
            {tier.count} / {tier.totalInScope} {lang === 'th' ? 'คน' : 'students'} ({tier.percent}%)
          </span>
        </div>

        {tier.avgScore !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--color-text-muted)]">
              {lang === 'th' ? 'คะแนนเฉลี่ย (ต่ำสุด–สูงสุด):' : 'Mean (Min–Max):'}
            </span>
            <span className="font-mono font-bold text-[var(--color-primary-text)]">
              {tier.avgScore}% ({tier.minScore}–{tier.maxScore})
            </span>
          </div>
        )}
      </div>

      {tier.sampleStudents.length > 0 && (
        <div className="pt-1 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] space-y-0.5">
          <p className="font-semibold text-[var(--color-text-body)]">
            {lang === 'th' ? 'รายชื่อในระดับเกรดนี้:' : 'Students in tier:'}
          </p>
          {tier.sampleStudents.map((name, i) => (
            <p key={i} className="truncate">• {name}</p>
          ))}
          {remainingCount > 0 && (
            <p className="font-semibold text-[var(--color-primary-text)]">
              {lang === 'th' ? `+ และอีก ${remainingCount} คน` : `+ ${remainingCount} more students`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const SubjectTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: SubjectComparisonDatum }>;
  lang: AppLanguage;
}> = ({ active, payload, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xl text-xs space-y-2 min-w-60">
      <div className="border-b border-[var(--color-border)] pb-1.5">
        <p className="font-bold text-[var(--color-text-title)]">
          {row.code} — {row.title}
        </p>
        {row.department && (
          <p className="text-[10px] text-[var(--color-text-muted)]">{row.department}</p>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">{lang === 'th' ? 'คะแนนเฉลี่ย:' : 'Average Score:'}</span>
          <span className="font-mono font-bold text-[var(--color-text-title)]">{row.avgScore}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">{lang === 'th' ? 'อัตราผ่านเกณฑ์:' : 'Pass Rate:'}</span>
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{row.passRate}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">{lang === 'th' ? 'นักเรียนทั้งหมด:' : 'Total Students:'}</span>
          <span className="font-mono font-bold text-[var(--color-text-title)]">
            {row.studentCount} {lang === 'th' ? 'คน' : 'students'}
          </span>
        </div>
      </div>

      {/* Exact student count per grade range */}
      <div className="pt-1.5 border-t border-[var(--color-border)] space-y-1">
        <p className="text-[10px] font-bold text-[var(--color-text-body)]">
          {lang === 'th' ? 'จำนวนนักเรียนแยกตามช่วงเกรด:' : 'Exact Students by Grade Range:'}
        </p>
        {row.rangeCounts.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {item.count} {lang === 'th' ? 'คน' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
